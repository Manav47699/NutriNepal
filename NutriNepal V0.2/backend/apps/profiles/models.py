from django.conf import settings
from django.db import models


class GenderChoices(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"


class ActivityLevelChoices(models.TextChoices):
    SEDENTARY = "SEDENTARY", "Sedentary"
    LIGHT = "LIGHT", "Lightly Active"
    MODERATE = "MODERATE", "Moderately Active"
    VERY_ACTIVE = "VERY_ACTIVE", "Very Active"
    ATHLETE = "ATHLETE", "Athlete"


class FitnessGoalChoices(models.TextChoices):
    LOSE_WEIGHT = "LOSE_WEIGHT", "Lose Weight"
    MAINTAIN_WEIGHT = "MAINTAIN_WEIGHT", "Maintain Weight"
    BUILD_MUSCLE = "BUILD_MUSCLE", "Build Muscle"


class DietaryPreferenceChoices(models.TextChoices):
    VEGETARIAN = "VEGETARIAN", "Vegetarian"
    NON_VEGETARIAN = "NON_VEGETARIAN", "Non Vegetarian"
    EGGITARIAN = "EGGITARIAN", "Eggitarian / Egg only"


def default_health_restrictions():
    return {
        "diabetes": "allowed",
        "uric_acid": "allowed",
        "hypertension": "allowed",
        "kidney_disease": "allowed",
    }


def default_social_restrictions():
    return {
        "shrawan": "allowed",
        "chaturmas": "allowed",
        "mourning": "allowed",
        "no_onion_garlic": "allowed",
    }


class MedicalCondition(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DietaryRestriction(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    ) # one user have one profile. 

    age = models.PositiveSmallIntegerField()

    gender = models.CharField(max_length=25, choices=GenderChoices.choices)

    height_cm = models.DecimalField(max_digits=5, decimal_places=2)

    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)

    activity_level = models.CharField(
        max_length=25,
        choices=ActivityLevelChoices.choices,
        default=ActivityLevelChoices.SEDENTARY,
    )

    fitness_goal = models.CharField(
        max_length=30,
        choices=FitnessGoalChoices.choices,
        default=FitnessGoalChoices.MAINTAIN_WEIGHT,
    )

    dietary_preference = models.CharField(
        max_length=25,
        choices=DietaryPreferenceChoices.choices,
        default=DietaryPreferenceChoices.NON_VEGETARIAN,
    )

    health_restrictions = models.JSONField(
        default=default_health_restrictions
    )

    social_restrictions = models.JSONField(
        default=default_social_restrictions
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.email}'s Profile"
