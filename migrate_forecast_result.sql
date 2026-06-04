-- Drop existing table if exists
DROP TABLE IF EXISTS forecast_result CASCADE;

-- Create forecast_result table with the new schema (one row per commodity)
CREATE TABLE forecast_result (
  id BIGSERIAL PRIMARY KEY,
  komoditas VARCHAR(50) UNIQUE NOT NULL,
  harga_aktual NUMERIC(12,2),
  forecast_1m NUMERIC(12,2),
  forecast_3m NUMERIC(12,2),
  perubahan_pct NUMERIC(6,2),
  lower_bound NUMERIC(12,2),
  upper_bound NUMERIC(12,2),
  cv NUMERIC(6,2),
  growth_yoy NUMERIC(6,2),
  status_forecast VARCHAR(20),
  status_cv VARCHAR(20),
  status_skpg VARCHAR(20),
  confidence NUMERIC(5,2),
  drivers JSONB, -- JSON array of strings: top 3 driver factors
  narasi TEXT, -- Automatic narrative interpretation
  rekomendasi JSONB, -- JSON array of strings: recommended actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create model_registry table to log best model and metrics
DROP TABLE IF EXISTS model_registry CASCADE;
CREATE TABLE model_registry (
  id BIGSERIAL PRIMARY KEY,
  komoditas VARCHAR(50) NOT NULL,
  model_name VARCHAR(50) NOT NULL,
  mape NUMERIC(8,3) NOT NULL,
  rmse NUMERIC(12,2) NOT NULL,
  mae NUMERIC(12,2) NOT NULL,
  trained_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
