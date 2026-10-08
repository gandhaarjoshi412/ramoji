import os
import io
import math
from typing import List, Optional, Tuple, Dict, Any
from PIL import Image

from ai.model_interface import FoodVisionModel, VisionAnalysisResult, Detection
from ai.food_classes import normalize_label

def bbox_iou(b1: List[float], b2: List[float]) -> float:
    """Calculates Intersection-over-Union between two [x1, y1, x2, y2] bounding boxes."""
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[2], b2[2])
    y2 = min(b1[3], b2[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, b1[2] - b1[0]) * max(0.0, b1[3] - b1[1])
    area2 = max(0.0, b2[2] - b2[0]) * max(0.0, b2[3] - b2[1])
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0

class YoloFoodVisionModel(FoodVisionModel):
    """
    Dual-Model Ensemble Food Vision Engine.
    Fuses predictions from:
      1. Primary YOLO11m-seg model (high-resolution segmentation masks & catering buffet dishes)
      2. Secondary YOLO11m-det model (specialized Indian banquet & meal tray partitioned dishes)
    Outputs comprehensive bounding boxes, polygon masks, dish classifications, and visual HUD.
    """
    def __init__(self, model_path: str = "best.pt"):
        self.model_path = model_path
        self.model = None
        self.det_model = None
        self._load_model()

    def _find_weights(self) -> str:
        candidates = [
            self.model_path,
            os.path.join(os.getcwd(), self.model_path),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), self.model_path),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), self.model_path),
        ]
        for c in candidates:
            if c and os.path.exists(c):
                return os.path.abspath(c)
        raise FileNotFoundError(
            f"Specified YOLO model weights not found at '{self.model_path}'."
        )

    def _load_model(self):
        resolved_path = self._find_weights()
        try:
            from ultralytics import YOLO
            self.model = YOLO(resolved_path)
            self.model_path = resolved_path
            self.det_model = None
            print(f"Loaded YOLO model: {resolved_path}")
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

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = img.size

        # 1. Primary Segmentation Inference (conf=0.14 for high recall, imgsz=512, retina_masks=False for cloud efficiency)
        import torch
        with torch.inference_mode():
            results_seg = self.model(img, retina_masks=False, conf=0.14, imgsz=512, verbose=False)

        seg_dets: List[Dict[str, Any]] = []
        if len(results_seg) > 0:
            r0 = results_seg[0]
            boxes = r0.boxes
            masks = getattr(r0, "masks", None)
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                class_name = r0.names[cls_id] if hasattr(r0, "names") else f"Class_{cls_id}"
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()

                mask_data = None
                if masks is not None and hasattr(masks, "xy") and len(masks.xy) > i:
                    poly = masks.xy[i]
                    if len(poly) >= 3:
                        mask_data = [[round(float(p[0]), 1), round(float(p[1]), 1)] for p in poly]

                seg_dets.append({
                    "food_name": class_name,
                    "confidence": conf,
                    "bounding_box": [round(x, 1) for x in xyxy],
                    "mask": mask_data,
                    "source": "seg"
                })

        # 2. Secondary Detection Inference (covers partitioned meal trays, rice, and specialized curries)
        det_dets: List[Dict[str, Any]] = []
        if self.det_model is not None:
            try:
                results_det = self.det_model(img, conf=0.14, imgsz=1024, verbose=False)
                if len(results_det) > 0:
                    rd = results_det[0]
                    for box in rd.boxes:
                        cls_id = int(box.cls[0].item())
                        class_name = rd.names[cls_id] if hasattr(rd, "names") else f"Class_{cls_id}"
                        conf = float(box.conf[0].item())
                        xyxy = box.xyxy[0].tolist()
                        det_dets.append({
                            "food_name": class_name,
                            "confidence": conf,
                            "bounding_box": [round(x, 1) for x in xyxy],
                            "mask": None,
                            "source": "det"
                        })
            except Exception as det_inf_err:
                print(f"Warning: Secondary det inference failed: {det_inf_err}")

        # 3. Intelligent IoU Ensemble Fusion
        fused_candidates: List[Dict[str, Any]] = []
        matched_det_indices = set()

        for s in seg_dets:
            best_iou = 0.0
            best_d_idx = -1
            for d_idx, d in enumerate(det_dets):
                iou = bbox_iou(s["bounding_box"], d["bounding_box"])
                if iou > best_iou:
                    best_iou = iou
                    best_d_idx = d_idx

            if best_iou >= 0.35 and best_d_idx >= 0:
                matched_det_indices.add(best_d_idx)
                d = det_dets[best_d_idx]
                # If det model has higher confidence, adopt its class classification
                chosen_name = d["food_name"] if d["confidence"] > s["confidence"] else s["food_name"]
                chosen_conf = max(s["confidence"], d["confidence"])
                fused_candidates.append({
                    "food_name": chosen_name,
                    "confidence": chosen_conf,
                    "bounding_box": s["bounding_box"],
                    "mask": s["mask"],
                })
            else:
                fused_candidates.append(s)

        # Include unmatched det detections (e.g. rice or dishes missed by seg model)
        for d_idx, d in enumerate(det_dets):
            if d_idx not in matched_det_indices:
                max_iou = max([bbox_iou(d["bounding_box"], fc["bounding_box"]) for fc in fused_candidates], default=0.0)
                if max_iou < 0.35:
                    fused_candidates.append(d)

        # 4. Deduplication NMS across fused candidates
        fused_candidates = sorted(fused_candidates, key=lambda x: x["confidence"], reverse=True)
        final_fused: List[Dict[str, Any]] = []
        for cand in fused_candidates:
            if not any(bbox_iou(cand["bounding_box"], existing["bounding_box"]) > 0.50 for existing in final_fused):
                final_fused.append(cand)

        # 5. Build Final Detections
        final_detections: List[Detection] = [
            Detection(
                food_name=normalize_label(item["food_name"]),
                confidence=round(float(item["confidence"]), 4),
                bounding_box=item["bounding_box"],
                mask=item["mask"]
            )
            for item in final_fused
        ]

        # 6. Generate Annotated Visual Image with High-Contrast Multi-Dish HUD
        annotated_bytes: Optional[bytes] = None
        try:
            import cv2
            import numpy as np

            # Distinct vibrant color palette (BGR)
            PALETTE = [
                (52, 211, 153),   # Emerald green
                (245, 158, 11),   # Amber gold
                (59, 130, 246),   # Royal blue
                (236, 72, 153),   # Vibrant pink
                (139, 92, 246),   # Violet
                (20, 184, 166),   # Teal
                (249, 115, 22),   # Deep orange
            ]

            img_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            overlay = img_bgr.copy()

            # Step A: Draw semi-transparent segmentation polygon masks
            for idx, item in enumerate(final_detections):
                if item.mask and len(item.mask) >= 3:
                    color = PALETTE[idx % len(PALETTE)]
                    pts = np.array(item.mask, np.int32).reshape((-1, 1, 2))
                    cv2.fillPoly(overlay, [pts], color)

            cv2.addWeighted(overlay, 0.40, img_bgr, 0.60, 0, img_bgr)

            # Step B: Draw crisp polygon boundaries, bounding boxes, and label pills
            for idx, item in enumerate(final_detections):
                color = PALETTE[idx % len(PALETTE)]
                x1, y1, x2, y2 = map(int, item.bounding_box)

                # Boundary outline
                if item.mask and len(item.mask) >= 3:
                    pts = np.array(item.mask, np.int32).reshape((-1, 1, 2))
                    cv2.polylines(img_bgr, [pts], isClosed=True, color=color, thickness=2)

                # Bounding box
                cv2.rectangle(img_bgr, (x1, y1), (x2, y2), color, 3)

                # Smart Label Pill (Edge-aware & HUD-collision safe)
                label = f"{item.food_name} {round(item.confidence * 100)}%"
                font_scale = 0.65
                thickness = 2
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                pill_w = tw + 14
                pill_h = th + 12

                # Horizontal bounds check
                if x1 + pill_w > width - 4:
                    px1 = max(4, width - pill_w - 4)
                    px2 = width - 4
                else:
                    px1 = max(4, x1)
                    px2 = px1 + pill_w

                # Vertical bounds & top-left HUD occlusion check
                near_top = y1 < (th + 20)
                in_top_left_hud_zone = (px1 < 450 and y1 < 140)

                if in_top_left_hud_zone:
                    # Clear below the top-left floating card
                    py1 = max(y1 + 35, 140)
                    py2 = min(height - 4, py1 + pill_h)
                    text_y = py1 + th + 4
                elif near_top:
                    # Near top edge of canvas: draw inside box to prevent clipping
                    py1 = y1 + 4
                    py2 = min(height - 4, py1 + pill_h)
                    text_y = py1 + th + 4
                else:
                    # Standard: draw directly above box
                    py1 = max(4, y1 - pill_h)
                    py2 = y1
                    text_y = py2 - 6

                text_x = px1 + 7

                # Draw label pill with adaptive luminance text contrast
                cv2.rectangle(img_bgr, (px1, py1), (px2, py2), color, -1)
                lum = 0.114 * color[0] + 0.587 * color[1] + 0.299 * color[2]
                text_color = (0, 0, 0) if lum > 135 else (255, 255, 255)
                cv2.putText(img_bgr, label, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, thickness)

            success, encoded_img = cv2.imencode('.jpg', img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            if success:
                annotated_bytes = encoded_img.tobytes()
        except Exception as anno_err:
            print(f"Warning: Custom annotation rendering fallback triggered: {anno_err}")

        model_title = "YOLO11m-DualEnsemble" if self.det_model is not None else "YOLO11m-seg"
        return VisionAnalysisResult(
            detections=final_detections,
            image_width=width,
            image_height=height,
            model_name=model_title,
            model_version="foodwaste-ensemble-v2.0",
            is_mock=False,
            annotated_image_bytes=annotated_bytes
        )
