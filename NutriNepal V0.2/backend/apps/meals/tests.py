from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import (
    UserProfile,
    MedicalCondition,
    DietaryRestriction,
)
from .models import (
    MealLog,
    TotalFoodAnalysis,
    MealFoodItems,
    MealRecommendation,
)

User = get_user_model()


class MealLogAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="mealuser@example.com",
            username="mealuser",
            password="testpassword123",
        )
        self.other_user = User.objects.create_user(
            email="otheruser@example.com",
            username="otheruser",
            password="testpassword123",
        )
        self.client.force_authenticate(user=self.user)

    @patch("apps.meals.meal_analysis_service.analyze_food")
    def test_create_meal_log_with_image_and_analysis(self, mock_analyze_food):
        mock_analyze_food.return_value = {
            "success": True,
            "foods": [
                {
                    "food_id": "bhat",
                    "name": "Cooked Rice",
                    "detected_label": "bhat",
                    "confidence": 0.92,
                    "quantity": 150.0,
                    "unit": "g",
                    "calories": 195.0,
                    "protein": 4.05,
                    "carbs": 42.3,
                    "fat": 0.45,
                },
                {
                    "food_id": "dal",
                    "name": "Cooked Lentils",
                    "detected_label": "dal",
                    "confidence": 0.88,
                    "quantity": 150.0,
                    "unit": "g",
                    "calories": 174.0,
                    "protein": 13.5,
                    "carbs": 30.15,
                    "fat": 0.6,
                },
            ],
            "total": {
                "calories": 369.0,
                "protein": 17.55,
                "carbs": 72.45,
                "fat": 1.05,
            },
        }

        image_content = b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x05\x04\x04\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
        image_file = SimpleUploadedFile(
            "test_meal.gif", image_content, content_type="image/gif"
        )

        response = self.client.post(
            "/api/meals/",
            {
                "meal_type": "LUNCH",
                "description": "Dal bhat meal",
                "image": image_file,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["status"])
        data = response.data["data"]
        meal_id = data["id"]

        # Verify MealLog
        meal = MealLog.objects.get(id=meal_id, user=self.user)
        self.assertEqual(meal.meal_type, "LUNCH")

        # Verify TotalFoodAnalysis in DB and response
        analysis = TotalFoodAnalysis.objects.get(meal=meal)
        self.assertEqual(analysis.total_calories, 369.0)
        self.assertEqual(analysis.total_protein, 17.55)
        self.assertEqual(analysis.total_carbs, 72.45)
        self.assertEqual(analysis.total_fats, 1.05)

        # Verify MealFoodItems
        food_items = MealFoodItems.objects.filter(food_analysis=analysis)
        self.assertEqual(food_items.count(), 2)

        # Verify response structure
        self.assertIn("analysis", data)
        self.assertEqual(data["analysis"]["total_calories"], 369.0)
        self.assertEqual(len(data["analysis"]["food_items"]), 2)

    @patch("apps.meals.meal_analysis_service.analyze_food_text")
    def test_create_meal_log_with_text_description_analysis(self, mock_analyze_food_text):
        mock_analyze_food_text.return_value = {
            "foods": [
                {
                    "food_id": "bhat",
                    "name": "Cooked Rice",
                    "matched_alias": "bhat",
                    "quantity": 150.0,
                    "unit": "g",
                    "calories": 195.0,
                    "protein": 4.05,
                    "carbs": 42.3,
                    "fat": 0.45,
                }
            ],
            "total": {
                "calories": 195.0,
                "protein": 4.05,
                "carbs": 42.3,
                "fat": 0.45,
            },
        }

        response = self.client.post(
            "/api/meals/",
            {
                "meal_type": "BREAKFAST",
                "description": "2 egg, 1 cup milk",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data["data"]
        self.assertIsNotNone(data["analysis"])
        self.assertEqual(data["analysis"]["total_calories"], 195.0)

    @patch("apps.meals.views.analyze_meal_text")
    def test_post_analyze_endpoint_triggers_analysis(self, mock_analyze_text):
        meal = MealLog.objects.create(
            user=self.user,
            meal_type="BREAKFAST",
            description="2 egg, 1 cup milk",
        )

        def mock_side_effect(m):
            analysis = TotalFoodAnalysis.objects.create(
                meal=m,
                total_calories=551.0,
                total_protein=44.2,
                total_carbs=11.7,
                total_fats=35.1,
            )
            MealFoodItems.objects.create(
                food_analysis=analysis,
                food_name="Whole Egg",
                food_quantity=300.0,
                food_quantity_unit="g",
                food_calories=429.0,
                food_protein=37.8,
                food_carbs=2.1,
                food_fats=28.5,
            )
            return analysis

        mock_analyze_text.side_effect = mock_side_effect

        response = self.client.post(f"/api/meals/{meal.id}/analyze/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["status"])
        data = response.data["data"]
        self.assertIsNotNone(data["analysis"])
        self.assertEqual(data["analysis"]["total_calories"], 551.0)
        self.assertEqual(len(data["analysis"]["food_items"]), 1)

    def test_post_analyze_without_content_returns_400(self):
        meal = MealLog.objects.create(
            user=self.user,
            meal_type="BREAKFAST",
            description="",
        )
        response = self.client.post(f"/api/meals/{meal.id}/analyze/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["status"])

    def test_get_meals_list_and_detail(self):
        meal = MealLog.objects.create(
            user=self.user,
            meal_type="DINNER",
            description="Dinner meal",
        )
        analysis = TotalFoodAnalysis.objects.create(
            meal=meal,
            total_calories=500.0,
            total_protein=30.0,
            total_carbs=60.0,
            total_fats=15.0,
        )
        MealFoodItems.objects.create(
            food_analysis=analysis,
            food_name="Chicken",
            food_quantity=200.0,
            food_quantity_unit="g",
            food_calories=500.0,
            food_protein=30.0,
            food_carbs=60.0,
            food_fats=15.0,
        )

        # List
        list_resp = self.client.get("/api/meals/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data["data"]), 1)
        self.assertEqual(
            list_resp.data["data"][0]["analysis"]["total_calories"], 500.0
        )

        # Detail
        detail_resp = self.client.get(f"/api/meals/{meal.id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            detail_resp.data["data"]["analysis"]["total_calories"], 500.0
        )
        self.assertEqual(
            len(detail_resp.data["data"]["analysis"]["food_items"]), 1
        )

    @patch("apps.meals.meal_analysis_service.analyze_food_text")
    def test_patch_and_delete_meal(self, mock_analyze_food_text):
        mock_analyze_food_text.return_value = {
            "foods": [],
            "total": {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0},
        }

        meal = MealLog.objects.create(
            user=self.user,
            meal_type="SNACK",
            description="Evening snack",
        )
        # Patch
        patch_resp = self.client.patch(
            f"/api/meals/{meal.id}/",
            {"description": "Updated snack description"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        meal.refresh_from_db()
        self.assertEqual(meal.description, "Updated snack description")

        # Delete
        delete_resp = self.client.delete(f"/api/meals/{meal.id}/")
        self.assertEqual(delete_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(MealLog.objects.filter(id=meal.id).exists())


class MealRecommendationAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="recuser@example.com",
            username="recuser",
            password="testpassword123",
        )
        self.other_user = User.objects.create_user(
            email="otherrecuser@example.com",
            username="otherrecuser",
            password="testpassword123",
        )

        # Create profile with conditions
        self.profile = UserProfile.objects.create(
            user=self.user,
            age=30,
            gender="MALE",
            height_cm=175.0,
            weight_kg=78.0,
            activity_level="MODERATE",
            fitness_goal="LOSE_WEIGHT",
            dietary_preference="NON_VEGETARIAN",
            health_restrictions={
                "diabetes": "restricted",
                "uric_acid": "allowed",
                "hypertension": "allowed",
                "kidney_disease": "allowed",
            },
            social_restrictions={
                "shrawan": "allowed",
                "chaturmas": "allowed",
                "mourning": "allowed",
                "no_onion_garlic": "allowed",
            },
        )

        # Create MealLog with analysis
        self.meal = MealLog.objects.create(
            user=self.user,
            meal_type="LUNCH",
            description="Dal bhat tarkari meal",
        )
        self.analysis = TotalFoodAnalysis.objects.create(
            meal=self.meal,
            total_calories=800.0,
            total_protein=35.0,
            total_carbs=120.0,
            total_fats=10.0,
        )
        MealFoodItems.objects.create(
            food_analysis=self.analysis,
            food_name="Cooked Rice",
            food_quantity=300.0,
            food_quantity_unit="g",
            food_calories=390.0,
            food_protein=8.0,
            food_carbs=85.0,
            food_fats=1.0,
        )
        MealFoodItems.objects.create(
            food_analysis=self.analysis,
            food_name="Cooked Lentils",
            food_quantity=200.0,
            food_quantity_unit="g",
            food_calories=232.0,
            food_protein=18.0,
            food_carbs=40.0,
            food_fats=1.0,
        )

        self.client.force_authenticate(user=self.user)

    @patch("apps.meals.meal_recommendation_service.generate_recommendation")
    def test_generate_recommendation_success(self, mock_generate_recommendation):
        mock_generate_recommendation.return_value = {
            "success": True,
            "recommendation": {
                "meal_id": self.meal.id,
                "overall_verdict": "NEEDS_IMPROVEMENT",
                "summary": "High carbohydrate portion for weight loss and Type 2 Diabetes.",
                "macro_assessment": {
                    "calories_evaluation": "800 kcal is slightly high for lunch.",
                    "protein_evaluation": "Good protein intake (35g).",
                    "carbs_evaluation": "120g carbs is high for glycemic control.",
                    "fats_evaluation": "Fats are low (10g).",
                },
                "health_and_dietary_alerts": [
                    {
                        "type": "MEDICAL_RESTRICTION",
                        "severity": "WARNING",
                        "message": "High rice portion may cause rapid glucose elevation.",
                    }
                ],
                "actionable_suggestions": [
                    "Reduce cooked rice to 150g.",
                    "Add green leafy saag for fiber.",
                ],
                "alternative_foods": [
                    {
                        "recommended_food": "Brown Rice or Chiura",
                        "replaces": "Cooked White Rice",
                        "reason": "Lower glycemic index.",
                    }
                ],
                "model_name": "qwen2.5:3b",
                "generated_at": "2026-08-21T08:47:12.459762Z",
            },
        }

        response = self.client.post(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["status"])
        data = response.data["data"]

        # Verify payload passed to AI service
        mock_generate_recommendation.assert_called_once()
        sent_payload = mock_generate_recommendation.call_args[0][0]
        self.assertEqual(sent_payload["meal_id"], self.meal.id)
        self.assertEqual(sent_payload["nutrition_summary"]["total_calories"], 800.0)
        self.assertEqual(len(sent_payload["food_items"]), 2)
        self.assertEqual(sent_payload["user_profile"]["fitness_goal"], "LOSE_WEIGHT")
        self.assertEqual(
            sent_payload["user_profile"]["health_restrictions"]["diabetes"],
            "restricted",
        )

        # Verify DB persistence
        rec = MealRecommendation.objects.get(meal=self.meal)
        self.assertEqual(rec.overall_verdict, "NEEDS_IMPROVEMENT")
        self.assertEqual(rec.model_name, "qwen2.5:3b")
        self.assertEqual(len(rec.actionable_suggestions), 2)

        # Verify response structure
        self.assertEqual(data["overall_verdict"], "NEEDS_IMPROVEMENT")
        self.assertEqual(data["summary"], "High carbohydrate portion for weight loss and Type 2 Diabetes.")
        self.assertEqual(len(data["actionable_suggestions"]), 2)

    @patch("apps.meals.meal_recommendation_service.generate_recommendation")
    def test_regenerate_updates_existing_recommendation(self, mock_generate_recommendation):
        # First creation
        mock_generate_recommendation.return_value = {
            "success": True,
            "recommendation": {
                "meal_id": self.meal.id,
                "overall_verdict": "MODERATELY_ALIGNED",
                "summary": "First summary",
                "macro_assessment": {"calories_evaluation": "ok"},
                "health_and_dietary_alerts": [],
                "actionable_suggestions": ["Suggestion 1"],
                "alternative_foods": [],
                "model_name": "qwen2.5:3b",
                "generated_at": "2026-08-21T08:47:12.459762Z",
            },
        }
        self.client.post(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(MealRecommendation.objects.filter(meal=self.meal).count(), 1)

        # Second creation with updated verdict
        mock_generate_recommendation.return_value["recommendation"]["overall_verdict"] = "ALIGNED"
        mock_generate_recommendation.return_value["recommendation"]["summary"] = "Updated summary"

        response = self.client.post(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Still only 1 record in database (OneToOne updated)
        self.assertEqual(MealRecommendation.objects.filter(meal=self.meal).count(), 1)
        rec = MealRecommendation.objects.get(meal=self.meal)
        self.assertEqual(rec.overall_verdict, "ALIGNED")
        self.assertEqual(rec.summary, "Updated summary")

    def test_get_recommendation_success(self):
        MealRecommendation.objects.create(
            meal=self.meal,
            overall_verdict="ALIGNED",
            summary="Well balanced meal.",
            macro_assessment={"calories_evaluation": "Good"},
            health_and_dietary_alerts=[],
            actionable_suggestions=["Keep it up"],
            alternative_foods=[],
            model_name="qwen2.5:3b",
        )

        response = self.client.get(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["status"])
        self.assertEqual(response.data["data"]["overall_verdict"], "ALIGNED")

    def test_get_recommendation_not_found(self):
        response = self.client.get(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["status"])

    def test_recommendation_nested_in_meal_detail(self):
        MealRecommendation.objects.create(
            meal=self.meal,
            overall_verdict="ALIGNED",
            summary="Well balanced meal.",
            macro_assessment={},
            health_and_dietary_alerts=[],
            actionable_suggestions=[],
            alternative_foods=[],
            model_name="qwen2.5:3b",
        )

        detail_resp = self.client.get(f"/api/meals/{self.meal.id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        data = detail_resp.data["data"]
        self.assertIn("recommendation", data)
        self.assertIsNotNone(data["recommendation"])
        self.assertEqual(data["recommendation"]["overall_verdict"], "ALIGNED")

    def test_unauthorized_user_cannot_access_other_user_meal_recommendation(self):
        self.client.force_authenticate(user=self.other_user)

        # POST
        post_resp = self.client.post(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(post_resp.status_code, status.HTTP_404_NOT_FOUND)

        # GET
        get_resp = self.client.get(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(get_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_generate_recommendation_without_analysis(self):
        meal_without_analysis = MealLog.objects.create(
            user=self.user,
            meal_type="SNACK",
            description="",
        )
        response = self.client.post(f"/api/meals/{meal_without_analysis.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["status"])

    @patch("apps.meals.meal_recommendation_service.generate_recommendation")
    def test_ai_service_failure_returns_502(self, mock_generate_recommendation):
        mock_generate_recommendation.side_effect = Exception("FastAPI AI service connection timeout")

        response = self.client.post(f"/api/meals/{self.meal.id}/recommendation/")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(response.data["status"])
        self.assertIn("FastAPI AI service connection timeout", response.data["message"])
