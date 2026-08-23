import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface MatchedKnowledgeChunk {
  id: string;
  doc_id: string;
  doc_title: string;
  chunk_index: number;
  content: string;
  rank?: number;
}

/**
 * Mencari potongan teks pengetahuan yang paling relevan dengan pertanyaan user
 * menggunakan Full-Text Search PostgreSQL (RPC) atau ILIKE fallback.
 */
export async function searchKnowledgeBase(queryText: string, matchLimit: number = 4): Promise<MatchedKnowledgeChunk[]> {
  const cleanQuery = queryText.replace(/['"():*&|!]/g, ' ').trim();
  if (!cleanQuery) return [];

  try {
    // 1. Coba panggil Stored Procedure match_knowledge_chunks jika sudah dibuat
    const { data: rpcData, error: rpcError } = await supabase.rpc('match_knowledge_chunks', {
      query_text: cleanQuery,
      match_limit: matchLimit
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData as MatchedKnowledgeChunk[];
    }

    // 2. Fallback jika RPC belum ada atau tidak ada hasil spesifik: ILIKE / Full-text query langsung
    // Ambil kata kunci utama (hilangkan kata sambung pendek)
    const keywords = cleanQuery
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 4);

    let dbQuery = supabase
      .from('ai_knowledge_chunks')
      .select('id, doc_id, chunk_index, content, ai_knowledge_docs(judul)')
      .limit(matchLimit);

    if (keywords.length > 0) {
      // Cari chunk yang mengandung kata kunci
      const orFilter = keywords.map(kw => `content.ilike.%${kw}%`).join(',');
      dbQuery = dbQuery.or(orFilter);
    }

    const { data: fallbackData, error: fbError } = await dbQuery;

    if (fbError || !fallbackData) {
      return [];
    }

    // Format output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (fallbackData as any[]).map(row => ({
      id: row.id,
      doc_id: row.doc_id,
      doc_title: row.ai_knowledge_docs?.judul || 'Dokumen Referensi',
      chunk_index: row.chunk_index,
      content: row.content
    }));

  } catch (err) {
    console.warn('searchKnowledgeBase error:', err);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { query, limit = 4 } = await request.json();
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchKnowledgeBase(query, limit);
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
