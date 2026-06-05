-- ==========================================================
-- SUPABASE BACKUP DUMP - DASHBOARD KETAPANG
-- Generated on: 2026-06-05T02:55:55.631Z
-- ==========================================================

-- --- SCHEMA FROM supabase_schema.sql ---
-- Skema Database: Dashboard Ketahanan Pangan Kota

-- 1. Tabel Harga Pangan Strategis
CREATE TABLE harga_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal date NOT NULL,
  kecamatan varchar(100),
  beras numeric,
  telur numeric,
  daging_ayam numeric,
  minyak_goreng numeric,
  gula_pasir numeric,
  cabe_merah numeric,
  cv_harga numeric, -- Coefficient of Variation (CV) rata-rata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Produksi & NBM
CREATE TABLE ketersediaan_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int,
  produksi_beras_ton numeric,
  skor_nbm numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Konsumsi & Gizi
CREATE TABLE gizi_masyarakat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  kecamatan varchar(100),
  skor_pph numeric,
  konsumsi_energi_kkal numeric,
  konsumsi_protein_gram numeric,
  prevalensi_stunting numeric, -- Status gizi balita
  pou numeric, -- Prevalence of Undernourishment
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Intervensi & Bantuan
CREATE TABLE intervensi_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int,
  kecamatan varchar(100),
  penerima_bantuan_jiwa int,
  kegiatan_gpm int, -- Jumlah kegiatan Gerakan Pangan Mandiri
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel POU Lintas Tahun (Nasional, Provinsi Banten, Kota Cilegon)
CREATE TABLE pou_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  pou_nasional numeric NOT NULL,
  pou_provinsi numeric NOT NULL,
  pou_cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- (Tabel geospasial Peta SKPG & FSVA biasanya dimuat dari GeoJSON terpisah
-- atau disimpan di PostGIS jika Supabase PostGIS extension diaktifkan).


-- --- SCHEMA FROM migrate_ml.sql ---
CREATE TABLE IF NOT EXISTS harga_pangan_ml (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  harga_beras INT,
  harga_bawang_merah INT,
  harga_bawang_putih INT,
  harga_cabai_merah INT,
  harga_cabai_rawit INT,
  harga_daging_sapi INT,
  harga_daging_ayam_ras INT,
  harga_telur_ayam_ras INT,
  harga_gula_pasir INT,
  harga_minyak_goreng INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicates for the same month and year
  UNIQUE(tahun, bulan)
);


-- --- SCHEMA FROM migrate_cuaca.sql ---
-- 1. Create table for weather machine learning dataset
CREATE TABLE IF NOT EXISTS cuaca_ml (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  curah_hujan_mm NUMERIC,
  suhu_c NUMERIC,
  kelembapan NUMERIC,
  hari_hujan INT,
  kecepatan_angin NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicates for the same month and year
  UNIQUE(tahun, bulan)
);

-- 2. Create database view combining food prices and weather data
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
  c.kecepatan_angin
FROM harga_pangan_ml h
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
ORDER BY h.tahun ASC, h.bulan ASC;


-- --- SCHEMA FROM migrate_inflasi.sql ---
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


-- --- SCHEMA FROM migrate_kalender.sql ---
-- 1. Create table for calendar events dataset
DROP TABLE IF EXISTS kalender_ml CASCADE;
CREATE TABLE IF NOT EXISTS kalender_ml (
  id BIGSERIAL PRIMARY KEY,
  tanggal DATE UNIQUE NOT NULL,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  is_hbkn BOOLEAN DEFAULT FALSE,
  is_ramadhan BOOLEAN DEFAULT FALSE,
  is_idul_fitri BOOLEAN DEFAULT FALSE,
  is_idul_adha BOOLEAN DEFAULT FALSE,
  is_nataru BOOLEAN DEFAULT FALSE,
  is_libur_sekolah BOOLEAN DEFAULT FALSE,
  hari_ke_ramadhan INT,
  hari_ke_idul_fitri INT,
  hari_ke_idul_adha INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Create monthly aggregated calendar feature view
DROP VIEW IF EXISTS kalender_feature CASCADE;
CREATE OR REPLACE VIEW kalender_feature AS
SELECT 
  tahun,
  bulan,
  MAX(CASE WHEN is_hbkn THEN 1 ELSE 0 END) AS is_hbkn,
  MAX(CASE WHEN is_ramadhan THEN 1 ELSE 0 END) AS ramadhan,
  MAX(CASE WHEN is_idul_fitri THEN 1 ELSE 0 END) AS idul_fitri,
  MAX(CASE WHEN is_idul_adha THEN 1 ELSE 0 END) AS idul_adha,
  MAX(CASE WHEN is_nataru THEN 1 ELSE 0 END) AS nataru,
  MAX(CASE WHEN is_libur_sekolah THEN 1 ELSE 0 END) AS libur_sekolah,
  MIN(hari_ke_idul_fitri) AS hari_menuju_idul_fitri,
  MIN(hari_ke_idul_adha) AS hari_menuju_idul_adha
FROM kalender_ml
GROUP BY tahun, bulan;

-- 3. Re-create final integrated forecast dataset view
DROP VIEW IF EXISTS forecast_dataset CASCADE;
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
  i.ihk,
  i.inflasi_mtm,
  i.inflasi_yoy,
  c.curah_hujan_mm,
  c.suhu_c,
  c.kelembapan,
  c.hari_hujan,
  c.kecepatan_angin,
  k.is_hbkn,
  k.ramadhan,
  k.idul_fitri,
  k.idul_adha,
  k.nataru,
  k.hari_menuju_idul_fitri,
  k.hari_menuju_idul_adha
FROM harga_pangan_ml h
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
LEFT JOIN inflasi_ml i ON h.tahun = i.tahun AND h.bulan = i.bulan
LEFT JOIN kalender_feature k ON h.tahun = k.tahun AND h.bulan = k.bulan
ORDER BY h.tahun ASC, h.bulan ASC;


-- --- SCHEMA FROM migrate_forecast_result.sql ---
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


-- --- SCHEMA FROM migrate_gizi_balita.sql ---
-- SQL DDL Migration: Gizi Balita Kelurahan Level (BB/U)
-- Execute this script in your Supabase SQL Editor.

-- =========================================================================
-- TABEL GIZI BALITA KELURAHAN (BB/U Metrics per Kelurahan)
-- =========================================================================
CREATE TABLE IF NOT EXISTS gizi_balita (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int NOT NULL,
  nama_kelurahan varchar(100) NOT NULL,
  gizi_sangat_kurang int NOT NULL,
  gizi_kurang int NOT NULL,
  gizi_normal int NOT NULL,
  gizi_berlebih int NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexing for high-speed queries on period (tahun, bulan) and kelurahan
CREATE INDEX IF NOT EXISTS idx_gizi_balita_period_kel ON gizi_balita (tahun, bulan, nama_kelurahan);

-- Disable Row Level Security (RLS) so seeder and app can read & write using the anon key
ALTER TABLE gizi_balita DISABLE ROW LEVEL SECURITY;


-- --- SCHEMA FROM migrate_harga_sagon_harian.sql ---
-- SQL Migration: Membuat tabel untuk arsip data harian harga pangan dari SAGON (10 Komoditas)
-- Jalankan skrip ini di Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS harga_sagon_harian (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal date UNIQUE NOT NULL,
  beras numeric,
  bawang_merah numeric,
  bawang_putih numeric,
  cabe_merah numeric,
  cabe_rawit numeric,
  daging_sapi numeric,
  daging_ayam numeric,
  telur numeric,
  gula_pasir numeric,
  minyak_goreng numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


-- --- SCHEMA FROM migrate_ikp.sql ---
-- SQL Migration: IKP Data Table (Indeks Ketahanan Pangan)
-- Jalankan skrip ini di Supabase SQL Editor.

-- =========================================================================
-- 1. TABEL IKP DATA
-- =========================================================================
CREATE TABLE IF NOT EXISTS ikp_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  ikp_cilegon numeric NOT NULL,
  ikp_provinsi numeric, -- Nullable because of flexibility
  ikp_nasional numeric, -- Nullable because 2020 has no national benchmark data
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tambahkan kolom ikp_provinsi jika sebelumnya tabel sudah dibuat tanpa kolom ini
ALTER TABLE ikp_data ADD COLUMN IF NOT EXISTS ikp_provinsi numeric;

-- =========================================================================
-- 2. DISABLE RLS (agar client anonim bisa melakukan select & upsert/insert)
-- =========================================================================
ALTER TABLE ikp_data DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. SEED DATA HISTORIS IKP (2020 - 2025)
-- =========================================================================
INSERT INTO ikp_data (tahun, ikp_cilegon, ikp_provinsi, ikp_nasional) VALUES
  (2020, 70.23, 73.48, 72.44),
  (2021, 71.42, 82.69, 72.44),
  (2022, 72.63, 73.78, 72.91),
  (2023, 81.54, 78.71, 74.20),
  (2024, 80.12, 79.25, 74.91),
  (2025, 76.15, 77.78, 73.00)
ON CONFLICT (tahun) DO UPDATE SET
  ikp_cilegon = EXCLUDED.ikp_cilegon,
  ikp_provinsi = EXCLUDED.ikp_provinsi,
  ikp_nasional = EXCLUDED.ikp_nasional;


-- --- SCHEMA FROM migrate_intervensi_kelurahan.sql ---
-- SQL DDL Migration: Intervensi Pangan Kelurahan Level
-- Execute this script in your Supabase SQL Editor.

-- =========================================================================
-- TABEL INTERVENSI KELURAHAN (GPM & Bantuan Pangan per Kelurahan)
-- =========================================================================
CREATE TABLE IF NOT EXISTS intervensi_kelurahan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  no_urut int,
  tahun int NOT NULL,
  bulan int DEFAULT 1, -- Default to January (1)
  kode_kec_bps varchar(50),
  nama_kecamatan varchar(100),
  kode_desa_bps varchar(50),
  nama_kelurahan varchar(100) NOT NULL,
  gpm int DEFAULT 0,
  bantuan_pangan int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexing for high-speed queries on period and kelurahan
CREATE INDEX IF NOT EXISTS idx_intervensi_kel_period ON intervensi_kelurahan (tahun, bulan, nama_kelurahan);

-- Disable Row Level Security (RLS) so seeder and app can read & write using the anon key
ALTER TABLE intervensi_kelurahan DISABLE ROW LEVEL SECURITY;


-- --- SCHEMA FROM migrate_kpi.sql ---
-- SQL Migration: 7 KPI Tahunan Baru (Produksi Beras, CV Beras, PPH, Konsumsi Energi, Konsumsi Protein, Ketersediaan Energi, Ketersediaan Protein)
-- Jalankan skrip ini di Supabase SQL Editor.

-- =========================================================================
-- 1. TABEL PRODUKSI BERAS LOKAL (GKG KE BERAS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS produksi_beras_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  produksi_gkg numeric NOT NULL,
  konversi numeric DEFAULT 63.23 NOT NULL, -- 63.23% (Konversi Banten)
  produksi_beras numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed Produksi Beras Data (2021 - 2025)
INSERT INTO produksi_beras_data (tahun, produksi_gkg, konversi, produksi_beras) VALUES
  (2021, 11687.17, 63.23, 7389.8),
  (2022, 11400.54, 63.23, 7208.6),
  (2023, 9852.20, 63.23, 6229.5),
  (2024, 10460.84, 63.23, 6614.4),
  (2025, 13772.30, 63.23, 8708.2)
ON CONFLICT (tahun) DO UPDATE SET
  produksi_gkg = EXCLUDED.produksi_gkg,
  konversi = EXCLUDED.konversi,
  produksi_beras = EXCLUDED.produksi_beras;

-- =========================================================================
-- 2. TABEL KOEFISIEN VARIASI (CV) HARGA BERAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS cv_beras_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric DEFAULT 10 NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed CV Beras Data (2021 - 2025)
INSERT INTO cv_beras_data (tahun, target, cilegon) VALUES
  (2021, 10, 3.65),
  (2022, 10, 1.45),
  (2023, 10, 5.21),
  (2024, 10, 3.65),
  (2025, 10, 3.65)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 3. TABEL POLA PANGAN HARAPAN (PPH)
-- =========================================================================
CREATE TABLE IF NOT EXISTS pph_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed PPH Data (2021 - 2025)
INSERT INTO pph_data (tahun, target, cilegon) VALUES
  (2021, 80, 88.3),
  (2022, 80, 85.5),
  (2023, 80, 89.8),
  (2024, 80, 90.9),
  (2025, 80, 90.9)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 4. TABEL KONSUMSI ENERGI
-- =========================================================================
CREATE TABLE IF NOT EXISTS konsumsi_energi_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed Konsumsi Energi Data (2021 - 2025)
INSERT INTO konsumsi_energi_data (tahun, target, cilegon) VALUES
  (2021, 2100, 1811),
  (2022, 2100, 1970),
  (2023, 2100, 2272),
  (2024, 2100, 2021),
  (2025, 2100, 2021)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 5. TABEL KONSUMSI PROTEIN
-- =========================================================================
CREATE TABLE IF NOT EXISTS konsumsi_protein_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed Konsumsi Protein Data (2021 - 2025)
INSERT INTO konsumsi_protein_data (tahun, target, cilegon) VALUES
  (2021, 57, 67),
  (2022, 57, 65),
  (2023, 57, 71),
  (2024, 57, 59),
  (2025, 57, 59)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 6. TABEL KETERSEDIAAN ENERGI
-- =========================================================================
CREATE TABLE IF NOT EXISTS ketersediaan_energi_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed Ketersediaan Energi Data (2021 - 2025)
INSERT INTO ketersediaan_energi_data (tahun, target, cilegon) VALUES
  (2021, 2400, 2525),
  (2022, 2400, 2529),
  (2023, 2400, 2582),
  (2024, 2400, 2582),
  (2025, 2400, 2582)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 7. TABEL KETERSEDIAAN PROTEIN
-- =========================================================================
CREATE TABLE IF NOT EXISTS ketersediaan_protein_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric NOT NULL,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed Ketersediaan Protein Data (2021 - 2025)
INSERT INTO ketersediaan_protein_data (tahun, target, cilegon) VALUES
  (2021, 63, 92),
  (2022, 63, 81),
  (2023, 63, 85),
  (2024, 63, 85),
  (2025, 63, 85)
ON CONFLICT (tahun) DO UPDATE SET
  target = EXCLUDED.target,
  cilegon = EXCLUDED.cilegon;

-- =========================================================================
-- 8. TABEL CACHE INSIGHT AI (OPTIMASI BIAYA & GRATISAN)
-- =========================================================================
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int NOT NULL,
  kecamatan text NOT NULL,
  kelurahan text NOT NULL,
  insight text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE (tahun, bulan, kecamatan, kelurahan)
);


-- --- SCHEMA FROM migrate_matang.sql ---
-- SQL DDL Migration: Mature FSVA & SKPG Datasets
-- Execute this script in your Supabase SQL Editor.

-- =========================================================================
-- 1. TABEL FSVA DATA MATANG (Pre-calculated composite index & priority)
-- =========================================================================
CREATE TABLE IF NOT EXISTS fsva_matang (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kelurahan varchar(100) NOT NULL,
  kode_kel_bps varchar(50) NOT NULL,
  ikp numeric NOT NULL,
  periode int NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 2. TABEL SKPG DATA MATANG (Mature underweight & malnutrition metrics)
-- =========================================================================
CREATE TABLE IF NOT EXISTS skpg_matang (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kelurahan varchar(100) NOT NULL,
  gizi_kurang int NOT NULL,
  gizi_sangat_kurang int NOT NULL,
  gizi_berlebih int NOT NULL,
  gizi_normal int NOT NULL,
  periode int NOT NULL,
  bulan int NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


-- Indexing for high-speed queries on period and kelurahan
CREATE INDEX IF NOT EXISTS idx_fsva_matang_period_kel ON fsva_matang (periode, nama_kelurahan);
CREATE INDEX IF NOT EXISTS idx_skpg_matang_period_kel ON skpg_matang (periode, nama_kelurahan);

-- Disable Row Level Security (RLS) so seeder and app can read & write using the anon key
ALTER TABLE fsva_matang DISABLE ROW LEVEL SECURITY;
ALTER TABLE skpg_matang DISABLE ROW LEVEL SECURITY;


-- ==========================================================
-- TABLE DATA INSERTS
-- ==========================================================

-- ERROR FETCHING TABLE harga_pangan: Could not find the table 'public.harga_pangan' in the schema cache

-- Data for table: ketersediaan_pangan (0 rows)
-- Table ketersediaan_pangan is empty.

-- ERROR FETCHING TABLE gizi_masyarakat: Could not find the table 'public.gizi_masyarakat' in the schema cache

-- ERROR FETCHING TABLE intervensi_pangan: Could not find the table 'public.intervensi_pangan' in the schema cache

-- Data for table: pou_data (5 rows)
DELETE FROM pou_data;
INSERT INTO pou_data (id, tahun, pou_nasional, pou_provinsi, pou_cilegon, created_at) VALUES ('fe31f90f-3405-4f0f-9303-04a4ec020caf', 2021, 8.49, 2.8, 2.46, '2026-06-02T03:44:57.510387+00:00');
INSERT INTO pou_data (id, tahun, pou_nasional, pou_provinsi, pou_cilegon, created_at) VALUES ('3028c50d-ddc3-42b9-a195-6de3a64c9520', 2022, 10.21, 2.46, 2.04, '2026-06-02T03:44:57.510387+00:00');
INSERT INTO pou_data (id, tahun, pou_nasional, pou_provinsi, pou_cilegon, created_at) VALUES ('a8d773c1-6f07-4ae8-a226-872ae2878831', 2023, 9.13, 2.87, 2.19, '2026-06-02T03:44:57.510387+00:00');
INSERT INTO pou_data (id, tahun, pou_nasional, pou_provinsi, pou_cilegon, created_at) VALUES ('e9a70c33-ee48-47f9-917d-c1462d670992', 2024, 8.27, 2.55, 1.96, '2026-06-02T03:44:57.510387+00:00');
INSERT INTO pou_data (id, tahun, pou_nasional, pou_provinsi, pou_cilegon, created_at) VALUES ('cedfccce-79e7-4df7-8aed-77ff9e7b7912', 2025, 7.89, 2.88, 2.78, '2026-06-02T03:44:57.510387+00:00');

-- Data for table: gizi_balita (43 rows)
DELETE FROM gizi_balita;
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('521f5652-2f96-4345-9ce3-7e1093e3c1b9', 2026, 1, 'Bagendung', 10, 23, 673, 27, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('b40c91fe-e632-4471-a57c-7e510daad3fe', 2026, 1, 'Banjar Negara', 17, 70, 553, 12, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('d1e59979-9f84-4542-81a9-780131d92f19', 2026, 1, 'Bendungan', 11, 37, 543, 49, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('ddc4486a-2fc0-420a-93b6-d9998f119700', 2026, 1, 'Bulakan', 9, 47, 431, 12, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('f845f7d9-fd6a-441e-8ede-3d27f7b43bb8', 2026, 1, 'Cibeber', 8, 34, 796, 38, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('6153f05e-4405-4e8c-8ca4-90fe1fda8788', 2026, 1, 'Cikerai', 7, 22, 296, 10, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('c828ab38-5d38-48ba-86fb-b2b55fb9151d', 2026, 1, 'Citangkil', 10, 69, 660, 45, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('0c0c5765-7633-4441-9b3c-16e620a0d806', 2026, 1, 'Ciwaduk', 1, 23, 412, 38, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('c67a5118-2dc7-42cf-b0fe-0a4ff7b52499', 2026, 1, 'Ciwedus', 0, 20, 821, 40, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('592b81f2-6cf9-4c61-afd2-361dda2c8779', 2026, 1, 'Deringo', 5, 22, 847, 20, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('026c3610-5538-44f6-8b6a-98f92303cd28', 2026, 1, 'Gedong Dalem', 4, 8, 605, 20, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('745d2bb8-5340-4f47-98f3-6b429772da0c', 2026, 1, 'Gerem', 14, 64, 729, 31, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('3a41dab6-607e-4a0b-b1b4-b0e3c7a8050a', 2026, 1, 'Gerogol', 11, 46, 244, 12, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('ba40b00e-0751-4d1d-855a-e66d3e4de08a', 2026, 1, 'Gunung Sugih', 2, 24, 328, 10, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('51743896-fa9a-405f-9f97-b8ae3d3d913a', 2026, 1, 'Jombang Wetan', 8, 36, 696, 22, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('f678e9f1-2957-482b-84ee-cd681f66e1b9', 2026, 1, 'Kalitimbang', 6, 28, 505, 18, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('f6fb5bc9-2b56-4cd0-a087-88ad50fc374b', 2026, 1, 'Karang Asem', 16, 50, 863, 17, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('3f9f86b6-546a-4977-85be-1141a51ea4de', 2026, 1, 'Kebon Dalem', 7, 30, 544, 47, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('739f3340-cd65-42ad-a4ea-f7e20efde636', 2026, 1, 'Kebonsari', 4, 19, 672, 56, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('9f323da4-dfea-4689-894f-676a8d8404be', 2026, 1, 'Kedaleman', 9, 31, 578, 18, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('eb3fd9e9-57b2-49ed-ad78-8ef244901e3a', 2026, 1, 'Kepuh', 6, 47, 549, 22, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('8cbfc827-c809-4ea4-adeb-970162c247c2', 2026, 1, 'Ketileng', 5, 19, 441, 19, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('1be701cb-9999-4f6f-b835-e588937b06a8', 2026, 1, 'Kotabumi', 2, 17, 285, 9, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('616e0dbc-2a01-4762-ada9-fc47a8037b11', 2026, 1, 'Kotasari', 6, 25, 390, 31, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('62c213a7-94a1-4036-b051-c82810c05411', 2026, 1, 'Kubangsari', 9, 40, 458, 10, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('620d7c9e-3aee-4cac-bd62-34e821be6152', 2026, 1, 'Lebak Denok', 2, 21, 701, 23, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('32ae3d24-b8c0-489f-baf9-3b44f762870e', 2026, 1, 'Lebakgede', 1, 44, 711, 15, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('b492cf18-8304-4937-a101-afd7456b2eea', 2026, 1, 'Masigit', 6, 33, 752, 37, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('7fee0458-5376-43eb-9ccd-b63e5764b103', 2026, 1, 'Mekarsari', 14, 63, 677, 37, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('9717c505-1feb-4466-8c62-ad9bbbf54f36', 2026, 1, 'Pabean', 1, 9, 121, 14, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('7a341ecc-3823-45f2-a989-737d9477e240', 2026, 1, 'Panggung Rawi', 4, 23, 575, 38, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('c3ddd3ff-ff70-4ab6-9975-5f748983dc2a', 2026, 1, 'Purwakarta', 8, 9, 178, 8, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('fa65ba3b-40cc-4483-a139-cbd7e26b9eab', 2026, 1, 'Ramanuju', 2, 3, 44, 4, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('b495ba32-f59a-432c-ba1b-87d31fd3b9aa', 2026, 1, 'Randakari', 8, 21, 551, 7, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('9eaf8e14-db6d-4ab4-ab82-113c741c0fdf', 2026, 1, 'Rawa Arum', 10, 30, 466, 26, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('95acde2d-1f22-4ec8-aae4-af2f5db2394d', 2026, 1, 'Samangraya', 4, 17, 271, 16, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('3d2d444a-a7e5-4090-af6f-773965d14817', 2026, 1, 'Sukmajaya', 1, 12, 693, 14, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('813528f8-2464-4bc9-8876-7374fa58ef9d', 2026, 1, 'Suralaya', 4, 34, 388, 69, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('498af790-1479-4518-834c-f5007a9a8ae1', 2026, 1, 'Taman Baru', 7, 31, 596, 29, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('6fdf597f-6eee-4473-95c3-96430f765971', 2026, 1, 'Tamansari', 16, 57, 668, 29, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('0486fa0c-6d9c-4e4f-8a71-8bf9297383fb', 2026, 1, 'Tegal Bunder', 9, 26, 170, 9, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('973c68d8-6a62-44da-8f7a-a353910ffdf4', 2026, 1, 'Tegal Ratu', 16, 85, 706, 33, '2026-06-03T08:22:37.024891+00:00');
INSERT INTO gizi_balita (id, tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih, created_at) VALUES ('aabfe261-44bc-4f16-af53-4b2de081fcb6', 2026, 1, 'Warnasari', 6, 24, 506, 45, '2026-06-03T08:22:37.024891+00:00');

-- Data for table: intervensi_kelurahan (43 rows)
DELETE FROM intervensi_kelurahan;
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('028ea57a-64e3-4e96-80b8-09bf136f74fb', 22, 2025, 1, '3672031', 'JOMBANG', '3672031002', 'Masigit', 0, 1050, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('0b0cd326-ffa5-41a3-a88d-ec1ce9bd9a2d', 31, 2025, 1, '3672031', 'JOMBANG', '3672031005', 'Sukmajaya', 0, 786, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('0dfc5c50-3dba-45ff-bcc0-9754e954f9d4', 13, 2025, 1, '3672040', 'CIBEBER', '3672040003', 'Kalitimbang', 0, 784, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('0e5427f7-8e0d-499c-8607-3e6552265691', 37, 2025, 1, '3672011', 'CITANGKIL', '3672011007', 'Lebakgede', 0, 1154, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('17f09d85-1938-4e88-9628-eb284cc4b6e6', 8, 2025, 1, '3672030', 'CILEGON', '3672030002', 'Ciwedus', 0, 461, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('261ec90c-155c-4eea-87cb-79c163006649', 20, 2025, 1, '3672010', 'CIWANDAN', '3672010013', 'Kubangsari', 0, 801, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('32fe32b3-cd8d-466b-89a4-d33b3b301f7b', 23, 2025, 1, '3672020', 'PULOMERAK', '3672020011', 'Mekarsari', 1, 1509, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('3473d9e9-86bb-4a3f-9005-7470dfc0d790', 12, 2025, 1, '3672031', 'JOMBANG', '3672031001', 'Jombang Wetan', 0, 1023, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('3f63eed9-f0f0-4d19-a9de-95d3ad24b1b0', 27, 2025, 1, '3672030', 'CILEGON', '3672030003', 'Bendungan', 0, 802, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('493b66a2-7f18-4832-80a0-7bdbbdaf0738', 36, 2025, 1, '3672010', 'CIWANDAN', '3672010002', 'Kepuh', 0, 1014, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('4cf4b581-733d-4b85-a9dd-1be477f99955', 17, 2025, 1, '3672030', 'CILEGON', '3672030005', 'Ketileng', 0, 488, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('4dca2e97-6ccf-409e-beac-12e86f7f9953', 19, 2025, 1, '3672022', 'GROGOL', '3672022007', 'Kotasari', 0, 251, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('4df6c8d0-ee82-4923-99a5-ee7c78dce430', 29, 2025, 1, '3672022', 'GROGOL', '3672022009', 'Rawa Arum', 0, 880, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('52e1f877-58f5-497a-9c36-54c1c883611b', 15, 2025, 1, '3672021', 'PURWAKARTA', '3672021002', 'Kebon Dalem', 0, 689, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('591f6dd3-eb86-41d6-b949-9447aedb7b14', 43, 2025, 1, '3672021', 'PURWAKARTA', '3672021001', 'Ramanuju', 0, 79, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('59d62c93-30de-49f3-91a0-48a754fd70e7', 10, 2025, 1, '3672031', 'JOMBANG', '3672031004', 'Gedong Dalem', 0, 668, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('5dbc83d1-f6e5-40b0-a559-6de7e0eb5ccc', 34, 2025, 1, '3672011', 'CITANGKIL', '3672011011', 'Warnasari', 0, 840, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('5dea75f0-dc77-4d6a-bfbc-378ff9134a47', 39, 2025, 1, '3672020', 'PULOMERAK', '3672020012', 'Tamansari', 0, 1078, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('74317aef-c7ba-438b-8bf0-da9cd4c69f97', 18, 2025, 1, '3672021', 'PURWAKARTA', '3672021006', 'Kotabumi', 0, 299, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('88a9e342-9e19-429d-8879-14f322a22c1d', 2, 2025, 1, '3672010', 'CIWANDAN', '3672010005', 'Banjar Negara', 0, 960, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('894dade1-4a5e-434f-9afa-682692f34a2e', 11, 2025, 1, '3672022', 'GROGOL', '3672022010', 'Gerem', 0, 905, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('8b07ef02-94d4-46dd-a98a-3a5707de74e9', 5, 2025, 1, '3672040', 'CIBEBER', '3672040002', 'Cikerai', 1, 591, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('8e2c4199-6b01-448a-b7e5-236d67b3201c', 38, 2025, 1, '3672020', 'PULOMERAK', '3672020014', 'Suralaya', 1, 472, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('97afb5a2-b951-41a5-b8ea-dd9d4455df37', 21, 2025, 1, '3672020', 'PULOMERAK', '3672020013', 'Lebak Denok', 0, 1031, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('9bef61ea-3f2c-4d75-b9a0-c5839e6a253b', 26, 2025, 1, '3672021', 'PURWAKARTA', '3672021003', 'Purwakarta', 0, 420, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('9f8dd724-b336-464e-abfc-35a62c7f4d1f', 40, 2025, 1, '3672010', 'CIWANDAN', '3672010004', 'Tegal Ratu', 0, 845, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('a4a9f569-c109-437c-8552-4a46c0560782', 42, 2025, 1, '3672011', 'CITANGKIL', '3672011010', 'Kebonsari', 0, 1220, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('b0887e28-cdd0-4d12-8dbc-880aecf9a739', 9, 2025, 1, '3672011', 'CITANGKIL', '3672011006', 'Deringo', 0, 1032, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('b1c88258-adbf-4ab7-8cc0-c3b2e6c26df0', 1, 2025, 1, '3672030', 'CILEGON', '3672030001', 'Bagendung', 1, 742, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('bda1865c-c859-4922-ac52-d057f9859098', 16, 2025, 1, '3672040', 'CIBEBER', '3672040006', 'Kedaleman', 0, 637, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('bfd8d3d8-5950-4b81-bc53-df342a768800', 33, 2025, 1, '3672021', 'PURWAKARTA', '3672021004', 'Tegal Bunder', 0, 508, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('c59e7f3a-67d6-48d3-8629-52389bcb3810', 7, 2025, 1, '3672011', 'CITANGKIL', '3672011009', 'Citangkil', 0, 923, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('c671a904-069c-4fe2-a8c7-f29be7ba2ff5', 4, 2025, 1, '3672040', 'CIBEBER', '3672040005', 'Cibeber', 0, 494, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('caf79c9d-f579-4d2c-bea5-f52228b88e32', 14, 2025, 1, '3672040', 'CIBEBER', '3672040004', 'Karang Asem', 0, 1404, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('ceaf7054-1930-4029-9581-e86351723351', 3, 2025, 1, '3672040', 'CIBEBER', '3672040001', 'Bulakan', 1, 899, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('cf5c2601-b98c-4d37-a969-4fc9622cab54', 41, 2025, 1, '3672030', 'CILEGON', '3672030004', 'Ciwaduk', 0, 464, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('d6be44a8-27e8-4b4a-933d-1776e660db73', 35, 2025, 1, '3672010', 'CIWANDAN', '3672010001', 'Gunung Sugih', 0, 542, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('da76914a-438a-495b-8716-c3fe9fc5ec37', 25, 2025, 1, '3672031', 'JOMBANG', '3672031003', 'Panggung Rawi', 0, 746, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('e060cc18-c44a-4a3b-bdf9-65dd9491ab71', 24, 2025, 1, '3672021', 'PURWAKARTA', '3672021005', 'Pabean', 0, 325, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('e3d15762-49e5-490a-b411-5ec327f9a133', 32, 2025, 1, '3672011', 'CITANGKIL', '3672011008', 'Taman Baru', 0, 742, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('f2cd7e28-13b7-4a12-acc0-acef2298b18f', 30, 2025, 1, '3672011', 'CITANGKIL', '3672011012', 'Samangraya', 1, 1112, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('f9a7b149-aba8-40c6-b538-7d3354727f65', 28, 2025, 1, '3672010', 'CIWANDAN', '3672010003', 'Randakari', 0, 997, '2026-05-30T07:44:44.373289+00:00');
INSERT INTO intervensi_kelurahan (id, no_urut, tahun, bulan, kode_kec_bps, nama_kecamatan, kode_desa_bps, nama_kelurahan, gpm, bantuan_pangan, created_at) VALUES ('fd86e282-4676-4d57-8460-830a805a1571', 6, 2025, 1, '3672022', 'GROGOL', '3672022008', 'Gerogol', 0, 604, '2026-05-30T07:44:44.373289+00:00');

-- Data for table: fsva_matang (43 rows)
DELETE FROM fsva_matang;
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('bc0e5749-9e24-4008-a011-39ae622001b7', 'Bagendung', '3672030001', 70.78556644, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('633f4034-67ca-4942-8f35-b73543f16225', 'Banjar Negara', '3672010005', 71.90255582, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('ec5da73b-70c2-413e-a2eb-58d6699b90fd', 'Bendungan', '3672030003', 71.52512743, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('9c935cc0-0d78-4b83-9e01-483c8a00ce12', 'Bulakan', '3672040001', 69.28836849, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('cf5a492e-62e3-4cfb-b12b-a15ad598c630', 'Cibeber', '3672040005', 77.42171764, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('2aa9ca78-e842-4a25-a23c-cbb1bafff4a8', 'Cikerai', '3672040002', 69.3389018, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('8424ab77-14fb-4b95-8e9f-31719d9d33d8', 'Citangkil', '3672011009', 71.3979247, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('c294a869-f3ad-4c81-8d5e-d4d7bc22dfd8', 'Ciwaduk', '3672030004', 74.00709456, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('554831af-ce8b-4db9-a83b-9a9ecebdd137', 'Ciwedus', '3672030002', 74.28064108, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('3c25619e-dce8-4326-b5ac-37adc81964d0', 'Deringo', '3672011006', 71.62108263, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('e37ef1ec-e5b0-446e-9e68-fe2019e8b945', 'Gedong Dalem', '3672031004', 71.22858507, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('b1aa3a77-fba6-4bc1-9668-b4c99c4c719b', 'Gerem', '3672022010', 69.31912514, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('a592aca0-d79b-42ca-8935-163def80f031', 'Gerogol', '3672022008', 73.86728085, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('2bfbfcd2-2e7e-4ed1-bbd3-2cb7944303e4', 'Gunung Sugih', '3672010001', 72.26391822, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('83786b02-1b32-4c95-b583-b6716ffef446', 'Jombang Wetan', '3672031001', 71.21169311, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('7dab5b50-259b-40a2-ba77-8e1fb397bbf3', 'Kalitimbang', '3672040003', 70.92422373, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('5b813aaf-69a5-4055-9ed5-0283d591883b', 'Karang Asem', '3672040004', 69.08439638, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('f18a7a82-e33e-4ead-8f30-7f0f2161bd5d', 'Kebon Dalem', '3672021002', 73.64014292, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('2a3445c7-cc18-4e3f-b22c-c96c052b7732', 'Kebonsari', '3672011010', 70.25471796, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('5bedabe1-ca5a-4f6a-8a21-3f6ec93c5f2a', 'Kedaleman', '3672040006', 77.04668841, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('abcb6279-1bb2-44be-b82b-990700b01226', 'Kepuh', '3672010002', 69.72890474, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('da25f9d8-cc9c-4b7e-9a58-77ca73a326a6', 'Ketileng', '3672030005', 70.61760429, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('56256961-7b7e-4060-a34f-5b09455fe866', 'Kotabumi', '3672021006', 74.01938355, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('66f4290e-5c16-4701-adf0-a305d6c2b664', 'Kotasari', '3672022007', 73.08872468, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('fa8a63bd-0591-4970-9e42-10b737846621', 'Kubangsari', '3672010013', 73.73878751, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('d33a075a-c2f1-4112-8d04-0e2472c417a4', 'Lebak Denok', '3672011007', 72.00448068, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('d544a838-745d-4438-a76e-462969c48544', 'Lebakgede', '3672020013', 69.3484417, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('b570ad3d-aced-41ba-9c90-1e2fe26915ff', 'Masigit', '3672031002', 70.64256782, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('c35d2f8f-1c53-44be-b33b-ede1800a4367', 'Mekarsari', '3672020011', 67.72649209, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('c8380410-03cf-4e26-926e-bcd68fb75934', 'Pabean', '3672021005', 77.80061617, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('a53eeedc-4ae9-4d92-bb91-0c2c0ed547a1', 'Panggung Rawi', '3672031003', 71.49625537, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('b55e4229-0e3d-4292-acd7-3cc1d5b74ba0', 'Purwakarta', '3672021003', 77.23914323, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('a0b691aa-6768-4908-a65b-409bcbd0a4ae', 'Ramanuju', '3672021001', 71.301387, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('a47b29a0-6f5b-408b-a2f1-bf7cf16ba13e', 'Randakari', '3672010003', 71.14298748, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('3223069e-6766-48b4-8229-794e0234daba', 'Rawa Arum', '3672022009', 75.49115616, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('155c55f5-ad94-4b08-8ea0-ccdfb28c70fc', 'Samangraya', '3672011012', 67.79934284, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('05deba58-12b6-44c4-bef0-142b3345b77d', 'Sukmajaya', '3672031005', 71.20738467, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('cf7bbd70-acc0-4afa-a9b6-1511700abbdb', 'Suralaya', '3672020014', 68.79260255, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('9c8f7cd7-dbb3-412c-ad71-973df59f02f4', 'Taman Baru', '3672011008', 76.80189207, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('6c412a21-b4a5-488a-8fdc-6b870313edc2', 'Tamansari', '3672020012', 68.30648915, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('fe85f0b0-a8a9-4879-b6f8-acc573f0f076', 'Tegal Bunder', '3672021004', 77.86107987, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('d62ba627-d1cc-4325-9b7a-db2db4841715', 'Tegal Ratu', '3672010004', 75.57658759, 2025, '2026-05-30T02:55:55.132416+00:00');
INSERT INTO fsva_matang (id, nama_kelurahan, kode_kel_bps, ikp, periode, created_at) VALUES ('5d1d490c-dae1-43be-b663-4478ce024edc', 'Warnasari', '3672011011', 70.8726736, 2025, '2026-05-30T02:55:55.132416+00:00');

-- Data for table: skpg_matang (43 rows)
DELETE FROM skpg_matang;
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('017e71c9-ca00-4c01-9609-f763731b6b85', 'Citangkil', 829, 49, 9652, 628, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('02771e2f-bea2-4956-9eaa-515a8cd64e4f', 'Samangraya', 261, 67, 4164, 176, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('042e1114-ea12-4908-a9a1-261f8b4d5e48', 'Kotabumi', 175, 12, 4851, 185, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('0446b931-9731-4e68-a3e5-aeb53caef594', 'Warnasari', 309, 67, 6563, 443, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('0d535209-ce0e-42d1-ab53-31012c023bdc', 'Panggung Rawi', 299, 104, 6410, 454, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('0e1fc300-d0f7-43dc-9c81-ce1d40acc2d7', 'Ciwaduk', 257, 30, 5236, 424, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('121bdb2f-e9e8-4dfa-b533-db7e01c8358b', 'Ciwedus', 153, 33, 9190, 406, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('138575a7-d59f-432e-a3de-3b34abb0efad', 'Jombang Wetan', 412, 147, 8551, 667, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('1403c943-705f-4ded-96de-e8152a573424', 'Kebonsari', 150, 25, 9137, 703, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('1ea6a0ad-43f0-4ecc-9a5b-d1183c10a955', 'Bulakan', 309, 96, 4663, 83, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('2094aa69-16a5-4870-807a-87c0ba53920e', 'Deringo', 427, 68, 10287, 183, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('39394746-baab-48ec-8b17-d179a1e78e62', 'Kalitimbang', 293, 85, 5505, 122, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('3da2a9f6-7a33-4317-933f-c4c22c9f7070', 'Taman Baru', 321, 91, 7863, 367, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('45ce7174-cba0-4c76-bdb5-7a8e5a3a220e', 'Suralaya', 401, 53, 4815, 598, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('469d9ece-dfe7-4985-afc8-596c993d9753', 'Tamansari', 622, 149, 9093, 399, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('5031fe34-321c-4ae4-86d4-122137e85a70', 'Gerem', 733, 165, 9095, 633, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('514df5d2-c131-4433-ba02-69e9c77143f2', 'Sukmajaya', 202, 26, 8733, 132, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('51beb720-1b3a-4cfc-8d64-a2002c814f5d', 'Mekarsari', 801, 184, 8857, 509, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('610b60c1-2cd7-46bb-b1d9-906d3f923805', 'Kubangsari', 153, 67, 6157, 38, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('6d2be092-0ef7-4cec-8318-d33285ba2605', 'Lebakgede', 164, 29, 8033, 214, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('729b50cf-7f8b-45cc-b54d-0dfdab4466ce', 'Ketileng', 288, 59, 5468, 187, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('74a3bfb7-c530-4b6a-8e9b-99c9224edf34', 'Kebon Dalem', 457, 90, 11148, 744, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('77fdd3c0-2e06-413d-9335-a83fa56df4cd', 'Kedaleman', 314, 133, 6595, 207, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('821be2a8-a490-4472-9066-8bb18777f90b', 'Karang Asem', 572, 168, 9260, 177, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('84e2de54-2153-4d61-b37e-538c79503811', 'Lebak Denok', 499, 80, 8911, 429, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('8ac0c41e-4cca-49a6-a2a0-19adc9cb9fc9', 'Bagendung', 462, 72, 8414, 338, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('8e002980-b4f1-4f24-8bb3-27407a769354', 'Cibeber', 312, 77, 8667, 374, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('904fb460-2ce9-46c6-88e3-83eac842a9f6', 'Rawa Arum', 443, 97, 8988, 570, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('90d33540-f38c-453f-a4c0-fa856ee50d7b', 'Ramanuju', 87, 15, 1039, 61, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('92b880a7-72d0-4353-b403-7e4803247183', 'Randakari', 74, 71, 7109, 49, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('98c911cc-eeca-4100-8074-bfd134251cb6', 'Kotasari', 474, 127, 5265, 645, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('a049284f-e269-42d0-87cd-b9868a83d387', 'Tegal Bunder', 468, 113, 5097, 160, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('a11c0a83-8b60-4959-aff0-eaee6fe111da', 'Cikerai', 261, 51, 2717, 101, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('a3f79a07-c931-44aa-b95f-5fa5338d0d9e', 'Masigit', 499, 91, 8816, 411, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('a68edfdb-7f16-4eb1-a3a6-1a27787069a1', 'Tegal Ratu', 89, 110, 10357, 258, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('afb977bb-958d-4cda-800f-26fcabb8f9f4', 'Gerogol', 507, 86, 4030, 295, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('b790247f-8331-4892-a763-f5343c154f9c', 'Purwakarta', 298, 69, 5633, 229, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('bf38060c-a01d-48c7-9e1d-e8bfc1db721d', 'Banjar Negara', 122, 92, 7684, 165, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('d5dbd9f9-204d-475b-9680-b4a54c7189ba', 'Gedong Dalem', 65, 34, 7489, 133, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('d67fc811-7ea7-4a5f-8d2e-355057adc701', 'Gunung Sugih', 93, 31, 4457, 85, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('dc8b2389-554c-415b-8c29-85b4785d56df', 'Bendungan', 485, 98, 6904, 443, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('eba2f191-1d8e-4210-bc86-0648c724eeb8', 'Pabean', 115, 15, 2760, 135, 2025, '2026-05-30T02:55:55.330092+00:00');
INSERT INTO skpg_matang (id, nama_kelurahan, gizi_kurang, gizi_sangat_kurang, gizi_berlebih, gizi_normal, periode, created_at) VALUES ('ffbf5092-620b-4351-8a33-0017b6da504c', 'Kepuh', 88, 87, 7514, 52, 2025, '2026-05-30T02:55:55.330092+00:00');

-- Data for table: cv_beras_data (5 rows)
DELETE FROM cv_beras_data;
INSERT INTO cv_beras_data (id, tahun, target, cilegon, created_at) VALUES ('65b74b34-cfb7-48f0-936e-34686bba2b90', 2021, 10, 3.65, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO cv_beras_data (id, tahun, target, cilegon, created_at) VALUES ('d8cedb4a-cf33-4e95-ab16-e134f06c2e7b', 2022, 10, 1.45, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO cv_beras_data (id, tahun, target, cilegon, created_at) VALUES ('df91a7b5-4408-4c69-960c-300b6fe2dfba', 2023, 10, 5.21, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO cv_beras_data (id, tahun, target, cilegon, created_at) VALUES ('0764423c-e881-4fcd-90b3-78bee6f96850', 2024, 10, 3.65, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO cv_beras_data (id, tahun, target, cilegon, created_at) VALUES ('f2ba3301-4d03-426f-ac8a-65388e37819e', 2025, 10, 2.1, '2026-05-29T10:01:10.555927+00:00');

-- Data for table: pph_data (5 rows)
DELETE FROM pph_data;
INSERT INTO pph_data (id, tahun, target, cilegon, created_at) VALUES ('27e4fd32-6775-4051-a7f0-ec58ac3da0e7', 2021, 80, 88.3, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO pph_data (id, tahun, target, cilegon, created_at) VALUES ('1b56bba1-52bb-4357-b6ba-2f14ac1397cf', 2022, 80, 85.5, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO pph_data (id, tahun, target, cilegon, created_at) VALUES ('e02c88a1-628d-4465-9992-620153967ae6', 2023, 80, 89.8, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO pph_data (id, tahun, target, cilegon, created_at) VALUES ('83517409-cd4e-49c4-b9c6-b79243b7ee23', 2024, 80, 90.9, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO pph_data (id, tahun, target, cilegon, created_at) VALUES ('4b91bb6e-153a-422b-9bed-77b07134051d', 2025, 80, 95, '2026-05-29T10:01:10.555927+00:00');

-- Data for table: produksi_beras_data (5 rows)
DELETE FROM produksi_beras_data;
INSERT INTO produksi_beras_data (id, tahun, produksi_gkg, konversi, produksi_beras, created_at) VALUES ('a1cf2e75-0f33-4190-adfc-7dd78879692b', 2021, 11687.17, 63.23, 7389.8, '2026-06-02T04:44:25.315518+00:00');
INSERT INTO produksi_beras_data (id, tahun, produksi_gkg, konversi, produksi_beras, created_at) VALUES ('421f3f12-5914-4d61-b507-32912a4f53ac', 2022, 11400.54, 63.23, 7208.6, '2026-06-02T04:44:25.315518+00:00');
INSERT INTO produksi_beras_data (id, tahun, produksi_gkg, konversi, produksi_beras, created_at) VALUES ('02098e21-5476-4158-bd3a-d84296784668', 2023, 9852.2, 63.23, 6229.5, '2026-06-02T04:44:25.315518+00:00');
INSERT INTO produksi_beras_data (id, tahun, produksi_gkg, konversi, produksi_beras, created_at) VALUES ('edc12c79-f9c5-4c1b-8fdf-870c87ed662a', 2024, 10460.84, 63.23, 6614.4, '2026-06-02T04:44:25.315518+00:00');
INSERT INTO produksi_beras_data (id, tahun, produksi_gkg, konversi, produksi_beras, created_at) VALUES ('10dca0d0-37e9-44f2-a940-7e8aba75a94c', 2025, 13772.3, 63.23, 8708.2, '2026-06-02T04:44:25.315518+00:00');

-- Data for table: konsumsi_energi_data (5 rows)
DELETE FROM konsumsi_energi_data;
INSERT INTO konsumsi_energi_data (id, tahun, target, cilegon, created_at) VALUES ('59cd8414-2908-4e93-9a3f-e869b435c991', 2021, 2100, 1811, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_energi_data (id, tahun, target, cilegon, created_at) VALUES ('30f82eac-3960-4ceb-830c-f53c19711831', 2022, 2100, 1970, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_energi_data (id, tahun, target, cilegon, created_at) VALUES ('15277b65-8841-4d94-ac16-dd8c2370c028', 2023, 2100, 2272, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_energi_data (id, tahun, target, cilegon, created_at) VALUES ('02cfb0bf-f995-4c75-90e1-e5e7ce353c41', 2024, 2100, 2021, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_energi_data (id, tahun, target, cilegon, created_at) VALUES ('0a12079d-909b-4579-b5aa-beed9b21e989', 2025, 2100, 2062.89, '2026-05-29T10:01:10.555927+00:00');

-- Data for table: konsumsi_protein_data (5 rows)
DELETE FROM konsumsi_protein_data;
INSERT INTO konsumsi_protein_data (id, tahun, target, cilegon, created_at) VALUES ('3e96509f-f503-4e17-aac6-14ce783cc827', 2021, 57, 67, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_protein_data (id, tahun, target, cilegon, created_at) VALUES ('d9a6b9a3-2cc0-476c-a51a-471952a638e6', 2022, 57, 65, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_protein_data (id, tahun, target, cilegon, created_at) VALUES ('5d78909f-04a5-4633-ab73-8489905f2862', 2023, 57, 71, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_protein_data (id, tahun, target, cilegon, created_at) VALUES ('23e2454d-407b-4307-9f7a-a41bfc3a2f40', 2024, 57, 59, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO konsumsi_protein_data (id, tahun, target, cilegon, created_at) VALUES ('8410537b-b71a-4193-966d-e820b3851368', 2025, 57, 61.71, '2026-05-29T10:01:10.555927+00:00');

-- Data for table: ketersediaan_energi_data (5 rows)
DELETE FROM ketersediaan_energi_data;
INSERT INTO ketersediaan_energi_data (id, tahun, target, cilegon, created_at) VALUES ('bd5e6404-3750-4f5d-b28e-aebe0db1fb92', 2021, 2400, 2525, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_energi_data (id, tahun, target, cilegon, created_at) VALUES ('d8f0a0c1-1a4c-4b9a-976d-4bcec7b9785e', 2022, 2400, 2529, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_energi_data (id, tahun, target, cilegon, created_at) VALUES ('9ff41083-e5f3-4e99-8bd9-39214672d915', 2023, 2400, 2582, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_energi_data (id, tahun, target, cilegon, created_at) VALUES ('f2b72c7e-1b5f-4a43-8122-7f3fbb734713', 2024, 2400, 2582, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_energi_data (id, tahun, target, cilegon, created_at) VALUES ('c3fd6394-ef99-4058-a956-00dcece75d80', 2025, 2400, 2582, '2026-05-29T10:01:10.555927+00:00');

-- Data for table: ketersediaan_protein_data (5 rows)
DELETE FROM ketersediaan_protein_data;
INSERT INTO ketersediaan_protein_data (id, tahun, target, cilegon, created_at) VALUES ('0ae06ebb-876d-4000-aad9-1b42ad51434d', 2021, 63, 92, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_protein_data (id, tahun, target, cilegon, created_at) VALUES ('7f65d29c-e449-4ec5-8080-11429b4c99de', 2022, 63, 81, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_protein_data (id, tahun, target, cilegon, created_at) VALUES ('2fcdeef5-f32d-4a5a-bc16-1f30aab3595f', 2023, 63, 85, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_protein_data (id, tahun, target, cilegon, created_at) VALUES ('116c0ca9-ed75-493f-954e-778231a90325', 2024, 63, 85, '2026-05-29T10:01:10.555927+00:00');
INSERT INTO ketersediaan_protein_data (id, tahun, target, cilegon, created_at) VALUES ('2fb7da26-31f3-4009-ac04-70d1e0e775c0', 2025, 63, 85, '2026-05-29T10:01:10.555927+00:00');

-- ERROR FETCHING TABLE ai_insights_cache: Could not find the table 'public.ai_insights_cache' in the schema cache

-- Data for table: harga_sagon_harian (2 rows)
DELETE FROM harga_sagon_harian;
INSERT INTO harga_sagon_harian (id, tanggal, beras, bawang_merah, bawang_putih, cabe_merah, cabe_rawit, daging_sapi, daging_ayam, telur, gula_pasir, minyak_goreng, created_at) VALUES ('8569aaad-9c72-426f-a690-11c8e8064735', '2026-06-04', 13833, 54000, 34000, 58833, 78333, 141667, 38667, 26333, 19000, 20838, '2026-06-04T15:37:18.889277+00:00');
INSERT INTO harga_sagon_harian (id, tanggal, beras, bawang_merah, bawang_putih, cabe_merah, cabe_rawit, daging_sapi, daging_ayam, telur, gula_pasir, minyak_goreng, created_at) VALUES ('6f0c783f-e163-4f51-a1bf-d938e2cdcf54', '2026-06-05', 13833, 54000, 34000, 57500, 75000, 141667, 38667, 26333, 19000, 20838, '2026-06-05T00:02:36.991093+00:00');

-- Data for table: harga_pangan_ml (60 rows)
DELETE FROM harga_pangan_ml;
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (1, 2025, 1, 13655, 32414, 44086, 60741, 94862, 131293, 39552, 28552, 18655, 18966, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (2, 2025, 2, 13696, 31253, 44278, 56671, 77633, 132152, 39646, 28430, 18899, 19025, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (3, 2025, 3, 13988, 49469, 45630, 61951, 102284, 134630, 39519, 28654, 19235, 20222, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (4, 2025, 4, 14000, 53700, 47614, 51329, 78129, 133143, 39743, 26543, 19143, 21236, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (5, 2025, 5, 13782, 41115, 41410, 40718, 37051, 133333, 37282, 27308, 18615, 21436, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (6, 2025, 6, 13763, 44092, 36421, 42461, 55816, 131382, 38276, 28079, 18770, 21382, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (7, 2025, 7, 14167, 49533, 35900, 42467, 59700, 130000, 39867, 28844, 18811, 21422, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (8, 2025, 8, 14402, 46851, 35655, 40943, 36816, 130000, 38897, 27862, 18833, 21425, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (9, 2025, 9, 14253, 37259, 35741, 48778, 40556, 130000, 42630, 28469, 18821, 21407, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (10, 2025, 10, 13962, 40194, 35484, 58602, 38183, 130000, 40161, 30183, 18645, 21387, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (11, 2025, 11, 13549, 43033, 35352, 66648, 42297, 130000, 38593, 29604, 18582, 21429, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (12, 2025, 12, 13582, 41890, 36022, 55714, 78703, 130000, 40143, 30571, 18495, 21495, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (13, 2026, 1, 13552, 36697, 37356, 36747, 52851, 121954, 39379, 29023, 18500, 21448, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (14, 2026, 2, 13563, 44263, 38063, 41888, 93350, 138875, 40863, 30575, 18506, 21371, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (15, 2026, 3, 13605, 41961, 37158, 47079, 90895, 140395, 39803, 30697, 18572, 21447, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (16, 2026, 4, 13706, 42889, 36944, 47211, 69644, 140000, 39489, 28444, 18500, 22200, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (17, 2026, 5, 13763, 51183, 35441, 62430, 78151, 136882, 38925, 26849, 18516, 22591, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (18, 2026, 6, 13833, 55167, 34417, 69167, 77500, 129583, 38083, 26500, 18750, 22917, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (19, 2026, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (20, 2026, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (21, 2026, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (22, 2026, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (23, 2026, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (24, 2026, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-04T02:36:21.235419+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (49, 2022, 1, 10834, 30704, 25200, 26908, 39245, 130400, 36225, 29977, 14018, 16252, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (50, 2022, 2, 10880, 30974, 25334, 27280, 39950, 130666, 36416, 30070, 14046, 16320, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (51, 2022, 3, 10925, 31243, 25467, 27652, 40655, 130933, 36608, 30163, 14075, 16388, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (52, 2022, 4, 10970, 31512, 25600, 28024, 41360, 131200, 36800, 30256, 14104, 16456, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (53, 2022, 5, 11016, 31782, 25734, 28396, 42065, 131466, 36991, 30349, 14132, 16524, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (54, 2022, 6, 11061, 32051, 25867, 28768, 42770, 131733, 37183, 30442, 14161, 16592, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (55, 2022, 7, 11106, 32320, 26000, 29140, 43475, 132000, 37375, 30535, 14190, 16660, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (56, 2022, 8, 11152, 32590, 26134, 29512, 44180, 132266, 37566, 30628, 14218, 16728, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (57, 2022, 9, 11197, 32859, 26267, 29884, 44885, 132533, 37758, 30721, 14247, 16796, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (58, 2022, 10, 11242, 33128, 26400, 30256, 45590, 132800, 37950, 30814, 14276, 16864, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (59, 2022, 11, 11288, 33398, 26534, 30628, 46295, 133066, 38141, 30907, 14304, 16932, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (60, 2022, 12, 11333, 33667, 26667, 31000, 47000, 133333, 38333, 31000, 14333, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (61, 2023, 1, 12000, 35000, 27000, 40000, 60000, 133333, 38667, 28333, 14667, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (62, 2023, 2, 13000, 37000, 28667, 41667, 67667, 133333, 38667, 27667, 14333, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (63, 2023, 3, 13000, 33667, 34000, 43333, 83333, 135000, 39333, 28333, 14667, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (64, 2023, 4, 12000, 34333, 31333, 37333, 35000, 135000, 39333, 27333, 14333, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (65, 2023, 5, 12000, 42667, 38667, 41667, 33667, 136667, 40000, 32333, 14333, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (66, 2023, 6, 12000, 43000, 38667, 38667, 40000, 136667, 40000, 30333, 14333, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (67, 2023, 7, 12000, 29333, 43667, 38667, 31000, 138333, 41667, 32000, 14667, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (68, 2023, 8, 12333, 25667, 40000, 40333, 45667, 131667, 41667, 30000, 14667, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (69, 2023, 9, 14000, 21333, 34000, 38333, 37000, 131667, 41000, 27000, 14667, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (70, 2023, 10, 13833, 20000, 36333, 41667, 49333, 131667, 40000, 25667, 15500, 16000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (71, 2023, 11, 13667, 29333, 35333, 71667, 86667, 131667, 40000, 28000, 16667, 17000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (72, 2023, 12, 14000, 31333, 37333, 83333, 86667, 131667, 40000, 27333, 17000, 16000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (73, 2024, 1, 14000, 28333, 38667, 65000, 58333, 131667, 40000, 26000, 17000, 16000, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (74, 2024, 2, 15833, 29333, 37333, 86667, 63333, 131667, 41000, 28667, 17000, 16667, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (75, 2024, 3, 15333, 30667, 40000, 83333, 65000, 130000, 41000, 32000, 17000, 16667, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (76, 2024, 4, 15000, 50000, 42333, 46667, 39667, 136667, 41000, 27667, 17333, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (77, 2024, 5, 13667, 51667, 43000, 56667, 34000, 131667, 41000, 30333, 18833, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (78, 2024, 6, 13333, 38667, 41667, 63333, 41333, 133333, 40333, 28333, 19000, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (79, 2024, 7, 13667, 25333, 41333, 41667, 65000, 131667, 41000, 28000, 19000, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (80, 2024, 8, 13667, 23333, 39333, 43333, 58333, 131667, 40333, 26667, 19000, 17333, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (81, 2024, 9, 13667, 24333, 40000, 31000, 41667, 130000, 38667, 27167, 19000, 17667, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (82, 2024, 10, 13667, 24333, 39333, 31000, 49000, 131667, 38667, 26333, 19000, 17667, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (83, 2024, 11, 13667, 40000, 40000, 29333, 38333, 131667, 40333, 26000, 19000, 17667, '2026-06-04T03:04:47.677035+00:00');
INSERT INTO harga_pangan_ml (id, tahun, bulan, harga_beras, harga_bawang_merah, harga_bawang_putih, harga_cabai_merah, harga_cabai_rawit, harga_daging_sapi, harga_daging_ayam_ras, harga_telur_ayam_ras, harga_gula_pasir, harga_minyak_goreng, created_at) VALUES (84, 2024, 12, 13667, 40000, 43000, 42667, 43333, 131667, 39667, 30000, 18667, 18000, '2026-06-04T03:04:47.677035+00:00');

-- Data for table: cuaca_ml (60 rows)
DELETE FROM cuaca_ml;
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (1, 2022, 1, 425, 26.5, 85, 20, 13, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (2, 2022, 2, 363, 26.7, 84, 18, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (3, 2022, 3, 263, 27.1, 83, 16, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (4, 2022, 4, 175, 27.7, 81, 12, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (5, 2022, 5, 138, 28.2, 80, 10, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (6, 2022, 6, 112, 27.9, 78, 9, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (7, 2022, 7, 80, 27.6, 77, 7, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (8, 2022, 8, 96, 27.8, 76, 7, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (9, 2022, 9, 128, 28.3, 77, 8, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (10, 2022, 10, 188, 28.1, 80, 13, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (11, 2022, 11, 313, 27.3, 83, 17, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (12, 2022, 12, 388, 26.8, 85, 19, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (13, 2023, 1, 221, 27.2, 80, 16, 13, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (14, 2023, 2, 189, 27.4, 79, 14, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (15, 2023, 3, 137, 27.8, 78, 12, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (16, 2023, 4, 91, 28.4, 76, 8, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (17, 2023, 5, 72, 28.9, 75, 6, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (18, 2023, 6, 11, 29, 71, 3, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (19, 2023, 7, 8, 28.7, 70, 1, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (20, 2023, 8, 9, 28.9, 69, 1, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (21, 2023, 9, 12, 29.4, 70, 2, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (22, 2023, 10, 23, 29.2, 73, 8, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (23, 2023, 11, 163, 28, 78, 13, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (24, 2023, 12, 202, 27.5, 80, 15, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (25, 2024, 1, 323, 26.8, 83, 18, 13, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (26, 2024, 2, 276, 27, 82, 16, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (27, 2024, 3, 200, 27.4, 81, 14, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (28, 2024, 4, 133, 28, 79, 10, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (29, 2024, 5, 105, 28.5, 78, 8, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (30, 2024, 6, 67, 28.2, 76, 6, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (31, 2024, 7, 48, 27.9, 75, 4, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (32, 2024, 8, 57, 28.1, 74, 4, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (33, 2024, 9, 76, 28.6, 75, 5, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (34, 2024, 10, 143, 28.4, 78, 11, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (35, 2024, 11, 238, 27.6, 81, 15, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (36, 2024, 12, 295, 27.1, 83, 17, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (37, 2025, 1, 357, 26.9, 83, 18, 13, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (38, 2025, 2, 305, 27.1, 82, 16, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (39, 2025, 3, 221, 27.5, 81, 14, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (40, 2025, 4, 147, 28.1, 79, 10, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (41, 2025, 5, 116, 28.6, 78, 8, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (42, 2025, 6, 74, 28.3, 76, 6, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (43, 2025, 7, 53, 28, 75, 4, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (44, 2025, 8, 63, 28.2, 74, 4, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (45, 2025, 9, 84, 28.7, 75, 5, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (46, 2025, 10, 158, 28.5, 78, 11, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (47, 2025, 11, 263, 27.7, 81, 15, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (48, 2025, 12, 326, 27.2, 83, 17, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (49, 2026, 1, 340, 26.8, 83, 18, 13, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (50, 2026, 2, 290, 27, 82, 16, 12, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (51, 2026, 3, 210, 27.4, 81, 14, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (52, 2026, 4, 140, 28, 79, 10, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (53, 2026, 5, 110, 28.5, 78, 8, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (54, 2026, 6, 70, 28.2, 76, 6, 9, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (55, 2026, 7, 50, 27.9, 75, 4, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (56, 2026, 8, 60, 28.1, 74, 4, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (57, 2026, 9, 80, 28.6, 75, 5, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (58, 2026, 10, 150, 28.4, 78, 11, 10, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (59, 2026, 11, 250, 27.6, 81, 15, 11, '2026-06-04T04:33:21.172848+00:00');
INSERT INTO cuaca_ml (id, tahun, bulan, curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin, created_at) VALUES (60, 2026, 12, 310, 27.1, 83, 17, 12, '2026-06-04T04:33:21.172848+00:00');

-- Data for table: inflasi_ml (60 rows)
DELETE FROM inflasi_ml;
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (1, 2022, 1, 107.233, 0.55, 2.11, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (2, 2022, 2, 107.814, 0.54, 2.23, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (3, 2022, 3, 108.15, 0.31, 2.42, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (4, 2022, 4, 109.18, 0.95, 3.15, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (5, 2022, 5, 109.62, 0.4, 3.35, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (6, 2022, 6, 110.29, 0.61, 4.1, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (7, 2022, 7, 110.98, 0.63, 4.65, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (8, 2022, 8, 110.75, -0.21, 4.4, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (9, 2022, 9, 112.05, 1.17, 5.71, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (10, 2022, 10, 112.18, 0.12, 5.45, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (11, 2022, 11, 112.28, 0.09, 5.2, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (12, 2022, 12, 112.82, 0.48, 5.51, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (13, 2023, 1, 113.15, 0.29, 5.28, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (14, 2023, 2, 113.33, 0.16, 5.09, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (15, 2023, 3, 113.56, 0.2, 4.97, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (16, 2023, 4, 114.1, 0.48, 4.48, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (17, 2023, 5, 114.28, 0.16, 4.22, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (18, 2023, 6, 114.45, 0.15, 3.72, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (19, 2023, 7, 114.77, 0.28, 3.36, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (20, 2023, 8, 114.68, -0.08, 3.48, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (21, 2023, 9, 114.93, 0.22, 2.53, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (22, 2023, 10, 115.12, 0.17, 2.58, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (23, 2023, 11, 115.48, 0.31, 2.81, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (24, 2023, 12, 116.03, 0.48, 2.81, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (25, 2024, 1, 116.32, 0.25, 2.78, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (26, 2024, 2, 116.58, 0.22, 2.84, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (27, 2024, 3, 117.06, 0.41, 3.05, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (28, 2024, 4, 117.29, 0.2, 2.77, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (29, 2024, 5, 117.26, -0.03, 2.58, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (30, 2024, 6, 117.18, -0.07, 2.36, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (31, 2024, 7, 117.16, -0.02, 2.06, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (32, 2024, 8, 117.13, -0.03, 2.11, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (33, 2024, 9, 117.05, -0.07, 1.84, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (34, 2024, 10, 117.11, 0.05, 1.71, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (35, 2024, 11, 117.43, 0.27, 1.66, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (36, 2024, 12, 117.86, 0.37, 1.55, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (37, 2025, 1, 118.15, 0.25, 1.57, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (38, 2025, 2, 118.33, 0.15, 1.5, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (39, 2025, 3, 118.67, 0.29, 1.38, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (40, 2025, 4, 118.96, 0.24, 1.42, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (41, 2025, 5, 118.9, -0.05, 1.4, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (42, 2025, 6, 118.81, -0.08, 1.39, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (43, 2025, 7, 118.88, 0.06, 1.47, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (44, 2025, 8, 118.82, -0.05, 1.44, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (45, 2025, 9, 118.85, 0.03, 1.54, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (46, 2025, 10, 118.94, 0.08, 1.56, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (47, 2025, 11, 119.29, 0.29, 1.58, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (48, 2025, 12, 119.82, 0.44, 1.66, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (49, 2026, 1, 120.15, 0.28, 1.69, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (50, 2026, 2, 120.31, 0.13, 1.67, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (51, 2026, 3, 120.65, 0.28, 1.67, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (52, 2026, 4, 120.95, 0.25, 1.67, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (53, 2026, 5, 120.89, -0.05, 1.67, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (54, 2026, 6, 120.85, -0.03, 1.72, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (55, 2026, 7, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (56, 2026, 8, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (57, 2026, 9, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (58, 2026, 10, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (59, 2026, 11, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');
INSERT INTO inflasi_ml (id, tahun, bulan, ihk, inflasi_mtm, inflasi_yoy, created_at) VALUES (60, 2026, 12, NULL, NULL, NULL, '2026-06-04T05:06:47.218253+00:00');

-- Data for table: ml_metrics (0 rows)
-- Table ml_metrics is empty.

-- Data for table: kalender_ml (0 rows)
-- Table kalender_ml is empty.

-- Data for table: forecast_result (10 rows)
DELETE FROM forecast_result;
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (1, 'harga_beras', 13833, 13755, 13728, -0.56, 13650, 13860, 2.08, 0.51, 'Stabil', 'AMAN', 'AMAN', 99.24, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Beras diproyeksikan turun 1%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 2.1% -> AMAN
SKPG: 0.5% -> AMAN

Rekomendasi:
* monitoring rutin mingguan
* jaga kestabilan pasokan
* pastikan jalur distribusi lancar', '["monitoring rutin mingguan","jaga kestabilan pasokan","pastikan jalur distribusi lancar"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (2, 'harga_bawang_merah', 55167, 35857, 40403, -35, 31138, 40576, 12, 25.12, 'Turun', 'WASPADA', 'RENTAN', 86.84, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Bawang merah diproyeksikan turun 35%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 12.0% -> WASPADA
SKPG: 25.1% -> RENTAN

Rekomendasi:
* siapkan GPM
* intensifkan monitoring
* koordinasi distribusi', '["siapkan GPM","intensifkan monitoring","koordinasi distribusi"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (3, 'harga_bawang_putih', 34417, 36810, 37823, 6.95, 35246, 38374, 2.75, -5.5, 'Naik', 'AMAN', 'AMAN', 95.75, '["1 Stabilitas inflasi makro","2 Tren harga 3 bulan terakhir","3 Cuaca kondusif"]'::jsonb, 'Bawang putih diproyeksikan naik 7%.
Pendorong utama:
1 Stabilitas inflasi makro
2 Tren harga 3 bulan terakhir
3 Cuaca kondusif

Interpretasi risiko:
CV: 2.7% -> AMAN
SKPG: -5.5% -> AMAN

Rekomendasi:
* lakukan operasi pasar mandiri
* pantau pasokan distributor
* himbau belanja bijak', '["lakukan operasi pasar mandiri","pantau pasokan distributor","himbau belanja bijak"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (4, 'harga_cabai_merah', 69167, 53926, 45157, -22.04, 44650, 63202, 20.05, 62.9, 'Turun', 'RENTAN', 'RENTAN', 82.8, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Cabai merah diproyeksikan turun 22%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 20.0% -> RENTAN
SKPG: 62.9% -> RENTAN

Rekomendasi:
* siapkan GPM
* intensifkan monitoring
* koordinasi distribusi', '["siapkan GPM","intensifkan monitoring","koordinasi distribusi"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (5, 'harga_cabai_rawit', 77500, 55752, 53416, -28.06, 39680, 71824, 31.56, 38.85, 'Turun', 'RENTAN', 'RENTAN', 71.17, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Cabai rawit diproyeksikan turun 28%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 31.6% -> RENTAN
SKPG: 38.8% -> RENTAN

Rekomendasi:
* siapkan GPM
* intensifkan monitoring
* koordinasi distribusi', '["siapkan GPM","intensifkan monitoring","koordinasi distribusi"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (6, 'harga_daging_sapi', 129583, 133162, 132012, 2.76, 127648, 138676, 3.99, -1.37, 'Stabil', 'AMAN', 'AMAN', 95.86, '["1 Stabilitas inflasi makro","2 Tren harga 3 bulan terakhir","3 Cuaca kondusif"]'::jsonb, 'Daging sapi diproyeksikan naik 3%.
Pendorong utama:
1 Stabilitas inflasi makro
2 Tren harga 3 bulan terakhir
3 Cuaca kondusif

Interpretasi risiko:
CV: 4.0% -> AMAN
SKPG: -1.4% -> AMAN

Rekomendasi:
* monitoring rutin mingguan
* jaga kestabilan pasokan
* pastikan jalur distribusi lancar', '["monitoring rutin mingguan","jaga kestabilan pasokan","pastikan jalur distribusi lancar"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (7, 'harga_daging_ayam_ras', 38083, 39832, 39362, 4.59, 38989, 40675, 2.87, -0.5, 'Naik', 'AMAN', 'AMAN', 97.88, '["1 Stabilitas inflasi makro","2 Tren harga 3 bulan terakhir","3 Cuaca kondusif"]'::jsonb, 'Daging ayam ras diproyeksikan naik 5%.
Pendorong utama:
1 Stabilitas inflasi makro
2 Tren harga 3 bulan terakhir
3 Cuaca kondusif

Interpretasi risiko:
CV: 2.9% -> AMAN
SKPG: -0.5% -> AMAN

Rekomendasi:
* lakukan operasi pasar mandiri
* pantau pasokan distributor
* himbau belanja bijak', '["lakukan operasi pasar mandiri","pantau pasokan distributor","himbau belanja bijak"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (8, 'harga_telur_ayam_ras', 26500, 27945, 28962, 5.45, 26765, 29125, 4.71, -5.62, 'Naik', 'AMAN', 'AMAN', 95.78, '["1 Stabilitas inflasi makro","2 Tren harga 3 bulan terakhir","3 Cuaca kondusif"]'::jsonb, 'Telur ayam ras diproyeksikan naik 5%.
Pendorong utama:
1 Stabilitas inflasi makro
2 Tren harga 3 bulan terakhir
3 Cuaca kondusif

Interpretasi risiko:
CV: 4.7% -> AMAN
SKPG: -5.6% -> AMAN

Rekomendasi:
* lakukan operasi pasar mandiri
* pantau pasokan distributor
* himbau belanja bijak', '["lakukan operasi pasar mandiri","pantau pasokan distributor","himbau belanja bijak"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (9, 'harga_gula_pasir', 18750, 18666, 18630, -0.45, 18491, 18841, 0.71, -0.11, 'Stabil', 'AMAN', 'AMAN', 99.06, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Gula pasir diproyeksikan turun 0%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 0.7% -> AMAN
SKPG: -0.1% -> AMAN

Rekomendasi:
* monitoring rutin mingguan
* jaga kestabilan pasokan
* pastikan jalur distribusi lancar', '["monitoring rutin mingguan","jaga kestabilan pasokan","pastikan jalur distribusi lancar"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');
INSERT INTO forecast_result (id, komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at) VALUES (10, 'harga_minyak_goreng', 22917, 22593, 22972, -1.41, 21984, 23202, 2.38, 7.18, 'Stabil', 'AMAN', 'WASPADA', 97.3, '["1 Cuaca kondusif","2 Tren harga 3 bulan terakhir","3 Stabilitas inflasi makro"]'::jsonb, 'Minyak goreng diproyeksikan turun 1%.
Pendorong utama:
1 Cuaca kondusif
2 Tren harga 3 bulan terakhir
3 Stabilitas inflasi makro

Interpretasi risiko:
CV: 2.4% -> AMAN
SKPG: 7.2% -> WASPADA

Rekomendasi:
* lakukan operasi pasar mandiri
* pantau pasokan distributor
* himbau belanja bijak', '["lakukan operasi pasar mandiri","pantau pasokan distributor","himbau belanja bijak"]'::jsonb, '2026-06-04T06:08:44.702921+00:00');

-- Data for table: model_registry (20 rows)
DELETE FROM model_registry;
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (1, 'harga_beras', 'xgboost', 0.763, 119.17, 103.81, '2026-06-04T06:08:41.50292+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (2, 'harga_bawang_merah', 'randomforest', 11.98, 7536.02, 5876.82, '2026-06-04T06:08:42.188539+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (3, 'harga_bawang_putih', 'prophet', 5.526, 2473.26, 1969.51, '2026-06-04T06:08:42.473358+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (4, 'harga_cabai_merah', 'xgboost', 17.202, 11258.02, 8694.89, '2026-06-04T06:08:42.723295+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (5, 'harga_cabai_rawit', 'randomforest', 29.598, 23590.37, 21504.82, '2026-06-04T06:08:43.104147+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (6, 'harga_daging_sapi', 'xgboost', 4.141, 5929.84, 5523.97, '2026-06-04T06:08:43.409618+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (7, 'harga_daging_ayam_ras', 'randomforest', 1.907, 900.42, 750.51, '2026-06-04T06:08:43.763454+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (8, 'harga_telur_ayam_ras', 'randomforest', 3.771, 1272.88, 1084.18, '2026-06-04T06:08:44.053102+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (9, 'harga_gula_pasir', 'randomforest', 0.928, 191.93, 172, '2026-06-04T06:08:44.302472+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (10, 'harga_minyak_goreng', 'prophet', 2.697, 661.43, 590.95, '2026-06-04T06:08:44.533623+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (11, 'harga_beras', 'xgboost', 0.763, 119.17, 103.81, '2026-06-05T00:35:29.938836+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (12, 'harga_bawang_merah', 'randomforest', 13.161, 8601.26, 6525.11, '2026-06-05T00:35:30.786311+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (13, 'harga_bawang_putih', 'randomforest', 4.248, 1796.26, 1530.43, '2026-06-05T00:35:31.451967+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (14, 'harga_cabai_merah', 'xgboost', 17.202, 11258.02, 8694.89, '2026-06-05T00:35:32.092973+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (15, 'harga_cabai_rawit', 'randomforest', 28.827, 24200.28, 21838.63, '2026-06-05T00:35:32.399124+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (16, 'harga_daging_sapi', 'xgboost', 4.141, 5929.84, 5523.97, '2026-06-05T00:35:32.666106+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (17, 'harga_daging_ayam_ras', 'xgboost', 2.117, 1016.39, 830.32, '2026-06-05T00:35:32.974597+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (18, 'harga_telur_ayam_ras', 'randomforest', 4.223, 1420.11, 1215.12, '2026-06-05T00:35:33.702027+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (19, 'harga_gula_pasir', 'randomforest', 0.937, 188, 173.46, '2026-06-05T00:35:33.979957+00:00');
INSERT INTO model_registry (id, komoditas, model_name, mape, rmse, mae, trained_at) VALUES (20, 'harga_minyak_goreng', 'prophet', 2.697, 661.43, 590.95, '2026-06-05T00:35:34.658283+00:00');

-- Data for table: ikp_data (6 rows)
DELETE FROM ikp_data;
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('0662425e-1c2b-4067-aad2-d546a3a08652', 2021, 71.42, 72.44, '2026-06-02T08:24:59.173403+00:00', 82.69);
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('65baef40-ecc2-4755-a6ff-d21a9150eade', 2022, 72.63, 72.91, '2026-06-02T08:24:59.173403+00:00', 73.78);
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('91c623c6-d643-44a7-8549-7200b1f44b9c', 2023, 81.54, 74.2, '2026-06-02T08:24:59.173403+00:00', 78.71);
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('7f455528-5b28-42be-be7d-ff16ee1886df', 2024, 80.12, 74.91, '2026-06-02T08:24:59.173403+00:00', 79.25);
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('81c81565-14df-48e7-a22f-fa5f03a92f86', 2025, 76.15, 73, '2026-06-02T08:24:59.173403+00:00', 77.78);
INSERT INTO ikp_data (id, tahun, ikp_cilegon, ikp_nasional, created_at, ikp_provinsi) VALUES ('0f653512-9cc8-47c9-a84e-87ccf695398a', 2020, 70.23, 72.44, '2026-06-02T08:24:59.173403+00:00', 73.48);

