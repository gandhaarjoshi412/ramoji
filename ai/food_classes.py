"""
Food Waste Segmentation Model Class Catalog & Mappings.
Maps the 31 YOLO11m-seg classes to human-readable names, banquet food categories,
physical densities (g/cm³), serving dish depths (cm), and baseline catering costs.
"""

from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.food_item import FoodItem
from app.models.hotel import Hotel

# 58 classes trained on platesight_dishes58.yaml
YOLO11M_SEG_CLASSES: Dict[str, Dict[str, Any]] = {
    "steamed_rice": {"display_name": "Steamed Basmati Rice", "category": "Rice", "density_g_per_cm3": 0.90, "default_depth_cm": 3.5, "default_cost_per_kg": 80.0, "keywords": ["rice", "steamed", "basmati", "chawal"]},
    "biryani": {"display_name": "Dum Biryani", "category": "Main Course", "density_g_per_cm3": 0.85, "default_depth_cm": 4.0, "default_cost_per_kg": 220.0, "keywords": ["biryani", "dum biryani", "hyderabadi"]},
    "pulao_fried_rice": {"display_name": "Pulao / Fried Rice", "category": "Rice", "density_g_per_cm3": 0.88, "default_depth_cm": 3.5, "default_cost_per_kg": 110.0, "keywords": ["pulao", "fried rice", "pilaf"]},
    "dal_curry": {"display_name": "Dal Tadka", "category": "Dal", "density_g_per_cm3": 1.02, "default_depth_cm": 3.0, "default_cost_per_kg": 130.0, "keywords": ["dal", "tadka", "makhani", "lentil"]},
    "sambar_rasam": {"display_name": "Sambar / Rasam", "category": "Dal & Soups", "density_g_per_cm3": 1.01, "default_depth_cm": 3.0, "default_cost_per_kg": 90.0, "keywords": ["sambar", "rasam", "charu"]},
    "roti_flatbread": {"display_name": "Roti / Chapati", "category": "Breads", "density_g_per_cm3": 0.40, "default_depth_cm": 1.5, "default_cost_per_kg": 70.0, "keywords": ["roti", "chapati", "phulka"]},
    "naan_kulcha": {"display_name": "Butter Naan / Kulcha", "category": "Breads", "density_g_per_cm3": 0.45, "default_depth_cm": 2.0, "default_cost_per_kg": 120.0, "keywords": ["naan", "butter naan", "kulcha"]},
    "paratha": {"display_name": "Stuffed Paratha", "category": "Breads", "density_g_per_cm3": 0.50, "default_depth_cm": 2.0, "default_cost_per_kg": 100.0, "keywords": ["paratha", "aloo paratha"]},
    "puri_bhatura": {"display_name": "Puri / Bhatura", "category": "Breads", "density_g_per_cm3": 0.35, "default_depth_cm": 2.5, "default_cost_per_kg": 90.0, "keywords": ["puri", "bhatura"]},
    "dosa": {"display_name": "Crispy Dosa", "category": "Breakfast/Snack", "density_g_per_cm3": 0.40, "default_depth_cm": 1.5, "default_cost_per_kg": 100.0, "keywords": ["dosa", "masala dosa"]},
    "idli": {"display_name": "Steamed Idli", "category": "Breakfast/Snack", "density_g_per_cm3": 0.65, "default_depth_cm": 2.5, "default_cost_per_kg": 80.0, "keywords": ["idli"]},
    "vada": {"display_name": "Medu Vada", "category": "Breakfast/Snack", "density_g_per_cm3": 0.60, "default_depth_cm": 2.5, "default_cost_per_kg": 120.0, "keywords": ["vada", "medu vada"]},
    "paneer_curry": {"display_name": "Paneer Butter Masala", "category": "Curry", "density_g_per_cm3": 1.05, "default_depth_cm": 3.5, "default_cost_per_kg": 320.0, "keywords": ["paneer", "paneer butter masala", "shahi paneer"]},
    "dry_paneer_tikka": {"display_name": "Paneer Tikka", "category": "Starters", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 350.0, "keywords": ["paneer tikka"]},
    "mixed_vegetable_curry": {"display_name": "Mixed Vegetable Curry", "category": "Curry", "density_g_per_cm3": 0.95, "default_depth_cm": 3.5, "default_cost_per_kg": 140.0, "keywords": ["mixed veg", "vegetable curry"]},
    "dry_vegetable_dish": {"display_name": "Aloo Gobi / Dry Subzi", "category": "Side Dish", "density_g_per_cm3": 0.85, "default_depth_cm": 3.0, "default_cost_per_kg": 110.0, "keywords": ["aloo gobi", "bhindi"]},
    "chicken_curry": {"display_name": "Chicken Curry", "category": "Non-Veg Curry", "density_g_per_cm3": 1.00, "default_depth_cm": 3.5, "default_cost_per_kg": 260.0, "keywords": ["chicken curry", "butter chicken"]},
    "dry_chicken_tikka": {"display_name": "Chicken Tikka / Kebab", "category": "Starters", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 290.0, "keywords": ["chicken tikka", "kebab"]},
    "mutton_curry": {"display_name": "Mutton Rogan Josh", "category": "Non-Veg Curry", "density_g_per_cm3": 1.05, "default_depth_cm": 3.5, "default_cost_per_kg": 480.0, "keywords": ["mutton", "rogan josh"]},
    "fish_curry": {"display_name": "Fish Curry", "category": "Non-Veg Curry", "density_g_per_cm3": 0.95, "default_depth_cm": 3.0, "default_cost_per_kg": 340.0, "keywords": ["fish curry"]},
    "egg_curry": {"display_name": "Egg Curry", "category": "Curry", "density_g_per_cm3": 0.95, "default_depth_cm": 3.0, "default_cost_per_kg": 150.0, "keywords": ["egg curry"]},
    "chana_masala": {"display_name": "Chana Masala / Chole", "category": "Curry", "density_g_per_cm3": 0.98, "default_depth_cm": 3.5, "default_cost_per_kg": 130.0, "keywords": ["chana", "chole"]},
    "salad_raw_veg": {"display_name": "Green Salad", "category": "Salad", "density_g_per_cm3": 0.60, "default_depth_cm": 3.0, "default_cost_per_kg": 60.0, "keywords": ["salad", "cucumber"]},
    "raita_curd": {"display_name": "Raita / Fresh Curd", "category": "Accompaniment", "density_g_per_cm3": 1.02, "default_depth_cm": 2.5, "default_cost_per_kg": 75.0, "keywords": ["raita", "curd"]},
    "chutney": {"display_name": "Chutney", "category": "Accompaniment", "density_g_per_cm3": 1.05, "default_depth_cm": 2.0, "default_cost_per_kg": 80.0, "keywords": ["chutney"]},
    "samosa_snack": {"display_name": "Samosa / Pakoda", "category": "Snacks", "density_g_per_cm3": 0.55, "default_depth_cm": 2.5, "default_cost_per_kg": 110.0, "keywords": ["samosa", "pakoda"]},
    "gulab_jamun": {"display_name": "Gulab Jamun", "category": "Dessert", "density_g_per_cm3": 1.10, "default_depth_cm": 2.5, "default_cost_per_kg": 260.0, "keywords": ["gulab jamun"]},
    "rasgulla": {"display_name": "Rasgulla", "category": "Dessert", "density_g_per_cm3": 1.05, "default_depth_cm": 2.5, "default_cost_per_kg": 240.0, "keywords": ["rasgulla"]},
    "halwa_sheera": {"display_name": "Moong Dal Halwa", "category": "Dessert", "density_g_per_cm3": 1.15, "default_depth_cm": 3.0, "default_cost_per_kg": 220.0, "keywords": ["halwa", "sheera"]},
    "kheer_payasam": {"display_name": "Kheer / Payasam", "category": "Dessert", "density_g_per_cm3": 1.05, "default_depth_cm": 3.0, "default_cost_per_kg": 180.0, "keywords": ["kheer", "payasam"]},
    "cut_fruits": {"display_name": "Fresh Cut Fruits", "category": "Fruits", "density_g_per_cm3": 0.70, "default_depth_cm": 3.5, "default_cost_per_kg": 90.0, "keywords": ["fruit", "fruits"]},
    "bhindi": {"display_name": "Bhindi Masala", "category": "Side Dish", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 120.0, "keywords": ["bhindi", "okra"]},
    "bread": {"display_name": "Assorted Breads", "category": "Breads", "density_g_per_cm3": 0.40, "default_depth_cm": 2.0, "default_cost_per_kg": 90.0, "keywords": ["bread"]},
    "curd": {"display_name": "Plain Curd", "category": "Accompaniment", "density_g_per_cm3": 1.02, "default_depth_cm": 2.5, "default_cost_per_kg": 70.0, "keywords": ["curd", "dahi"]},
    "curd_rice": {"display_name": "Curd Rice", "category": "Rice", "density_g_per_cm3": 0.95, "default_depth_cm": 3.0, "default_cost_per_kg": 90.0, "keywords": ["curd rice"]},
    "dosakaya_pachadi": {"display_name": "Dosakaya Pachadi", "category": "Accompaniment", "density_g_per_cm3": 1.00, "default_depth_cm": 2.0, "default_cost_per_kg": 85.0, "keywords": ["dosakaya", "pachadi"]},
    "fish_fingers": {"display_name": "Crispy Fish Fingers", "category": "Starters", "density_g_per_cm3": 0.75, "default_depth_cm": 2.5, "default_cost_per_kg": 380.0, "keywords": ["fish fingers"]},
    "gutti_vankaya_kura": {"display_name": "Gutti Vankaya Kura", "category": "Curry", "density_g_per_cm3": 0.95, "default_depth_cm": 3.5, "default_cost_per_kg": 160.0, "keywords": ["vankaya", "brinjal"]},
    "hyderabadi_chicken_biryani": {"display_name": "Hyderabadi Chicken Biryani", "category": "Main Course", "density_g_per_cm3": 0.85, "default_depth_cm": 4.0, "default_cost_per_kg": 240.0, "keywords": ["hyderabadi biryani"]},
    "kimchi_salad": {"display_name": "Kimchi Salad", "category": "Salad", "density_g_per_cm3": 0.65, "default_depth_cm": 2.5, "default_cost_per_kg": 120.0, "keywords": ["kimchi"]},
    "mirchi_ka_salan": {"display_name": "Mirchi Ka Salan", "category": "Accompaniment", "density_g_per_cm3": 1.02, "default_depth_cm": 3.0, "default_cost_per_kg": 110.0, "keywords": ["mirchi", "salan"]},
    "murgh_jahangiri_shorba": {"display_name": "Murgh Jahangiri Shorba", "category": "Soups", "density_g_per_cm3": 1.00, "default_depth_cm": 3.0, "default_cost_per_kg": 180.0, "keywords": ["shorba"]},
    "murgh_malai_kebab": {"display_name": "Murgh Malai Kebab", "category": "Starters", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 320.0, "keywords": ["malai kebab"]},
    "nellore_chepala_pulusu": {"display_name": "Nellore Chepala Pulusu", "category": "Non-Veg Curry", "density_g_per_cm3": 0.98, "default_depth_cm": 3.5, "default_cost_per_kg": 360.0, "keywords": ["chepala pulusu"]},
    "palankura_pappu": {"display_name": "Palakura Pappu", "category": "Dal", "density_g_per_cm3": 1.02, "default_depth_cm": 3.0, "default_cost_per_kg": 110.0, "keywords": ["pappu", "palakura"]},
    "paneer_pasanda": {"display_name": "Paneer Pasanda", "category": "Curry", "density_g_per_cm3": 1.05, "default_depth_cm": 3.5, "default_cost_per_kg": 340.0, "keywords": ["paneer pasanda"]},
    "paneer_tikka": {"display_name": "Tandoori Paneer Tikka", "category": "Starters", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 350.0, "keywords": ["paneer tikka"]},
    "pickle": {"display_name": "Indian Mango / Lemon Pickle", "category": "Accompaniment", "density_g_per_cm3": 1.10, "default_depth_cm": 2.0, "default_cost_per_kg": 120.0, "keywords": ["pickle", "achar"]},
    "rasam": {"display_name": "South Indian Rasam", "category": "Dal & Soups", "density_g_per_cm3": 1.00, "default_depth_cm": 3.0, "default_cost_per_kg": 80.0, "keywords": ["rasam"]},
    "salad": {"display_name": "Tossed Fresh Salad", "category": "Salad", "density_g_per_cm3": 0.60, "default_depth_cm": 3.0, "default_cost_per_kg": 70.0, "keywords": ["salad"]},
    "sprout_salad": {"display_name": "Healthy Sprout Salad", "category": "Salad", "density_g_per_cm3": 0.65, "default_depth_cm": 3.0, "default_cost_per_kg": 90.0, "keywords": ["sprout"]},
    "subz_nizami_handi": {"display_name": "Subz Nizami Handi", "category": "Curry", "density_g_per_cm3": 0.95, "default_depth_cm": 3.5, "default_cost_per_kg": 160.0, "keywords": ["nizami handi"]},
    "tadka_raita": {"display_name": "Tadka Raita", "category": "Accompaniment", "density_g_per_cm3": 1.02, "default_depth_cm": 2.5, "default_cost_per_kg": 80.0, "keywords": ["raita"]},
    "takari_birayani": {"display_name": "Veg Takari Biryani", "category": "Main Course", "density_g_per_cm3": 0.85, "default_depth_cm": 4.0, "default_cost_per_kg": 180.0, "keywords": ["veg biryani"]},
    "thai_fruit_salad": {"display_name": "Thai Tropical Fruit Salad", "category": "Fruits", "density_g_per_cm3": 0.70, "default_depth_cm": 3.5, "default_cost_per_kg": 140.0, "keywords": ["thai fruit"]},
    "tiramisu": {"display_name": "Classic Tiramisu", "category": "Dessert", "density_g_per_cm3": 0.85, "default_depth_cm": 3.0, "default_cost_per_kg": 450.0, "keywords": ["tiramisu"]},
    "veg_manchurian": {"display_name": "Dry Veg Manchurian", "category": "Starters", "density_g_per_cm3": 0.80, "default_depth_cm": 2.5, "default_cost_per_kg": 160.0, "keywords": ["manchurian"]},
    "vegetable_manchow_soup": {"display_name": "Hot & Spicy Manchow Soup", "category": "Soups", "density_g_per_cm3": 1.00, "default_depth_cm": 3.0, "default_cost_per_kg": 110.0, "keywords": ["manchow soup"]}
}

# Mapping for YOLO detection model classes (CamelCase) to segmentation catalog keys
DET_TO_SEG_MAP: Dict[str, str] = {
    "AlooGobi": "dry_vegetable_dish",
    "AlooMasala": "dry_vegetable_dish",
    "BesanCheela": "dosa",
    "Bhatura": "puri_bhatura",
    "BhindiMasala": "dry_vegetable_dish",
    "Biryani": "biryani",
    "Chai": "raita_curd",
    "Chole": "chana_masala",
    "CoconutChutney": "chutney",
    "Dal": "dal_curry",
    "Dosa": "dosa",
    "DumAloo": "mixed_vegetable_curry",
    "FishCurry": "fish_curry",
    "Ghevar": "halwa_sheera",
    "GreenChutney": "chutney",
    "GulabJamun": "gulab_jamun",
    "Idli": "idli",
    "Jalebi": "gulab_jamun",
    "Kebab": "dry_chicken_tikka",
    "Kheer": "kheer_payasam",
    "Kulfi": "kheer_payasam",
    "Lassi": "raita_curd",
    "MuttonCurry": "mutton_curry",
    "OnionPakoda": "samosa_snack",
    "PalakPaneer": "paneer_curry",
    "Poha": "pulao_fried_rice",
    "RajmaCurry": "chana_masala",
    "RasMalai": "rasgulla",
    "Samosa": "samosa_snack",
    "ShahiPaneer": "paneer_curry",
    "WhiteRice": "steamed_rice",
}

DET_DISPLAY_NAMES: Dict[str, str] = {
    "AlooGobi": "Aloo Gobi / Dry Subzi",
    "AlooMasala": "Aloo Masala",
    "BesanCheela": "Besan Cheela",
    "Bhatura": "Puri / Bhatura",
    "BhindiMasala": "Bhindi Masala / Subzi",
    "Biryani": "Dum Biryani",
    "Chai": "Chai / Beverage",
    "Chole": "Chana Masala / Chole",
    "CoconutChutney": "Coconut Chutney",
    "Dal": "Dal Tadka",
    "Dosa": "Crispy Dosa",
    "DumAloo": "Dum Aloo Curry",
    "FishCurry": "Fish Curry",
    "Ghevar": "Ghevar",
    "GreenChutney": "Mint / Green Chutney",
    "GulabJamun": "Gulab Jamun",
    "Idli": "Steamed Idli",
    "Jalebi": "Jalebi",
    "Kebab": "Chicken Tikka / Kebab",
    "Kheer": "Kheer / Payasam",
    "Kulfi": "Kulfi",
    "Lassi": "Fresh Lassi",
    "MuttonCurry": "Mutton Rogan Josh",
    "OnionPakoda": "Onion Pakoda / Snack",
    "PalakPaneer": "Palak Paneer",
    "Poha": "Poha / Breakfast",
    "RajmaCurry": "Rajma Masala Curry",
    "RasMalai": "Ras Malai",
    "Samosa": "Samosa / Pakoda",
    "ShahiPaneer": "Paneer Butter Masala",
    "WhiteRice": "Steamed Basmati Rice",
}

def normalize_label(raw_name: str) -> str:
    """Normalizes class string: steamed_rice -> Steamed Basmati Rice, WhiteRice -> Steamed Basmati Rice."""
    key = raw_name.strip()
    if key in DET_DISPLAY_NAMES:
        return DET_DISPLAY_NAMES[key]

    key_lower = key.lower()
    if key_lower in YOLO11M_SEG_CLASSES:
        return YOLO11M_SEG_CLASSES[key_lower]["display_name"]

    # Check case-insensitive DET names
    for det_k, disp in DET_DISPLAY_NAMES.items():
        if det_k.lower() == key_lower:
            return disp

    # Check if mapped to SEG
    for det_k, seg_k in DET_TO_SEG_MAP.items():
        if det_k.lower() == key_lower and seg_k in YOLO11M_SEG_CLASSES:
            return YOLO11M_SEG_CLASSES[seg_k]["display_name"]

    return raw_name.replace("_", " ").title()

def resolve_food_metadata(
    raw_name: str,
    db: Session,
    hotel_id: int,
    menu_hints: Optional[List[str]] = None
) -> Tuple[Optional[FoodItem], str, float, float, float]:
    """
    Finds or infers FoodItem model and physical estimation parameters.
    Returns: (matched_food_item, display_name, density_g_per_cm3, default_depth_cm, default_cost_per_kg)
    """
    clean_key = raw_name.strip().lower()
    
    # Resolve mapped SEG key if from detection model
    seg_key = clean_key
    for det_k, mapped_seg in DET_TO_SEG_MAP.items():
        if det_k.lower() == clean_key:
            seg_key = mapped_seg
            break

    if seg_key not in YOLO11M_SEG_CLASSES:
        for k, v in YOLO11M_SEG_CLASSES.items():
            if v.get("display_name", "").strip().lower() == clean_key:
                seg_key = k
                break

    class_meta = YOLO11M_SEG_CLASSES.get(seg_key, {})
    display_name = DET_DISPLAY_NAMES.get(raw_name.strip(), class_meta.get("display_name", normalize_label(raw_name)))
    density = class_meta.get("density_g_per_cm3", 0.85)
    depth = class_meta.get("default_depth_cm", 3.5)
    cost = class_meta.get("default_cost_per_kg", 150.0)

    # 1. Exact match on raw name or display name in DB
    matched = (
        db.query(FoodItem)
        .filter(
            FoodItem.hotel_id == hotel_id,
            (FoodItem.name.ilike(f"%{raw_name}%")) | (FoodItem.name.ilike(f"%{display_name}%"))
        )
        .first()
    )

    # 2. Check keywords if available
    if not matched and "keywords" in class_meta:
        for kw in class_meta["keywords"]:
            matched = (
                db.query(FoodItem)
                .filter(FoodItem.hotel_id == hotel_id, FoodItem.name.ilike(f"%{kw}%"))
                .first()
            )
            if matched:
                break

    # 3. Check menu hints
    if not matched and menu_hints:
        for hint in menu_hints:
            if any(k in hint.lower() for k in class_meta.get("keywords", [clean_key])):
                matched = (
                    db.query(FoodItem)
                    .filter(FoodItem.hotel_id == hotel_id, FoodItem.name.ilike(f"%{hint}%"))
                    .first()
                )
                if matched:
                    break

    # Overwrite estimation parameters from matched DB FoodItem if present
    if matched:
        density = matched.density_g_per_cm3 or density
        depth = matched.default_depth_cm or depth
        cost = matched.default_cost_per_kg or cost
        display_name = matched.name

    return matched, display_name, density, depth, cost

def sync_food_catalog_for_hotel(db: Session, hotel_id: int, only_if_empty: bool = True):
    """
    Ensures YOLO11m segmentation classes exist in the hotel's food item catalog.
    If only_if_empty is True, respects user deletions and does not re-add deleted items.
    """
    existing_items = db.query(FoodItem).filter(FoodItem.hotel_id == hotel_id).all()
    if only_if_empty and len(existing_items) > 0:
        return 0

    existing_names = {item.name.lower().strip() for item in existing_items}

    added = 0
    for key, meta in YOLO11M_SEG_CLASSES.items():
        disp_name = meta["display_name"].strip()
        if disp_name.lower() not in existing_names:
            new_item = FoodItem(
                hotel_id=hotel_id,
                name=disp_name,
                category=meta["category"],
                default_unit="kg",
                default_cost_per_kg=meta["default_cost_per_kg"],
                density_g_per_cm3=meta["density_g_per_cm3"],
                default_depth_cm=meta["default_depth_cm"],
                calibration_factor=1.0,
                min_estimated_weight_g=20.0,
                max_estimated_weight_g=25000.0,
            )
            db.add(new_item)
            existing_names.add(disp_name.lower())
            added += 1

    if added > 0:
        db.commit()
    return added
