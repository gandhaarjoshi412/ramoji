import os
import shutil
from ultralytics import YOLO

def main():
    yaml_path = "/home/gandhaar/project/ramoji/datasets/merged_indian_food/data.yaml"
    
    print("Initializing YOLO11 baseline for Indian Food Waste Detection...")
    # Using yolo11n.pt for ultra-fast training and inference (~5ms on RTX 4060)
    model = YOLO("yolo11n.pt")
    
    print("Starting training on NVIDIA GeForce RTX 4060 (device=0)...")
    results = model.train(
        data=yaml_path,
        epochs=30,
        imgsz=640,
        batch=16,
        device=0,
        workers=4,
        # Real-World Smashed / Mushy Food Augmentations:
        mosaic=1.0,     # Simulates overlapping, messy chafing tray compositions
        mixup=0.25,     # Blends distinct foods (gravy on rice, dal spread)
        degrees=15.0,   # Random smartphone angles
        shear=5.0,      # Deformed food geometry
        hsv_s=0.7,      # Grease and sauce specular variations
        hsv_v=0.4,      # Kitchen lighting shadows
        name="indian_food_waste_yolo",
        project="runs"
    )
    
    print("Training complete!")
    best_weights = "runs/indian_food_waste_yolo/weights/best.pt"
    if os.path.exists(best_weights):
        target_path = "/home/gandhaar/project/ramoji/ai/weights/yolo26-seg.pt"
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        shutil.copy(best_weights, target_path)
        print(f"✅ Successfully deployed best weights to {target_path}")

if __name__ == "__main__":
    main()
