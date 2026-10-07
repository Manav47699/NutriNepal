import sys
import os
import json
sys.path.append(os.path.abspath("ai-service"))

from app.services.text_food_analysis_service import TextFoodAnalysisService

service = TextFoodAnalysisService()
result = service.analyze("bhat ra anda")
print(json.dumps(result["foods"], indent=2))
