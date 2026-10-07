from pathlib import Path
from ultralytics import YOLO
from PIL import Image

# Load the Fine-tuned YOLOv8 model
MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "yolo" / "best.pt"

class YOLOService:
    """
    image -> YOLO segmentation -> raw segmentation results.
    """

    def __init__(self):
        self.model = YOLO(str(MODEL_PATH))

    def analyze(self, image: Image.Image):
        results = self.model.predict(
            source=image,
            conf=0.25,
        )

        result = results[0]

        detections = []

        if result.masks is None:
            return detections

        masks = result.masks.data.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()

        for i, mask in enumerate(masks):
            class_id = int(classes[i])
            confidence = float(confidences[i])

            detections.append(
                {
                    "class_id": class_id,
                    "name": result.names[class_id],
                    "confidence": confidence,
                    "mask": mask,
                }   
            )

        return detections
