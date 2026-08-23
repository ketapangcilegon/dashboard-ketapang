-- ============================================================
-- MIGRATION: sp_cache_data
-- Cache tabel untuk menyimpan data ringkasan dari Serumpun-Padi
-- ============================================================

CREATE TABLE IF NOT EXISTS sp_cache_data (
  id          SERIAL PRIMARY KEY,
  tabel_sumber TEXT NOT NULL,         -- 'sawah_status', 'kolam_budidaya', dst
  data        JSONB NOT NULL,          -- aggregated summary JSON
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sp_cache_data_tabel_unique UNIQUE (tabel_sumber)
);

-- Index untuk query cepat berdasarkan tabel_sumber
CREATE INDEX IF NOT EXISTS idx_sp_cache_tabel ON sp_cache_data (tabel_sumber);

-- RLS: allow read by anon (untuk server-side Next.js), no write from client
ALTER TABLE sp_cache_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_cache_read_anon" ON sp_cache_data
  FOR SELECT TO anon USING (true);

-- Hanya service_role (server) yang bisa insert/update
CREATE POLICY "sp_cache_write_service" ON sp_cache_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);
