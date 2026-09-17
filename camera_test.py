#!/usr/bin/env python3
"""
Real-Time Camera YOLO Food Waste Segmentation & Detection Tester
Opens your webcam and runs the trained YOLO11m segmentation model in real-time.
"""

import sys
import time
import os
from pathlib import Path
import cv2
from ultralytics import YOLO

def find_weights():
    script_dir = Path(__file__).resolve().parent
    candidates = [
        script_dir / "best.pt",
        script_dir / "ai" / "weights" / "yolo11m-seg.pt",
        Path("/home/gandhaar/kaggle/foodwaste_yolo11m_merged15k/weights/best.pt"),
        script_dir / "ai" / "weights" / "yolo26-seg.pt",
        script_dir / "yolo26_weights" / "best.pt",
        Path("best.pt"),
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return None

def main():
    weights_path = find_weights()
    if not weights_path:
        print("❌ Error: Could not find weights file.")
        print("Looked in: ./best.pt, ./ai/weights/yolo11m-seg.pt, /home/gandhaar/kaggle/foodwaste_yolo11m_merged15k/weights/best.pt")
        sys.exit(1)

    print("=" * 60)
    print("🎥 REAL-TIME CAMERA YOLO FOOD WASTE SEGMENTATION TESTER")
    print("=" * 60)
    print(f"Loading weights from: {weights_path}")
    model = YOLO(weights_path)
    task = getattr(model, "task", "segment")
    print(f"Model Architecture: YOLO11m | Task: {task.upper()}")
    print(f"Classes: {len(model.names)} Indian Banquet Food Categories")
    print("Model loaded successfully!")

    # Try camera index 0 (default webcam)
    cam_id = 0
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        cam_id = int(sys.argv[1])

    print(f"Opening camera device: /dev/video{cam_id} ...")
    cap = cv2.VideoCapture(cam_id)

    if not cap.isOpened():
        print(f"⚠️ Warning: Could not open camera {cam_id}. Trying camera 1...")
        cap = cv2.VideoCapture(1)
        if not cap.isOpened():
            print("❌ Error: No accessible webcam found.")
            print("Tip: If you're using an external USB camera, try: python camera_test.py 1")
            sys.exit(1)
        cam_id = 1

    # Set camera resolution (1280x720 or 640x480)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("\n✅ Camera is LIVE!")
    print("Controls:")
    print("   [q] -> Quit / Close window")
    print("   [s] -> Save snapshot of current detection")
    print("-" * 60)

    prev_time = time.time()
    snapshot_count = 0
    os.makedirs("snapshots", exist_ok=True)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame from camera. Exiting...")
            break

        # Calculate FPS
        curr_time = time.time()
        fps = 1.0 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
        prev_time = curr_time

        # Run YOLO inference on the live frame
        # conf=0.35 allows good detection sensitivity
        results = model.predict(source=frame, conf=0.35, verbose=False)

        # Plot annotated segmentation polygon masks, bounding boxes, and labels
        annotated_frame = results[0].plot(masks=True, boxes=True, labels=True, conf=True)

        # Overlay FPS on the screen
        cv2.putText(
            annotated_frame, 
            f"FPS: {fps:.1f} | Model: YOLO11m-seg ({task})", 
            (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.8, 
            (0, 255, 0), 
            2
        )

        # Print detections to terminal if anything found
        boxes = results[0].boxes
        masks = getattr(results[0], "masks", None)
        if len(boxes) > 0:
            detected_items = []
            for i, b in enumerate(boxes):
                cls_name = results[0].names[int(b.cls[0].item())]
                confidence = float(b.conf[0].item()) * 100
                has_mask = masks is not None and hasattr(masks, "xy") and len(masks.xy) > i and len(masks.xy[i]) >= 3
                mask_tag = " [seg]" if has_mask else ""
                detected_items.append(f"{cls_name} ({confidence:.0f}%{mask_tag})")
            # Clear line and print current detections
            sys.stdout.write(f"\r🔍 In View: {', '.join(detected_items):<65}")
            sys.stdout.flush()

        # Display output window
        try:
            cv2.imshow("YOLO Food Waste Camera Test - [q to quit, s to save]", annotated_frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                snapshot_count += 1
                out_path = f"snapshots/snapshot_{snapshot_count}_{int(time.time())}.jpg"
                cv2.imwrite(out_path, annotated_frame)
                print(f"\n📸 Saved snapshot to: {out_path}")
        except cv2.error as e:
            print(f"\n⚠️ Display error (headless environment): {e}")
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n\nCamera test ended.")

if __name__ == "__main__":
    main()
