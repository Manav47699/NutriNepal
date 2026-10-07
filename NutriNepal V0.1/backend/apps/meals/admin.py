from django.contrib import admin
from .models import (
    MealLog,
    TotalFoodAnalysis,
    MealFoodItems,
    MealRecommendation,
    DailyRecommendation,
)


class MealLogAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "meal_type", "created_at"]
    list_filter = ["meal_type", "created_at", "updated_at"]
    search_fields = ["id", "user__email", "meal_type", "description"]
    ordering = ["-created_at"]


class MealRecommendationAdmin(admin.ModelAdmin):
    list_display = ["id", "meal", "overall_verdict", "model_name", "created_at"]
    list_filter = ["overall_verdict", "model_name", "created_at"]
    search_fields = ["meal__user__email", "summary"]


class DailyRecommendationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "date", "overall_verdict", "model_name", "created_at"]
    list_filter = ["overall_verdict", "date", "model_name", "created_at"]
    search_fields = ["user__email", "summary"]
    ordering = ["-date", "-created_at"]


admin.site.register(MealLog, MealLogAdmin)
admin.site.register(TotalFoodAnalysis)
admin.site.register(MealFoodItems)
admin.site.register(MealRecommendation, MealRecommendationAdmin)
admin.site.register(DailyRecommendation, DailyRecommendationAdmin)

