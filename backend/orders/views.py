import os
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
import stripe
from django.conf import settings

from users.views import IsVerified

from listings.models import Listing
from .models import Order, Payment
from .permissions import IsBuyerOrSellerForRead
from .serializers import OrderSerializer, PaymentSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(buyer=user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyerOrSellerForRead]


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(order__buyer=self.request.user).order_by("-created_at")


class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(order__buyer=self.request.user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_payment_intent(request):
    order_id = request.data.get("order")

    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order_id, buyer=request.user)

            if order.status != Order.Status.ACCEPTED:
                return Response(
                    {"detail": "Payment can only be created for accepted orders."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing_payment = Payment.objects.filter(order=order).first()
            if existing_payment:
                return Response(
                    {"detail": "Payment already exists for this order."},
                    status=status.HTTP_409_CONFLICT,
                )

            stripe.api_key = settings.STRIPE_SECRET_KEY
            intent = stripe.PaymentIntent.create(
                amount=int(order.offered_price * 100),
                currency="usd",
                metadata={"order_id": order.id}
            )

            payment = Payment.objects.create(
                order=order,
                stripe_payment_intent_id=intent.id,
                amount=order.offered_price,
                currency="USD",
                status=Payment.Status.PENDING,
            )

        return Response({
            "payment": PaymentSerializer(payment).data,
            "client_secret": intent.client_secret
        }, status=status.HTTP_201_CREATED)

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
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=intent["id"])
            payment.status = Payment.Status.SUCCEEDED
            payment.save(update_fields=["status", "updated_at"])
            order = Order.objects.get(pk=order_id)
            order.status = Order.Status.COMPLETED
            order.save(update_fields=["status", "updated_at"])
            order.listing.status = Listing.Status.SOLD
            order.listing.save(update_fields=["status"])
        except (Payment.DoesNotExist, Order.DoesNotExist):
            pass

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=intent["id"])
            payment.status = Payment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])
            order = Order.objects.get(pk=payment.order.id)
            order.cancel_due_to_payment_failure()
            order.listing.status = Listing.Status.AVAILABLE
            order.listing.save(update_fields=["status"])
        except (Payment.DoesNotExist, Order.DoesNotExist):
            pass

    return Response({"detail": "Webhook received."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_order(request, pk):
    try:
        with transaction.atomic():
            order = Order.objects.select_related("listing").select_for_update().get(pk=pk)
            listing = order.listing

            if request.user != listing.seller:
                return Response(
                    {"detail": "Only the seller can accept this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if order.status != Order.Status.PENDING:
                return Response(
                    {"detail": "Only pending orders can be accepted."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if listing.status != Listing.Status.AVAILABLE:
                return Response(
                    {"detail": "Listing is not available for reservation."},
                    status=status.HTTP_409_CONFLICT,
                )

            order.status = Order.Status.ACCEPTED
            order.save(update_fields=["status", "updated_at"])

            listing.status = Listing.Status.RESERVED
            listing.save(update_fields=["status"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError:
        return Response(
            {"detail": "Order acceptance conflicted with another request."},
            status=status.HTTP_409_CONFLICT,
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_order(request, pk):
    try:
        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .select_related("listing")
                .get(pk=pk)
            )

            if request.user != order.listing.seller:
                return Response(
                    {"detail": "Only the seller can reject this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            order.reject()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError:
        return Response(
            {"detail": "Order rejection conflicted with another request."},
            status=status.HTTP_409_CONFLICT,
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    try:
        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .select_related("listing")
                .get(pk=pk)
            )
            listing = Listing.objects.select_for_update().get(pk=order.listing_id)

            if request.user != order.buyer:
                return Response(
                    {"detail": "Only the buyer can cancel this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            order.cancel_by_buyer()

            if listing.status == Listing.Status.RESERVED:
                listing.status = Listing.Status.AVAILABLE
                listing.save(update_fields=["status"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError:
        return Response(
            {"detail": "Order cancellation conflicted with another request."},
            status=status.HTTP_409_CONFLICT,
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, pk):
    try:
        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .select_related("listing")
                .get(pk=pk)
            )
            listing = Listing.objects.select_for_update().get(pk=order.listing_id)

            if request.user != listing.seller:
                return Response(
                    {"detail": "Only the seller can complete this order."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            order.complete()

            listing.status = Listing.Status.SOLD
            listing.save(update_fields=["status"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError:
        return Response(
            {"detail": "Order completion conflicted with another request."},
            status=status.HTTP_409_CONFLICT,
        )
