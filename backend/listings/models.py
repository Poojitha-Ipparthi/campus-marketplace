"""
Database models for marketplace listings.

Defines categories, listings, listing images, and listing-level validation.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Category(models.Model):
    # Unique category name for grouping listings
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Listing(models.Model):
    # Possible lifecycle states of a listing
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        RESERVED = "RESERVED", "Reserved"
        SOLD = "SOLD", "Sold"
        CANCELLED = "CANCELLED", "Cancelled"

    # Condition of the item being sold
    class Condition(models.TextChoices):
        NEW = "NEW", "New"
        USED = "USED", "Used"

    # Seller who created the listing
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings"
    )

    # Optional category for filtering/grouping listings
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="listings",
        null=True,
        blank=True,
    )

    title = models.CharField(max_length=255)
    description = models.TextField()

    # Price stored as decimal for accuracy
    price = models.DecimalField(max_digits=10, decimal_places=2)
    condition = models.CharField(
        max_length=20, choices=Condition.choices, default=Condition.USED
    )

    # Controls allowed actions (buy, reserve, etc.)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AVAILABLE
    )

    created_at = models.DateTimeField(auto_now_add=True)

    # Ensure price is valid before saving to DB
    def clean(self):
        if self.price is None or self.price < 0:
            raise ValidationError({"price": "Price cannot be negative."})

    def save(self, *args, **kwargs):
        # Run model validation before saving
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ListingImage(models.Model):
    # Each listing can have multiple associated images
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="images"
    )

    # Stores URL of image (e.g., Firebase)
    image_url = models.URLField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.listing.title}"
