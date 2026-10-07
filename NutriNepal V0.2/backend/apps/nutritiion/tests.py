from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from decimal import Decimal

from .models import FoodItem, FoodAlias
from .serializers import FoodItemSerializer, FoodAliasSerializer


class FoodSerializerTests(TestCase):
    def setUp(self):
        # Create a food item for alias testing
        self.food_item = FoodItem.objects.create(
            name="Gundruk",
            description="Fermented leafy green vegetable",
            serving_unit="g",
            calories_per_100g=Decimal("48.50"),
            protein_per_100g=Decimal("3.40"),
            carbs_per_100g=Decimal("8.20"),
            fat_per_100g=Decimal("0.50"),
            fiber_per_100g=Decimal("1.80"),
            source="Nepal Food Composition Table",
            is_active=True,
        )
        self.alias1 = FoodAlias.objects.create(
            food_item=self.food_item,
            language="ne",
            alias="गुन्द्रुक",
            is_active=True,
        )
        self.alias2 = FoodAlias.objects.create(
            food_item=self.food_item,
            language="en",
            alias="Fermented Greens",
            is_active=True,
        )

    def test_food_alias_serializer_valid_data(self):
        """Test that FoodAliasSerializer serializes data correctly and validates valid input."""
        serializer = FoodAliasSerializer(instance=self.alias1)
        data = serializer.data

        self.assertEqual(data["id"], self.alias1.id)
        self.assertEqual(data["food_item"], self.food_item.id)
        self.assertEqual(data["language"], "ne")
        self.assertEqual(data["alias"], "गुन्द्रुक")
        self.assertTrue(data["is_active"])
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

        # Validate writing correct data
        payload = {
            "food_item": self.food_item.id,
            "language": "en",
            "alias": "Gundruk Pickle",
            "is_active": True,
        }
        write_serializer = FoodAliasSerializer(data=payload)
        self.assertTrue(write_serializer.is_valid())
        alias_instance = write_serializer.save()
        self.assertEqual(alias_instance.alias, "Gundruk Pickle")

    def test_food_alias_serializer_validation(self):
        """Test that FoodAliasSerializer rejects invalid alias data."""
        # Empty string
        payload = {
            "food_item": self.food_item.id,
            "language": "en",
            "alias": "",
        }
        serializer = FoodAliasSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("alias", serializer.errors)

        # Whitespace-only string
        payload = {
            "food_item": self.food_item.id,
            "language": "en",
            "alias": "    ",
        }
        serializer = FoodAliasSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("alias", serializer.errors)

    def test_food_alias_serializer_read_only_fields(self):
        """Test that database-managed fields are read-only in FoodAliasSerializer."""
        original_created_at = self.alias1.created_at
        payload = {
            "id": 9999,
            "food_item": self.food_item.id,
            "language": "en",
            "alias": "New Alias",
            "created_at": timezone.now(),
            "updated_at": timezone.now(),
        }
        serializer = FoodAliasSerializer(instance=self.alias1, data=payload)
        self.assertTrue(serializer.is_valid())
        saved_instance = serializer.save()

        # ID, created_at, updated_at should not be updated from the payload
        self.assertEqual(saved_instance.id, self.alias1.id)
        self.assertEqual(saved_instance.created_at, original_created_at)

    def test_food_item_serializer_serialization(self):
        """Test that FoodItemSerializer serializes a FoodItem along with its nested aliases."""
        serializer = FoodItemSerializer(instance=self.food_item)
        data = serializer.data

        self.assertEqual(data["id"], self.food_item.id)
        self.assertEqual(data["name"], "Gundruk")
        self.assertEqual(data["description"], "Fermented leafy green vegetable")
        self.assertEqual(Decimal(data["calories_per_100g"]), Decimal("48.50"))
        self.assertEqual(Decimal(data["protein_per_100g"]), Decimal("3.40"))
        self.assertEqual(Decimal(data["carbs_per_100g"]), Decimal("8.20"))
        self.assertEqual(Decimal(data["fat_per_100g"]), Decimal("0.50"))
        self.assertEqual(Decimal(data["fiber_per_100g"]), Decimal("1.80"))
        self.assertEqual(data["source"], "Nepal Food Composition Table")
        self.assertTrue(data["is_active"])

        # Check nested food aliases
        self.assertIn("food_aliases", data)
        self.assertEqual(len(data["food_aliases"]), 2)

        aliases_data = data["food_aliases"]
        # Match alias IDs and names
        alias_ids = [alias["id"] for alias in aliases_data]
        self.assertIn(self.alias1.id, alias_ids)
        self.assertIn(self.alias2.id, alias_ids)

        alias_texts = [alias["alias"] for alias in aliases_data]
        self.assertIn("गुन्द्रुक", alias_texts)
        self.assertIn("Fermented Greens", alias_texts)

    def test_food_item_serializer_read_only_fields(self):
        """Test that database-managed fields are read-only in FoodItemSerializer."""
        original_created_at = self.food_item.created_at
        payload = {
            "id": 9999,
            "name": "Updated Gundruk",
            "created_at": timezone.now(),
            "updated_at": timezone.now(),
        }
        serializer = FoodItemSerializer(
            instance=self.food_item, data=payload, partial=True
        )
        self.assertTrue(serializer.is_valid())
        saved_instance = serializer.save()

        # ID and created_at should not change
        self.assertEqual(saved_instance.id, self.food_item.id)
        self.assertEqual(saved_instance.created_at, original_created_at)

    def test_food_item_model_validation_in_serializer(self):
        """Test that model-level validators (like MinValueValidator and MaxValueValidator) are enforced."""
        # Calories too high (Max value is 1000)
        payload = {
            "name": "Super Dense Food",
            "calories_per_100g": Decimal("1001.00"),
        }
        serializer = FoodItemSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("calories_per_100g", serializer.errors)

        # Calories negative (Min value is 0)
        payload = {
            "name": "Negative Food",
            "calories_per_100g": Decimal("-1.00"),
        }
        serializer = FoodItemSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("calories_per_100g", serializer.errors)


class FoodAPITests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="himal@gmail.com", password="himal123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create active food items
        self.active_food = FoodItem.objects.create(
            name="Momo",
            description="Steamed dumplings",
            serving_unit="piece",
            calories_per_100g=Decimal("150.00"),
            is_active=True,
        )
        self.active_alias = FoodAlias.objects.create(
            food_item=self.active_food, language="ne", alias="मम", is_active=True
        )
        self.inactive_alias = FoodAlias.objects.create(
            food_item=self.active_food,
            language="en",
            alias="Inactive Dumpling Alias",
            is_active=False,
        )

        # Create inactive food items
        self.inactive_food = FoodItem.objects.create(
            name="Old Dhido",
            description="Inactive millet pudding",
            serving_unit="g",
            calories_per_100g=Decimal("120.00"),
            is_active=False,
        )
        self.inactive_food_alias = FoodAlias.objects.create(
            food_item=self.inactive_food, language="ne", alias="ढिंडो", is_active=True
        )

    def test_list_endpoint_active_only(self):
        """Verify that GET /api/nutrition/foods/ returns only active food items with their active aliases."""
        url = reverse("nutrition:food-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["status"])
        self.assertEqual(response.data["message"], "Food items fetched successfully")

        data = response.data["data"]
        # Only active food should be in the list
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.active_food.id)
        self.assertEqual(data[0]["name"], "Momo")

        # Nested aliases should only contain active ones
        aliases = data[0]["food_aliases"]
        self.assertEqual(len(aliases), 1)
        self.assertEqual(aliases[0]["id"], self.active_alias.id)
        self.assertEqual(aliases[0]["alias"], "मम")

    def test_list_endpoint_anonymous(self):
        """Verify that list endpoint requires authentication."""
        self.client.force_authenticate(user=None)
        url = reverse("nutrition:food-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_detail_endpoint_active(self):
        """Verify that detail endpoint returns active food item and its active aliases."""
        url = reverse("nutrition:food-detail", kwargs={"pk": self.active_food.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["status"])
        self.assertEqual(response.data["message"], "Food item fetched successfully")

        data = response.data["data"]
        self.assertEqual(data["id"], self.active_food.id)
        self.assertEqual(data["name"], "Momo")

        aliases = data["food_aliases"]
        self.assertEqual(len(aliases), 1)
        self.assertEqual(aliases[0]["id"], self.active_alias.id)

    def test_detail_endpoint_inactive_returns_404(self):
        """Verify that detail endpoint returns 404 for inactive food items."""
        url = reverse("nutrition:food-detail", kwargs={"pk": self.inactive_food.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["status"])
        self.assertEqual(response.data["message"], "Food item not found")

    def test_detail_endpoint_nonexistent_returns_404(self):
        """Verify that detail endpoint returns 404 for nonexistent food items."""
        url = reverse("nutrition:food-detail", kwargs={"pk": 99999})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["status"])
        self.assertEqual(response.data["message"], "Food item not found")

    def test_search_by_food_name(self):
        """Verify search matches by food item name case-insensitively."""
        url = reverse("nutrition:food-list")
        response = self.client.get(url, {"search": "mOm"})

        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.active_food.id)

    def test_search_by_active_alias(self):
        """Verify search matches by active alias name."""
        url = reverse("nutrition:food-list")
        response = self.client.get(url, {"search": "मम"})

        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.active_food.id)

    def test_search_by_inactive_alias_returns_nothing(self):
        """Verify search does not match by inactive alias."""
        url = reverse("nutrition:food-list")
        response = self.client.get(url, {"search": "Inactive Dumpling Alias"})

        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(len(data), 0)

    def test_search_no_duplicates(self):
        """Verify that search returns unique records even if both name and alias match."""
        # Create another alias containing 'momo' to trigger multiple potential matches
        FoodAlias.objects.create(
            food_item=self.active_food,
            language="en",
            alias="Momo Steamed",
            is_active=True,
        )
        url = reverse("nutrition:food-list")
        response = self.client.get(url, {"search": "Momo"})

        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        # Should be distinct, returning only 1 record
        self.assertEqual(len(data), 1)

    def test_query_optimization_n_plus_one(self):
        """Verify prefetching works and avoids the N+1 query problem."""
        url = reverse("nutrition:food-list")

        # Measure query count for 1 active food item
        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(len(response.data["data"]), 1)

        # Create 5 more active foods with active aliases
        for i in range(5):
            food = FoodItem.objects.create(name=f"FoodItem {i}", is_active=True)
            FoodAlias.objects.create(
                food_item=food, alias=f"Alias {i} A", is_active=True
            )
            FoodAlias.objects.create(
                food_item=food, alias=f"Alias {i} B", is_active=True
            )

        # Verify that querying 6 food items still takes exactly 2 database queries
        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(len(response.data["data"]), 6)
