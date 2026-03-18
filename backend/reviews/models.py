from django.db import models
from django.conf import settings
from orders.models import Order
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_given'
    )

    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_received'
    )

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE
    )

    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # Rule 1: Review only allowed after completed order
        if self.order.status != 'COMPLETED':
            raise ValidationError("Review can only be created for completed orders.")

        # Rule 2: Reviewer must be the buyer
        if self.reviewer != self.order.buyer:
            raise ValidationError("Only the buyer can leave a review.")

        # Rule 3: Reviewee must be the seller
        if self.reviewee != self.order.listing.seller:
            raise ValidationError("Review must be for the seller of the listing.")

    def save(self, *args, **kwargs):
        self.clean()  # enforce validation
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Review {self.rating}"