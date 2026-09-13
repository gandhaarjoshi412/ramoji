import io
import hashlib
from typing import List, Optional
from PIL import Image

from ai.model_interface import FoodVisionModel, VisionAnalysisResult, Detection

class MockFoodVisionModel(FoodVisionModel):
    """
    Mock AI inference engine for development and client demonstrations.
    Produces deterministic, realistic banquet food detections, bounding boxes,
    and polygon segmentation masks without requiring GPU or trained weights.
    """
    def __init__(self, model_version: str = "mock-v1.0"):
        self.model_name = "YOLO26-seg (Demo Engine)"
        self.model_version = model_version

    def analyze(
        self,
        image_bytes: bytes,
        filename: str,
        menu_hints: Optional[List[str]] = None
    ) -> VisionAnalysisResult:
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                width, height = img.size
        except Exception:
            width, height = 1920, 1080

        # Choose candidate food based on event menu hints or filename
        default_candidates = [
            "Biryani",
            "Paneer Butter Masala",
            "Dal Tadka",
            "Steamed Basmati Rice",
            "Gulab Jamun",
            "Butter Naan"
        ]
        
        candidates = menu_hints if menu_hints and len(menu_hints) > 0 else default_candidates

        # Generate deterministic selection from image hash
        hasher = hashlib.md5(image_bytes[:2048] if len(image_bytes) >= 2048 else image_bytes)
        digest = int(hasher.hexdigest(), 16)
        
        selected_food = candidates[digest % len(candidates)]
        
        # Realistic confidence between 0.88 and 0.98
        conf_seed = (digest % 100) / 1000.0  # 0.00 to 0.099
        confidence = round(0.89 + conf_seed, 2)

        # Realistic bounding box around central plate/vessel area (normalized coordinates)
        # e.g. [x1, y1, x2, y2]
        pad_x = round(width * 0.15, 1)
        pad_y = round(height * 0.20, 1)
        x1 = pad_x
        y1 = pad_y
        x2 = round(width - pad_x, 1)
        y2 = round(height - pad_y, 1)

        # Generate a realistic polygon segmentation mask (oval around pan)
        center_x = width / 2.0
        center_y = height / 2.0
        rx = (x2 - x1) / 2.0
        ry = (y2 - y1) / 2.0
        
        # 12-point polygon approximating buffet serving vessel
        mask_points = []
        import math
        for step in range(12):
            angle = (step / 12.0) * 2.0 * math.pi
            px = round(center_x + rx * math.cos(angle), 1)
            py = round(center_y + ry * math.sin(angle), 1)
            mask_points.append([px, py])

        detection = Detection(
            food_name=selected_food,
            confidence=confidence,
            bounding_box=[x1, y1, x2, y2],
            mask=mask_points
        )

        return VisionAnalysisResult(
            detections=[detection],
            image_width=width,
            image_height=height,
            model_name="YOLO26-seg",
            model_version=self.model_version,
            is_mock=True
        )
