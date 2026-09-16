import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.food_item import FoodItem
from app.models.waste_scan import WasteScan
from app.schemas.waste_scan import (
    WasteScanResponse,
    WasteScanVerifyRequest,
    TrainingDataExportItem
)
from app.services.storage import get_image_storage
from app.services.cost_engine import FoodCostService
from ai import get_vision_model, QuantityEstimator
from app.utils.security import get_current_user

router = APIRouter(tags=["Waste Scanning & AI"])

def build_scan_response(scan: WasteScan) -> WasteScanResponse:
    bbox = None
    if scan.bounding_box:
        try:
            bbox = json.loads(scan.bounding_box)
        except Exception:
            bbox = scan.bounding_box

    mask = None
    if scan.segmentation_mask:
        try:
            mask = json.loads(scan.segmentation_mask)
        except Exception:
            mask = scan.segmentation_mask

    return WasteScanResponse(
        id=scan.id,
        event_id=scan.event_id,
        food_item_id=scan.food_item_id,
        image_url=scan.image_url,
        annotated_image_url=getattr(scan, "annotated_image_url", None),
        created_at=scan.created_at,
        ai_food_prediction=scan.ai_food_prediction,
        ai_confidence=scan.ai_confidence,
        bounding_box=bbox,
        segmentation_mask=mask,
        estimated_weight_grams=scan.estimated_weight_grams,
        estimation_confidence=scan.estimation_confidence,
        measurement_method=scan.measurement_method,
        cost_per_gram=scan.cost_per_gram,
        estimated_waste_cost=scan.estimated_waste_cost,
        ai_model_name=scan.ai_model_name,
        ai_model_version=scan.ai_model_version,
        human_verified=scan.human_verified,
        human_food_correction=scan.human_food_correction,
        human_weight_correction=scan.human_weight_correction,
        is_low_confidence=scan.is_low_confidence,
        notes=scan.notes,
        final_food_name=scan.final_food_name,
        final_weight_grams=scan.final_weight_grams,
        final_waste_cost=scan.final_waste_cost,
        final_food_id=scan.food_item_id,
        final_weight_kg=round(scan.final_weight_grams / 1000.0, 2),
        estimated_weight_kg=round(scan.estimated_weight_grams / 1000.0, 2),
        estimated_cost=scan.final_waste_cost or scan.estimated_waste_cost,
        density_factor=0.85,
        correction_notes=scan.notes or scan.human_food_correction,
    )

@router.get("/api/scans/training-dataset", response_model=List[TrainingDataExportItem])
def export_training_dataset(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    scans = (
        db.query(WasteScan)
        .join(Event, WasteScan.event_id == Event.id)
        .filter(Event.hotel_id == current_user.hotel_id)
        .options(joinedload(WasteScan.event))
        .order_by(WasteScan.created_at.desc())
        .all()
    )

    items = []
    for s in scans:
        items.append(
            TrainingDataExportItem(
                scan_id=s.id,
                image_url=s.image_url,
                ai_prediction=s.ai_food_prediction,
                ai_confidence=s.ai_confidence,
                human_correction=s.human_food_correction,
                final_food_label=s.final_food_name,
                estimated_weight_g=s.estimated_weight_grams,
                final_weight_g=s.final_weight_grams,
                event_name=s.event.name if s.event else "Unknown Event",
                timestamp=s.created_at,
            )
        )
    return items

@router.post("/api/events/{event_id}/scan", response_model=WasteScanResponse, status_code=status.HTTP_201_CREATED)
async def scan_waste_image(
    event_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Banquet event not found")

    # 1. Validate File Format & Read Content
    allowed_extensions = [".jpg", ".jpeg", ".png", ".webp"]
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{file_ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file uploaded.")
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum allowable limit of 15MB.")

    # 2. Upload to Storage
    storage = get_image_storage()
    try:
        image_url, img_width, img_height = storage.upload(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

    # 3. Retrieve Event Menu Hints for Event-Aware Detection
    event_foods = (
        db.query(EventFood)
        .filter(EventFood.event_id == event_id)
        .options(joinedload(EventFood.food_item))
        .all()
    )
    menu_hints = [ef.food_item.name for ef in event_foods if ef.food_item]

    # 4. Run AI Computer Vision Inference
    try:
        vision_model = get_vision_model(mode=settings.AI_MODE, model_path=settings.AI_MODEL_PATH)
        analysis_result = vision_model.analyze(file_bytes, file.filename, menu_hints=menu_hints)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Vision Model inference failed: {str(e)}")

    if not analysis_result.detections or len(analysis_result.detections) == 0:
        predicted_name = "Unknown food"
        confidence = 0.0
        bbox = [0.0, 0.0, float(img_width), float(img_height)]
        mask = None
    else:
        primary_detection = analysis_result.detections[0]
        predicted_name = primary_detection.food_name
        confidence = primary_detection.confidence
        bbox = primary_detection.bounding_box
        mask = primary_detection.mask

    is_low_confidence = confidence < settings.AI_CONFIDENCE_THRESHOLD

    # 5. Match Food Item & Estimation Parameters
    matched_food = (
        db.query(FoodItem)
        .filter(FoodItem.hotel_id == current_user.hotel_id, FoodItem.name.ilike(f"%{predicted_name}%"))
        .first()
    )
    if not matched_food and len(event_foods) > 0 and event_foods[0].food_item:
        matched_food = event_foods[0].food_item

    density = matched_food.density_g_per_cm3 if matched_food else 0.85
    depth = matched_food.default_depth_cm if matched_food else 4.0
    scaling = matched_food.portion_scaling_factor if matched_food else 1.0
    calibration = matched_food.calibration_factor if matched_food else 1.0
    min_w = matched_food.min_estimated_weight_g if matched_food else 20.0
    max_w = matched_food.max_estimated_weight_g if matched_food else 25000.0

    # 6. Run Quantity Estimation
    from ai.model_interface import Detection
    det_obj = Detection(
        food_name=predicted_name,
        confidence=confidence,
        bounding_box=bbox,
        mask=mask
    )
    quantity_result = QuantityEstimator.estimate(
        detection=det_obj,
        image_width=img_width,
        image_height=img_height,
        density_g_per_cm3=density,
        default_depth_cm=depth,
        portion_scaling_factor=scaling,
        calibration_factor=calibration,
        min_weight_g=min_w,
        max_weight_g=max_w
    )

    # 7. Calculate Recipe & Waste Cost
    if matched_food:
        cost_per_g = FoodCostService.get_cost_per_gram_for_food(db, matched_food)
    else:
        cost_per_g = 0.18

    waste_cost = FoodCostService.calculate_estimated_waste_cost(
        quantity_result.estimated_weight_grams,
        cost_per_g
    )

    # 8. Upload annotated bounding-box visual image if available
    annotated_image_url = None
    if getattr(analysis_result, "annotated_image_bytes", None):
        try:
            annotated_image_url, _, _ = storage.upload(
                analysis_result.annotated_image_bytes,
                f"annotated_{file.filename}"
            )
        except Exception as e:
            print(f"Warning: Failed to save annotated image: {e}")

    # 9. Save Waste Scan Record
    scan = WasteScan(
        event_id=event_id,
        food_item_id=matched_food.id if matched_food else None,
        image_url=image_url,
        annotated_image_url=annotated_image_url,
        created_at=datetime.now(timezone.utc),
        ai_food_prediction=predicted_name,
        ai_confidence=confidence,
        bounding_box=json.dumps(bbox) if bbox else None,
        segmentation_mask=json.dumps(mask) if mask else None,
        estimated_weight_grams=quantity_result.estimated_weight_grams,
        estimation_confidence=quantity_result.estimation_confidence,
        measurement_method="camera_estimate",
        cost_per_gram=cost_per_g,
        estimated_waste_cost=waste_cost,
        ai_model_name=analysis_result.model_name,
        ai_model_version=analysis_result.model_version,
        human_verified=False,
        is_low_confidence=is_low_confidence,
        notes=None
    )
    db.add(scan)

    if event.status == "Upcoming":
        event.status = "Active"

    db.commit()
    db.refresh(scan)
    return build_scan_response(scan)

@router.get("/api/events/{event_id}/scans", response_model=List[WasteScanResponse])
def list_event_scans(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    scans = (
        db.query(WasteScan)
        .filter(WasteScan.event_id == event_id)
        .order_by(WasteScan.created_at.desc())
        .all()
    )
    return [build_scan_response(s) for s in scans]

@router.get("/api/scans/{id}", response_model=WasteScanResponse)
def get_scan(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(WasteScan).filter(WasteScan.id == id).first()
    if not scan or scan.event.hotel_id != current_user.hotel_id:
        raise HTTPException(status_code=404, detail="Waste scan not found")
    return build_scan_response(scan)

@router.put("/api/scans/{id}/verify", response_model=WasteScanResponse)
def verify_or_correct_scan(
    id: int,
    payload: WasteScanVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(WasteScan).filter(WasteScan.id == id).first()
    if not scan or scan.event.hotel_id != current_user.hotel_id:
        raise HTTPException(status_code=404, detail="Waste scan not found")

    scan.human_verified = True

    target_food_id = payload.final_food_id if payload.final_food_id is not None else payload.food_item_id
    if target_food_id is not None:
        scan.food_item_id = target_food_id
        food = db.query(FoodItem).filter(FoodItem.id == target_food_id).first()
        if food:
            scan.human_food_correction = food.name
            scan.cost_per_gram = FoodCostService.get_cost_per_gram_for_food(db, food)
    elif payload.human_food_correction:
        scan.human_food_correction = payload.human_food_correction.strip()

    target_weight_g = None
    if payload.final_weight_kg is not None:
        target_weight_g = payload.final_weight_kg * 1000.0
    elif payload.human_weight_correction is not None:
        target_weight_g = payload.human_weight_correction

    if target_weight_g is not None:
        scan.human_weight_correction = target_weight_g
        scan.human_cost_correction = round(target_weight_g * scan.cost_per_gram, 2)

    note_text = payload.correction_notes if payload.correction_notes is not None else payload.notes
    if note_text is not None:
        scan.notes = note_text.strip()

    db.commit()
    db.refresh(scan)
    return build_scan_response(scan)

@router.put("/api/events/{event_id}/scans/{id}", response_model=WasteScanResponse)
def update_event_scan(
    event_id: int,
    id: int,
    payload: WasteScanVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return verify_or_correct_scan(id=id, payload=payload, current_user=current_user, db=db)

