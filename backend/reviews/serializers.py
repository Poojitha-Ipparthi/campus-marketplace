from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_email = serializers.ReadOnlyField(source="reviewer.email")
    reviewee_email = serializers.ReadOnlyField(source="reviewee.email")

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer",
            "reviewer_email",
            "reviewee",
            "reviewee_email",
            "order",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["created_at", "reviewer"]
