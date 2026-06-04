# Project Blueprint: Dashboard Ketahanan Pangan (Ketapang-Cilegon)

This document serves as a comprehensive technical guide and architectural blueprint for the **Ketapang-Cilegon Food Security Dashboard** application. It provides developers and collaborators with zero prior context a complete overview of the system's codebase, data flow, ML engine, and database design.

---

## 1. Project Overview

### App Name & Purpose
* **App Name**: Dashboard Ketapang (Ketahanan Pangan Kota Cilegon).
* **Purpose**: A comprehensive monitoring, forecasting, and early warning system designed to track food security indicators, price volatility, and nutritional levels across all kecamatan and kelurahan in Cilegon City.
* **Target Users**: Officers at the Food Security and Agriculture Office of Cilegon City (Dinas Ketahanan Pangan dan Pertanian Kota Cilegon), regional policy decision makers, and related public administrators.

### Core Problems Solved
1. **Real-time Price Volatility Monitoring**: Scrapes daily market prices from the government's SAGON portal (`sagon.cilegon.go.id`) and computes average prices across three main markets in Cilegon.
2. **Machine Learning Price Forecasting**: Predicts future prices for 10 strategic food commodities up to 3 months ahead using a custom TypeScript-implemented ML training pipeline.
3. **Early Warning System (EWS)**: Evaluates a 3-layer alert system based on price forecast trends, volatility coefficients of variation (CV), and SKPG YoY growth rates.
4. **Spatial Vulnerability Mapping**: Maps geographic vulnerability across kelurahans using a composite Borda Count Desil prioritizing index that integrates FSVA (Food Security and Vulnerability Atlas) and SKPG datasets.

### Current Status
* **Development / Production-Ready**: Features fully operational database seeding, ETL pipelines, scraping cron endpoints, ML model evaluation registries, dynamic UI widgets, and cached AI insight generation.

---

## 2. Tech Stack

### Core Framework & Runtime
* **Framework**: Next.js 16.2.6 (App Router configuration)
* **Language**: TypeScript
* **Runtime**: Node.js v20+ / Web browser
* **Library**: React 19.2.4 / React-DOM 19.2.4

### UI & Styling Libraries
* **Styling**: TailwindCSS v4 with `@tailwindcss/postcss` and Vanilla CSS (`src/app/globals.css`).
* **Icons**: `lucide-react`
* **Charts**: `recharts` for time-series charts, line graphs, and composite bar/area charts.
* **Maps**: `leaflet` and `react-leaflet` for interactive map layers and geo-spatial kelurahan polygons.

### Database & Backend Services
* **Database**: Supabase (PostgreSQL) with disabled Row-Level Security (RLS) for anonymous seeder/client data retrieval.
* **Backend**: Next.js Route Handlers (API folder).
* **AI Analysis**: Google Gemini API via `gemini-2.5-flash-lite` model for real-time executive report generation.

### Key Third-Party Libraries
* **Cheerio (`^1.2.0`)**: Scraping and HTML parsing of the SAGON market tables.
* **XLSX (`^0.18.5`)**: Excel parsing for spreadsheet uploads and official Excel template generation.
* **Turf.js (`^7.3.5`)**: Spatial calculations and geo-boundary operations on map files.
* **Mapbox ToGeoJSON (`^0.16.2`)**: Parsing KML/KMZ files into GeoJSON format.

---

## 3. Folder & File Structure

Below is the annotated directory layout of the repository:

```
dashboard-ketapang/
├── public/                       # Static assets (images, logos, maps)
├── src/
│   ├── app/                      # Next.js App Router root
│   │   ├── admin/                # Administrator panel view
│   │   ├── api/                  # API endpoints
│   │   │   ├── ai-insight/       # Gemini AI insight caching and generator
│   │   │   ├── etl-ml/           # ETL execution endpoint for weather, inflation, prices
│   │   │   ├── harga-sagon/      # Daily price scraping and database fallback archiver
│   │   │   ├── ml/               # Machine Learning endpoints
│   │   │   │   ├── explain/      # Forecast explainer and EWS metric retriever
│   │   │   │   ├── predict/      # Forecast results fetcher
│   │   │   │   ├── retrain/      # Trigger retraining pipeline
│   │   │   │   └── train/        # Model retraining alias
│   │   │   └── sagon-bulanan/    # Monthly price scraper for chart histories
│   │   ├── entry/                # Data entry and Excel upload panel route
│   │   ├── forecast/             # ML Forecast and EWS panel route
│   │   ├── globals.css           # Global theme, tailwind imports, and scrollbars
│   │   ├── layout.tsx            # Main layout containing root HTML/Body
│   │   └── page.tsx              # Main dashboard hub page with KPI slider and MapUnified
│   ├── components/               # React UI Components
│   │   ├── AIInsightPanel.tsx    # Renders the AI analysis markdown panel
│   │   ├── AnalisisSKPG.tsx      # SKPG data grid, Borda analysis, and PMT indicators
│   │   ├── BalitaDoughnut.tsx    # Toddler nutritional status donut chart
│   │   ├── BenchmarkPanel.tsx    # RPJMD comparison benchmarks and target metrics
│   │   ├── CVGauge.tsx           # Price Volatility gauge widget
│   │   ├── ForecastPanel.tsx     # Forecasting data grid and EWS details
│   │   ├── HargaPanel.tsx        # Market price panel with daily average indicators
│   │   ├── IKPTrendChart.tsx     # IKP historical progression chart
│   │   ├── KerawananPanel.tsx    # IKP and Borda prioritize deciles panel
│   │   ├── MapLayers.tsx         # Leaflet map vector tiles, polygons, and popups
│   │   ├── MapUnified.tsx        # Leaflet Map container and mode selector
│   │   ├── Navbar.tsx            # Filters (Kecamatan, Kelurahan, Month, Year)
│   │   ├── Sidebar.tsx           # Navigation menu and dashboard collapse drawer
│   │   ├── TentangAplikasi.tsx   # ML Validation notes and documentation
│   │   └── UploadPanel.tsx       # Spreadsheet parsing engine and manual data forms
│   └── lib/                      # Core utility functions and ML engine
│       ├── fsva/                 # FSVA index calculation modules
│       │   ├── composite-score.ts# Composite index formula calculations
│       │   ├── constants.ts      # NCPR weights and priorities cutoff constants
│       │   ├── form1-calculator.ts# Raw indicator normalizations and NCPR formula
│       │   └── normalization.ts  # Linear normalizations (0 to 100 scale)
│       ├── ml/                   # Machine learning model modules
│       │   ├── algorithms.ts     # LinearRegression, DecisionTree, RandomForest, XGBoost, Prophet
│       │   ├── evaluate.ts       # Performance metrics evaluator (MAPE, MAE, RMSE)
│       │   ├── explain.ts        # Explainer attributing prediction drivers
│       │   ├── predict.ts        # Fetch latest database predictions
│       │   └── train_model.ts    # Main pipeline doing fit, select, forecast, EWS, and db save
│       ├── benchmark.ts          # Static list of national standards and historic targets
│       ├── etl-inflation.ts      # BPS monthly inflation data fetcher
│       ├── etl-sagon.ts          # Monthly SAGON scraper parser
│       ├── etl-weather.ts        # Weather parameters calculator
│       ├── ml.ts                 # ML retraining execution link
│       ├── supabase.ts           # Supabase JS Client initialization
│       └── wilayah.ts            # Static mapping of Cilegon Kecamatan -> Kelurahan
├── migrate_*.sql                 # PostgreSQL DDL migrations scripts
├── package.json                  # Dependencies and scripts definitions
├── tsconfig.json                 # TypeScript compiler configuration
└── vercel.json                   # Vercel serverless functions configuration
```

### Entry Points
* **Main Landing Page**: `src/app/page.tsx`
* **Global Layout Wrapper**: `src/app/layout.tsx`
* **Excel Upload Page**: `src/app/entry/page.tsx`
* **Forecast Details Page**: `src/app/forecast/page.tsx`
* **Scraper API Route**: `src/app/api/harga-sagon/route.ts`

---

## 4. Architecture & Data Flow

### Data Lifecycle
```
[SAGON / BPS / BMKG]         [Excel Spreadsheets]
         │                            │
         ▼                            ▼
   [API Scrapers]            [UploadPanel Parser]
         │                            │
         └─────────────┬──────────────┘
                       ▼
               [Supabase Tables]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  [ML Forecast Core]        [Frontend Panels]
  - Algorithms.ts           - MapUnified (Leaflet)
  - Train_model.ts          - KPI Cards / Gauges
         │                           │
         ▼                           ▼
[forecast_result table]  ◄── [API endpoints]
```

### External Integrations
1. **SAGON API Scraping**:
   - Fetches dynamic daily prices from `https://sagon.cilegon.go.id/` using market code payloads (Pasar Baru Cilegon, Pasar Blok F, Pasar Baru Merak).
   - Fetches historical monthly price indices from `https://sagon.cilegon.go.id/infografis/filter` using POST filtration ranges.
2. **Google Gemini API**:
   - Summarizes food security indicators, toddler nutrition stats, prices, and IKP metrics to generate executive insights. Caches response for 6 hours.

### Database Schema (Supabase PostgreSQL)
* **`harga_pangan`**: Stores historical prices unfiltered by region.
* **`ketersediaan_pangan`**: Stores yearly/monthly production and NBM index scores.
* **`gizi_masyarakat`**: Stores IKP, PPH, consumption metrics, and undernourishment (POU).
* **`pou_data`**: Stores historic Prevalence of Undernourishment (POU) comparison lists (National, Banten, Cilegon).
* **`harga_sagon_harian`**: Archives parsed daily market averages.
* **`gizi_balita`**: Archives toddler underweight/wasting metrics per kelurahan.
* **`intervensi_kelurahan`**: Archives GPM operations and free food aid packages.
* **`fsva_matang`**: Pre-calculated mature FSVA indicators per kelurahan.
* **`skpg_matang`**: Pre-calculated mature SKPG gizi metrics per kelurahan.
* **`cv_beras_data`**, **`pph_data`**, **`produksi_beras_data`**: KPI lookup tables.
* **`ai_insights_cache`**: Caches Gemini responses (`tahun`, `bulan`, `kecamatan`, `kelurahan`, `insight`).
* **`forecast_result`**:
  * `komoditas` (Unique Key, e.g. `harga_beras`)
  * `harga_aktual`, `forecast_1m`, `forecast_3m`, `perubahan_pct`
  * `lower_bound`, `upper_bound`
  * `cv`, `growth_yoy`
  * `status_forecast`, `status_cv`, `status_skpg`
  * `confidence`, `drivers` (JSON array), `narasi` (TEXT), `rekomendasi` (JSON array)
* **`model_registry`**: Registers the selected model (`xgboost`, `prophet`, `randomforest`) and evaluation metrics (`mape`, `rmse`, `mae`) for audit logs.

---

## 5. Key Components & Modules

### Frontend UI Components
1. **`MapUnified.tsx`**: Renders Leaflet polygon overlays. Includes 4 display modes:
   * **FSVA**: Categorizes kelurahan IKP into 6 vulnerability priority groups (Priority 1 to Priority 6).
   * **SKPG**: Maps underweight and wasting prevalence.
   * **Borda Count Desil**: Computes ranks using combined FSVA/SKPG variables, mapping deciles D1-D5 (Priority) and D6-D10 (Secure).
   * **Intervensi**: Maps GPM operations and distribution numbers.
2. **`AIInsightPanel.tsx`**: Displays AI reports. When no API key is set, it falls back to a rule-based Heuristic Report Generator to avoid downtime.
3. **`UploadPanel.tsx`**: Validates uploaded Excel files against pre-generated template files. Supports manual overrides.
4. **`Sidebar.tsx`**: Left navigation drawer controlling view states (`beranda`, `forecast`, `skpg`, `admin`, `tentang`).

### API Routes
* **`GET /api/harga-sagon`**: Scrapes daily prices. Implements 7-day backward retry loops and falls back to Supabase archive if SAGON goes offline.
* **`POST /api/etl-ml`**: Coordinates weather, inflation, and SAGON monthly data collection, then automatically triggers model retraining.
* **`GET /api/ml/predict`**: Fetches forecasted prices from the `forecast_result` table.
* **`GET /api/ml/explain`**: Fetches the detailed EWS metrics, narratives, and action recommendations for a commodity.
* **`POST /api/ai-insight`**: Generates cached Gemini analysis reports.

---

## 6. ML / Forecasting / EWS Modules

### Algorithms (Implemented in TypeScript)
* **`solveLinearRegression`**: Basic Least-Squares Multiple Linear Regression using Gaussian Elimination with partial pivoting.
* **`DecisionTreeRegressor`**: Recursive binary splits minimizing MSE variance.
* **`RandomForestRegressor`**: Ensemble of decision trees using Bootstrap sample bagging and feature selection limits.
* **`XGBoostRegressor`**: Gradient Boosted trees sequentially minimizing residuals.
* **`ProphetRegressor`**: Additive model utilizing normalized feature parameters.

### Input Features (25 Engineered Features)
1. **Lags**: Price values at `T-1`, `T-2`, `T-3`.
2. **Rollings**: 3-month moving average, 6-month moving average, 3-month rolling standard deviation.
3. **Trends**: 3-month price trend (`T-1 - T-3`), YoY growth rate, 12-month coefficient of variation.
4. **Macro**: BPS inflation rates (MoM, YoY) and Consumer Price Index (IHK).
5. **Weather**: BMKG rainfall (mm), temperature (°C), humidity (%), and wet days count.
6. **Calendar**: Islamic month flags (Ramadhan, Idul Fitri, Idul Adha), Nataru holidays, and count of days remaining until major holidays.

### Execution Trigger
* Models are trained asynchronously via the `/api/etl-ml` pipeline or manually via `/api/ml/retrain`.
* Outputs are stored inside the `forecast_result` table. The frontend accesses these results statically from the database on page load.

---

## 7. State Management & Reactivity

### Client Reactivity
The main page (`src/app/page.tsx`) acts as the state controller, passing filters down to panels:
* **Selected Year & Month**: Updates date boundaries (defaults to 2025/Month 2).
* **Selected Kecamatan & Kelurahan**: Cascades down to narrow price averages, toddler statistics, map boundaries, and AI insights.
* **Loading State**: Displays a premium gradient marquee progress bar and cycles through rotating status tips during active DB queries.

### Performance Optimizations
* **Concurrent Fetches**: All 16 database and API scraper fetches run concurrently using `Promise.all` in `fetchData()`, minimizing loading times.
* **Dynamic / Lazy Imports**: Heavy modules such as Leaflet maps (`MapUnified`), Recharts (`ProduksiLokalChart`), and tables are imported with `dynamic(() => import(...), { ssr: false })` to avoid rendering blocking.

---

## 8. Environment Variables & Configuration

The application requires a `.env.local` file containing:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anonymous_key
GEMINI_API_KEY=your_google_gemini_api_key
```

* **`NEXT_PUBLIC_SUPABASE_URL`**: Target Supabase instance REST endpoint.
* **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Anonymous access token for database transactions.
* **`GEMINI_API_KEY`**: API credential for Gemini model execution (optional; if missing, system automatically falls back to static rule-based analysis).

---

## 9. Known Limitations & Technical Debt

1. **SAGON Website Scraping Dependency**:
   - Daily prices and monthly records rely on scraping HTML structures from `sagon.cilegon.go.id`. If the markup changes, parsing will fail.
   - *Mitigation*: Fallback mechanisms query Supabase historic archives and fallback dates (`2026-05-13`) to prevent crashes.
2. **Missing Row-Level Security (RLS)**:
   - RLS is disabled on several tables (e.g. `fsva_matang`, `skpg_matang`) to simplify seeder imports. This must be secured with proper policies if exposed to the open web.
3. **Hardcoded Commodities Assumptions**:
   - Commodity forms and parsing use static lists of 10 items. Adding commodities requires modifying arrays inside `train_model.ts` and `UploadPanel.tsx`.

---

## 10. Deployment & Infrastructure

* **Hosting Platform**: Vercel.
* **Build Command**: `npm run build` (translates to `next build`).
* **Start Command**: `npm run start` (translates to `next start`).
* **Dev Command**: `npm run dev` (translates to `next dev`).
* **Serverless Functions TTL**: Handled via `vercel.json` configurations.
