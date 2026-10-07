from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import (
    UserProfile,
    MedicalCondition,
    Allergy,
    DietaryRestriction,
)
from .models import (
    MealLog,
    TotalFoodAnalysis,
    MealFoodItems,
    MealRecommendation,
    DailyRecommendation,
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
            target_weight_kg=72.0,
            activity_level="MODERATE",
            fitness_goal="LOSE_WEIGHT",
            dietary_preference="NON_VEGETARIAN",
        )
        med_cond, _ = MedicalCondition.objects.get_or_create(name="Type 2 Diabetes")
        allergy, _ = Allergy.objects.get_or_create(name="Peanuts")
        restriction, _ = DietaryRestriction.objects.get_or_create(name="Low Sugar / Diabetic Diet")
        self.profile.medical_conditions.add(med_cond)
        self.profile.allergies.add(allergy)
        self.profile.dietary_restrictions.add(restriction)

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
        self.assertIn("Type 2 Diabetes", sent_payload["user_profile"]["medical_conditions"])

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


class DailyRecommendationAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="dailyrecuser@example.com",
            username="dailyrecuser",
            password="testpassword123",
        )
        self.other_user = User.objects.create_user(
            email="otherdailyuser@example.com",
            username="otherdailyuser",
            password="testpassword123",
        )

        # Profile with health constraints
        self.profile = UserProfile.objects.create(
            user=self.user,
            age=28,
            gender="MALE",
            height_cm=175.0,
            weight_kg=75.0,
            target_weight_kg=70.0,
            activity_level="MODERATE",
            fitness_goal="LOSE_WEIGHT",
            dietary_preference="NON_VEGETARIAN",
        )
        med_cond, _ = MedicalCondition.objects.get_or_create(name="Hypertension")
        allergy, _ = Allergy.objects.get_or_create(name="Peanuts")
        restriction, _ = DietaryRestriction.objects.get_or_create(name="Low Sodium")
        self.profile.medical_conditions.add(med_cond)
        self.profile.allergies.add(allergy)
        self.profile.dietary_restrictions.add(restriction)

        self.client.force_authenticate(user=self.user)


    def _create_sample_meal(self, user, meal_type, description, cal, pro, carb, fat, food_name="Rice"):
        meal = MealLog.objects.create(
            user=user,
            meal_type=meal_type,
            description=description,
        )
        analysis = TotalFoodAnalysis.objects.create(
            meal=meal,
            total_calories=cal,
            total_protein=pro,
            total_carbs=carb,
            total_fats=fat,
        )
        MealFoodItems.objects.create(
            food_analysis=analysis,
            food_name=food_name,
            food_quantity=150.0,
            food_quantity_unit="g",
            food_calories=cal,
            food_protein=pro,
            food_carbs=carb,
            food_fats=fat,
        )
        return meal

    def test_get_daily_recommendation_not_found(self):
        response = self.client.get("/api/meals/daily-recommendation/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["status"])

    def test_get_daily_recommendation_success(self):
        from django.utils import timezone
        today = timezone.localdate()
        DailyRecommendation.objects.create(
            user=self.user,
            date=today,
            overall_verdict="ALIGNED",
            summary="Well balanced day.",
            macro_assessment={"calories_evaluation": "Good", "protein_evaluation": "Optimal"},
            health_and_dietary_alerts=[],
            actionable_suggestions=["Drink water"],
            alternative_foods=[],
            daily_totals={"total_calories": 1800, "total_protein": 70, "total_carbs": 220, "total_fats": 40, "meals_count": 2},
            model_name="qwen2.5:3b",
        )

        response = self.client.get(f"/api/meals/daily-recommendation/?date={today.isoformat()}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["status"])
        data = response.data["data"]
        self.assertEqual(data["overall_verdict"], "ALIGNED")
        self.assertEqual(data["summary"], "Well balanced day.")
        self.assertEqual(data["daily_totals"]["total_calories"], 1800)

    def test_post_daily_recommendation_zero_meals_returns_400(self):
        response = self.client.post("/api/meals/daily-recommendation/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["status"])
        self.assertIn("No analyzed meals found", response.data["message"])

    @patch("apps.meals.daily_recommendation_service.generate_daily_recommendation")
    def test_post_daily_recommendation_multiple_meals_success(self, mock_generate_daily):
        from django.utils import timezone
        today = timezone.localdate()

        # Create breakfast and lunch
        self._create_sample_meal(self.user, "BREAKFAST", "Eggs and toast", 350.0, 20.0, 30.0, 12.0, "Boiled Egg")
        self._create_sample_meal(self.user, "LUNCH", "Dal bhat", 750.0, 30.0, 110.0, 15.0, "Cooked Rice")

        mock_generate_daily.return_value = {
            "success": True,
            "recommendation": {
                "date": today.isoformat(),
                "overall_verdict": "OPTIMAL",
                "summary": "Excellent macro balance across both breakfast and lunch.",
                "macro_assessment": {
                    "calories_evaluation": "1100 kcal consumed. On track for deficit target.",
                    "protein_evaluation": "50g protein so far. Very solid distribution.",
                    "carbs_evaluation": "140g carbs from complex sources.",
                    "fats_evaluation": "27g healthy fats.",
                },
                "health_and_dietary_alerts": [
                    {
                        "type": "GOAL_ALIGNMENT",
                        "severity": "INFO",
                        "message": "Hypertension parameters respected; low sodium intake maintained.",
                    }
                ],
                "actionable_suggestions": [
                    "Plan a lighter dinner with green saag and grilled chicken or paneer.",
                    "Keep hydration steady in the afternoon.",
                ],
                "alternative_foods": [
                    {
                        "recommended_food": "Brown Chamal",
                        "replaces": "Polished Rice",
                        "reason": "Lower glycemic index for weight loss.",
                    }
                ],
                "daily_totals": {
                    "total_calories": 1100.0,
                    "total_protein": 50.0,
                    "total_carbs": 140.0,
                    "total_fats": 27.0,
                    "meals_count": 2,
                },
                "model_name": "qwen2.5:3b",
                "generated_at": "2026-08-24T12:00:00Z",
            },
        }

        response = self.client.post("/api/meals/daily-recommendation/", {"date": today.isoformat()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["status"])
        data = response.data["data"]

        # Verify payload sent to AI service
        mock_generate_daily.assert_called_once()
        sent_payload = mock_generate_daily.call_args[0][0]
        self.assertEqual(sent_payload["date"], today.isoformat())
        self.assertEqual(sent_payload["daily_nutrition_summary"]["total_calories"], 1100.0)
        self.assertEqual(sent_payload["daily_nutrition_summary"]["total_protein"], 50.0)
        self.assertEqual(len(sent_payload["meals"]), 2)
        self.assertEqual(sent_payload["user_profile"]["fitness_goal"], "LOSE_WEIGHT")
        self.assertIn("Hypertension", sent_payload["user_profile"]["medical_conditions"])
        self.assertIn("Low Sodium", sent_payload["user_profile"]["dietary_restrictions"])

        # Verify DB persistence
        daily_rec = DailyRecommendation.objects.get(user=self.user, date=today)
        self.assertEqual(daily_rec.overall_verdict, "OPTIMAL")
        self.assertEqual(daily_rec.daily_totals["total_calories"], 1100.0)
        self.assertEqual(daily_rec.daily_totals["meals_count"], 2)

        # Verify response
        self.assertEqual(data["overall_verdict"], "OPTIMAL")
        self.assertEqual(data["summary"], "Excellent macro balance across both breakfast and lunch.")
        self.assertEqual(len(data["actionable_suggestions"]), 2)

    @patch("apps.meals.daily_recommendation_service.generate_daily_recommendation")
    def test_post_daily_recommendation_regeneration_updates_existing(self, mock_generate_daily):
        from django.utils import timezone
        today = timezone.localdate()

        self._create_sample_meal(self.user, "BREAKFAST", "Toast", 200.0, 8.0, 30.0, 4.0)

        mock_generate_daily.return_value = {
            "success": True,
            "recommendation": {
                "date": today.isoformat(),
                "overall_verdict": "MODERATELY_ALIGNED",
                "summary": "Initial morning assessment.",
                "macro_assessment": {},
                "health_and_dietary_alerts": [],
                "actionable_suggestions": ["Eat more protein"],
                "alternative_foods": [],
                "model_name": "qwen2.5:3b",
                "generated_at": "2026-08-24T08:00:00Z",
            },
        }

        # First generation
        self.client.post("/api/meals/daily-recommendation/", {"date": today.isoformat()}, format="json")
        self.assertEqual(DailyRecommendation.objects.filter(user=self.user, date=today).count(), 1)

        # Second generation with updated assessment
        mock_generate_daily.return_value["recommendation"]["overall_verdict"] = "ALIGNED"
        mock_generate_daily.return_value["recommendation"]["summary"] = "Regenerated assessment."

        resp = self.client.post("/api/meals/daily-recommendation/", {"date": today.isoformat()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Still only 1 record (updated in place)
        self.assertEqual(DailyRecommendation.objects.filter(user=self.user, date=today).count(), 1)
        rec = DailyRecommendation.objects.get(user=self.user, date=today)
        self.assertEqual(rec.overall_verdict, "ALIGNED")
        self.assertEqual(rec.summary, "Regenerated assessment.")

    def test_unauthorized_user_cannot_access_other_user_daily_recommendation(self):
        from django.utils import timezone
        today = timezone.localdate()

        DailyRecommendation.objects.create(
            user=self.user,
            date=today,
            overall_verdict="ALIGNED",
            summary="Private user recommendation",
            macro_assessment={},
            health_and_dietary_alerts=[],
            actionable_suggestions=[],
            alternative_foods=[],
            model_name="qwen2.5:3b",
        )

        self.client.force_authenticate(user=self.other_user)
        resp = self.client.get(f"/api/meals/daily-recommendation/?date={today.isoformat()}")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(resp.data["status"])

    @patch("apps.meals.daily_recommendation_service.generate_daily_recommendation")
    def test_daily_recommendation_ai_service_failure_returns_502(self, mock_generate_daily):
        from django.utils import timezone
        today = timezone.localdate()

        self._create_sample_meal(self.user, "LUNCH", "Dal bhat", 600.0, 20.0, 90.0, 10.0)
        mock_generate_daily.side_effect = Exception("FastAPI AI service connection timeout")

        resp = self.client.post("/api/meals/daily-recommendation/", {"date": today.isoformat()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(resp.data["status"])
        self.assertIn("FastAPI AI service connection timeout", resp.data["message"])

