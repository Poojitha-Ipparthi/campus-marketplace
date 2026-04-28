from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")
    receiver_email = serializers.ReadOnlyField(source="receiver.email")

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_email",
            "receiver",
            "receiver_email",
            "listing",
            "content",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["sender", "created_at"]
