from rest_framework.serializers import ModelSerializer
from .models import (
    UserProfile,
    MedicalCondition,
    Allergy,
    DietaryRestriction,
    SocialReligiousConstraint,
)


class MedicalConditionSerializer(ModelSerializer):
    class Meta:
        model = MedicalCondition
        fields = "__all__"


class AllergySerializer(ModelSerializer):
    class Meta:
        model = Allergy
        fields = "__all__"


class DietaryRestrictionSerializer(ModelSerializer):
    class Meta:
        model = DietaryRestriction
        fields = "__all__"


class SocialReligiousConstraintSerializer(ModelSerializer):
    class Meta:
        model = SocialReligiousConstraint
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
            "target_weight_kg",
            "activity_level",
            "fitness_goal",
            "dietary_preference",
            "medical_conditions",
            "allergies",
            "dietary_restrictions",
            "social_religious_constraints",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
