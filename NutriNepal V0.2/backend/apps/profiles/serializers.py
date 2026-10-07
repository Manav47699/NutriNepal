from rest_framework.serializers import ModelSerializer
from .models import UserProfile, MedicalCondition, DietaryRestriction


class MedicalConditionSerializer(ModelSerializer):
    class Meta:
        model = MedicalCondition
        fields = "__all__"


class DietaryRestrictionSerializer(ModelSerializer):
    class Meta:
        model = DietaryRestriction
        fields = "__all__"


class UserProfileSerializer(ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",
            "age",
            "gender",
            "height_cm",
            "weight_kg",
            "activity_level",
            "fitness_goal",
            "dietary_preference",
            "health_restrictions",
            "social_restrictions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
