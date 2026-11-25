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
  source?: 'rpc' | 'doc_match_term' | 'doc_sample' | 'term_search' | 'ilike';
}

const STOPWORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'dua',
  'ia', 'seperti', 'jika', 'sehingga', 'kembali', 'dan', 'ini', 'karena', 'kepada',
  'oleh', 'saat', 'harus', 'sementara', 'setelah', 'belum', 'kami', 'sekitar',
  'bagi', 'serta', 'di', 'dari', 'terhadap', 'secara', 'bagaimana', 'kondisi', 'mana',
  'apakah', 'siapa', 'dimana', 'berapa', 'apa', 'tolong', 'jelaskan', 'berikan',
  'tampilkan', 'informasi', 'tentang', 'data', 'ada', 'bisa', 'akan', 'sudah',
  'file', 'dokumen', 'excel', 'xlsx', 'xls', 'pdf', 'csv', 'tabel', 'daftar',
  'nama', 'nama-nama', 'adakah', 'punya', 'berisi', 'sebanyak', 'ribuan', 'semua',
  'coba', 'carikan', 'lihat', 'minta', 'saja', 'atau', 'dalam', 'tersebut', 'tsb',
  'kota', 'cilegon', 'kolom', 'isian', 'anda', 'dapat', 'kalau', 'terus', 'lalu',
  'menyortir', 'hitung', 'jumlah', 'analisis', 'kelurahan', 'kecamatan', 'yg',
  'paling', 'banyak', 'sedikit', 'terbanyak', 'maksud', 'saya', 'telusuri', 'masuk',
  'maupun', 'tahukah', 'tahun', 'terakhir'
]);

const DOMAIN_PRIORITY_TERMS = new Set([
  'peternak', 'ternak', 'nelayan', 'pembudidaya', 'petani', 'stunting', 'krs',
  'susenas', 'konsumsi', 'neraca', 'produksi', 'produktivitas', 'panen', 'gkg',
  'impor', 'swasembada', 'kemandirian', 'beras', 'singkong', 'jagung', 'kedelai',
  'ikan', 'daging', 'telur', 'cabai', 'bawang', 'minyak', 'gula', 'fsva', 'skpg',
  'ikp', 'pou', 'pph', 'cppd', 'borda', 'renstra', 'rpjmd', 'iku', 'ikk', 'ikd',
  'pagu', 'anggaran', 'kwt', 'kub', 'pokdakan', 'poklashar', 'bapanas', 'perda'
]);

// ─── In-Memory Caches untuk Hemat Supabase Egress ───────────────────────────
interface DocMeta {
  id: string;
  judul: string;
  jenis: string | null;
  file_name: string | null;
  total_chunks: number | null;
  deskripsi: string | null;
}

let _docsCache: { data: DocMeta[]; expiry: number } | null = null;
const _ragQueryCache = new Map<string, { data: MatchedKnowledgeChunk[]; expiry: number }>();
let _rpcSupported: boolean | null = null;
let _rpcCheckedAt = 0;

async function getDocsCatalogCached(): Promise<DocMeta[]> {
  if (_docsCache && Date.now() < _docsCache.expiry) {
    return _docsCache.data;
  }
  const { data } = await supabase
    .from('ai_knowledge_docs')
    .select('id, judul, jenis, file_name, total_chunks, deskripsi');
  const list = (data || []) as DocMeta[];
  _docsCache = { data: list, expiry: Date.now() + 5 * 60_000 };
  return list;
}

/**
 * Hybrid Intelligent Knowledge Base Search (Adopsi dkpp-info + Multi-Stage Domain Ranking):
 * 1. Fast PostgreSQL FTS via RPC `match_knowledge_chunks` (jika tersedia di Supabase)
 * 2. Cached Document Metadata Match (`ai_knowledge_docs` di-cache 5 menit)
 * 3. Parallelized Targeted Chunk Search (dibatasi maks 4 term terpenting secara paralel agar hemat Egress & cepat)
 */
export async function searchKnowledgeBase(queryText: string, matchLimit: number = 6): Promise<MatchedKnowledgeChunk[]> {
  const cleanQuery = queryText.replace(/['"():*&|!?,.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  const cacheKey = `${cleanQuery.toLowerCase().slice(0, 120)}_${matchLimit}`;
  const cachedHit = _ragQueryCache.get(cacheKey);
  if (cachedHit && Date.now() < cachedHit.expiry) {
    return cachedHit.data;
  }

  try {
    const resultsMap = new Map<string, MatchedKnowledgeChunk>();

    // Stage 0: Coba PostgreSQL Full-Text Search RPC `match_knowledge_chunks` (seperti dkpp-info)
    // Jika belum dibuat di Supabase, tandai false selama 10 menit agar tidak membuang 1 roundtrip
    const shouldTryRpc = _rpcSupported !== false || (Date.now() - _rpcCheckedAt > 10 * 60_000);
    if (shouldTryRpc) {
      const { data: rpcChunks, error: rpcErr } = await supabase.rpc('match_knowledge_chunks', {
        query_text: cleanQuery,
        match_limit: matchLimit,
      });

      if (rpcErr) {
        if (rpcErr.message?.includes('Could not find the function')) {
          _rpcSupported = false;
          _rpcCheckedAt = Date.now();
        }
      } else {
        _rpcSupported = true;
        _rpcCheckedAt = Date.now();
        if (Array.isArray(rpcChunks) && rpcChunks.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rpcChunks.forEach((c: any, idx: number) => {
            resultsMap.set(c.id, {
              id: c.id,
              doc_id: c.doc_id,
              doc_title: c.doc_title || 'Dokumen Referensi',
              chunk_index: c.chunk_index,
              content: c.content,
              rank: c.rank,
              score: 40 - idx * 3,
              source: 'rpc',
            });
          });

          // Jika RPC sudah mengembalikan >= 4 chunk berkualitas, langsung gunakan tanpa query ILIKE tambahan (sangat hemat Egress!)
          if (resultsMap.size >= Math.min(4, matchLimit)) {
            const fastResults = Array.from(resultsMap.values()).slice(0, matchLimit);
            _ragQueryCache.set(cacheKey, { data: fastResults, expiry: Date.now() + 2 * 60_000 });
            return fastResults;
          }
        }
      }
    }

    // Ekstrak kata kunci penting untuk pencarian multi-stage
    const rawTokens = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOPWORDS.has(t));

    const originalWords = cleanQuery.split(/\s+/).filter(Boolean);
    const properNouns = originalWords
      .filter(w => /^[A-Z]/.test(w) && w.length >= 3 && !STOPWORDS.has(w.toLowerCase()))
      .map(w => w.toLowerCase());

    // Prioritaskan domain keywords & proper nouns, batasi maksimal 4 term agar hemat Egress
    const prioritizedTerms = Array.from(new Set([
      ...rawTokens.filter(t => DOMAIN_PRIORITY_TERMS.has(t)),
      ...properNouns,
      ...rawTokens,
    ])).slice(0, 4);

    // Stage 1: Cocokkan dengan katalog dokumen (dari memori cache 5 menit)
    const allDocs = await getDocsCatalogCached();
    const docsMap = new Map<string, DocMeta>(allDocs.map(d => [d.id, d]));
    const matchedDocs: Array<DocMeta & { score: number }> = [];

    for (const doc of allDocs) {
      const titleLower = (doc.judul || '').toLowerCase();
      const fileLower = (doc.file_name || '').toLowerCase();
      const descLower = (doc.deskripsi || '').toLowerCase();

      let docScore = 0;
      for (const term of prioritizedTerms) {
        if (titleLower.includes(term)) docScore += (properNouns.includes(term) ? 14 : 9);
        if (fileLower.includes(term)) docScore += 6;
        if (descLower.includes(term)) docScore += 4;
      }
      if (docScore > 0) matchedDocs.push({ ...doc, score: docScore });
    }

    matchedDocs.sort((a, b) => b.score - a.score);
    const topDocIds = matchedDocs.slice(0, 3).map(d => d.id);

    // Stage 2: Jalankan query ILIKE secara PARALEL (bukan sekuensial) dengan batas ketat
    const termQueries = prioritizedTerms.map(async (term) => {
      const { data } = await supabase
        .from('ai_knowledge_chunks')
        .select('id, doc_id, chunk_index, content')
        .ilike('content', `%${term}%`)
        .limit(8);
      return { term, chunks: data || [] };
    });

    const docSampleQueries = topDocIds.map(async (docId) => {
      if (prioritizedTerms.length > 0) {
        const orFilter = prioritizedTerms.map(t => `content.ilike.%${t}%`).join(',');
        const { data } = await supabase
          .from('ai_knowledge_chunks')
          .select('id, doc_id, chunk_index, content')
          .eq('doc_id', docId)
          .or(orFilter)
          .limit(4);
        if (data && data.length > 0) return { docId, chunks: data, isExact: true };
      }
      const { data: fallback } = await supabase
        .from('ai_knowledge_chunks')
        .select('id, doc_id, chunk_index, content')
        .eq('doc_id', docId)
        .order('chunk_index', { ascending: true })
        .limit(2);
      return { docId, chunks: fallback || [], isExact: false };
    });

    const [termResults, docResults] = await Promise.all([
      Promise.all(termQueries),
      Promise.all(docSampleQueries),
    ]);

    for (const { term, chunks } of termResults) {
      const isDomain = DOMAIN_PRIORITY_TERMS.has(term);
      const termScore = properNouns.includes(term) ? 18 : (isDomain ? 24 : 10);
      for (const c of chunks) {
        const doc = docsMap.get(c.doc_id);
        const existing = resultsMap.get(c.id);
        if (existing) {
          existing.score = (existing.score || 0) + termScore;
        } else {
          resultsMap.set(c.id, {
            id: c.id,
            doc_id: c.doc_id,
            doc_title: doc?.judul || 'Dokumen Referensi',
            chunk_index: c.chunk_index,
            content: c.content,
            score: termScore,
            source: 'term_search',
          });
        }
      }
    }

    for (const { docId, chunks, isExact } of docResults) {
      const doc = docsMap.get(docId);
      const bonus = isExact ? 22 : 14;
      for (const c of chunks) {
        const existing = resultsMap.get(c.id);
        if (existing) {
          existing.score = (existing.score || 0) + bonus;
        } else {
          resultsMap.set(c.id, {
            id: c.id,
            doc_id: c.doc_id,
            doc_title: doc?.judul || 'Dokumen Referensi',
            chunk_index: c.chunk_index,
            content: c.content,
            score: bonus,
            source: isExact ? 'doc_match_term' : 'doc_sample',
          });
        }
      }
    }

    const finalResults = Array.from(resultsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, matchLimit);

    _ragQueryCache.set(cacheKey, { data: finalResults, expiry: Date.now() + 2 * 60_000 });
    return finalResults;
  } catch (err) {
    console.error('[searchKnowledgeBase] Error:', err);
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
