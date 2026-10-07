from rest_framework import serializers

from .models import (
    MealLog,
    TotalFoodAnalysis,
    MealFoodItems,
    MealRecommendation,
    DailyRecommendation,
)


class MealFoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealFoodItems
        fields = [
            "id",
            "food_name",
            "food_quantity",
            "food_quantity_unit",
            "food_calories",
            "food_protein",
            "food_carbs",
            "food_fats",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TotalFoodAnalysisSerializer(serializers.ModelSerializer):
    food_items = MealFoodItemSerializer(many=True, read_only=True)

    class Meta:
        model = TotalFoodAnalysis
        fields = [
            "id",
            "total_calories",
            "total_protein",
            "total_carbs",
            "total_fats",
            "food_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MealRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealRecommendation
        fields = [
            "id",
            "overall_verdict",
            "summary",
            "macro_assessment",
            "health_and_dietary_alerts",
            "actionable_suggestions",
            "alternative_foods",
            "model_name",
            "generated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DailyRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyRecommendation
        fields = [
            "id",
            "user",
            "date",
            "overall_verdict",
            "summary",
            "macro_assessment",
            "health_and_dietary_alerts",
            "actionable_suggestions",
            "alternative_foods",
            "daily_totals",
            "model_name",
            "generated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class MealLogSerializer(serializers.ModelSerializer):
    analysis = TotalFoodAnalysisSerializer(read_only=True)
    recommendation = MealRecommendationSerializer(read_only=True)

    class Meta:
        model = MealLog
        fields = [
            "id",
            "user",
            "meal_type",
            "description",
            "image",
            "analysis",
            "recommendation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "id", "created_at", "updated_at"]

