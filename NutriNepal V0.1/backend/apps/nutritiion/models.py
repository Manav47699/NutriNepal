from django.db import models
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator,
)

"""
Nutrition Database for master DB which holds the necessary informations.
"""


class FoodItem(models.Model):
    """
    Individual food items along with their nutritional information.
    """

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    serving_unit = models.CharField(max_length=255, blank=True, null=True)

    calories_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1000),
        ],
    )

    protein_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1000),
        ],
    )

    carbs_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1000),
        ],
    )

    fat_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1000),
        ],
    )

    fiber_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(1000),
        ],
    )

    source = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class FoodAlias(models.Model):
    """
    Alternative names for food items.

    Used for local/colloquial food-name matching,
    semantic search, and typeahead search.
    """

    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.CASCADE,
        related_name="food_aliases",
    )
    language = models.CharField(max_length=100, default="en")
    alias = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.alias
