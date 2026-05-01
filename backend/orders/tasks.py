"""
Background tasks for the orders app.

release_expired_reservations:
    Runs periodically to release listings stuck in RESERVED state
    due to expired payment windows.
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction


@shared_task
def release_expired_reservations():
    """
    Cancel expired accepted orders and release their listings.

    Steps:
        1. Find ACCEPTED orders where reserved_until < now
        2. Cancel order as RESERVATION_EXPIRED
        3. Set listing back to AVAILABLE
    """
    from .models import Order
    from listings.models import Listing

    now = timezone.now()

    # Get all orders whose reservation window has expired
    expired_orders = Order.objects.filter(
        status=Order.Status.ACCEPTED,
        reserved_until__lt=now,
    ).select_related("listing")

    released_count = 0

    for order in expired_orders:
        try:
            # Ensure order + listing update happen safely together
            with transaction.atomic():
                # Cancel order with system expiration logic
                order.cancel_due_to_expiration()

                # Release listing so others can buy it
                listing = order.listing
                if listing.status == Listing.Status.RESERVED:
                    listing.status = Listing.Status.AVAILABLE
                    listing.save(update_fields=["status"])

                released_count += 1

        except Exception as e:
            # Log error but continue processing other orders
            print(f"Error releasing order {order.id}: {e}")

    if released_count > 0:
        print(f"Released {released_count} expired reservation(s).")

    return released_count
