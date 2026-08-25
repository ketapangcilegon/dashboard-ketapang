import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchKnowledgeBase, MatchedKnowledgeChunk } from '@/app/api/knowledge/search/route';

// ============================================================
// /api/ai-intelligence
// Chat interaktif AI Food Intelligence dengan konteks data
// Serumpun-Padi GIS (Pertanian, Perikanan Tangkap, Budidaya, KWT, Ternak) + Dashboard Ketapang
// ============================================================

const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash'
];

async function callGeminiWithFallback(
  apiKey: string,
  contents: object[],
  systemInstruction?: string,
  maxOutputTokens = 800
): Promise<{ text: string; model: string }> {
  let lastErrorStatus = 0;
  let lastErrorMessage = '';

  for (const model of GEMINI_MODELS) {
    try {
      const payload: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature: 0.7
        }
      };

      if (systemInstruction) {
        payload.system_instruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { text, model };
        }
      } else {
        lastErrorStatus = res.status;
        const errBody = await res.text().catch(() => '');
        console.warn(`[Gemini AI Intelligence] Model ${model} returned ${res.status}:`, errBody.substring(0, 150));
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      lastErrorMessage = e.message;
      console.warn(`[Gemini AI Intelligence] Model ${model} error:`, e.message);
    }
  }

  throw new Error(
    lastErrorStatus === 429
      ? 'Layanan AI Gemini sedang menerima banyak permintaan (Rate Limit 429). Silakan coba kirim kembali dalam beberapa detik.'
      : (lastErrorMessage || `Gemini API error: ${lastErrorStatus || 502}`)
  );
}

// Ambil semua cache SP yang tersedia dari Supabase Ketapang
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
  const needed = ['sawah_status', 'kolam_budidaya', 'nelayan_tangkap', 'poktan_kwt', 'peternakan', 'pohon_sukun'];
  const hasStale = needed.some(t => {
    if (!ctx[t]) return true;
    const row = ctx[t] as { age_minutes: number };
    return row.age_minutes > 360; // > 6 jam
  });

  if (hasStale) {
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

// Build prompt narasi lengkap dari cache SP & panel Serumpun Padi
function buildSpContextNarrative(ctx: Record<string, unknown>): string {
  const lines: string[] = [];

  // ============================================================
  // 1. DATA PERTANIAN & PADI SAWAH
  // ============================================================
  lines.push('=== 1. DATA PERTANIAN: PADI SAWAH & REKAP LUAS WILAYAH SE-KOTA CILEGON (LBS 2025 Koreksi GIS) ===');
  lines.push('• Total Luas Sawah Baku: 1.151,97 Ha (407 Petak Poligon GIS)');
  lines.push('• Produksi GKG (Gabah Kering Giling): 308.6 Ton');
  lines.push('• Luas Tanam Saat Ini: 0.57 Ha | Sawah Siap Panen: 0.57 Ha');
  lines.push('• Varietas Padi Utama: Ciherang, IR64, Inpari 32');
  lines.push('• Rata-rata Hasil Ubinan: 4.5 ton/ha');
  lines.push('\n• REKAP DATA RESMI LUAS SAWAH PER KECAMATAN DAN KELURAHAN (LBS 2025 Geometry Intersection Vector):');
  lines.push('  1. Kecamatan Cibeber: Total 181.16 Ha (78 Petak)');
  lines.push('     - Kelurahan Bulakan: 16.53 Ha (21 petak)');
  lines.push('     - Kelurahan Cibeber: 72.75 Ha (11 petak)');
  lines.push('     - Kelurahan Cikerai: 16.72 Ha (14 petak)');
  lines.push('     - Kelurahan Kalitimbang: 5.15 Ha (4 petak)');
  lines.push('     - Kelurahan Karang Asem: 12.07 Ha (14 petak)');
  lines.push('     - Kelurahan Kedaleman: 57.95 Ha (14 petak)');
  lines.push('  2. Kecamatan Cilegon: Total 28.38 Ha (28 Petak)');
  lines.push('     - Kelurahan Bagendung: 14.80 Ha');
  lines.push('     - Kelurahan Bendungan: 0.09 Ha');
  lines.push('     - Kelurahan Ciwedus: 6.59 Ha');
  lines.push('     - Kelurahan Ketileng: 6.89 Ha');
  lines.push('  3. Kecamatan Citangkil: Total 132.65 Ha (92 Petak)');
  lines.push('     - Kelurahan Deringo: 19.85 Ha');
  lines.push('     - Kelurahan Kebonsari: 12.37 Ha');
  lines.push('     - Kelurahan Lebak Denok: 25.43 Ha');
  lines.push('     - Kelurahan Samangraya: 20.67 Ha');
  lines.push('     - Kelurahan Taman Baru: 41.78 Ha');
  lines.push('     - Kelurahan Warnasari: 12.55 Ha');
  lines.push('  4. Kecamatan Ciwandan: Total 266.41 Ha (95 Petak)');
  lines.push('     - Kelurahan Banjar Negara: 31.79 Ha');
  lines.push('     - Kelurahan Gunung Sugih: 15.27 Ha');
  lines.push('     - Kelurahan Kepuh: 57.24 Ha');
  lines.push('     - Kelurahan Kubangsari: 39.70 Ha');
  lines.push('     - Kelurahan Randakari: 40.35 Ha');
  lines.push('     - Kelurahan Tegal Ratu: 82.05 Ha');
  lines.push('  5. Kecamatan Gerogol: Total 99.00 Ha (22 Petak)');
  lines.push('     - Kelurahan Gerem: 28.97 Ha');
  lines.push('     - Kelurahan Gerogol: 41.87 Ha');
  lines.push('     - Kelurahan Kotasari: 5.60 Ha');
  lines.push('     - Kelurahan Rawa Arum: 22.56 Ha');
  lines.push('  6. Kecamatan Jombang: Total 229.40 Ha (41 Petak)');
  lines.push('     - Kelurahan Gedong Dalem: 62.13 Ha');
  lines.push('     - Kelurahan Jombang Wetan: 0.05 Ha');
  lines.push('     - Kelurahan Masigit: 6.45 Ha');
  lines.push('     - Kelurahan Panggung Rawi: 102.85 Ha');
  lines.push('     - Kelurahan Sukmajaya: 57.93 Ha');
  lines.push('  7. Kecamatan Pulo Merak: Total 13.60 Ha');
  lines.push('     - Kelurahan Lebakgede: 13.60 Ha');
  lines.push('  8. Kecamatan Purwakarta: Total 201.36 Ha');
  lines.push('     - Kelurahan Kebon Dalem: 6.33 Ha');
  lines.push('     - Kelurahan Pabean: 58.93 Ha');
  lines.push('     - Kelurahan Purwakarta: 75.95 Ha');
  lines.push('     - Kelurahan Ramanuju: 0.95 Ha');
  lines.push('     - Kelurahan Tegal Bunder: 59.21 Ha');
  lines.push('  • TOTAL KESELURUHAN KOTA CILEGON: 1.151,97 Ha (407 Petak Poligon)');

  // ============================================================
  // 2. DATA PERIKANAN BUDIDAYA
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kolamEntry = (ctx['kolam_budidaya'] as any)?.data;
  lines.push('\n=== 2. DATA PERIKANAN BUDIDAYA KOTA CILEGON (Agustus 2026) ===');
  lines.push(`• Jumlah Pembudidaya: ${kolamEntry?.jumlah_pembudidaya || 2} Unit (Semua ${kolamEntry?.pembudidaya_aktif || 2} Unit Aktif)`);
  lines.push(`• Luas Total Kolam: ${kolamEntry?.luas_total_kolam_m2 || 270} m² (Kolam Tanah: 120 m², Kolam Terpal: 150 m²)`);
  lines.push(`• Produksi Bulanan (Agustus 2026): ${kolamEntry?.produksi_bulanan_kg || 55} kg`);
  lines.push(`• Omset Bulanan (Agustus 2026): Rp ${(kolamEntry?.omset_bulanan_rp || 200000).toLocaleString('id-ID')}`);
  lines.push(`• Produksi Total (2026): ${kolamEntry?.produksi_total_2026_kg || 375} Kg`);
  lines.push(`• Omset Total (2026): Rp ${(kolamEntry?.omset_total_2026_rp || 200000).toLocaleString('id-ID')}`);
  lines.push(`• Jenis Ikan Dibudidaya: Lele, Nila, Gurame`);
  lines.push(`• Detail Pembenihan: Benih Gurame 1.000 ekor @ Rp 200 (Omset Rp 200.000)`);
  lines.push(`• Detail Pembesaran: Panen Lele 55 kg di Agustus 2026`);
  lines.push(`• Titik Lokasi Pembudidaya: Nurholis (Kolam Tanah & Terpal 170 m² di Citangkil/Cilegon, Lele/Nila/Gurame), Warga tes (Kolam Tanah 100 m², Nila)`);

  // ============================================================
  // 3. DATA PERIKANAN TANGKAP
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nelayanEntry = (ctx['nelayan_tangkap'] as any)?.data;
  lines.push('\n=== 3. DATA PERIKANAN TANGKAP KOTA CILEGON (Agustus 2026) ===');
  lines.push(`• Jumlah Nelayan: ${nelayanEntry?.jumlah_nelayan || 715} Orang`);
  lines.push(`• Pangkalan Nelayan / TPI: ${nelayanEntry?.pangkalan_tpi || 9} Pangkalan`);
  lines.push(`• Armada Kapal Motor: ${nelayanEntry?.kapal_motor_tempel || 410} Unit Perahu Motor Tempel`);
  lines.push(`• Produksi Bulanan (Agustus 2026): ${nelayanEntry?.produksi_bulanan_kg || 73} Kg`);
  lines.push(`• Omset Bulanan (Agustus 2026): Rp ${(nelayanEntry?.omset_bulanan_rp || 2555000).toLocaleString('id-ID')}`);
  lines.push(`• Produksi Total (2026): ${nelayanEntry?.produksi_total_2026_kg || 136} Kg`);
  lines.push(`• Omset Total (2026): Rp ${(nelayanEntry?.omset_total_2026_rp || 4760000).toLocaleString('id-ID')}`);
  lines.push('• Rincian Komoditas Ikan Hasil Tangkap & Nilai Ekonomi:');
  lines.push('  - Ikan Kuwe: 50 kg @ Rp 35.000/kg -> Omset Rp 1.750.000 (Pangkalan Nelayan Tanjung Leneng, Ciwandan)');
  lines.push('  - Ikan Kerapu: 23 kg @ Rp 80.000/kg -> Omset Rp 1.840.000 (Pangkalan Nelayan Medaksa, Pulomerak)');
  lines.push('  - Ikan Tenggiri: 63 kg @ Rp 80.000/kg -> Omset Rp 5.040.000 (Pangkalan Nelayan Terate, Pesisir)');
  lines.push('• Daftar 9 Pangkalan Nelayan: Tanjung Peni (Ciwandan), Lelean, Kaltex (Pulomerak), Mabak (Pulomerak), Suralaya (Pulomerak), Lebak Gede (Pulomerak), Tanjung Leneng (Ciwandan), Medaksa (Pulomerak), Terate');

  // ============================================================
  // 4. DATA KWT (KELOMPOK WANITA TANI) & POKTAN
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poktanEntry = (ctx['poktan_kwt'] as any)?.data;
  lines.push('\n=== 4. DATA KWT (KELOMPOK WANITA TANI) CILEGON (Agustus 2026) ===');
  lines.push(`• Jumlah KWT: ${poktanEntry?.jumlah_kwt || 3} Kelompok`);
  lines.push(`• Total Anggota KWT: ${poktanEntry?.total_anggota || 79} Orang`);
  lines.push(`• Luas Lahan Terbina: ${poktanEntry?.luas_lahan_ha || 0.02} Ha (${poktanEntry?.luas_lahan_m2 || 200} m²)`);
  lines.push(`• Produksi Bulanan (Agustus 2026): ${poktanEntry?.produksi_bulanan_kg || 7} Kg`);
  lines.push(`• Omset Bulanan (Agustus 2026): Rp ${(poktanEntry?.omset_bulanan_rp || 140000).toLocaleString('id-ID')}`);
  lines.push(`• Produksi Total (2026): ${poktanEntry?.produksi_total_2026_kg || 7} Kg`);
  lines.push(`• Omset Total (2026): Rp ${(poktanEntry?.omset_total_2026_rp || 140000).toLocaleString('id-ID')}`);
  lines.push('• Rincian Kelompok Wanita Tani:');
  lines.push('  - KWT Kelurahan Gerogol: 23 Anggota, Luas Lahan 150 m², Komoditas Cabai 2 kg @ Rp 45.000 -> Omset Rp 90.000');
  lines.push('  - KWT Kelurahan Gerem: 23 Anggota, Luas Lahan 50 m², Komoditas Sayuran Segar 5 kg @ Rp 10.000 -> Omset Rp 50.000');
  lines.push('  - KWT Kelurahan Kotabumi: 33 Anggota (Status Aktif)');

  // ============================================================
  // 5. DATA PETERNAKAN
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ternakEntry = (ctx['peternakan'] as any)?.data;
  lines.push('\n=== 5. DATA PETERNAKAN: POPULASI & PRODUKSI TERNAK CILEGON (Agustus 2026) ===');
  lines.push(`• Total Populasi Ternak: ${ternakEntry?.total_populasi_ekor || 4} Ekor`);
  lines.push(`• Jumlah Peternak Terdaftar: ${ternakEntry?.jumlah_peternak || '2 Kelompok'} (Kelurahan Masigit, Kecamatan Jombang)`);
  lines.push(`• Estimasi Total Nilai Ternak: Rp ${(ternakEntry?.estimasi_nilai_rp || 44000000).toLocaleString('id-ID')}`);
  lines.push('• Rincian Hewan Ternak:');
  lines.push('  - Sapi / Kerbau: 2 Ekor (Estimasi Nilai Rp 40.000.000, @ Rp 20.000.000/ekor, Peternak ttt di Masigit Jombang)');
  lines.push('  - Kambing / Domba: 2 Ekor (Estimasi Nilai Rp 4.000.000, @ Rp 2.000.000/ekor, Peternak sas di Masigit Jombang)');
  lines.push('  - Unggas (Ayam/Itik): Belum terdata / -');

  // ============================================================
  // 6. DATA POHON SUKUN & DIVERSIFIKASI PANGAN LOKAL B2SA
  // ============================================================
  lines.push('\n=== 6. DATA POHON SUKUN & PANGAN LOKAL B2SA CILEGON ===');
  lines.push('• Estimasi Produksi: 1 pohon sukun produktif = ~200 kg buah sukun segar/tahun (~50 kg tepung sukun)');
  lines.push('• Peran Diversifikasi: Substitusi beras impor untuk sarapan pagi B2SA, PMT balita posyandu, dan olahan tepung sukun KWT.');

  return lines.join('\n');
}

// Ekstrak nama wilayah dari respons AI untuk highlight peta
function extractWilayahHighlights(text: string): string[] {
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
  return text.replace(/\[(WILAYAH|KECAMATAN|KELURAHAN):([^\]]+)\]/g, (_match, _type, name) => {
    return `**${name.trim()}**`;
  });
}

// Build conversation history untuk Gemini (multi-turn)
type Message = { role: 'user' | 'model'; text: string };

function buildGeminiContents(
  history: Message[],
  userMessage: string
) {
  const contents = [];

  for (const h of history) {
    if (h.text && h.text.trim()) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  return contents;
}

// ============================================================
// POST /api/ai-intelligence
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
      try {
        await fetch('/api/sp-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
        const freshCtx = await getSpContextData();
        Object.assign(spCtx, freshCtx);
      } catch { /* ignore */ }
    }

    const spNarrative = buildSpContextNarrative(spCtx);
    const sourceTables = Object.keys(spCtx);
    const lastSync = sourceTables.length > 0
      ? Object.values(spCtx).reduce((latest: string, entry) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = entry as any;
          return e?.fetched_at > latest ? e.fetched_at : latest;
        }, '')
      : new Date().toISOString();

    // 3. Search Knowledge Base (RAG)
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
Anda memiliki akses ke sumber data terpadu:
1. **Dashboard Ketapang** — data IKP, SKPG, FSVA, harga pangan strategis, forecast ML, dan gizi balita Kota Cilegon
2. **Serumpun-Padi GIS & Panel Terkini (Agustus 2026)** — data lengkap terverifikasi untuk seluruh panel sektor:
   - **Pertanian & Sawah**: Total Luas Sawah 1.151,97 Ha (407 Petak Poligon), Produksi GKG 308.6 Ton, Luas Tanam 0,57 Ha, Siap Panen 0,57 Ha, Varietas Ciherang, IR64, Inpari 32, Ubinan 4.5 ton/ha.
   - **Perikanan Tangkap**: 715 Nelayan, 9 Pangkalan/TPI, 410 Kapal Motor Tempel, Produksi Bulanan 73 Kg, Omset Bulanan Rp 2.555.000, Produksi 2026 136 Kg, Omset 2026 Rp 4.760.000. Ikan Kuwe (50kg @ Rp 35rb di Tanjung Leneng), Kerapu (23kg @ Rp 80rb di Medaksa), Tenggiri (63kg @ Rp 80rb di Terate). Pangkalan: Tanjung Peni, Lelean, Kaltex, Mabak, Suralaya, Lebak Gede, Tanjung Leneng, Medaksa, Terate.
   - **Perikanan Budidaya**: 2 Unit Pembudidaya Aktif, Luas Kolam 270 m² (Kolam Tanah 120 m², Kolam Terpal 150 m²), Produksi Bulanan 55 Kg, Omset Bulanan Rp 200.000, Produksi 2026 375 Kg. Pembenihan Gurame 1.000 ekor @ Rp 200 (Omset Rp 200.000), Pembesaran Lele 55 kg. Pembudidaya Nurholis (170 m² di Citangkil/Cilegon) dan tes (100 m²).
   - **KWT (Kelompok Wanita Tani)**: 3 KWT, 79 Anggota, Luas Lahan 0,02 Ha (200 m²), Produksi Bulanan 7 Kg, Omset Bulanan Rp 140.000. KWT Gerogol (23 anggota, lahan 150 m², Cabai 2 kg @ Rp 45.000 -> Omset Rp 90.000), KWT Gerem (23 anggota, lahan 50 m², Sayuran 5 kg @ Rp 10.000 -> Omset Rp 50.000), KWT Kotabumi (33 anggota).
   - **Peternakan**: Populasi 4 Ekor, 2 Kelompok Peternak di Kelurahan Masigit Kec. Jombang, Estimasi Nilai Rp 44.000.000 (2 Sapi @ Rp 20 Jt = Rp 40 Jt, 2 Kambing @ Rp 2 Jt = Rp 4 Jt, Unggas -).
3. **Knowledge Base Dokumen** — kumpulan dokumen resmi (Peraturan/UU, laporan tahunan, pedoman teknis) yang telah diindeks ke sistem.

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia yang formal, presisi, analitis, dan solutif.
- Gunakan data angka resmi di atas secara akurat, konsisten, dan TIDAK BOLEH MENGARANG ANGKA.
- Jika pengguna meminta tabel luas sawah per kecamatan/kelurahan, WAJIB menyajikan data angka persis dari rekapitulasi resmi (Cibeber 181.16 Ha, Ciwandan 266.41 Ha, Jombang 229.40 Ha, Purwakarta 201.36 Ha, Citangkil 132.65 Ha, Gerogol 99.00 Ha, Cilegon 28.38 Ha, Pulo Merak 13.60 Ha) beserta seluruh kelurahan rinciannya dalam tabel Markdown.
- Jika pengguna meminta tabel, rekap data, atau perbandingan (nelayan/kolam/KWT/ternak/sawah), SELALU sajikan dalam format Markdown Table yang rapi dan terstruktur (| ... |).
- ATURAN TAGGING PETA: Gunakan format [KECAMATAN:NamaKecamatan] atau [KELURAHAN:NamaKelurahan] untuk setiap nama kecamatan atau kelurahan di Cilegon yang relevan.
- Format respons menggunakan Markdown (tabel, heading, bullet points, angka cetak tebal).

DATA LENGKAP DETAIL PANEL (Serumpun-Padi × Dashboard Ketapang):
${spNarrative}

${knowledgeNarrative ? `${knowledgeNarrative}\n` : ''}`;

    // 5. Panggil Gemini API
    const contents = buildGeminiContents(history, userMessage);
    const { text: rawText, model: usedModel } = await callGeminiWithFallback(apiKey, contents, systemPrompt, 2048);

    if (!rawText) {
      return NextResponse.json({ error: 'Gemini tidak menghasilkan respons' }, { status: 502 });
    }

    // 6. Format respon
    const wilayahHighlight = extractWilayahHighlights(rawText);
    const cleanText = cleanResponseText(rawText);

    // 7. Ekstrak pin lokasi jika cocok
    const matchedPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [];
    const combinedText = (userMessage + ' ' + rawText).toLowerCase();

    // Default pin locations
    const defaultPins = [
      { lat: -6.02121, lng: 105.95186, name: 'Nelayan Tanjung Leneng', category: 'nelayan', kelurahan: 'Ciwandan', kecamatan: 'Ciwandan' },
      { lat: -5.94000, lng: 105.99996, name: 'Nelayan Medaksa', category: 'nelayan', kelurahan: 'Pulomerak', kecamatan: 'Pulomerak' },
      { lat: -6.00265, lng: 106.08792, name: 'Nelayan Terate', category: 'nelayan', kelurahan: 'Terate', kecamatan: 'Pesisir' },
      { lat: -5.98419, lng: 105.99079, name: 'Nelayan Tanjung Peni', category: 'nelayan', kelurahan: 'Ciwandan', kecamatan: 'Ciwandan' },
      { lat: -5.89686, lng: 106.01774, name: 'Nelayan Suralaya', category: 'nelayan', kelurahan: 'Suralaya', kecamatan: 'Pulomerak' },
      { lat: -6.02954, lng: 106.00843, name: 'Kolam Nurholis', category: 'kolam', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -5.97323, lng: 106.03231, name: 'KWT Gerogol', category: 'poktan', kelurahan: 'Gerogol', kecamatan: 'Grogol' },
      { lat: -5.95625, lng: 106.03523, name: 'KWT Gerem', category: 'poktan', kelurahan: 'Gerem', kecamatan: 'Grogol' },
      { lat: -6.00723, lng: 106.05795, name: 'Peternakan Masigit', category: 'ternak', kelurahan: 'Masigit', kecamatan: 'Jombang' }
    ];

    for (const p of defaultPins) {
      const nameKey = p.name.toLowerCase();
      if (combinedText.includes(nameKey) || combinedText.includes(p.category) || (p.kelurahan && combinedText.includes(p.kelurahan.toLowerCase()))) {
        matchedPins.push(p);
      }
    }

    return NextResponse.json({
      success: true,
      text: cleanText,
      wilayah_highlight: wilayahHighlight,
      matched_pins: matchedPins.slice(0, 5),
      source_tables: sourceTables.length > 0 ? sourceTables : ['sawah_status', 'kolam_budidaya', 'nelayan_tangkap', 'poktan_kwt', 'peternakan'],
      referenced_docs: referencedDocs,
      last_sync: lastSync,
      model: usedModel
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('/api/ai-intelligence error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — status cache
export async function GET() {
  const spCtx = await getSpContextData();
  return NextResponse.json({
    status: 'ok',
    sp_cache_tables: Object.keys(spCtx).length,
    tables: Object.entries(spCtx).map(([tabel, v]) => ({
      tabel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      age_minutes: (v as any)?.age_minutes || 0
    }))
  });
}
