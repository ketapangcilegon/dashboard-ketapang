-- Migration for Kamera Cerdas (Beta) - Observasi Lapangan Beras & Tanaman Pangan
CREATE TABLE IF NOT EXISTS kamera_cerdas_observasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Mode & Klasifikasi
  mode VARCHAR(30) NOT NULL, -- 'pasokan_beras' | 'tanaman_pangan'
  kategori VARCHAR(50) NOT NULL, -- 'toko_beras', 'warung_madura', 'distributor_agen', 'sukun', 'padi', dll.
  kategori_label VARCHAR(100),
  nama_lokasi VARCHAR(150),
  
  -- Koordinat & Wilayah Cilegon
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy_meters NUMERIC(6, 2),
  kelurahan VARCHAR(100),
  kecamatan VARCHAR(100),
  kota VARCHAR(100) DEFAULT 'Kota Cilegon',
  
  -- Dokumentasi Foto & Watermark
  foto_url TEXT NOT NULL,
  foto_watermark_meta JSONB,
  file_size_kb INTEGER,
  
  -- Mode A: Pasokan Beras
  estimasi_pasokan_kg NUMERIC(10, 2),
  satuan_input VARCHAR(20), -- 'kg', 'ton', 'karung'
  ukuran_karung_kg NUMERIC(6, 2),
  jumlah_karung INTEGER,
  asal_pasokan VARCHAR(100), -- 'Kota Cilegon (Lokal)', 'Kabupaten Serang (Banten)', dll.
  jenis_kemasan VARCHAR(100),
  merek_beras VARCHAR(100),
  
  -- Mode B: Tanaman Pangan
  luas_lahan_m2 NUMERIC(10, 2),
  luas_lahan_ha NUMERIC(8, 4),
  jumlah_pohon_rumpun INTEGER,
  fase_pertumbuhan VARCHAR(50),
  estimasi_produksi_kg NUMERIC(10, 2),
  metode_estimasi VARCHAR(50), -- 'normatif', 'ai_vision', 'manual'
  
  -- AI Vision Output
  ai_analysis_raw JSONB,
  ai_confidence NUMERIC(4, 2),
  ai_detected_objects TEXT[],
  
  -- Verifikasi & Catatan
  catatan_lapangan TEXT,
  petugas_nama VARCHAR(100) DEFAULT 'Petugas Lapangan',
  status_verifikasi VARCHAR(40) DEFAULT 'terverifikasi_pengguna'
);

-- Index Spasial & Geografis
CREATE INDEX IF NOT EXISTS idx_kamera_cerdas_mode ON kamera_cerdas_observasi(mode);
CREATE INDEX IF NOT EXISTS idx_kamera_cerdas_wilayah ON kamera_cerdas_observasi(kecamatan, kelurahan);
CREATE INDEX IF NOT EXISTS idx_kamera_cerdas_created ON kamera_cerdas_observasi(created_at DESC);

-- Enable RLS
ALTER TABLE kamera_cerdas_observasi ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for public app field entry
CREATE POLICY "Allow public read kamera_cerdas" ON kamera_cerdas_observasi
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert kamera_cerdas" ON kamera_cerdas_observasi
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update kamera_cerdas" ON kamera_cerdas_observasi
  FOR UPDATE USING (true);
