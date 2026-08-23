-- ============================================================
-- MIGRATION: Tabel Pohon Sukun & Tanaman Pangan Lokal
-- Disiapkan untuk pemetaan potensi pangan alternatif Kota Cilegon
-- ============================================================

CREATE TABLE IF NOT EXISTS pohon_sukun (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_titik    TEXT,                             -- misal: 'SKN-001'
  nama_lokasi   TEXT NOT NULL,                    -- misal: 'Pohon Sukun Pekarangan RW 02'
  jumlah_pohon  INT NOT NULL DEFAULT 1,           -- jumlah pohon di titik tersebut
  kondisi       TEXT DEFAULT 'Produktif',         -- 'Produktif', 'Muda', 'Tua'
  estimasi_kg_tahun NUMERIC DEFAULT 200,          -- estimasi hasil panen per pohon/tahun (kg)
  lat           NUMERIC NOT NULL,                 -- Koordinat GPS Latitude
  lng           NUMERIC NOT NULL,                 -- Koordinat GPS Longitude
  kelurahan     TEXT,                             -- Terisi otomatis via GIS atau input
  kecamatan     TEXT,                             -- Terisi otomatis via GIS atau input
  nama_pemilik  TEXT,                             -- Nama pemilik / fasum pekarangan
  keterangan    TEXT,                             -- Catatan tambahan
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_pohon_sukun_kel ON pohon_sukun (kelurahan);
CREATE INDEX IF NOT EXISTS idx_pohon_sukun_kec ON pohon_sukun (kecamatan);

-- RLS
ALTER TABLE pohon_sukun ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pohon_sukun_read_all" ON pohon_sukun FOR SELECT TO anon USING (true);
CREATE POLICY "pohon_sukun_write_all" ON pohon_sukun FOR ALL TO anon USING (true) WITH CHECK (true);
