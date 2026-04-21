from rest_framework import serializers
from listings.models import Listing
from .models import Order, Payment


class OrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.ReadOnlyField(source="buyer.email")
    listing_title = serializers.ReadOnlyField(source="listing.title")

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "buyer_email",
            "listing",
            "listing_title",
            "offered_price",
            "status",
            "cancelled_by",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["buyer", "status", "cancelled_by", "cancellation_reason", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        buyer = request.user if request else None
        listing = attrs.get("listing")
        offered_price = attrs.get("offered_price")

        if listing and buyer and listing.seller == buyer:
            raise serializers.ValidationError({
                "detail": "You cannot place an order on your own listing."
            })

        if listing and listing.status in [
            Listing.Status.RESERVED,
            Listing.Status.SOLD,
            Listing.Status.CANCELLED,
        ]:
            raise serializers.ValidationError({
                "detail": "Cannot place an order on a reserved, sold, or cancelled listing."
            })

        if offered_price is not None and offered_price <= 0:
            raise serializers.ValidationError({
                "offered_price": "Offered price must be greater than zero."
            })

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
        read_only_fields = ["stripe_payment_intent_id", "amount", "currency", "status", "created_at", "updated_at"]