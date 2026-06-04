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
