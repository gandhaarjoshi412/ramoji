"""
Synthetic Report Generator for Enterprise Excel Ingestion & Intelligence Testing.
Generates all 8 real-world simulated hotel reports (Fixtures A through H) in openpyxl.
"""
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import date
from typing import Dict, Any

def create_fixture_a_clean() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Grand_Dinner"

    ws.append(["HOTEL GRAND PALACE - CORPORATE ANNUAL DINNER ON 25/08/2026 FOR 350 PAX"])
    ws.append([])
    headers = [
        "Item Name", "Dish Category", "Session", "Pax",
        "Estimated Production", "Actually Cooked Production",
        "Pickup Quantity", "Actually Consumption", "Total Leftover",
        "Reuse Quantity", "Total Waste in Kgs", "Item Cost", "Wastage Cost"
    ]
    ws.append(headers)

    dishes = [
        ("Paneer Tikka", "Starters", 20.0, 18.0, 2.0, 1.0, 1.0, 150.0),
        ("Veg Spring Rolls", "Starters", 15.0, 14.0, 1.0, 0.0, 1.0, 120.0),
        ("Hara Bhara Kebab", "Starters", 15.0, 13.5, 1.5, 0.5, 1.0, 130.0),
        ("Chicken Malai Tikka", "Starters", 25.0, 23.0, 2.0, 1.0, 1.0, 220.0),
        ("Dal Makhani", "Main Course", 40.0, 36.5, 3.5, 1.5, 2.0, 110.0),
        ("Paneer Butter Masala", "Main Course", 35.0, 32.0, 3.0, 1.0, 2.0, 160.0),
        ("Subz Miloni", "Main Course", 25.0, 23.0, 2.0, 1.0, 1.0, 120.0),
        ("Butter Chicken", "Main Course", 45.0, 41.0, 4.0, 2.0, 2.0, 240.0),
        ("Assorted Naan & Roti", "Bread", 30.0, 28.0, 2.0, 1.0, 1.0, 80.0),
        ("Hyderabadi Veg Biryani", "Rice", 35.0, 31.5, 3.5, 1.5, 2.0, 130.0),
        ("Chicken Dum Biryani", "Rice", 45.0, 41.0, 4.0, 2.0, 2.0, 180.0),
        ("Steamed Basmati Rice", "Rice", 20.0, 18.5, 1.5, 0.5, 1.0, 60.0),
        ("Gulab Jamun", "Desserts", 15.0, 13.5, 1.5, 0.5, 1.0, 100.0),
        ("Rasmalai", "Desserts", 20.0, 18.5, 1.5, 0.5, 1.0, 150.0),
        ("Vanilla Ice Cream", "Desserts", 10.0, 9.0, 1.0, 1.0, 0.0, 80.0),
    ]

    for name, cat, prod, cons, left, reuse, waste, cost in dishes:
        w_cost = round(waste * cost, 2)
        ws.append([
            name, cat, "Dinner", 350,
            prod, prod, prod, cons, left, reuse, waste, cost, w_cost
        ])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_b_multisheet() -> bytes:
    wb = openpyxl.Workbook()
    
    # Sheet 1: Banquet_Sahara
    ws1 = wb.active
    ws1.title = "Banquet_Sahara"
    ws1.append(["HOTEL SAHARA - BANQUET EVENT 24/08/2026 FOR 200 PAX"])
    ws1.append(["Session", "Pax", "Name of Items", "Food Prepared", "Consumed Qty", "Leftover", "Reuse", "Wastage", "Unit Cost", "Waste Cost"])
    sahara_items = [
        ("Tomato Soup", 15.0, 14.0, 1.0, 0.0, 1.0, 80.0),
        ("Veg Crispy", 18.0, 16.5, 1.5, 0.5, 1.0, 110.0),
        ("Paneer 65", 22.0, 20.0, 2.0, 1.0, 1.0, 160.0),
        ("Chicken 65", 25.0, 23.0, 2.0, 1.0, 1.0, 200.0),
        ("Kadai Paneer", 28.0, 26.0, 2.0, 0.5, 1.5, 150.0),
        ("Dal Tadka", 20.0, 18.0, 2.0, 0.5, 1.5, 90.0),
        ("Chicken Curry", 30.0, 27.5, 2.5, 0.5, 2.0, 190.0),
        ("Jeera Rice", 24.0, 22.0, 2.0, 0.5, 1.5, 80.0),
        ("Curd Rice", 15.0, 13.5, 1.5, 0.5, 1.0, 70.0),
        ("Tandoori Roti", 18.0, 16.0, 2.0, 0.5, 1.5, 60.0),
        ("Moong Dal Halwa", 15.0, 13.0, 2.0, 0.0, 2.0, 140.0),
        ("Fruit Custard", 10.0, 8.5, 1.5, 0.0, 1.5, 100.0),
    ]
    for name, prod, cons, left, reuse, waste, cost in sahara_items:
        ws1.append(["Dinner", 200, name, prod, cons, left, reuse, waste, cost, waste * cost])

    # Sheet 2: Buffet_Sitara
    ws2 = wb.create_sheet(title="Buffet_Sitara")
    ws2.append(["HOTEL SITARA - BUFFET LUNCH 24/08/2026 FOR 250 PAX"])
    ws2.append(["S.No", "Dish Name", "UOM", "Estimated Cooking", "Total Cooking in Kgs", "Pickup", "Buffet Return", "Kitchen Return", "Actual Consumption", "Reuse", "Waste in Kgs", "Item Cost", "Waste Cost"])
    sitara_items = [
        ("Sweet Corn Soup", "Kg", 20.0, 1.0, 0.5, 18.5, 0.5, 1.0, 90.0),
        ("Veg Cutlet", "Kg", 18.0, 1.0, 0.5, 16.5, 0.5, 1.0, 110.0),
        ("Gobi Manchurian", "Kg", 22.0, 1.0, 1.0, 20.0, 0.5, 1.5, 100.0),
        ("Fish Amritsari", "Kg", 25.0, 1.0, 1.0, 23.0, 0.5, 1.5, 220.0),
        ("Paneer Lababdar", "Kg", 28.0, 1.5, 1.0, 25.5, 1.0, 1.5, 160.0),
        ("Aloo Gobi Masala", "Kg", 20.0, 1.0, 1.0, 18.0, 0.5, 1.5, 90.0),
        ("Mutton Rogan Josh", "Kg", 32.0, 2.0, 1.0, 29.0, 1.0, 2.0, 280.0),
        ("Yellow Dal", "Kg", 20.0, 1.0, 1.0, 18.0, 0.5, 1.5, 80.0),
        ("Veg Pulao", "Kg", 25.0, 1.5, 1.0, 22.5, 1.0, 1.5, 110.0),
        ("Mutton Biryani", "Kg", 35.0, 2.0, 1.0, 32.0, 1.0, 2.0, 250.0),
        ("Phulka", "Kg", 15.0, 1.0, 0.5, 13.5, 0.5, 1.0, 70.0),
        ("Butter Naan", "Kg", 18.0, 1.0, 0.5, 16.5, 0.5, 1.0, 90.0),
        ("Kheer", "Kg", 16.0, 1.0, 1.0, 14.0, 0.5, 1.5, 120.0),
        ("Angoori Jamun", "Kg", 18.0, 1.0, 1.0, 16.0, 0.5, 1.5, 130.0),
        ("Fresh Cut Fruits", "Kg", 8.0, 0.5, 0.5, 7.0, 0.5, 0.5, 110.0),
    ]
    for idx, (name, uom, prod, b_ret, k_ret, cons, reuse, waste, cost) in enumerate(sitara_items, 1):
        ws2.append([idx, name, uom, prod, prod, prod, b_ret, k_ret, cons, reuse, waste, cost, waste * cost])

    # Sheet 3: RoomService_Dolphin
    ws3 = wb.create_sheet(title="RoomService_Dolphin")
    ws3.append(["HOTEL DOLPHIN - ROOM SERVICE BREAKFAST 24/08/2026 FOR 100 PAX"])
    ws3.append(["Food Item", "Shift", "Planned Qty", "Cooked Qty", "Total Waste", "Waste Value"])
    dolphin_items = [
        ("Idli Sambar", "Breakfast", 15.0, 1.0, 120.0),
        ("Medu Vada", "Breakfast", 12.0, 1.0, 140.0),
        ("Masala Dosa", "Breakfast", 14.0, 1.0, 160.0),
        ("Poori Masala", "Breakfast", 10.0, 0.5, 100.0),
        ("Upma", "Breakfast", 8.0, 0.5, 80.0),
        ("Poha", "Breakfast", 8.0, 0.5, 80.0),
        ("Filter Coffee", "Breakfast", 10.0, 1.0, 150.0),
        ("Masala Tea", "Breakfast", 8.0, 0.5, 130.0),
    ]
    for name, shift, prod, waste, cost in dolphin_items:
        ws3.append([name, shift, prod, prod, waste, waste * cost])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_c_multipage_complex() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Wedding_Banquet_5Page"

    # Page 1 Header & Metadata
    ws.append(["HOTEL ROYAL HEIGHTS - ROYAL WEDDING GRAND FEAST FOR 600 PAX ON 25/08/2026"])
    ws.append([])
    col_headers = [
        "S.No", "Name of Items", "Pax", "Estimation Production",
        "Actually Cooked Production", "Pickup Quantity", "Kitchen Leftover",
        "Buffet Return", "Actual Consumption", "Reuse", "Waste in Kgs", "Food Cost", "Waste Cost"
    ]
    ws.append(col_headers)

    # 1. Breakfast (25 dishes: 350 kg prod, 315 cons, 35 left, 15 reuse, 20 waste, 2600 cost)
    for i in range(1, 26):
        prod = 14.0
        cons = 12.6
        left = 1.4
        reuse = 0.6
        waste = 0.8
        cost = 130.0
        ws.append([i, f"Breakfast Dish {i}", 600, prod, prod, prod, 0.8, 0.6, cons, reuse, waste, cost, waste * cost])
    ws.append(["Breakfast Subtotal", None, None, 350.0, 350.0, 350.0, 20.0, 15.0, 315.0, 15.0, 20.0, 130.0, 2600.0])
    ws.append([])

    # 2. Lunch (30 dishes: 600 kg prod, 545 cons, 55 left, 20 reuse, 35 waste, 4550 cost)
    ws.append(col_headers)  # Page 2 repeated header!
    for i in range(1, 31):
        prod = 20.0
        cons = 18.17 if i < 30 else 18.07
        left = 1.83 if i < 30 else 1.93
        reuse = 0.67 if i < 30 else 0.57
        waste = 1.16 if i < 30 else 1.36
        cost = 130.0
        ws.append([i, f"Lunch Dish {i}", 600, prod, prod, prod, 1.0, 0.83, cons, reuse, waste, cost, waste * cost])
    ws.append(["Lunch Subtotal", None, None, 600.0, 600.0, 600.0, 30.0, 25.0, 545.0, 20.0, 35.0, 130.0, 4550.0])
    ws.append([])

    # 3. High Tea / Snacks (20 dishes: 250 kg prod, 225 cons, 25 left, 10 reuse, 15 waste, 1950 cost)
    ws.append(col_headers)  # Page 3 repeated header!
    for i in range(1, 21):
        prod = 12.5
        cons = 11.25
        left = 1.25
        reuse = 0.5
        waste = 0.75
        cost = 130.0
        ws.append([i, f"Hi-Tea Dish {i}", 600, prod, prod, prod, 0.75, 0.5, cons, reuse, waste, cost, waste * cost])
    ws.append(["Snacks Subtotal", None, None, 250.0, 250.0, 250.0, 15.0, 10.0, 225.0, 10.0, 15.0, 130.0, 1950.0])
    ws.append([])

    # 4. Dinner (35 dishes: 750 kg prod, 680 cons, 70 left, 25 reuse, 45 waste, 5850 cost)
    ws.append(col_headers)  # Page 4 repeated header!
    for i in range(1, 36):
        prod = 21.43 if i < 35 else 21.38
        cons = 19.43 if i < 35 else 19.38
        left = 2.0
        reuse = 0.71 if i < 35 else 0.86
        waste = 1.29 if i < 35 else 1.14
        cost = 130.0
        ws.append([i, f"Dinner Feast Dish {i}", 600, prod, prod, prod, 1.2, 0.8, cons, reuse, waste, cost, waste * cost])
    ws.append(["Dinner Subtotal", None, None, 750.0, 750.0, 750.0, 42.0, 28.0, 680.0, 25.0, 45.0, 130.0, 5850.0])
    ws.append([])

    # 5. Midnight / Late Night (15 dishes: 200 kg prod, 180 cons, 20 left, 5 reuse, 15 waste, 1950 cost)
    ws.append(col_headers)  # Page 5 repeated header!
    for i in range(1, 16):
        prod = 13.33 if i < 15 else 13.38
        cons = 12.0
        left = 1.33 if i < 15 else 1.38
        reuse = 0.33 if i < 15 else 0.38
        waste = 1.0
        cost = 130.0
        ws.append([i, f"Midnight Supper Dish {i}", 600, prod, prod, prod, 0.8, 0.53, cons, reuse, waste, cost, waste * cost])
    ws.append(["Late Night Subtotal", None, None, 200.0, 200.0, 200.0, 12.0, 8.0, 180.0, 5.0, 15.0, 130.0, 1950.0])
    ws.append([])

    # Grand Total
    ws.append(["Grand Total All Sessions", None, None, 2150.0, 2150.0, 2150.0, 119.0, 86.0, 1945.0, 75.0, 130.0, 130.0, 16900.0])
    ws.append([])

    # Summary Report Particulars Block (must be safely ignored without terminating parser prematurely)
    ws.append(["SUMMARY REPORT", None, None, None, None])
    ws.append(["PARTICULARS", "COOKED", "TOTAL"])
    ws.append(["ESTIMATED COOKED FOOD PICKUP", 2150.0, 2150.0])
    ws.append(["ACTUAL COOKED FOOD PICKUP", 2150.0, 2150.0])
    ws.append(["ACTUAL COOKED FOOD CLOSING", 205.0, 205.0])
    ws.append(["TOTAL CONSUMPTION FOOD", 1945.0, 1945.0])
    ws.append(["TOTAL RE USE FOOD", 75.0, 75.0])
    ws.append(["WASTAGE FOOD", 130.0, 130.0])
    ws.append(["COOKED FOOD REPORT", "QNT", "%"])
    ws.append(["CHEF SIGNATURE: Executive Chef A. Verma", None, None])
    ws.append(["APPROVED BY: F&B Director R. Nair", None, None])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_d_poorly_structured() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Messy_Format"

    ws.append(["HOTEL HERITAGE GRAND - CORPORATE CONFERENCE GALA ON 26/08/2026"])
    ws.append([])
    # Irregular column ordering: Cost, Waste, Item Name, Prepared, Consumed, Category
    ws.append(["Item Cost", "Waste in Kgs", "Dish Name", "Food Prepared", "Actual Consumption", "Course"])

    # Station 1: Starters (5 dishes: 100 kg prod, 8 kg waste, cost 1040)
    ws.append(["*** STARTERS STATION ***", None, None, None, None, None])
    starters = [("Crispy Corn", 20.0, 18.5, 1.5, 110.0), ("Veg Seekh Kebab", 20.0, 18.5, 1.5, 130.0),
                ("Paneer Satay", 20.0, 18.5, 1.5, 150.0), ("Fish Finger", 20.0, 18.0, 2.0, 180.0),
                ("Chicken Lolipop", 20.0, 18.5, 1.5, 160.0)]
    for name, prod, cons, waste, cost in starters:
        ws.append([cost, waste, name, prod, cons, "Starters"])
    ws.append([None, 8.0, "Subtotal Starters", 100.0, 92.0, None])
    ws.append([])

    # Station 2: Main Course (6 dishes: 140 kg prod, 10 kg waste, cost 1300)
    ws.append(["*** MAIN COURSE BUFFET ***", None, None, None, None, None])
    mains = [("Paneer Makhani", 25.0, 23.0, 2.0, 160.0), ("Aloo Jeera", 20.0, 18.5, 1.5, 90.0),
             ("Dal Tadka", 25.0, 23.0, 2.0, 100.0), ("Mutton Korma", 30.0, 28.0, 2.0, 250.0),
             ("Steamed Rice", 20.0, 18.5, 1.5, 60.0), ("Roti", 20.0, 19.0, 1.0, 50.0)]
    for name, prod, cons, waste, cost in mains:
        ws.append([cost, waste, name, prod, cons, "Main Course"])
    ws.append([None, 10.0, "Subtotal Main Course", 140.0, 130.0, None])
    ws.append([])

    # Station 3: Desserts (5 dishes: 80 kg prod, 6 kg waste, cost 780)
    ws.append(["*** DESSERT CORNER ***", None, None, None, None, None])
    desserts = [("Gajar Ka Halwa", 20.0, 18.5, 1.5, 140.0), ("Shahi Tukda", 15.0, 14.0, 1.0, 130.0),
                ("Fruit Salad", 15.0, 13.5, 1.5, 100.0), ("Kulfi", 15.0, 14.0, 1.0, 150.0),
                ("Rasgulla", 15.0, 14.0, 1.0, 120.0)]
    for name, prod, cons, waste, cost in desserts:
        ws.append([cost, waste, name, prod, cons, "Desserts"])
    ws.append([None, 6.0, "Subtotal Desserts", 80.0, 74.0, None])
    ws.append([])
    ws.append(["Verified by F&B Audit Manager on 26/08/2026", None, None, None, None, None])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_e_ambiguous_fields() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ambiguous_Data"

    ws.append(["HOTEL SUNSHINE - IRREGULAR DATA SERVICE ON 25/08/2026"])
    ws.append(["Item Name", "UOM", "Cooked Qty", "Pickup", "Total Leftover", "Reuse", "Waste in Kgs", "Item Cost"])

    # 1-4: Unit embedded in grams ("500 gms", "750 g", "250 grams", "1000 gm")
    ws.append(["Mixed Nuts Garnish", "Pcs", "500 gms", "500 gms", "100 gms", "0", "100 gms", 400.0]) # prod 0.5 kg, waste 0.1 kg
    ws.append(["Saffron Infusion", "Pcs", "750 g", "750 g", "150 g", "0", "150 g", 600.0]) # prod 0.75 kg, waste 0.15 kg
    ws.append(["Microgreens", "Pcs", "250 grams", "250 grams", "50 grams", "0", "50 grams", 500.0]) # prod 0.25 kg, waste 0.05 kg
    ws.append(["Truffle Butter", "Pcs", "1000 gm", "1000 gm", "200 gm", "0", "200 gm", 800.0]) # prod 1.0 kg, waste 0.2 kg

    # 5-7: Waste is missing, must derive from leftover - reuse
    ws.append(["Paneer Pasanda", "Kg", 30.0, 30.0, 5.0, 2.0, "", 160.0]) # derived waste 3.0
    ws.append(["Dal Bukhara", "Kg", 35.0, 35.0, 6.0, 2.0, "-", 120.0]) # derived waste 4.0
    ws.append(["Mutton Biryani", "Kg", 40.0, 40.0, 7.0, 2.0, None, 240.0]) # derived waste 5.0

    # 8-10: Cooked Qty missing, must derive from pickup
    ws.append(["Veg Hakka Noodles", "Kg", "", 25.0, 3.0, 1.0, 2.0, 110.0]) # derived prod 25.0
    ws.append(["Chilli Chicken", "Kg", None, 30.0, 3.0, 1.0, 2.0, 200.0]) # derived prod 30.0
    ws.append(["Manchurian Gravy", "Kg", "-", 25.0, 2.0, 1.0, 1.0, 100.0]) # derived prod 25.0

    # 11-12: Missing cost, benchmark applied
    ws.append(["Paneer Makhani Standard", "Kg", 20.0, 20.0, 2.0, 1.0, 1.0, ""]) # cost benchmark applied
    ws.append(["Jeera Rice Standard", "Kg", 20.0, 20.0, 2.0, 1.0, 1.0, None]) # cost benchmark applied

    # 13-14: Anomaly row where waste > production (must trigger warning without crashing)
    ws.append(["Anomaly High Waste Item 1", "Kg", 12.5, 12.5, 15.0, 0.0, 15.0, 100.0])
    ws.append(["Anomaly High Waste Item 2", "Kg", 15.0, 15.0, 16.5, 0.0, 16.5, 120.0])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_f_duplicate_overlap() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Dolphin_Duplicate_Test"

    ws.append(["HOTEL DOLPHIN LAKE - LUNCH SERVICE ON 2026-08-26 FOR 200 PAX"])
    ws.append(["Dish Name", "Category", "Food Prepared", "Wastage", "Food Cost"])
    items = [
        ("Paneer Do Pyaza", "Main Course", 25.0, 2.0, 150.0),
        ("Aloo Matar", "Main Course", 20.0, 1.5, 100.0),
        ("Dal Fry", "Main Course", 20.0, 1.5, 90.0),
        ("Chicken Masala", "Main Course", 30.0, 2.5, 200.0),
        ("Veg Biryani", "Rice", 25.0, 2.0, 130.0),
        ("Steam Rice", "Rice", 20.0, 1.5, 60.0),
        ("Butter Roti", "Bread", 18.0, 1.0, 50.0),
        ("Plain Naan", "Bread", 18.0, 1.0, 60.0),
        ("Gulab Jamun", "Desserts", 12.0, 1.0, 120.0),
        ("Vanilla Ice Cream", "Desserts", 12.0, 1.0, 80.0),
    ]
    for name, cat, prod, waste, cost in items:
        ws.append([name, cat, prod, waste, cost])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_g_large_workbook() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Mega_Banquet_350"

    ws.append(["HOTEL MEGA METROPOLIS - ANNUAL CULINARY EXHIBITION ON 25/08/2026 FOR 1500 PAX"])
    ws.append(["Item Name", "Course", "Service Session", "Pax", "Food Prepared", "Actual Consumption", "Total Leftover", "Reuse", "Total Waste in Kgs", "Food Cost", "Wastage Cost"])

    categories = ["Starters", "Main Course", "Rice", "Bread", "Desserts", "Beverages", "Salads"]
    for i in range(1, 351):
        cat = categories[(i - 1) % len(categories)]
        prod = 20.0
        cons = 18.8
        left = 1.2
        reuse = 0.4
        waste = 0.8
        cost = 120.0
        ws.append([
            f"Culinary Dish #{i}", cat, "Dinner", 1500,
            prod, cons, left, reuse, waste, cost, waste * cost
        ])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_fixture_h_adversarial_edge() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Adversarial_Cases"

    ws.append(["HOTEL ELITE PLAZA - SPECIAL AUDIT OPERATIONS ON 25/08/2026"])
    ws.append(["Name of Items", "UOM", "Estimated Cooking", "Food Prepared", "Total Waste in Kgs", "Item Cost", "Remarks"])

    # 1. Zero values
    ws.append(["Planned Only Dish - Uncooked", "Kg", 25.0, 0.0, 0.0, 150.0, "Cancelled by client"])
    # 2. Decimals with high precision
    ws.append(["High Precision Molecular Dish", "Kg", 12.34567, 12.34567, 1.23456, 450.75, "Precision cooking"])
    # 3. Negative quantity (returns/credit)
    ws.append(["Return Credit Adjustment Dish", "Kg", 20.0, -5.0, 0.0, 120.0, "Return credit from banquet"])
    # 4. Special characters in dish name
    ws.append(['Mutton Dum Biryani (Hyderabadi Style) - Special @ Counter #1 & "Chef\'s Cut"', "Kg", 40.0, 40.0, 2.5, 260.0, "Special counter"])
    # 5. Excessive whitespace padding
    ws.append(["   Paneer Tikka Double Masala   ", "Kg", 25.0, 25.0, 1.5, 180.0, "Padded string"])
    # 6. Unusual unit: Ltr
    ws.append(["Tomato Coriander Soup", "Ltr", 30.0, 30.0, 2.0, 90.0, "Liquid broth"])
    # 7. Unusual unit: Tray (standard portion 2.5 kg)
    ws.append(["Baklava Assortment", "Tray", 10.0, 10.0, 1.0, 350.0, "Baklava pastry"])
    # 8. Unusual unit: Portions
    ws.append(["Mini Burgers Buffet", "Portions", 50.0, 50.0, 5.0, 80.0, "Finger food"])
    # 9. Waste exceeds production anomaly
    ws.append(["Overcounted Waste Item", "Kg", 10.0, 10.0, 15.0, 120.0, "Data entry typo"])
    # 10. Formula-like text
    ws.append(["=SUM(A1:A10) Risotto", "Kg", 15.0, 15.0, 1.0, 210.0, "Formula name"])
    # 11. Mixed script / Unicode dish
    ws.append(["Gulab Jamun (गुलाब जामुन) - Heritage", "Kg", 20.0, 20.0, 1.5, 130.0, "Bilingual dish"])
    # 12. Zero cost item
    ws.append(["Complimentary Bread Basket", "Kg", 15.0, 15.0, 2.0, 0.0, "Complimentary"])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def generate_all_fixtures() -> Dict[str, bytes]:
    return {
        "fixture_a_clean.xlsx": create_fixture_a_clean(),
        "fixture_b_multisheet.xlsx": create_fixture_b_multisheet(),
        "fixture_c_multipage_complex.xlsx": create_fixture_c_multipage_complex(),
        "fixture_d_poorly_structured.xlsx": create_fixture_d_poorly_structured(),
        "fixture_e_ambiguous_fields.xlsx": create_fixture_e_ambiguous_fields(),
        "fixture_f_duplicate_overlap.xlsx": create_fixture_f_duplicate_overlap(),
        "fixture_g_large_workbook.xlsx": create_fixture_g_large_workbook(),
        "fixture_h_adversarial_edge.xlsx": create_fixture_h_adversarial_edge(),
    }
