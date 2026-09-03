import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface MatchedKnowledgeChunk {
  id: string;
  doc_id: string;
  doc_title: string;
  chunk_index: number;
  content: string;
  rank?: number;
  score?: number;
}

// Stopwords umum bahasa Indonesia yang diabaikan saat ekstraksi kata kunci RAG
const STOPWORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'dua',
  'ia', 'seperti', 'jika', 'sehingga', 'kembali', 'dan', 'ini', 'karena', 'kepada',
  'oleh', 'saat', 'harus', 'sementara', 'setelah', 'belum', 'kami', 'sekitar',
  'bagi', 'serta', 'di', 'dari', 'terhadap', 'secara', 'bagaimana', 'kondisi', 'mana',
  'apakah', 'siapa', 'dimana', 'berapa', 'apa', 'tolong', 'jelaskan', 'berikan',
  'tampilkan', 'informasi', 'tentang', 'data', 'ada', 'bisa', 'akan', 'sudah'
]);

/**
 * Mencari potongan teks pengetahuan yang paling relevan dengan pertanyaan user
 * menggunakan Full-Text Search PostgreSQL (RPC), Query Expansion, dan ILIKE ranking.
 */
export async function searchKnowledgeBase(queryText: string, matchLimit: number = 6): Promise<MatchedKnowledgeChunk[]> {
  const cleanQuery = queryText.replace(/['"():*&|!?,.]/g, ' ').trim();
  if (!cleanQuery) return [];

  try {
    const resultsMap = new Map<string, MatchedKnowledgeChunk>();

    // 1. Ekstrak kata kunci inti
    const rawTokens = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));

    // 2. Query variations (Query Expansion untuk konteks dokumen statistik & teknis)
    const searchQueries = [cleanQuery];
    if (rawTokens.length > 0) {
      searchQueries.push(rawTokens.join(' '));
    }

    // 3. Coba panggil Stored Procedure match_knowledge_chunks jika tersedia di Supabase
    for (const sq of searchQueries.slice(0, 2)) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('match_knowledge_chunks', {
          query_text: sq,
          match_limit: matchLimit
        });

        if (!rpcError && rpcData && Array.isArray(rpcData)) {
          for (const item of rpcData) {
            if (item && item.id && !resultsMap.has(item.id)) {
              resultsMap.set(item.id, item as MatchedKnowledgeChunk);
            }
          }
        }
      } catch {
        // RPC might not exist, proceed to fallback
      }
    }

    // 4. Fallback: ILIKE / Full-text query langsung jika hasil RPC masih kurang dari matchLimit
    if (resultsMap.size < matchLimit && rawTokens.length > 0) {
      // Ambil top 5 kata kunci terpenting
      const keywords = rawTokens.slice(0, 5);

      // Cari chunk yang mengandung minimal salah satu kata kunci
      const orFilter = keywords.map(kw => `content.ilike.%${kw}%`).join(',');

      const { data: fallbackData, error: fbError } = await supabase
        .from('ai_knowledge_chunks')
        .select('id, doc_id, chunk_index, content, ai_knowledge_docs(judul)')
        .or(orFilter)
        .limit(matchLimit * 2);

      if (!fbError && fallbackData && Array.isArray(fallbackData)) {
        // Hitung relevansi berdasarkan frekuensi kemunculan kata kunci dalam content
        const scoredFallback = (fallbackData as any[]).map(row => {
          const contentLower = (row.content || '').toLowerCase();
          const docTitle = row.ai_knowledge_docs?.judul || 'Dokumen Referensi';
          let matchScore = 0;

          for (const kw of keywords) {
            if (contentLower.includes(kw)) matchScore += 2;
            if (docTitle.toLowerCase().includes(kw)) matchScore += 3;
          }

          return {
            id: row.id,
            doc_id: row.doc_id,
            doc_title: docTitle,
            chunk_index: row.chunk_index,
            content: row.content,
            score: matchScore
          };
        });

        // Urutkan berdasarkan score tertinggi
        scoredFallback.sort((a, b) => (b.score || 0) - (a.score || 0));

        for (const item of scoredFallback) {
          if (!resultsMap.has(item.id)) {
            resultsMap.set(item.id, item);
          }
          if (resultsMap.size >= matchLimit) break;
        }
      }
    }

    return Array.from(resultsMap.values()).slice(0, matchLimit);

  } catch (err) {
    console.warn('searchKnowledgeBase error:', err);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { query, limit = 6 } = await request.json();
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
