-- ============================================================
-- Tabel: gizi_balita_skpg_kelurahan
-- Data status gizi balita (BB/U) per kelurahan, bulan, tahun
-- Sumber: Folder C:\Users\THINKPAD\.gemini\antigravity\scratch\dashboard-ketapang\public\data balita per kelurahan
-- ============================================================

CREATE TABLE IF NOT EXISTS gizi_balita_skpg_kelurahan (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun           INTEGER NOT NULL,
  bulan           INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  kecamatan       VARCHAR(50) NOT NULL,
  kelurahan       VARCHAR(50) NOT NULL,
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

  CONSTRAINT gizi_balita_skpg_kel_unique UNIQUE (tahun, bulan, kelurahan)
);

-- Index for faster queries by year and month
CREATE INDEX IF NOT EXISTS idx_gizi_balita_kel_tahun_bulan ON gizi_balita_skpg_kelurahan (tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_gizi_balita_kel_kelurahan ON gizi_balita_skpg_kelurahan (kelurahan);

-- RLS: allow anon read
ALTER TABLE gizi_balita_skpg_kelurahan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read gizi_balita_skpg_kel"
  ON gizi_balita_skpg_kelurahan FOR SELECT
  USING (true);

CREATE POLICY "Allow auth write gizi_balita_skpg_kel"
  ON gizi_balita_skpg_kelurahan FOR ALL
  USING (auth.role() = 'authenticated');
