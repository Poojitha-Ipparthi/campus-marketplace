from rest_framework import serializers
from .models import Category, Listing, ListingImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ["id", "image_url", "uploaded_at"]


class ListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.ReadOnlyField(source="seller.email")
    seller_name = serializers.ReadOnlyField(source="seller.full_name")
    seller_trust_score = serializers.ReadOnlyField(source="seller.trust_score")
    seller_is_new_user = serializers.ReadOnlyField(source="seller.is_new_user")
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Listing
        fields = [
            "id",
            "seller",
            "seller_email",
            "seller_name",
            "seller_trust_score",
            "category",
            "category_id",
            "title",
            "description",
            "price",
            "condition",
            "status",
            "images",
            "seller_is_new_user",
            "created_at",
        ]
        read_only_fields = ["seller", "status", "created_at"]

    def validate_price(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value
