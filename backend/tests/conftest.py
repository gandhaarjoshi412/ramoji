import os
import pytest

TEST_DB_PATH = os.path.abspath("test_food_waste.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

from app.database import Base, engine, SessionLocal
from app.services.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            for table_name, table in Base.metadata.tables.items():
                res = conn.exec_driver_sql(f"PRAGMA table_info({table_name})")
                existing_cols = {row[1] for row in res.fetchall()}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}")
            conn.commit()
    except Exception as e:
        print(f"Warning during schema sync: {e}")

    db = SessionLocal()
    try:
        seed_database(db)
        from app.models.event import Event
        from app.models.user import User
        from app.utils.security import hash_password
        from datetime import date
        existing_ev = db.query(Event).filter(Event.id == 1).first()
        if not existing_ev:
            test_ev = Event(
                id=1,
                hotel_id=1,
                name="Banquet Test Event",
                event_type="Wedding",
                venue="Grand Ballroom",
                event_date=date(2026, 9, 12),
                expected_guests=500,
                actual_guests=467,
                status="Active",
                notes="Automated test fixture event"
            )
            db.add(test_ev)
            db.commit()

        mgr = db.query(User).filter(User.email == "manager@dolphinhotels.com").first()
        if not mgr:
            db.add(User(
                name="Banquet Operations Manager",
                email="manager@dolphinhotels.com",
                password_hash=hash_password("admin123"),
                role="admin",
                hotel_id=1,
                is_active=True
            ))
            db.commit()

        staff = db.query(User).filter(User.email == "staff@example.com").first()
        if not staff:
            db.add(User(
                name="Kitchen Steward Staff",
                email="staff@example.com",
                password_hash=hash_password("staff123"),
                role="staff",
                hotel_id=1,
                is_active=True
            ))
            db.commit()
    finally:
        db.close()
    yield
