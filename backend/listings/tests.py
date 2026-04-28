from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from listings.models import Category, Listing

User = get_user_model()


class ListingAPITests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email="seller@test.com", password="pass12345"
        )
        self.other_user = User.objects.create_user(
            email="other@test.com", password="pass12345"
        )

        self.category1 = Category.objects.create(name="Electronics")
        self.category2 = Category.objects.create(name="Furniture")

        self.listing1 = Listing.objects.create(
            seller=self.seller,
            category=self.category1,
            title="Dell Laptop",
            description="Used laptop in good condition",
            price=Decimal("500.00"),
            condition=Listing.Condition.USED,
            status=Listing.Status.AVAILABLE,
        )

        self.listing2 = Listing.objects.create(
            seller=self.seller,
            category=self.category1,
            title="iPhone 13",
            description="Brand new sealed phone",
            price=Decimal("900.00"),
            condition=Listing.Condition.NEW,
            status=Listing.Status.AVAILABLE,
        )

        self.listing3 = Listing.objects.create(
            seller=self.other_user,
            category=self.category2,
            title="Wooden Desk",
            description="Used dorm study desk",
            price=Decimal("150.00"),
            condition=Listing.Condition.USED,
            status=Listing.Status.SOLD,
        )

        self.list_url = "/api/listings/"
        self.category_list_url = "/api/listings/categories/"

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    # -----------------------------
    # Category tests
    # -----------------------------
    def test_category_list_returns_all_categories(self):
        response = self.client.get(self.category_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_category_detail_returns_single_category(self):
        response = self.client.get(f"/api/listings/categories/{self.category1.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.category1.id)
        self.assertEqual(response.data["name"], "Electronics")

    # -----------------------------
    # Listing create tests
    # -----------------------------
    def test_authenticated_user_can_create_listing(self):
        self.authenticate(self.seller)

        payload = {
            "title": "Monitor",
            "description": "24 inch monitor",
            "price": "200.00",
            "condition": Listing.Condition.USED,
            "category_id": self.category1.id,
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Listing.objects.count(), 4)

        created = Listing.objects.get(id=response.data["id"])
        self.assertEqual(created.seller, self.seller)
        self.assertEqual(created.status, Listing.Status.AVAILABLE)
        self.assertEqual(created.category, self.category1)

    def test_unauthenticated_user_cannot_create_listing(self):
        payload = {
            "title": "Monitor",
            "description": "24 inch monitor",
            "price": "200.00",
            "condition": Listing.Condition.USED,
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_listing_rejects_negative_price(self):
        self.authenticate(self.seller)

        payload = {
            "title": "Bad Listing",
            "description": "Invalid price",
            "price": "-10.00",
            "condition": Listing.Condition.USED,
            "category_id": self.category1.id,
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -----------------------------
    # Listing detail tests
    # -----------------------------
    def test_listing_detail_returns_single_listing(self):
        response = self.client.get(f"/api/listings/{self.listing1.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.listing1.id)
        self.assertEqual(response.data["title"], "Dell Laptop")

    # -----------------------------
    # Update tests
    # -----------------------------
    def test_owner_can_update_listing(self):
        self.authenticate(self.seller)

        payload = {
            "title": "Updated Laptop",
            "description": self.listing1.description,
            "price": "550.00",
            "condition": Listing.Condition.USED,
            "category_id": self.category1.id,
        }

        response = self.client.patch(
            f"/api/listings/{self.listing1.id}/", payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.listing1.refresh_from_db()
        self.assertEqual(self.listing1.title, "Updated Laptop")
        self.assertEqual(self.listing1.price, Decimal("550.00"))

    def test_non_owner_cannot_update_listing(self):
        self.authenticate(self.other_user)

        payload = {"title": "Hacked Title"}

        response = self.client.patch(
            f"/api/listings/{self.listing1.id}/", payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -----------------------------
    # Delete tests
    # -----------------------------
    def test_owner_can_delete_listing(self):
        self.authenticate(self.seller)

        response = self.client.delete(f"/api/listings/{self.listing1.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Listing.objects.filter(id=self.listing1.id).exists())

    def test_non_owner_cannot_delete_listing(self):
        self.authenticate(self.other_user)

        response = self.client.delete(f"/api/listings/{self.listing1.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Listing.objects.filter(id=self.listing1.id).exists())

    # -----------------------------
    # Filter tests
    # -----------------------------
    def test_filter_by_condition(self):
        response = self.client.get(f"{self.list_url}?condition=USED")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}

        self.assertIn(self.listing1.id, returned_ids)
        self.assertIn(self.listing3.id, returned_ids)
        self.assertNotIn(self.listing2.id, returned_ids)

    def test_filter_by_status(self):
        response = self.client.get(f"{self.list_url}?status=SOLD")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing3.id)

    def test_filter_by_seller(self):
        response = self.client.get(f"{self.list_url}?seller={self.seller.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}

        self.assertIn(self.listing1.id, returned_ids)
        self.assertIn(self.listing2.id, returned_ids)
        self.assertNotIn(self.listing3.id, returned_ids)

    def test_filter_by_min_price(self):
        response = self.client.get(f"{self.list_url}?min_price=200")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}

        self.assertIn(self.listing1.id, returned_ids)
        self.assertIn(self.listing2.id, returned_ids)
        self.assertNotIn(self.listing3.id, returned_ids)

    def test_filter_by_max_price(self):
        response = self.client.get(f"{self.list_url}?max_price=500")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}

        self.assertIn(self.listing1.id, returned_ids)
        self.assertIn(self.listing3.id, returned_ids)
        self.assertNotIn(self.listing2.id, returned_ids)

    def test_filter_by_price_range(self):
        response = self.client.get(f"{self.list_url}?min_price=100&max_price=600")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}

        self.assertIn(self.listing1.id, returned_ids)
        self.assertIn(self.listing3.id, returned_ids)
        self.assertNotIn(self.listing2.id, returned_ids)

    def test_filter_by_category(self):
        response = self.client.get(f"{self.list_url}?category={self.category2.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing3.id)

    # -----------------------------
    # Search tests
    # -----------------------------
    def test_search_by_title(self):
        response = self.client.get(f"{self.list_url}?search=laptop")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing1.id)

    def test_search_by_description(self):
        response = self.client.get(f"{self.list_url}?search=dorm")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing3.id)

    # -----------------------------
    # Ordering tests
    # -----------------------------
    def test_order_by_price_ascending(self):
        response = self.client.get(f"{self.list_url}?ordering=price")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [Decimal(item["price"]) for item in response.data]
        self.assertEqual(prices, sorted(prices))

    def test_order_by_price_descending(self):
        response = self.client.get(f"{self.list_url}?ordering=-price")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [Decimal(item["price"]) for item in response.data]
        self.assertEqual(prices, sorted(prices, reverse=True))

    # -----------------------------
    # Combined filter test
    # -----------------------------
    def test_combined_filters(self):
        response = self.client.get(
            f"{self.list_url}?condition=USED&min_price=100&max_price=600&search=desk"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing3.id)

    # -----------------------------
    # Invalid filter value tests
    # -----------------------------
    def test_invalid_condition_filter_returns_400(self):
        response = self.client.get(f"{self.list_url}?condition=INVALID")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_status_filter_returns_400(self):
        response = self.client.get(f"{self.list_url}?status=INVALID")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_min_price_returns_400(self):
        response = self.client.get(f"{self.list_url}?min_price=abc")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
