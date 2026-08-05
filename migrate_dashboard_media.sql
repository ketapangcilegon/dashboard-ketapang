-- SQL Migration: Tabel dashboard_media & Supabase Storage Setup
-- Jalankan skrip ini di Supabase SQL Editor.

-- =========================================================================
-- 1. TABEL INFORMASI & DOKUMENTASI MEDIA
-- =========================================================================
CREATE TABLE IF NOT EXISTS dashboard_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL,
  thumbnail_url text,
  title text NOT NULL,
  description text,
  location text,
  event_date text,
  duration text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Index untuk pencarian dan pemrosesan urutan cepat
CREATE INDEX IF NOT EXISTS idx_dashboard_media_sort ON dashboard_media (is_active, sort_order ASC);

-- =========================================================================
-- 2. SEED DATA AWAL (6 ITEM AWAL KETAHANAN PANGAN CILEGON)
-- =========================================================================
INSERT INTO dashboard_media (media_type, media_url, thumbnail_url, title, description, location, event_date, duration, is_active, sort_order)
VALUES
  (
    'image',
    'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=1600&auto=format&fit=crop',
    NULL,
    'Monitoring Harga Pangan',
    'Pemantauan stabilitas harga komoditas pangan pokok di Pasar Baru Cilegon untuk memastikan keterjangkauan masyarakat.',
    'Pasar Baru Cilegon',
    '2026-08-04',
    NULL,
    true,
    1
  ),
  (
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1600&auto=format&fit=crop',
    'Stabilitas Pasokan Beras',
    'Pemeriksaan ketersediaan cadangan beras cadangan pemerintah daerah di gudang Bulog Cilegon.',
    'Gudang Bulog Cilegon',
    '2026-08-02',
    '00:45',
    true,
    2
  ),
  (
    'image',
    'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?q=80&w=1600&auto=format&fit=crop',
    NULL,
    'Bantuan Pangan B2SA',
    'Penyaluran bantuan pangan Beragam, Bergizi Seimbang, dan Aman (B2SA) untuk penanganan stunting di Pulomerak.',
    'Kecamatan Pulomerak',
    '2026-07-30',
    NULL,
    true,
    3
  ),
  (
    'image',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop',
    NULL,
    'Monitoring Lahan Pertanian',
    'Kondisi lahan pertanian padi di wilayah Kota Cilegon menunjukkan pertumbuhan optimal menjelang panen.',
    'Kel. Gerem',
    '2026-07-28',
    NULL,
    true,
    4
  ),
  (
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1600&auto=format&fit=crop',
    'Rapat Koordinasi Ketahanan Pangan',
    'Rakor lintas sektor DKPP Kota Cilegon membahas ketersediaan pangan dan mitigasi risiko kerawanan.',
    'DKPP Kota Cilegon',
    '2026-07-25',
    '01:20',
    true,
    5
  ),
  (
    'image',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1600&auto=format&fit=crop',
    NULL,
    'Gerakan Pangan Murah',
    'Pelaksanaan Gerakan Pangan Murah (GPM) serentak untuk menjaga daya beli masyarakat di Kecamatan Cilegon.',
    'Kecamatan Cilegon',
    '2026-07-21',
    NULL,
    true,
    6
  );

-- =========================================================================
-- 3. SUPABASE STORAGE BUCKET & RLS POLICIES (dashboard-media)
-- =========================================================================
-- Buat bucket dashboard-media jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-media', 'dashboard-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if exist
DROP POLICY IF EXISTS "Public Read Access for dashboard-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Access for dashboard-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Access for dashboard-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Access for dashboard-media" ON storage.objects;

-- Kebijakan Akses Publik untuk Membaca Media
CREATE POLICY "Public Read Access for dashboard-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'dashboard-media');

-- Kebijakan Akses Upload/Insert untuk User Autentikasi / Admin
CREATE POLICY "Authenticated Users Upload Access for dashboard-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dashboard-media');

-- Kebijakan Akses Update untuk User Autentikasi / Admin
CREATE POLICY "Authenticated Users Update Access for dashboard-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'dashboard-media');

-- Kebijakan Akses Delete untuk User Autentikasi / Admin
CREATE POLICY "Authenticated Users Delete Access for dashboard-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'dashboard-media');

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) UNTUK TABEL dashboard_media
-- =========================================================================
ALTER TABLE dashboard_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for everyone on dashboard_media" ON dashboard_media;
DROP POLICY IF EXISTS "Allow write for everyone on dashboard_media" ON dashboard_media;
DROP POLICY IF EXISTS "Allow update for everyone on dashboard_media" ON dashboard_media;
DROP POLICY IF EXISTS "Allow delete for everyone on dashboard_media" ON dashboard_media;

-- Kebijakan Membaca untuk Publik (Dashboard)
CREATE POLICY "Allow read for everyone on dashboard_media"
ON dashboard_media FOR SELECT
USING (true);

-- Kebijakan Mengisi / Mengubah / Menghapus Data (Admin)
CREATE POLICY "Allow write for everyone on dashboard_media"
ON dashboard_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update for everyone on dashboard_media"
ON dashboard_media FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for everyone on dashboard_media"
ON dashboard_media FOR DELETE
USING (true);

