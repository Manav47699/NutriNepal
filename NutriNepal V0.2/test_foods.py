import sys
import os
sys.path.append(os.path.abspath("ai-service"))

from app.services.food_matching_service import FoodMatchingService

service = FoodMatchingService()
foods = service.get_all_foods()
bhat = foods.get("bhat")
print(bhat)
