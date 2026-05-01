from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from listings.models import Category, Listing
from messaging.models import Message
from reporting.models import BlockedUser, Report

User = get_user_model()


class ReportingAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email="user1@test.com", password="pass12345"
        )
        self.user2 = User.objects.create_user(
            email="user2@test.com", password="pass12345"
        )
        self.user3 = User.objects.create_user(
            email="user3@test.com", password="pass12345"
        )

        self.category = Category.objects.create(name="Electronics")

        self.listing = Listing.objects.create(
            seller=self.user2,
            category=self.category,
            title="Phone",
            description="Test listing",
            price="300.00",
            condition=Listing.Condition.USED,
        )

        self.message = Message.objects.create(
            sender=self.user2,
            receiver=self.user1,
            listing=self.listing,
            content="Is this still available?",
        )

        self.blocks_url = "/api/reporting/blocks/"
        self.reports_url = "/api/reporting/reports/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    # Block tests
    def test_authenticated_user_can_block_another_user(self):
        self.authenticate(self.user1)

        payload = {"blocked": self.user2.id}
        response = self.client.post(self.blocks_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BlockedUser.objects.count(), 1)

        block = BlockedUser.objects.first()
        self.assertEqual(block.blocker, self.user1)
        self.assertEqual(block.blocked, self.user2)

    def test_user_cannot_block_self(self):
        self.authenticate(self.user1)

        payload = {"blocked": self.user1.id}
        response = self.client.post(self.blocks_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(BlockedUser.objects.count(), 0)

    def test_user_cannot_block_same_user_twice(self):
        BlockedUser.objects.create(blocker=self.user1, blocked=self.user2)

        self.authenticate(self.user1)

        payload = {"blocked": self.user2.id}
        response = self.client.post(self.blocks_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(BlockedUser.objects.count(), 1)

    def test_block_list_shows_only_current_users_blocks(self):
        BlockedUser.objects.create(blocker=self.user1, blocked=self.user2)
        BlockedUser.objects.create(blocker=self.user2, blocked=self.user3)

        self.authenticate(self.user1)
        response = self.client.get(self.blocks_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["blocked"], self.user2.id)

    def test_user_can_unblock_own_block(self):
        block = BlockedUser.objects.create(blocker=self.user1, blocked=self.user2)

        self.authenticate(self.user1)
        response = self.client.delete(f"/api/reporting/blocks/{block.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(BlockedUser.objects.filter(id=block.id).exists())

    def test_user_cannot_delete_someone_elses_block(self):
        block = BlockedUser.objects.create(blocker=self.user2, blocked=self.user1)

        self.authenticate(self.user1)
        response = self.client.delete(f"/api/reporting/blocks/{block.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(BlockedUser.objects.filter(id=block.id).exists())

    # Report tests
    def test_user_can_report_another_user(self):
        self.authenticate(self.user1)

        payload = {"reported_user": self.user2.id, "reason": "Spam"}

        response = self.client.post(self.reports_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 1)

        report = Report.objects.first()
        self.assertEqual(report.reporter, self.user1)
        self.assertEqual(report.reported_user, self.user2)

    def test_user_can_report_listing(self):
        self.authenticate(self.user1)

        payload = {"reported_listing": self.listing.id, "reason": "Inappropriate item"}

        response = self.client.post(self.reports_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 1)

        report = Report.objects.first()
        self.assertEqual(report.reported_listing, self.listing)

    def test_user_can_report_message(self):
        self.authenticate(self.user1)

        payload = {"reported_message": self.message.id, "reason": "Harassment"}

        response = self.client.post(self.reports_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 1)

        report = Report.objects.first()
        self.assertEqual(report.reported_message, self.message)

    def test_report_without_target_is_rejected(self):
        self.authenticate(self.user1)

        payload = {"reason": "No target provided"}

        response = self.client.post(self.reports_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Report.objects.count(), 0)

    def test_report_list_shows_only_current_users_reports(self):
        Report.objects.create(
            reporter=self.user1, reported_user=self.user2, reason="Spam"
        )
        Report.objects.create(
            reporter=self.user2, reported_user=self.user1, reason="Abuse"
        )

        self.authenticate(self.user1)
        response = self.client.get(self.reports_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["reporter"], self.user1.id)

    def test_report_detail_shows_only_current_users_own_report(self):
        own_report = Report.objects.create(
            reporter=self.user1, reported_user=self.user2, reason="Spam"
        )
        other_report = Report.objects.create(
            reporter=self.user2, reported_user=self.user1, reason="Abuse"
        )

        self.authenticate(self.user1)

        response = self.client.get(f"/api/reporting/reports/{own_report.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], own_report.id)

        response = self.client.get(f"/api/reporting/reports/{other_report.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
