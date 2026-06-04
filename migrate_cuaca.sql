-- 1. Create table for weather machine learning dataset
CREATE TABLE IF NOT EXISTS cuaca_ml (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  curah_hujan_mm NUMERIC,
  suhu_c NUMERIC,
  kelembapan NUMERIC,
  hari_hujan INT,
  kecepatan_angin NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicates for the same month and year
  UNIQUE(tahun, bulan)
);

-- 2. Create database view combining food prices and weather data
CREATE OR REPLACE VIEW forecast_dataset AS
SELECT 
  h.tahun,
  h.bulan,
  h.harga_beras,
  h.harga_bawang_merah,
  h.harga_bawang_putih,
  h.harga_cabai_merah,
  h.harga_cabai_rawit,
  h.harga_daging_sapi,
  h.harga_daging_ayam_ras,
  h.harga_telur_ayam_ras,
  h.harga_gula_pasir,
  h.harga_minyak_goreng,
  c.curah_hujan_mm,
  c.suhu_c,
  c.kelembapan,
  c.hari_hujan,
  c.kecepatan_angin
FROM harga_pangan_ml h
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
ORDER BY h.tahun ASC, h.bulan ASC;
