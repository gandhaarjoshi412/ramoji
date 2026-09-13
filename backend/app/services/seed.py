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

def create_demo_food_image(filename: str, title: str, color: tuple):
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = upload_dir / filename
    if filepath.exists():
        return f"/uploads/{filename}"

    # Generate realistic banquet food buffet photo placeholder
    img = Image.new("RGB", (800, 600), color=color)
    draw = ImageDraw.Draw(img)
    # Draw serving dish plate border
    draw.ellipse([80, 60, 720, 540], outline=(240, 240, 240), width=12)
    draw.ellipse([100, 80, 700, 520], fill=(color[0] + 15, color[1] + 10, color[2] + 10))
    # Draw title text
    draw.text((250, 280), f"Banquet Dish:\n{title}", fill=(255, 255, 255))
    img.save(filepath, "JPEG")
    return f"/uploads/{filename}"

def seed_database(db: Session) -> None:
    existing_hotel = db.query(Hotel).first()
    if existing_hotel:
        return

    print("Seeding database with Dolphin Hotels, staff, ingredients, recipes, and AI waste scans...")

    # 1. Hotel
    hotel = Hotel(
        name=settings.DEMO_HOTEL_NAME,
        address="Beach Road, Sector 4, Visakhapatnam, Andhra Pradesh, India"
    )
    db.add(hotel)
    db.flush()

    # 2. Staff & Admin Users
    admin_user = User(
        name="Banquet Operations Manager",
        email=settings.DEMO_EMAIL,
        password_hash=hash_password(settings.DEMO_PASSWORD),
        role="admin",
        hotel_id=hotel.id
    )
    staff_user = User(
        name="Kitchen Steward Staff",
        email="staff@example.com",
        password_hash=hash_password("staff123"),
        role="staff",
        hotel_id=hotel.id
    )
    db.add_all([admin_user, staff_user])
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

    # 6. Realistic Events
    # Event 1: Sharma Wedding
    wedding = Event(
        hotel_id=hotel.id,
        name="Sharma Wedding",
        event_type="Wedding",
        venue="Grand Ballroom",
        event_date=date(2026, 9, 12),
        expected_guests=500,
        actual_guests=467,
        status="Completed",
        notes="Grand evening wedding reception with live tandoor and dinner buffet."
    )
    # Event 2: Corporate Annual Dinner
    corp = Event(
        hotel_id=hotel.id,
        name="Corporate Annual Dinner",
        event_type="Corporate",
        venue="Summit Hall",
        event_date=date(2026, 9, 8),
        expected_guests=250,
        actual_guests=230,
        status="Completed",
        notes="Annual tech gala dinner."
    )
    # Event 3: Conference Lunch
    conf = Event(
        hotel_id=hotel.id,
        name="Conference Lunch",
        event_type="Conference",
        venue="Crystal Lounge",
        event_date=date(2026, 9, 4),
        expected_guests=150,
        actual_guests=140,
        status="Completed",
        notes="Medical association lunch buffet."
    )
    # Event 4: Reception Dinner
    reception = Event(
        hotel_id=hotel.id,
        name="Reception Dinner",
        event_type="Social",
        venue="Poolside Lawn",
        event_date=date(2026, 9, 1),
        expected_guests=300,
        actual_guests=285,
        status="Completed",
        notes="Golden anniversary reception."
    )

    db.add_all([wedding, corp, conf, reception])
    db.commit()

    # Add Event Foods
    for ev in [wedding, corp, conf, reception]:
        for fname in ["Biryani", "Paneer Butter Masala", "Dal Tadka", "Steamed Basmati Rice"]:
            ef = EventFood(
                event_id=ev.id,
                food_item_id=food_map[fname].id,
                prepared_weight_kg=80.0 if fname == "Biryani" else 45.0,
                estimated_cost_per_kg=food_map[fname].default_cost_per_kg
            )
            db.add(ef)
    db.commit()

    # 7. Create Demo Images and AI Waste Scans
    # Generate placeholder images for scans
    img_biryani = create_demo_food_image("biryani_waste_scan.jpg", "Biryani Buffet Pan", (180, 90, 40))
    img_paneer = create_demo_food_image("paneer_waste_scan.jpg", "Paneer Handi", (210, 110, 40))
    img_dal = create_demo_food_image("dal_waste_scan.jpg", "Dal Tadka Vessel", (200, 160, 40))
    img_rice = create_demo_food_image("rice_waste_scan.jpg", "Steamed Rice Tray", (190, 190, 190))

    demo_scans = [
        # Sharma Wedding Scans (Total waste ~42.3 kg)
        (wedding.id, "Biryani", 15500.0, 0.96, img_biryani, [120, 100, 680, 500], True, None, None, "Excess buffet preparation"),
        (wedding.id, "Paneer Butter Masala", 9200.0, 0.93, img_paneer, [140, 120, 660, 480], True, None, None, "Low consumption"),
        (wedding.id, "Dal Tadka", 6100.0, 0.91, img_dal, [160, 140, 640, 460], True, None, None, "Service leftover"),
        (wedding.id, "Steamed Basmati Rice", 4800.0, 0.95, img_rice, [100, 80, 700, 520], True, None, None, "Overproduction"),
        (wedding.id, "Gulab Jamun", 3900.0, 0.89, img_biryani, [180, 160, 620, 440], True, None, None, "Serving tray leftover"),
        (wedding.id, "Butter Naan", 2800.0, 0.92, img_paneer, [150, 130, 650, 470], True, None, None, "Cold service bread"),

        # Corporate Annual Dinner Scans
        (corp.id, "Biryani", 7500.0, 0.95, img_biryani, [120, 100, 680, 500], True, None, None, "Excess preparation"),
        (corp.id, "Paneer Butter Masala", 4200.0, 0.92, img_paneer, [140, 120, 660, 480], True, None, None, "Overproduction"),
        (corp.id, "Dal Tadka", 3100.0, 0.94, img_dal, [160, 140, 640, 460], True, None, None, "Service leftover"),

        # Conference Lunch Scans
        (conf.id, "Steamed Basmati Rice", 3200.0, 0.96, img_rice, [100, 80, 700, 520], True, None, None, "Low attendance"),
        (conf.id, "Dal Tadka", 2400.0, 0.90, img_dal, [160, 140, 640, 460], True, None, None, "Service leftover"),

        # Reception Dinner Scans
        (reception.id, "Biryani", 8400.0, 0.97, img_biryani, [120, 100, 680, 500], True, None, None, "Overproduction"),
        (reception.id, "Paneer Butter Masala", 5100.0, 0.94, img_paneer, [140, 120, 660, 480], True, None, None, "Excess preparation"),
    ]

    for ev_id, fname, weight_g, conf, img_url, bbox, verified, human_food, human_weight, notes in demo_scans:
        fi = food_map[fname]
        cost_per_g = FoodCostService.get_cost_per_gram_for_food(db, fi)
        effective_w = human_weight if human_weight is not None else weight_g
        waste_cost = round(effective_w * cost_per_g, 2)

        scan = WasteScan(
            event_id=ev_id,
            food_item_id=fi.id,
            image_url=img_url,
            created_at=datetime.now(timezone.utc) - timedelta(days=(wedding.id - ev_id) * 3),
            ai_food_prediction=fname,
            ai_confidence=conf,
            bounding_box=json.dumps(bbox),
            segmentation_mask=json.dumps([[150, 150], [650, 150], [650, 450], [150, 450]]),
            estimated_weight_grams=weight_g,
            estimation_confidence=0.76,
            measurement_method="camera_estimate",
            cost_per_gram=cost_per_g,
            estimated_waste_cost=waste_cost,
            ai_model_name="YOLO26-seg",
            ai_model_version="food-model-v0.1",
            human_verified=verified,
            human_food_correction=human_food,
            human_weight_correction=human_weight,
            is_low_confidence=conf < 0.70,
            notes=notes
        )
        db.add(scan)

    db.commit()
    print("Database seeding completed successfully with realistic recipes and AI scans.")
