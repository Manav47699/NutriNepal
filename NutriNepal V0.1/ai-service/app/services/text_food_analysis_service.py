import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from rapidfuzz import fuzz

from app.services.food_matching_service import FoodMatchingService

logger = logging.getLogger(__name__)

WORD_TO_NUMBER = {
    "one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0, "five": 5.0,
    "six": 6.0, "seven": 7.0, "eight": 8.0, "nine": 9.0, "ten": 10.0,
    "half": 0.5, "quarter": 0.25, "a": 1.0, "an": 1.0,
    "ek": 1.0, "dui": 2.0, "tin": 3.0, "teen": 3.0, "char": 4.0, "panch": 5.0,
    "adha": 0.5, "aadha": 0.5,
}

VAGUE_MODIFIERS = {
    "little": 0.5, "thorei": 0.5, "thore": 0.5, "ali": 0.5, "alikati": 0.5, "small": 0.5, "sano": 0.5,
    "large": 1.5, "big": 1.5, "double": 2.0, "dherai": 1.5, "thulo": 1.5,
    "medium": 1.0, "some": 1.0, "few": 1.0,
}


class TextFoodAnalysisService:
    """
    Service for text-based food analysis.
    Identifies food items from natural language user text, extracts consumption quantities,
    retrieves canonical food data from FoodMatchingService, and calculates aggregated nutritional totals.
    """

    def __init__(
        self,
        food_matching_service: Optional[FoodMatchingService] = None,
        default_plate_gram: float = 150.0,
    ):
        self.matching_service = (
            food_matching_service
            if food_matching_service is not None
            else FoodMatchingService()
        )
        self.default_plate_gram = default_plate_gram

        # Preload food dictionary and alias index from FoodMatchingService
        self.foods_data = self.matching_service.get_all_foods()

        self.alias_to_id: Dict[str, str] = {}
        self.all_aliases: List[str] = []

        for food_id, food_record in self.foods_data.items():
            other_names = food_record.get("other_names", [])
            for alias in other_names:
                norm_alias = str(alias).lower().strip()
                if norm_alias:
                    self.alias_to_id[norm_alias] = food_id
                    self.all_aliases.append(norm_alias)

        # Sort aliases by length descending so longer compound phrases match first
        self.all_aliases.sort(key=len, reverse=True)

    def _find_alias_location(self, sentence: str, alias: str) -> Tuple[int, int]:
        """Find the start and end character index of an alias (exact or fuzzy) in the sentence."""
        exact_match = re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", sentence)
        if exact_match:
            return exact_match.start(), exact_match.end()

        idx = sentence.find(alias)
        if idx != -1:
            return idx, idx + len(alias)

        alias_words = alias.split()
        sent_words = sentence.split()
        n = len(alias_words)

        for i in range(len(sent_words) - n + 1):
            ngram = " ".join(sent_words[i : i + n])
            if n == 1 and abs(len(ngram) - len(alias)) <= 1 and fuzz.ratio(ngram, alias) >= 90:
                match = re.search(r"(?<!\w)" + re.escape(ngram) + r"(?!\w)", sentence)
                if match:
                    return match.start(), match.end()
            elif n > 1 and fuzz.ratio(ngram, alias) >= 88:
                match = re.search(r"(?<!\w)" + re.escape(ngram) + r"(?!\w)", sentence)
                if match:
                    return match.start(), match.end()

        return -1, -1

    def _extract_quantity_for_alias(
        self,
        sentence: str,
        start_idx: int,
        end_idx: int,
        standard_portion: Optional[Dict[str, Any]] = None,
        default_plate_gram: Optional[float] = None,
    ) -> Tuple[float, str, float, bool]:
        """
        Extract numerical quantity, unit, portion multiplier, and whether explicit weight was given.
        Supports grams, kilograms, milliliters, household portions, and food-specific standard portions.
        Returns: (quantity, unit, multiplier, is_explicit_weight)
        """
        sp = standard_portion or {}
        std_amount = float(sp.get("amount", default_plate_gram if default_plate_gram is not None else 100.0))
        std_unit = str(sp.get("unit", "g"))

        if start_idx == -1:
            prefix = ""
            postfix = ""
        else:
            prefix = sentence[:start_idx]
            postfix = sentence[end_idx:]

        # Extract preceding clause/segment
        prefix_parts = re.split(r"[,;]|\b(?:ra|ani|and|with|plus|\+)\b", prefix)
        lookback = prefix_parts[-1].strip()

        # Extract following clause/segment
        postfix_parts = re.split(r"[,;]|\b(?:ra|ani|and|with|plus|\+)\b", postfix)
        lookahead = postfix_parts[0].strip()

        candidates = [lookback]
        if lookahead:
            candidates.append(lookahead)

        for text_segment in candidates:
            if not text_segment:
                continue

            # 1. Exact weight (kg, g, gm, mg)
            kg_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)\b", text_segment)
            if kg_match:
                return float(kg_match.group(1)) * 1000.0, "g", 1.0, True

            gram_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:gram|grams|gm|gms|g)\b", text_segment)
            if gram_match:
                return float(gram_match.group(1)), "g", 1.0, True

            mg_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:mg|milligram|milligrams)\b", text_segment)
            if mg_match:
                return float(mg_match.group(1)) / 1000.0, "g", 1.0, True

            # 2. Exact volume (l, ml)
            liter_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litre|litres)\b", text_segment)
            if liter_match:
                return float(liter_match.group(1)) * 1000.0, "ml", 1.0, True

            ml_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\b", text_segment)
            if ml_match:
                return float(ml_match.group(1)), "ml", 1.0, True

            # 3. Numeric multiplier or word number
            multiplier = None
            num_match = re.search(r"(\d+(?:\.\d+)?)\b", text_segment)
            if num_match:
                multiplier = float(num_match.group(1))
            else:
                for w in text_segment.split():
                    if w in WORD_TO_NUMBER:
                        multiplier = WORD_TO_NUMBER[w]
                        break

            # 4. Modifiers (e.g. little, half, medium)
            for w in text_segment.split():
                if w in VAGUE_MODIFIERS:
                    mod = VAGUE_MODIFIERS[w]
                    if multiplier is not None:
                        multiplier *= mod
                    else:
                        multiplier = mod
                    break

            if multiplier is not None:
                return round(multiplier * std_amount, 2), std_unit, multiplier, False

        # Fallback: single standard portion of this food item
        return std_amount, std_unit, 1.0, False

    def analyze(
        self,
        text: str,
        default_plate_gram: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a natural language food consumption sentence.

        Args:
            text: User input sentence describing foods eaten.
            default_plate_gram: Optional fallback gram weight per portion (default: 150.0g).

        Returns:
            Structured dictionary containing list of itemized foods with individual macros
            and total aggregated meal nutrition.
        """
        effective_default_gram = (
            default_plate_gram if default_plate_gram is not None else self.default_plate_gram
        )

        if not text or not str(text).strip():
            return {
                "foods": [],
                "total": {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0},
            }

        sentence_clean = str(text).lower().strip()
        matched_foods: Dict[str, Dict[str, Any]] = {}

        # 1. Exact & Fuzzy matching across sentence substrings using alias index
        for alias in self.all_aliases:
            food_id = self.alias_to_id[alias]

            if food_id in matched_foods:
                continue

            start_idx, end_idx = self._find_alias_location(sentence_clean, alias)
            if start_idx != -1:
                food_obj = self.foods_data.get(food_id) or self.matching_service.get_food_by_id(food_id)
                sp = food_obj.get("standard_portion", {}) if food_obj else {}
                qty, unit, multiplier, is_explicit = self._extract_quantity_for_alias(
                    sentence_clean, start_idx, end_idx, standard_portion=sp, default_plate_gram=effective_default_gram
                )
                matched_foods[food_id] = {
                    "matched_alias": alias,
                    "quantity": qty,
                    "unit": unit,
                    "multiplier": multiplier,
                    "is_explicit_weight": is_explicit,
                }

        # 2. Fallback to ChromaDB vector search if no alias matched
        if not matched_foods:
            matches = self.matching_service.search_food(sentence_clean, k=1)
            if matches and matches[0]["score"] < 25.0:
                top_match = matches[0]
                sp = top_match.get("standard_portion", {})
                std_amount = float(sp.get("amount", effective_default_gram if effective_default_gram is not None else 100.0))
                std_unit = str(sp.get("unit", "g"))
                matched_foods[top_match["id"]] = {
                    "matched_alias": top_match["name"],
                    "quantity": std_amount,
                    "unit": std_unit,
                    "multiplier": 1.0,
                    "is_explicit_weight": False,
                }

        # 3. Compute itemized and aggregated nutrition
        itemized_results: List[Dict[str, Any]] = []
        total_nutrition = {
            "calories": 0.0,
            "protein": 0.0,
            "carbs": 0.0,
            "fat": 0.0,
        }

        for food_id, match_info in matched_foods.items():
            # Retrieve canonical food record from preloaded cache or service lookup
            food_obj = self.foods_data.get(food_id) or self.matching_service.get_food_by_id(food_id)
            if not food_obj:
                continue

            qty = match_info["quantity"]
            unit = match_info["unit"]
            multiplier = match_info.get("multiplier", 1.0)
            is_explicit = match_info.get("is_explicit_weight", False)

            n_gram = food_obj.get("nutrition_per_gram", {})
            n_sp = food_obj.get("nutrition_per_standard_portion", {})

            if is_explicit or not n_sp:
                # Direct calculation from nutrition_per_gram
                item_cal = round(n_gram.get("calories", 0.0) * qty, 2)
                item_prot = round(n_gram.get("protein_g", n_gram.get("protein", 0.0)) * qty, 2)
                item_carbs = round(n_gram.get("carbs_g", n_gram.get("carbs", 0.0)) * qty, 2)
                item_fat = round(n_gram.get("fat_g", n_gram.get("fat", 0.0)) * qty, 2)
            else:
                # Calculation from nutrition_per_standard_portion scaled by multiplier
                item_cal = round(n_sp.get("calories", 0.0) * multiplier, 2)
                item_prot = round(n_sp.get("protein_g", n_sp.get("protein", 0.0)) * multiplier, 2)
                item_carbs = round(n_sp.get("carbs_g", n_sp.get("carbs", 0.0)) * multiplier, 2)
                item_fat = round(n_sp.get("fat_g", n_sp.get("fat", 0.0)) * multiplier, 2)

            total_nutrition["calories"] += item_cal
            total_nutrition["protein"] += item_prot
            total_nutrition["carbs"] += item_carbs
            total_nutrition["fat"] += item_fat

            itemized_results.append(
                {
                    "food_id": food_id,
                    "name": food_obj.get("name", food_id),
                    "matched_alias": match_info["matched_alias"],
                    "quantity": qty,
                    "unit": unit,
                    "calories": item_cal,
                    "protein": item_prot,
                    "carbs": item_carbs,
                    "fat": item_fat,
                    "veg_or_nonveg": food_obj.get("veg_or_nonveg", ""),
                    "fitness_direction": food_obj.get("fitness_direction", ""),
                    "health_restrictions": food_obj.get("health_restrictions", {}),
                    "social_restrictions": food_obj.get("social_restrictions", {}),
                }
            )

        return {
            "foods": itemized_results,
            "total": {
                "calories": round(total_nutrition["calories"], 2),
                "protein": round(total_nutrition["protein"], 2),
                "carbs": round(total_nutrition["carbs"], 2),
                "fat": round(total_nutrition["fat"], 2),
            },
        }

