-- =================================================================================
-- MIGRASI SINKRONISASI CHATBOT PANCI (DASHBOARD-KETAPANG) <-> DKPP-INFO
-- Jalankan manual di SQL Editor Supabase Dashboard Ketapang (xqaanmvmmjrtxstzxdje)
-- =================================================================================

-- 1. Tambahkan kolom Full-Text Search (tsvector) & GIN Index pada ai_knowledge_chunks
--    agar pencarian RAG super cepat & menghemat Supabase Egress secara drastis!
ALTER TABLE public.ai_knowledge_chunks
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('indonesian', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_tsv
  ON public.ai_knowledge_chunks USING GIN(tsv);

-- 2. Buat RPC Function `match_knowledge_chunks` (identik dengan dkpp-info)
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_text TEXT,
    match_limit INT DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    doc_id UUID,
    doc_title TEXT,
    chunk_index INT,
    content TEXT,
    rank REAL
) AS $$
DECLARE
    clean_query TEXT;
    tsq tsquery;
BEGIN
    clean_query := trim(regexp_replace(query_text, '[''"():*&|!?,./\\-]+', ' ', 'g'));

    IF clean_query = '' THEN
        RETURN;
    END IF;

    SELECT to_tsquery('indonesian', string_agg(lexeme || ':*', ' | '))
    INTO tsq
    FROM unnest(string_to_array(clean_query, ' ')) AS lexeme
    WHERE length(lexeme) > 2;

    IF tsq IS NULL THEN
        tsq := plainto_tsquery('indonesian', clean_query);
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.doc_id,
        d.judul AS doc_title,
        c.chunk_index,
        c.content,
        ts_rank_cd(c.tsv, tsq) AS rank
    FROM public.ai_knowledge_chunks c
    JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
    WHERE c.tsv @@ tsq
    ORDER BY rank DESC
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (Opsional) Skema 8 Tabel Renstra DKPP 2025-2030 (agar identik dengan dkpp-info)
CREATE TABLE IF NOT EXISTS public.renstra_tujuan_sasaran (
    id BIGSERIAL PRIMARY KEY,
    nspk_sasaran_rpjmd TEXT,
    tujuan TEXT,
    sasaran TEXT,
    indikator_sasaran TEXT,
    satuan TEXT,
    baseline_2024 TEXT,
    target_2025 TEXT,
    target_2026 TEXT,
    target_2027 TEXT,
    target_2028 TEXT,
    target_2029 TEXT,
    target_2030 TEXT
);

CREATE TABLE IF NOT EXISTS public.renstra_iku (
    id BIGSERIAL PRIMARY KEY,
    indikator TEXT,
    satuan TEXT,
    baseline_2024 TEXT,
    target_2025 TEXT,
    target_2026 TEXT,
    target_2027 TEXT,
    target_2028 TEXT,
    target_2029 TEXT,
    target_2030 TEXT
);

CREATE TABLE IF NOT EXISTS public.renstra_ikd (
    id BIGSERIAL PRIMARY KEY,
    indikator TEXT,
    satuan TEXT,
    baseline_2024 TEXT,
    target_2025 TEXT,
    target_2026 TEXT,
    target_2027 TEXT,
    target_2028 TEXT,
    target_2029 TEXT,
    target_2030 TEXT
);

CREATE TABLE IF NOT EXISTS public.renstra_ikk (
    id BIGSERIAL PRIMARY KEY,
    kode_urusan_pd TEXT,
    indikator TEXT,
    satuan TEXT,
    baseline_2024 TEXT,
    target_2025 TEXT,
    target_2026 TEXT,
    target_2027 TEXT,
    target_2028 TEXT,
    target_2029 TEXT,
    target_2030 TEXT
);

CREATE TABLE IF NOT EXISTS public.renstra_cascading_program (
    id BIGSERIAL PRIMARY KEY,
    program TEXT,
    indikator_program TEXT,
    satuan TEXT,
    target_baseline_2024 TEXT,
    target_2025 TEXT,
    target_2026 TEXT,
    target_2027 TEXT,
    target_2028 TEXT,
    target_2029 TEXT,
    target_2030 TEXT,
    pagu_2025 NUMERIC,
    pagu_2026 NUMERIC,
    pagu_2027 NUMERIC,
    pagu_2028 NUMERIC,
    pagu_2029 NUMERIC,
    pagu_2030 NUMERIC
);

CREATE TABLE IF NOT EXISTS public.renstra_subkegiatan_prioritas (
    id BIGSERIAL PRIMARY KEY,
    kode_program TEXT,
    nama_program TEXT,
    outcome TEXT,
    kode_kegiatan TEXT,
    nama_kegiatan TEXT,
    kode_subkegiatan TEXT,
    nama_subkegiatan TEXT
);

CREATE TABLE IF NOT EXISTS public.renstra_program_kegiatan_pagu (
    id BIGSERIAL PRIMARY KEY,
    kode_uraian TEXT,
    indikator TEXT,
    satuan TEXT,
    target_2026 TEXT,
    pagu_2026 NUMERIC,
    target_2027 TEXT,
    pagu_2027 NUMERIC,
    target_2028 TEXT,
    pagu_2028 NUMERIC,
    target_2029 TEXT,
    pagu_2029 NUMERIC,
    target_2030 TEXT,
    pagu_2030 NUMERIC,
    perangkat_daerah TEXT,
    lokasi_keterangan TEXT
);

ALTER TABLE public.renstra_tujuan_sasaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_iku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_ikd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_ikk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_cascading_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_subkegiatan_prioritas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renstra_program_kegiatan_pagu ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'renstra_tujuan_sasaran','renstra_iku','renstra_ikd','renstra_ikk',
    'renstra_cascading_program','renstra_subkegiatan_prioritas','renstra_program_kegiatan_pagu'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public select %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public select %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);
  END LOOP;
END $$;
