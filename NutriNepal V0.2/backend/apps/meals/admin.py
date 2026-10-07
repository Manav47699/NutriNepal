from django.contrib import admin
from .models import MealLog


class MealLogAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "meal_type", "created_at"]
    list_filter = ["meal_type", "created_at", "updated_at"]
    search_fields = ["id", "user__email", "meal_type", "description"]
    ordering = ["-created_at"]


admin.site.register(MealLog, MealLogAdmin)
