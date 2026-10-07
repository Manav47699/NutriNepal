import sys, os
sys.path.append(os.path.abspath("ai-service"))
from app.services.food_matching_service import FoodMatchingService
service = FoodMatchingService()
print(service.search_food("tarkari", k=1))
print(service.search_food("bhat", k=1))
print(service.search_food("dal", k=1))
