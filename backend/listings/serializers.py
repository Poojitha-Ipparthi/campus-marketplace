from rest_framework import serializers
from .models import Listing, ListingImage


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'uploaded_at']


class ListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.ReadOnlyField(source='seller.email')
    images = ListingImageSerializer(many=True, read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id',
            'seller',
            'seller_email',
            'title',
            'description',
            'price',
            'status',
            'images',
            'created_at',
        ]