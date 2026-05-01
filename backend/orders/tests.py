"""
API tests for order and payment flows.

Covers order creation, state transitions, permissions, and payment behavior.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from listings.models import Category, Listing
from orders.models import Order, Payment

User = get_user_model()


class OrderAPITests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email="seller@test.com", password="pass12345"
        )
        self.buyer = User.objects.create_user(
            email="buyer@test.com", password="pass12345"
        )
        self.other_user = User.objects.create_user(
            email="other@test.com", password="pass12345"
        )

        self.category = Category.objects.create(name="Electronics")

        self.available_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Laptop",
            description="Available item",
            price="500.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )

        self.reserved_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Reserved Item",
            description="Reserved item",
            price="300.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.RESERVED,
        )

        self.sold_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Sold Item",
            description="Sold item",
            price="400.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.SOLD,
        )

        self.cancelled_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Cancelled Item",
            description="Cancelled item",
            price="250.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.CANCELLED,
        )

        self.orders_url = "/api/orders/"
        self.payments_url = "/api/orders/payments/"
        self.create_intent_url = "/api/orders/payments/create-intent/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_pending_order(self, buyer=None, listing=None, offered_price="480.00"):
        listing = listing or self.available_listing
        return Order.objects.create(
            buyer=buyer or self.buyer,
            listing=listing,
            offered_price=offered_price,
            status=Order.Status.PENDING,
        )

    def create_accepted_order(self, buyer=None, listing=None, offered_price="480.00"):
        listing = listing or Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Accepted Flow Item",
            description="Accepted flow",
            price="500.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )

        order = Order.objects.create(
            buyer=buyer or self.buyer,
            listing=listing,
            offered_price=offered_price,
            status=Order.Status.PENDING,
        )

        order.accept()
        listing.status = Listing.Status.RESERVED
        listing.save(update_fields=["status"])

        return order

    def create_completed_order(self, buyer=None, listing=None, offered_price="480.00"):
        order = self.create_accepted_order(
            buyer=buyer,
            listing=listing,
            offered_price=offered_price,
        )

        order.complete()
        listing = order.listing
        listing.status = Listing.Status.SOLD
        listing.save(update_fields=["status"])

        return order

    # Order creation tests
    def test_buyer_can_create_order(self):
        self.authenticate(self.buyer)

        payload = {
            "listing": self.available_listing.id,
            "offered_price": "480.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

        order = Order.objects.first()
        self.assertEqual(order.buyer, self.buyer)
        self.assertEqual(order.listing, self.available_listing)
        self.assertEqual(order.status, Order.Status.PENDING)

    def test_buyer_cannot_order_own_listing(self):
        self.authenticate(self.seller)

        payload = {
            "listing": self.available_listing.id,
            "offered_price": "450.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_buyer_cannot_order_reserved_listing(self):
        self.authenticate(self.buyer)

        payload = {
            "listing": self.reserved_listing.id,
            "offered_price": "280.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_buyer_cannot_order_sold_listing(self):
        self.authenticate(self.buyer)

        payload = {
            "listing": self.sold_listing.id,
            "offered_price": "380.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_buyer_cannot_order_cancelled_listing(self):
        self.authenticate(self.buyer)

        payload = {
            "listing": self.cancelled_listing.id,
            "offered_price": "200.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_creation_rejects_invalid_offered_price(self):
        self.authenticate(self.buyer)

        payload = {
            "listing": self.available_listing.id,
            "offered_price": "0.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_unauthenticated_user_cannot_create_order(self):
        payload = {
            "listing": self.available_listing.id,
            "offered_price": "480.00",
        }

        response = self.client.post(self.orders_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # Order detail tests
    def test_buyer_can_view_own_order_detail(self):
        order = self.create_pending_order()

        self.authenticate(self.buyer)
        response = self.client.get(f"/api/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], order.id)

    def test_seller_can_view_order_detail_for_own_listing(self):
        order = self.create_pending_order()

        self.authenticate(self.seller)
        response = self.client.get(f"/api/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], order.id)

    def test_unrelated_user_cannot_view_order_detail(self):
        order = self.create_pending_order()

        self.authenticate(self.other_user)
        response = self.client.get(f"/api/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # Accept tests
    def test_seller_can_accept_pending_order(self):
        order = self.create_pending_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.available_listing.refresh_from_db()

        self.assertEqual(order.status, Order.Status.ACCEPTED)
        self.assertEqual(self.available_listing.status, Listing.Status.RESERVED)

    def test_buyer_cannot_accept_order(self):
        order = self.create_pending_order()

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_accept_order_if_listing_not_available(self):
        order = self.create_pending_order(listing=self.available_listing)
        self.available_listing.status = Listing.Status.SOLD
        self.available_listing.save(update_fields=["status"])

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_cannot_accept_non_pending_order(self):
        order = self.create_accepted_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    # Reject tests
    def test_seller_can_reject_pending_order(self):
        order = self.create_pending_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/reject/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.REJECTED)

    def test_buyer_cannot_reject_order(self):
        order = self.create_pending_order()

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/reject/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_reject_non_pending_order(self):
        order = self.create_accepted_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/reject/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Cancel tests
    def test_buyer_can_cancel_pending_order(self):
        order = self.create_pending_order()

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.cancelled_by, Order.CancelledBy.BUYER)
        self.assertEqual(
            order.cancellation_reason, Order.CancellationReason.BUYER_CHANGED_MIND
        )

    def test_buyer_can_cancel_accepted_order(self):
        accepted_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Reserved for cancel",
            description="Reserved item",
            price="500.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )
        order = self.create_accepted_order(listing=accepted_listing)

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        accepted_listing.refresh_from_db()

        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(order.cancelled_by, Order.CancelledBy.BUYER)
        self.assertEqual(
            order.cancellation_reason, Order.CancellationReason.BUYER_CHANGED_MIND
        )
        self.assertEqual(accepted_listing.status, Listing.Status.AVAILABLE)

    def test_seller_cannot_cancel_buyers_order(self):
        order = self.create_pending_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_cancel_completed_order(self):
        order = self.create_completed_order()

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Complete order tests
    def test_seller_can_complete_accepted_order(self):
        accepted_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Reserved complete",
            description="Reserved item",
            price="600.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )
        order = self.create_accepted_order(listing=accepted_listing)

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/complete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        accepted_listing.refresh_from_db()

        self.assertEqual(order.status, Order.Status.COMPLETED)
        self.assertEqual(accepted_listing.status, Listing.Status.SOLD)

    def test_buyer_cannot_complete_order(self):
        order = self.create_accepted_order()

        self.authenticate(self.buyer)
        response = self.client.post(f"/api/orders/{order.id}/complete/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_complete_non_accepted_order(self):
        order = self.create_pending_order()

        self.authenticate(self.seller)
        response = self.client.post(f"/api/orders/{order.id}/complete/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Payment intent tests
    def test_buyer_can_create_payment_for_accepted_order(self):
        order = self.create_accepted_order()

        self.authenticate(self.buyer)
        payload = {"order": order.id}
        response = self.client.post(self.create_intent_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)

        payment = Payment.objects.first()
        self.assertEqual(payment.order, order)
        self.assertEqual(payment.amount, order.offered_price)
        self.assertEqual(payment.status, Payment.Status.PENDING)

    def test_payment_allowed_only_for_accepted_orders(self):
        order = self.create_pending_order()

        self.authenticate(self.buyer)
        payload = {"order": order.id}
        response = self.client.post(self.create_intent_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Payment.objects.count(), 0)

    def test_duplicate_payment_creation_blocked(self):
        order = self.create_accepted_order()
        Payment.objects.create(
            order=order,
            stripe_payment_intent_id="pi_existing_123",
            amount=order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )

        self.authenticate(self.buyer)
        payload = {"order": order.id}
        response = self.client.post(self.create_intent_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Payment.objects.count(), 1)

    def test_other_user_cannot_create_payment_for_someone_elses_order(self):
        order = self.create_accepted_order()

        self.authenticate(self.other_user)
        payload = {"order": order.id}
        response = self.client.post(self.create_intent_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # Payment list/detail tests
    def test_buyer_can_list_own_payments(self):
        order = self.create_accepted_order()
        Payment.objects.create(
            order=order,
            stripe_payment_intent_id="pi_list_test_123",
            amount=order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )

        self.authenticate(self.buyer)
        response = self.client.get(self.payments_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["order"], order.id)

    def test_buyer_can_retrieve_own_payment_detail(self):
        order = self.create_accepted_order()
        payment = Payment.objects.create(
            order=order,
            stripe_payment_intent_id="pi_detail_test_123",
            amount=order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )

        self.authenticate(self.buyer)
        response = self.client.get(f"/api/orders/payments/{payment.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], payment.id)

    def test_other_user_cannot_view_payment_detail(self):
        order = self.create_accepted_order()
        payment = Payment.objects.create(
            order=order,
            stripe_payment_intent_id="pi_other_user_test_123",
            amount=order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )

        self.authenticate(self.other_user)
        response = self.client.get(f"/api/orders/payments/{payment.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_payment_list_shows_only_current_users_payments(self):
        buyer_order = self.create_accepted_order()

        other_listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Other buyer item",
            description="Other buyer listing",
            price="700.00",
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )
        other_order = Order.objects.create(
            buyer=self.other_user,
            listing=other_listing,
            offered_price="650.00",
            status=Order.Status.PENDING,
        )
        other_order.accept()
        other_listing.status = Listing.Status.RESERVED
        other_listing.save(update_fields=["status"])

        Payment.objects.create(
            order=buyer_order,
            stripe_payment_intent_id="pi_buyer_only_123",
            amount=buyer_order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )
        Payment.objects.create(
            order=other_order,
            stripe_payment_intent_id="pi_other_only_123",
            amount=other_order.offered_price,
            currency="USD",
            status=Payment.Status.PENDING,
        )

        self.authenticate(self.buyer)
        response = self.client.get(self.payments_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["order"], buyer_order.id)
