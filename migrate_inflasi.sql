-- 1. Create table for BPS monthly inflation data
DROP TABLE IF EXISTS inflasi_ml CASCADE;
CREATE TABLE IF NOT EXISTS inflasi_ml (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  ihk NUMERIC(8,3),
  inflasi_mtm NUMERIC(8,3),
  inflasi_yoy NUMERIC(8,3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicates for the same month and year
  UNIQUE(tahun, bulan)
);

-- 2. Create table to store machine learning retraining history and metrics
CREATE TABLE IF NOT EXISTS ml_metrics (
  id BIGSERIAL PRIMARY KEY,
  trained_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  mae NUMERIC(8,3) NOT NULL,
  rmse NUMERIC(8,3) NOT NULL,
  mape NUMERIC(8,3) NOT NULL,
  data_rows INT NOT NULL
);

-- 3. Re-create database view combining food prices, weather, and inflation
DROP VIEW IF EXISTS forecast_dataset;
CREATE OR REPLACE VIEW forecast_dataset AS
SELECT 
  h.tahun,
  h.bulan,
  h.harga_beras,
  h.harga_bawang_merah,
  h.harga_bawang_putih,
  h.harga_cabai_merah,
  h.harga_cabai_rawit,
  h.harga_daging_sapi,
  h.harga_daging_ayam_ras,
  h.harga_telur_ayam_ras,
  h.harga_gula_pasir,
  h.harga_minyak_goreng,
  c.curah_hujan_mm,
  c.suhu_c,
  c.kelembapan,
  c.hari_hujan,
  c.kecepatan_angin,
  i.ihk,
  i.inflasi_mtm,
  i.inflasi_yoy
FROM harga_pangan_ml h
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
LEFT JOIN inflasi_ml i ON h.tahun = i.tahun AND h.bulan = i.bulan
ORDER BY h.tahun ASC, h.bulan ASC;
