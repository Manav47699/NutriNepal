from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FoodTextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Natural language food consumption description")


class FoodItemNutrition(BaseModel):
    food_id: str
    name: str
    matched_alias: str
    quantity: float
    unit: str
    calories: float
    protein: float
    carbs: float
    fat: float
    veg_or_nonveg: Optional[str] = ""
    fitness_direction: Optional[str] = ""
    health_restrictions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    social_restrictions: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DetectedFoodItemNutrition(BaseModel):
    food_id: str
    name: str
    detected_label: str
    confidence: float
    quantity: float
    unit: str = "g"
    calories: float
    protein: float
    carbs: float
    fat: float
    veg_or_nonveg: Optional[str] = ""
    fitness_direction: Optional[str] = ""
    health_restrictions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    social_restrictions: Optional[Dict[str, Any]] = Field(default_factory=dict)


class MealNutritionTotal(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float


class FoodTextAnalysisResponse(BaseModel):
    foods: List[FoodItemNutrition]
    total: MealNutritionTotal


class FoodImageAnalysisResponse(BaseModel):
    success: bool
    foods: List[DetectedFoodItemNutrition]
    total: MealNutritionTotal
