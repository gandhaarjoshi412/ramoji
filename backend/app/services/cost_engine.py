from typing import Optional
from sqlalchemy.orm import Session
from app.models.recipe import Recipe
from app.models.food_item import FoodItem

class FoodCostService:
    @staticmethod
    def calculate_recipe_cost(recipe: Recipe) -> float:
        """
        Calculates total batch ingredient cost for a recipe.
        Sums: ingredient.cost_per_unit * quantity.
        Normalizes units:
        If ingredient unit is 'kg' and recipe ingredient unit is 'g', divides by 1000.
        If ingredient unit is 'l' and recipe ingredient unit is 'ml', divides by 1000.
        """
        total_batch_cost = 0.0
        for item in recipe.ingredients:
            ing = item.ingredient
            if not ing:
                continue

            cost_per_unit = float(ing.cost_per_unit or 0.0)
            qty = float(item.quantity or 0.0)
            ing_unit = (ing.unit or "kg").lower().strip()
            item_unit = (item.unit or "kg").lower().strip()

            # Unit conversion to ingredient base unit
            multiplier = 1.0
            if ing_unit in ["kg", "kilogram"] and item_unit in ["g", "gram", "grams"]:
                multiplier = 0.001
            elif ing_unit in ["l", "liter", "litre"] and item_unit in ["ml", "milliliter"]:
                multiplier = 0.001
            elif ing_unit in ["g", "gram"] and item_unit in ["kg", "kilogram"]:
                multiplier = 1000.0

            total_batch_cost += (qty * multiplier) * cost_per_unit

        return round(total_batch_cost, 2)

    @staticmethod
    def calculate_cost_per_gram(recipe: Recipe) -> float:
        """
        recipe_cost_per_gram = total_recipe_ingredient_cost / expected_yield_grams
        """
        if not recipe.expected_yield_grams or recipe.expected_yield_grams <= 0:
            return 0.0

        batch_cost = FoodCostService.calculate_recipe_cost(recipe)
        cost_per_g = batch_cost / float(recipe.expected_yield_grams)
        return round(cost_per_g, 4)

    @staticmethod
    def get_cost_per_gram_for_food(db: Session, food_item: FoodItem) -> float:
        """
        Retrieves cost per gram from linked recipe.
        If no recipe exists, falls back to default_cost_per_kg / 1000.0.
        """
        if food_item.recipe:
            return FoodCostService.calculate_cost_per_gram(food_item.recipe)

        if food_item.default_cost_per_kg > 0:
            return round(food_item.default_cost_per_kg / 1000.0, 4)

        return 0.15  # Fallback default ₹0.15/g (₹150/kg)

    @staticmethod
    def calculate_estimated_waste_cost(weight_grams: float, cost_per_gram: float) -> float:
        """
        estimated_waste_cost = estimated_weight_grams * recipe_cost_per_gram
        """
        if weight_grams < 0 or cost_per_gram < 0:
            raise ValueError("Weight and cost per gram cannot be negative.")
        return round(weight_grams * cost_per_gram, 2)
