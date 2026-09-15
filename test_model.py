#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Standalone YOLO Food Waste Model Tester")
    parser.add_argument(
        "--source", 
        type=str, 
        default="datasets/merged_indian_food/test/images/ifn_biryani-recipe-1_jpg.rf.4f792af01213b48aa6034dc482613320.jpg",
        help="Path to image, directory of images, video, or '0' for live webcam"
    )
    parser.add_argument(
        "--weights", 
        type=str, 
        default="ai/weights/yolo26-seg.pt",
        help="Path to trained YOLO weights file"
    )
    parser.add_argument(
        "--conf", 
        type=float, 
        default=0.40,
        help="Confidence threshold (0.0 to 1.0)"
    )
    parser.add_argument(
        "--save", 
        action="store_true", 
        default=True,
        help="Save annotated image with bounding boxes"
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.weights):
        print(f"❌ Error: Weights file '{args.weights}' not found!")
        sys.exit(1)
        
    print("=" * 60)
    print("🍛 STANDALONE YOLO FOOD WASTE MODEL TESTER")
    print("=" * 60)
    print(f"Loading weights: {args.weights}")
    model = YOLO(args.weights)
    
    print(f"Running inference on: {args.source}")
    print(f"Confidence threshold: {args.conf * 100:.0f}%")
    print("-" * 60)
    
    results = model.predict(
        source=args.source,
        conf=args.conf,
        save=args.save,
        project="runs/detect",
        name="test_results",
        exist_ok=True
    )
    
    print("\n📊 DETECTION RESULTS:")
    print("-" * 60)
    total_detections = 0
    for idx, r in enumerate(results):
        img_name = Path(r.path).name if hasattr(r, 'path') else f"Image {idx+1}"
        print(f"\n📸 Image: {img_name}")
        boxes = r.boxes
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
            print(f"   [{i+1}] {class_name:<20} | Confidence: {conf:5.1f}% | Box: [{x1}, {y1}, {x2}, {y2}] (w={w}, h={h})")
            total_detections += 1
            
    print("-" * 60)
    print(f"Total objects detected: {total_detections}")
    if args.save:
        save_dir = Path("runs/detect/test_results")
        print(f"📁 Annotated visual results saved to: {save_dir.resolve()}")
    print("=" * 60)

if __name__ == "__main__":
    main()
