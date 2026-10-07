import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.schemas.recommendation import (
    FoodAlternative,
    HealthAlert,
    MacroAssessment,
    RecommendationDetail,
    RecommendationRequest,
    RecommendationResponse,
)

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Two-Tier AI Recommendation Engine:
    Tier 1: Deterministic scientific assessment of macros, micros, restrictions, and historical patterns.
    Tier 2: LLM (Ollama/Qwen) strictly used for natural language formatting of the scientific verdicts.
    """

    def __init__(self, ollama_base_url: str = "http://localhost:11434"):
        self.base_url = ollama_base_url
        self.timeout = 45.0
        self.model_name = "qwen2.5:3b"

    def _evaluate_micronutrients(self, request: RecommendationRequest) -> Tuple[List[HealthAlert], List[str]]:
        """
        Evaluate micronutrients against medically standard per-meal baseline recommendations.
        Provides robust alerts and actionable food suggestions based on deficits/excesses.
        """
        alerts = []
        suggestions = []
        
        micros = request.nutrition_summary.micronutrients
        if not micros:
            return alerts, suggestions

        # Standard estimated per-meal targets (assuming 3 meals a day for average adult)
        # These are conservative guidelines (e.g. ~33% of daily value per meal)
        targets = {
            "fiber_g": {"min": 8.0, "max": float("inf"), "name": "Fiber", "unit": "g"},
            "sugar_g": {"min": 0.0, "max": 15.0, "name": "Sugar", "unit": "g"},
            "sodium_mg": {"min": 0.0, "max": 800.0, "name": "Sodium", "unit": "mg"},
            "calcium_mg": {"min": 300.0, "max": float("inf"), "name": "Calcium", "unit": "mg"},
            "iron_mg": {"min": 4.0, "max": float("inf"), "name": "Iron", "unit": "mg"},
            "vitamin_c_mg": {"min": 25.0, "max": float("inf"), "name": "Vitamin C", "unit": "mg"},
        }
        
        diet_pref = ""
        if request.user_profile and request.user_profile.dietary_preference:
            diet_pref = str(request.user_profile.dietary_preference).upper()

        for key, limits in targets.items():
            val = micros.get(key, 0.0)
            name = limits["name"]
            
            # Check deficits
            if val < limits["min"]:
                if key == "fiber_g":
                    suggestions.append("Your meal is low in fiber. Add a side of green leafy vegetables (Saag), cucumber/carrot salad, or whole grains to support digestion.")
                elif key == "calcium_mg":
                    if diet_pref in ["VEGETARIAN", "EGGITARIAN"]:
                        suggestions.append("To boost calcium, consider adding a serving of curd (Dahi), paneer, or milk to your diet.")
                    else:
                        suggestions.append("To boost calcium, consider adding curd, paneer, or small fish (with bones) to your meals.")
                elif key == "iron_mg":
                    if diet_pref in ["VEGETARIAN", "EGGITARIAN"]:
                        suggestions.append("Your meal is low in iron. Include iron-rich foods like Spinach (Thande Saag), lentils, and a dash of lemon juice for better absorption.")
                    else:
                        suggestions.append("Your meal is low in iron. Incorporate lean meats, chicken liver, or spinach into your upcoming meals.")
                elif key == "vitamin_c_mg":
                    suggestions.append("Add a squeeze of lemon juice or a side of fresh tomatoes/citrus fruits to meet your Vitamin C requirements and boost immunity.")

            # Check excesses
            if val > limits["max"]:
                if key == "sodium_mg":
                    alerts.append(
                        HealthAlert(
                            type="MICRONUTRIENT_WARNING",
                            severity="WARNING",
                            message=f"High Sodium detected ({val}mg). Consider reducing added salt, pickles (Achar), or processed foods in subsequent meals to maintain healthy blood pressure."
                        )
                    )
                elif key == "sugar_g":
                    alerts.append(
                        HealthAlert(
                            type="MICRONUTRIENT_WARNING",
                            severity="WARNING",
                            message=f"High Sugar content ({val}g). Try to limit sweet tea, desserts, and refined carbohydrates for the rest of the day to stabilize blood glucose levels."
                        )
                    )

        # Remove duplicate suggestions if any
        unique_suggestions = list(dict.fromkeys(suggestions))
        return alerts, unique_suggestions

    def _generate_deterministic_assessment(self, request: RecommendationRequest) -> dict:
        """
        Tier 1: Scientifically evaluate the meal's macros, micros, restrictions, and profile.
        Returns a dictionary containing the exact verdicts to be formatted by the LLM.
        """
        alerts = []
        actionable_suggestions = []
        alternative_foods = []

        # 1. User Profile Defaults & Targets
        base_calories = 600.0
        base_protein = 20.0
        base_carbs = 70.0
        base_fat = 15.0

        if request.user_profile:
            goal = str(request.user_profile.fitness_goal).upper()
            if goal == "LOSE_WEIGHT":
                base_calories = 450.0
                base_protein = 25.0
                base_carbs = 50.0
                base_fat = 12.0
            elif goal in ["BUILD_MUSCLE", "MUSCLE_GAIN"]:
                base_calories = 750.0
                base_protein = 35.0
                base_carbs = 80.0
                base_fat = 20.0

            # Health restrictions check
            health_rest = request.user_profile.health_restrictions or {}
            for condition, status_val in health_rest.items():
                if status_val.lower() == "restricted":
                    alerts.append(
                        HealthAlert(
                            type="MEDICAL_RESTRICTION",
                            severity="CRITICAL",
                            message=f"Your profile indicates a restriction for '{condition}'. Please ensure your meals strictly avoid trigger ingredients.",
                        )
                    )
            
            # Social restrictions check
            social_rest = request.user_profile.social_restrictions or {}
            for condition, status_val in social_rest.items():
                if status_val.lower() == "restricted":
                    alerts.append(
                        HealthAlert(
                            type="SOCIAL_RESTRICTION",
                            severity="WARNING",
                            message=f"Your profile indicates a social/cultural restriction for '{condition}'.",
                        )
                    )

            # Vegetarian / Eggitarian enforcement
            diet_pref = str(request.user_profile.dietary_preference).upper()
            has_nonveg = any(str(item.veg_or_nonveg).lower() == "nonveg" for item in request.food_items)
            
            if diet_pref == "VEGETARIAN" and has_nonveg:
                alerts.append(
                    HealthAlert(
                        type="DIETARY_VIOLATION",
                        severity="CRITICAL",
                        message="Your meal contains non-vegetarian items, which conflicts with your Vegetarian preference.",
                    )
                )
            elif diet_pref == "EGGITARIAN":
                # Detailed check for meats if they are eggitarian
                meat_keywords = ["chicken", "mutton", "buff", "pork", "fish", "meat"]
                for item in request.food_items:
                    if str(item.veg_or_nonveg).lower() == "nonveg":
                        if any(meat in item.name.lower() for meat in meat_keywords):
                            alerts.append(
                                HealthAlert(
                                    type="DIETARY_VIOLATION",
                                    severity="CRITICAL",
                                    message=f"Item '{item.name}' conflicts with your Eggitarian preference.",
                                )
                            )

        # 2. Macro Evaluation
        actual = request.nutrition_summary
        cal_diff = actual.total_calories - base_calories
        p_diff = actual.total_protein - base_protein
        c_diff = actual.total_carbs - base_carbs
        f_diff = actual.total_fats - base_fat

        # Calorie eval
        if abs(cal_diff) <= 100:
            cal_eval = f"Optimal caloric intake ({actual.total_calories} kcal). Perfectly aligned with your {base_calories} kcal meal target."
        elif cal_diff > 100:
            cal_eval = f"High caloric intake ({actual.total_calories} kcal). Exceeds your meal target by {cal_diff:.0f} kcal."
        else:
            cal_eval = f"Low caloric intake ({actual.total_calories} kcal). Under your meal target by {abs(cal_diff):.0f} kcal."

        # Protein eval
        if p_diff >= -3:
            p_eval = f"Excellent protein content ({actual.total_protein}g). Meets or exceeds your {base_protein}g target."
        else:
            p_eval = f"Insufficient protein ({actual.total_protein}g). You are {abs(p_diff):.0f}g short of your {base_protein}g target."

        # Carbs eval
        if abs(c_diff) <= 15:
            c_eval = f"Balanced carbohydrates ({actual.total_carbs}g). Appropriate for energy sustainment."
        elif c_diff > 15:
            c_eval = f"High carbohydrates ({actual.total_carbs}g). Try reducing grain/rice portion sizes slightly."
        else:
            c_eval = f"Low carbohydrates ({actual.total_carbs}g). Consider adding complex carbs for sustained energy."

        # Fats eval
        if abs(f_diff) <= 5:
            f_eval = f"Healthy fat ratio ({actual.total_fats}g). Well within acceptable limits."
        elif f_diff > 5:
            f_eval = f"High fat content ({actual.total_fats}g). Be mindful of added oils or fried items."
        else:
            f_eval = f"Low fat content ({actual.total_fats}g). Consider incorporating healthy fats like nuts or ghee."

        macro_assessment = MacroAssessment(
            calories_evaluation=cal_eval,
            protein_evaluation=p_eval,
            carbs_evaluation=c_eval,
            fats_evaluation=f_eval,
        )

        # 3. Overall Verdict Determination
        has_critical = any(a.severity == "CRITICAL" for a in alerts)
        
        if has_critical:
            overall_verdict = "RESTRICTED"
        else:
            if abs(cal_diff) <= 100 and p_diff >= -3 and abs(c_diff) <= 20 and abs(f_diff) <= 8:
                overall_verdict = "OPTIMAL"
            elif p_diff < -8 or cal_diff > 250:
                overall_verdict = "NEEDS_IMPROVEMENT"
            elif p_diff < -3 or cal_diff > 150:
                overall_verdict = "MODERATELY_ALIGNED"
            else:
                overall_verdict = "ALIGNED"

        # 4. Micronutrient Evaluation
        micro_alerts, micro_suggestions = self._evaluate_micronutrients(request)
        alerts.extend(micro_alerts)
        actionable_suggestions.extend(micro_suggestions)

        # 5. Core Macro Suggestions & Alternatives
        if p_diff < -5:
            diet_pref = (
                str(request.user_profile.dietary_preference).upper()
                if request.user_profile
                else ""
            )
            if diet_pref == "VEGETARIAN":
                actionable_suggestions.append(
                    "Include a bowl of thick Dal, Paneer, or roasted Soybeans (Bhatmas) to meet your protein goal."
                )
                alternative_foods.append(
                    FoodAlternative(
                        recommended_food="Paneer / Soybeans / Lentils",
                        replaces="Extra Rice/Roti",
                        reason="Significantly boosts protein intake without adding excessive empty calories.",
                    )
                )
            elif diet_pref == "EGGITARIAN":
                actionable_suggestions.append(
                    "Include 2 whole boiled eggs or Egg Curry alongside your Dal Bhat to bridge the protein target."
                )
                alternative_foods.append(
                    FoodAlternative(
                        recommended_food="Boiled Eggs / Egg Curry",
                        replaces="Refined grain side",
                        reason="Provides complete protein essential for muscle maintenance.",
                    )
                )
            else:
                actionable_suggestions.append(
                    "Add a serving of lean Chicken breast, Fish, or Eggs to substantially increase protein intake."
                )
                alternative_foods.append(
                    FoodAlternative(
                        recommended_food="Chicken / Fish / Eggs",
                        replaces="High-carb side dishes",
                        reason="Provides high-quality protein necessary for your fitness goals.",
                    )
                )

        if cal_diff > 150:
            actionable_suggestions.append(
                "Your caloric intake is high. Try reducing your rice/roti portion by 25% and replacing it with green vegetables."
            )
            alternative_foods.append(
                FoodAlternative(
                    recommended_food="Green Vegetables (Saag) / Salad",
                    replaces="Portion of Cooked Rice",
                    reason="Lowers overall caloric density while keeping you full with dietary fiber.",
                )
            )

        if overall_verdict == "OPTIMAL":
            actionable_suggestions.append(
                "Maintain your balanced portioning across upcoming meals to stay consistent with your goal."
            )

        # Baseline summary
        if overall_verdict == "RESTRICTED":
            summary = "Meal contains items conflicting with your dietary/health restrictions."
        elif overall_verdict == "OPTIMAL":
            summary = "Excellent nutritional balance well-aligned with your caloric and fitness targets."
        elif overall_verdict == "ALIGNED":
            summary = "Good meal composition supporting your daily nutritional requirements."
        elif overall_verdict == "MODERATELY_ALIGNED":
            summary = "Moderate nutritional alignment with slight adjustments needed for protein and carb distribution."
        else:
            summary = "Nutrient distribution has deficits or excesses requiring attention."

        return {
            "overall_verdict": overall_verdict,
            "summary": summary,
            "macro_assessment": macro_assessment,
            "health_and_dietary_alerts": alerts,
            "actionable_suggestions": actionable_suggestions,
            "alternative_foods": alternative_foods,
        }

    # -------------------------------------------------------------------------
    # Tier 2: LLM Text Formatting (Ollama / Qwen)
    # -------------------------------------------------------------------------

    def _build_formatting_prompt(self, assessment: Dict[str, Any], req: RecommendationRequest) -> str:
        """
        Construct a strict formatting-only prompt that injects pre-calculated numbers and verdicts.
        """
        verdict = assessment["overall_verdict"]
        macros = assessment["macro_assessment"]
        alerts = [a.message for a in assessment["health_and_dietary_alerts"]]
        suggestions = assessment["actionable_suggestions"]

        prompt = (
            f"You are a nutritional advisor formatter. Below is the EXACT pre-calculated scientific evaluation of a Nepali meal.\n"
            f"YOUR TASK: Format these exact metrics into concise, encouraging, and natural language. DO NOT alter, recalculate, or contradict the verdict or numbers.\n\n"
            f"Pre-calculated Metrics:\n"
            f"- Overall Verdict: {verdict}\n"
            f"- Calorie Assessment: {macros.calories_evaluation}\n"
            f"- Protein Assessment: {macros.protein_evaluation}\n"
            f"- Carbs Assessment: {macros.carbs_evaluation}\n"
            f"- Fats Assessment: {macros.fats_evaluation}\n"
            f"- Health/Social/Micronutrient Alerts: {json.dumps(alerts)}\n"
            f"- Baseline Suggestions: {json.dumps(suggestions)}\n\n"
            f"Respond ONLY with valid JSON with keys:\n"
            f'{{"summary": "1-2 concise, clear sentences summarizing the verdict and nutrient balance", '
            f'"actionable_suggestions": ["Concise suggestion 1", "Concise suggestion 2"]}}'
        )
        return prompt

    def _clean_json_string(self, raw_text: str) -> str:
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        start_idx = text.find("{")
        if start_idx == -1:
            return text

        sub = text[start_idx:]
        try:
            json.loads(sub)
            return sub
        except Exception:
            pass

        repaired = sub
        quotes_count = repaired.count('"') - repaired.count('\\"')
        if quotes_count % 2 != 0:
            repaired += '"'

        open_square = repaired.count("[") - repaired.count("]")
        open_curly = repaired.count("{") - repaired.count("}")

        for _ in range(max(0, open_square)):
            repaired += "]"
        for _ in range(max(0, open_curly)):
            repaired += "}"

        try:
            json.loads(repaired)
            return repaired
        except Exception:
            pass

        end_idx = text.rfind("}")
        if end_idx != -1 and end_idx > start_idx:
            return text[start_idx : end_idx + 1]

        return text

    async def generate_recommendation(
        self, request: RecommendationRequest
    ) -> RecommendationResponse:
        """
        Orchestrate Two-Tier Recommendation Generation.
        1. Run Tier 1 Deterministic Scientific Assessment.
        2. Attempt Tier 2 LLM formatting with Ollama / Qwen.
        3. Lock in exact deterministic verdicts & metrics, with safe fallback.
        """
        assessment = self._generate_deterministic_assessment(request)

        overall_verdict = assessment["overall_verdict"]
        macro_assessment = assessment["macro_assessment"]
        health_alerts = assessment["health_and_dietary_alerts"]
        actionable_suggestions = assessment["actionable_suggestions"]
        alternative_foods = assessment["alternative_foods"]
        summary = assessment["summary"]
        model_name = self.model_name

        prompt = self._build_formatting_prompt(assessment, request)
        ollama_url = f"{self.base_url.rstrip('/')}/api/generate"

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_predict": 300,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(ollama_url, json=payload)
                if response.status_code == 200:
                    ollama_response = response.json()
                    raw_text = ollama_response.get("response", "")
                    cleaned_json = self._clean_json_string(raw_text)
                    parsed = json.loads(cleaned_json)

                    if parsed.get("summary"):
                        summary = str(parsed["summary"]).strip()
                    if (
                        isinstance(parsed.get("actionable_suggestions"), list)
                        and len(parsed["actionable_suggestions"]) > 0
                    ):
                        actionable_suggestions = [
                            str(s).strip() for s in parsed["actionable_suggestions"] if str(s).strip()
                        ]
        except Exception as exc:
            logger.info(f"Ollama text formatting skipped or unavailable ({exc}). Using deterministic output.")
            model_name = f"{self.model_name} (deterministic fallback)"

        recommendation_detail = RecommendationDetail(
            meal_id=request.meal_id,
            overall_verdict=overall_verdict,
            summary=summary,
            macro_assessment=macro_assessment,
            health_and_dietary_alerts=health_alerts,
            actionable_suggestions=actionable_suggestions,
            alternative_foods=alternative_foods,
            model_name=model_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

        return RecommendationResponse(
            success=True,
            recommendation=recommendation_detail,
        )

