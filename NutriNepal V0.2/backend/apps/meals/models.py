from django.conf import settings
from django.db import models


class MealTypeChoices(models.TextChoices):
    """
    Choices of meal type what user have recently had.
    """

    BREAKFAST = "BREAKFAST", "Breakfast"
    LUNCH = "LUNCH", "Lunch"
    DINNER = "DINNER", "Dinner"
    SNACK = "SNACK", "Snack"


class MealLog(models.Model):
    """
    User le haalne input i.e image or description of what he/she have eaten recently.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meals"
    )
    meal_type = models.CharField(
        max_length=25,
        choices=MealTypeChoices.choices,
        default=MealTypeChoices.LUNCH,
        blank=True,
    )
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to="meal_photos/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Meal Log"
        verbose_name_plural = "Meal Logs"

    def __str__(self):
        return f"{self.user.email}'s {self.meal_type} at {self.created_at}"


class TotalFoodAnalysis(models.Model):
    """
    one to one relationship with meal log. Total food nutritional values
    gets aggregated from MealFoodItems model and stored here.
    """

    meal = models.OneToOneField(
        MealLog,
        on_delete=models.CASCADE,
        related_name="analysis",
    )

    total_calories = models.FloatField(default=0)
    total_protein = models.FloatField(default=0)
    total_carbs = models.FloatField(default=0)
    total_fats = models.FloatField(default=0)
    micronutrients = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Total Food Analysis"
        verbose_name_plural = "Total Food Analyses"

    def __str__(self):
        return f"{self.meal.user.email}'s Total Food Analysis at {self.created_at}"


class MealFoodItems(models.Model):
    """
    Individual food items inside a meal uploaded by user. These data
    gets generated from FastApi backend service.
    """

    food_analysis = models.ForeignKey(
        TotalFoodAnalysis,
        on_delete=models.CASCADE,
        related_name="food_items",
    )
    food_name = models.CharField(max_length=255)
    food_quantity = models.FloatField(default=0)
    food_quantity_unit = models.CharField(max_length=255, default="g")

    food_calories = models.FloatField(default=0)
    food_protein = models.FloatField(default=0)
    food_carbs = models.FloatField(default=0)
    food_fats = models.FloatField(default=0)
    micronutrients = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Meal Food Item"
        verbose_name_plural = "Meal Food Items"

    def __str__(self):
        return f"{self.food_analysis.meal.user.email}'s {self.food_name} at {self.created_at}"


class MealRecommendation(models.Model):
    """
    Personalized AI advisory and dietary recommendations for a MealLog
    generated via FastAPI and local LLM. OneToOne with MealLog.
    """

    meal = models.OneToOneField(
        MealLog,
        on_delete=models.CASCADE,
        related_name="recommendation",
    )

    overall_verdict = models.CharField(max_length=50)
    summary = models.TextField()
    macro_assessment = models.JSONField(default=dict)
    health_and_dietary_alerts = models.JSONField(default=list)
    actionable_suggestions = models.JSONField(default=list)
    alternative_foods = models.JSONField(default=list)

    model_name = models.CharField(max_length=100, blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Meal Recommendation"
        verbose_name_plural = "Meal Recommendations"

    def __str__(self):
        return f"Recommendation for {self.meal.user.email}'s meal ({self.meal.id})"
