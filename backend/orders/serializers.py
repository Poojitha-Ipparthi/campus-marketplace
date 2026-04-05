from rest_framework import serializers
from .models import Order, Payment


class OrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.ReadOnlyField(source='buyer.email')
    listing_title = serializers.ReadOnlyField(source='listing.title')

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer',
            'buyer_email',
            'listing',
            'listing_title',
            'offered_price',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['buyer', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id',
            'order',
            'stripe_payment_intent_id',
            'amount',
            'currency',
            'status',
            'created_at',
            'updated_at',
        ]