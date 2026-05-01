"""
Serializer for message API data.

Includes sender and receiver display fields for chat UI.
"""

from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    # Expose sender/receiver details for frontend display
    sender_email = serializers.ReadOnlyField(source="sender.email")
    receiver_email = serializers.ReadOnlyField(source="receiver.email")
    sender_name = serializers.ReadOnlyField(source="sender.full_name")
    receiver_name = serializers.ReadOnlyField(source="receiver.full_name")

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "receiver",
            "receiver_email",
            "receiver_name",
            "listing",
            "content",
            "is_read",
            "created_at",
        ]

        # Prevent client from modifying system-controlled fields
        read_only_fields = [
            "sender",
            "is_read",
            "created_at",
            "sender_email",
            "receiver_email",
            "sender_name",
            "receiver_name",
        ]
