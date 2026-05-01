"""
Serializers for order and payment API data.

Adds buyer/listing display fields and validates order creation rules.
"""

from rest_framework import serializers
from listings.models import Listing
from orders.models import Order, Payment


class OrderSerializer(serializers.ModelSerializer):
    # Buyer details shown in seller-facing views
    buyer_email = serializers.ReadOnlyField(source="buyer.email")
    buyer_name = serializers.ReadOnlyField(source="buyer.full_name")

    # Listing details shown with each order
    listing_title = serializers.ReadOnlyField(source="listing.title")
    listing_seller = serializers.ReadOnlyField(source="listing.seller.id")
    listing_seller_name = serializers.ReadOnlyField(source="listing.seller.full_name")
    listing_seller_email = serializers.ReadOnlyField(source="listing.seller.email")

    # Indicates whether the order is for a free item
    is_free = serializers.SerializerMethodField()

    # Read-only reservation deadline
    reserved_until = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "buyer_email",
            "buyer_name",
            "listing",
            "listing_title",
            "listing_seller",
            "listing_seller_name",
            "listing_seller_email",
            "offered_price",
            "is_free",
            "status",
            "cancelled_by",
            "cancellation_reason",
            "reserved_until",
            "created_at",
            "updated_at",
        ]

        # System-controlled fields should not be set by clients
        read_only_fields = [
            "buyer",
            "status",
            "cancelled_by",
            "cancellation_reason",
            "reserved_until",
            "created_at",
            "updated_at",
        ]

    def get_is_free(self, obj):
        """Return True when order price is 0."""
        return float(obj.offered_price) == 0.0

    def validate(self, attrs):
        request = self.context.get("request")
        buyer = request.user if request else None
        listing = attrs.get("listing")
        offered_price = attrs.get("offered_price")

        # Sellers cannot order their own listings
        if listing and buyer and listing.seller == buyer:
            raise serializers.ValidationError(
                {"detail": "You cannot place an order on your own listing."}
            )

        # Orders are allowed only for available listings
        if listing and listing.status in [
            Listing.Status.RESERVED,
            Listing.Status.SOLD,
            Listing.Status.CANCELLED,
        ]:
            raise serializers.ValidationError(
                {
                    "detail": "Cannot place an order on a reserved, sold, or cancelled listing."
                }
            )

        # Free items are allowed; negative prices are not
        if offered_price is not None and offered_price < 0:
            raise serializers.ValidationError(
                {"offered_price": "Offered price cannot be negative."}
            )

        # Prevent duplicate active orders for the same buyer/listing pair
        if listing and buyer:
            existing = Order.objects.filter(
                listing=listing,
                buyer=buyer,
                status__in=[Order.Status.PENDING, Order.Status.ACCEPTED],
            ).exists()

            if existing:
                raise serializers.ValidationError(
                    {"detail": "You already have an active order for this listing."}
                )

        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "stripe_payment_intent_id",
            "amount",
            "currency",
            "status",
            "created_at",
            "updated_at",
        ]

        # Timestamps are managed by the backend
        read_only_fields = [
            "created_at",
            "updated_at",
        ]
