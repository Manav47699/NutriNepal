import cv2
import numpy as np

KNOWN_PLATE_DIAMETER_CM = 28.0 # assumed diameter of the plate in centimeters


FOOD_PROPERTIES = {
    "bhat": {
        "density": 0.75,
        "avg_height_cm": 3.5,
        "shape": "dome",
    },
    "dal": {
        "density": 1.05,
        "avg_height_cm": 4.0,
        "shape": "cylinder",
    },
    "sabji": {
        "density": 0.90,
        "avg_height_cm": 2.0,
        "shape": "flat",
    },
}


class QuantityService:
    """
        It gives the estimated weight of the food item based on the segmentation mask, food name, and image dimensions.
    """
    def estimate_weight(
        self,
        mask: np.ndarray,
        food_name: str,
        image_width: int,
        image_height: int,
    ) -> float:

        plate_pixel_diameter = (
            min(
                image_height,
                image_width,
            )
            * 0.85
        )

        cm_per_pixel = KNOWN_PLATE_DIAMETER_CM / plate_pixel_diameter

        sq_cm_per_pixel = cm_per_pixel**2

        mask_resized = (
            cv2.resize(
                mask,
                (image_width, image_height),
            )
            > 0.5
        )

        pixel_area = np.sum(mask_resized)

        area_sq_cm = pixel_area * sq_cm_per_pixel

        properties = FOOD_PROPERTIES.get(
            food_name,
            {
                "density": 0.85,
                "avg_height_cm": 2.0,
                "shape": "flat",
            },
        )

        if properties["shape"] == "dome":
            volume_cm3 = 0.6 * area_sq_cm * properties["avg_height_cm"]
        else:
            volume_cm3 = area_sq_cm * properties["avg_height_cm"]

        weight_grams = volume_cm3 * properties["density"]

        return float(weight_grams)
