"""
Database models for user blocking and reporting.

Tracks blocked users and reports against users, listings, or messages.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from listings.models import Listing
from messaging.models import Message


class BlockedUser(models.Model):
    # User who initiates the block
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocks_initiated",
    )

    # User being blocked
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocks_received",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate block relationships between same users
        constraints = [
            models.UniqueConstraint(
                fields=["blocker", "blocked"], name="unique_block_relationship"
            )
        ]

    def clean(self):
        # Prevent users from blocking themselves
        if self.blocker_id and self.blocked_id and self.blocker_id == self.blocked_id:
            raise ValidationError({"blocked": "A user cannot block themselves."})

    def save(self, *args, **kwargs):
        # Ensure validation runs before saving
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.blocker.email} blocked {self.blocked.email}"


class Report(models.Model):
    # Lifecycle of a report for moderation workflow
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        REVIEWED = "REVIEWED", "Reviewed"
        RESOLVED = "RESOLVED", "Resolved"

    # User who submits the report
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_submitted",
    )

    # Target of the report (one or more can be set)
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_against_user",
        null=True,
        blank=True,
    )

    reported_listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="reports_against_listing",
        null=True,
        blank=True,
    )

    reported_message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reports_against_message",
        null=True,
        blank=True,
    )

    reason = models.TextField()

    # Tracks moderation progress
    status = models.CharField(
        max_length=50, choices=Status.choices, default=Status.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # Ensure report targets at least one entity
        if not any([self.reported_user, self.reported_listing, self.reported_message]):
            raise ValidationError(
                {
                    "detail": "A report must target at least one user, listing, or message."
                }
            )

    def save(self, *args, **kwargs):
        # Validate before saving to maintain data integrity
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Report by {self.reporter.email}"
