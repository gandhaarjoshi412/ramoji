# PlateSight — AI-Powered Banquet Food Waste Detection & Culinary Operational Intelligence Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014%20(App%20Router)-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![YOLO11](https://img.shields.io/badge/AI%20Vision-YOLO11m--seg%20(58%20Classes)-00FFFF.svg?logo=ultralytics&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![PyTorch](https://img.shields.io/badge/Deep%20Learning-PyTorch%20%7C%20ONNX%20Runtime-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20%7C%20Python%203.10+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-83%2F83%20Passing%20(100%25)-brightgreen.svg?logo=pytest&logoColor=white)](https://docs.pytest.org)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Enterprise-blue.svg)](#license)

> **PlateSight** is an enterprise-grade Culinary Analytics & Operational Intelligence platform built specifically for high-volume hotel banqueting, luxury resorts, and catering operations (demonstrated with **Dolphin Hotels** and **Ramoji Film City — Hotel Sahara & Hotel Sitara**).
> 
> The platform unifies **camera-based AI computer vision** (real-time food segmentation, 3D volume-to-weight estimation, and ingredient-level batch costing) with a **universal hospitality report ingestion engine** and a **deterministic operational intelligence engine** to eliminate food waste, enforce mass-balance culinary accountability, and recover back-of-house profit margins.

---

## Table of Contents

1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [Key Capabilities & Feature Matrix](#2-key-capabilities--feature-matrix)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [In-Depth Feature Documentation](#4-in-depth-feature-documentation)
   - [4.1 AI Vision & 3D Quantity Estimation Subsystem](#41-ai-vision--3d-quantity-estimation-subsystem)
   - [4.2 Culinary Recipe & Ingredient Costing Engine](#42-culinary-recipe--ingredient-costing-engine)
   - [4.3 Live Banquet Event Menu Auto-Population](#43-live-banquet-event-menu-auto-population)
   - [4.4 Universal Hospitality Report Ingestion Pipeline](#44-universal-hospitality-report-ingestion-pipeline)
   - [4.5 Deterministic Operational Intelligence Engine (Situations 1–9)](#45-deterministic-operational-intelligence-engine-situations-19)
   - [4.6 Mathematical Calculation & Mass-Balance Audit Engine](#46-mathematical-calculation--mass-balance-audit-engine)
   - [4.7 Multi-Property Hospitality Analytics Workspace (11 Subtabs)](#47-multi-property-hospitality-analytics-workspace-11-subtabs)
   - [4.8 Banquet Events Management & Audit Lifecycle](#48-banquet-events-management--audit-lifecycle)
   - [4.9 Enterprise Authentication & Session Security](#49-enterprise-authentication--session-security)
   - [4.10 Cloud Deployment, Edge Routing & CI/CD Pipeline](#410-cloud-deployment-edge-routing--cicd-pipeline)
   - [4.11 Developer Tooling & Automation Scripts](#411-developer-tooling--automation-scripts)
5. [Repository Structure & Codebase Map](#5-repository-structure--codebase-map)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Installation & Quick Start Guide](#7-installation--quick-start-guide)
   - [Option A: 1-Click Launch Scripts (Linux / macOS / Windows)](#option-a-1-click-launch-scripts-linux--macos--windows)
   - [Option B: Manual Local Setup (Python + Next.js)](#option-b-manual-local-setup-python--nextjs)
   - [Option C: Production Docker Compose Stack](#option-c-production-docker-compose-stack)
   - [Pre-Seeded Demo Credentials](#pre-seeded-demo-credentials)
8. [Complete REST API Reference](#8-complete-rest-api-reference)
9. [Automated Testing & Verification Suite](#9-automated-testing--verification-suite)
10. [Cloud Hosting & Production Deployment](#10-cloud-hosting--production-deployment)
11. [License & Maintainers](#11-license--maintainers)

---

## 1. Executive Summary & Product Vision

In high-volume hotel banqueting, luxury conventions, and destination weddings, culinary departments operate under intense time constraints. Kitchens routinely overproduce food by 15–35% to prevent buffet outages. The resulting leftover dishes are manually discarded or logged onto clipboard sheets with zero recipe cost traceability, vague guest headcounts (PAX), and no reconciliation between what was cooked, what was consumed, and what was discarded.

Traditional food waste tools suffer from two critical flaws:
1. **Physical Scale Bottlenecks**: Requiring busy chefs and banquet stewards to weigh every single chafing pan on a physical scale slows down post-service turnover and leads to abandoned compliance.
2. **Retail Price Distortion**: Most software multiplies discarded kilograms by restaurant menu selling prices (e.g. ₹600 for a plate of Biryani), creating fictitious loss metrics instead of calculating the true **Back-of-House (BOH) ingredient procurement cost** (raw basmati rice, chicken, oil, whole spices).

**PlateSight solves both challenges through a dual-engine architecture:**
- **Zero-Friction Camera AI**: Kitchen stewards snap photos of leftover buffet chafing pans using a smartphone or tablet. The system segments the dishes using a custom-trained YOLO11m-seg model, extracts polygon surface areas via the Shoelace formula, estimates 3D volume and grams based on bulk physical densities, and applies back-of-house recipe costing in under 2 seconds.
- **Enterprise Ingestion & Deterministic Intelligence**: Operators can drag-and-drop legacy Excel sheets, CSV files, PDF logs, or daily kitchen printouts. The ingestion engine automatically normalizes multi-level headers, reconciles mass-balance equations, filters out summary sheets, and feeds an 11-tab analytics workspace powered by a deterministic, rule-based intelligence engine.

---

## 2. Key Capabilities & Feature Matrix

| Capability | Module / Component | Technical Implementation | Operational Benefit |
|---|---|---|---|
| **AI Food Segmentation** | `ai/yolo_model.py`<br>`ai/food_classes.py` | YOLO11m-seg (58 classes, `conf=0.14`, `imgsz=512`, `retina_masks=False`), ONNX runtime fallback | Identifies multi-dish trays, individual dishes, and gravies from smartphone camera photos. |
| **3D Quantity Estimation** | `ai/quantity_estimator.py` | Polygon Shoelace area, reference chafing vessel calibration ($28\text{ cm}$), depth, and bulk density ($g/\text{cm}^3$) | Camera-only mass approximation ($g$ and $kg$) without requiring physical weigh scales. |
| **Recipe Cost Engine** | `app/services/cost_engine.py` | Normalized ingredient procurement prices $\div$ cooked batch yield grams | Computes true BOH ingredient production cost per gram; eliminates menu price distortion. |
| **Auto Menu Population** | `app/services/event_sync.py` | Automatic `EventFood` and `AnalyticsRecord` creation from camera scans | Eliminates upfront manual data entry; event menus populate dynamically as dishes are scanned. |
| **Universal Report Ingestion** | `app/services/intelligent_report_parser.py` | Dynamic multi-level header normalization, synonym mapping, session inheritance, cutoff detection | Ingests complex XLSX, XLS, CSV, and PDF hospitality logs with 100% precision. |
| **Deduplication & Replacement** | `app/routes/analytics.py` | SHA-256 row-level fingerprinting, `import_id` batch tracking, scoped replacement | Prevents double-counting while allowing painless re-imports of updated event workbooks. |
| **Mass-Balance Audit** | `app/services/calculation_engine.py` | Reconciles Prepared vs (Consumed + Leftover) and Leftover vs (Reused + Waste + Other) | Mathematically flags unexplained food disappearances and recording discrepancies. |
| **Deterministic Intelligence** | `app/services/intelligence_engine.py` | Rule-based decision engine covering Situations 1 through 9 with empirical baselines | Provides transparent, auditable chef action items without hallucinating synthetic ML metrics. |
| **11-Tab Analytics Workspace** | `frontend/components/analytics/` | Next.js 14 App Router, Tailwind CSS, Lucide icons, responsive interactive charts | Comprehensive executive cockpit: Hotels, Events, Categories, Dishes, Shifts, Costs, Quality. |
| **Enterprise Dual-Token Auth** | `app/routes/auth.py`<br>`app/utils/security.py` | 30-min Access Token, 7-day Refresh Token, Refresh Token Rotation (RTR), brute-force lockout | Enterprise security with HttpOnly cookies, RBAC, and reverse-proxy protocol awareness. |
| **Hybrid Cloud / Edge Infrastructure** | `cloudflare-router/`<br>`.github/workflows/deploy.yml` | Cloudflare Worker edge router, Ubuntu VPS FastAPI backend, Vercel frontend, automated CI/CD | Seamless hybrid architecture with persistent SQLite/PostgreSQL backups across deployments. |

---

## 3. System Architecture & Data Flow

### End-to-End System Architecture

```mermaid
flowchart TD
    Client["Client Devices\n(Mobile Safari, Android Chrome, Desktop Web, Tablet Scanner)"]
    
    subgraph Edge ["Cloudflare Global Edge Network"]
        CFRouter["Cloudflare Worker Router\n(cloudflare-router/src/index.js)"]
    end
    
    subgraph FrontendHosting ["Vercel Edge Hosting"]
        NextJS["Next.js 14 App Router Frontend\n(frontend-wine-ten-90.vercel.app)"]
        NextMiddleware["Edge Middleware\n(frontend/middleware.ts)\nRBAC & Reverse-Proxy Protocol Normalizer"]
    end
    
    subgraph BackendVPS ["Production VPS (backapi.platesight.in)"]
        FastAPI["FastAPI 0.110+ Application Server\n(backend/app/main.py)"]
        
        subgraph AISubsystem ["AI Computer Vision Subsystem"]
            YOLO["YOLO11m-seg 58-Class Segmentation\n(PyTorch / ONNX Runtime)"]
            MockVision["Deterministic Mock Model\n(Zero-Dependency Demo Mode)"]
            QtyEngine["3D Quantity Estimator\n(Shoelace Polygon Area × Pan Depth × Density)"]
        end
        
        subgraph HospitalityEngines ["Culinary Analytics & Ingestion Subsystems"]
            ReportParser["Universal Report Ingestion Parser\n(Multi-Level Headers, XLSX/CSV/PDF, Cutoffs)"]
            CalcEngine["Calculation & Mass-Balance Engine\n(Hare-Niemeyer Quotas, Pax Deduplication)"]
            IntelEngine["Deterministic Intelligence Engine\n(Situations 1–9 Diagnostics)"]
            CostEngine["Recipe & Ingredient Costing Engine\n(Raw Procurement Yield Normalization)"]
            EventSync["Banquet Event & Ledger Sync\n(Auto-Populate Menus & Records)"]
        end
        
        DB[("Database\n(SQLite / PostgreSQL)\nfood_waste.db")]
        Uploads[("Persistent Media Storage\n(/uploads - Dish Images & Masks)")]
    end

    Client -->|All Requests| CFRouter
    CFRouter -->|"/api/*", "/uploads/*", "/docs"| FastAPI
    CFRouter -->|"Web Pages & Assets"| NextJS
    NextJS --> NextMiddleware
    FastAPI --> AISubsystem
    FastAPI --> HospitalityEngines
    FastAPI --> DB
    FastAPI --> Uploads
```

### Camera Waste Scan Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Steward as Banquet Steward / Chef
    participant UI as Next.js Scanner UI (/events/[id]/scan)
    participant API as FastAPI Backend (/api/events/{id}/scan)
    participant AI as YOLO11m-seg & Quantity Estimator
    participant Cost as FoodCostService & EventSync
    participant DB as SQLite / PostgreSQL Database

    Steward->>UI: Snaps photo of leftover buffet chafing dish
    UI->>API: POST multipart/form-data (image, event_id, bearer token)
    API->>API: Verify session & check file size / format (JPG/PNG/WEBP <= 15MB)
    API->>AI: Execute model inference (conf=0.14, imgsz=512)
    AI-->>API: Bounding box, segmentation polygon, detected food label (e.g. Biryani)
    API->>AI: Run QuantityEstimator(polygon, frame_ratio, pan_depth, bulk_density)
    AI-->>API: Estimated volume (cm³) and weight (e.g. 1,450.0g)
    API->>Cost: Resolve linked recipe cost per gram (e.g. ₹0.22/g)
    Cost-->>API: Calculated waste cost (₹319.00)
    API->>DB: Save WasteScan record (image, annotations, grams, cost)
    API->>Cost: Trigger sync_event_scans_to_event_foods()
    Cost->>DB: Auto-create EventFood & sync to AnalyticsRecord
    API-->>UI: Return WasteScanResponse with annotated bounding boxes
    UI->>Steward: Display HUD overlay, estimated grams, cost, and verification form
```

### Universal Report Ingestion Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Manager as F&B Controller / Manager
    participant Modal as ExcelUploadModal UI
    participant PreviewAPI as POST /api/analytics/upload/preview
    participant Parser as IntelligentReportParser
    participant ConfirmAPI as POST /api/analytics/upload/confirm
    participant Engine as Calculation & Intelligence Engine
    participant DB as Database (AnalyticsRecord)

    Manager->>Modal: Selects XLSX, CSV, or PDF daily consumption log
    Modal->>PreviewAPI: Uploads raw file
    PreviewAPI->>Parser: Analyze sheets, detect headers, resolve synonyms, calculate hashes
    Parser->>Parser: Apply summary sheet exclusion & footer cutoff ('COOKED FOOD REPORT')
    Parser->>Parser: Apply clerk UOM piece-to-kg conversion defense
    Parser-->>PreviewAPI: Parsed rows, metadata (Hotel, Date, PAX), and math verification
    PreviewAPI-->>Modal: Return 2-stage preview with confidence scores & duplicate warnings
    Manager->>Modal: Reviews parsed rows, edits metadata overrides, chooses action (Import/Replace/Skip)
    Modal->>ConfirmAPI: POST confirmed rows with chosen duplicate strategy
    ConfirmAPI->>DB: Scoped replacement or insertion with import_id tracking
    ConfirmAPI->>Engine: Re-index baseline metrics and mass balance
    ConfirmAPI-->>Modal: Return UploadConfirmResponse with success badge
    Modal->>Manager: Displays confirmation summary & live refreshes 11-tab dashboard
```

---

## 4. In-Depth Feature Documentation

### 4.1 AI Vision & 3D Quantity Estimation Subsystem

The AI vision subsystem (`ai/`) is designed with a zero-coupling interface (`FoodVisionModel`), allowing hot-swapping between real deep-learning models and deterministic mock models without altering application routes.

#### Trained Deep Learning Models
- **Primary Segmentation Engine**: `foodwaste_yolo11m_seg_31cls.pt` (symlinked as `best.pt` in the repository root).
- **Class Catalog**: 58 Indian catering dish classes trained on `platesight_dishes58.yaml`, covering:
  - **Rice & Biryanis**: Dum Biryani, Hyderabadi Chicken Biryani, Steamed Basmati Rice, Pulao/Fried Rice, Curd Rice.
  - **Curries & Dals**: Paneer Butter Masala, Paneer Pasanda, Chicken Curry, Mutton Rogan Josh, Dal Tadka, Sambar/Rasam, Palakura Pappu, Chana Masala, Nellore Chepala Pulusu, Subz Nizami Handi.
  - **Breads**: Tandoori Roti, Butter Naan, Kulcha, Stuffed Paratha, Puri/Bhatura.
  - **Starters & Tikkas**: Paneer Tikka, Murgh Malai Kebab, Chicken Tikka, Crispy Fish Fingers, Veg Manchurian, Medu Vada.
  - **Accompaniments & Salads**: Green Salad, Kimchi Salad, Tadka Raita, Fresh Curd, Chutneys, Dosakaya Pachadi, Mirchi Ka Salan.
  - **Desserts**: Gulab Jamun, Rasgulla, Moong Dal Halwa, Kheer/Payasam, Classic Tiramisu, Fresh Cut Fruits.

#### Inference Optimizations
- **Confidence Threshold**: Defaults to `conf=0.14` during raw inference to maximize recall on messy, overlapping buffet leftovers, then filters against `AI_CONFIDENCE_THRESHOLD=0.70` for human-verification flags.
- **Image Size**: Standardized to `imgsz=512` with `retina_masks=False` and `torch.inference_mode()`, slashing GPU/CPU memory footprint by 65% and preventing out-of-memory errors on modest cloud instances.
- **ONNX Runtime Support**: Full inference compatibility with ONNX Runtime (`onnxruntime>=1.17.0`) for CPU deployment without CUDA drivers.

#### Mathematical 3D Quantity Estimation Formulas
Camera mass estimation converts 2D segmentation pixels into 3D mass using physical food density:

1. **Pixel Surface Area ($A_{\text{px}}$)**:
   When a segmentation polygon is extracted, the exact polygon area is calculated using the **Shoelace Formula** (Gauss's area formula):
   $$\text{Area}_{\text{Shoelace}} = \frac{1}{2} \left| \sum_{i=1}^{n} (x_i y_{i+1} - x_{i+1} y_i) \right|$$
   If no polygon is available (bounding box fallback), an elliptical approximation is used:
   $$\text{Area}_{\text{ellipse}} = \frac{\pi}{4} \times \text{width}_{\text{px}} \times \text{height}_{\text{px}}$$

2. **Physical Surface Area ($A_{\text{cm}^2}$)**:
   Calibrated assuming a standard banquet buffet counter width of $60.0\text{ cm}$:
   $$\text{Ratio}_{\text{px}\to\text{cm}} = \frac{60.0}{\text{image\_width}_{\text{px}}}$$
   $$A_{\text{cm}^2} = A_{\text{px}} \times (\text{Ratio}_{\text{px}\to\text{cm}})^2$$

3. **Approximated Volume ($V_{\text{cm}^3}$)**:
   $$V_{\text{cm}^3} = A_{\text{cm}^2} \times d_{\text{vessel}}$$
   Where $d_{\text{vessel}}$ is the calibrated vessel depth (e.g. $4.0\text{ cm}$ for chafing dishes, $3.0\text{ cm}$ for dal bowls, $1.5\text{ cm}$ for bread baskets).

4. **Estimated Leftover Weight ($W_{\text{grams}}$)**:
   $$W_{\text{raw}} = V_{\text{cm}^3} \times \rho_{\text{bulk}} \times k_{\text{portion}} \times k_{\text{calibration}}$$
   Where $\rho_{\text{bulk}}$ is the bulk physical density (e.g. Biryani $\approx 0.85\text{ g/cm}^3$, Paneer Curry $\approx 1.05\text{ g/cm}^3$, Dal $\approx 1.02\text{ g/cm}^3$, Roti $\approx 0.40\text{ g/cm}^3$).
   Outlier safety clamps the final weight:
   $$W_{\text{estimated}} = \max(W_{\min}, \min(W_{\max}, W_{\raw}))$$

5. **Human-in-the-Loop Continuous Learning**:
   Every scan can be verified by staff via `PUT /api/scans/{id}/verify` to correct labels or weights. All verified scans are immediately exportable via `GET /api/scans/training-dataset` as ground-truth training records for active retraining.

---

### 4.2 Culinary Recipe & Ingredient Costing Engine

The recipe costing engine (`app/services/cost_engine.py`) enforces strict culinary accounting standards:

```
Batch Ingredient Cost = Sum(Ingredient Quantity * Raw Unit Price)
Cost per Gram (Rs/g)  = Batch Ingredient Cost / Expected Cooked Yield (grams)
Estimated Waste Cost  = Estimated Leftover Weight (grams) * Cost per Gram (Rs/g)
```

- **Unit Normalization**: Automatically converts between mismatched units (e.g., procurement in kilograms or liters converted to recipe ingredient quantities in grams or milliliters).
- **Cost Lookup Hierarchy**:
  1. Linked culinary recipe yield cost per gram (`recipe.expected_yield_grams`).
  2. Master catalog fallback default (`food_item.default_cost_per_kg / 1000.0`).
  3. Safe catering baseline fallback (₹0.15/g $\approx$ ₹150/kg).

---

### 4.3 Live Banquet Event Menu Auto-Population

Unlike legacy tools that force banquet stewards to manually construct 40-item menus before scanning dishes, PlateSight implements **Dynamic Event Auto-Sync** (`app/services/event_sync.py`):
- When a steward photographs an unlisted dish during an event, the system automatically checks the event menu (`EventFood`).
- If missing, it auto-creates an `EventFood` entry, calculates default batch yields, links the estimated dish cost, transitions the event status from `Upcoming` to `Active`, and synchronizes with the `AnalyticsRecord` ledger.
- Existing menu items are never resurrected if intentionally deleted by a chef.

---

### 4.4 Universal Hospitality Report Ingestion Pipeline

Hospitality venues use wildly varied spreadsheets. The ingestion engine (`app/services/intelligent_report_parser.py`) is an industrial parser capable of ingesting:
- **Formats**: Microsoft Excel (`.xlsx`, `.xls`), Comma-Separated Values (`.csv`), PDF text tables (`.pdf`), and scanned image logs.
- **Dynamic Multi-Level Header Normalization**: Handles split and merged column headers (e.g. `CONVERT IN KGS - Actually Production`, `Estimation Food - Total Cooking in KGS`).
- **Semantic Synonym Dictionary**: Maps hundreds of regional catering variations to canonical fields (`converted_production_kg`, `actual_production`, `pickup_quantity`, `kitchen_leftover`, `location_buffet_return`, `reuse_quantity`, `total_waste`).
- **Hierarchical Session Inheritance**: When a spreadsheet includes sections for Breakfast, Lunch, Hi-Tea, and Dinner, sub-rows automatically inherit the active shift session.
- **Venue-to-Property Mapping**: Automatically routes venue names like *"Galaxy Restaurant"* to **Hotel Sitara**, and banquet halls to **Hotel Sahara**.
- **Sheet-Name Date Extraction**: Extracts dates from sheet tabs (e.g. `01.08.2026`, `Aug 01`) and preserves individual sheet dates across multi-day workbooks.
- **Summary Sheet & Cutoff Exclusion**: Automatically detects and skips aggregate tabs (e.g. `Sheet1` containing `SUMMARRY ON`) and truncates parsing when encountering end-of-sheet summaries (`COOKED FOOD REPORT`, `GRAND TOTAL`).
- **Piece-to-Kg Conversion Defense**: Protects against clerk data-entry errors (e.g., Pav or Bonda entered as pieces but labeled as kg with conversion factor $< 1.0$).
- **Native Converted Kg Column Adoption**: Directly adopts hotel pre-calculated kilograms when the `CONVERT IN KGS` section is present.
- **Two-Stage Ingestion Workflow**:
  1. `POST /api/analytics/upload/preview`: Returns an in-depth preview with confidence scores, math integrity audits, and editable metadata overrides.
  2. `POST /api/analytics/upload/confirm`: Commits records with chosen duplicate resolution:
     - `import`: Adds records with unique batch tracking.
     - `replace`: Atomically removes existing records for that specific hotel, event, and date before inserting new ones.
     - `skip`: Skips any rows whose SHA-256 fingerprint already exists.

---

### 4.5 Deterministic Operational Intelligence Engine (Situations 1–9)

Rather than relying on non-deterministic LLMs that hallucinate figures in financial audits, PlateSight implements a **Deterministic Operational Intelligence Engine** (`app/services/intelligence_engine.py`):

```
                        +-------------------------------+
                        | Filtered Operational Records  |
                        +---------------+---------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
        [Empty Records?]                               [Has Records?]
                 |                                             |
           SITUATION 1                                         v
       No Data In Selection                   Calculate Core Metrics (Mass & Cost)
                                                               |
                                              +----------------+----------------+
                                              |                                 |
                                      [Baseline Query]                  [Quality Checks]
                                              |                                 |
                                    Count Historical Events                     +--> SITUATION 6
                                              |                                      (Missing Pax / Prep)
                               +--------------+--------------+                  |
                               |                             |                  +--> SITUATION 7
                        Count < 3 Events              Count >= 3 Events              (Cost & Loss Impact)
                               |                             |                  |
                          SITUATION 2                        v                  +--> SITUATION 8
                     Baseline Unavailable            Compute Delta %                 (Top Waste Contributors)
                                                             |                  |
                                     +-----------------------+-------+          +--> Safe Reuse Diversion
                                     |                       |       |
                               Delta >= +20%           Delta <= -20% |
                                     |                       |       |
                                SITUATION 3             SITUATION 4  +--> SITUATION 5
                             Elevated Waste %        Reduced Waste %       Normal Baseline Range
```

#### The 9 Diagnostic Operational Situations:
1. **Situation 1 — Empty Filter Scope**: Zero records found for the active filter combination; prompts user to broaden date range or hotel selection.
2. **Situation 2 — Insufficient Historical Baseline**: Fewer than 3 comparable historical shifts exist; flags that empirical baseline comparison is unavailable until more shifts are logged.
3. **Situation 3 — Elevated Waste Generation ($\ge +20\%$)**: Waste rate significantly exceeds historical baseline; issues an **Attention** or **Critical** alert with actionable replenishment recommendations.
4. **Situation 4 — Yield Improvement ($\le -20\%$)**: Waste rate is substantially below historical baseline; flags successful portion control for operational replication.
5. **Situation 5 — Baseline Adherence (within $\pm 20\%$)**: Waste generation aligns with established catering norms.
6. **Situation 6 — Missing Attendance or Production Data**: Flags missing PAX (headcount $= 0$) or zero prepared weight ($0.0\text{ kg}$) to prevent corrupted per-guest ratios.
7. **Situation 7 — Financial Procurement Impact**: Quantifies exact rupee loss from raw ingredient procurement rates, or warns if recipe unit costs are unconfigured.
8. **Situation 8 — Top High-Loss Recipes**: Identifies the single largest waste-generating dish (by kg and cost) and calculates recommended batch reduction percentages.
9. **Situation 9 — Safe Food Reuse Diversion**: Tracks unexposed kitchen holds safely diverted back into compliant culinary channels under HACCP standards.

---

### 4.6 Mathematical Calculation & Mass-Balance Audit Engine

The calculation engine (`app/services/calculation_engine.py`) enforces strict culinary mass balances:

#### 1. Production Mass Balance
$$\text{Production Variance (kg)} = \text{Prepared Quantity} - (\text{Actual Consumption} + \text{Total Leftover})$$

#### 2. Leftover Disposition Mass Balance
$$\text{Leftover Variance (kg)} = \text{Total Leftover} - (\text{Safe Reuse} + \text{Final Waste} + \text{Other Disposition})$$
- If $|\text{Leftover Variance}| < 0.05\text{ kg}$, the record is flagged as **Reconciled**.
- If $|\text{Leftover Variance}| \ge 0.05\text{ kg}$, the discrepancy is highlighted in the audit ledger as **Over-accounted** or **Under-accounted**.

#### 3. Unbiased PAX Calculation
To prevent double-counting attendance across multi-row dish spreadsheets, guest attendance is grouped by unique shift tuples:
$$\text{Unique Shift} = (\text{Record Date}, \text{Hotel Name}, \text{Session}, \text{Event Name})$$
$$\text{Total PAX} = \sum \text{PAX}_{\text{Unique Shift}}$$

#### 4. Hare-Niemeyer Quota (Largest Remainder Method)
To eliminate the classic 1-rupee rounding mismatch between headline totals and category sub-tables, PlateSight implements the **Largest Remainder Method**:
$$\text{Base Integer} = \lfloor \text{Cost}_i \rfloor, \quad \text{Remainder}_i = \text{Cost}_i - \lfloor \text{Cost}_i \rfloor$$
Surplus whole rupees are allocated in descending order of remainder fraction, ensuring that:
$$\sum \text{Display Integers} \equiv \text{Round}(\text{Total Target Cost})$$

#### 5. Formulaic Data Quality & Audit Health Score (0–100%)
- Hotel Association Completeness: **20%**
- Meal Session Specified: **15%**
- PAX Count Presence: **15%**
- Mass Balance Reconciliation: **20%**
- Item Unit Cost Presence: **15%**
- Verification & Source Provenance: **15%**

---

### 4.7 Multi-Property Hospitality Analytics Workspace (11 Subtabs)

Accessible at `/analytics`, the workspace provides 11 dedicated operational subtabs:

1. **Overview (`overview`)**: Executive KPI cards, summary charts, immediate management action items, and deterministic briefing.
2. **Hotels (`hotels`)**: Multi-property comparison across Hotel Sahara, Hotel Sitara, and Dolphin Hotels with fair normalized metrics ($g/\text{guest}$ and $₹/\text{guest}$).
3. **Events (`events`)**: Banquet event management, status tracking, Pax counts, delete-impact audits, and direct event linkage.
4. **Event Types (`event_types`)**: Category benchmarking (Weddings, Conferences, Galas, Corporate, Birthdays) with comparative matrix and intelligence workspace.
5. **Food & Dishes (`food_dishes`)**: Dish intelligence, Pareto 80/20 analysis (identifying the 20% of dishes causing 80% of waste), and dish drill-down modal with full mathematical lineage and source sheet/row traceability.
6. **Meals & Service (`meals_service`)**: Meal session distribution (Breakfast, Lunch, Dinner, Hi-Tea) and service format efficiency (Buffet vs Set Menu vs À la Carte).
7. **Trends & Timeline (`trends`)**: Chronological daily waste timeline, Day-of-Week cyclical patterns, and sparse date coverage handling.
8. **Waste & Reuse (`waste_reuse`)**: Kitchen hold vs buffet return breakdown, safe food reuse diversion rate, and mass-balance discrepancy tables.
9. **Costs & Savings (`costs_savings`)**: Financial loss tracking, high-cost ingredient ranking, and an interactive **What-If Savings Simulator** allowing chefs to model 5%, 10%, or 20% waste reduction targets.
10. **Reports (`reports`)**: Printable end-of-day hospitality audit ledgers with executive chef sign-off lines and raw CSV/JSON ledger exports.
11. **Data Quality (`data_quality`)**: Audit health scorecard (0–100%), unreconciled record alerts, and batch cleanup resolution tools.

---

### 4.8 Banquet Events Management & Audit Lifecycle

- **Event CRUD**: Full event scheduling at `/events` and `/events/new` with fields for Venue, Client Name, Expected Guests, Actual Guests, Service Format, and Date.
- **Delete-Impact Auditing**: Before deleting any event, `GET /api/events/{id}/delete-impact` calculates how many waste scans, food items, and analytics records are associated.
- **Safe Soft Deletion & Restoration**: Events are safely soft-deleted (`is_archived = True`), preventing orphaned records, and can be restored anytime via `POST /api/events/{id}/restore`.
- **Event Categories**: Built-in categories plus custom hotel category creation via `/api/events/categories`.

---

### 4.9 Enterprise Authentication & Session Security

- **Dual-Token Architecture**:
  - Short-lived **30-minute Access Token** for API authorization.
  - Long-lived **7-day Refresh Token** with **Refresh Token Rotation (RTR)**.
- **Database Session Tracking**: `UserSession` stores SHA-256 hashed refresh tokens (`hash_token()`), client IP address, and User-Agent.
- **Brute-Force Protection**: 5 consecutive failed login attempts automatically locks the account for 15 minutes (`locked_until`).
- **HttpOnly Cookies**: Session cookies set with `SameSite=Lax` and configurable SSL flags (`COOKIE_SECURE`).
- **Reverse-Proxy Protocol Normalizer**: Next.js edge middleware (`middleware.ts`) inspects `X-Forwarded-Host` and `X-Forwarded-Proto` to prevent SSL protocol loops behind Cloudflare and Nginx reverse proxies.
- **Restricted Test Accounts**: Accounts like `test@platesight` and `test@platesight.in` have write/scanning actions safely restricted while retaining full read access across all analytics subtabs.

---

### 4.10 Cloud Deployment, Edge Routing & CI/CD Pipeline

- **Cloudflare Edge Router**: `cloudflare-router/src/index.js` routes all `/api`, `/uploads`, and `/docs` traffic directly to the VPS backend (`backapi.platesight.in`), and static web pages to Vercel (`frontend-wine-ten-90.vercel.app`).
- **GitHub Actions CI/CD** (`.github/workflows/deploy.yml`):
  1. Compiles Next.js frontend into a production tarball.
  2. Securely transfers build artifacts to the VPS over SSH.
  3. Preserves the active live database (`cp /tmp/food_waste_backup.db`).
  4. Updates Python virtualenv dependencies using PyTorch CPU wheels.
  5. Restarts systemd services (`ramoji-backend` and `ramoji-frontend`).
  6. Automatically validates readiness via `curl` health probes.

---

### 4.11 Developer Tooling & Automation Scripts

- `scripts/start_demo.sh` / `start_demo.bat`: 1-click startup scripts for backend, frontend, and log streaming.
- `scripts/run_bridge.sh`: Sets up `socat` network bridging across Tailscale interfaces so mobile phones can connect directly to localhost services.
- `camera_test.py`: Standalone OpenCV script testing webcam YOLO11m segmentation inference in real-time.
- `test_model.py`: Standalone CLI tool running segmentation and bounding-box inference on single image files or directories.
- `scripts/train_yolo.py`: Training script for YOLO11m with automated checkpoint resuming, augmentations for messy/smashed buffet dishes, and auto-export to `best.pt`.
- `scripts/merge_datasets.py`: Normalizes and merges multiple Indian food datasets into unified YOLO label formats.
- `generate_analytics_deck.py`: Generates the complete 12-slide executive presentation deck (`.pptx` and `.pdf`) using Dolphin Hotels design tokens.

---

## 5. Repository Structure & Codebase Map

```
ramoji/
├── ai/                                     # Computer Vision & Quantity Estimation Subsystem
│   ├── food_classes.py                     # 58-class Indian food catalog, densities, depths, costs
│   ├── model_interface.py                  # FoodVisionModel abstract base & Detection dataclasses
│   ├── mock_model.py                       # Deterministic mock model for instant zero-GPU demos
│   ├── quantity_estimator.py               # Shoelace polygon 3D volume & mass estimation engine
│   └── yolo_model.py                       # YOLO11m-seg Ultralytics/PyTorch dual-model wrapper
│
├── backend/                                # FastAPI Backend Service
│   ├── app/
│   │   ├── config.py                       # Pydantic Settings & environment variables
│   │   ├── database.py                     # SQLAlchemy engine, SessionLocal, Base
│   │   ├── main.py                         # FastAPI application entrypoint & lifespans
│   │   ├── models/                         # SQLAlchemy ORM Database Models
│   │   │   ├── analytics_record.py         # Consolidated hospitality consumption ledger
│   │   │   ├── event.py                    # Banquet events with soft-deletion & pax
│   │   │   ├── event_category.py           # Banquet event categories & subtypes
│   │   │   ├── event_food.py               # Event menu items linking foods and batch weights
│   │   │   ├── food_item.py                # Food catalog with physical densities & default depths
│   │   │   ├── hotel.py                    # Hotel properties (Sahara, Sitara, Dolphin)
│   │   │   ├── ingredient.py               # Raw ingredient procurement unit costs
│   │   │   ├── recipe.py                   # Culinary recipes with expected batch yields
│   │   │   ├── recipe_ingredient.py        # Recipe-to-ingredient relational line-items
│   │   │   ├── user.py                     # Users, roles, lockout timestamps, and sessions
│   │   │   ├── waste_record.py             # Manual/scale waste measurements
│   │   │   └── waste_scan.py               # AI camera scans with polygon masks & estimates
│   │   ├── routes/                         # REST API Route Endpoints
│   │   │   ├── analytics.py                # 11-tab analytics, report upload preview/confirm
│   │   │   ├── auth.py                     # Login, token refresh, logout, profile
│   │   │   ├── dashboard.py                # High-level KPIs & executive dashboard summary
│   │   │   ├── event_foods.py              # Banquet event menu CRUD
│   │   │   ├── events.py                   # Event CRUD, categories, soft-delete & restore
│   │   │   ├── foods.py                    # Master food catalog CRUD
│   │   │   ├── ingredients.py              # Raw ingredient procurement CRUD
│   │   │   ├── recipes.py                  # Culinary recipe batch yields & cost CRUD
│   │   │   ├── reports.py                  # Event-specific executive audit reports
│   │   │   ├── scan.py                     # Camera waste scan upload, inference & dataset export
│   │   │   ├── settings_route.py           # AI mode configuration & confidence thresholds
│   │   │   └── waste.py                    # Physical scale waste record management
│   │   ├── schemas/                        # Pydantic v2 Request/Response Validation Schemas
│   │   ├── services/                       # Business Logic & Core Algorithmic Services
│   │   │   ├── calculation_engine.py       # Mass-balance audit, Hare-Niemeyer quotas, Pax logic
│   │   │   ├── cost_engine.py              # Normalized ingredient yield costing per gram
│   │   │   ├── event_sync.py               # Auto-sync camera scans to banquet menu & analytics
│   │   │   ├── intelligence_engine.py      # Deterministic rule engine covering Situations 1–9
│   │   │   ├── intelligent_report_parser.py# Universal XLSX/CSV/PDF hospitality report parser
│   │   │   ├── seed.py                     # Database initialization & multi-hotel reconciler
│   │   │   └── storage.py                  # Local filesystem & AWS S3 image storage providers
│   │   └── utils/
│   │       └── security.py                 # JWT encoding, bcrypt hashing, token verification
│   ├── sample_data/                        # Sample hospitality Excel reports for testing
│   ├── tests/                              # Pytest Automated Test Suite (83 Tests)
│   │   ├── fixtures/                       # Synthetic test report generator & oracle
│   │   ├── test_ai_and_cost.py             # Vision inference & quantity estimator tests
│   │   ├── test_analytics_and_intelligence.py # Operational intelligence engine tests
│   │   ├── test_api.py                     # Core REST API endpoint tests
│   │   ├── test_auth.py                    # Dual-token, RTR, and lockout tests
│   │   ├── test_calculations.py            # Tare weight & portion calculation tests
│   │   ├── test_date_and_weekday_validation.py # Date parsing & Day-of-week validation tests
│   │   ├── test_deletion_and_logins.py     # Soft-delete, restore, and session cleanup tests
│   │   ├── test_dish_intelligence_and_event_profiles.py # Dish intelligence & event profile tests
│   │   ├── test_excel_ingestion_pipeline.py# Synthetic report parsing & oracle tests
│   │   ├── test_master_analytics_audit.py  # Mass balance & Largest Remainder tests
│   │   └── test_report_parser_logic.py     # Sahara workbook accuracy & cutoff tests
│   ├── Dockerfile                          # Production Backend Container Build
│   ├── pytest.ini                          # Pytest configuration
│   └── requirements.txt                    # Python runtime dependencies
│
├── cloudflare-router/                      # Cloudflare Edge Router Worker
│   ├── src/index.js                        # Request routing between VPS API and Vercel UI
│   └── wrangler.toml                       # Wrangler configuration
│
├── frontend/                               # Next.js 14 App Router Frontend
│   ├── app/                                # Application Routes
│   │   ├── analytics/page.tsx              # 11-Tab Hospitality Culinary Analytics Workspace
│   │   ├── dashboard/page.tsx              # High-level operational overview & quick KPIs
│   │   ├── events/page.tsx                 # Historical & active banquet events list
│   │   ├── events/[id]/page.tsx            # Event overview & banquet menu
│   │   ├── events/[id]/analytics/page.tsx  # Event-specific waste breakdown & photo gallery
│   │   ├── events/[id]/report/page.tsx     # Printable executive audit report with chef sign-off
│   │   ├── events/[id]/scan/page.tsx       # Live camera scanner, HUD overlays, verification form
│   │   ├── foods/page.tsx                  # Master food catalog & physical parameters
│   │   ├── ingredients/page.tsx            # Raw ingredient procurement prices
│   │   ├── recipes/page.tsx                # Culinary recipes & batch yields
│   │   ├── settings/page.tsx               # AI mode toggle & ground-truth dataset export
│   │   ├── login/page.tsx                  # 1-Click demo authentication & role badges
│   │   ├── layout.tsx                      # Root layout with navigation & auth provider
│   │   └── middleware.ts                   # Edge route protection & reverse-proxy headers
│   ├── components/                         # Modular React UI Components
│   │   ├── analytics/                      # Analytics Subtab Sections & Modals
│   │   │   ├── AnalyticsSubtabsNav.tsx     # 11-subtab navigation bar with health badges
│   │   │   ├── AuditAndDataQualitySection.tsx # Mass-balance health & audit issues
│   │   │   ├── DailyTrendsSection.tsx      # Timeline, granularities, day-of-week trends
│   │   │   ├── DetailedDataTable.tsx       # Searchable, filterable culinary records ledger
│   │   │   ├── DishDetailModal.tsx         # Mathematical lineage & source row drawer
│   │   │   ├── DishIntelligenceSection.tsx # High-waste dishes, consistent performers, Pareto
│   │   │   ├── EventPerformanceSection.tsx # Event-level waste rankings & comparisons
│   │   │   ├── EventTypeIntelligenceWorkspace.tsx # Category benchmarking & intelligence
│   │   │   ├── ExcelUploadModal.tsx        # Ingestion preview modal & duplicate handler
│   │   │   ├── ExecutiveKpiGrid.tsx        # High-impact summary KPI metric cards
│   │   │   ├── ExecutiveOverviewSection.tsx# High-level briefing & key observations
│   │   │   ├── FinancialImpactSection.tsx  # Recipe cost analysis & What-If savings simulator
│   │   │   ├── GlobalFilterBar.tsx         # Unified sticky filter bar (Hotels, Dates, Shifts)
│   │   │   ├── LeftoverReuseSection.tsx    # Kitchen holds vs buffet returns & safe reuse
│   │   │   ├── ManagementInsightsSection.tsx # Deterministic chef action items (Situations 1–9)
│   │   │   ├── ParetoSection.tsx           # 80/20 culinary waste concentration analysis
│   │   │   ├── ServiceTypeAnalyticsSection.tsx # Buffet vs Set Menu vs Room Service
│   │   │   ├── SessionAnalyticsSection.tsx # Breakfast, Lunch, Dinner shift peaks
│   │   │   ├── WasteHeatmapSection.tsx     # Day vs Session operational intensity heatmap
│   │   │   └── subtabs/                    # Dedicated Full-Page Subtab Views
│   │   │       ├── DataQualitySubtab.tsx   # Data health scoring & discrepancy resolver
│   │   │       ├── EventsSubtab.tsx        # Banquet management & delete-impact modal
│   │   │       ├── EventTypesSubtab.tsx    # Event category profiles & benchmarks
│   │   │       ├── HotelsSubtab.tsx        # Multi-hotel property comparisons
│   │   │       └── ReportsSubtab.tsx       # End-of-day print-ready reports
│   │   └── Navbar.tsx                      # Header navigation with hotel switcher & user profile
│   ├── lib/                                # Utilities & Clients
│   │   ├── api.ts                          # Fetch client, silent token refresh, formatters
│   │   └── auth.tsx                        # React Authentication Context & hooks
│   ├── types/                              # TypeScript Type Definitions
│   │   ├── analytics.ts                    # Complete analytics schemas, filters, responses
│   │   └── index.ts                        # Core data models (User, Event, Food, Scan)
│   ├── Dockerfile                          # Multi-stage Next.js production build
│   └── package.json                        # Node.js dependencies
│
├── .github/workflows/                      # GitHub Actions Workflows
│   └── deploy.yml                          # Continuous Deployment to VPS with DB backup
├── excel/                                  # Real-World Operational Excel Reports (Sahara / Sitara)
├── models/trained/                         # Trained Weights (YOLO11m-seg 31/58 Classes)
├── scripts/                                # Utility & Demo Scripts
│   ├── merge_datasets.py                   # Indian food dataset merging utility
│   ├── run_bridge.sh                       # Tailscale socat network bridging script
│   ├── start_demo.sh / .bat                # 1-Click stack launch script (Linux/Windows)
│   ├── status_demo.sh                      # Service health & process inspection script
│   ├── stop_demo.sh / .bat                 # Clean service teardown script (Linux/Windows)
│   └── train_yolo.py                       # YOLO11m training script with checkpoint resuming
├── uploads/                                # Persistent directory for dish photos & annotated masks
├── camera_test.py                          # Real-time webcam YOLO segmentation tester
├── docker-compose.yml                      # Production Docker Compose orchestration
├── generate_analytics_deck.py              # Executive 12-slide presentation deck generator
├── test_model.py                           # Standalone CLI image inference tester
├── .env.example                            # Comprehensive environment configuration template
└── README.md                               # Platform Documentation
```

---

## 6. Environment Variables Reference

Configure these variables in your root `.env` file (copied from `.env.example`):

| Variable | Type | Default Value | Production Recommendation | Description |
|---|---|---|---|---|
| `APP_NAME` | String | `"PlateSight"` | `"PlateSight"` | Human-readable platform name. |
| `ENV` | String | `"development"` | `"production"` | Operational environment (`development` or `production`). |
| `DATABASE_URL` | String | `"sqlite:///./food_waste.db"` | `"postgresql://user:pass@host:5432/db"` | Database connection string. SQLite for zero-setup, PostgreSQL for enterprise scale. |
| `SECRET_KEY` | String | `"mvp-super-secret-key-..."` | *(Generate via `openssl rand -hex 32`)* | Cryptographic key used to sign JWT tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Integer| `30` | `30` | Lifespan of short-lived JWT access tokens. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Integer| `7` | `7` | Lifespan of long-lived rotating refresh tokens. |
| `MAX_FAILED_LOGIN_ATTEMPTS` | Integer| `5` | `5` | Failed logins before temporary account lockout. |
| `LOCKOUT_DURATION_MINUTES`  | Integer| `15` | `15` | Lockout duration in minutes after repeated failed logins. |
| `COOKIE_SECURE` | Boolean | `false` | `true` | Requires HTTPS for session cookies in production. |
| `AI_MODE` | String | `"yolo"` | `"yolo"` (or `"mock"`) | `yolo` runs PyTorch/ONNX models; `mock` runs deterministic simulation without GPU. |
| `AI_MODEL_PATH` | String | `"best.pt"` | `"models/trained/foodwaste_yolo11m_seg_31cls.pt"` | Path to trained segmentation weights. |
| `AI_CONFIDENCE_THRESHOLD` | Float | `0.70` | `0.70` | Minimum confidence score to pass without human-review flag. |
| `STORAGE_PROVIDER` | String | `"local"` | `"local"` or `"s3"` | Storage driver for captured dish photos. |
| `UPLOAD_DIR` | String | `"uploads"` | `"/app/uploads"` or `"uploads"` | Local directory path for photo uploads. |
| `S3_BUCKET` | String | `""` | `"my-hotel-scans"` | AWS S3 / Cloudflare R2 bucket name (when `STORAGE_PROVIDER=s3`). |
| `S3_ENDPOINT` | String | `""` | `"https://<account>.r2.cloudflarestorage.com"` | Custom S3 endpoint URL (optional). |
| `S3_ACCESS_KEY` | String | `""` | *(AWS Access Key ID)* | S3 access key. |
| `S3_SECRET_KEY` | String | `""` | *(AWS Secret Access Key)* | S3 secret key. |
| `DEMO_EMAIL` | String | `"gandhaar.joshi@platesight.in"`| *(Admin email)* | Initial administrative user seeded on startup. |
| `DEMO_PASSWORD` | String | `"pass1234"` | *(Strong Password)* | Password for initial administrative user. |
| `DEMO_HOTEL_NAME` | String | `"Dolphin Hotels"` | `"Dolphin Hotels"` | Initial hotel property seeded on startup. |
| `NEXT_PUBLIC_API_URL` | String | `""` | `""` (relative) or `"https://backapi.platesight.in"` | Public API URL for browser clients. |
| `BACKEND_INTERNAL_URL` | String | `"http://127.0.0.1:8000"` | `"http://127.0.0.1:8000"` | Internal backend URL for Next.js SSR and rewrites. |

---

## 7. Installation & Quick Start Guide

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12 (with `python-venv` and `pip`).
- **Node.js**: 18.x or 20.x (with `npm`).
- **Git**: For cloning and branch operations.

---

### Option A: 1-Click Launch Scripts (Linux / macOS / Windows)

The project includes production-ready convenience scripts that manage environment setup, service launching, and background processes.

#### On Linux / macOS:
```bash
# 1. Clone repository
git clone https://github.com/GandhaarJ/ramoji.git
cd ramoji

# 2. Launch complete stack (Backend + Frontend)
./start_demo.sh

# Check running status and health
./status_demo.sh

# Stop all background services cleanly
./stop_demo.sh
```

#### On Windows:
Double-click `start_demo.bat` (or run in Command Prompt):
```cmd
start_demo.bat
```
To stop the application, run:
```cmd
stop_demo.bat
```

Once started:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option B: Manual Local Setup (Python + Next.js)

#### 1. Backend Setup
```bash
# From repository root
cd backend

# Create virtual environment & activate
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Run FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
In a second terminal:
```bash
# From repository root
cd frontend

# Install npm packages
npm install

# Start Next.js development server
npm run dev
```

---

### Option C: Production Docker Compose Stack

Launch the containerized stack (PostgreSQL + FastAPI + Next.js):
```bash
docker compose up --build -d
```
To view logs:
```bash
docker compose logs -f backend
```

---

### Pre-Seeded Demo Credentials

When the database is seeded, the following accounts are automatically provisioned:

| Email | Password | Role | Permissions |
|---|---|---|---|
| `gandhaar.joshi@platesight.in` | `pass1234` | **Admin** | Full system access (Scanning, Uploads, Catalog, User Management, Settings). |
| `demo@example.com` | `demo123` | **Admin** | Full system access for local Docker demos. |
| `test@platesight` | `pass1234` | **Restricted Admin** | Full access to Analytics, Events, Catalog, Recipes; photo scanning disabled for test safety. |
| `test@platesight.in` | `pass1234` | **Restricted Admin** | Full access to Analytics, Events, Catalog, Recipes; photo scanning disabled for test safety. |

> **1-Click Login**: On the web login screen (`/login`), click any quick-login badge (**Admin Demo**, **Test Account**, etc.) to immediately populate credentials and sign in.

---

## 8. Complete REST API Reference

All protected endpoints require either an `Authorization: Bearer <token>` header or a valid `access_token` session cookie.

### Authentication & Users (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticates user; returns access token & sets HttpOnly refresh token cookie. |
| `POST` | `/api/auth/refresh` | Rotates refresh token (RTR) and issues fresh 30-min access token. |
| `POST` | `/api/auth/logout` | Revokes active session in database and clears session cookies. |
| `GET` | `/api/auth/me` | Returns current user profile, role, and linked hotel property. |

### Hospitality Analytics & Ingestion (`/api/analytics`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/overview` | Primary endpoint powering the 11 subtabs; returns KPIs, trends, and intelligence. |
| `POST`| `/api/analytics/upload/preview` | Two-stage ingestion preview; parses file, verifies math, returns confidence scores. |
| `POST`| `/api/analytics/upload/confirm` | Commits previewed rows with duplicate handling (`import`, `replace`, `skip`). |
| `GET` | `/api/analytics/dish-drilldown` | Returns full mathematical lineage, ingredient breakdown, and source row for a dish. |
| `GET` | `/api/analytics/hotels` | Returns property-level normalized waste and comparison metrics. |
| `GET` | `/api/analytics/event-types` | Returns category benchmarks across Weddings, Conferences, and Galas. |
| `GET` | `/api/analytics/eod-report` | Generates printable end-of-day hospitality reports with chef sign-off lines. |
| `GET` | `/api/analytics/data-quality` | Returns audit health score (0–100%) and mass-balance discrepancy records. |
| `GET` | `/api/analytics/records` | Returns paginated raw culinary ledger records. |
| `DELETE`| `/api/analytics/imports/{import_id}`| Deletes all records associated with a specific batch import. |
| `DELETE`| `/api/analytics/records` | Deletes records matching specific date or hotel scope. |
| `POST`| `/api/analytics/plan-menu` | AI menu planning recommendation engine based on historical consumption. |

### AI Waste Scanning & Retraining (`/api/events/{id}/scan`, `/api/scans`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events/{event_id}/scan` | Uploads dish photo, runs YOLO segmentation, estimates grams, and auto-populates menu. |
| `GET`  | `/api/events/{event_id}/scans`| Retrieves all historical camera scans for a banquet event. |
| `GET`  | `/api/scans/{id}` | Fetches individual scan record with bounding boxes and polygon masks. |
| `PUT`  | `/api/scans/{id}/verify` | Human-in-the-loop review: updates food label, weight override, or marks verified. |
| `DELETE`| `/api/scans/{id}` | Deletes a waste scan record and recalculates event metrics. |
| `GET`  | `/api/scans/training-dataset`| Exports all verified scans as ground-truth dataset JSON for retraining. |

### Banquet Events Management (`/api/events`)
| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/events` | Retrieves banquet events list with waste metrics and status badges. |
| `POST` | `/api/events` | Creates a new banquet event (date, venue, expected guests, service format). |
| `GET`  | `/api/events/{id}` | Fetches detailed banquet event profile with menu items and scans. |
| `PUT`  | `/api/events/{id}` | Updates event details, actual guest attendance (PAX), or status. |
| `GET`  | `/api/events/{id}/delete-impact`| Returns count of scans, dishes, and records affected before deletion. |
| `DELETE`| `/api/events/{id}` | Safely soft-deletes (`is_archived = True`) an event and its records. |
| `POST` | `/api/events/{id}/restore` | Restores an archived event. |
| `GET`  | `/api/events/categories` | Retrieves all built-in and custom banquet event categories. |
| `POST` | `/api/events/categories` | Creates a new custom event category. |
| `DELETE`| `/api/events/categories/{id}` | Deletes a custom event category. |

### Recipes, Ingredients & Food Catalog (`/api/recipes`, `/api/ingredients`, `/api/foods`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/ingredients` | List and create raw ingredients with procurement unit costs (₹/kg, ₹/L). |
| `PUT` / `DELETE`| `/api/ingredients/{id}` | Update or delete ingredient procurement pricing. |
| `GET` / `POST` | `/api/recipes` | List and create culinary recipes with expected batch yields (grams). |
| `PUT` / `DELETE`| `/api/recipes/{id}` | Update recipe batch yields or ingredient allocations. |
| `GET` / `POST` | `/api/foods` | List and create food catalog items with bulk density ($g/\text{cm}^3$) and pan depth ($cm$). |
| `PUT` / `DELETE`| `/api/foods/{id}` | Update physical food calibration settings. |

### System Settings & Health (`/api/settings`, `/api/health`)
| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/health` | Service health check, active AI mode (`yolo`/`mock`), and model version. |
| `GET`  | `/api/settings` | Returns active AI mode and confidence thresholds. |
| `PUT`  | `/api/settings` | Updates AI mode (`yolo` $\leftrightarrow$ `mock`) and detection thresholds at runtime. |

---

## 9. Automated Testing & Verification Suite

The repository includes a comprehensive automated test suite consisting of **83 tests across 10 test suites**, achieving a **100% pass rate**.

```
============================= test session starts ==============================
collected 83 items

backend/tests/test_ai_and_cost.py .....                                  [  6%]
backend/tests/test_analytics_and_intelligence.py ..............          [ 22%]
backend/tests/test_api.py .....                                          [ 28%]
backend/tests/test_auth.py .........                                     [ 39%]
backend/tests/test_calculations.py ..........                            [ 51%]
backend/tests/test_date_and_weekday_validation.py .........              [ 62%]
backend/tests/test_deletion_and_logins.py ....                           [ 67%]
backend/tests/test_dish_intelligence_and_event_profiles.py ..            [ 69%]
backend/tests/test_excel_ingestion_pipeline.py ..........                [ 81%]
backend/tests/test_master_analytics_audit.py ..........                  [ 93%]
backend/tests/test_report_parser_logic.py .....                          [100%]

======================= 83 passed, 3 warnings in 31.42s ========================
```

### Running the Test Suite
```bash
# Run the entire test suite
./backend/venv/bin/pytest backend/tests

# Run with verbose output and timing
./backend/venv/bin/pytest -v backend/tests

# Run a specific test module (e.g. Ingestion Pipeline & Oracle)
./backend/venv/bin/pytest -v backend/tests/test_excel_ingestion_pipeline.py
```

### Test Coverage Highlights
- **`test_excel_ingestion_pipeline.py`**: Validates all 8 synthetic benchmark fixtures (Fixtures A through H) against an independent ground-truth mathematical oracle:
  - *Fixture A*: Clean single-table standard layouts.
  - *Fixture B*: Multi-sheet workbooks spanning multiple properties (Sahara, Sitara, Dolphin).
  - *Fixture C*: Offset headers and blank row padding.
  - *Fixture D*: Merged cell hierarchies and multi-level subheadings.
  - *Fixture E*: Non-standard regional culinary synonyms.
  - *Fixture F*: Missing columns with automatic recipe fallback defaults.
  - *Fixture G*: Grand total tables, footer cutoffs, and footnote noise filtering.
  - *Fixture H*: High-volume multi-session stress testing.
- **`test_master_analytics_audit.py`**: Verifies mass-balance discrepancy tracking (e.g. 529.18kg leftover vs 523.48kg accounted for) and Largest Remainder currency bucket allocations.
- **`test_auth.py`**: Validates dual-token rotation (RTR), session revoking, SHA-256 token hashing, and 5-attempt brute-force lockout.
- **`test_ai_and_cost.py`**: Verifies Shoelace polygon calculations, volume scaling, physical density math, and recipe yield costing per gram.
- **`test_deletion_and_logins.py`**: Ensures soft-deletion prevents database resurrection bugs and cleans up related records cleanly.

---

## 10. Cloud Hosting & Production Deployment

PlateSight is hosted on a high-performance hybrid infrastructure:
- **Frontend**: Next.js 14 App Router deployed on **Vercel** (`frontend-wine-ten-90.vercel.app`), delivering sub-second edge rendering and zero-cold-start worldwide delivery.
- **Backend**: FastAPI 0.110+ running on an **Ubuntu VPS** (`backapi.platesight.in`) with systemd service supervision, PyTorch, and local model weights.
- **Edge Routing**: A **Cloudflare Worker** (`cloudflare-router/src/index.js`) unifies the domains, proxying API routes to the VPS while serving web pages from Vercel without cross-origin or SSL errors.

### Deploying Updates via GitHub Actions
Every push to `main` triggers `.github/workflows/deploy.yml`:
1. The frontend is built on Ubuntu runners and packaged into a tarball.
2. The deployment runner connects to the VPS over SSH.
3. The active SQLite database (`food_waste.db`) is automatically backed up to `/tmp/food_waste_backup.db` prior to git reset.
4. The latest code is unpacked, python dependencies are refreshed, and the live database is restored.
5. Systemd services are restarted and verified using automated HTTP health checks.

---

## 11. License & Maintainers

- **Author & Lead Architect**: Gandhaar Joshi ([@GandhaarJ](https://github.com/GandhaarJ))
- **Contributors**: Piyush10518
- **Platform**: Developed for Dolphin Hotels / Ramoji Film City operations.
- **License**: Proprietary / Enterprise Hospitality License. All rights reserved.

---
*PlateSight — Turning Commercial Kitchen Leftovers into Measurable Culinary Intelligence.*
