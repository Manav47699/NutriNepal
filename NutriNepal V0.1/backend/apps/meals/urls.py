from django.urls import path
from .views import (
    MealLogListCreateView,
    MealLogDetailView,
    MealAnalyzeView,
    MealRecommendationView,
    DailyRecommendationView,
)

urlpatterns = [
    path("", MealLogListCreateView.as_view(), name="meal-list-create"),
    path(
        "daily-recommendation/",
        DailyRecommendationView.as_view(),
        name="daily-recommendation",
    ),
    path("<int:meal_id>/", MealLogDetailView.as_view(), name="meal-detail"),
    path("<int:meal_id>/analyze/", MealAnalyzeView.as_view(), name="meal-analyze"),
    path(
        "<int:meal_id>/recommendation/",
        MealRecommendationView.as_view(),
        name="meal-recommendation",
    ),
]

