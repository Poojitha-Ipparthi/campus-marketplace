"""
Background tasks for the orders app.

release_expired_reservations:
    Runs every minute via Celery Beat.
    Finds all ACCEPTED orders whose reserved_until has passed,
    cancels them as system-expired, and releases the listing back
    to AVAILABLE so other buyers can order it.
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction


@shared_task
def release_expired_reservations():
    """
    Release listings that are stuck in RESERVED state due to
    expired payment windows.

    Flow:
        1. Find ACCEPTED orders where reserved_until < now
        2. Cancel each order with reason RESERVATION_EXPIRED
        3. Set listing status back to AVAILABLE
        4. Log how many were released
    """
    from .models import Order
    from listings.models import Listing

    now = timezone.now()

    # Find all expired accepted orders
    expired_orders = Order.objects.filter(
        status=Order.Status.ACCEPTED,
        reserved_until__lt=now,
    ).select_related("listing")

    released_count = 0

    for order in expired_orders:
        try:
            with transaction.atomic():
                # Cancel the order as system-expired
                order.cancel_due_to_expiration()

                # Release the listing back to AVAILABLE
                listing = order.listing
                if listing.status == Listing.Status.RESERVED:
                    listing.status = Listing.Status.AVAILABLE
                    listing.save(update_fields=["status"])

                released_count += 1
        except Exception as e:
            # Log but don't crash — process remaining orders
            print(f"Error releasing order {order.id}: {e}")

    if released_count > 0:
        print(f"Released {released_count} expired reservation(s).")

    return released_count
