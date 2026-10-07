from django.contrib import admin
from .models import (
    UserProfile,
    MedicalCondition,
    Allergy,
    DietaryRestriction,
    SocialReligiousConstraint,
)


class MedicalConditionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
    )
    list_filter = (
        "name",
        "description",
    )
    search_fields = (
        "name",
        "description",
    )
    ordering = ["name"]


class AllergyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
    )
    list_filter = (
        "name",
        "description",
    )
    search_fields = (
        "name",
        "description",
    )
    ordering = ["name"]


class DietaryRestrictionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
    )
    list_filter = (
        "name",
        "description",
    )
    search_fields = (
        "name",
        "description",
    )
    ordering = ["name"]


class SocialReligiousConstraintAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
    )
    list_filter = (
        "name",
        "description",
    )
    search_fields = (
        "name",
        "description",
    )
    ordering = ["name"]


class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "gender",
        "height_cm",
        "weight_kg",
        "activity_level",
        "fitness_goal",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "gender",
        "activity_level",
        "fitness_goal",
        "created_at",
        "updated_at",
    )

    search_fields = ("user__email",)

    ordering = ["user__email"]


admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(MedicalCondition, MedicalConditionAdmin)
admin.site.register(Allergy, AllergyAdmin)
admin.site.register(DietaryRestriction, DietaryRestrictionAdmin)
admin.site.register(SocialReligiousConstraint, SocialReligiousConstraintAdmin)
