from rest_framework import generics, permissions
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
        serializer.save(sender=self.request.user)


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
