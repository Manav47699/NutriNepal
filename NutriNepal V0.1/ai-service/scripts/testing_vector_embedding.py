import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure ai-service root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = SCRIPT_DIR.parent
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from app.services.food_matching_service import FoodMatchingService
from app.services.text_food_analysis_service import TextFoodAnalysisService


class NepaliFoodExtractor:
    """Wrapper maintaining test interface compatibility using TextFoodAnalysisService and FoodMatchingService."""

    def __init__(
        self,
        food_matching_service: Optional[FoodMatchingService] = None,
        text_service: Optional[TextFoodAnalysisService] = None,
    ):
        self.matching_service = (
            food_matching_service
            if food_matching_service is not None
            else FoodMatchingService()
        )
        self.text_service = (
            text_service
            if text_service is not None
            else TextFoodAnalysisService(food_matching_service=self.matching_service)
        )

    def similarity_search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Direct vector similarity search using FoodMatchingService."""
        return self.matching_service.search_food(query, k=k)

    def extract_and_calculate(
        self, sentence: str, default_plate_gram: float = 150.0
    ) -> Dict[str, Any]:
        """Sentence food extraction and macro aggregation using TextFoodAnalysisService."""
        result = self.text_service.analyze(
            sentence, default_plate_gram=default_plate_gram
        )
        return {
            "itemized": [
                {
                    "food_id": f["food_id"],
                    "name": f["name"],
                    "consumed_grams": f["quantity"],
                    "calories": f["calories"],
                    "protein": f["protein"],
                    "carbs": f["carbs"],
                    "fat": f["fat"],
                }
                for f in result["foods"]
            ],
            "total_nutrition": result["total"],
        }


# --- EXECUTION ---
if __name__ == "__main__":
    extractor = NepaliFoodExtractor()

    print("\n" + "=" * 60)
    print("TEST 1: DIRECT VECTOR SIMILARITY SEARCH (via FoodMatchingService)")
    print("=" * 60)

    direct_queries = ["bhat", "dal", "sabji", "kukhura ko masu"]
    for query in direct_queries:
        print(f"\nQuery: '{query}'")
        results = extractor.similarity_search(query, k=2)
        for rank, match in enumerate(results, 1):
            print(
                f"  Rank {rank} (score: {match['score']:.4f}): "
                f"ID='{match['id']}', Name='{match['name']}'"
            )

    print("\n" + "=" * 60)
    print("TEST 2: NATURAL LANGUAGE SENTENCE EXTRACTION (via TextFoodAnalysisService)")
    print("=" * 60)

    test_sentences = [
        "maile 1 plate dal ra 1 plate bhat khaye",
        "aaja bihan maile 150 gram kukhura ko masu ani 200 gram chiura khayeko thiye",
        "khana ma alu ra palung saag thiyo",
        "maile 1 plate bhat khaye",
    ]

    for idx, sentence in enumerate(test_sentences, 1):
        print(f"\n================ TEST {idx} ================")
        print(f"INPUT SENTENCE: '{sentence}'")
        output = extractor.extract_and_calculate(sentence, default_plate_gram=150.0)

        print("\nIDENTIFIED FOOD ITEMS:")
        for item in output["itemized"]:
            print(
                f"  - [{item['food_id']}] {item['name']}: {item['consumed_grams']}g "
                f"({item['calories']} kcal, {item['protein']}g P, {item['carbs']}g C, {item['fat']}g F)"
            )

        print(f"\nTOTAL NUTRITION: {output['total_nutrition']}")
