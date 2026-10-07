import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import MealLog, DailyRecommendation
from .serializers import (
    MealLogSerializer,
    MealRecommendationSerializer,
    DailyRecommendationSerializer,
)
from .meal_analysis_service import analyze_meal_image, analyze_meal_text
from .meal_recommendation_service import generate_and_save_meal_recommendation
from .daily_recommendation_service import (
    generate_and_save_daily_recommendation,
    parse_target_date,
)

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
            if meal.image:
                try:
                    analyze_meal_image(meal)
                except Exception as exc:
                    logger.error(f"Error during meal image analysis: {exc}")
            elif meal.description and meal.description.strip():
                try:
                    analyze_meal_text(meal)
                except Exception as exc:
                    logger.error(f"Error during meal text analysis: {exc}")

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
            if "image" in request.FILES:
                try:
                    analyze_meal_image(meal)
                except Exception as exc:
                    logger.error(f"Error during meal image analysis on update: {exc}")
            elif "description" in request.data and not meal.image:
                try:
                    analyze_meal_text(meal)
                except Exception as exc:
                    logger.error(f"Error during meal text analysis on update: {exc}")

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
            if meal.image:
                analyze_meal_image(meal)
            elif meal.description and meal.description.strip():
                analyze_meal_text(meal)
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


class DailyRecommendationView(APIView):
    """
    Generate or retrieve personalized whole-day AI dietary recommendation for a user on a given date.
    GET  : Retrieve the stored daily recommendation for date (default: today).
    POST : Generate (or re-generate) whole-day recommendation via FastAPI + LLM and persist it in Django.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get("date")
        try:
            target_date = parse_target_date(date_str)
        except ValueError as exc:
            return Response(
                {
                    "status": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        recommendation = DailyRecommendation.objects.filter(
            user=request.user, date=target_date
        ).first()

        if not recommendation:
            return Response(
                {
                    "status": False,
                    "message": f"No daily recommendation found for {target_date.isoformat()}. Please generate one first.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DailyRecommendationSerializer(recommendation)
        return Response(
            {
                "status": True,
                "message": "Daily recommendation fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        date_str = None
        if isinstance(request.data, dict):
            date_str = request.data.get("date")
        if not date_str:
            date_str = request.query_params.get("date")

        try:
            target_date = parse_target_date(date_str)
        except ValueError as exc:
            return Response(
                {
                    "status": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            recommendation = generate_and_save_daily_recommendation(
                request.user, target_date
            )
        except ValueError as exc:
            logger.warning(
                f"Validation error generating daily recommendation for user {request.user.id}: {exc}"
            )
            return Response(
                {
                    "status": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.error(
                f"Error generating daily recommendation for user {request.user.id}: {exc}"
            )
            return Response(
                {
                    "status": False,
                    "message": f"Failed to generate daily recommendation: {str(exc)}",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        serializer = DailyRecommendationSerializer(recommendation)
        return Response(
            {
                "status": True,
                "message": "Daily recommendation generated successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

