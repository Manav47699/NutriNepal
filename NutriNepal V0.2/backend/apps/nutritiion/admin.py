from django.contrib import admin
from .models import FoodItem, FoodAlias


class FoodAliasInline(admin.TabularInline):
    """
    Allows managing food aliases inline from the FoodItem admin page.
    """

    model = FoodAlias
    extra = 1


class FoodItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for the FoodItem model.
    """

    list_display = (
        "id",
        "name",
        "serving_unit",
        "calories_per_100g",
        "protein_per_100g",
        "carbs_per_100g",
        "fat_per_100g",
        "fiber_per_100g",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "serving_unit", "source", "created_at")
    search_fields = ("name", "description", "source")
    ordering = ("name",)
    inlines = [FoodAliasInline]


class FoodAliasAdmin(admin.ModelAdmin):
    """
    Admin configuration for the FoodAlias model.
    """

    list_display = (
        "id",
        "food_item",
        "language",
        "alias",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "language", "created_at")
    search_fields = ("alias", "food_item__name")
    ordering = ("alias",)


admin.site.register(FoodItem, FoodItemAdmin)
admin.site.register(FoodAlias, FoodAliasAdmin)
