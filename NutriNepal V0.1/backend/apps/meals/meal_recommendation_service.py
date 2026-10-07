import logging
from datetime import datetime
from typing import Optional

from core.ai_service.client import generate_recommendation
from .models import MealLog, MealRecommendation

logger = logging.getLogger(__name__)


def assemble_recommendation_payload(meal: MealLog) -> dict:
    """
    Extract data from MealLog, TotalFoodAnalysis, MealFoodItems, and UserProfile
    and assemble the RecommendationRequest contract expected by FastAPI.
    """
    analysis = getattr(meal, "analysis", None)
    if not analysis:
        raise ValueError("Cannot generate recommendation for a meal without nutritional analysis.")

    # User profile data assembly
    user = meal.user
    profile = getattr(user, "profile", None)
    user_profile_payload = None

    if profile:
        medical_conditions = [c.name for c in profile.medical_conditions.all()]
        allergies = [a.name for a in profile.allergies.all()]
        dietary_restrictions = [r.name for r in profile.dietary_restrictions.all()]

        user_profile_payload = {
            "age": profile.age,
            "gender": profile.gender,
            "height_cm": float(profile.height_cm) if profile.height_cm else None,
            "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
            "target_weight_kg": float(profile.target_weight_kg) if profile.target_weight_kg else None,
            "activity_level": profile.activity_level,
            "fitness_goal": profile.fitness_goal,
            "dietary_preference": profile.dietary_preference,
            "medical_conditions": medical_conditions,
            "allergies": allergies,
            "dietary_restrictions": dietary_restrictions,
        }

    # Food items data assembly
    food_items_payload = []
    for item in analysis.food_items.all():
        food_items_payload.append(
            {
                "name": item.food_name,
                "quantity_grams": float(item.food_quantity),
                "calories": float(item.food_calories),
                "protein": float(item.food_protein),
                "carbs": float(item.food_carbs),
                "fat": float(item.food_fats),
                "veg_or_nonveg": "",
                "fitness_direction": "",
                "health_warnings": [],
            }
        )

    payload = {
        "meal_id": meal.id,
        "meal_type": meal.meal_type,
        "logged_at": meal.created_at.isoformat(),
        "description": meal.description or "",
        "nutrition_summary": {
            "total_calories": float(analysis.total_calories),
            "total_protein": float(analysis.total_protein),
            "total_carbs": float(analysis.total_carbs),
            "total_fats": float(analysis.total_fats),
        },
        "food_items": food_items_payload,
        "user_profile": user_profile_payload,
    }

    return payload


def generate_and_save_meal_recommendation(meal: MealLog) -> MealRecommendation:
    """
    Assemble context, invoke FastAPI recommendation generation, and update/create MealRecommendation.
    """
    payload = assemble_recommendation_payload(meal)

    try:
        response_data = generate_recommendation(payload)
    except Exception as exc:
        logger.error(f"Failed to generate recommendation for meal {meal.id}: {exc}")
        raise

    if not response_data or not response_data.get("success", False):
        raise ValueError(
            f"AI service returned unsuccessful recommendation response: {response_data}"
        )

    rec_data = response_data.get("recommendation", {})

    generated_at_str = rec_data.get("generated_at")
    generated_at = None
    if generated_at_str:
        try:
            generated_at = datetime.fromisoformat(generated_at_str.replace("Z", "+00:00"))
        except Exception:
            generated_at = None

    recommendation, _ = MealRecommendation.objects.update_or_create(
        meal=meal,
        defaults={
            "overall_verdict": rec_data.get("overall_verdict", "ALIGNED"),
            "summary": rec_data.get("summary", ""),
            "macro_assessment": rec_data.get("macro_assessment", {}),
            "health_and_dietary_alerts": rec_data.get("health_and_dietary_alerts", []),
            "actionable_suggestions": rec_data.get("actionable_suggestions", []),
            "alternative_foods": rec_data.get("alternative_foods", []),
            "model_name": rec_data.get("model_name", ""),
            "generated_at": generated_at,
        },
    )

    return recommendation
