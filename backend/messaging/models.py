"""
Database model for in-app messages.

Stores buyer/seller messages linked to listings.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from listings.models import Listing


class Message(models.Model):
    # User who sends the message
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent"
    )

    # User who receives the message
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_received",
    )

    # Listing this conversation is related to
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="messages"
    )

    content = models.TextField()

    # Tracks whether receiver has read the message
    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    # Prevent users from messaging themselves
    def clean(self):
        if self.sender == self.receiver:
            raise ValidationError("A user cannot send a message to themselves.")

    def save(self, *args, **kwargs):
        # Validate before saving to database
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Message from {self.sender.email} to {self.receiver.email}"
