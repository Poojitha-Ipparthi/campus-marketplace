"""
Database model for transaction reviews.

Stores buyer-to-seller ratings and enforces review integrity rules.
"""

from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_email = serializers.ReadOnlyField(source="reviewer.email")
    reviewee_email = serializers.ReadOnlyField(source="reviewee.email")
    reviewer_name = serializers.ReadOnlyField(source="reviewer.full_name")
    reviewee_name = serializers.ReadOnlyField(source="reviewee.full_name")

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer",
            "reviewer_email",
            "reviewer_name",
            "reviewee",
            "reviewee_email",
            "reviewee_name",
            "order",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["created_at", "reviewer"]
