from app.models.hotel import Hotel
from app.models.user import User
from app.models.food_item import FoodItem
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.waste_scan import WasteScan

__all__ = [
    "Hotel",
    "User",
    "FoodItem",
    "Event",
    "EventFood",
    "WasteRecord",
    "Ingredient",
    "Recipe",
    "RecipeIngredient",
    "WasteScan",
]
