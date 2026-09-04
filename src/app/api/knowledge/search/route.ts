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
  source?: 'doc_match_term' | 'doc_sample' | 'term_search' | 'rpc' | 'ilike';
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
  'coba', 'carikan', 'lihat', 'minta', 'saja', 'atau', 'dalam', 'tersebut', 'tsb'
]);

/**
 * Multi-Stage Intelligent Knowledge Base Search:
 * 1. Document Metadata Match (Search by title, filename, desc across ai_knowledge_docs)
 * 2. Scoped Document Chunk Retrieval (Fetch high-relevance chunks from matched docs)
 * 3. Global Term Matching (Targeted entity/token ILIKE search with scoring)
 * 4. Merged & Ranked deduplication
 */
export async function searchKnowledgeBase(queryText: string, matchLimit: number = 8): Promise<MatchedKnowledgeChunk[]> {
  const cleanQuery = queryText.replace(/['"():*&|!?,.]/g, ' ').trim();
  if (!cleanQuery) return [];

  try {
    const rawTokens = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));

    const originalWords = cleanQuery.split(/\s+/).filter(Boolean);
    const properNouns = originalWords
      .filter(w => /^[A-Z]/.test(w) && w.length >= 3 && !STOPWORDS.has(w.toLowerCase()))
      .map(w => w.toLowerCase());

    const searchTerms = Array.from(new Set([...properNouns, ...rawTokens]));

    // 1. Ambil metadata seluruh dokumen terindeks
    const { data: allDocs } = await supabase
      .from('ai_knowledge_docs')
      .select('id, judul, jenis, file_name, total_chunks, deskripsi');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docsMap = new Map<string, any>((allDocs || []).map(d => [d.id, d]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedDocs: any[] = [];

    for (const doc of allDocs || []) {
      const titleLower = (doc.judul || '').toLowerCase();
      const fileLower = (doc.file_name || '').toLowerCase();
      const descLower = (doc.deskripsi || '').toLowerCase();

      let docScore = 0;
      for (const term of searchTerms) {
        if (titleLower.includes(term)) docScore += (properNouns.includes(term) ? 10 : 6);
        if (fileLower.includes(term)) docScore += 4;
        if (descLower.includes(term)) docScore += 3;
      }

      if (docScore > 0) {
        matchedDocs.push({ ...doc, score: docScore });
      }
    }

    matchedDocs.sort((a, b) => b.score - a.score);
    const matchedDocIds = matchedDocs.slice(0, 5).map(d => d.id);

    const resultsMap = new Map<string, MatchedKnowledgeChunk>();

    // 2. Jika ada dokumen yang cocok judulnya, ambil chunk dari dokumen spesifik tersebut
    if (matchedDocIds.length > 0) {
      for (const docId of matchedDocIds) {
        const doc = docsMap.get(docId);

        // Cari chunk yang mengandung searchTerms di dalam dokumen ini
        if (searchTerms.length > 0) {
          const docOrFilter = searchTerms.slice(0, 4).map(t => `content.ilike.%${t}%`).join(',');
          const { data: specificChunks } = await supabase
            .from('ai_knowledge_chunks')
            .select('id, doc_id, chunk_index, content')
            .eq('doc_id', docId)
            .or(docOrFilter)
            .limit(4);

          if (specificChunks && specificChunks.length > 0) {
            specificChunks.forEach(c => {
              resultsMap.set(c.id, {
                id: c.id,
                doc_id: c.doc_id,
                doc_title: doc?.judul || '',
                chunk_index: c.chunk_index,
                content: c.content,
                score: 25,
                source: 'doc_match_term'
              });
            });
          }
        }

        // Jika belum ada chunk yang didapat untuk doc ini, ambil sample representative chunk
        if (!Array.from(resultsMap.values()).some(r => r.doc_id === docId)) {
          const { data: sampleChunks } = await supabase
            .from('ai_knowledge_chunks')
            .select('id, doc_id, chunk_index, content')
            .eq('doc_id', docId)
            .order('chunk_index', { ascending: true })
            .limit(2);

          (sampleChunks || []).forEach(c => {
            resultsMap.set(c.id, {
              id: c.id,
              doc_id: c.doc_id,
              doc_title: doc?.judul || '',
              chunk_index: c.chunk_index,
              content: c.content,
              score: 18,
              source: 'doc_sample'
            });
          });
        }
      }
    }

    // 3. Pencarian chunk global dengan token pencarian spesifik
    if (searchTerms.length > 0) {
      for (const term of searchTerms.slice(0, 5)) {
        const { data: termChunks } = await supabase
          .from('ai_knowledge_chunks')
          .select('id, doc_id, chunk_index, content')
          .ilike('content', `%${term}%`)
          .limit(10);

        (termChunks || []).forEach(c => {
          const doc = docsMap.get(c.doc_id);
          const existing = resultsMap.get(c.id);
          const termScore = properNouns.includes(term) ? 8 : 4;
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
              source: 'term_search'
            });
          }
        });
      }
    }

    const finalResults = Array.from(resultsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, matchLimit);

    return finalResults;

  } catch (err) {
    console.error('[searchKnowledgeBase] FATAL ERROR:', err);
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
