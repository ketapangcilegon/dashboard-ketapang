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
