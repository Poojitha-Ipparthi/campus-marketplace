from rest_framework import serializers
from .models import Category, Listing, ListingImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'uploaded_at']


class ListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.ReadOnlyField(source='seller.email')
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Listing
        fields = [
            'id',
            'seller',
            'seller_email',
            'category',
            'category_id',
            'title',
            'description',
            'price',
            'status',
            'images',
            'created_at',
        ]
        read_only_fields = ['created_at']