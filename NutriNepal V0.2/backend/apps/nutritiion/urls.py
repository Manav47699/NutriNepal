from django.urls import path
from .views import FoodItemDetailView, FoodItemListView

app_name = "nutrition"

urlpatterns = [
    path("foods/", FoodItemListView.as_view(), name="food-list"),
    path("foods/<int:pk>/", FoodItemDetailView.as_view(), name="food-detail"),
]
