#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path
import numpy as np
from ultralytics import YOLO

def find_default_source() -> str:
    candidates = [
        "datasets/merged_indian_food/test/images/ifn_biryani-recipe-1_jpg.rf.4f792af01213b48aa6034dc482613320.jpg",
        "datasets/merged_indian_food/test/images/if2_besan_chille101_jpg.rf.5b0112ff9acb51f531e28d95dd1624f0.jpg",
        "backend/uploads/biryani_waste_scan.jpg",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # Look for any jpg in datasets or uploads
    for p in Path("datasets").rglob("*.jpg"):
        return str(p)
    for p in Path("backend/uploads").rglob("*.jpg"):
        return str(p)
    return "datasets/merged_indian_food/test/images"

def find_default_weights() -> str:
    candidates = [
        "best.pt",
        "ai/weights/yolo11m-seg.pt",
        "/home/gandhaar/kaggle/foodwaste_yolo11m_merged15k/weights/best.pt",
        "ai/weights/yolo26-seg.pt",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "best.pt"

def calculate_polygon_area(poly: np.ndarray) -> float:
    """Calculates polygon area using Shoelace formula."""
    if len(poly) < 3:
        return 0.0
    x = poly[:, 0]
    y = poly[:, 1]
    return float(0.5 * np.abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))))

def main():
    default_src = find_default_source()
    default_w = find_default_weights()

    parser = argparse.ArgumentParser(description="Standalone YOLO Food Waste Model Tester (Supports Segmentation & Detection)")
    parser.add_argument(
        "--source", 
        type=str, 
        default=default_src,
        help="Path to image, directory of images, video, or '0' for live webcam"
    )
    parser.add_argument(
        "--weights", 
        type=str, 
        default=default_w,
        help="Path to trained YOLO weights file (default: best.pt)"
    )
    parser.add_argument(
        "--conf", 
        type=float, 
        default=0.35,
        help="Confidence threshold (0.0 to 1.0)"
    )
    parser.add_argument(
        "--save", 
        action="store_true", 
        default=True,
        help="Save annotated image with segmentation masks and bounding boxes"
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.weights):
        print(f"❌ Error: Weights file '{args.weights}' not found!")
        sys.exit(1)
        
    print("=" * 65)
    print("🍛 STANDALONE YOLO FOOD WASTE MODEL TESTER")
    print("=" * 65)
    print(f"Loading weights: {args.weights}")
    model = YOLO(args.weights)
    task = getattr(model, "task", "unknown")
    print(f"Model Architecture: {getattr(model, 'model_name', 'YOLO11m')} | Task: {task.upper()}")
    print(f"Class count: {len(model.names)}")
    
    print(f"Running inference on: {args.source}")
    print(f"Confidence threshold: {args.conf * 100:.0f}%")
    print("-" * 65)
    
    is_seg = (task == "segment")
    project_dir = "runs/segment" if is_seg else "runs/detect"
    
    results = model.predict(
        source=args.source,
        conf=args.conf,
        save=args.save,
        retina_masks=is_seg,
        project=project_dir,
        name="test_results",
        exist_ok=True
    )
    
    print(f"\n📊 {'SEGMENTATION' if is_seg else 'DETECTION'} RESULTS:")
    print("-" * 65)
    total_detections = 0
    for idx, r in enumerate(results):
        img_name = Path(r.path).name if hasattr(r, 'path') else f"Image {idx+1}"
        print(f"\n📸 Image: {img_name}")
        boxes = r.boxes
        masks = getattr(r, "masks", None)
        if len(boxes) == 0:
            print("   ⚠️ No food items detected above confidence threshold.")
            continue
            
        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            class_name = r.names[cls_id]
            conf = float(box.conf[0].item()) * 100
            x1, y1, x2, y2 = [round(x, 1) for x in box.xyxy[0].tolist()]
            w = round(x2 - x1, 1)
            h = round(y2 - y1, 1)
            box_area = max(1.0, w * h)
            
            mask_info = "None"
            if masks is not None and hasattr(masks, "xy") and len(masks.xy) > i:
                poly = masks.xy[i]
                if len(poly) >= 3:
                    seg_area = calculate_polygon_area(poly)
                    ratio = (seg_area / box_area) * 100
                    mask_info = f"{len(poly)} pts, Area: {seg_area:.0f}px² ({ratio:.1f}% of box)"
            
            print(f"   [{i+1}] {class_name:<20} | Conf: {conf:5.1f}% | Box: [{x1}, {y1}, {x2}, {y2}]")
            if is_seg or mask_info != "None":
                print(f"       ↳ Segmentation Mask: {mask_info}")
            total_detections += 1
            
    print("-" * 65)
    print(f"Total objects detected: {total_detections}")
    if args.save:
        save_dir = Path(project_dir) / "test_results"
        print(f"📁 Annotated visual results saved to: {save_dir.resolve()}")
    print("=" * 65)

if __name__ == "__main__":
    main()
