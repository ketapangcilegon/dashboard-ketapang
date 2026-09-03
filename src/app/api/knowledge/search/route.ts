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
  source?: 'rpc' | 'ilike'; // untuk debugging: dari jalur mana chunk ini ditemukan
}

const STOPWORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'dua',
  'ia', 'seperti', 'jika', 'sehingga', 'kembali', 'dan', 'ini', 'karena', 'kepada',
  'oleh', 'saat', 'harus', 'sementara', 'setelah', 'belum', 'kami', 'sekitar',
  'bagi', 'serta', 'di', 'dari', 'terhadap', 'secara', 'bagaimana', 'kondisi', 'mana',
  'apakah', 'siapa', 'dimana', 'berapa', 'apa', 'tolong', 'jelaskan', 'berikan',
  'tampilkan', 'informasi', 'tentang', 'data', 'ada', 'bisa', 'akan', 'sudah'
]);

/**
 * Mencari potongan teks pengetahuan yang paling relevan dengan pertanyaan user.
 *
 * PENTING: fungsi ini TIDAK melakukan vector/semantic search — ini full-text +
 * ILIKE keyword matching. Jika Anda mengira ini RAG berbasis embedding,
 * verifikasi dulu isi RPC `match_knowledge_chunks` di Supabase SQL editor.
 * Kalau RPC itu tidak pernah dibuat, seluruh langkah RPC di bawah akan selalu
 * gagal diam-diam dan sistem 100% bergantung pada fallback ILIKE.
 */
export async function searchKnowledgeBase(queryText: string, matchLimit: number = 6): Promise<MatchedKnowledgeChunk[]> {
  const cleanQuery = queryText.replace(/['"():*&|!?,.]/g, ' ').trim();
  if (!cleanQuery) return [];

  const debug = { query: queryText, rpcAttempts: 0, rpcErrors: [] as string[], rpcHits: 0, ilikeHits: 0, ilikeError: '' as string };

  try {
    const resultsMap = new Map<string, MatchedKnowledgeChunk>();

    // 1. Ekstrak kata kunci inti — PRIORITASKAN kata yang huruf awalnya kapital
    //    di query asli (biasanya nama entitas: kelurahan, orang, pangkalan, dsb),
    //    karena entitas bernama adalah sinyal relevansi terkuat untuk data tabular.
    const originalWords = cleanQuery.split(/\s+/).filter(Boolean);
    const properNouns = originalWords
      .filter(w => /^[A-Z]/.test(w) && w.length >= 3)
      .map(w => w.toLowerCase());

    const rawTokens = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));

    // Gabungkan: proper nouns duluan (tidak boleh ke-cut saat slice top-N nanti)
    const orderedTokens = Array.from(new Set([...properNouns, ...rawTokens]));

    // 2. Query variations untuk RPC
    const searchQueries = [cleanQuery];
    if (orderedTokens.length > 0) {
      searchQueries.push(orderedTokens.join(' '));
    }

    // 3. Coba RPC match_knowledge_chunks (jika ada semantic/full-text search di Supabase)
    for (const sq of searchQueries.slice(0, 2)) {
      debug.rpcAttempts++;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('match_knowledge_chunks', {
          query_text: sq,
          match_limit: matchLimit
        });

        if (rpcError) {
          debug.rpcErrors.push(rpcError.message);
        } else if (rpcData && Array.isArray(rpcData)) {
          for (const item of rpcData) {
            if (item && item.id && !resultsMap.has(item.id)) {
              resultsMap.set(item.id, { ...(item as MatchedKnowledgeChunk), source: 'rpc' });
              debug.rpcHits++;
            }
          }
        }
      } catch (e) {
        debug.rpcErrors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // 4. ILIKE fallback — SELALU dijalankan bersamaan (bukan hanya jika RPC kurang),
    //    karena RPC dan ILIKE menangkap jenis kecocokan yang berbeda; digabung
    //    hasilnya lebih tangguh untuk dokumen tabular (xlsx) yang minim kalimat natural.
    if (orderedTokens.length > 0) {
      // Ambil top 6 kata kunci: proper nouns diprioritaskan, lalu token biasa
      const keywords = orderedTokens.slice(0, 6);
      const orFilter = keywords.map(kw => `content.ilike.%${kw}%`).join(',');

      const { data: fallbackData, error: fbError } = await supabase
        .from('ai_knowledge_chunks')
        .select('id, doc_id, chunk_index, content, ai_knowledge_docs(judul)')
        .or(orFilter)
        .limit(matchLimit * 3);

      if (fbError) {
        debug.ilikeError = fbError.message;
      } else if (fallbackData && Array.isArray(fallbackData)) {
        const scoredFallback = (fallbackData as any[]).map(row => {
          const contentLower = (row.content || '').toLowerCase();
          const docTitle = row.ai_knowledge_docs?.judul || 'Dokumen Referensi';
          const docTitleLower = docTitle.toLowerCase();
          let matchScore = 0;

          for (const kw of keywords) {
            const isProperNoun = properNouns.includes(kw);
            if (contentLower.includes(kw)) matchScore += isProperNoun ? 4 : 2;
            if (docTitleLower.includes(kw)) matchScore += isProperNoun ? 5 : 3;
          }

          return {
            id: row.id,
            doc_id: row.doc_id,
            doc_title: docTitle,
            chunk_index: row.chunk_index,
            content: row.content,
            score: matchScore,
            source: 'ilike' as const
          };
        }).filter(item => (item.score || 0) > 0);

        scoredFallback.sort((a, b) => (b.score || 0) - (a.score || 0));
        debug.ilikeHits = scoredFallback.length;

        for (const item of scoredFallback) {
          const existing = resultsMap.get(item.id);
          // Kalau chunk sudah ada dari RPC, tambahkan skor ILIKE-nya (double-confirmed = lebih relevan)
          if (existing) {
            existing.score = (existing.score || 0) + (item.score || 0);
          } else {
            resultsMap.set(item.id, item);
          }
        }
      }
    }

    const finalResults = Array.from(resultsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, matchLimit);

    console.log('[searchKnowledgeBase]', {
      ...debug,
      totalReturned: finalResults.length,
      topDocs: finalResults.map(r => `${r.doc_title} (score:${r.score ?? 'n/a'}, src:${r.source})`)
    });

    return finalResults;

  } catch (err) {
    console.error('[searchKnowledgeBase] FATAL ERROR:', err, debug);
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
