import logging
from core.ai_service.client import analyze_food, analyze_food_text
from .models import TotalFoodAnalysis, MealFoodItems

logger = logging.getLogger(__name__)


def analyze_meal_image(meal):
    """
    Send meal image to FastAPI AI service, receive detected food items and nutrition,
    and persist TotalFoodAnalysis and MealFoodItems records.
    """
    if not meal.image:
        raise ValueError("Meal does not have an image.")

    try:
        with meal.image.open("rb") as image_file:
            analysis_data = analyze_food(image_file)
    except Exception as exc:
        logger.error(f"Failed to communicate with AI service for meal {meal.id}: {exc}")
        raise

    if not analysis_data or not analysis_data.get("success", False):
        logger.warning(
            f"AI service returned unsuccessful analysis for meal {meal.id}: {analysis_data}"
        )
        return None

    total = analysis_data.get("total", {})
    foods = analysis_data.get("foods", [])

    total_analysis, _ = TotalFoodAnalysis.objects.update_or_create(
        meal=meal,
        defaults={
            "total_calories": total.get("calories", 0.0),
            "total_protein": total.get("protein", 0.0),
            "total_carbs": total.get("carbs", 0.0),
            "total_fats": total.get("fat", 0.0),
        },
    )

    # Clear existing food items and create new items from analysis
    total_analysis.food_items.all().delete()
    food_items_to_create = []
    for item in foods:
        food_items_to_create.append(
            MealFoodItems(
                food_analysis=total_analysis,
                food_name=item.get("name") or item.get("food_id") or "Unknown Food",
                food_quantity=item.get("quantity", 0.0),
                food_quantity_unit=item.get("unit", "g"),
                food_calories=item.get("calories", 0.0),
                food_protein=item.get("protein", 0.0),
                food_carbs=item.get("carbs", 0.0),
                food_fats=item.get("fat", 0.0),
            )
        )

    if food_items_to_create:
        MealFoodItems.objects.bulk_create(food_items_to_create)

    return total_analysis


def analyze_meal_text(meal):
    """
    Send natural language meal description to FastAPI AI service,
    receive parsed food items and nutrition, and persist TotalFoodAnalysis and MealFoodItems records.
    """
    if not meal.description or not meal.description.strip():
        return None

    try:
        analysis_data = analyze_food_text(meal.description.strip())
    except Exception as exc:
        logger.error(
            f"Failed to communicate with AI service for text meal {meal.id}: {exc}"
        )
        raise

    if not analysis_data or not analysis_data.get("foods"):
        logger.warning(
            f"AI service returned empty text analysis for meal {meal.id}: {analysis_data}"
        )
        return None

    total = analysis_data.get("total", {})
    foods = analysis_data.get("foods", [])

    total_analysis, _ = TotalFoodAnalysis.objects.update_or_create(
        meal=meal,
        defaults={
            "total_calories": total.get("calories", 0.0),
            "total_protein": total.get("protein", 0.0),
            "total_carbs": total.get("carbs", 0.0),
            "total_fats": total.get("fat", 0.0),
        },
    )

    total_analysis.food_items.all().delete()
    food_items_to_create = []
    for item in foods:
        food_items_to_create.append(
            MealFoodItems(
                food_analysis=total_analysis,
                food_name=item.get("name") or item.get("food_id") or "Unknown Food",
                food_quantity=item.get("quantity", 0.0),
                food_quantity_unit=item.get("unit", "g"),
                food_calories=item.get("calories", 0.0),
                food_protein=item.get("protein", 0.0),
                food_carbs=item.get("carbs", 0.0),
                food_fats=item.get("fat", 0.0),
            )
        )

    if food_items_to_create:
        MealFoodItems.objects.bulk_create(food_items_to_create)

    return total_analysis
