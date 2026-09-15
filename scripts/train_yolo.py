import os
import shutil
from ultralytics import YOLO

def main():
    yaml_path = "/home/gandhaar/project/ramoji/datasets/merged_indian_food/data.yaml"
    project_dir = "runs"
    run_name = "indian_food_waste_yolo"
    checkpoint_path = os.path.join(project_dir, run_name, "weights", "last.pt")
    
    # 1. Check if a previous run was interrupted and can be resumed
    if os.path.exists(checkpoint_path):
        print(f"🔄 Checkpoint detected at '{checkpoint_path}'!")
        print("Resuming training from the last saved epoch without losing progress...")
        model = YOLO(checkpoint_path)
        results = model.train(resume=True)
    else:
        print("Initializing YOLO11 Medium baseline for Indian Food Waste Detection...")
        model = YOLO("yolo11m.pt")
        
        print("Starting training on NVIDIA GeForce RTX 4060 (device=0)...")
        print("Checkpointing enabled: 'last.pt' will update every epoch, plus periodic milestone checkpoints.")
        results = model.train(
            data=yaml_path,
            epochs=30,
            imgsz=640,
            batch=16,          # Optimized for 8GB VRAM on RTX 4060
            device=0,
            workers=4,
            # Checkpoint & Persistence settings:
            save=True,         # Ensure checkpoints are saved
            save_period=5,     # Save a dedicated milestone checkpoint every 5 epochs
            exist_ok=True,     # Keep output in the same run directory for easy resume
            # Real-World Smashed / Mushy Food Augmentations:
            mosaic=1.0,        # Simulates overlapping, messy chafing tray compositions
            mixup=0.25,        # Blends distinct foods (gravy on rice, dal spread)
            degrees=15.0,      # Random smartphone angles
            shear=5.0,         # Deformed food geometry
            hsv_s=0.7,         # Grease and sauce specular variations
            hsv_v=0.4,         # Kitchen lighting shadows
            name=run_name,
            project=project_dir
        )
    
    print("\nTraining run finished or checkpoint reached!")
    
    # Copy best or latest available weights to the application's AI weights directory
    weights_dir = os.path.join(project_dir, run_name, "weights")
    best_weights = os.path.join(weights_dir, "best.pt")
    last_weights = os.path.join(weights_dir, "last.pt")
    target_path = "/home/gandhaar/project/ramoji/ai/weights/yolo26-seg.pt"
    
    selected_weights = best_weights if os.path.exists(best_weights) else (last_weights if os.path.exists(last_weights) else None)
    
    if selected_weights:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        shutil.copy(selected_weights, target_path)
        print(f"✅ Successfully deployed latest checkpoint ({os.path.basename(selected_weights)}) to {target_path}")
    else:
        print(f"⚠️ No weights file found at {weights_dir}")

if __name__ == "__main__":
    main()
