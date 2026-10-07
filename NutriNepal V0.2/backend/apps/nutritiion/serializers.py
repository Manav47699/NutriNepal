from rest_framework import serializers
from .models import FoodItem, FoodAlias


class FoodAliasSerializer(serializers.ModelSerializer):
    """
    Serializer for the FoodAlias model.
    Exposes all fields including the related food item.
    """

    class Meta:
        model = FoodAlias
        fields = [
            "id",
            "food_item",
            "language",
            "alias",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_alias(self, value):
        """
        Validate that the alias is not empty, whitespace-only, or meaningless.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Alias cannot be empty or consist only of whitespace.")
        return value.strip()


class FoodItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the FoodItem model.
    Exposes all food item fields and nests related aliases as a read-only list.
    """
    food_aliases = FoodAliasSerializer(many=True, read_only=True)

    class Meta:
        model = FoodItem
        fields = [
            "id",
            "name",
            "description",
            "serving_unit",
            "calories_per_100g",
            "protein_per_100g",
            "carbs_per_100g",
            "fat_per_100g",
            "fiber_per_100g",
            "source",
            "is_active",
            "created_at",
            "updated_at",
            "food_aliases",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
