# Model Registry — PlateSight (Ramoji) Food Waste AI

This directory contains the trained production models, evaluation metrics, and base architectures for the **AI Banquet Food Waste & Cost Analytics Platform** (Dolphin Hotels / Ramoji Film City).

---

## 1. Trained Production Models (`models/trained/`)

| Model Filename | Architecture | Task | Classes | Size | Description & Origin |
|---|---|---|---|---|---|
| **`foodwaste_yolo11m_seg_58cls.pt`**<br>*(alias: `platesight_yolo11m_seg_dishes58.pt`)* | YOLO11m-seg | **Instance Segmentation** | **58** | 44M | **58-Class Fine-Tuned Model.** Specifically trained for Dolphin Hotels / Ramoji banquet operations, covering Hyderabadi specialties, thalis, curries, breads, desserts, and sides. |
| **`foodwaste_yolo11m_seg_58cls.onnx`** | YOLO11m-seg ONNX | Instance Segmentation | 58 | 86M | Optimized ONNX export for high-speed edge/CPU/GPU inference pipelines. |
| **`foodwaste_yolo11m_seg_58cls_last.pt`** | YOLO11m-seg | Instance Segmentation | 58 | 44M | Final training epoch checkpoint from the 58-class fine-tuning run. |
| **`foodwaste_yolo11m_seg_31cls.pt`** | YOLO11m-seg | **Instance Segmentation** | **31** | 44M | **31-Class Core Model.** Trained on the unified ~15,000 image dataset (IndianFoodNet + Indian_food-2 + leftover waste). |
| **`foodwaste_yolo11m_seg_31cls_last.pt`** | YOLO11m-seg | Instance Segmentation | 31 | 44M | Final epoch checkpoint from the 15k segmentation run. |
| **`indianfood_yolo11m_det_31cls.pt`** | YOLO11m | **Object Detection** | 31 | 39M | **Secondary Ensemble Model.** Trained on Indian banquet dishes for bounding box classification and ensemble verification. |

### Backward Compatibility Note:
The root symlink `best.pt` points to `models/trained/foodwaste_yolo11m_seg_31cls.pt`.

---

## 2. Model Evaluation Packages

* **`models/platesight_yolo11m_dishes58/`**: Contains the complete training evaluation charts, dataset configuration, confusion matrix, and `metrics_summary.json` for the 58-class fine-tuned model.
* **`foodwaste_yolo11m_merged15k/`**: Contains the performance curves, confusion matrix, and `metrics_summary.json` for the 31-class merged model.

---

## 3. Pretrained Base Weights (`models/pretrained_base/`)

Base weights from Ultralytics used for transfer learning, fine-tuning, and benchmarking:

* **`yolo11m.pt`** (38.8 MB) — Ultralytics base medium model.
* **`yolo11n.pt`** (5.4 MB) — Ultralytics base nano model.
* **`yolo26n.pt`** (5.3 MB) — Ultralytics base nano compact model.

---

## 4. Usage in Code

### In Python (Ultralytics):
```python
from ultralytics import YOLO

# Load 58-class fine-tuned segmentation model
model = YOLO("models/trained/foodwaste_yolo11m_seg_58cls.pt")
results = model.predict("uploads/sample.jpg", conf=0.25)

for r in results:
    boxes = r.boxes
    masks = r.masks  # Polygon segmentation contours
```

### In FastAPI Service:
Managed automatically via `ai.yolo_model.YoloFoodVisionModel`.
Configured in `.env`:
```ini
AI_MODE=yolo
AI_MODEL_PATH=models/trained/foodwaste_yolo11m_seg_58cls.pt  # or foodwaste_yolo11m_seg_31cls.pt
AI_DET_MODEL_PATH=models/trained/indianfood_yolo11m_det_31cls.pt
```
