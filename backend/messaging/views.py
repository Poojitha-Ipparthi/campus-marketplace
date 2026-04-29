from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Message
from .serializers import MessageSerializer


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user) | Message.objects.filter(
            receiver=user
        )

    def perform_create(self, serializer):
        from reporting.models import BlockedUser
        receiver = serializer.validated_data.get("receiver")
        sender = self.request.user
        
        # Blocked person cannot message blocker
        if BlockedUser.objects.filter(
            blocker=receiver,
            blocked=sender
        ).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot send messages to this user.")
        
        # Blocker cannot message blocked person either
        if BlockedUser.objects.filter(
            blocker=sender,
            blocked=receiver
        ).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You have blocked this user. Unblock them to send messages.")
        
        serializer.save(sender=sender)


class MessageDetailView(generics.RetrieveAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(sender=user) | Message.objects.filter(
            receiver=user
        )


class MarkMessageReadView(generics.UpdateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(receiver=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response({"id": message.id, "is_read": True})

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
