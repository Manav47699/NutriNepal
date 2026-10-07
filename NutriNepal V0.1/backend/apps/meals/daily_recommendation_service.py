import logging
from datetime import date, datetime
from typing import Optional, Union

from django.utils import timezone
from core.ai_service.client import generate_daily_recommendation
from .models import MealLog, DailyRecommendation

logger = logging.getLogger(__name__)


def parse_target_date(target_date: Optional[Union[date, str]] = None) -> date:
    """
    Parse date from date object or ISO format string YYYY-MM-DD.
    Defaults to current date if None.
    """
    if target_date is None:
        return timezone.localdate() if hasattr(timezone, "localdate") else timezone.now().date()
    if isinstance(target_date, str):
        try:
            return date.fromisoformat(target_date.strip())
        except ValueError:
            try:
                return datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
            except ValueError as exc:
                raise ValueError(f"Invalid date format: '{target_date}'. Expected 'YYYY-MM-DD'.") from exc
    if isinstance(target_date, date):
        return target_date
    raise ValueError(f"Unsupported date type: {type(target_date)}")


def assemble_daily_recommendation_payload(user, target_date: date) -> tuple[dict, float, float, float, float, int]:
    """
    Extract data from all analyzed MealLogs on target_date for user,
    aggregate daily totals, assemble user profile constraints, and build
    the DailyRecommendationRequest payload expected by FastAPI.
    """
    meals = (
        MealLog.objects.filter(user=user, created_at__date=target_date)
        .select_related("analysis")
        .prefetch_related("analysis__food_items")
        .order_by("created_at")
    )

    analyzed_meals = [m for m in meals if hasattr(m, "analysis") and m.analysis is not None]

    if not analyzed_meals:
        raise ValueError(
            f"No analyzed meals found for {target_date.isoformat()}. "
            "Please log and analyze at least one meal before generating daily recommendations."
        )

    daily_calories = sum(float(m.analysis.total_calories) for m in analyzed_meals)
    daily_protein = sum(float(m.analysis.total_protein) for m in analyzed_meals)
    daily_carbs = sum(float(m.analysis.total_carbs) for m in analyzed_meals)
    daily_fats = sum(float(m.analysis.total_fats) for m in analyzed_meals)

    # User profile data assembly
    profile = getattr(user, "profile", None)
    user_profile_payload = None

    if profile:
        medical_conditions = [c.name for c in profile.medical_conditions.all()]
        allergies = [a.name for a in profile.allergies.all()]
        dietary_restrictions = [r.name for r in profile.dietary_restrictions.all()]
        social_religious_constraints = [s.name for s in profile.social_religious_constraints.all()]

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
            "social_religious_constraints": social_religious_constraints,
        }

    meals_payload = []
    for meal in analyzed_meals:
        food_items_payload = []
        for item in meal.analysis.food_items.all():
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

        meals_payload.append(
            {
                "meal_id": meal.id,
                "meal_type": meal.meal_type,
                "logged_at": meal.created_at.isoformat(),
                "description": meal.description or "",
                "nutrition_summary": {
                    "total_calories": float(meal.analysis.total_calories),
                    "total_protein": float(meal.analysis.total_protein),
                    "total_carbs": float(meal.analysis.total_carbs),
                    "total_fats": float(meal.analysis.total_fats),
                },
                "food_items": food_items_payload,
            }
        )

    payload = {
        "date": target_date.isoformat(),
        "daily_nutrition_summary": {
            "total_calories": round(daily_calories, 2),
            "total_protein": round(daily_protein, 2),
            "total_carbs": round(daily_carbs, 2),
            "total_fats": round(daily_fats, 2),
        },
        "meals": meals_payload,
        "user_profile": user_profile_payload,
    }

    return payload, daily_calories, daily_protein, daily_carbs, daily_fats, len(analyzed_meals)


def generate_and_save_daily_recommendation(
    user, target_date: Optional[Union[date, str]] = None
) -> DailyRecommendation:
    """
    Assemble whole-day context for target_date, invoke FastAPI daily recommendation generation,
    and update/create DailyRecommendation in Django database.
    """
    parsed_date = parse_target_date(target_date)
    payload, cal, pro, carb, fat, count = assemble_daily_recommendation_payload(user, parsed_date)

    try:
        response_data = generate_daily_recommendation(payload)
    except Exception as exc:
        logger.error(f"Failed to generate daily recommendation for user {user.id} on {parsed_date}: {exc}")
        raise

    if not response_data or not response_data.get("success", False):
        raise ValueError(
            f"AI service returned unsuccessful daily recommendation response: {response_data}"
        )

    rec_data = response_data.get("recommendation", {})

    generated_at_str = rec_data.get("generated_at")
    generated_at = None
    if generated_at_str:
        try:
            generated_at = datetime.fromisoformat(generated_at_str.replace("Z", "+00:00"))
        except Exception:
            generated_at = None

    recommendation, _ = DailyRecommendation.objects.update_or_create(
        user=user,
        date=parsed_date,
        defaults={
            "overall_verdict": rec_data.get("overall_verdict", "ALIGNED"),
            "summary": rec_data.get("summary", ""),
            "macro_assessment": rec_data.get("macro_assessment", {}),
            "health_and_dietary_alerts": rec_data.get("health_and_dietary_alerts", []),
            "actionable_suggestions": rec_data.get("actionable_suggestions", []),
            "alternative_foods": rec_data.get("alternative_foods", []),
            "daily_totals": {
                "total_calories": round(cal, 2),
                "total_protein": round(pro, 2),
                "total_carbs": round(carb, 2),
                "total_fats": round(fat, 2),
                "meals_count": count,
            },
            "model_name": rec_data.get("model_name", ""),
            "generated_at": generated_at,
        },
    )

    return recommendation
