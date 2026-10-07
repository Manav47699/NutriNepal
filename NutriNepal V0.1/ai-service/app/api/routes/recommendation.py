from fastapi import APIRouter, status

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    DailyRecommendationRequest,
    DailyRecommendationResponse,
)
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/api/recommendation", tags=["Recommendation"])

recommendation_service = RecommendationService()


@router.post(
    "/generate",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_meal_recommendation(request: RecommendationRequest):
    """
    Generate personalized Nepali dietary advisory and actionable feedback
    for a logged meal using the Ollama LLM engine.
    """
    result = await recommendation_service.generate_recommendation(request)
    return result


@router.post(
    "/daily",
    response_model=DailyRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_daily_recommendation(request: DailyRecommendationRequest):
    """
    Generate whole-day personalized Nepali dietary advisory and actionable feedback
    evaluating all meals consumed on a given date against the user's health profile.
    """
    result = await recommendation_service.generate_daily_recommendation(request)
    return result

