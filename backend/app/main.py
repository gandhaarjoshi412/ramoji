import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed import seed_database
from app.routes import (
    auth,
    events,
    event_foods,
    waste,
    foods,
    ingredients,
    recipes,
    scan,
    analytics,
    settings_route,
    reports,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory exists
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    # Startup: Create tables if not present and seed initial data
    Base.metadata.create_all(bind=engine)

    # Sync any newly added model columns to existing database tables
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
        from app.models.hotel import Hotel
        from ai.food_classes import sync_food_catalog_for_hotel
        hotel = db.query(Hotel).first()
        if hotel:
            sync_food_catalog_for_hotel(db, hotel.id)
    finally:
        db.close()
    yield
    pass

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Food Waste Detection & Cost Analytics Platform for Hotel Banquet Operations",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for readable error responses
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )

# Serve uploaded photos
upload_path = Path(settings.UPLOAD_DIR)
if not upload_path.is_absolute() and (Path("backend") / upload_path).is_dir():
    upload_path = Path("backend") / upload_path
upload_dir = upload_path.resolve()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(event_foods.router)
app.include_router(foods.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(scan.router)
app.include_router(analytics.router)
app.include_router(settings_route.router)
app.include_router(reports.router)
app.include_router(waste.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "ai_mode": settings.AI_MODE,
        "model": settings.AI_MODEL_NAME,
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
