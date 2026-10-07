import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import MealLog
from .serializers import MealLogSerializer, MealRecommendationSerializer
from .meal_analysis_service import analyze_meal_image, analyze_meal_text, analyze_meal_combined
from .meal_recommendation_service import generate_and_save_meal_recommendation

logger = logging.getLogger(__name__)


class MealLogListCreateView(APIView):
    """
    Meal log of current user.
    GET : Fetch all meal logs of the current user with nutrition analysis.
    POST : Create a meal log, trigger AI analysis (image or text), and return meal log with analysis.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        meal_logs = MealLog.objects.filter(user=request.user)
        serializer = MealLogSerializer(meal_logs, many=True)
        return Response(
            {
                "status": True,
                "message": "Meal logs fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = MealLogSerializer(data=request.data)
        if serializer.is_valid():
            meal = serializer.save(user=request.user)
            if meal.image or (meal.description and meal.description.strip()):
                try:
                    analyze_meal_combined(meal)
                except Exception as exc:
                    logger.error(f"Error during meal combined analysis: {exc}")

            meal.refresh_from_db()
            response_serializer = MealLogSerializer(meal)
            return Response(
                {
                    "status": True,
                    "message": "Meal log created successfully",
                    "data": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {
                "status": False,
                "message": "Failed to create meal log",
                "data": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class MealLogDetailView(APIView):
    """
    Meal log detail of current user.
    GET : Fetch a specific meal log with analysis and recommendation.
    PATCH : Update a specific meal log.
    DELETE : Delete a specific meal log.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, meal_id):
        try:
            meal_log = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = MealLogSerializer(meal_log)
        return Response(
            {
                "status": True,
                "message": "Meal log fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, meal_id):
        try:
            meal_log = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = MealLogSerializer(meal_log, data=request.data, partial=True)
        if serializer.is_valid():
            meal = serializer.save()
            if "image" in request.FILES or "description" in request.data:
                try:
                    analyze_meal_combined(meal)
                except Exception as exc:
                    logger.error(f"Error during meal combined analysis on update: {exc}")

            meal.refresh_from_db()
            response_serializer = MealLogSerializer(meal)
            return Response(
                {
                    "status": True,
                    "message": "Meal log updated successfully",
                    "data": response_serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "status": False,
                "message": "Failed to update meal log",
                "data": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, meal_id):
        try:
            meal_log = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        meal_log.delete()
        return Response(
            {
                "status": True,
                "message": "Meal log deleted successfully",
            },
            status=status.HTTP_200_OK,
        )


class MealAnalyzeView(APIView):
    """
    Trigger or re-trigger AI nutritional analysis for an existing meal log (image or text).
    POST : Runs analysis via FastAPI and persists/updates TotalFoodAnalysis and MealFoodItems.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, meal_id):
        try:
            meal = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not meal.image and not (meal.description and meal.description.strip()):
            return Response(
                {
                    "status": False,
                    "message": "Meal log has neither an image nor a description to analyze.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if meal.image or (meal.description and meal.description.strip()):
                analyze_meal_combined(meal)
        except Exception as exc:
            logger.error(f"Failed to analyze meal {meal.id}: {exc}")
            return Response(
                {
                    "status": False,
                    "message": f"Failed to perform nutritional analysis: {str(exc)}",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        meal.refresh_from_db()
        serializer = MealLogSerializer(meal)
        return Response(
            {
                "status": True,
                "message": "Meal nutritional analysis completed successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MealRecommendationView(APIView):
    """
    Generate or retrieve personalized AI dietary recommendation for a specific meal log.
    POST : Generate (or re-generate) recommendation via FastAPI + LLM and persist it in Django.
    GET  : Retrieve the existing recommendation for the meal.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, meal_id):
        try:
            meal = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not hasattr(meal, "analysis"):
            return Response(
                {
                    "status": False,
                    "message": "Meal nutritional analysis must be completed before generating a recommendation.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            recommendation = generate_and_save_meal_recommendation(meal)
        except Exception as exc:
            logger.error(f"Error generating recommendation for meal {meal.id}: {exc}")
            return Response(
                {
                    "status": False,
                    "message": f"Failed to generate recommendation: {str(exc)}",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        serializer = MealRecommendationSerializer(recommendation)
        return Response(
            {
                "status": True,
                "message": "Meal recommendation generated successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request, meal_id):
        try:
            meal = MealLog.objects.get(id=meal_id, user=request.user)
        except MealLog.DoesNotExist:
            return Response(
                {
                    "status": False,
                    "message": "Meal log not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not hasattr(meal, "recommendation"):
            return Response(
                {
                    "status": False,
                    "message": "No recommendation found for this meal. Please generate one first.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MealRecommendationSerializer(meal.recommendation)
        return Response(
            {
                "status": True,
                "message": "Meal recommendation fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

from django.utils import timezone
from core.ai_service.client import generate_recommendation

class DailyReportView(APIView):
    """
    Generates a daily nutritional report based on all meals logged today.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        today = timezone.localdate()
        meals = MealLog.objects.filter(user=request.user, created_at__date=today)
        
        if not meals.exists():
            return Response({"status": False, "message": "No meals logged today."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        profile = getattr(user, "profile", None)
        user_profile_payload = None
        if profile:
            user_profile_payload = {
                "age": profile.age,
                "gender": profile.gender,
                "height_cm": float(profile.height_cm) if profile.height_cm else None,
                "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
                "activity_level": profile.activity_level,
                "fitness_goal": profile.fitness_goal,
                "dietary_preference": profile.dietary_preference,
                "health_restrictions": getattr(profile, "health_restrictions", {}),
                "social_restrictions": getattr(profile, "social_restrictions", {}),
            }
            
        total_cal, total_prot, total_carb, total_fat = 0, 0, 0, 0
        total_micros = {}
        food_items_payload = []
        
        for meal in meals:
            analysis = getattr(meal, "analysis", None)
            if not analysis:
                continue
            
            total_cal += float(analysis.total_calories)
            total_prot += float(analysis.total_protein)
            total_carb += float(analysis.total_carbs)
            total_fat += float(analysis.total_fats)
            
            for k, v in (analysis.micronutrients or {}).items():
                total_micros[k] = total_micros.get(k, 0.0) + float(v)
                
            for item in analysis.food_items.all():
                food_items_payload.append({
                    "name": item.food_name,
                    "quantity_grams": float(item.food_quantity),
                    "calories": float(item.food_calories),
                    "protein": float(item.food_protein),
                    "carbs": float(item.food_carbs),
                    "fat": float(item.food_fats),
                    "micronutrients": getattr(item, "micronutrients", {}) or {},
                    "veg_or_nonveg": "",
                    "fitness_direction": "",
                    "health_warnings": []
                })
                
        payload = {
            "meal_type": "DAILY_SUMMARY",
            "description": "Aggregate of today's meals",
            "nutrition_summary": {
                "total_calories": round(total_cal, 2),
                "total_protein": round(total_prot, 2),
                "total_carbs": round(total_carb, 2),
                "total_fats": round(total_fat, 2),
                "micronutrients": total_micros
            },
            "food_items": food_items_payload,
            "user_profile": user_profile_payload,
            "historical_foods": []
        }
        
        try:
            response_data = generate_recommendation(payload)
            if not response_data or not response_data.get("success"):
                return Response({"status": False, "message": "Failed to generate AI report."}, status=status.HTTP_502_BAD_GATEWAY)
            return Response({"status": True, "data": response_data.get("recommendation")}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(f"Daily report error: {exc}")
            return Response({"status": False, "message": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
