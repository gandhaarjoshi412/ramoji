# AI-Powered Banquet Food Waste Detection & Cost Analytics Platform

A production-quality MVP designed for hotel banquet and event operations (demonstrated with **Dolphin Hotels**). 

The platform empowers banquet and kitchen staff to photograph leftover food trays using a mobile phone or tablet. The system segments and detects the food via computer vision, estimates the leftover quantity, calculates the production cost from raw recipe/ingredient data, and updates event analytics in real time.

---

## 1. Product Purpose & Value

Hotels manage high-volume food portions across banquets, galas, and corporate conferences. Traditional methods require manual weigh-ins on physical scales, which are slow, labor-intensive, and rarely linked to underlying recipe production costs.

This platform provides a **camera-only AI estimation workflow**:
1. **Capture**: Kitchen or banquet staff snaps a photo of a leftover serving dish using a smartphone or tablet.
2. **AI Inference & Segmentation**: Food detection and polygon segmentation identify items (e.g., Hyderabadi Biryani, Paneer Butter Masala, Dal Tadka).
3. **Quantity Estimation Engine**: Translates 2D segmentation area, pan depth, and food density into an estimated volume ($cm^3$) and weight ($g$ / $kg$).
4. **Recipe Costing Engine**: Computes true cost from raw ingredient procurement prices and cooked batch yield (not inflated menu selling prices).
5. **Human-in-the-Loop Review**: Staff can review detected items, adjust low-confidence predictions, and confirm records.
6. **Continuous Learning**: Every verified scan is saved with ground truth labels and is exportable for fine-tuning YOLO26-seg models.
7. **Real-time Analytics & Executive Reports**: Instant dashboard metrics (total loss ₹, waste per guest, top wasted foods, print-ready audit reports).

> **Note on Measurements**: All quantities derived from photos are explicitly labeled as **"Estimated quantity"** and **"Estimated food waste cost"** in accordance with culinary operational standards.

---

## 2. Core Architecture & Modules

```
ramoji/
├── ai/                              # Zero-coupling AI Vision & Estimation Subsystem
│   ├── model_interface.py           # FoodVisionModel abstract interface & Detection dataclass
│   ├── mock_model.py                # Deterministic banquet vision model with polygon masks
│   ├── yolo_model.py                # YOLO26-seg Ultralytics/PyTorch production wrapper
│   ├── quantity_estimator.py        # 3D volume & mass estimation engine (area × depth × density)
│   └── weights/                     # Pre-trained / fine-tuned model weights (e.g. yolo26-seg.pt)
│
├── backend/                         # FastAPI Backend Service
│   ├── app/
│   │   ├── models/                  # SQLAlchemy ORM (Hotel, User, Event, FoodItem, Ingredient, Recipe, WasteScan)
│   │   ├── schemas/                 # Pydantic v2 validation models
│   │   ├── routes/                  # REST APIs (auth, events, scan, ingredients, recipes, foods, analytics, settings)
│   │   ├── services/                # Cost engine, storage (local/S3), database seeder
│   │   ├── utils/                   # JWT authentication, security
│   │   ├── config.py                # Pydantic Settings
│   │   └── main.py                  # FastAPI application entrypoint
│   ├── tests/                       # Pytest test suite (18 passing unit & e2e tests)
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Container build
│   └── pytest.ini                   # Pytest configuration
│
├── frontend/                        # Next.js 14 App Router Web Application
│   ├── app/
│   │   ├── login/                   # 1-click demo login
│   │   ├── dashboard/               # Operational KPIs, trend charts, AI accuracy metrics
│   │   ├── events/                  # Historical banquet events
│   │   │   ├── [id]/                # Event overview & menu items
│   │   │   ├── [id]/scan/           # Camera scanner, AI bounding box overlay, human verification
│   │   │   ├── [id]/analytics/      # Event-level food waste breakdown & photo gallery
│   │   │   └── [id]/report/         # Printable executive audit report
│   │   ├── foods/                   # Food catalog with physical density & depth settings
│   │   ├── recipes/                 # Recipe batch yields and calculated cost per gram
│   │   ├── ingredients/             # Raw ingredient procurement costs
│   │   └── settings/                # AI mode toggle & training dataset JSON export
│   ├── components/                  # Reusable UI components & modals
│   ├── lib/                         # API client, auth context, formatters
│   ├── types/                       # TypeScript interfaces
│   └── Dockerfile                   # Production multi-stage Next.js container
│
├── uploads/                         # Persistent storage for captured banquet dish images
├── docker-compose.yml               # PostgreSQL, Backend, Frontend stack
├── .env.example                     # Environment template
└── README.md                        # Documentation
```

---

## 3. Mathematical Models & Estimation Formulas

### A. Camera-Based Quantity Estimation
```
Image Surface Area (cm²) = Mask Area (px²) × Pixel-to-cm² Ratio
Leftover Volume (cm³)    = Surface Area × Calibrated Pan Depth (cm) × Portion Factor
Estimated Weight (grams) = Volume (cm³) × Bulk Density (g/cm³) × Calibration Factor
```
* Outlier safety: Clamped between `min_estimated_weight_g` and `max_estimated_weight_g`.
* Bulk densities configured per food item (e.g. Biryani $\approx 0.85\text{ g/cm}^3$, Paneer Curry $\approx 1.05\text{ g/cm}^3$, Dal $\approx 1.02\text{ g/cm}^3$).

### B. Recipe & Ingredient Costing Engine
```
Batch Ingredient Cost = Sum(Ingredient Quantity × Raw Unit Price)
Cost per Gram (₹/g)   = Batch Ingredient Cost / Expected Cooked Yield (grams)
Estimated Waste Cost  = Estimated Leftover Weight (grams) × Cost per Gram (₹/g)
```
* Prevents inaccurate restaurant menu pricing distortions by calculating true back-of-house food production expenditure.

---

## 4. AI Vision Configuration (`AI_MODE`)

The application includes a clean abstraction layer (`FoodVisionModel`) that decouples model inference from business logic:

| Mode | Variable | Description |
|---|---|---|
| **Mock Mode** (Default) | `AI_MODE=mock` | Zero external weights or GPU needed. Deterministically simulates realistic food classifications, bounding boxes, and 12-point polygon segmentation masks for instant client demonstrations. |
| **YOLO Mode** | `AI_MODE=yolo` | Loads `YOLO26-seg` weights (or custom PyTorch/Ultralytics segmentation checkpoint) specified in `AI_MODEL_PATH`. |

Switch modes via `.env` or dynamically in the **Settings** page of the web UI.

---

## 5. REST API Overview

### Authentication & Core
- `POST /api/auth/login`: Authenticate staff and return JWT Bearer token.
- `GET /api/auth/me`: Retrieve logged-in staff profile and hotel metadata.

### AI Waste Scanning & Learning
- `POST /api/events/{id}/scan`: Upload a photo of food waste. Runs segmentation inference, estimates grams, and calculates cost.
- `GET /api/events/{id}/scans`: Retrieve all captured scans for an event.
- `GET /api/scans/{id}`: Fetch detailed scan record with bounding boxes and masks.
- `PUT /api/scans/{id}/verify`: Human-in-the-loop review. Update food correction, weight override, or verify prediction.
- `GET /api/scans/training-dataset`: Export verified scans as ground-truth dataset JSON for model retraining.

### Recipes & Ingredients
- `GET /api/ingredients` & `POST /api/ingredients`: Manage procurement costs (e.g. Basmati Rice ₹90/kg, Paneer ₹380/kg).
- `GET /api/recipes` & `POST /api/recipes`: Manage culinary recipes with batch yields and computed cost/gram.
- `GET /api/foods` & `PUT /api/foods/{id}`: Manage food catalog physical parameters (density, pan depth, calibration).

### Analytics & Reports
- `GET /api/dashboard/summary`: High-level hotel KPIs (total waste kg, waste loss ₹, AI accuracy, top wasted foods).
- `GET /api/events/{id}/analytics`: Event-specific waste analytics and verified photo gallery.
- `GET /api/events/{id}/report`: Printable executive audit report with chef sign-off lines.
- `GET /api/settings` & `PUT /api/settings`: Read and update AI mode and confidence thresholds.

---

## 6. Quick Start with Docker

Launch the complete stack (PostgreSQL + FastAPI + Next.js):

```bash
docker compose up --build
```

Access the services:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 7. Local Development (Without Docker)

You can run both services natively using local Python and Node runtimes with zero external database dependencies (uses local SQLite automatically):

### Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: On initial boot, the backend automatically initializes tables and seeds demo data for Dolphin Hotels.*

### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Demo Credentials

The database automatically seeds an initial demo account:
- **Email**: `demo@example.com`
- **Password**: `demo123`
- **Hotel**: `Dolphin Hotels`

*(Click **"Auto-fill Demo Credentials"** on the `/login` screen for one-click access).*

---

## 9. Automated Testing

### Backend Test Suite (Pytest)
Run the 18 automated tests covering recipe costing, camera estimation formulas, validation bounds, and end-to-end API workflows:
```bash
cd backend
pytest -v
```

### Frontend Build Verification
Verify TypeScript type checks and production bundle optimization across all 12 routes:
```bash
cd frontend
npm run build
```
