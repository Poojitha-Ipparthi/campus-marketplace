from rest_framework import serializers
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.ReadOnlyField(source='buyer.email')
    listing_title = serializers.ReadOnlyField(source='listing.title')
    listing_seller_id = serializers.ReadOnlyField(source='listing.seller.id')
    listing_seller_email = serializers.ReadOnlyField(source='listing.seller.email')

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer',
            'buyer_email',
            'listing',
            'listing_title',
            'listing_seller_id',
            'listing_seller_email',
            'offered_price',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'buyer']