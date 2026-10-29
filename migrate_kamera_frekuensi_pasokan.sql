-- Migrasi: Frekuensi & Volume Pasokan Tahunan + identitas pendata (governance edit)
-- Jalankan di Supabase SQL Editor.
ALTER TABLE kamera_cerdas_observasi
  ADD COLUMN IF NOT EXISTS frekuensi_pasokan_angka NUMERIC,
  ADD COLUMN IF NOT EXISTS frekuensi_pasokan_satuan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS volume_pasokan_angka NUMERIC,
  ADD COLUMN IF NOT EXISTS volume_pasokan_satuan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS total_pasokan_tahunan_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS total_pasokan_tahunan_ton NUMERIC,
  ADD COLUMN IF NOT EXISTS petugas_nama VARCHAR(150),
  ADD COLUMN IF NOT EXISTS petugas_email VARCHAR(150);
