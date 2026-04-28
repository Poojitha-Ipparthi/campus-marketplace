from rest_framework import serializers
from .models import User
from listings.models import Listing
from orders.models import Order, Payment


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "verified",
            "trust_score",
            "is_staff",
            "is_superuser",
            "is_active",
            "created_at",
        ]


class AdminListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.EmailField(source="seller.email", read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id",
            "title",
            "price",
            "status",
            "condition",
            "seller",
            "seller_email",
            "created_at",
        ]


class AdminOrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.EmailField(source="buyer.email", read_only=True)
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    seller_email = serializers.EmailField(source="listing.seller.email", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "listing",
            "listing_title",
            "buyer",
            "buyer_email",
            "seller_email",
            "offered_price",
            "status",
            "reserved_until",
            "created_at",
            "updated_at",
        ]


class AdminPaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "stripe_payment_intent_id",
            "amount",
            "currency",
            "status",
            "created_at",
            "updated_at",
        ]
