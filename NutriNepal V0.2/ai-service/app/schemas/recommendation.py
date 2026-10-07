from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Input Request Schemas ---

class FoodItemInput(BaseModel):
    name: str = Field(..., description="Food item name, e.g., Cooked Rice")
    quantity_grams: float = Field(..., ge=0, description="Portion weight in grams")
    calories: float = Field(..., ge=0, description="Calories in kcal")
    protein: float = Field(..., ge=0, description="Protein in grams")
    carbs: float = Field(..., ge=0, description="Carbohydrates in grams")
    fat: float = Field(..., ge=0, description="Fats in grams")
    micronutrients: Dict[str, float] = Field(default_factory=dict)
    veg_or_nonveg: Optional[str] = Field(default="", description="'veg' or 'nonveg'")
    fitness_direction: Optional[str] = Field(
        default="", description="e.g., 'maintain_weight', 'lose_weight'"
    )
    health_warnings: Optional[List[str]] = Field(
        default_factory=list, description="Food-level restriction flags"
    )


class NutritionSummaryInput(BaseModel):
    total_calories: float = Field(..., ge=0)
    total_protein: float = Field(..., ge=0)
    total_carbs: float = Field(..., ge=0)
    total_fats: float = Field(..., ge=0)
    micronutrients: Dict[str, float] = Field(default_factory=dict)


class UserProfileInput(BaseModel):
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = Field(None, description="e.g. 'MALE', 'FEMALE', 'OTHER'")
    height_cm: Optional[float] = Field(None, ge=30, le=300)
    weight_kg: Optional[float] = Field(None, ge=10, le=500)
    activity_level: Optional[str] = Field(
        None, description="e.g. 'SEDENTARY', 'MODERATE', 'VERY_ACTIVE'"
    )
    fitness_goal: Optional[str] = Field(
        None, description="e.g. 'LOSE_WEIGHT', 'BUILD_MUSCLE', 'MAINTAIN_WEIGHT'"
    )
    dietary_preference: Optional[str] = Field(
        None, description="e.g. 'VEGETARIAN', 'NON_VEGETARIAN', 'EGGITARIAN'"
    )
    health_restrictions: Optional[Dict[str, str]] = Field(default_factory=dict)
    social_restrictions: Optional[Dict[str, str]] = Field(default_factory=dict)
    medical_conditions: Optional[List[str]] = Field(default_factory=list)
    dietary_restrictions: Optional[List[str]] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    meal_id: Optional[int] = Field(None, description="Meal log ID from Django")
    meal_type: Optional[str] = Field(
        default="MEAL", description="e.g., 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'"
    )
    logged_at: Optional[str] = Field(
        None, description="ISO timestamp of meal creation"
    )
    description: Optional[str] = Field(
        None, description="User's meal description"
    )
    nutrition_summary: NutritionSummaryInput
    food_items: List[FoodItemInput] = Field(default_factory=list)
    user_profile: Optional[UserProfileInput] = None
    historical_foods: Optional[List[str]] = Field(default_factory=list)


# --- Output Response Schemas ---

class MacroAssessment(BaseModel):
    calories_evaluation: str
    protein_evaluation: str
    carbs_evaluation: str
    fats_evaluation: str


class HealthAlert(BaseModel):
    type: str = Field(
        ...,
        description="e.g., 'MEDICAL_RESTRICTION', 'ALLERGY_WARNING', 'GOAL_ALIGNMENT', 'PORTION_NOTICE'",
    )
    severity: str = Field(..., description="'INFO', 'WARNING', 'CRITICAL'")
    message: str


class FoodAlternative(BaseModel):
    recommended_food: str
    replaces: str
    reason: str


class RecommendationDetail(BaseModel):
    meal_id: Optional[int] = None
    overall_verdict: str = Field(
        ...,
        description="'OPTIMAL', 'ALIGNED', 'MODERATELY_ALIGNED', 'NEEDS_IMPROVEMENT', 'RESTRICTED'",
    )
    summary: str
    macro_assessment: MacroAssessment
    health_and_dietary_alerts: List[HealthAlert] = Field(default_factory=list)
    actionable_suggestions: List[str] = Field(default_factory=list)
    alternative_foods: List[FoodAlternative] = Field(default_factory=list)
    model_name: str
    generated_at: str


class RecommendationResponse(BaseModel):
    success: bool
    recommendation: RecommendationDetail
