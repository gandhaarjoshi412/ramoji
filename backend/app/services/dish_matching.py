import re
from typing import Dict, Any, List, Optional, Set, Tuple

# Approved Canonical Food Catalog with Semantic Aliases
CANONICAL_DISH_CATALOG: Dict[str, Dict[str, Any]] = {
    "Steamed Basmati Rice": {
        "category": "Rice",
        "aliases": [
            "steamed basmati rice", "plain rice", "steamed rice", "white rice",
            "basmati rice", "boiled rice", "jeera rice", "plain basmati rice"
        ],
        "image_url": "/images/dishes/steamed_rice.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 25.0,
    },
    "Hyderabadi Biryani": {
        "category": "Main Course",
        "aliases": [
            "hyderabadi biryani", "dum biryani", "biryani", "chicken biryani",
            "hyderabadi chicken biryani", "veg takari biryani", "mutton biryani",
            "mogolian rice / noodles - live counter"
        ],
        "image_url": "/images/dishes/biryani.jpg",
        "food_type": "Non-Veg",
        "standard_batch_kg": 40.0,
    },
    "Paneer Butter Masala": {
        "category": "Curry",
        "aliases": [
            "paneer butter masala", "paneer makhani", "butter paneer",
            "paneer pasanda", "paneer lababdar", "shahi paneer"
        ],
        "image_url": "/images/dishes/paneer_butter_masala.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 20.0,
    },
    "Paneer Tikka Masala": {
        "category": "Curry",
        "aliases": [
            "paneer tikka masala", "paneer tikka curry", "paneer tikka gravy",
            "tandoori paneer tikka masala"
        ],
        "image_url": "/images/dishes/paneer_tikka.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 18.0,
    },
    "Dal Tadka": {
        "category": "Dal",
        "aliases": [
            "dal tadka", "yellow dal tadka", "dal fry", "tadka dal",
            "palakura pappu", "dal makhani", "dal tadka fry"
        ],
        "image_url": "/images/dishes/dal_tadka.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 15.0,
    },
    "Butter Naan": {
        "category": "Breads",
        "aliases": [
            "butter naan", "naan", "garlic naan", "tandoori naan",
            "butter naan / kulcha", "plain naan"
        ],
        "image_url": "/images/dishes/butter_naan.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 15.0,
    },
    "Roti / Chapati": {
        "category": "Breads",
        "aliases": [
            "roti / chapati", "chapathi", "chapati", "phulka", "tandoori roti",
            "assorted indian bread roti / naan / phulka", "assorted breads", "bread rolls"
        ],
        "image_url": "/images/dishes/roti.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 12.0,
    },
    "Crispy Dosa": {
        "category": "Breakfast/Snack",
        "aliases": [
            "crispy dosa", "dosa", "plain dosa", "crispy plain dosa",
            "masala dosa", "set dosa"
        ],
        "image_url": "/images/dishes/crispy_dosa.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 10.0,
    },
    "Steamed Idli": {
        "category": "Breakfast/Snack",
        "aliases": [
            "steamed idli", "idly", "idli", "mini idli", "button idli"
        ],
        "image_url": "/images/dishes/steamed_idli.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 12.0,
    },
    "Medu Vada": {
        "category": "Breakfast/Snack",
        "aliases": [
            "medu vada", "wada", "vada", "sambar vada"
        ],
        "image_url": "/images/dishes/medu_vada.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 10.0,
    },
    "Gulab Jamun": {
        "category": "Dessert",
        "aliases": [
            "gulab jamun", "gulab jamoon", "kala jamun", "angur jamun",
            "bellam jalebi with rabdi - live counter"
        ],
        "image_url": "/images/dishes/gulab_jamun.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 15.0,
    },
    "Rasgulla": {
        "category": "Dessert",
        "aliases": [
            "rasgulla", "baked mango rasgulla", "kesar rasgulla", "sponge rasgulla"
        ],
        "image_url": "/images/dishes/rasgulla.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 10.0,
    },
    "Moong Dal Halwa": {
        "category": "Dessert",
        "aliases": [
            "moong dal halwa", "moong dal halwa / sheera", "ephemeral halwa", "halwa"
        ],
        "image_url": "/images/dishes/moong_dal_halwa.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 12.0,
    },
    "Curd Rice": {
        "category": "Rice",
        "aliases": [
            "curd rice", "curd", "daddojanam", "bagala bath"
        ],
        "image_url": "/images/dishes/curd_rice.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 15.0,
    },
    "Fish Curry": {
        "category": "Non-Veg Curry",
        "aliases": [
            "fish curry", "nellore chepala pulusu", "chepala pulusu", "crispy fish fingers"
        ],
        "image_url": "/images/dishes/fish_curry.jpg",
        "food_type": "Non-Veg",
        "standard_batch_kg": 15.0,
    },
    "Babycorn 65": {
        "category": "Starters",
        "aliases": [
            "babycorn 65", "baby corn 65", "crispy babycorn"
        ],
        "image_url": "/images/dishes/starters.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 10.0,
    },
    "Paneer Tikka": {
        "category": "Starters",
        "aliases": [
            "paneer tikka", "lal mirch ka paneer tikka", "tandoori paneer tikka"
        ],
        "image_url": "/images/dishes/paneer_tikka.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 12.0,
    },
    "Samosa / Pakoda": {
        "category": "Snacks",
        "aliases": [
            "samosa / pakoda", "cabbage pakoda", "whole mirchi bhajji", "hara bhara kebab",
            "jalapeno cheese parcels"
        ],
        "image_url": "/images/dishes/snacks.jpg",
        "food_type": "Veg",
        "standard_batch_kg": 10.0,
    },
}

# Reverse index of alias -> Canonical Name
ALIAS_TO_CANONICAL: Dict[str, str] = {}
for canonical, meta in CANONICAL_DISH_CATALOG.items():
    ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for alias in meta["aliases"]:
        ALIAS_TO_CANONICAL[alias.lower()] = canonical


def clean_dish_string(raw_name: str) -> str:
    """
    Cleans raw dish text: removes superfluous parentheses, counters, and extra spaces.
    e.g. 'ASSORTED PICKLE ( 02 TYPES )' -> 'assorted pickle'
         'BELLAM JALEBI WITH RABDI - LIVE COUNTER' -> 'bellam jalebi with rabdi'
    """
    if not raw_name:
        return ""
    s = raw_name.strip().lower()
    # Remove parenthetical counts
    s = re.sub(r"\(\s*\d+\s*(?:types?|items?|varieties?)?\s*\)", "", s)
    # Remove trailing live counter tags
    s = re.sub(r"-\s*live\s*counter.*", "", s)
    # Remove excess punctuation
    s = re.sub(r"[\t\r\n]+", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip()


def resolve_canonical_dish(raw_dish_name: Optional[str]) -> Dict[str, Any]:
    """
    Safely resolves any raw dish name to a canonical dish profile.
    Rule 1: Direct match in alias map.
    Rule 2: Normalized cleaned match.
    Rule 3: Partial keyword match against canonical names.
    Rule 4: Fallback to Title-Cased cleaned name (preserves real distinct item).
    """
    if not raw_dish_name or not raw_dish_name.strip():
        return {
            "canonical_name": "Unspecified Dish",
            "original_name": raw_dish_name or "",
            "category": "Other",
            "food_type": "Veg",
            "image_url": "/images/dishes/default_dish.jpg",
            "is_canonical": False,
            "match_confidence": 0.0,
        }

    raw_clean = raw_dish_name.strip()
    raw_lower = raw_clean.lower()

    # 1. Exact match in alias index
    if raw_lower in ALIAS_TO_CANONICAL:
        c_name = ALIAS_TO_CANONICAL[raw_lower]
        meta = CANONICAL_DISH_CATALOG[c_name]
        return {
            "canonical_name": c_name,
            "canonical_dish": c_name,
            "original_name": raw_clean,
            "category": meta["category"],
            "food_type": meta["food_type"],
            "image_url": meta["image_url"],
            "is_canonical": True,
            "match_confidence": 1.0,
        }

    # 2. Cleaned normalized match
    cleaned = clean_dish_string(raw_clean)
    if cleaned in ALIAS_TO_CANONICAL:
        c_name = ALIAS_TO_CANONICAL[cleaned]
        meta = CANONICAL_DISH_CATALOG[c_name]
        return {
            "canonical_name": c_name,
            "canonical_dish": c_name,
            "original_name": raw_clean,
            "category": meta["category"],
            "food_type": meta["food_type"],
            "image_url": meta["image_url"],
            "is_canonical": True,
            "match_confidence": 0.95,
        }

    # 3. Keyword / substring match with high threshold
    for canonical, meta in CANONICAL_DISH_CATALOG.items():
        for alias in meta["aliases"]:
            if alias in cleaned or cleaned in alias:
                # Require significant length match to prevent false merging
                if len(alias) >= 4 and len(cleaned) >= 4:
                    return {
                        "canonical_name": canonical,
                        "canonical_dish": canonical,
                        "original_name": raw_clean,
                        "category": meta["category"],
                        "food_type": meta["food_type"],
                        "image_url": meta["image_url"],
                        "is_canonical": True,
                        "match_confidence": 0.85,
                    }

    # 4. Safe fallback: keep distinct item without incorrect merging
    title_cased = " ".join(w.capitalize() for w in raw_clean.split())
    # Guess basic category from keywords
    guessed_cat = "Main Course"
    tl = raw_lower
    if any(k in tl for k in ["rice", "pulao", "biryani", "khichdi"]):
        guessed_cat = "Rice"
    elif any(k in tl for k in ["roti", "naan", "bread", "kulcha", "paratha", "phulka"]):
        guessed_cat = "Breads"
    elif any(k in tl for k in ["curry", "paneer", "korma", "masala", "gravy"]):
        guessed_cat = "Curry"
    elif any(k in tl for k in ["dal", "sambar", "rasam", "pappu"]):
        guessed_cat = "Dal"
    elif any(k in tl for k in ["halwa", "kheer", "sweet", "jamun", "pudding", "cake", "ice cream", "dessert"]):
        guessed_cat = "Dessert"
    elif any(k in tl for k in ["salad", "raita", "pachadi", "pickle", "chutney"]):
        guessed_cat = "Salad / Accompaniment"
    elif any(k in tl for k in ["tikka", "kebab", "fry", "65", "pakoda", "starter", "snack"]):
        guessed_cat = "Starters"

    is_veg = not any(k in tl for k in ["chicken", "mutton", "fish", "egg", "prawn", "crab", "meat"])

    return {
        "canonical_name": title_cased,
        "canonical_dish": title_cased,
        "original_name": raw_clean,
        "category": guessed_cat,
        "food_type": "Veg" if is_veg else "Non-Veg",
        "image_url": "/images/dishes/default_dish.jpg",
        "is_canonical": False,
        "match_confidence": 0.70,
    }


# Convenience alias for tests and external consumers
normalize_dish_name = resolve_canonical_dish



def audit_record_for_anomalies(record: Any) -> Optional[Dict[str, Any]]:
    """
    Evaluates an AnalyticsRecord or EventFood entry for data integrity anomalies.
    Returns anomaly metadata dict if flagged, or None if valid.
    """
    prep = float(getattr(record, "actual_production_kg", 0.0) or 0.0)
    waste = float(getattr(record, "total_waste_kg", 0.0) or 0.0)
    pax = int(getattr(record, "pax", 0) or 0)
    cost = float(getattr(record, "waste_cost", 0.0) or 0.0)
    dish = getattr(record, "dish_name", "Unknown Dish")
    event = getattr(record, "event_name", "Unknown Event")
    hotel = getattr(record, "hotel_name", "Unknown Hotel")
    rec_id = getattr(record, "id", None)

    # Flag 1: Waste exceeds preparation (physical impossibility)
    if prep > 0 and waste > (prep * 1.05):
        return {
            "record_id": rec_id,
            "dish_name": dish,
            "event_name": event,
            "hotel_name": hotel,
            "flag_reason": f"Waste ({waste:.1f} kg) exceeds prepared quantity ({prep:.1f} kg).",
            "severity": "Critical",
            "review_status": "Needs Review",
            "impact": "Distorts waste percentage over 100%.",
        }

    # Flag 2: Negative waste or negative production
    if waste < 0 or prep < 0:
        return {
            "record_id": rec_id,
            "dish_name": dish,
            "event_name": event,
            "hotel_name": hotel,
            "flag_reason": f"Negative value recorded (prep: {prep} kg, waste: {waste} kg).",
            "severity": "Critical",
            "review_status": "Needs Review",
            "impact": "Corrupts arithmetic totals.",
        }

    # Flag 3: Severe outlier (waste rate > 80% on significant volume)
    if prep >= 15.0 and waste >= 15.0 and (waste / prep) > 0.80:
        return {
            "record_id": rec_id,
            "dish_name": dish,
            "event_name": event,
            "hotel_name": hotel,
            "flag_reason": f"Extreme discard rate ({(waste/prep*100):.1f}% on {prep:.1f} kg prep).",
            "severity": "Attention",
            "review_status": "Valid",  # Still valid empirical record, but highlighted
            "impact": "High operational loss requiring chef review.",
        }

    # Flag 4: Zero headcount with large prep
    if pax <= 0 and prep >= 20.0:
        return {
            "record_id": rec_id,
            "dish_name": dish,
            "event_name": event,
            "hotel_name": hotel,
            "flag_reason": f"Zero guest count recorded for large production batch ({prep:.1f} kg).",
            "severity": "Attention",
            "review_status": "Needs Review",
            "impact": "Per-guest intake metrics cannot be calculated.",
        }

    return None
