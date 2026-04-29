from rest_framework import serializers
from listings.models import Listing
from orders.models import Order, Payment


class OrderSerializer(serializers.ModelSerializer):
    # Show buyer name + email for seller-facing views
    buyer_email = serializers.ReadOnlyField(source="buyer.email")
    buyer_name = serializers.ReadOnlyField(source="buyer.full_name")

    # Show listing info
    listing_title = serializers.ReadOnlyField(source="listing.title")
    listing_seller = serializers.ReadOnlyField(source="listing.seller.id")
    listing_seller_name = serializers.ReadOnlyField(source="listing.seller.full_name")
    listing_seller_email = serializers.ReadOnlyField(source="listing.seller.email")

    # Free item flag
    is_free = serializers.SerializerMethodField()

    # Reservation window
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
        """Returns True if this is a free item order (price = 0)."""
        return float(obj.offered_price) == 0.0

    def validate(self, attrs):
        request = self.context.get("request")
        buyer = request.user if request else None
        listing = attrs.get("listing")
        offered_price = attrs.get("offered_price")

        # Prevent seller from ordering their own listing
        if listing and buyer and listing.seller == buyer:
            raise serializers.ValidationError(
                {"detail": "You cannot place an order on your own listing."}
            )

        # Prevent ordering unavailable listings
        if listing and listing.status in [
            Listing.Status.RESERVED,
            Listing.Status.SOLD,
            Listing.Status.CANCELLED,
        ]:
            raise serializers.ValidationError(
                {"detail": "Cannot place an order on a reserved, sold, or cancelled listing."}
            )

        # Allow free items (price = 0), but reject negative prices
        if offered_price is not None and offered_price < 0:
            raise serializers.ValidationError(
                {"offered_price": "Offered price cannot be negative."}
            )

        # Prevent duplicate orders — buyer cannot have multiple active orders
        # on the same listing (PENDING or ACCEPTED)
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
        read_only_fields = [
            "created_at",
            "updated_at",
        ]
