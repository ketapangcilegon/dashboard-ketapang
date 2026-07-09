-- ============================================================
-- Tabel: gizi_balita_skpg
-- Data status gizi balita (BB/U) per kecamatan, bulan, tahun
-- Sumber: Sheet "IP" dari form SKPG 3-komoditas (2025) & 6-komoditas (2024)
-- ============================================================

CREATE TABLE IF NOT EXISTS gizi_balita_skpg (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun           INTEGER NOT NULL,
  bulan           INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  kecamatan       VARCHAR(50) NOT NULL,
  bb_sangat_kurang INTEGER NOT NULL DEFAULT 0,
  bb_kurang        INTEGER NOT NULL DEFAULT 0,
  bb_normal        INTEGER NOT NULL DEFAULT 0,
  bb_lebih         INTEGER NOT NULL DEFAULT 0,
  total_kurang     INTEGER NOT NULL DEFAULT 0, -- bb_sangat_kurang + bb_kurang
  total_balita     INTEGER NOT NULL DEFAULT 0,
  nilai            DECIMAL(6,2) NOT NULL DEFAULT 0, -- % underweight
  bobot            INTEGER NOT NULL DEFAULT 0,      -- skor SKPG (1=Rentan, 2=Waspada, 3=Aman)
  status           VARCHAR(20) NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT gizi_balita_skpg_unique UNIQUE (tahun, bulan, kecamatan)
);

-- Index for faster queries by year and month
CREATE INDEX IF NOT EXISTS idx_gizi_balita_tahun_bulan ON gizi_balita_skpg (tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_gizi_balita_kecamatan ON gizi_balita_skpg (kecamatan);

-- RLS: allow anon read
ALTER TABLE gizi_balita_skpg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read gizi_balita_skpg"
  ON gizi_balita_skpg FOR SELECT
  USING (true);

CREATE POLICY "Allow auth write gizi_balita_skpg"
  ON gizi_balita_skpg FOR ALL
  USING (auth.role() = 'authenticated');
