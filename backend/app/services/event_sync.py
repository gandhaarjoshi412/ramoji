from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_scan import WasteScan
from app.models.food_item import FoodItem
from app.models.recipe import Recipe
from app.services.cost_engine import FoodCostService

def sync_event_scans_to_event_foods(db: Session, event_id: int, create_missing: bool = True) -> None:
    """
    Synchronizes camera WasteScans to the event's banquet menu (EventFood).
    If create_missing is False, only updates existing menu items and never resurrects deleted dishes.
    """
    scans = db.query(WasteScan).filter(WasteScan.event_id == event_id).all()
    if not scans:
        return

    event = db.query(Event).filter(Event.id == event_id).first()
    hotel_id = event.hotel_id if event else 1

    # Group scans by food_item_id, resolving missing IDs if needed
    scans_by_food: Dict[int, List[WasteScan]] = {}
    for s in scans:
        fid = s.food_item_id
        if not fid:
            # If food_item_id is not set, try to resolve by prediction name
            match = db.query(FoodItem).filter(
                FoodItem.hotel_id == hotel_id,
                (FoodItem.name.ilike(f"%{s.ai_food_prediction}%")) |
                (FoodItem.name.ilike(f"%{s.final_food_name}%"))
            ).first()
            if match:
                fid = match.id
            else:
                from ai.food_classes import resolve_food_metadata
                matched_food, disp_name, density, depth, cost_kg = resolve_food_metadata(
                    raw_name=s.final_food_name or s.ai_food_prediction or "Unknown Food",
                    db=db,
                    hotel_id=hotel_id
                )
                if not matched_food:
                    matched_food = FoodItem(
                        hotel_id=hotel_id,
                        name=disp_name,
                        category="Main Course",
                        default_unit="kg",
                        default_cost_per_kg=cost_kg,
                        density_g_per_cm3=density,
                        default_depth_cm=depth,
                    )
                    db.add(matched_food)
                    db.flush()
                fid = matched_food.id

            s.food_item_id = fid
            db.flush()

        if fid:
            if fid not in scans_by_food:
                scans_by_food[fid] = []
            scans_by_food[fid].append(s)

    event_foods = db.query(EventFood).filter(EventFood.event_id == event_id).all()
    existing_food_ids = {ef.food_item_id: ef for ef in event_foods}

    has_changes = False
    for fid, fscans in scans_by_food.items():
        food_item = db.query(FoodItem).filter(FoodItem.id == fid).first()
        if not food_item:
            continue

        total_leftover_kg = round(sum(s.final_weight_grams for s in fscans) / 1000.0, 2)
        total_waste_cost = round(sum(s.final_waste_cost for s in fscans), 2)
        cost_per_kg = (
            food_item.default_cost_per_kg
            if (food_item.default_cost_per_kg and food_item.default_cost_per_kg > 0)
            else round(FoodCostService.get_cost_per_gram_for_food(db, food_item) * 1000.0, 2)
        )
        if cost_per_kg <= 0 and total_leftover_kg > 0:
            cost_per_kg = round(total_waste_cost / total_leftover_kg, 2)

        # Base prepared batch quantity: check recipe yield, otherwise 2.5x leftover or min 5 kg
        recipe = db.query(Recipe).filter(Recipe.food_item_id == fid).first()
        if recipe and recipe.expected_yield_grams and recipe.expected_yield_grams > 0:
            base_prep = round(recipe.expected_yield_grams / 1000.0, 1)
        else:
            base_prep = max(round(total_leftover_kg * 2.5, 1), 5.0)

        prep_weight = max(base_prep, round(total_leftover_kg * 1.2, 1))

        if fid not in existing_food_ids:
            if create_missing:
                # Auto-create EventFood entry
                ef = EventFood(
                    event_id=event_id,
                    food_item_id=fid,
                    prepared_weight_kg=prep_weight,
                    estimated_cost_per_kg=round(cost_per_kg, 2),
                    notes=f"Auto-synced from {len(fscans)} camera waste scan{'s' if len(fscans) > 1 else ''}"
                )
                db.add(ef)
                existing_food_ids[fid] = ef
                has_changes = True
        else:
            ef = existing_food_ids[fid]
            if ef.prepared_weight_kg is None or ef.prepared_weight_kg <= 0:
                ef.prepared_weight_kg = prep_weight
                has_changes = True
            elif ef.prepared_weight_kg < total_leftover_kg:
                ef.prepared_weight_kg = round(total_leftover_kg * 1.2, 1)
                has_changes = True

            if not ef.estimated_cost_per_kg or ef.estimated_cost_per_kg <= 0:
                ef.estimated_cost_per_kg = round(cost_per_kg, 2)
                has_changes = True

            if ef.notes and "Auto-synced" in ef.notes:
                ef.notes = f"Auto-synced from {len(fscans)} camera waste scan{'s' if len(fscans) > 1 else ''}"

    if has_changes:
        db.commit()

def sync_event_to_analytics_records(db: Session, event_id: int) -> None:
    """
    Synchronizes an Event's dishes, portion yields, and waste scans into the
    canonical AnalyticsRecord table so hotel-level, event-level, and dish-level
    analytics reflect all live event operations consistently.
    """
    from app.models.analytics_record import AnalyticsRecord
    from app.models.hotel import Hotel

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or event.is_archived:
        return

    hotel = db.query(Hotel).filter(Hotel.id == event.hotel_id).first()
    hotel_name = hotel.name if hotel else "Dolphin Hotels"
    pax = event.actual_guests if event.actual_guests > 0 else (event.expected_guests if event.expected_guests > 0 else 50)

    # First ensure EventFoods are up to date
    sync_event_scans_to_event_foods(db, event_id, create_missing=True)

    event_foods = db.query(EventFood).filter(EventFood.event_id == event_id).all()
    for ef in event_foods:
        food_item = ef.food_item
        if not food_item:
            continue

        # Calculate scan waste for this food in this event
        scans = db.query(WasteScan).filter(
            WasteScan.event_id == event_id,
            WasteScan.food_item_id == ef.food_item_id
        ).all()

        waste_kg = round(sum(s.final_weight_grams for s in scans) / 1000.0, 2)
        waste_cost = round(sum(s.final_waste_cost for s in scans), 2)
        leftover_kg = waste_kg  # scans represent captured leftovers

        prep_kg = float(ef.prepared_weight_kg or 0.0)
        if prep_kg < leftover_kg:
            prep_kg = round(leftover_kg * 1.5, 2)

        cons_kg = max(0.0, round(prep_kg - leftover_kg, 2))

        # Check existing AnalyticsRecord for this event and dish
        rec = db.query(AnalyticsRecord).filter(
            AnalyticsRecord.event_id == event_id,
            AnalyticsRecord.dish_name == food_item.name
        ).first()

        if not rec:
            rec = AnalyticsRecord(
                hotel_id=event.hotel_id,
                hotel_name=hotel_name,
                event_id=event.id,
                event_name=event.name,
                event_type=event.event_type,
                event_subtype=getattr(event, "event_subtype", None) or event.event_type,
                client_name=getattr(event, "client_name", None),
                service_type=getattr(event, "service_format", "Buffet") or "Buffet",
                session="Dinner",
                record_date=event.event_date,
                pax=pax,
                dish_name=food_item.name,
                dish_category=food_item.category or "Main Course",
                food_type="Veg" if "veg" in food_item.name.lower() or "paneer" in food_item.name.lower() or "rice" in food_item.name.lower() else "Non-Veg",
                uom="Kg",
                item_cost=ef.estimated_cost_per_kg or 120.0,
                estimated_production_kg=prep_kg,
                actual_production_kg=prep_kg,
                actual_consumption_kg=cons_kg,
                kitchen_leftover_kg=0.0,
                location_buffet_return_kg=leftover_kg,
                total_leftover_kg=leftover_kg,
                reuse_quantity_kg=0.0,
                total_waste_kg=waste_kg,
                other_disposition_kg=0.0,
                reconciliation_variance_kg=0.0,
                waste_cost=waste_cost,
                waste_percentage=round((waste_kg / prep_kg * 100.0), 2) if prep_kg > 0 else 0.0,
                waste_per_head_grams=round((waste_kg / pax * 1000.0), 1) if pax > 0 else 0.0,
                consumption_per_head_grams=round((cons_kg / pax * 1000.0), 1) if pax > 0 else 0.0,
                production_per_head_grams=round((prep_kg / pax * 1000.0), 1) if pax > 0 else 0.0,
                data_source="Camera AI Scan",
                is_verified=all(s.human_verified for s in scans) if scans else True,
                notes=f"Synced from event '{event.name}' ({len(scans)} vision scans)",
            )
            db.add(rec)
        else:
            rec.actual_production_kg = prep_kg
            rec.actual_consumption_kg = cons_kg
            rec.total_leftover_kg = leftover_kg
            rec.location_buffet_return_kg = leftover_kg
            rec.total_waste_kg = waste_kg
            rec.waste_cost = waste_cost
            rec.pax = pax
            rec.waste_percentage = round((waste_kg / prep_kg * 100.0), 2) if prep_kg > 0 else 0.0
            rec.waste_per_head_grams = round((waste_kg / pax * 1000.0), 1) if pax > 0 else 0.0

    db.commit()

