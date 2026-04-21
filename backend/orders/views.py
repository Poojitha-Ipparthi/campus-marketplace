from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from listings.models import Listing
from .models import Order, Payment
from .permissions import IsBuyerOrSellerForRead
from .serializers import OrderSerializer, PaymentSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        order = Order.objects.get(pk=order_id, buyer=request.user)
    except Order.DoesNotExist:
        return Response(
            {"detail": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if order.status != Order.Status.ACCEPTED:
        return Response(
            {"detail": "Payment can only be created for accepted orders."},
            status=status.HTTP_400_BAD_REQUEST
        )

    existing_payment = Payment.objects.filter(order=order).first()
    if existing_payment:
        return Response(
            {"detail": "Payment already exists for this order."},
            status=status.HTTP_400_BAD_REQUEST
        )

    payment = Payment.objects.create(
        order=order,
        stripe_payment_intent_id=f"pi_mock_{order.id}",
        amount=order.offered_price,
        currency="USD",
        status=Payment.Status.PENDING,
    )

    return Response(
        PaymentSerializer(payment).data,
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    return Response({"detail": "Webhook received."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_order(request, pk):
    try:
        order = Order.objects.select_related("listing").get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response(
            {"detail": "Only the seller can accept this order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if order.status != Order.Status.PENDING:
        return Response(
            {"detail": "Only pending orders can be accepted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            order.status = Order.Status.ACCEPTED
            order.save(update_fields=["status", "updated_at"])

            order.listing.status = Listing.Status.RESERVED
            order.listing.save(update_fields=["status"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reject_order(request, pk):
    try:
        order = Order.objects.select_related("listing").get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response(
            {"detail": "Only the seller can reject this order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if order.status != Order.Status.PENDING:
        return Response(
            {"detail": "Only pending orders can be rejected."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    order.status = Order.Status.REJECTED
    order.save(update_fields=["status", "updated_at"])
    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    try:
        order = Order.objects.select_related("listing").get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.buyer:
        return Response(
            {"detail": "Only the buyer can cancel this order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if order.status not in [Order.Status.PENDING, Order.Status.ACCEPTED]:
        return Response(
            {"detail": "This order cannot be cancelled."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            order.cancel_by_buyer()

            if order.listing.status == Listing.Status.RESERVED:
                order.listing.status = Listing.Status.AVAILABLE
                order.listing.save(update_fields=["status"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, pk):
    try:
        order = Order.objects.select_related("listing").get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response(
            {"detail": "Only the seller can complete this order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if order.status != Order.Status.ACCEPTED:
        return Response(
            {"detail": "Only accepted orders can be completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        order.status = Order.Status.COMPLETED
        order.save(update_fields=["status", "updated_at"])

        order.listing.status = Listing.Status.SOLD
        order.listing.save(update_fields=["status"])

    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)