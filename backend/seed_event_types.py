import os
import sys
from datetime import date, datetime, timezone
import sqlite3

def seed_event_types_data(db_path="food_waste.db"):
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Check if we already seeded these wedding and conference events
    c.execute("SELECT count(*) FROM analytics_records WHERE event_type IN ('Wedding', 'Conference')")
    existing_count = c.fetchone()[0]
    if existing_count > 20:
        print(f"Already found {existing_count} Wedding/Conference analytics records in {db_path}. Skipping duplicate seed.")
        conn.close()
        return

    # Check hotels
    c.execute("SELECT id, name FROM hotels")
    hotels = {name: hid for hid, name in c.fetchall()}
    dolphin_id = hotels.get("Dolphin Hotels", 1)
    sahara_id = hotels.get("Hotel Sahara", 2)
    sitara_id = hotels.get("Hotel Sitara", 3)

    # 2. Events definition
    events_data = [
        # WEDDING EVENTS
        {
            "name": "Royal Rajputana Wedding Reception",
            "hotel_id": sitara_id,
            "hotel_name": "Hotel Sitara",
            "event_type": "Wedding",
            "event_subtype": "Grand Reception",
            "venue": "Royal Regal Ballroom",
            "service_format": "Buffet & Live Stations",
            "event_date": "2026-10-04",
            "expected_guests": 450,
            "actual_guests": 450,
            "status": "Completed",
            "notes": "Premium wedding banquet buffet with live chaat and tandoor counters.",
            "dishes": [
                # EATEN MORE (High Demand)
                ("Awadhi Chicken Biryani", "Main Course", "Non-Veg", 320.0, 95.0, 92.5, 2.5),
                ("Paneer Butter Masala", "Main Course", "Veg", 280.0, 80.0, 76.5, 3.5),
                ("Live Chaat Counter - Pani Puri & Dahi Papdi", "Starters", "Veg", 150.0, 60.0, 59.0, 1.0),
                ("Amritsari Fish Tikka", "Starters", "Non-Veg", 350.0, 70.0, 66.5, 3.5),
                ("Kesari Rasmalai with Saffron", "Desserts", "Veg", 300.0, 55.0, 53.8, 1.2),
                ("Hot Gulab Jamun with Rabdi", "Desserts", "Veg", 250.0, 50.0, 47.5, 2.5),
                ("Dal Makhani Bukhara", "Main Course", "Veg", 220.0, 75.0, 69.0, 6.0),
                ("Butter Naan & Garlic Kulcha", "Rice & Breads", "Veg", 180.0, 65.0, 57.0, 8.0),
                # EATEN LESS (Low Demand / Over-prepared)
                ("Mixed Farm Fresh Green Salad", "Salads", "Veg", 110.0, 35.0, 15.5, 19.5),
                ("Karela & Tindora Masala Fry", "Main Course", "Veg", 160.0, 25.0, 10.0, 15.0),
                ("Plain Steamed Basmati Rice", "Rice & Breads", "Veg", 90.0, 50.0, 23.5, 26.5),
                ("Lauki Kofta Curry", "Main Course", "Veg", 150.0, 30.0, 13.5, 16.5),
            ]
        },
        {
            "name": "Destination Palace Sangeet Dinner",
            "hotel_id": sitara_id,
            "hotel_name": "Hotel Sitara",
            "event_type": "Wedding",
            "event_subtype": "Sangeet Night",
            "venue": "Palace Courtyard & Poolside",
            "service_format": "Buffet",
            "event_date": "2026-10-03",
            "expected_guests": 320,
            "actual_guests": 320,
            "status": "Completed",
            "notes": "Pre-wedding celebration with heavy finger foods and live counters.",
            "dishes": [
                # EATEN MORE
                ("Mutton Galouti Kebab with Sheermal", "Starters", "Non-Veg", 380.0, 55.0, 53.5, 1.5),
                ("Tandoori Paneer Malai Tikka", "Starters", "Veg", 290.0, 60.0, 57.5, 2.5),
                ("Hyderabadi Dum Biryani", "Main Course", "Non-Veg", 310.0, 75.0, 72.0, 3.0),
                ("Moong Dal Halwa Desi Ghee", "Desserts", "Veg", 280.0, 45.0, 43.5, 1.5),
                ("Cheese Stuffed Mushroom Caps", "Starters", "Veg", 260.0, 40.0, 38.0, 2.0),
                # EATEN LESS
                ("Russian Salad with Mayonnaise", "Salads", "Veg", 140.0, 28.0, 12.0, 16.0),
                ("Mixed Vegetable Jalfrezi", "Main Course", "Veg", 170.0, 35.0, 16.5, 18.5),
                ("Jeera Rice", "Rice & Breads", "Veg", 100.0, 40.0, 19.0, 21.0),
            ]
        },
        {
            "name": "Aditya's Royal Wedding Banquet",
            "hotel_id": dolphin_id,
            "hotel_name": "Dolphin Hotels",
            "event_type": "Wedding",
            "event_subtype": "Wedding Feast",
            "venue": "Grand Horizon Hall",
            "service_format": "Buffet",
            "event_date": "2026-10-08",
            "expected_guests": 280,
            "actual_guests": 280,
            "status": "Completed",
            "notes": "Family banquet for Aditya's wedding celebration.",
            "dishes": [
                # EATEN MORE
                ("Butter Chicken Delhi Style", "Main Course", "Non-Veg", 330.0, 65.0, 62.5, 2.5),
                ("Paneer Lababdar", "Main Course", "Veg", 270.0, 55.0, 52.0, 3.0),
                ("Kolkata Khati Roll Counter", "Starters", "Non-Veg", 220.0, 48.0, 46.5, 1.5),
                ("Shahi Tukda with Rabdi", "Desserts", "Veg", 260.0, 40.0, 38.5, 1.5),
                # EATEN LESS
                ("Spiced Cabbage Poriyal", "Main Course", "Veg", 120.0, 25.0, 11.0, 14.0),
                ("Plain Naan Bread", "Rice & Breads", "Veg", 130.0, 45.0, 22.0, 23.0),
                ("Boondi Raita", "Salads", "Veg", 90.0, 30.0, 15.0, 15.0),
            ]
        },
        # CONFERENCE EVENTS
        {
            "name": "Global AI & Tech Symposium",
            "hotel_id": dolphin_id,
            "hotel_name": "Dolphin Hotels",
            "event_type": "Conference",
            "event_subtype": "Tech Summit",
            "venue": "Convention Hall A",
            "service_format": "Buffet",
            "event_date": "2026-10-06",
            "expected_guests": 380,
            "actual_guests": 380,
            "status": "Completed",
            "notes": "International technology conference lunch and tea break.",
            "dishes": [
                # EATEN MORE
                ("South Indian Filter Coffee & Artisanal Tea", "Beverages", "Veg", 120.0, 60.0, 58.5, 1.5),
                ("Penne Pasta with Sun-Dried Tomatoes - Live", "Main Course", "Veg", 240.0, 75.0, 71.5, 3.5),
                ("Gourmet Mini Sandwiches & Wraps", "Starters", "Veg", 210.0, 45.0, 42.8, 2.2),
                ("Cut Fresh Seasonal Fruit Platter", "Desserts", "Veg", 180.0, 40.0, 38.2, 1.8),
                ("Vegetable Hakka Noodles", "Main Course", "Veg", 190.0, 65.0, 60.5, 4.5),
                ("Paneer Tikka Kathi Rolls", "Starters", "Veg", 250.0, 50.0, 46.5, 3.5),
                # EATEN LESS
                ("Heavy Mutton Rogan Josh", "Main Course", "Non-Veg", 350.0, 45.0, 21.0, 24.0),
                ("Extra Multi-Grain Bread Rolls", "Rice & Breads", "Veg", 140.0, 30.0, 12.0, 18.0),
                ("Steamed Rice & Sambhar", "Rice & Breads", "Veg", 110.0, 55.0, 28.0, 27.0),
                ("Fried Cocktail Samosas", "Starters", "Veg", 130.0, 40.0, 20.0, 20.0),
            ]
        },
        {
            "name": "South Asia Healthcare Leadership Summit",
            "hotel_id": sahara_id,
            "hotel_name": "Hotel Sahara",
            "event_type": "Conference",
            "event_subtype": "Medical Conclave",
            "venue": "Imperial Hall",
            "service_format": "Buffet",
            "event_date": "2026-10-01",
            "expected_guests": 260,
            "actual_guests": 260,
            "status": "Completed",
            "notes": "Medical leaders convention with healthy dining options.",
            "dishes": [
                # EATEN MORE
                ("Herb Grilled Chicken Breast", "Main Course", "Non-Veg", 340.0, 55.0, 52.0, 3.0),
                ("Exotic Sauteed Greens & Broccoli", "Main Course", "Veg", 220.0, 45.0, 42.5, 2.5),
                ("Greek Salad with Feta & Olives", "Salads", "Veg", 200.0, 35.0, 33.2, 1.8),
                ("Sugar-Free Fruit Custard & Jelly", "Desserts", "Veg", 190.0, 40.0, 38.0, 2.0),
                # EATEN LESS
                ("Deep Fried Poori with Aloo", "Rice & Breads", "Veg", 120.0, 35.0, 15.0, 20.0),
                ("Creamy Malai Kofta", "Main Course", "Veg", 240.0, 40.0, 18.5, 21.5),
                ("Extra Plain White Bread", "Rice & Breads", "Veg", 100.0, 25.0, 10.0, 15.0),
            ]
        },
        {
            "name": "National Renewable Energy Convention",
            "hotel_id": sitara_id,
            "hotel_name": "Hotel Sitara",
            "event_type": "Conference",
            "event_subtype": "Energy Forum",
            "venue": "Lotus Convention Center",
            "service_format": "Buffet",
            "event_date": "2026-09-24",
            "expected_guests": 420,
            "actual_guests": 420,
            "status": "Completed",
            "notes": "3-day energy conference delegates lunch banquet.",
            "dishes": [
                # EATEN MORE
                ("Tandoori Soya Chaap Tikka", "Starters", "Veg", 220.0, 60.0, 57.0, 3.0),
                ("Vegetable Biryani with Burani Raita", "Main Course", "Veg", 210.0, 80.0, 74.0, 6.0),
                ("High Protein Lentil Soup Counter", "Starters", "Veg", 140.0, 50.0, 47.5, 2.5),
                ("Fresh Fruit Tartlets", "Desserts", "Veg", 230.0, 45.0, 42.5, 2.5),
                # EATEN LESS
                ("Oily Chana Masala", "Main Course", "Veg", 130.0, 45.0, 20.0, 25.0),
                ("Bhature & Extra Fried Breads", "Rice & Breads", "Veg", 150.0, 40.0, 18.0, 22.0),
                ("Onion & Cucumber Salad", "Salads", "Veg", 80.0, 30.0, 14.0, 16.0),
            ]
        }
    ]

    now_iso = datetime.now(timezone.utc).isoformat()

    for ev_data in events_data:
        # Check if event exists in events table
        c.execute("SELECT id FROM events WHERE name = ? AND event_date = ?", (ev_data["name"], ev_data["event_date"]))
        row = c.fetchone()
        if row:
            event_id = row[0]
            # Update event_type and details
            c.execute("""
                UPDATE events SET event_type = ?, expected_guests = ?, actual_guests = ?, status = ?
                WHERE id = ?
            """, (ev_data["event_type"], ev_data["expected_guests"], ev_data["actual_guests"], ev_data["status"], event_id))
        else:
            c.execute("""
                INSERT INTO events (hotel_id, name, event_type, venue, event_date, expected_guests, actual_guests, status, notes, is_archived, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, (
                ev_data["hotel_id"],
                ev_data["name"],
                ev_data["event_type"],
                ev_data["venue"],
                ev_data["event_date"],
                ev_data["expected_guests"],
                ev_data["actual_guests"],
                ev_data["status"],
                ev_data["notes"],
                now_iso,
                now_iso
            ))
            event_id = c.lastrowid

        # Insert AnalyticsRecords for each dish
        for d_name, d_cat, f_type, cost_kg, prep_kg, cons_kg, waste_kg in ev_data["dishes"]:
            waste_cost = round(waste_kg * cost_kg, 2)
            waste_pct = round((waste_kg / prep_kg * 100.0) if prep_kg > 0 else 0.0, 2)
            pax = ev_data["actual_guests"]
            waste_per_head_g = round((waste_kg / pax * 1000.0) if pax > 0 else 0.0, 1)
            cons_per_head_g = round((cons_kg / pax * 1000.0) if pax > 0 else 0.0, 1)
            prod_per_head_g = round((prep_kg / pax * 1000.0) if pax > 0 else 0.0, 1)

            c.execute("""
                INSERT INTO analytics_records (
                    hotel_id, hotel_name, event_id, event_name, event_type, event_subtype, service_type,
                    session, record_date, pax, dish_name, dish_category, food_type, uom, item_cost,
                    actual_production_kg, actual_consumption_kg, total_leftover_kg, location_buffet_return_kg,
                    reuse_quantity_kg, total_waste_kg, other_disposition_kg, reconciliation_variance_kg,
                    waste_cost, waste_percentage, waste_per_head_grams, consumption_per_head_grams, production_per_head_grams,
                    reuse_percentage, notes, data_source, is_verified, is_archived, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    0.0, ?, 0.0, 0.0,
                    ?, ?, ?, ?, ?,
                    0.0, ?, ?, 1, 0, ?, ?
                )
            """, (
                ev_data["hotel_id"],
                ev_data["hotel_name"],
                event_id,
                ev_data["name"],
                ev_data["event_type"],
                ev_data["event_subtype"],
                ev_data["service_format"],
                "Dinner" if "Dinner" in ev_data["name"] or "Reception" in ev_data["name"] else "Lunch",
                ev_data["event_date"],
                pax,
                d_name,
                d_cat,
                f_type,
                "Kg",
                cost_kg,
                prep_kg,
                cons_kg,
                waste_kg,
                waste_kg,
                waste_kg,
                waste_cost,
                waste_pct,
                waste_per_head_g,
                cons_per_head_g,
                prod_per_head_g,
                f"Verified banquet shift record for {ev_data['name']}",
                "Banquet Audit",
                now_iso,
                now_iso
            ))

    # Also make sure "aditya's event" (event id 2) is mapped to Wedding with appropriate guests
    c.execute("UPDATE events SET expected_guests = 280, actual_guests = 280 WHERE id = 2 AND name LIKE '%aditya%'")

    conn.commit()
    conn.close()
    print("Successfully seeded Wedding and Conference banquet records!")

if __name__ == "__main__":
    db = sys.argv[1] if len(sys.argv) > 1 else "food_waste.db"
    seed_event_types_data(db)
