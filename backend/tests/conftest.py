import pytest
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
    finally:
        db.close()
    yield
