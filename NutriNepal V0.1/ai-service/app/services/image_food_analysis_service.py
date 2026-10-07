import logging
from typing import Any, Dict, List, Optional
from PIL import Image

from app.services.food_matching_service import FoodMatchingService
from app.services.quantity_service import QuantityService
from app.services.yolo_service import YOLOService

logger = logging.getLogger(__name__)


class ImageFoodAnalysisService:
    """
    Service for image-based food analysis.
    Orchestrates YOLO segmentation, geometrical quantity/weight estimation,
    ChromaDB canonical food matching, and nutritional macro aggregation.
    """

    def __init__(
        self,
        yolo_service: Optional[YOLOService] = None,
        quantity_service: Optional[QuantityService] = None,
        food_matching_service: Optional[FoodMatchingService] = None,
    ):
        self.yolo_service = yolo_service if yolo_service is not None else YOLOService()
        self.quantity_service = (
            quantity_service if quantity_service is not None else QuantityService()
        )
        self.matching_service = (
            food_matching_service
            if food_matching_service is not None
            else FoodMatchingService()
        )

    def analyze(self, image: Image.Image) -> Dict[str, Any]:
        """
        Analyze a food image:
        1. Segment food items using fine-tuned YOLOv8.
        2. Estimate portion gram weight for each segment using QuantityService.
        3. Match canonical Nepali food records from ChromaDB using FoodMatchingService.
        4. Calculate itemized and meal-level nutritional macros.
        """
        image_rgb = image.convert("RGB")
        image_width, image_height = image_rgb.size

        detections = self.yolo_service.analyze(image_rgb)

        itemized_results: List[Dict[str, Any]] = []
        total_nutrition = {
            "calories": 0.0,
            "protein": 0.0,
            "carbs": 0.0,
            "fat": 0.0,
        }

        for detection in detections:
            detected_label = detection["name"]
            confidence = float(detection["confidence"])
            mask = detection["mask"]

            # Estimate portion weight
            estimated_weight_g = self.quantity_service.estimate_weight(
                mask=mask,
                food_name=detected_label,
                image_width=image_width,
                image_height=image_height,
            )
            estimated_weight_g = round(max(estimated_weight_g, 0.0), 2)

            # Match canonical food item from ChromaDB
            food_record = (
                self.matching_service.get_food_by_id(detected_label)
                or self.matching_service.get_top_match(detected_label)
            )

            food_id = food_record.get("id", detected_label) if food_record else detected_label
            food_name = food_record.get("name", detected_label.capitalize()) if food_record else detected_label.capitalize()
            nutrition_per_gram = food_record.get("nutrition_per_gram", {}) if food_record else {}

            # Calculate macros
            item_cal = round(nutrition_per_gram.get("calories", 0.0) * estimated_weight_g, 2)
            item_prot = round(nutrition_per_gram.get("protein_g", nutrition_per_gram.get("protein", 0.0)) * estimated_weight_g, 2)
            item_carbs = round(nutrition_per_gram.get("carbs_g", nutrition_per_gram.get("carbs", 0.0)) * estimated_weight_g, 2)
            item_fat = round(nutrition_per_gram.get("fat_g", nutrition_per_gram.get("fat", 0.0)) * estimated_weight_g, 2)

            total_nutrition["calories"] += item_cal
            total_nutrition["protein"] += item_prot
            total_nutrition["carbs"] += item_carbs
            total_nutrition["fat"] += item_fat

            itemized_results.append(
                {
                    "food_id": food_id,
                    "name": food_name,
                    "detected_label": detected_label,
                    "confidence": round(confidence, 4),
                    "quantity": estimated_weight_g,
                    "unit": "g",
                    "calories": item_cal,
                    "protein": item_prot,
                    "carbs": item_carbs,
                    "fat": item_fat,
                    "veg_or_nonveg": food_record.get("veg_or_nonveg", "") if food_record else "",
                    "fitness_direction": food_record.get("fitness_direction", "") if food_record else "",
                    "health_restrictions": food_record.get("health_restrictions", {}) if food_record else {},
                    "social_restrictions": food_record.get("social_restrictions", {}) if food_record else {},
                }
            )

        return {
            "success": True,
            "foods": itemized_results,
            "total": {
                "calories": round(total_nutrition["calories"], 2),
                "protein": round(total_nutrition["protein"], 2),
                "carbs": round(total_nutrition["carbs"], 2),
                "fat": round(total_nutrition["fat"], 2),
            },
        }
