from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from listings.models import Listing, Category
from orders.models import Order
from reviews.models import Review
from reporting.models import Report

User = get_user_model()

class TrustScoreTestCase(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Electronics")

        self.seller = User.objects.create_user(
            email="seller@test.com", password="pass123"
        )
        self.buyer = User.objects.create_user(
            email="buyer@test.com", password="pass123"
        )

    def create_listing(self):
        return Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Test Item",
            description="Desc",
            price=100,
        )

    def create_completed_order(self):
        listing = self.create_listing()
        order = Order.objects.create(
            buyer=self.buyer,
            listing=listing,
            offered_price=100,
            status=Order.Status.COMPLETED,
        )
        return order

    def create_cancelled_order(self):
        listing = self.create_listing()
        return Order.objects.create(
            buyer=self.buyer,
            listing=listing,
            offered_price=100,
            status=Order.Status.CANCELLED,
        )
        
        # New user baseline
    def test_new_user_trust_score_is_zero(self):
        self.assertEqual(self.seller.trust_score, Decimal("0.00"))
        
    # Review impact
    def test_review_updates_trust_score(self):
        order = self.create_completed_order()

        Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=5,
            comment="Great seller",
        )

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("5.00"))
        
    # Multiple reviews average
    def test_multiple_reviews_average(self):
        order1 = self.create_completed_order()
        order2 = self.create_completed_order()

        Review.objects.create(
            order=order1,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=4,
            comment="Good",
        )

        Review.objects.create(
            order=order2,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=2,
            comment="Bad",
        )

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("3.00"))
        
    # completion Bonus
    def test_completion_bonus_applied(self):
        # 5 completed orders → +0.10
        for _ in range(5):
            self.create_completed_order()

        # Add base review to avoid 0 baseline
        order = self.create_completed_order()
        Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=4,
            comment="Good",
        )

        self.seller.refresh_from_db()

        # 4.00 + 0.10 = 4.10
        self.assertEqual(self.seller.trust_score, Decimal("4.10"))
        
    # Cancellation penalty
    def test_cancellation_penalty_applied(self):
        # 10 orders, 4 cancelled → rate = 0.4 → penalty = 0.6
        for _ in range(6):
            self.create_completed_order()

        for _ in range(4):
            self.create_cancelled_order()

        order = self.create_completed_order()
        Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=5,
            comment="Great",
        )

        self.seller.refresh_from_db()

        # 5.00 - 0.60 = 4.40
        self.assertEqual(self.seller.trust_score, Decimal("4.55"))
        
    # Report penalty
    def test_report_penalty_applied(self):
        order = self.create_completed_order()

        Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=4,
            comment="Good",
        )

        Report.objects.create(
            reporter=self.buyer,
            reported_user=self.seller,
            reason="Spam",
            status=Report.Status.RESOLVED,
        )

        self.seller.refresh_from_db()

        # 4.00 - 0.20 = 3.80
        self.assertEqual(self.seller.trust_score, Decimal("3.80"))
        
    # Score clamped at 5.0
    def test_score_does_not_exceed_max(self):
        # Force large bonus
        for _ in range(50):
            self.create_completed_order()

        order = self.create_completed_order()
        Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=5,
            comment="Perfect",
        )

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("5.00"))
        
    # Score never goes below 0
    def test_score_never_negative(self):
        # No reviews → base 0
        # Add penalties
        for _ in range(10):
            self.create_cancelled_order()

        for _ in range(5):
            Report.objects.create(
                reporter=self.buyer,
                reported_user=self.seller,
                reason="Abuse",
                status=Report.Status.RESOLVED,
            )

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("0.00"))
        
    # Delete review recalculates score
    def test_review_delete_updates_score(self):
        order = self.create_completed_order()

        review = Review.objects.create(
            order=order,
            reviewer=self.buyer,
            reviewee=self.seller,
            rating=5,
            comment="Great",
        )

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("5.00"))

        review.delete()

        self.seller.refresh_from_db()
        self.assertEqual(self.seller.trust_score, Decimal("0.00"))