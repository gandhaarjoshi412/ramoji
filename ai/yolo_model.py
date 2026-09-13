import os
import io
from typing import List, Optional
from PIL import Image

from ai.model_interface import FoodVisionModel, VisionAnalysisResult, Detection

class YoloFoodVisionModel(FoodVisionModel):
    """
    Production implementation for YOLO26-seg (or Ultralytics segmentation models).
    Loads model weights from AI_MODEL_PATH and extracts bounding boxes, classes,
    confidences, and polygon segmentation masks.
    """
    def __init__(self, model_path: str = "ai/weights/yolo26-seg.pt"):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"YOLO model weights not found at '{self.model_path}'. "
                f"Please ensure the trained custom YOLO26-seg weights file exists, "
                f"or set AI_MODE=mock for development demonstration."
            )
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
        except ImportError:
            raise ImportError(
                "The 'ultralytics' library is required to run real YOLO inference. "
                "Install it via: pip install ultralytics"
            )

    def analyze(
        self,
        image_bytes: bytes,
        filename: str,
        menu_hints: Optional[List[str]] = None
    ) -> VisionAnalysisResult:
        if self.model is None:
            self._load_model()

        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size

        # Run inference
        results = self.model(img)
        detections: List[Detection] = []

        for r in results:
            boxes = r.boxes
            masks = r.masks
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                class_name = r.names[cls_id] if hasattr(r, "names") else f"Class_{cls_id}"
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()

                mask_data = None
                if masks is not None and len(masks.xy) > i:
                    mask_data = masks.xy[i].tolist()

                detections.append(
                    Detection(
                        food_name=class_name,
                        confidence=round(conf, 4),
                        bounding_box=[round(x, 1) for x in xyxy],
                        mask=mask_data
                    )
                )

        return VisionAnalysisResult(
            detections=detections,
            image_width=width,
            image_height=height,
            model_name="YOLO26-seg",
            model_version="food-model-v0.1",
            is_mock=False
        )
