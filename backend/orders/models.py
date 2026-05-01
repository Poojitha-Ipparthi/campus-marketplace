"""
Database models and business rules for orders and payments.

Defines order/payment states, cancellation rules, reservation handling,
and validation for marketplace transactions.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from listings.models import Listing
from django.utils import timezone


class Order(models.Model):
    # Lifecycle states of an order
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    # Who triggered the cancellation
    class CancelledBy(models.TextChoices):
        BUYER = "BUYER", "Buyer"
        SELLER = "SELLER", "Seller"
        SYSTEM = "SYSTEM", "System"
        PAYMENT = "PAYMENT", "Payment"

    # Reason for cancellation (audit + analytics)
    class CancellationReason(models.TextChoices):
        BUYER_CHANGED_MIND = "BUYER_CHANGED_MIND", "Buyer changed mind"
        SELLER_UNAVAILABLE = "SELLER_UNAVAILABLE", "Seller unavailable"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment failed"
        RESERVATION_EXPIRED = "RESERVATION_EXPIRED", "Reservation expired"
        LISTING_UNAVAILABLE = "LISTING_UNAVAILABLE", "Listing unavailable"
        ADMIN_CANCELLED = "ADMIN_CANCELLED", "Admin cancelled"
        OTHER = "OTHER", "Other"

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )

    # Listing being purchased
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="orders"
    )

    # Price at time of order (can differ from listing price)
    offered_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Current state of the order
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Cancellation metadata
    cancellation_reason = models.CharField(
        max_length=50, choices=CancellationReason.choices, null=True, blank=True
    )
    cancelled_by = models.CharField(
        max_length=20, choices=CancelledBy.choices, null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Used for reservation timeout logic
    reserved_until = models.DateTimeField(null=True, blank=True)

    def clean(self):
        errors = {}

        # Prevent users from buying their own listing
        if (
            self.listing_id
            and self.buyer_id
            and self.buyer_id == self.listing.seller_id
        ):
            errors["buyer"] = "You cannot place an order on your own listing."

        # Ensure valid price
        if self.offered_price is None or self.offered_price < 0:
            errors["offered_price"] = "Offered price cannot be negative."

        # Only allow orders on available listings (creation only)
        if self._state.adding and self.listing_id:
            if self.listing.status in (
                Listing.Status.RESERVED,
                Listing.Status.SOLD,
                Listing.Status.CANCELLED,
            ):
                errors["listing"] = (
                    "Cannot place an order on a reserved, sold, or cancelled listing."
                )

        # Ensure cancellation fields are consistent
        if self.status == self.Status.CANCELLED:
            if not self.cancelled_by:
                errors["cancelled_by"] = "Cancelled orders must specify who cancelled."
            if not self.cancellation_reason:
                errors["cancellation_reason"] = (
                    "Cancelled orders must specify a reason."
                )
        else:
            if self.cancelled_by is not None:
                errors["cancelled_by"] = "Only cancelled orders can have cancelled_by."
            if self.cancellation_reason is not None:
                errors["cancellation_reason"] = (
                    "Only cancelled orders can have a cancellation reason."
                )

        if errors:
            raise ValidationError(errors)

    # Accept order (only from PENDING)
    def accept(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Only pending orders can be accepted.")

        self.status = self.Status.ACCEPTED
        self.save(update_fields=["status", "updated_at"])

    # Reject order (only from PENDING)
    def reject(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Only pending orders can be rejected.")

        self.status = self.Status.REJECTED
        self.save(update_fields=["status", "updated_at"])

    # Complete order (only after ACCEPTED)
    def complete(self):
        if self.status != self.Status.ACCEPTED:
            raise ValidationError("Only accepted orders can be completed.")

        self.status = self.Status.COMPLETED
        self.save(update_fields=["status", "updated_at"])

    # Buyer cancels order
    def cancel_by_buyer(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError(
                "Only pending or accepted orders can be cancelled by the buyer."
            )

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.BUYER
        self.cancellation_reason = self.CancellationReason.BUYER_CHANGED_MIND
        self.save(
            update_fields=[
                "status",
                "cancelled_by",
                "cancellation_reason",
                "updated_at",
            ]
        )

    # Seller cancels order
    def cancel_by_seller(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError(
                "Only pending or accepted orders can be cancelled by the seller."
            )

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.SELLER
        self.cancellation_reason = self.CancellationReason.SELLER_UNAVAILABLE
        self.save(
            update_fields=[
                "status",
                "cancelled_by",
                "cancellation_reason",
                "updated_at",
            ]
        )

    # Cancel due to failed payment
    def cancel_due_to_payment_failure(self):
        if self.status not in [self.Status.PENDING, self.Status.ACCEPTED]:
            raise ValidationError(
                "Only pending or accepted orders can be cancelled due to payment failure."
            )

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.PAYMENT
        self.cancellation_reason = self.CancellationReason.PAYMENT_FAILED

        # Release reservation window
        self.reserved_until = None

        self.save(
            update_fields=[
                "status",
                "cancelled_by",
                "cancellation_reason",
                "reserved_until",
                "updated_at",
            ]
        )

    # Cancel due to reservation expiry
    def cancel_due_to_expiration(self):
        if self.status != self.Status.ACCEPTED:
            raise ValidationError("Only accepted orders can expire.")

        self.status = self.Status.CANCELLED
        self.cancelled_by = self.CancelledBy.SYSTEM
        self.cancellation_reason = self.CancellationReason.RESERVATION_EXPIRED

        # Release reservation window
        self.reserved_until = None

        self.save(
            update_fields=[
                "status",
                "cancelled_by",
                "cancellation_reason",
                "reserved_until",
                "updated_at",
            ]
        )

    def save(self, *args, **kwargs):
        # Ensure all business rules are validated before saving
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} - {self.status}"


class Payment(models.Model):
    # Payment lifecycle states
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    # Each order has exactly one payment record
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )

    # Stripe identifier for tracking payment
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")

    # Current payment status
    status = models.CharField(
        max_length=50, choices=Status.choices, default=Status.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for Order {self.order.id}"
