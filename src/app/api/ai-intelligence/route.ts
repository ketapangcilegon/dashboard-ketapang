import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchKnowledgeBase, MatchedKnowledgeChunk } from '@/app/api/knowledge/search/route';

// ============================================================
// /api/ai-intelligence
// Chat interaktif AI Food Intelligence dengan konteks data
// Serumpun-Padi + Dashboard Ketapang
// Output: { text, wilayah_highlight, source_tables }
// ============================================================

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Ambil semua cache SP yang tersedia
async function getSpContextData(): Promise<Record<string, unknown>> {
  try {
    const { data } = await supabase
      .from('sp_cache_data')
      .select('tabel_sumber, data, fetched_at');
    
    const ctx: Record<string, unknown> = {};
    for (const row of data || []) {
      ctx[row.tabel_sumber] = {
        data: row.data,
        fetched_at: row.fetched_at,
        age_minutes: Math.round((Date.now() - new Date(row.fetched_at).getTime()) / 60000)
      };
    }
    return ctx;
  } catch {
    return {};
  }
}

// Trigger sync jika ada cache yang stale
async function triggerSyncIfStale(ctx: Record<string, unknown>): Promise<void> {
  const needed = ['sawah_status', 'kolam_budidaya', 'nelayan_tangkap', 'poktan_kwt', 'komoditas_hortikultura', 'komoditas_palawija'];
  const hasStale = needed.some(t => {
    if (!ctx[t]) return true;
    const row = ctx[t] as { age_minutes: number };
    return row.age_minutes > 360; // > 6 jam
  });

  if (hasStale) {
    // Fire-and-forget sync (jangan tunggu, agar tidak lambat)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/sp-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false })
    }).catch(() => {});
  }
}

// Format angka ha untuk narasi AI
function fmtHa(n: number | undefined): string {
  if (!n) return '0 ha';
  return `${n.toFixed(2)} ha`;
}

// Build prompt konteks dari cache SP
function buildSpContextNarrative(ctx: Record<string, unknown>): string {
  const lines: string[] = [];

  // --- SAWAH ---
  const sawahEntry = ctx['sawah_status'] as { data: {
    total_sawah: number;
    total_luas_ha: number;
    by_status: Record<string, number>;
    by_kecamatan: Record<string, { total_ha: number; by_status: Record<string, number> }>;
    avg_hasil_ubinan: number | null;
  } } | undefined;

  if (sawahEntry?.data) {
    const d = sawahEntry.data;
    lines.push('=== DATA SAWAH (Serumpun-Padi GIS) ===');
    lines.push(`Total petak sawah terdaftar: ${d.total_sawah} petak, total luas: ${fmtHa(d.total_luas_ha)}`);
    
    if (d.by_status) {
      const statusLines = Object.entries(d.by_status)
        .map(([st, ha]) => `  • ${st}: ${fmtHa(ha as number)}`);
      lines.push('Distribusi status lahan:');
      lines.push(...statusLines);
    }

    if (d.by_kecamatan) {
      lines.push('Distribusi per kecamatan:');
      for (const [kec, info] of Object.entries(d.by_kecamatan)) {
        const statusStr = Object.entries(info.by_status)
          .map(([st, ha]) => `${st}: ${fmtHa(ha as number)}`)
          .join(', ');
        lines.push(`  • ${kec}: total ${fmtHa(info.total_ha)} [${statusStr}]`);
      }
    }

    if (d.avg_hasil_ubinan) {
      lines.push(`Rata-rata hasil ubinan: ${d.avg_hasil_ubinan} ton/ha (estimasi)`);
    }
  } else {
    lines.push('=== DATA SAWAH: Belum tersedia (cache kosong) ===');
  }

  // --- KOLAM BUDIDAYA ---
  const kolamEntry = ctx['kolam_budidaya'] as { data: {
    total_kolam: number; total_luas_ha: number;
    by_status: Record<string, number>; jenis_ikan_dibudidaya: string[];
  } } | undefined;

  if (kolamEntry?.data) {
    const d = kolamEntry.data;
    lines.push('\n=== DATA KOLAM BUDIDAYA (Serumpun-Padi GIS) ===');
    lines.push(`Total kolam: ${d.total_kolam}, luas: ${fmtHa(d.total_luas_ha)}`);
    lines.push(`Jenis ikan: ${(d.jenis_ikan_dibudidaya || []).join(', ') || 'tidak tercatat'}`);
    if (d.by_status) {
      lines.push('Status kolam: ' + Object.entries(d.by_status).map(([k, v]) => `${k}: ${v}`).join(', '));
    }
  }

  // --- NELAYAN TANGKAP ---
  const nelayanEntry = ctx['nelayan_tangkap'] as { data: {
    total_nelayan: number; by_alat_tangkap: Record<string, number>; jenis_ikan_tangkap: string[];
  } } | undefined;

  if (nelayanEntry?.data) {
    const d = nelayanEntry.data;
    lines.push('\n=== DATA NELAYAN TANGKAP (Serumpun-Padi GIS) ===');
    lines.push(`Total nelayan/unit tangkap terdaftar: ${d.total_nelayan}`);
    lines.push(`Alat tangkap: ${Object.entries(d.by_alat_tangkap || {}).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    lines.push(`Jenis ikan tangkap: ${(d.jenis_ikan_tangkap || []).join(', ') || 'tidak tercatat'}`);
  }

  // --- POKTAN/KWT ---
  const poktanEntry = ctx['poktan_kwt'] as { data: {
    total_poktan: number; poktan_aktif: number; total_anggota: number;
    by_jenis: Record<string, number>; by_kecamatan: Record<string, number>;
  } } | undefined;

  if (poktanEntry?.data) {
    const d = poktanEntry.data;
    lines.push('\n=== DATA KELOMPOK TANI / KWT (Serumpun-Padi GIS) ===');
    lines.push(`Total poktan/KWT: ${d.total_poktan} (aktif: ${d.poktan_aktif}), total anggota: ${d.total_anggota}`);
    if (d.by_jenis) {
      lines.push('Jenis: ' + Object.entries(d.by_jenis).map(([k, v]) => `${k}: ${v}`).join(', '));
    }
    if (d.by_kecamatan) {
      lines.push('Per kecamatan: ' + Object.entries(d.by_kecamatan).map(([k, v]) => `${k}: ${v}`).join(', '));
    }
  }

  return lines.join('\n');
}

// Ekstrak nama wilayah dari respons AI untuk highlight peta
// AI kadang pakai format [WILAYAH:...], [KECAMATAN:...], atau [KELURAHAN:...]
function extractWilayahHighlights(text: string): string[] {
  // Tangkap semua variasi: [WILAYAH:X], [KECAMATAN:X], [KELURAHAN:X]
  const pattern = /\[(WILAYAH|KECAMATAN|KELURAHAN):([^\]]+)\]/g;
  const matches: string[] = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const name = m[2].trim();
    if (name && !matches.includes(name)) matches.push(name);
  }
  return matches;
}

function cleanResponseText(text: string): string {
  // Bersihkan semua variasi tag wilayah dari tampilan, jadikan bold
  return text.replace(/\[(WILAYAH|KECAMATAN|KELURAHAN):([^\]]+)\]/g, (_match, _type, name) => {
    return `**${name.trim()}**`;
  });
}

// Build conversation history untuk Gemini (multi-turn)
type Message = { role: 'user' | 'model'; text: string };

function buildGeminiContents(
  systemPrompt: string,
  history: Message[],
  userMessage: string
) {
  const contents = [];

  // Gemini tidak punya "system" role — masukkan sebagai bagian dari user turn pertama
  if (history.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\n' + userMessage }]
    });
  } else {
    // Turn pertama sudah ada dalam history — prepend system ke turn pertama
    const firstUserMsg = history[0];
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\n' + firstUserMsg.text }]
    });
    // Sisa history
    for (let i = 1; i < history.length; i++) {
      contents.push({
        role: history[i].role === 'user' ? 'user' : 'model',
        parts: [{ text: history[i].text }]
      });
    }
    // Pesan user saat ini
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
  }

  return contents;
}

// ============================================================
// POST /api/ai-intelligence
// Body: { message: string, history?: Message[] }
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessage: string = body?.message || '';
    const history: Message[] = body?.history || [];
    const forceRefresh: boolean = body?.forceRefresh === true;

    if (!userMessage.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tidak dikonfigurasi' }, { status: 500 });
    }

    // 1. Load konteks dari SP cache
    const spCtx = await getSpContextData();

    // 2. Trigger sync jika ada yang stale (non-blocking)
    if (!forceRefresh) {
      triggerSyncIfStale(spCtx);
    } else {
      // Sync sekarang dan tunggu
      try {
        await fetch('/api/sp-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
        // Reload context setelah sync
        const freshCtx = await getSpContextData();
        Object.assign(spCtx, freshCtx);
      } catch { /* ignore */ }
    }

    const spNarrative = buildSpContextNarrative(spCtx);
    const sourceTables = Object.keys(spCtx);
    const lastSync = sourceTables.length > 0
      ? Object.values(spCtx).reduce((latest: string, entry) => {
          const e = entry as { fetched_at: string };
          return e.fetched_at > latest ? e.fetched_at : latest;
        }, '')
      : null;

    // 3. Search Knowledge Base (RAG) untuk dokumen PDF / laporan / peraturan yang diupload
    let knowledgeNarrative = '';
    let referencedDocs: string[] = [];
    try {
      const matchedChunks: MatchedKnowledgeChunk[] = await searchKnowledgeBase(userMessage, 4);
      if (matchedChunks.length > 0) {
        referencedDocs = Array.from(new Set(matchedChunks.map(c => c.doc_title)));
        const chunkTexts = matchedChunks.map(c => `[Dokumen: ${c.doc_title}]\n${c.content}`);
        knowledgeNarrative = `=== DOKUMEN REFERENSI & KNOWLEDGE BASE TERKAIT ===\n${chunkTexts.join('\n\n---\n\n')}\n\nGunakan referensi dokumen di atas jika relevan untuk menjawab pertanyaan pengguna.`;
      }
    } catch (e) {
      console.warn('Failed searching knowledge base:', e);
    }

    // 4. Build system prompt
    const systemPrompt = `Anda adalah **Food Intelligence Assistant** milik Dinas Ketahanan Pangan Kota Cilegon.
Anda memiliki akses ke tiga sumber data terintegrasi:
1. **Dashboard Ketapang** — data IKP, SKPG, FSVA, harga pangan strategis, forecast ML, dan gizi balita Kota Cilegon
2. **Serumpun-Padi GIS** — data produksi pertanian spasial (sawah, kolam budidaya, nelayan, poktan/KWT, hortikultura, palawija)
3. **Knowledge Base Dokumen** — kumpulan dokumen resmi (Peraturan/UU, laporan tahunan, pedoman teknis) yang telah diindeks ke sistem

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia yang formal, analitis, dan solutif
- ATURAN TAGGING PETA: Gunakan format [KECAMATAN:NamaKecamatan] atau [KELURAHAN:NamaKelurahan] HANYA untuk wilayah yang menjadi FOKUS UTAMA atau REKOMENDASI jawaban Anda (maksimal 3 wilayah). JANGAN tag wilayah yang hanya disebut sebagai konteks negatif, perbandingan, atau wilayah yang "tidak memiliki data".
- Contoh BENAR: "Kecamatan dengan lahan terluas adalah [KECAMATAN:Cibeber] (239 ha)" — hanya Cibeber yang di-tag karena itu fokus jawaban
- Contoh SALAH: Jangan tag semua kecamatan yang disebutkan dalam daftar perbandingan
- Kecamatan di Cilegon: Cilegon, Citangkil, Ciwandan, Jombang, Cibeber, Pulomerak, Grogol, Purwakarta
- Gunakan data yang tersedia; jika data tidak ada, katakan dengan jelas
- Format respons menggunakan Markdown (bold, bullets, heading) agar mudah dibaca
- Maksimal 400 kata per respons, kecuali diminta detail

DATA PRODUKSI TERKINI (dari Serumpun-Padi GIS):
${spNarrative || 'Data Serumpun-Padi belum tersinkronisasi. Gunakan data yang tersedia dari Dashboard Ketapang.'}

${knowledgeNarrative ? `${knowledgeNarrative}\n` : ''}
CATATAN: Data spasial di-cache dan diperbarui setiap 6 jam. Data harga pangan dan IKP/SKPG tersedia secara real-time di Dashboard Ketapang.`;

    // 4. Panggil Gemini API
    const contents = buildGeminiContents(systemPrompt, history, userMessage);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errText);
      return NextResponse.json(
        { error: `Gemini API error: ${geminiResponse.status}` },
        { status: 502 }
      );
    }

    const geminiResult = await geminiResponse.json();
    const rawText: string = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawText) {
      return NextResponse.json({ error: 'Gemini tidak menghasilkan respons' }, { status: 502 });
    }

    // 5. Proses respons: ekstrak highlight wilayah + bersihkan teks
    const wilayahHighlight = extractWilayahHighlights(rawText);
    const cleanText = cleanResponseText(rawText);

    return NextResponse.json({
      success: true,
      text: cleanText,
      wilayah_highlight: wilayahHighlight,
      source_tables: sourceTables,
      referenced_docs: referencedDocs,
      last_sync: lastSync,
      model: GEMINI_MODEL
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('/api/ai-intelligence error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — health check + status data
export async function GET() {
  const spCtx = await getSpContextData();
  return NextResponse.json({
    status: 'ok',
    sp_cache_tables: Object.keys(spCtx).length,
    tables: Object.entries(spCtx).map(([tabel, v]) => ({
      tabel,
      age_minutes: (v as { age_minutes: number }).age_minutes
    }))
  });
}
