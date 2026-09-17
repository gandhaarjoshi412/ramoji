"""
Food Waste Segmentation Model Class Catalog & Mappings.
Maps the 31 YOLO11m-seg classes to human-readable names, banquet food categories,
physical densities (g/cm³), serving dish depths (cm), and baseline catering costs.
"""

from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.food_item import FoodItem
from app.models.hotel import Hotel

# 31 classes trained on merged_indian_food (15k dataset)
YOLO11M_SEG_CLASSES: Dict[str, Dict[str, Any]] = {
    "steamed_rice": {
        "display_name": "Steamed Basmati Rice",
        "category": "Rice",
        "density_g_per_cm3": 0.90,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 80.0,
        "keywords": ["rice", "steamed", "basmati", "chawal"],
    },
    "biryani": {
        "display_name": "Dum Biryani",
        "category": "Main Course",
        "density_g_per_cm3": 0.85,
        "default_depth_cm": 4.0,
        "default_cost_per_kg": 220.0,
        "keywords": ["biryani", "dum biryani", "hyderabadi"],
    },
    "pulao_fried_rice": {
        "display_name": "Pulao / Fried Rice",
        "category": "Rice",
        "density_g_per_cm3": 0.88,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 110.0,
        "keywords": ["pulao", "fried rice", "pilaf", "jeera rice"],
    },
    "dal_curry": {
        "display_name": "Dal Tadka",
        "category": "Dal",
        "density_g_per_cm3": 1.02,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 130.0,
        "keywords": ["dal", "tadka", "makhani", "lentil", "dhal"],
    },
    "sambar_rasam": {
        "display_name": "Sambar / Rasam",
        "category": "Dal & Soups",
        "density_g_per_cm3": 1.01,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 90.0,
        "keywords": ["sambar", "rasam", "charu"],
    },
    "roti_flatbread": {
        "display_name": "Roti / Chapati",
        "category": "Breads",
        "density_g_per_cm3": 0.40,
        "default_depth_cm": 1.5,
        "default_cost_per_kg": 70.0,
        "keywords": ["roti", "chapati", "phulka", "flatbread", "rumali"],
    },
    "naan_kulcha": {
        "display_name": "Butter Naan / Kulcha",
        "category": "Breads",
        "density_g_per_cm3": 0.45,
        "default_depth_cm": 2.0,
        "default_cost_per_kg": 120.0,
        "keywords": ["naan", "butter naan", "kulcha", "garlic naan"],
    },
    "paratha": {
        "display_name": "Stuffed Paratha",
        "category": "Breads",
        "density_g_per_cm3": 0.50,
        "default_depth_cm": 2.0,
        "default_cost_per_kg": 100.0,
        "keywords": ["paratha", "aloo paratha", "laccha"],
    },
    "puri_bhatura": {
        "display_name": "Puri / Bhatura",
        "category": "Breads",
        "density_g_per_cm3": 0.35,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 90.0,
        "keywords": ["puri", "poori", "bhatura", "bhature"],
    },
    "dosa": {
        "display_name": "Crispy Dosa",
        "category": "Breakfast/Snack",
        "density_g_per_cm3": 0.40,
        "default_depth_cm": 1.5,
        "default_cost_per_kg": 100.0,
        "keywords": ["dosa", "masala dosa", "plain dosa"],
    },
    "idli": {
        "display_name": "Steamed Idli",
        "category": "Breakfast/Snack",
        "density_g_per_cm3": 0.65,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 80.0,
        "keywords": ["idli", "idly"],
    },
    "vada": {
        "display_name": "Medu Vada",
        "category": "Breakfast/Snack",
        "density_g_per_cm3": 0.60,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 120.0,
        "keywords": ["vada", "medu vada", "wada"],
    },
    "paneer_curry": {
        "display_name": "Paneer Butter Masala",
        "category": "Curry",
        "density_g_per_cm3": 1.05,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 320.0,
        "keywords": ["paneer", "paneer butter masala", "shahi paneer", "palak paneer", "kadai paneer"],
    },
    "dry_paneer_tikka": {
        "display_name": "Paneer Tikka",
        "category": "Starters",
        "density_g_per_cm3": 0.80,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 350.0,
        "keywords": ["paneer tikka", "dry paneer"],
    },
    "mixed_vegetable_curry": {
        "display_name": "Mixed Vegetable Curry",
        "category": "Curry",
        "density_g_per_cm3": 0.95,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 140.0,
        "keywords": ["mixed veg", "vegetable curry", "veg korma", "subzi"],
    },
    "dry_vegetable_dish": {
        "display_name": "Aloo Gobi / Dry Subzi",
        "category": "Side Dish",
        "density_g_per_cm3": 0.85,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 110.0,
        "keywords": ["aloo gobi", "bhindi", "jeera aloo", "dry veg", "poriyal"],
    },
    "chicken_curry": {
        "display_name": "Chicken Curry",
        "category": "Non-Veg Curry",
        "density_g_per_cm3": 1.00,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 260.0,
        "keywords": ["chicken curry", "butter chicken", "murgh", "chicken masala"],
    },
    "dry_chicken_tikka": {
        "display_name": "Chicken Tikka / Kebab",
        "category": "Starters",
        "density_g_per_cm3": 0.80,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 290.0,
        "keywords": ["chicken tikka", "tandoori chicken", "chicken kebab", "kebab"],
    },
    "mutton_curry": {
        "display_name": "Mutton Rogan Josh",
        "category": "Non-Veg Curry",
        "density_g_per_cm3": 1.05,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 480.0,
        "keywords": ["mutton", "rogan josh", "gosht"],
    },
    "fish_curry": {
        "display_name": "Fish Curry",
        "category": "Non-Veg Curry",
        "density_g_per_cm3": 0.95,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 340.0,
        "keywords": ["fish curry", "fish", "meen"],
    },
    "egg_curry": {
        "display_name": "Egg Curry",
        "category": "Curry",
        "density_g_per_cm3": 0.95,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 150.0,
        "keywords": ["egg curry", "anda curry", "egg masala"],
    },
    "chana_masala": {
        "display_name": "Chana Masala / Chole",
        "category": "Curry",
        "density_g_per_cm3": 0.98,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 130.0,
        "keywords": ["chana", "chole", "chickpea", "rajma"],
    },
    "salad_raw_veg": {
        "display_name": "Green Salad",
        "category": "Salad",
        "density_g_per_cm3": 0.60,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 60.0,
        "keywords": ["salad", "green salad", "cucumber", "raw veg"],
    },
    "raita_curd": {
        "display_name": "Raita / Fresh Curd",
        "category": "Accompaniment",
        "density_g_per_cm3": 1.02,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 75.0,
        "keywords": ["raita", "curd", "dahi", "boondi raita"],
    },
    "chutney": {
        "display_name": "Chutney",
        "category": "Accompaniment",
        "density_g_per_cm3": 1.05,
        "default_depth_cm": 2.0,
        "default_cost_per_kg": 80.0,
        "keywords": ["chutney", "green chutney", "coconut chutney", "mint chutney"],
    },
    "samosa_snack": {
        "display_name": "Samosa / Pakoda",
        "category": "Snacks",
        "density_g_per_cm3": 0.55,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 110.0,
        "keywords": ["samosa", "pakoda", "bhajiya", "snack"],
    },
    "gulab_jamun": {
        "display_name": "Gulab Jamun",
        "category": "Dessert",
        "density_g_per_cm3": 1.10,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 260.0,
        "keywords": ["gulab jamun", "jamun"],
    },
    "rasgulla": {
        "display_name": "Rasgulla",
        "category": "Dessert",
        "density_g_per_cm3": 1.05,
        "default_depth_cm": 2.5,
        "default_cost_per_kg": 240.0,
        "keywords": ["rasgulla", "rosogolla"],
    },
    "halwa_sheera": {
        "display_name": "Moong Dal Halwa / Sheera",
        "category": "Dessert",
        "density_g_per_cm3": 1.15,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 220.0,
        "keywords": ["halwa", "sheera", "gajar halwa", "kesari"],
    },
    "kheer_payasam": {
        "display_name": "Kheer / Payasam",
        "category": "Dessert",
        "density_g_per_cm3": 1.05,
        "default_depth_cm": 3.0,
        "default_cost_per_kg": 180.0,
        "keywords": ["kheer", "payasam", "rice pudding"],
    },
    "cut_fruits": {
        "display_name": "Fresh Cut Fruits",
        "category": "Fruits",
        "density_g_per_cm3": 0.70,
        "default_depth_cm": 3.5,
        "default_cost_per_kg": 90.0,
        "keywords": ["fruit", "fruits", "cut fruits", "watermelon", "papaya"],
    },
}

def normalize_label(raw_name: str) -> str:
    """Normalizes class string: steamed_rice -> Steamed Rice."""
    key = raw_name.strip().lower()
    if key in YOLO11M_SEG_CLASSES:
        return YOLO11M_SEG_CLASSES[key]["display_name"]
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
    class_meta = YOLO11M_SEG_CLASSES.get(clean_key, {})
    display_name = class_meta.get("display_name", normalize_label(raw_name))
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

def sync_food_catalog_for_hotel(db: Session, hotel_id: int):
    """
    Ensures all 31 YOLO11m segmentation classes exist in the hotel's food item catalog.
    """
    existing_items = db.query(FoodItem).filter(FoodItem.hotel_id == hotel_id).all()
    existing_names = {item.name.lower() for item in existing_items}

    added = 0
    for key, meta in YOLO11M_SEG_CLASSES.items():
        disp_name = meta["display_name"]
        # Check if already in catalog or keywords matched
        already_has = any(disp_name.lower() in en or en in disp_name.lower() for en in existing_names)
        if not already_has:
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
