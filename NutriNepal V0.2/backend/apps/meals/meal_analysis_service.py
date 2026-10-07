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
            "micronutrients": total.get("micronutrients", {}),
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
                micronutrients=item.get("micronutrients", {}),
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
            "micronutrients": total.get("micronutrients", {}),
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
                micronutrients=item.get("micronutrients", {}),
            )
        )

    if food_items_to_create:
        MealFoodItems.objects.bulk_create(food_items_to_create)

    return total_analysis

def analyze_meal_combined(meal):
    """
    Analyzes both image and text if available, merges the results, and persists them.
    """
    image_data = None
    text_data = None

    if meal.image:
        try:
            with meal.image.open("rb") as image_file:
                image_data = analyze_food(image_file)
        except Exception as exc:
            logger.error(f"Failed to communicate with AI service for meal {meal.id} image: {exc}")

    if meal.description and meal.description.strip():
        try:
            text_data = analyze_food_text(meal.description.strip())
        except Exception as exc:
            logger.error(f"Failed to communicate with AI service for meal {meal.id} text: {exc}")

    if not image_data and not text_data:
        return None

    all_foods = []
    if image_data and image_data.get("success"):
        all_foods.extend(image_data.get("foods", []))
    if text_data and text_data.get("foods"):
        all_foods.extend(text_data.get("foods", []))

    if not all_foods:
        return None

    # Merge identical food IDs to avoid duplicates if detected in both
    merged_foods_dict = {}
    for f in all_foods:
        fid = f.get("food_id")
        if fid in merged_foods_dict:
            # Add quantities and macros
            merged_foods_dict[fid]["quantity"] += f.get("quantity", 0.0)
            merged_foods_dict[fid]["calories"] += f.get("calories", 0.0)
            merged_foods_dict[fid]["protein"] += f.get("protein", 0.0)
            merged_foods_dict[fid]["carbs"] += f.get("carbs", 0.0)
            merged_foods_dict[fid]["fat"] += f.get("fat", 0.0)
            
            # Add micros
            for k, v in f.get("micronutrients", {}).items():
                merged_foods_dict[fid]["micronutrients"][k] = merged_foods_dict[fid]["micronutrients"].get(k, 0.0) + v
        else:
            # Deep copy to avoid mutating original
            import copy
            merged_foods_dict[fid] = copy.deepcopy(f)

    merged_foods = list(merged_foods_dict.values())

    # Recalculate totals
    total_calories = sum(f.get("calories", 0.0) for f in merged_foods)
    total_protein = sum(f.get("protein", 0.0) for f in merged_foods)
    total_carbs = sum(f.get("carbs", 0.0) for f in merged_foods)
    total_fat = sum(f.get("fat", 0.0) for f in merged_foods)
    
    total_micros = {}
    for f in merged_foods:
        micros = f.get("micronutrients", {})
        for k, v in micros.items():
            total_micros[k] = total_micros.get(k, 0.0) + v
            
    for k in total_micros:
        total_micros[k] = round(total_micros[k], 2)

    total_analysis, _ = TotalFoodAnalysis.objects.update_or_create(
        meal=meal,
        defaults={
            "total_calories": round(total_calories, 2),
            "total_protein": round(total_protein, 2),
            "total_carbs": round(total_carbs, 2),
            "total_fats": round(total_fat, 2),
            "micronutrients": total_micros,
        },
    )

    total_analysis.food_items.all().delete()
    food_items_to_create = []
    for item in merged_foods:
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
                micronutrients=item.get("micronutrients", {}),
            )
        )

    if food_items_to_create:
        MealFoodItems.objects.bulk_create(food_items_to_create)

    return total_analysis
