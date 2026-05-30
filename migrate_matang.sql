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
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexing for high-speed queries on period and kelurahan
CREATE INDEX IF NOT EXISTS idx_fsva_matang_period_kel ON fsva_matang (periode, nama_kelurahan);
CREATE INDEX IF NOT EXISTS idx_skpg_matang_period_kel ON skpg_matang (periode, nama_kelurahan);

-- Disable Row Level Security (RLS) so seeder and app can read & write using the anon key
ALTER TABLE fsva_matang DISABLE ROW LEVEL SECURITY;
ALTER TABLE skpg_matang DISABLE ROW LEVEL SECURITY;
