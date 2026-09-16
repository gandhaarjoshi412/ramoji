import os
import io
from typing import List, Optional
from PIL import Image

from ai.model_interface import FoodVisionModel, VisionAnalysisResult, Detection

class YoloFoodVisionModel(FoodVisionModel):
    """
    Production implementation for YOLO model.
    Loads model weights from AI_MODEL_PATH and extracts bounding boxes, classes,
    confidences, polygon segmentation masks, and annotated bounding-box visual image.
    """
    def __init__(self, model_path: str = "ai/weights/yolo26-seg.pt"):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _find_weights(self) -> str:
        candidates = [
            self.model_path,
            os.path.join(os.getcwd(), self.model_path),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), self.model_path),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "best.pt"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "ai/weights/yolo26-seg.pt"),
            os.path.join(os.getcwd(), "best.pt"),
            os.path.join(os.getcwd(), "ai/weights/yolo26-seg.pt"),
            "/home/gandhaar/project/ramoji/best.pt",
            "/home/gandhaar/project/ramoji/ai/weights/yolo26-seg.pt",
        ]
        for c in candidates:
            if c and os.path.exists(c):
                return os.path.abspath(c)
        return self.model_path

    def _load_model(self):
        resolved_path = self._find_weights()
        if not os.path.exists(resolved_path):
            raise FileNotFoundError(
                f"YOLO model weights not found at '{self.model_path}' (checked candidate: {resolved_path}). "
                f"Please ensure best.pt or ai/weights/yolo26-seg.pt exists."
            )
        try:
            from ultralytics import YOLO
            self.model = YOLO(resolved_path)
            self.model_path = resolved_path
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

        annotated_bytes: Optional[bytes] = None
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

        # Generate annotated image with bounding boxes, dish name, and confidence
        if len(results) > 0:
            try:
                import cv2
                annotated_bgr = results[0].plot()
                success, encoded_img = cv2.imencode('.jpg', annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                if success:
                    annotated_bytes = encoded_img.tobytes()
            except Exception:
                try:
                    annotated_bgr = results[0].plot()
                    annotated_rgb = annotated_bgr[:, :, ::-1]
                    annotated_pil = Image.fromarray(annotated_rgb)
                    buf = io.BytesIO()
                    annotated_pil.save(buf, format="JPEG", quality=92)
                    annotated_bytes = buf.getvalue()
                except Exception:
                    pass

        return VisionAnalysisResult(
            detections=detections,
            image_width=width,
            image_height=height,
            model_name="YOLO26-seg",
            model_version="food-model-v0.1",
            is_mock=False,
            annotated_image_bytes=annotated_bytes
        )
