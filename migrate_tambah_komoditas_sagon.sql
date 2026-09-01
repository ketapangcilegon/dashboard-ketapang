-- ==========================================================================
-- MIGRASI PENAMBAHAN KOLOM DETAIL HARGA PANGAN SAGON
-- Menambahkan kolom cabe rawit merah, hijau, keriting, minyak kemasan, terigu
-- ==========================================================================

ALTER TABLE harga_sagon_harian 
ADD COLUMN IF NOT EXISTS cabe_rawit_merah numeric,
ADD COLUMN IF NOT EXISTS cabe_rawit_hijau numeric,
ADD COLUMN IF NOT EXISTS cabe_merah_keriting numeric,
ADD COLUMN IF NOT EXISTS minyak_goreng_kemasan numeric,
ADD COLUMN IF NOT EXISTS tepung_terigu numeric;
