from io import BytesIO
from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image

from app.schemas.food import (
    FoodImageAnalysisResponse,
    FoodTextAnalysisRequest,
    FoodTextAnalysisResponse,
)
from app.services.food_matching_service import FoodMatchingService
from app.services.image_food_analysis_service import ImageFoodAnalysisService
from app.services.quantity_service import QuantityService
from app.services.text_food_analysis_service import TextFoodAnalysisService
from app.services.yolo_service import YOLOService

router = APIRouter(prefix="/api/food", tags=["Food"])

# Initialize shared services once per process
food_matching_service = FoodMatchingService()
quantity_service = QuantityService()
yolo_service = YOLOService()

text_food_analysis_service = TextFoodAnalysisService(
    food_matching_service=food_matching_service
)
image_food_analysis_service = ImageFoodAnalysisService(
    yolo_service=yolo_service,
    quantity_service=quantity_service,
    food_matching_service=food_matching_service,
)


@router.post("/analyze-text", response_model=FoodTextAnalysisResponse)
async def analyze_food_text(request: FoodTextAnalysisRequest):
    """
    Analyze natural language text describing meals, extract food items and quantities,
    match them against the ChromaDB vector database, and calculate aggregated nutritional values.
    """
    result = text_food_analysis_service.analyze(request.text)
    return result


@router.post("/analyze", response_model=FoodImageAnalysisResponse)
async def analyze_food(image: UploadFile = File(...)):
    """
    Analyze an uploaded meal image using YOLO segmentation, estimate portion weight
    using geometrical quantity modeling, match canonical Nepali foods via ChromaDB,
    and compute aggregated nutritional totals.
    """
    try:
        image_bytes = await image.read()
        pil_image = Image.open(BytesIO(image_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image upload: {exc}",
        )

    result = image_food_analysis_service.analyze(pil_image)
    return result
