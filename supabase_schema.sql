-- Skema Database: Dashboard Ketahanan Pangan Kota

-- 1. Tabel Harga Pangan Strategis
CREATE TABLE harga_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal date NOT NULL,
  kecamatan varchar(100),
  beras numeric,
  telur numeric,
  daging_ayam numeric,
  minyak_goreng numeric,
  gula_pasir numeric,
  cabe_merah numeric,
  cv_harga numeric, -- Coefficient of Variation (CV) rata-rata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Produksi & NBM
CREATE TABLE ketersediaan_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int,
  produksi_beras_ton numeric,
  skor_nbm numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Konsumsi & Gizi
CREATE TABLE gizi_masyarakat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  kecamatan varchar(100),
  skor_pph numeric,
  konsumsi_energi_kkal numeric,
  konsumsi_protein_gram numeric,
  prevalensi_stunting numeric, -- Status gizi balita
  pou numeric, -- Prevalence of Undernourishment
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Intervensi & Bantuan
CREATE TABLE intervensi_pangan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int NOT NULL,
  bulan int,
  kecamatan varchar(100),
  penerima_bantuan_jiwa int,
  kegiatan_gpm int, -- Jumlah kegiatan Gerakan Pangan Mandiri
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel POU Lintas Tahun (Nasional, Provinsi Banten, Kota Cilegon)
CREATE TABLE pou_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun int UNIQUE NOT NULL,
  pou_nasional numeric NOT NULL,
  pou_provinsi numeric NOT NULL,
  pou_cilegon numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- (Tabel geospasial Peta SKPG & FSVA biasanya dimuat dari GeoJSON terpisah
-- atau disimpan di PostGIS jika Supabase PostGIS extension diaktifkan).
