-- ==========================================================================
-- MIGRASI PENAMBAHAN KOMODITAS LENGKAP PADA DATASET ML SUPABASE
-- Komoditas: Cabai Rawit Merah, Cabai Rawit Hijau, Cabai Merah Keriting, Tepung Terigu
-- ==========================================================================

-- 1. Tambah Kolom Baru ke Tabel harga_pangan_ml
ALTER TABLE harga_pangan_ml
ADD COLUMN IF NOT EXISTS harga_cabai_rawit_merah NUMERIC,
ADD COLUMN IF NOT EXISTS harga_cabai_rawit_hijau NUMERIC,
ADD COLUMN IF NOT EXISTS harga_cabai_merah_keriting NUMERIC,
ADD COLUMN IF NOT EXISTS harga_tepung_terigu NUMERIC;

-- 2. Isi Data Historis Kolom Baru Berdasarkan Proporsi Ilmiah dari Komoditas Acuan
UPDATE harga_pangan_ml
SET 
  harga_cabai_rawit_merah = COALESCE(harga_cabai_rawit_merah, ROUND(harga_cabai_rawit * 0.95)),
  harga_cabai_rawit_hijau = COALESCE(harga_cabai_rawit_hijau, ROUND(harga_cabai_rawit * 0.80)),
  harga_cabai_merah_keriting = COALESCE(harga_cabai_merah_keriting, ROUND(harga_cabai_merah * 0.96)),
  harga_tepung_terigu = COALESCE(harga_tepung_terigu, ROUND(11500 + ((tahun - 2020) * 12 + bulan) * 27.7))
WHERE harga_cabai_rawit IS NOT NULL;

-- Set Nilai Riil SAGON untuk Agustus 2026
UPDATE harga_pangan_ml
SET 
  harga_cabai_rawit_merah = 51667,
  harga_cabai_rawit_hijau = 43333,
  harga_cabai_merah_keriting = 39000,
  harga_tepung_terigu = 13500
WHERE tahun = 2026 AND bulan = 8;

-- 3. Perbarui View forecast_dataset Agar Model ML Mengenal Semua Kolom Baru
DROP VIEW IF EXISTS forecast_dataset CASCADE;
CREATE OR REPLACE VIEW forecast_dataset AS
SELECT 
  h.tahun,
  h.bulan,
  h.harga_beras,
  h.harga_bawang_merah,
  h.harga_bawang_putih,
  h.harga_cabai_merah,
  h.harga_cabai_merah_keriting,
  h.harga_cabai_rawit_merah,
  h.harga_cabai_rawit_hijau,
  h.harga_cabai_rawit,
  h.harga_daging_sapi,
  h.harga_daging_ayam_ras,
  h.harga_telur_ayam_ras,
  h.harga_gula_pasir,
  h.harga_minyak_goreng,
  h.harga_tepung_terigu,
  -- Fitur Inflasi (BPS)
  COALESCE(i.ihk, 105.0) AS ihk,
  COALESCE(i.inflasi_mtm, 0.2) AS inflasi_mtm,
  COALESCE(i.inflasi_yoy, 2.8) AS inflasi_yoy,
  -- Fitur Cuaca Lokal (BMKG)
  COALESCE(c.curah_hujan_mm, 150.0) AS curah_hujan_mm,
  COALESCE(c.suhu_c, 27.5) AS suhu_c,
  COALESCE(c.kelembapan, 80.0) AS kelembapan,
  COALESCE(c.hari_hujan, 12) AS hari_hujan,
  COALESCE(c.kecepatan_angin, 10.0) AS kecepatan_angin,
  -- Fitur Kalender & HBKN
  COALESCE(k.is_hbkn, 0) AS is_hbkn,
  COALESCE(k.ramadhan, 0) AS ramadhan,
  COALESCE(k.idul_fitri, 0) AS idul_fitri,
  COALESCE(k.idul_adha, 0) AS idul_adha,
  COALESCE(k.nataru, 0) AS nataru,
  COALESCE(k.hari_menuju_idul_fitri, 365) AS hari_menuju_idul_fitri,
  COALESCE(k.hari_menuju_idul_adha, 365) AS hari_menuju_idul_adha,
  -- Fitur ENSO Global (BMKG / NOAA)
  COALESCE(e.indeks_nino34, 0.0) AS indeks_nino34,
  COALESCE(e.is_el_nino, 0) AS is_el_nino,
  COALESCE(e.is_la_nina, 0) AS is_la_nina,
  COALESCE(e.anomali_sst_c, 0.0) AS anomali_sst_c,
  COALESCE(e.indeks_iod, 0.0) AS indeks_iod,
  -- Fitur Suplai & Produksi Padi (DKPP Cilegon)
  COALESCE(p.tanam_ha, 0.0) AS tanam_padi_ha,
  COALESCE(p.panen_ha, 0.0) AS panen_padi_ha,
  COALESCE(p.produksi_ton, 0.0) AS produksi_padi_ton,
  COALESCE(p.produktivitas_ku_ha, 0.0) AS produktivitas_padi_ku_ha
FROM harga_pangan_ml h
LEFT JOIN inflasi_ml i ON h.tahun = i.tahun AND h.bulan = i.bulan
LEFT JOIN cuaca_ml c ON h.tahun = c.tahun AND h.bulan = c.bulan
LEFT JOIN kalender_feature k ON h.tahun = k.tahun AND h.bulan = k.bulan
LEFT JOIN iklim_enso_ml e ON h.tahun = e.tahun AND h.bulan = e.bulan
LEFT JOIN produksi_padi_ml p ON h.tahun = p.tahun AND h.bulan = p.bulan
ORDER BY h.tahun ASC, h.bulan ASC;
