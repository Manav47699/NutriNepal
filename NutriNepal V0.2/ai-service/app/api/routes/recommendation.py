from fastapi import APIRouter, status

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
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
