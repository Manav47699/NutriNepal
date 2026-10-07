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
    GAIN_WEIGHT = "GAIN_WEIGHT", "Gain Weight"
    BUILD_MUSCLE = "BUILD_MUSCLE", "Build Muscle"


class DietaryPreferenceChoices(models.TextChoices):
    VEGETARIAN = "VEGETARIAN", "Vegetarian"
    NON_VEGETARIAN = "NON_VEGETARIAN", "Non Vegetarian"


class MedicalCondition(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Allergy(models.Model):
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


class SocialReligiousConstraint(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )  # one user have one profile.

    age = models.PositiveSmallIntegerField()

    gender = models.CharField(max_length=25, choices=GenderChoices.choices)

    height_cm = models.DecimalField(max_digits=5, decimal_places=2)

    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)

    target_weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

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

    medical_conditions = models.ManyToManyField(
        MedicalCondition, blank=True, related_name="profiles"
    )

    allergies = models.ManyToManyField(Allergy, blank=True, related_name="profiles")

    dietary_restrictions = models.ManyToManyField(
        DietaryRestriction, blank=True, related_name="profiles"
    )
    social_religious_constraints = models.ManyToManyField(
        SocialReligiousConstraint, blank=True, related_name="profiles"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.email}'s Profile"
