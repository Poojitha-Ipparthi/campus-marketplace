from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from listings.models import Listing


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    class CancelledBy(models.TextChoices):
        BUYER = "BUYER", "Buyer"
        SELLER = "SELLER", "Seller"
        SYSTEM = "SYSTEM", "System"
        PAYMENT = "PAYMENT", "Payment"

    class CancellationReason(models.TextChoices):
        BUYER_CHANGED_MIND = "BUYER_CHANGED_MIND", "Buyer changed mind"
        SELLER_UNAVAILABLE = "SELLER_UNAVAILABLE", "Seller unavailable"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment failed"
        RESERVATION_EXPIRED = "RESERVATION_EXPIRED", "Reservation expired"
        LISTING_UNAVAILABLE = "LISTING_UNAVAILABLE", "Listing unavailable"
        ADMIN_CANCELLED = "ADMIN_CANCELLED", "Admin cancelled"
        OTHER = "OTHER", "Other"

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    offered_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    cancellation_reason = models.CharField(
        max_length=50,
        choices=CancellationReason.choices,
        null=True,
        blank=True
    )
    cancelled_by = models.CharField(
        max_length=20,
        choices=CancelledBy.choices,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        errors = {}

        if self.listing_id and self.buyer_id and self.buyer_id == self.listing.seller_id:
            errors["buyer"] = "You cannot place an order on your own listing."

        if self.offered_price is None or self.offered_price <= 0:
            errors["offered_price"] = "Offered price must be greater than zero."

        # Enforce listing availability only when creating a new order
        if self._state.adding and self.listing_id:
            if self.listing.status in (
                Listing.Status.RESERVED,
                Listing.Status.SOLD,
                Listing.Status.CANCELLED,
            ):
                errors["listing"] = "Cannot place an order on a reserved, sold, or cancelled listing."

        # Cancellation integrity
        if self.status == self.Status.CANCELLED:
            if not self.cancelled_by:
                errors["cancelled_by"] = "Cancelled orders must specify who cancelled."
            if not self.cancellation_reason:
                errors["cancellation_reason"] = "Cancelled orders must specify a reason."
        else:
            if self.cancelled_by is not None:
                errors["cancelled_by"] = "Only cancelled orders can have cancelled_by."
            if self.cancellation_reason is not None:
                errors["cancellation_reason"] = "Only cancelled orders can have a cancellation reason."

        if errors:
            raise ValidationError(errors)

    def cancel_by_buyer(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError("Only pending or accepted orders can be cancelled by the buyer.")

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.BUYER
        self.cancellation_reason = self.CancellationReason.BUYER_CHANGED_MIND
        self.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

    def cancel_by_seller(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError("Only pending or accepted orders can be cancelled by the seller.")

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.SELLER
        self.cancellation_reason = self.CancellationReason.SELLER_UNAVAILABLE
        self.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

    def cancel_due_to_payment_failure(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError("Only pending or accepted orders can be cancelled due to payment failure.")

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.PAYMENT
        self.cancellation_reason = self.CancellationReason.PAYMENT_FAILED
        self.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

    def cancel_due_to_expiration(self):
        if self.status != self.Status.ACCEPTED:
            raise ValidationError("Only accepted orders can expire.")

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.SYSTEM
        self.cancellation_reason = self.CancellationReason.RESERVATION_EXPIRED
        self.save(update_fields=["status", "cancelled_by", "cancellation_reason", "updated_at"])

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} - {self.status}"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payments"
    )
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for Order {self.order.id}"