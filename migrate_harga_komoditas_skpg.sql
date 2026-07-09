-- Migration: Create Table for SKPG Commodity Prices
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS harga_komoditas_skpg (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL,
  kecamatan VARCHAR(50) NOT NULL,
  beras NUMERIC DEFAULT 0,
  jagung NUMERIC DEFAULT 0,
  gula NUMERIC DEFAULT 0,
  minyak NUMERIC DEFAULT 0,
  daging NUMERIC DEFAULT 0,
  telur NUMERIC DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(tahun, bulan, kecamatan)
);

-- Enable RLS and add standard policies
ALTER TABLE harga_komoditas_skpg ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON harga_komoditas_skpg;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON harga_komoditas_skpg;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON harga_komoditas_skpg;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON harga_komoditas_skpg;

CREATE POLICY "Allow read for everyone" ON harga_komoditas_skpg FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON harga_komoditas_skpg FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON harga_komoditas_skpg FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON harga_komoditas_skpg FOR DELETE TO authenticated USING (true);
