import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from app.config import settings
from app.utils.security import hash_password
from app.models.hotel import Hotel
from app.models.user import User
from app.models.food_item import FoodItem
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.waste_scan import WasteScan
from app.services.cost_engine import FoodCostService

def seed_database(db: Session) -> None:
    existing_hotel = db.query(Hotel).first()
    if existing_hotel:
        from ai.food_classes import sync_food_catalog_for_hotel
        sync_food_catalog_for_hotel(db, existing_hotel.id)
        # Ensure admin user exists with configured settings
        admin = db.query(User).filter(User.email == settings.DEMO_EMAIL).first()
        if not admin:
            admin = User(
                name="Gandhaar Joshi",
                email=settings.DEMO_EMAIL,
                password_hash=hash_password(settings.DEMO_PASSWORD),
                role="admin",
                hotel_id=existing_hotel.id,
                is_active=True
            )
            db.add(admin)

        # Ensure test accounts exist with demo password
        for test_email in ["test@platesight", "test@platesight.in"]:
            t_user = db.query(User).filter(User.email == test_email).first()
            if not t_user:
                t_user = User(
                    name="Test Account",
                    email=test_email,
                    password_hash=hash_password(settings.DEMO_PASSWORD),
                    role="admin",
                    hotel_id=existing_hotel.id,
                    is_active=True
                )
                db.add(t_user)
            else:
                t_user.is_active = True
                t_user.failed_login_attempts = 0
                t_user.locked_until = None
        db.commit()
        return

    print("Seeding database with Dolphin Hotels, staff, ingredients, recipes, and AI waste scans...")

    # 1. Hotel
    hotel = Hotel(
        name=settings.DEMO_HOTEL_NAME,
        address="Beach Road, Sector 4, Visakhapatnam, Andhra Pradesh, India"
    )
    db.add(hotel)
    db.flush()

    # 2. Admin User
    admin_user = User(
        name="Gandhaar Joshi",
        email=settings.DEMO_EMAIL,
        password_hash=hash_password(settings.DEMO_PASSWORD),
        role="admin",
        hotel_id=hotel.id,
        is_active=True
    )
    db.add(admin_user)
    db.flush()

    # 3. Ingredients with Unit Costs
    ingredients_data = [
        ("Basmati Rice", "kg", 80.0),
        ("Fresh Chicken", "kg", 220.0),
        ("Malai Paneer", "kg", 380.0),
        ("Desi Ghee & Butter", "kg", 550.0),
        ("Refined Sunflower Oil", "l", 140.0),
        ("Yellow Moong & Toor Dal", "kg", 130.0),
        ("Whole Black Urad Dal", "kg", 150.0),
        ("Farm Fresh Onions", "kg", 35.0),
        ("Ripe Red Tomatoes", "kg", 40.0),
        ("Ginger & Garlic Paste", "kg", 180.0),
        ("Fresh Dairy Cream", "l", 260.0),
        ("Garam Masala & Saffron Spices", "kg", 850.0),
        ("Chakki Atta & Maida", "kg", 45.0),
        ("Khoya & Whole Milk", "kg", 320.0),
        ("Refined Sugar", "kg", 42.0),
    ]

    ing_map = {}
    for name, unit, cost in ingredients_data:
        ing = Ingredient(
            hotel_id=hotel.id,
            name=name,
            unit=unit,
            cost_per_unit=cost
        )
        db.add(ing)
        db.flush()
        ing_map[name] = ing

    # 4. Food Items with Estimation Parameters (Section 9)
    # Density g/cm³, depth cm, calibration
    foods_data = [
        ("Biryani", "Main Course", 0.85, 4.0, 1.0, 180.0),
        ("Paneer Butter Masala", "Curry", 1.05, 3.5, 1.0, 320.0),
        ("Dal Tadka", "Dal", 1.02, 3.0, 1.0, 130.0),
        ("Steamed Basmati Rice", "Rice", 0.90, 3.5, 1.0, 80.0),
        ("Gulab Jamun", "Dessert", 1.10, 2.5, 1.0, 260.0),
        ("Butter Naan", "Bread", 0.45, 2.0, 1.0, 120.0),
    ]

    food_map = {}
    for name, cat, density, depth, calib, default_cost in foods_data:
        fi = FoodItem(
            hotel_id=hotel.id,
            name=name,
            category=cat,
            default_unit="kg",
            default_cost_per_kg=default_cost,
            density_g_per_cm3=density,
            default_depth_cm=depth,
            calibration_factor=calib,
            min_estimated_weight_g=20.0,
            max_estimated_weight_g=25000.0,
        )
        db.add(fi)
        db.flush()
        food_map[name] = fi

    # 5. Recipes & Ingredients
    # Biryani Recipe: 10,000 g yield
    biryani_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Biryani"].id,
        name="Signature Dum Biryani Recipe",
        expected_yield_grams=10000.0,
        notes="Standard 10kg batch cooked in sealed degh."
    )
    db.add(biryani_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=biryani_recipe.id, ingredient_id=ing_map["Basmati Rice"].id, quantity=3.5, unit="kg"),
        RecipeIngredient(recipe_id=biryani_recipe.id, ingredient_id=ing_map["Fresh Chicken"].id, quantity=4.5, unit="kg"),
        RecipeIngredient(recipe_id=biryani_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.6, unit="kg"),
        RecipeIngredient(recipe_id=biryani_recipe.id, ingredient_id=ing_map["Farm Fresh Onions"].id, quantity=1.5, unit="kg"),
        RecipeIngredient(recipe_id=biryani_recipe.id, ingredient_id=ing_map["Garam Masala & Saffron Spices"].id, quantity=0.2, unit="kg"),
    ])

    # Paneer Butter Masala Recipe: 6,000 g yield
    paneer_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Paneer Butter Masala"].id,
        name="Shahi Paneer Butter Masala Recipe",
        expected_yield_grams=6000.0,
        notes="Rich cashew-tomato gravy with butter."
    )
    db.add(paneer_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=paneer_recipe.id, ingredient_id=ing_map["Malai Paneer"].id, quantity=3.0, unit="kg"),
        RecipeIngredient(recipe_id=paneer_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.8, unit="kg"),
        RecipeIngredient(recipe_id=paneer_recipe.id, ingredient_id=ing_map["Fresh Dairy Cream"].id, quantity=0.5, unit="l"),
        RecipeIngredient(recipe_id=paneer_recipe.id, ingredient_id=ing_map["Ripe Red Tomatoes"].id, quantity=3.0, unit="kg"),
        RecipeIngredient(recipe_id=paneer_recipe.id, ingredient_id=ing_map["Garam Masala & Saffron Spices"].id, quantity=0.15, unit="kg"),
    ])

    # Dal Tadka Recipe: 5,000 g yield
    dal_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Dal Tadka"].id,
        name="Yellow Dal Double Tadka Recipe",
        expected_yield_grams=5000.0,
        notes="Tempered with cumin, garlic and ghee."
    )
    db.add(dal_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=dal_recipe.id, ingredient_id=ing_map["Yellow Moong & Toor Dal"].id, quantity=2.0, unit="kg"),
        RecipeIngredient(recipe_id=dal_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.4, unit="kg"),
        RecipeIngredient(recipe_id=dal_recipe.id, ingredient_id=ing_map["Ripe Red Tomatoes"].id, quantity=1.0, unit="kg"),
        RecipeIngredient(recipe_id=dal_recipe.id, ingredient_id=ing_map["Farm Fresh Onions"].id, quantity=1.0, unit="kg"),
    ])

    # Rice Recipe: 5,000 g yield
    rice_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Steamed Basmati Rice"].id,
        name="Steamed Long Grain Basmati Recipe",
        expected_yield_grams=5000.0
    )
    db.add(rice_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=rice_recipe.id, ingredient_id=ing_map["Basmati Rice"].id, quantity=2.5, unit="kg"),
        RecipeIngredient(recipe_id=rice_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.1, unit="kg"),
    ])

    # Gulab Jamun Recipe: 4,000 g yield
    jamun_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Gulab Jamun"].id,
        name="Mawa Gulab Jamun in Rose Syrup",
        expected_yield_grams=4000.0
    )
    db.add(jamun_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=jamun_recipe.id, ingredient_id=ing_map["Khoya & Whole Milk"].id, quantity=2.0, unit="kg"),
        RecipeIngredient(recipe_id=jamun_recipe.id, ingredient_id=ing_map["Refined Sugar"].id, quantity=2.0, unit="kg"),
        RecipeIngredient(recipe_id=jamun_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.5, unit="kg"),
    ])

    # Butter Naan Recipe: 3,500 g yield
    naan_recipe = Recipe(
        hotel_id=hotel.id,
        food_item_id=food_map["Butter Naan"].id,
        name="Tandoori Butter Naan Recipe",
        expected_yield_grams=3500.0
    )
    db.add(naan_recipe)
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=naan_recipe.id, ingredient_id=ing_map["Chakki Atta & Maida"].id, quantity=3.0, unit="kg"),
        RecipeIngredient(recipe_id=naan_recipe.id, ingredient_id=ing_map["Desi Ghee & Butter"].id, quantity=0.5, unit="kg"),
    ])

    db.commit()

    from ai.food_classes import sync_food_catalog_for_hotel
    sync_food_catalog_for_hotel(db, hotel.id)
    db.commit()
    print("Database seeding completed successfully with master catalog recipes and AI food classes.")
