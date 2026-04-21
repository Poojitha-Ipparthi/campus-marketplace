from django.test import TestCase

# Create your tests here.
def test_cancel_by_buyer_sets_fields(self):
    listing = self.create_listing()

    order = Order.objects.create(
        buyer=self.buyer,
        listing=listing,
        offered_price=100,
    )

    order.cancel_by_buyer()

    order.refresh_from_db()

    self.assertEqual(order.status, Order.Status.CANCELLED)
    self.assertEqual(order.cancelled_by, Order.CancelledBy.BUYER)
    self.assertEqual(
        order.cancellation_reason,
        Order.CancellationReason.BUYER_CHANGED_MIND
    )