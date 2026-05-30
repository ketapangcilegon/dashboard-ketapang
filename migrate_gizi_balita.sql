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
