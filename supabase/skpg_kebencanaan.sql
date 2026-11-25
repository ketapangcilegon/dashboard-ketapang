-- Tabel Opsional Data Dukung Situasi Kebencanaan SKPG (Juknis SKPG 2026 - Tabel 2 & Bab 4.3 Poin 6)
-- Jalankan SQL ini di Supabase SQL Editor bila ingin menyimpan unggahan .xlsx kebencanaan secara permanen di cloud.
-- Tanpa tabel ini, aplikasi tetap berfungsi penuh menggunakan penyimpanan lokal (localStorage) browser.

CREATE TABLE IF NOT EXISTS public.kebencanaan_skpg (
  id BIGSERIAL PRIMARY KEY,
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  kecamatan TEXT NOT NULL,
  kelurahan TEXT NOT NULL DEFAULT '',
  banjir INTEGER NOT NULL DEFAULT 0,
  cuaca_ekstrem INTEGER NOT NULL DEFAULT 0,
  tanah_longsor INTEGER NOT NULL DEFAULT 0,
  gelombang_pasang_abrasi INTEGER NOT NULL DEFAULT 0,
  kekeringan INTEGER NOT NULL DEFAULT 0,
  gempa_bumi INTEGER NOT NULL DEFAULT 0,
  tsunami INTEGER NOT NULL DEFAULT 0,
  erupsi_gunung_api INTEGER NOT NULL DEFAULT 0,
  karhutla INTEGER NOT NULL DEFAULT 0,
  total_kejadian INTEGER NOT NULL DEFAULT 0,
  level_bencana TEXT NOT NULL DEFAULT 'PUTIH',
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kebencanaan_skpg_period
  ON public.kebencanaan_skpg (tahun, bulan, kecamatan);

ALTER TABLE public.kebencanaan_skpg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read kebencanaan_skpg" ON public.kebencanaan_skpg;
CREATE POLICY "Public read kebencanaan_skpg"
  ON public.kebencanaan_skpg FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated write kebencanaan_skpg" ON public.kebencanaan_skpg;
CREATE POLICY "Authenticated write kebencanaan_skpg"
  ON public.kebencanaan_skpg FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
