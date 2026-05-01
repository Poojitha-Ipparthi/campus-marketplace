"""
Database model for transaction reviews.

Stores buyer-to-seller ratings and enforces review integrity rules.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from orders.models import Order


class Review(models.Model):
    # User who writes the review (buyer)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_given"
    )

    # User being reviewed (seller)
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )

    # Each order can have only one review
    order = models.OneToOneField(Order, on_delete=models.CASCADE)

    # Rating between 1 and 5
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # Reviews allowed only after transaction is completed
        if self.order.status != Order.Status.COMPLETED:
            raise ValidationError("Review can only be created for completed orders.")

        # Only the buyer can leave a review
        if self.reviewer != self.order.buyer:
            raise ValidationError("Only the buyer can leave a review.")

        # Review must target the seller of the listing
        if self.reviewee != self.order.listing.seller:
            raise ValidationError("Review must be for the seller of the listing.")

    def save(self, *args, **kwargs):
        # Ensure validation rules are enforced before saving
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Review {self.rating}"
