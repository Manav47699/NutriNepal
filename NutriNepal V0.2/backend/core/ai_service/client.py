import mimetypes
from pathlib import Path
from django.conf import settings
import httpx

AI_SERVICE_URL = getattr(settings, "AI_SERVICE_URL", "http://127.0.0.1:8001")


def check_ai_service_health():
    """
    Check the health of the AI service.
    """
    try:
        response = httpx.get(
            f"{AI_SERVICE_URL}/health",
            timeout=5.0,
        )

        if response.status_code == 200:
            return {
                "response": response.json(),
                "status": "healthy",
                "message": "The AI service is accessible and healthy.",
            }

        return {
            "status": "unhealthy",
            "message": f"AI service returned status {response.status_code}.",
        }

    except httpx.RequestError:
        return {
            "status": "unhealthy",
            "message": "The AI service is not accessible.",
        }


def analyze_food(image_file):
    """
    Send a meal image to the AI service for food analysis.
    """
    raw_name = getattr(image_file, "name", "meal.jpg")
    filename = Path(raw_name).name if raw_name else "meal.jpg"

    content_type, _ = mimetypes.guess_type(filename)
    if content_type is None:
        content_type = "image/jpeg"

    if hasattr(image_file, "seek"):
        image_file.seek(0)

    file_bytes = image_file.read() if hasattr(image_file, "read") else image_file

    response = httpx.post(
        f"{AI_SERVICE_URL}/api/food/analyze",
        files={
            "image": (
                filename,
                file_bytes,
                content_type,
            )
        },
        timeout=60.0,
    )

    response.raise_for_status()

    return response.json()


def analyze_food_text(text: str) -> dict:
    """
    Send natural language meal description to the AI service for food analysis.
    """
    response = httpx.post(
        f"{AI_SERVICE_URL}/api/food/analyze-text",
        json={"text": text},
        timeout=30.0,
    )

    response.raise_for_status()

    return response.json()


def generate_recommendation(payload: dict) -> dict:
    """
    Send structured meal and user profile context to the AI service
    to generate personalized dietary advisory feedback via LLM.
    """
    response = httpx.post(
        f"{AI_SERVICE_URL}/api/recommendation/generate",
        json=payload,
        timeout=300.0,
    )

    response.raise_for_status()

    return response.json()
