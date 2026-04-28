from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from listings.models import Listing


class Message(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_received",
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="messages"
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.sender == self.receiver:
            raise ValidationError("A user cannot send a message to themselves.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Message from {self.sender.email} to {self.receiver.email}"
