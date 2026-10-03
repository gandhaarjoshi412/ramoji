"""
Re-export food classes catalog and helper methods from ai.food_classes.
Supports both `from app.ai.food_classes import ...` and `from ai.food_classes import ...`.
"""
from ai.food_classes import (
    YOLO11M_SEG_CLASSES,
    DET_TO_SEG_MAP,
    DET_DISPLAY_NAMES,
    normalize_label,
    resolve_food_metadata,
    sync_food_catalog_for_hotel,
)

__all__ = [
    "YOLO11M_SEG_CLASSES",
    "DET_TO_SEG_MAP",
    "DET_DISPLAY_NAMES",
    "normalize_label",
    "resolve_food_metadata",
    "sync_food_catalog_for_hotel",
]
