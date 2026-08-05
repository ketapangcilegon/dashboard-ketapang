-- SQL Migration: Perbaikan RLS Policy Aman (Best Practice Security)
-- Jalankan skrip ini di Supabase SQL Editor:
-- 1. Mengizinkan siapapun (publik/anon) MEMBACA data harga (SELECT).
-- 2. Membatasi PENULISAN/PENGUBAHAN data (INSERT/UPDATE) hanya untuk API Server (Service Role) / Authenticated.

ALTER TABLE harga_sagon_harian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for everyone" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow all for public sagon sync" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow read for public" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow write for service role" ON harga_sagon_harian;

-- 1. Kebijakan BACA: Publik boleh membaca harga
CREATE POLICY "Allow read for public" 
ON harga_sagon_harian 
FOR SELECT 
TO public 
USING (true);

-- 2. Kebijakan TULIS/UBAH: Hanya Service Role (API Server Next.js) & Authenticated Admin yang bisa menulis/mengubah
CREATE POLICY "Allow write for service role" 
ON harga_sagon_harian 
FOR ALL 
TO service_role, authenticated 
USING (true) 
WITH CHECK (true);
