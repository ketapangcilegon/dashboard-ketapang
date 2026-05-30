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
