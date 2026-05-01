"""
API views for marketplace messaging.

Handles conversation messages, read receipts, and blocked-user checks.
"""

from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Message
from .serializers import MessageSerializer


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only see messages they sent or received
    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user) | Message.objects.filter(
            receiver=user
        )

    def perform_create(self, serializer):
        from reporting.models import BlockedUser

        receiver = serializer.validated_data.get("receiver")
        sender = self.request.user

        # Prevent sending messages if receiver has blocked sender
        if BlockedUser.objects.filter(blocker=receiver, blocked=sender).exists():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You cannot send messages to this user.")

        # Prevent sending messages if sender has blocked receiver
        if BlockedUser.objects.filter(blocker=sender, blocked=receiver).exists():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "You have blocked this user. Unblock them to send messages."
            )

        # Save message with authenticated user as sender
        serializer.save(sender=sender)


class MessageDetailView(generics.RetrieveAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only access messages they are part of
    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user) | Message.objects.filter(
            receiver=user
        )


class MarkMessageReadView(generics.UpdateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Only the receiver can mark a message as read
    def get_queryset(self):
        return Message.objects.filter(receiver=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        message = self.get_object()

        # Mark message as read
        message.is_read = True
        message.save(update_fields=["is_read"])

        return Response({"id": message.id, "is_read": True})

    # Ensure PUT behaves like PATCH for marking read
    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
