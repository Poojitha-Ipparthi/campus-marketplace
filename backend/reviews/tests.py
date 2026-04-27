from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from listings.models import Category, Listing
from orders.models import Order
from reviews.models import Review

User = get_user_model()


class ReviewAPITests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email="seller@test.com",
            password="pass12345"
        )
        self.buyer = User.objects.create_user(
            email="buyer@test.com",
            password="pass12345"
        )
        self.other_user = User.objects.create_user(
            email="other@test.com",
            password="pass12345"
        )

        self.category = Category.objects.create(name="Electronics")

        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Laptop",
            description="Good condition",
            price="500.00",
            condition=Listing.Condition.USED,
        )

        self.completed_order = Order.objects.create(
            buyer=self.buyer,
            listing=self.listing,
            offered_price="480.00",
            status=Order.Status.COMPLETED,
        )

        self.pending_order = Order.objects.create(
            buyer=self.buyer,
            listing=self.listing,
            offered_price="470.00",
            status=Order.Status.PENDING,
        )

        self.list_url = "/api/reviews/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_list_reviews_returns_200(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_review_detail_returns_200(self):
        review = Review.objects.create(
            reviewer=self.buyer,
            reviewee=self.seller,
            order=self.completed_order,
            rating=5,
            comment="Great seller"
        )

        response = self.client.get(f"/api/reviews/{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], review.id)

    def test_authenticated_buyer_can_create_review_for_completed_order(self):
        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 5,
            "comment": "Excellent transaction"
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

        review = Review.objects.get(id=response.data["id"])
        self.assertEqual(review.reviewer, self.buyer)
        self.assertEqual(review.reviewee, self.seller)
        self.assertEqual(review.order, self.completed_order)
        self.assertEqual(review.rating, 5)

    def test_unauthenticated_user_cannot_create_review(self):
        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 5,
            "comment": "Excellent transaction"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_review_cannot_be_created_for_non_completed_order(self):
        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.seller.id,
            "order": self.pending_order.id,
            "rating": 4,
            "comment": "Too early"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)

    def test_only_buyer_can_leave_review(self):
        self.authenticate(self.other_user)

        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 4,
            "comment": "I was not the buyer"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)

    def test_reviewee_must_be_seller(self):
        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.other_user.id,
            "order": self.completed_order.id,
            "rating": 4,
            "comment": "Wrong reviewee"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)

    def test_one_review_per_order_enforced(self):
        Review.objects.create(
            reviewer=self.buyer,
            reviewee=self.seller,
            order=self.completed_order,
            rating=5,
            comment="First review"
        )

        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 4,
            "comment": "Second review"
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 1)

    def test_invalid_rating_below_range_rejected(self):
        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 0,
            "comment": "Invalid rating"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_rating_above_range_rejected(self):
        self.authenticate(self.buyer)

        payload = {
            "reviewee": self.seller.id,
            "order": self.completed_order.id,
            "rating": 6,
            "comment": "Invalid rating"
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)