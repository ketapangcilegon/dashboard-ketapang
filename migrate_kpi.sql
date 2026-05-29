-- SQL Migration: 6 KPI Tahunan Baru (CV Beras, PPH, Konsumsi Energi, Konsumsi Protein, Ketersediaan Energi, Ketersediaan Protein)
-- Jalankan skrip ini di Supabase SQL Editor.

-- =========================================================================
-- 1. TABEL KOEFISIEN VARIASI (CV) HARGA BERAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS cv_beras_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  target numeric DEFAULT 10 NOT NULL, -- target is < 10%
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
-- 2. TABEL POLA PANGAN HARAPAN (PPH)
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
-- 3. TABEL KONSUMSI ENERGI
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
-- 4. TABEL KONSUMSI PROTEIN
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
-- 5. TABEL KETERSEDIAAN ENERGI
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
-- 6. TABEL KETERSEDIAAN PROTEIN
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
