-- 1. Create table for machine learning forecasting results
DROP TABLE IF EXISTS forecast_result CASCADE;
CREATE TABLE IF NOT EXISTS forecast_result (
  id BIGSERIAL PRIMARY KEY,
  tanggal_prediksi DATE NOT NULL,
  komoditas VARCHAR(50) NOT NULL,
  periode VARCHAR(20) NOT NULL, -- '1_bulan' or '3_bulan'
  prediksi_harga NUMERIC(12,2) NOT NULL,
  lower_bound NUMERIC(12,2) NOT NULL,
  upper_bound NUMERIC(12,2) NOT NULL,
  akurasi NUMERIC(5,2), -- e.g., 100 - MAPE
  mape NUMERIC(8,3) NOT NULL,
  faktor_utama JSONB NOT NULL, -- JSON array of top 3 contributor factors e.g., ["Menjelang Idul Fitri (+15.2%)", "Curah hujan tinggi (+4.3%)", ...]
  narasi TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate forecasts for the same commodity, prediction target date, and forecast horizon (periode)
  UNIQUE(komoditas, tanggal_prediksi, periode)
);
