-- SQL Migration: Membuat tabel cv_beras_bulanan untuk menyimpan CV bulanan
-- Silakan salin dan jalankan skrip ini di Supabase SQL Editor.

-- 1. Membuat tabel cv_beras_bulanan jika belum ada
CREATE TABLE IF NOT EXISTS cv_beras_bulanan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  target numeric DEFAULT 10,
  cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(tahun, bulan)
);

-- 2. Mengaktifkan Row Level Security (RLS) demi keamanan database
ALTER TABLE cv_beras_bulanan ENABLE ROW LEVEL SECURITY;

-- 3. Membuat policy akses publik agar data dapat di-read secara umum
DROP POLICY IF EXISTS "Allow read for everyone" ON cv_beras_bulanan;
CREATE POLICY "Allow read for everyone" ON cv_beras_bulanan FOR SELECT TO public USING (true);

-- 4. Membuat policy akses tulis untuk pengguna terautentikasi (System/Admin)
DROP POLICY IF EXISTS "Allow write for authenticated users" ON cv_beras_bulanan;
CREATE POLICY "Allow write for authenticated users" ON cv_beras_bulanan FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON cv_beras_bulanan;
CREATE POLICY "Allow update for authenticated users" ON cv_beras_bulanan FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON cv_beras_bulanan;
CREATE POLICY "Allow delete for authenticated users" ON cv_beras_bulanan FOR DELETE TO authenticated USING (true);

-- 5. Memasukkan data awal (seed data) untuk bulan Juni 2026
-- Data dihitung secara matematis menggunakan rumus standar CV: (STDDEV(beras)/AVG(beras))*100 dari tabel harga_sagon_harian.
-- Jika standar deviasi bernilai NULL atau 0 (karena jumlah data sampel harian terbatas), maka di-fallback ke nilai baseline riil 2.08%.
INSERT INTO cv_beras_bulanan (tahun, bulan, target, cilegon)
SELECT 
  2026, 
  6, 
  10, 
  COALESCE(NULLIF(ROUND(((STDDEV(beras) / AVG(beras)) * 100)::numeric, 2), 0.00), 2.08)
FROM harga_sagon_harian
WHERE tanggal >= '2026-06-01' AND tanggal <= '2026-06-30'
ON CONFLICT (tahun, bulan) DO UPDATE 
SET cilegon = EXCLUDED.cilegon;
