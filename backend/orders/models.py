from django.db import models
from django.conf import settings
from listings.models import Listing
from django.core.exceptions import ValidationError


class Order(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('NEGOTIATING', 'Negotiating'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )

    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name='orders'
    )

    offered_price = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Rule 1: Buyer cannot order their own listing
        if self.listing and self.buyer == self.listing.seller:
            raise ValidationError("You cannot place an order on your own listing.")

        # Rule 2: Cannot order SOLD or CANCELLED listings
        if self.listing and self.listing.status in ['SOLD', 'CANCELLED']:
            raise ValidationError("Cannot place an order on a sold or cancelled listing.")

    def save(self, *args, **kwargs):
        self.clean()  # enforce validation before saving
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} - {self.status}"