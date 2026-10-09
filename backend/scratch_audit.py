from app.database import SessionLocal
from app.models.analytics_record import AnalyticsRecord
from app.services.calculation_engine import calculate_core_waste_metrics

db = SessionLocal()
print("--- HOTELS & DATES ---")
for h in ['Hotel Sahara', 'Hotel Sitara']:
    for d in [None, '2026-08-24', '2026-10-07']:
        q = db.query(AnalyticsRecord).filter(AnalyticsRecord.hotel_name == h)
        if d:
            q = q.filter(AnalyticsRecord.record_date == d)
        recs = q.all()
        m = calculate_core_waste_metrics(recs)
        label = d if d else "All"
        print(f"{h} ({label}): Leftover={m['total_leftover_kg']}, Reuse={m['total_reuse_kg']}, Waste={m['total_waste_kg']}, Cost={m['total_waste_cost']}")

print("--- SESSIONS ---")
for s in ['Breakfast', 'Lunch', 'Snacks', 'Dinner']:
    recs = db.query(AnalyticsRecord).filter(AnalyticsRecord.session.ilike(f"%{s}%")).all()
    m = calculate_core_waste_metrics(recs)
    print(f"Session {s}: Cost={m['total_waste_cost']}, Waste={m['total_waste_kg']}")

print("--- HOTEL SAHARA SESSIONS ON 2026-08-24 ---")
recs = db.query(AnalyticsRecord).filter(AnalyticsRecord.hotel_name == 'Hotel Sahara', AnalyticsRecord.record_date == '2026-08-24').all()
m = calculate_core_waste_metrics(recs)
print(f"Sahara 2026-08-24 total: Leftover={m['total_leftover_kg']}, Reuse={m['total_reuse_kg']}, Waste={m['total_waste_kg']}, Cost={m['total_waste_cost']}")

for s in ['Breakfast', 'Lunch', 'Snacks', 'Dinner']:
    s_recs = [r for r in recs if s.lower() in (r.session or '').lower()]
    sm = calculate_core_waste_metrics(s_recs)
    print(f"  Sahara {s}: Cost={sm['total_waste_cost']}, Waste={sm['total_waste_kg']}, Leftover={sm['total_leftover_kg']}, Reuse={sm['total_reuse_kg']}")

db.close()
