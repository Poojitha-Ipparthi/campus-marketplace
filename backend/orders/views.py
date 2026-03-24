from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Order
from .serializers import OrderSerializer
from .permissions import IsBuyerOrSellerForRead


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(buyer=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyerOrSellerForRead]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def accept_order(request, pk):
    try:
        order = Order.objects.select_related('listing').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response({'detail': 'Only the seller can accept this order.'}, status=status.HTTP_403_FORBIDDEN)

    if order.status not in ['PENDING', 'NEGOTIATING']:
        return Response({'detail': 'Only pending or negotiating orders can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = 'ACCEPTED'
    order.save()

    order.listing.status = 'RESERVED'
    order.listing.save()

    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reject_order(request, pk):
    try:
        order = Order.objects.select_related('listing').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response({'detail': 'Only the seller can reject this order.'}, status=status.HTTP_403_FORBIDDEN)

    if order.status not in ['PENDING', 'NEGOTIATING']:
        return Response({'detail': 'Only pending or negotiating orders can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = 'REJECTED'
    order.save()

    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    try:
        order = Order.objects.select_related('listing').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.buyer:
        return Response({'detail': 'Only the buyer can cancel this order.'}, status=status.HTTP_403_FORBIDDEN)

    if order.status not in ['PENDING', 'NEGOTIATING', 'ACCEPTED']:
        return Response({'detail': 'This order cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = 'CANCELLED'
    order.save()

    if order.listing.status == 'RESERVED':
        order.listing.status = 'ACTIVE'
        order.listing.save()

    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, pk):
    try:
        order = Order.objects.select_related('listing').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != order.listing.seller:
        return Response({'detail': 'Only the seller can complete this order.'}, status=status.HTTP_403_FORBIDDEN)

    if order.status != 'ACCEPTED':
        return Response({'detail': 'Only accepted orders can be completed.'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = 'COMPLETED'
    order.save()

    order.listing.status = 'SOLD'
    order.listing.save()

    return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)