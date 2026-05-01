"""
API views for order lifecycle and payment actions.

Handles order creation, acceptance, rejection, cancellation,
completion, and Stripe payment integration.
"""

import os
import json
import stripe
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.views import IsVerified
from listings.models import Listing
from .models import Order, Payment
from .permissions import IsBuyerOrSellerForRead
from .serializers import OrderSerializer, PaymentSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    # Return orders based on user role (buyer or seller)
    def get_queryset(self):
        user = self.request.user
        role = self.request.query_params.get("role", "buyer")

        if role == "seller":
            return (
                Order.objects.filter(listing__seller=user)
                .select_related("listing", "buyer")
                .order_by("-created_at")
            )

        return (
            Order.objects.filter(buyer=user)
            .select_related("listing", "buyer")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        listing = serializer.validated_data.get("listing")

        # Release expired reservation if listing is stuck in RESERVED state
        if listing and listing.status == Listing.Status.RESERVED:
            expired_order = Order.objects.filter(
                listing=listing,
                status=Order.Status.ACCEPTED,
                reserved_until__lt=timezone.now(),
            ).first()

            if expired_order:
                expired_order.cancel_due_to_expiration()
                listing.status = Listing.Status.AVAILABLE
                listing.save(update_fields=["status"])

        # Create order with current user as buyer
        serializer.save(buyer=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyerOrSellerForRead]


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Only show payments belonging to the logged-in user
    def get_queryset(self):
        return Payment.objects.filter(order__buyer=self.request.user).order_by(
            "-created_at"
        )


class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(order__buyer=self.request.user)


# Update system state after successful payment
def finalize_successful_payment(payment):
    order = payment.order
    listing = order.listing

    payment.status = Payment.Status.SUCCEEDED
    payment.save(update_fields=["status", "updated_at"])

    order.status = Order.Status.COMPLETED
    order.save(update_fields=["status", "updated_at"])

    listing.status = Listing.Status.SOLD
    listing.save(update_fields=["status"])

    return payment


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_payment_intent(request):
    # Create or reuse Stripe payment intent for accepted orders
    order_id = request.data.get("order")
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        with transaction.atomic():
            # Lock order to prevent concurrent payment creation
            order = (
                Order.objects.select_related("listing")
                .select_for_update()
                .get(pk=order_id, buyer=request.user)
            )

            if order.status != Order.Status.ACCEPTED:
                return Response(
                    {"detail": "Payment can only be created for accepted orders."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing_payment = Payment.objects.filter(order=order).first()

            # Reuse existing pending payment instead of creating duplicate
            if existing_payment:
                if existing_payment.status == Payment.Status.PENDING:
                    intent = stripe.PaymentIntent.retrieve(
                        existing_payment.stripe_payment_intent_id
                    )

                    return Response(
                        {
                            "payment": PaymentSerializer(existing_payment).data,
                            "client_secret": intent.client_secret,
                        },
                        status=status.HTTP_200_OK,
                    )

                return Response(
                    {"detail": "Payment already exists for this order."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Create Stripe payment intent and store it
            intent = stripe.PaymentIntent.create(
                amount=int(float(order.offered_price) * 100),
                currency="usd",
                metadata={"order_id": str(order.id)},
            )

            payment = Payment.objects.create(
                order=order,
                stripe_payment_intent_id=intent.id,
                amount=order.offered_price,
                currency="USD",
                status=Payment.Status.PENDING,
            )

        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "client_secret": intent.client_secret,
            },
            status=status.HTTP_201_CREATED,
        )

    except Order.DoesNotExist:
        return Response(
            {"detail": "Order not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except stripe.StripeError as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except IntegrityError:
        return Response(
            {"detail": "Payment creation conflicted with another request."},
            status=status.HTTP_409_CONFLICT,
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def confirm_payment(request):
    # Confirm payment with Stripe and finalize order
    payment_intent_id = request.data.get("payment_intent_id")

    if not payment_intent_id:
        return Response(
            {"detail": "payment_intent_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        with transaction.atomic():
            # Lock payment and order to prevent race conditions
            payment = (
                Payment.objects.select_related("order", "order__listing")
                .select_for_update()
                .get(
                    stripe_payment_intent_id=payment_intent_id,
                    order__buyer=request.user,
                )
            )

            intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            # Ensure Stripe confirms success before updating system
            if intent.status != "succeeded":
                return Response(
                    {
                        "detail": (
                            "Stripe payment is not succeeded. "
                            f"Current status: {intent.status}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            finalize_successful_payment(payment)

        return Response(
            {"payment": PaymentSerializer(payment).data},
            status=status.HTTP_200_OK,
        )

    except Payment.DoesNotExist:
        return Response(
            {"detail": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except stripe.StripeError as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    # Handle Stripe webhook events (async payment updates)
    stripe.api_key = settings.STRIPE_SECRET_KEY

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        # Verify webhook signature if configured
        if webhook_secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = json.loads(payload)
    except Exception:
        return Response(
            {"detail": "Invalid webhook request."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Handle successful payments
        if event["type"] == "payment_intent.succeeded":
            intent = event["data"]["object"]

            try:
                payment = Payment.objects.select_related("order", "order__listing").get(
                    stripe_payment_intent_id=intent["id"]
                )

                finalize_successful_payment(payment)
            except Payment.DoesNotExist:
                pass

        # Handle failed payments
        elif event["type"] == "payment_intent.payment_failed":
            intent = event["data"]["object"]

            try:
                payment = Payment.objects.select_related("order__listing").get(
                    stripe_payment_intent_id=intent["id"]
                )

                payment.status = Payment.Status.FAILED
                payment.save(update_fields=["status", "updated_at"])

                order = payment.order

                # Cancel order and release listing
                if order.status in [Order.Status.PENDING, Order.Status.ACCEPTED]:
                    order.cancel_due_to_payment_failure()
                    order.listing.status = Listing.Status.AVAILABLE
                    order.listing.save(update_fields=["status"])

            except Payment.DoesNotExist:
                pass

    except Exception:
        return Response(
            {"detail": "Webhook processing error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({"detail": "Webhook received."}, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_order(request, pk):
    """Seller accepts a pending order and sets the reservation window."""
    try:
        with transaction.atomic():
            order = Order.objects.select_related("listing").select_for_update().get(pk=pk)

            if order.listing.seller != request.user:
                return Response({"detail": "Only the seller can accept this order."}, status=status.HTTP_403_FORBIDDEN)

            if order.status != Order.Status.PENDING:
                return Response({"detail": "Only pending orders can be accepted."}, status=status.HTTP_400_BAD_REQUEST)

            order.status = Order.Status.ACCEPTED
            order.reserved_until = timezone.now() + timedelta(minutes=3)
            order.save(update_fields=["status", "reserved_until", "updated_at"])

            order.listing.status = Listing.Status.RESERVED
            order.listing.save(update_fields=["status"])

        return Response(OrderSerializer(order, context={"request": request}).data)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_order(request, pk):
    """Seller declines a pending order."""
    try:
        with transaction.atomic():
            order = Order.objects.select_related("listing").select_for_update().get(pk=pk)

            if order.listing.seller != request.user:
                return Response({"detail": "Only the seller can decline this order."}, status=status.HTTP_403_FORBIDDEN)

            if order.status != Order.Status.PENDING:
                return Response({"detail": "Only pending orders can be declined."}, status=status.HTTP_400_BAD_REQUEST)

            order.status = Order.Status.REJECTED
            order.cancelled_by = "seller"
            order.cancellation_reason = "seller_rejected"
            order.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

        return Response(OrderSerializer(order, context={"request": request}).data)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    """Buyer or seller cancels an order."""
    try:
        with transaction.atomic():
            order = Order.objects.select_related("listing").select_for_update().get(pk=pk)

            is_buyer = order.buyer == request.user
            is_seller = order.listing.seller == request.user

            if not is_buyer and not is_seller:
                return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

            if order.status not in [Order.Status.PENDING, Order.Status.ACCEPTED]:
                return Response({"detail": "This order cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)

            order.status = Order.Status.CANCELLED
            order.cancelled_by = "buyer" if is_buyer else "seller"
            order.cancellation_reason = "buyer_cancelled" if is_buyer else "seller_cancelled"
            order.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

            order.listing.status = Listing.Status.AVAILABLE
            order.listing.save(update_fields=["status"])

        return Response(OrderSerializer(order, context={"request": request}).data)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, pk):
    """Seller marks a free item order as complete after physical handoff."""
    try:
        with transaction.atomic():
            order = Order.objects.select_related("listing").select_for_update().get(pk=pk)

            if order.listing.seller != request.user:
                return Response({"detail": "Only the seller can complete this order."}, status=status.HTTP_403_FORBIDDEN)

            if order.status != Order.Status.ACCEPTED:
                return Response({"detail": "Only accepted orders can be completed."}, status=status.HTTP_400_BAD_REQUEST)

            order.status = Order.Status.COMPLETED
            order.save(update_fields=["status", "updated_at"])

            order.listing.status = Listing.Status.SOLD
            order.listing.save(update_fields=["status"])

        return Response(OrderSerializer(order, context={"request": request}).data)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)