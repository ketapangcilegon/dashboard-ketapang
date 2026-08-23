-- ============================================================
-- MIGRATION: AI Knowledge Base (RAG System)
-- ============================================================

-- 1. Metadata Dokumen
CREATE TABLE IF NOT EXISTS ai_knowledge_docs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul        TEXT NOT NULL,
  deskripsi    TEXT,
  jenis        TEXT NOT NULL, -- 'pdf', 'excel', 'csv', 'teks'
  file_name    TEXT,
  total_chunks INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chunks Teks ber-indeks Full-Text Search
CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id      UUID REFERENCES ai_knowledge_docs(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  content_ts  TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON ai_knowledge_chunks USING GIN(content_ts);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON ai_knowledge_chunks(doc_id);

-- RLS
ALTER TABLE ai_knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_knowledge_docs_all" ON ai_knowledge_docs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "ai_knowledge_chunks_all" ON ai_knowledge_chunks FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Stored Procedure / RPC untuk Search Chunks Relevan
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_text TEXT,
  match_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  doc_title TEXT,
  chunk_index INT,
  content TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.doc_id,
    d.judul AS doc_title,
    c.chunk_index,
    c.content,
    ts_rank(c.content_ts, plainto_tsquery('simple', query_text)) AS rank
  FROM ai_knowledge_chunks c
  JOIN ai_knowledge_docs d ON d.id = c.doc_id
  WHERE c.content_ts @@ plainto_tsquery('simple', query_text)
     OR c.content ILIKE '%' || query_text || '%'
  ORDER BY rank DESC, c.created_at DESC
  LIMIT match_limit;
END;
$$;
