from django.urls import path
from .views import (
    DietaryRestrictionListView,
    MedicalConditionListView,
    UserProfileAPIView,
)

urlpatterns = [
    path("user-profile/", UserProfileAPIView.as_view(), name="user-profile"),
    path(
        "medical-conditions/",
        MedicalConditionListView.as_view(),
        name="medical-conditions",
    ),
    path(
        "dietary-restrictions/",
        DietaryRestrictionListView.as_view(),
        name="dietary-restrictions",
    ),
]