-- 1. Create table for calendar events dataset
DROP TABLE IF EXISTS kalender_ml CASCADE;
CREATE TABLE IF NOT EXISTS kalender_ml (
  id BIGSERIAL PRIMARY KEY,
  tanggal DATE UNIQUE NOT NULL,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  is_hbkn BOOLEAN DEFAULT FALSE,
  is_ramadhan BOOLEAN DEFAULT FALSE,
  is_idul_fitri BOOLEAN DEFAULT FALSE,
  is_idul_adha BOOLEAN DEFAULT FALSE,
  is_nataru BOOLEAN DEFAULT FALSE,
  is_libur_sekolah BOOLEAN DEFAULT FALSE,
  hari_ke_ramadhan INT,
  hari_ke_idul_fitri INT,
  hari_ke_idul_adha INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create monthly aggregated calendar feature view
DROP VIEW IF EXISTS kalender_feature CASCADE;
CREATE OR REPLACE VIEW kalender_feature AS
SELECT 
  tahun,
  bulan,
  MAX(CASE WHEN is_ramadhan THEN 1 ELSE 0 END) AS ramadhan,
  MAX(CASE WHEN is_idul_fitri THEN 1 ELSE 0 END) AS idul_fitri,
  MAX(CASE WHEN is_idul_adha THEN 1 ELSE 0 END) AS idul_adha,
  MAX(CASE WHEN is_nataru THEN 1 ELSE 0 END) AS nataru,
  MAX(CASE WHEN is_libur_sekolah THEN 1 ELSE 0 END) AS libur_sekolah,
  MIN(hari_ke_idul_fitri) AS hari_menuju_idul_fitri,
  MIN(hari_ke_idul_adha) AS hari_menuju_idul_adha
FROM kalender_ml
GROUP BY tahun, bulan;

-- 3. Re-create final integrated forecast dataset view
DROP VIEW IF EXISTS forecast_dataset CASCADE;
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
  i.ihk,
  i.inflasi_mtm,
  i.inflasi_yoy,
  c.curah_hujan_mm,
  c.suhu_c,
  c.kelembapan,
  c.hari_hujan,
  c.kecepatan_angin,
  k.ramadhan,
  k.idul_fitri,
  k.idul_adha,
  k.nataru,
  k.hari_menuju_idul_fitri,
  k.hari_menuju_idul_adha
FROM harga_pangan_ml h
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
LEFT JOIN inflasi_ml i ON h.tahun = i.tahun AND h.bulan = i.bulan
LEFT JOIN kalender_feature k ON h.tahun = k.tahun AND h.bulan = k.bulan
ORDER BY h.tahun ASC, h.bulan ASC;
