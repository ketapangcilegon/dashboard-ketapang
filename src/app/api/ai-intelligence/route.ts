import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchKnowledgeBase, MatchedKnowledgeChunk } from '@/app/api/knowledge/search/route';
import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';
import { BASELINE_KELURAHAN_DATA } from '@/lib/thematic-indicators';
import { SEED_OBSERVASI_DATA } from '@/lib/kameraSeedData';
import { DKPP_MASTER_PROMPT } from '@/lib/masterPrompt';
import { reconstructContextualQuery } from '@/lib/conversationalContextEngine';
import { isRenstraQuery, fetchRenstraData, buildRenstraContext } from '@/lib/renstra';
import { getAllKwtPins, buildKwtPromptContext } from '@/lib/kwt/data';
import {
  getLiveSagonPanelData,
  getLiveForecastTableData,
  getLiveIkpPouData,
  getLiveIndikatorKetapangData,
  getLiveEwsData,
  getLiveGkgData,
} from '@/lib/chatPanels';

// ============================================================
// /api/ai-intelligence
// Mesin Chatbot Cerdas PANCI (Platform Analisis Pangan Kota Cilegon)
// Mengadopsi penuh arsitektur algoritma ChatDKPP (dkpp-info):
// 1. Multi-Turn Conversational Context Engine & Query Reconstruction (10 putaran)
// 2. Deteksi Jenis Pertanyaan (Langkah 0: Analitik vs Data Spesifik vs Ringkasan)
// 3. Kamus Master Taksonomi & Anti-Tertukar (DKPP_MASTER_PROMPT)
// 4. Interactive Tool Routing (7 Panel Visualisasi Live Terintegrasi)
// 5. Conditional + In-Memory TTL Caching (Sangat Hemat Supabase Egress & Vercel CPU)
// ============================================================

export interface SourceCitation {
  type: 'KNOWLEDGE BASE' | 'LIVE DATABASE' | 'GIS SPATIAL';
  title: string;
  detail?: string;
}

export interface ToolCallBadge {
  id: string;
  name: string;
  status: 'completed';
}

// Data Luas Sawah Resmi per Kelurahan (Ha) untuk GIS Intelligence Pin
const KELURAHAN_SAWAH: Record<string, number> = {
  'Bulakan': 16.53, 'Cibeber': 72.75, 'Cikerai': 16.72, 'Kalitimbang': 5.15, 'Karang Asem': 12.07, 'Kedaleman': 57.95,
  'Bagendung': 14.80, 'Bendungan': 0.09, 'Ciwaduk': 0.00, 'Ciwedus': 6.59, 'Ketileng': 6.89,
  'Citangkil': 0.00, 'Deringo': 19.85, 'Kebonsari': 12.37, 'Lebak Denok': 25.43, 'Samangraya': 20.67, 'Taman Baru': 41.78, 'Warnasari': 12.55,
  'Banjar Negara': 31.79, 'Gunung Sugih': 15.27, 'Kepuh': 57.24, 'Kubangsari': 39.70, 'Randakari': 40.35, 'Tegal Ratu': 82.05,
  'Gerem': 28.97, 'Gerogol': 41.87, 'Kotasari': 5.60, 'Rawa Arum': 22.56,
  'Gedong Dalem': 62.13, 'Jombang Wetan': 0.05, 'Masigit': 6.45, 'Panggung Rawi': 102.85, 'Sukmajaya': 57.93,
  'Lebakgede': 13.60, 'Mekarsari': 0.00, 'Suralaya': 0.00, 'Tamansari': 0.00,
  'Kebon Dalem': 6.33, 'Kotabumi': 0.00, 'Pabean': 58.93, 'Purwakarta': 75.95, 'Ramanuju': 0.95, 'Tegal Bunder': 59.21
};

const KECAMATAN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Cibeber': { lat: -6.035, lng: 106.065 },
  'Cilegon': { lat: -6.022, lng: 106.050 },
  'Citangkil': { lat: -6.012, lng: 106.015 },
  'Ciwandan': { lat: -6.020, lng: 105.955 },
  'Gerogol': { lat: -5.972, lng: 106.025 },
  'Jombang': { lat: -6.005, lng: 106.058 },
  'Pulo Merak': { lat: -5.920, lng: 106.005 },
  'Pulomerak': { lat: -5.920, lng: 106.005 },
  'Purwakarta': { lat: -5.980, lng: 106.050 }
};

// ─── In-Memory TTL Cache (Adopsi dkpp-info untuk Hemat Egress & Latency) ───
const _ctxCache = new Map<string, { data: unknown; expiry: number }>();
function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = _ctxCache.get(key);
  if (hit && Date.now() < hit.expiry) return Promise.resolve(hit.data as T);
  return fetcher().then((data) => {
    _ctxCache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}
const TTL_5M = 5 * 60_000;
const TTL_10M = 10 * 60_000;

// ─── Gemini Multi-Model Chain ───────────────────────────────────────────────
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-2.0-flash',
];

async function callGeminiWithFallback(
  apiKey: string,
  contents: object[],
  systemInstruction?: string,
  maxOutputTokens = 3200,
  hasImage = false
): Promise<{ text: string; model: string }> {
  let lastErrorStatus = 0;
  let lastErrorMessage = '';

  const models = hasImage
    ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest']
    : GEMINI_MODELS;

  for (const model of models) {
    try {
      const payload: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature: 0.65,
        },
      };

      if (systemInstruction) {
        payload.system_instruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return { text, model };
        }
      } else {
        lastErrorStatus = res.status;
        const errBody = await res.text().catch(() => '');
        console.warn(`[Gemini PANCI] Model ${model} returned ${res.status}:`, errBody.substring(0, 150));
        if (res.status === 429) await new Promise((r) => setTimeout(r, 350));
      }
    } catch (err: unknown) {
      const e = err as Error;
      lastErrorMessage = e.message;
      console.warn(`[Gemini PANCI] Model ${model} error/timeout:`, e.message);
    }
  }

  throw new Error(
    lastErrorStatus === 429
      ? 'Layanan AI Gemini sedang menerima banyak permintaan (Rate Limit 429).'
      : (lastErrorMessage || `Gemini API error: ${lastErrorStatus || 502}`)
  );
}

// ─── Domain Detectors (Conditional Context Loading ala dkpp-info) ───────────
function isTrivialQuery(q: string): boolean {
  const lower = q.trim().toLowerCase();
  if (lower.length > 24) return false;
  return /^(halo|hai|hello|hi|pagi|siang|sore|malam|assalamualaikum|selamat|tanggal|hari ini|jam berapa|siapa kamu|kamu siapa|test|tes|coba|ping)\b/.test(lower);
}

function isPerikananQuery(query: string): boolean {
  const q = query.toLowerCase();
  return [
    'nelayan', 'perikanan', 'ikan', 'budidaya', 'tangkap', 'kub', 'koperasi nelayan',
    'pokdakan', 'poklashar', 'pangkalan', 'perahu', 'kapal', 'alat tangkap',
    'bagan', 'pancing', 'jaring', 'bubu', 'lele', 'nila', 'gurame', 'ikan hias',
    'kolam', 'pembudidaya', 'produksi ikan', 'pengolah', 'asuransi nelayan', 'bpan',
    'tanjung peni', 'tanjung leneng', 'suralaya', 'mabak', 'lelean', 'terate', 'medaksa', 'kaltex', 'kaltek',
    'pulau', 'pantai', 'laut', 'selat sunda', 'tpi'
  ].some((k) => q.includes(k));
}

function isAnalyticalOrStrategicQuery(normMsg: string): boolean {
  return [
    'tantangan', 'isu', 'dibenahi', 'analisis', 'masalah', 'permasalahan',
    'rekomendasi', 'strategi', 'kenapa', 'mengapa', 'bagaimana', 'hambatan',
    'kendala', 'solusi', 'kebijakan', 'kelemahan', 'kekurangan', 'langkah',
    'upaya', 'neraca', 'kemandirian', 'defisit', 'swasembada', 'jelaskan',
    'uraikan', 'komprehensif', 'mendalam', 'faktor pendorong', 'penyebab',
    'bandingkan', 'perbandingan', 'evaluasi', 'dampak'
  ].some((k) => normMsg.includes(k));
}

// ─── Clean Response Text (Adopsi penuh dkpp-info: anti-LaTeX, anti-orphan bullet, anti-broken table) ───
function cleanResponseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$\\to\$/g, '→')
    .replace(/\$\\times\$/g, '×')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\to\b/g, '→')
    .replace(/\\le(q)?\b/g, '≤')
    .replace(/\\ge(q)?\b/g, '≥')
    .replace(/\\%/g, '%')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^\$\n]+)\$/g, '$1')
    .replace(/(?:^|\n)\s*[•\-\*]\s*\n+\s*/g, '\n• ')
    .replace(/(\|[^\n]+\|)\n\s*\n+(?=\|[^\n]+\|)/g, '$1\n')
    .replace(/\[(WILAYAH|KECAMATAN|KELURAHAN):([^\]]+)\]/g, (_match, _type, name) => `**${name.trim()}**`)
    .replace(/#{5,}\s*/g, '#### ')
    .trim();
}

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

// ─── Ambil Cache SP (Tanpa blob foto base64) ────────────────────────────────
async function getSpContextData(): Promise<Record<string, unknown>> {
  try {
    const { data } = await supabase
      .from('sp_cache_data')
      .select('tabel_sumber, data, fetched_at')
      .neq('tabel_sumber', 'kamera_cerdas_observasi');

    const ctx: Record<string, unknown> = {};
    for (const row of data || []) {
      ctx[row.tabel_sumber] = {
        data: row.data,
        fetched_at: row.fetched_at,
        age_minutes: Math.round((Date.now() - new Date(row.fetched_at).getTime()) / 60000),
      };
    }

    ctx['kamera_cerdas_observasi'] = {
      data: SEED_OBSERVASI_DATA.map(({ foto_url: _omit, ...rest }) => {
        void _omit;
        return rest;
      }),
      fetched_at: new Date().toISOString(),
      age_minutes: 0,
    };

    return ctx;
  } catch {
    return {};
  }
}

// ─── Live Core Database Context (Cached 5m — FSVA 2026 Live, SKPG, IKP, PoU, SAGON) ───
async function getLiveCoreDatabaseContext(): Promise<string> {
  const lines: string[] = [];
  try {
    const [ikpRes, pouRes, fsvaRes, skpgRes, sagonRes] = await Promise.allSettled([
      supabase.from('ikp_data').select('*').order('tahun', { ascending: true }),
      supabase.from('pou_data').select('*').order('tahun', { ascending: true }),
      supabase.from('fsva_matang').select('kelurahan,kecamatan,periode,prioritas,indeks_komposit,ncpr,kemiskinan,tanpa_air_bersih,stunting').order('periode', { ascending: false }).limit(86),
      supabase.from('gizi_balita_skpg_kelurahan').select('kelurahan,kecamatan,tahun,bulan,balita_ditimbang,gizi_normal,gizi_kurang,gizi_buruk,status_skpg').order('tahun', { ascending: false }).order('bulan', { ascending: false }).limit(43),
      supabase.from('harga_sagon_harian').select('tanggal,beras,bawang_merah,bawang_putih,cabe_merah,cabe_merah_keriting,cabe_rawit_merah,daging_sapi,daging_ayam,telur,gula_pasir,minyak_goreng_kemasan,tepung_terigu').order('tanggal', { ascending: false }).limit(1),
    ]);

    lines.push('=== A. INDIKATOR MAKRO KETAHANAN PANGAN & BENCHMARK RPJMD KOTA CILEGON ===');
    lines.push('• Skor Pola Pangan Harapan (PPH) Konsumsi: 90,9 Poin (Standar Nasional: 90,0) -> MELAMPAUI TARGET');
    lines.push('• Agregat Konsumsi Energi & Protein: 100,22% (Konsumsi Energi: 2.021 kkal/kap/hari | Konsumsi Protein: 59,0 g/kap/hari vs standar 57 g)');
    lines.push('• Agregat Ketersediaan Energi & Protein: 121,0% (Ketersediaan Energi: 2.582 kkal/kap/hari | Ketersediaan Protein: 85,0 g/kap/hari -> SURPLUS AMAN)');
    lines.push('• Cadangan Pangan Pemerintah Daerah (CPPD): 115,8 Ton Beras di Gudang Bulog (Target RPJMD: 115,0 Ton) -> MEMENUHI KUOTA');
    lines.push('• Stabilitas Harga Beras (Koefisien Variasi / CV): 0,74% - 3,65% (Ambang Aman Nasional: CV < 10%) -> SANGAT STABIL');
    lines.push('• Penanganan Daerah Rawan Pangan: 100% | Pengawasan Keamanan Pangan Segar: 85,9% - 100% (78 sampel diuji, 67 memenuhi syarat bebas cemaran)');

    // IKP & PoU Live
    lines.push('\n=== B. INDEKS KETAHANAN PANGAN (IKP) & POU (LIVE DATABASE) ===');
    if (ikpRes.status === 'fulfilled' && ikpRes.value.data?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ikpStr = ikpRes.value.data.map((r: any) => `${r.tahun}: Cilegon ${r.cilegon ?? r.ikp_cilegon ?? r.skor_cilegon ?? '-'} (Banten ${r.provinsi ?? r.ikp_provinsi ?? r.skor_banten ?? '-'})`).join(' | ');
      lines.push(`• Time-Series IKP: ${ikpStr}`);
    } else {
      lines.push('• Time-Series IKP: 2020: 70,23 | 2021: 71,42 | 2022: 72,63 | 2023: 81,54 (Rekor) | 2024: 80,12 (Sangat Tahan, di atas Banten 79,25)');
    }
    if (pouRes.status === 'fulfilled' && pouRes.value.data?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pouStr = pouRes.value.data.map((r: any) => `${r.tahun}: ${r.cilegon ?? r.pou_cilegon ?? r.nilai ?? '-'}%`).join(' | ');
      lines.push(`• Time-Series PoU (Prevalensi Ketidakcukupan Konsumsi Pangan): ${pouStr} (Jauh lebih baik dari rata-rata Nasional 7,89%)`);
    } else {
      lines.push('• Time-Series PoU: 2021: 2,46% | 2022: 2,04% | 2023: 2,19% | 2024: 1,96% | 2025: 2,78% (Nasional: 7,89%)');
    }

    // FSVA Live dari tabel fsva_matang (menyesuaikan otomatis baseline terbaru misal 2026!)
    lines.push('\n=== C. PETA KERENTANAN & KETAHANAN PANGAN (FSVA LIVE DATABASE 43 KELURAHAN) ===');
    if (fsvaRes.status === 'fulfilled' && fsvaRes.value.data?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allRows: any[] = fsvaRes.value.data;
      const latestPeriode = allRows[0]?.periode;
      const latestRows = allRows.filter((r) => String(r.periode) === String(latestPeriode));
      const byPrio: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      const seenKel = new Set<string>();
      for (const r of latestRows) {
        const kel = String(r.kelurahan || '').trim();
        if (!kel || seenKel.has(kel.toLowerCase())) continue;
        seenKel.add(kel.toLowerCase());
        const p = Number(r.prioritas) || 5;
        const ikpVal = r.indeks_komposit != null ? ` (${Number(r.indeks_komposit).toFixed(2)})` : '';
        if (byPrio[p]) byPrio[p].push(`${kel}${ikpVal}`);
      }
      lines.push(`• Baseline FSVA Aktif di Database PANCI: Tahun ${latestPeriode} (${seenKel.size} Kelurahan Terpetakan)`);
      if (byPrio[1].length === 0 && byPrio[2].length === 0) {
        lines.push('• Tidak ada kelurahan Prioritas 1 maupun Prioritas 2 (Sangat Rentan/Rentan Berat = 0 Kelurahan).');
      }
      for (const p of [1, 2, 3, 4, 5, 6]) {
        if (byPrio[p].length > 0) {
          const label =
            p === 1 ? 'Sangat Rentan' :
            p === 2 ? 'Rentan' :
            p === 3 ? 'Agak Rentan / Prioritas Intervensi Fokus' :
            p === 4 ? 'Agak Tahan / Pengawasan' :
            p === 5 ? 'Tahan' : 'Sangat Tahan';
          lines.push(`  - Prioritas ${p} (${label} — ${byPrio[p].length} Kelurahan): ${byPrio[p].join(', ')}`);
        }
      }
    } else {
      lines.push('• Klasifikasi FSVA 43 Kelurahan: Mayoritas berada pada Prioritas 5 (Tahan) & Prioritas 6 (Sangat Tahan), tanpa kelurahan Prioritas 1-2.');
    }

    // SKPG Live
    lines.push('\n=== D. SISTEM KEWASPADAAN PANGAN DAN GIZI (SKPG) & SURVEILANS BALITA ===');
    lines.push('• Metodologi SKPG Tri-Aspek: (1) Ketersediaan Pangan, (2) Akses/Stabilitas Harga Pangan, (3) Pemanfaatan Pangan & Gizi Balita Posyandu.');
    lines.push('• Rekapitulasi Surveilans Antropometri Posyandu Kota Cilegon: Total 27.286 Balita ditimbang | Gizi Normal: 25.044 (91,78%) | Gizi Lebih: 1.064 (3,90%) | Gizi Kurang: 946 (3,47%) | Gizi Sangat Kurang: 232 (0,85%). Prevalensi gizi kurang 3,47% jauh di bawah batas waspada 10% -> STATUS KOTA: AMAN (HIJAU).');
    if (skpgRes.status === 'fulfilled' && skpgRes.value.data?.length) {
      const sample = skpgRes.value.data[0];
      lines.push(`• Periode Data SKPG Kelurahan Terbaru di Database: Bulan ${sample.bulan}/${sample.tahun}.`);
    }

    // SAGON Live
    lines.push('\n=== E. HARGA PANGAN HARIAN REAL-TIME SAGON (3 PASAR: KRANGGOT, BLOK F, MERAK) ===');
    if (sagonRes.status === 'fulfilled' && sagonRes.value.data?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s: any = sagonRes.value.data[0];
      lines.push(`• Update Terakhir Tabel harga_sagon_harian (${s.tanggal}):`);
      lines.push(`  - Beras Medium: Rp ${Number(s.beras || 13833).toLocaleString('id-ID')}/kg | Minyak Goreng Kemasan: Rp ${Number(s.minyak_goreng_kemasan || 22000).toLocaleString('id-ID')}/L | Gula Pasir: Rp ${Number(s.gula_pasir || 18500).toLocaleString('id-ID')}/kg | Tepung Terigu: Rp ${Number(s.tepung_terigu || 12333).toLocaleString('id-ID')}/kg`);
      lines.push(`  - Telur Ayam Ras: Rp ${Number(s.telur || 29500).toLocaleString('id-ID')}/kg | Daging Ayam Ras: Rp ${Number(s.daging_ayam || 38000).toLocaleString('id-ID')}/kg | Daging Sapi Murni: Rp ${Number(s.daging_sapi || 140000).toLocaleString('id-ID')}/kg`);
      lines.push(`  - Bawang Merah: Rp ${Number(s.bawang_merah || 38000).toLocaleString('id-ID')}/kg | Bawang Putih: Rp ${Number(s.bawang_putih || 38000).toLocaleString('id-ID')}/kg | Cabai Merah Besar: Rp ${Number(s.cabe_merah || 41000).toLocaleString('id-ID')}/kg | Cabai Merah Keriting: Rp ${Number(s.cabe_merah_keriting || 45000).toLocaleString('id-ID')}/kg | Cabai Rawit Merah: Rp ${Number(s.cabe_rawit_merah || 55000).toLocaleString('id-ID')}/kg`);
    } else {
      lines.push('• Beras Medium Rp 13.500-14.000/kg (Stabil), Minyakita Rp 16.000/L, Telur Rp 29.500-31.500/kg, Daging Sapi Rp 140.000/kg.');
    }
  } catch (err) {
    console.warn('[PANCI Core Context] Error:', err);
  }
  return lines.join('\n');
}

// ─── Live Perikanan Context (11 Tabel Resmi + Aturan Nelayan Andon Pangkalan Terate dari dkpp-info) ───
async function getPerikananContext(): Promise<string> {
  const lines: string[] = ['\n=== DATA RESMI 11 TABEL PROFIL PERIKANAN KOTA CILEGON 2025 (LIVE DATABASE) ==='];
  try {
    const [
      rekapRes, distribusiRes, prodTahunanRes, prodBulananRes,
      kubRes, koperasiRes, pangkalanRes, armadaRes, armadaJenisRes,
      anggaranRes, asuransiRes,
    ] = await Promise.allSettled([
      supabase.from('perikanan_rekap_potensi').select('uraian,jumlah,jumlah_teks,tahun').order('no'),
      supabase.from('perikanan_nelayan_distribusi').select('kecamatan,jumlah_kecamatan,kelurahan,jumlah_nelayan').order('id'),
      supabase.from('perikanan_produksi_tahunan').select('tahun,produksi_tangkap_ton,produksi_budidaya_ton,total_produksi_ton').order('tahun'),
      supabase.from('perikanan_produksi_bulanan').select('jenis_komoditas,total_produksi_kg').eq('tahun', 2025),
      supabase.from('perikanan_kub').select('no,nama_kub,alamat,ketua,no_telp,jumlah_anggota,status,kelas_kub,bantuan_pernah_diterima').order('no'),
      supabase.from('perikanan_koperasi').select('nama_koperasi,alamat,ketua,no_telp,jumlah_anggota'),
      supabase.from('perikanan_pangkalan_nelayan').select('kecamatan,nama_pangkalan,asal_nelayan,jumlah_nelayan').order('id'),
      supabase.from('perikanan_armada_kapal').select('kecamatan,nama_pangkalan,jumlah_perahu_kapal').order('id'),
      supabase.from('perikanan_armada_jenis_usaha').select('jenis_usaha_penangkapan,perahu_tanpa_motor,mesin_tempel_ketingting,kapal_motor_0_5gt,kapal_motor_5_10gt,kapal_30gt,total').order('id'),
      supabase.from('perikanan_anggaran_program').select('nama_program,anggaran_2024,anggaran_2025,anggaran_2026'),
      supabase.from('perikanan_asuransi_nelayan').select('tahun,jumlah_nelayan,sumber_anggaran,keterangan').order('tahun'),
    ]);

    if (rekapRes.status === 'fulfilled' && rekapRes.value.data?.length) {
      lines.push('\n[1. Rekap Potensi Kelautan & Perikanan 2025]:');
      for (const r of rekapRes.value.data) {
        lines.push(`• ${r.uraian} (${r.tahun}): ${r.jumlah !== null ? `${Number(r.jumlah).toLocaleString('id-ID')} ${r.jumlah_teks ?? ''}` : '-'}`);
      }
    }

    if (prodTahunanRes.status === 'fulfilled' && prodTahunanRes.value.data?.length) {
      lines.push('\n[2. Produksi Perikanan Tahunan 2020-2025 (Ton)]:');
      for (const r of prodTahunanRes.value.data) {
        lines.push(`• ${r.tahun}: Tangkap ${r.produksi_tangkap_ton} Ton | Budidaya ${r.produksi_budidaya_ton} Ton | Total ${r.total_produksi_ton} Ton`);
      }
    }

    if (prodBulananRes.status === 'fulfilled' && prodBulananRes.value.data?.length) {
      lines.push('\n[3. Produksi Perikanan Bulanan 2025]:');
      for (const r of prodBulananRes.value.data) {
        lines.push(`• ${r.jenis_komoditas}: ${Number(r.total_produksi_kg).toLocaleString('id-ID')} Kg`);
      }
    }

    if (distribusiRes.status === 'fulfilled' && distribusiRes.value.data?.length) {
      lines.push('\n[4. Distribusi 723 Nelayan per Kecamatan & Kelurahan]:');
      const grouped: Record<string, { total: number; kel: string[] }> = {};
      for (const r of distribusiRes.value.data) {
        if (!grouped[r.kecamatan]) grouped[r.kecamatan] = { total: r.jumlah_kecamatan ?? 0, kel: [] };
        if (r.jumlah_nelayan > 0) grouped[r.kecamatan].kel.push(`${r.kelurahan}: ${r.jumlah_nelayan}`);
      }
      for (const [kec, info] of Object.entries(grouped)) {
        lines.push(`• Kec. ${kec} (${info.total} nelayan): ${info.kel.join(', ') || '0'}`);
      }
    }

    lines.push('\n[5 & 6. Daftar 9 Pangkalan Nelayan & 410 Armada Perahu]:');
    lines.push('CATATAN RESMI JUMLAH PANGKALAN (9 vs 8): Secara fisik & kewilayahan terdapat 9 Pangkalan Nelayan di Kota Cilegon. Apabila pada sebagian dokumen administratif tertulis 8 pangkalan, hal itu karena nelayan di Pangkalan Terate (Kec. Cibeber) mendaratkan/menjual hasil tangkapannya ke luar wilayah Cilegon (berstatus Nelayan Andon), sehingga produksinya tidak dicatat oleh petugas pencatat Cilegon. Namun Pangkalan Terate (18 nelayan, 5 perahu) tetap sah bagian dari 9 pangkalan nelayan Kota Cilegon.');
    if (pangkalanRes.status === 'fulfilled' && pangkalanRes.value.data?.length) {
      for (const r of pangkalanRes.value.data) {
        lines.push(`• ${r.nama_pangkalan} (Kec. ${r.kecamatan}): ${r.jumlah_nelayan} nelayan — Asal: ${r.asal_nelayan ?? '-'}`);
      }
    }
    if (armadaRes.status === 'fulfilled' && armadaRes.value.data?.length) {
      lines.push('Armada per Pangkalan: ' + armadaRes.value.data.map((a) => `${a.nama_pangkalan}: ${a.jumlah_perahu_kapal} perahu`).join(' | '));
    }

    if (armadaJenisRes.status === 'fulfilled' && armadaJenisRes.value.data?.length) {
      lines.push('\n[7. Alat Tangkap & Jenis Armada]:');
      for (const r of armadaJenisRes.value.data) {
        if ((r.total ?? 0) > 0) {
          lines.push(`• ${r.jenis_usaha_penangkapan}: Total ${r.total} unit (Tanpa Motor: ${r.perahu_tanpa_motor}, Motor Tempel Ketingting: ${r.mesin_tempel_ketingting}, KM 0-5GT: ${r.kapal_motor_0_5gt}, KM 5-10GT: ${r.kapal_motor_5_10gt})`);
        }
      }
    }

    if (asuransiRes.status === 'fulfilled' && asuransiRes.value.data?.length) {
      lines.push('\n[8. Asuransi Perlindungan Nelayan (BPAN)]:');
      for (const r of asuransiRes.value.data) {
        if (r.jumlah_nelayan !== null) {
          lines.push(`• ${r.tahun}: ${r.jumlah_nelayan} nelayan (${r.sumber_anggaran ?? '-'} — ${r.keterangan ?? ''})`);
        }
      }
    }

    if (koperasiRes.status === 'fulfilled' && koperasiRes.value.data?.length) {
      lines.push('\n[9. 3 Koperasi Nelayan Resmi]:');
      for (const r of koperasiRes.value.data) {
        lines.push(`• ${r.nama_koperasi} | Ketua: ${r.ketua} (${r.no_telp ?? '-'}) | ${r.jumlah_anggota} anggota | Alamat: ${r.alamat}`);
      }
    }

    if (kubRes.status === 'fulfilled' && kubRes.value.data?.length) {
      lines.push(`\n[10. Kelompok Usaha Bersama (KUB) Nelayan — Total ${kubRes.value.data.length} KUB Aktif]:`);
      for (const r of kubRes.value.data) {
        lines.push(`• KUB #${r.no}: ${r.nama_kub} | Ketua: ${r.ketua} | ${r.jumlah_anggota} anggota | ${r.alamat}${r.bantuan_pernah_diterima ? ` | Bantuan: ${r.bantuan_pernah_diterima}` : ''}`);
      }
    }

    if (anggaranRes.status === 'fulfilled' && anggaranRes.value.data?.length) {
      lines.push('\n[11. Pagu Anggaran Program Urusan Perikanan]:');
      const fmt = (v: number | null) => (v !== null ? `Rp ${Number(v).toLocaleString('id-ID')}` : '-');
      for (const r of anggaranRes.value.data) {
        lines.push(`• ${r.nama_program}: 2024=${fmt(r.anggaran_2024)} | 2025=${fmt(r.anggaran_2025)} | 2026=${fmt(r.anggaran_2026)}`);
      }
    }
  } catch (err) {
    console.warn('[PANCI Perikanan Context] Error:', err);
  }
  return lines.join('\n');
}

// ─── Pertanian, Sawah GIS, Lengas Tanah ECMWF, Susenas & Neraca Pangan ──────
function buildAgricultureAndNeracaContext(ctx: Record<string, unknown>, includeDetailedKelurahan: boolean): string {
  const lines: string[] = [];

  lines.push('=== DATA LAHAN BAKU SAWAH (LBS GIS), PRODUKSI TANAMAN PANGAN, AGROKLIMAT ECMWF & NERACA PANGAN ===');
  lines.push('• Total Luas Lahan Baku Sawah (LBS): 1.151,97 Ha terbagi dalam 407 Petak Poligon GIS');
  lines.push('• Sebaran LBS per Kecamatan: Ciwandan 266,41 Ha (95 petak) | Jombang 229,40 Ha (41 petak) | Purwakarta 201,36 Ha | Cibeber 181,16 Ha (78 petak) | Citangkil 132,65 Ha (92 petak) | Gerogol 99,00 Ha (22 petak) | Cilegon 28,38 Ha (28 petak) | Pulomerak 13,60 Ha');
  lines.push('• Penduduk Kota Cilegon (DKB 2025): 480.378 Jiwa (Proyeksi 2026 @ +1,30%/thn: 486.623 Jiwa)');
  lines.push('• Time-Series Produksi Padi Sawah Cilegon (GKG):');
  lines.push('  - 2017: Panen 2.397 Ha | 15.190 Ton GKG (63,4 Ku/Ha - Puncak Historis)');
  lines.push('  - 2021: Panen 2.039 Ha | 11.687 Ton GKG (57,3 Ku/Ha)');
  lines.push('  - 2022: Panen 1.927 Ha | 11.401 Ton GKG (59,2 Ku/Ha)');
  lines.push('  - 2023: Panen 1.726 Ha | 9.852 Ton GKG (57,1 Ku/Ha - Dampak El Niño)');
  lines.push('  - 2024: Panen 1.808 Ha | 10.461 Ton GKG (57,8 Ku/Ha)');
  lines.push('  - 2025: Panen 2.428,32 Ha | 13.772,30 Ton GKG (56,72 Ku/Ha - Pemulihan IP Panen)');
  lines.push('• Palawija & Buffer Karbohidrat Lokal (2025): Ubi Kayu/Singkong 2.007,60 Ton dari 167,3 Ha (Kemandirian 96,97% hampir swasembada!) | Ubi Jalar 4.415,10 Ton (Surplus) | Kacang Tanah 928,20 Ton | Jagung 143,56 Ton.');
  lines.push('• Telemetri Lengas Tanah Satelit ECMWF ERA5-Land (407 Petak Sawah, Resolusi Mikro 10x10m):');
  lines.push('  - Kedalaman Lapisan Permukaan (0–7 cm): rata-rata 0,22–0,30 m³/m³ | Zona Perakaran (7–28 cm): 0,24–0,34 m³/m³ | ET0: 3,8–4,5 mm/hari.');
  lines.push('  - Klasifikasi: > 0,32 m³/m³ [Jenuh/Biru] | 0,24–0,32 m³/m³ [Optimal Kapasitas Lapang/Hijau] | 0,18–0,24 m³/m³ [Waspada/Kuning] | < 0,18 m³/m³ [Defisit Kritis/Merah - Pompanisasi Darurat].');
  lines.push('• Neraca Konsumsi Susenas 2023 vs Produksi Lokal (Basis 480.378 Jiwa):');
  lines.push('  - BERAS: Konsumsi 1.296,52 g/pekan = 185,22 g/hari = 67,60 kg/kap/thn -> Kebutuhan Kota 32.475,55 Ton/thn (88,97 Ton/hari). Produksi lokal 13.772,30 Ton GKG × rendemen 64,02% = 8.816,83 Ton beras -> Kemandirian Lokal 27,15%, Pasokan Luar Daerah 23.658,72 Ton (72,85%).');
  lines.push('  - IKAN LAUT: Konsumsi 13,24 kg/kap/thn (6.229,82 Ton/thn) vs Produksi Tangkap 238,86 Ton (~3,8%).');
  lines.push('  - IKAN AIR TAWAR: Konsumsi 9,91 kg/kap/thn (4.660,10 Ton/thn) vs Produksi Budidaya 361,46 Ton (~7,8%).');
  lines.push('  - DAGING AYAM RAS: 8,01 kg/kap/thn (3.765,95 Ton/thn) | DAGING SAPI: 0,67 kg/kap/thn (313,54 Ton/thn) | TELUR AYAM: 6,05 kg/kap/thn (2.846 Ton/thn) | MINYAK GORENG: 11,47 L/kap/thn | GULA PASIR: 6,88 kg/kap/thn | CABAI: 2,60 kg/kap/thn (1.249 Ton) | BAWANG MERAH: 2,41 kg/kap/thn (1.158 Ton).');
  lines.push('• Rekap Arsip Sasaran 3.949 KK ("Data petani nelayan 3949 KK 2020.xlsx"): Petani 1.759 KK | Nelayan 297 KK | Pembudidaya Ikan 62 KK | Peternak 15 KK (Terbanyak di Kel. Kotasari Kec. Grogol 8 KK, Gerem 3 KK, Grogol 3 KK, Lebak Denok 1 KK).');

  if (includeDetailedKelurahan) {
    lines.push('\n• RINCIAN LUAS SAWAH BAKU & PENDUDUK 43 KELURAHAN:');
    for (const [kelName, d] of Object.entries(BASELINE_KELURAHAN_DATA)) {
      const sawah = KELURAHAN_SAWAH[kelName] ?? d.luasSawahHa ?? 0;
      lines.push(`  - Kel. ${kelName} (Kec. ${d.kecamatan}): Sawah ${sawah} Ha | Penduduk ${(d.penduduk || 0).toLocaleString('id-ID')} jiwa`);
    }
  }

  // Ringkasan Kamera Cerdas jika ditanyakan pasokan beras / observasi lapangan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kameraRaw = (ctx['kamera_cerdas_observasi'] as any)?.data;
  if (Array.isArray(kameraRaw) && kameraRaw.length > 0 && includeDetailedKelurahan) {
    const berasSurveys = kameraRaw.filter((k) => k.mode === 'pasokan_beras');
    const panganSurveys = kameraRaw.filter((k) => k.mode === 'tanaman_pangan');
    const totalStokBerasKg = berasSurveys.reduce((acc, curr) => acc + (Number(curr.estimasi_pasokan_kg) || 0), 0);
    lines.push(`\n• Observasi Lapangan Kamera Cerdas GPS: ${kameraRaw.length} titik (${berasSurveys.length} titik pasokan beras total ${(totalStokBerasKg / 1000).toFixed(2)} Ton; ${panganSurveys.length} titik tanaman pangan lokal).`);
  }

  return lines.join('\n');
}

// ─── Rule-Based Analytical Fallback (Adopsi penuh dkpp-info saat API Gemini gangguan) ───
function generateDomainFallbackResponse(userQuery: string): string {
  const q = userQuery.toLowerCase();

  // 1. Identitas Pengembang / Admin (Sesuai dkpp-info)
  if (
    q.includes('siapa admin') ||
    q.includes('siapa administrator') ||
    q.includes('siapa yang buat') ||
    q.includes('siapa yang bikin') ||
    q.includes('siapa pembuat') ||
    q.includes('siapa pengembang') ||
    q.includes('siapa developer') ||
    q.includes('tentang pengembang')
  ) {
    return `Platform **PANCI (Platform Analisis Pangan Kota Cilegon)** dikembangkan dan dikelola secara mandiri oleh seorang **Analis Ketahanan Pangan Ahli Muda** pada **Dinas Ketahanan Pangan dan Pertanian (DKPP) Kota Cilegon** sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan pertanian daerah.\n\nPengembangan dilakukan secara bertahap dengan pendekatan inovatif yang mengintegrasikan dashboard analitik, visualisasi spasial GIS, pemodelan peringatan dini, dan teknologi kecerdasan buatan guna mendukung tata kelola pangan yang lebih efektif dan adaptif.`;
  }

  // 2. Pertanyaan Tantangan, Isu Strategis, Rekomendasi & Neraca Kemandirian (Anti-Template KPI!)
  if (isAnalyticalOrStrategicQuery(q)) {
    return `### 🔍 Analisis Strategis & Tantangan Ketahanan Pangan Kota Cilegon

Sebagai kota industri, pelabuhan, dan jasa dengan populasi **480.378 jiwa (DKB 2025)**, Kota Cilegon memiliki capaian ketahanan pangan makro yang kuat (**IKP 80,12 — Sangat Tahan**, **PoU 2,78%**), namun menghadapi **4 tantangan struktural utama** yang menjadi fokus intervensi kebijakan DKPP:

---

### 1. Ketergantungan Tinggi pada Pasokan Pangan Luar Daerah (Aspek Kemandirian vs Ketahanan)
* **Beras:** Produksi padi lokal tahun 2025 mencapai **13.772,30 Ton GKG** (setara **8.816,83 Ton beras bersih** dengan rendemen 64,02%), sedangkan kebutuhan konsumsi aktual masyarakat mencapai **32.475,55 Ton/tahun**. Artinya, **tingkat kemandirian beras lokal baru 27,15%**, dengan **defisit pasokan 23.658,72 Ton/tahun (72,85%)** yang bergantung pada kelancaran distribusi antardaerah (Jawa Barat, Jawa Tengah, Lampung, dan Bulog).
* **Protein Perikanan & Hewani:** Kemandirian produksi lokal ikan laut tangkap sekitar **3,8%** (238,86 Ton dari kebutuhan 6.229,82 Ton) dan ikan air tawar budidaya **7,8%** (361,46 Ton dari kebutuhan 4.660,10 Ton).
* **Hortikultura Volatil (Cabai & Bawang):** Sangat rentan terhadap transmisi inflasi musiman dari daerah sentra produksi ketika terjadi gangguan cuaca.

### 2. Tekanan Alih Fungsi Lahan Baku Sawah (LBS)
* Luas Baku Sawah (LBS) Kota Cilegon tercatat **1.151,97 Ha (407 petak poligon GIS)** yang terkonsentrasi di **Ciwandan (266,41 Ha)**, **Jombang (229,40 Ha)**, **Purwakarta (201,36 Ha)**, dan **Cibeber (181,16 Ha)**, sementara Pulomerak hanya tersisa **13,60 Ha**.
* Ekspansi kawasan industri dan permukiman menuntut perlindungan ketat **LP2B (Lahan Pertanian Pangan Berkelanjutan)** serta peningkatan Indeks Pertanaman (IP) melalui telemetri irigasi lengas tanah.

### 3. Kantong Kerentanan Mikro pada Kelurahan Prioritas Pengawasan FSVA & SKPG
* Walaupun tidak ada kelurahan berstatus Prioritas 1–2 (Sangat Rentan), pemetaan FSVA menunjukkan perlunya perhatian khusus pada kelurahan prioritas intervensi terpadu karena faktor akses air bersih, kemiskinan mikro, atau prevalensi balita gizi kurang (**946 balita gizi kurang / 3,47%** dan **232 gizi sangat kurang / 0,85%** dari 27.286 balita dipantau).

---

### 💡 Rekomendasi Kebijakan Konkret DKPP Kota Cilegon
1. **Stabilisasi Pasokan & Kerja Sama Antar Daerah (KAD):** Memperkuat kontrak pasokan beras, cabai, bawang merah, dan telur dengan daerah produsen, disertai operasi **Gerakan Pangan Murah (GPM)** berbasis sinyal *Early Warning System (EWS)*.
2. **Penguatan Cadangan Pangan Pemerintah Daerah (CPPD):** Menjaga stok penyangga beras CPPD di Gudang Bulog di atas target RPJMD (**115,8 Ton**) untuk respons cepat gejolak harga dan kerawanan pascabencana.
3. **Intensifikasi Pertanian Perkotaan & Pemberdayaan 84 KWT:** Optimalisasi pekarangan lestari (P2L) oleh **84 Kelompok Wanita Tani (KWT)** untuk meredam gejolak harga cabai dan sayuran skala rumah tangga, ditambah diversifikasi pangan lokal berbasis **ubi kayu/singkong (kemandirian 96,97%)** dan **pohon sukun**.
4. **Perlindungan LP2B & Presisi Irigasi Satelit:** Penetapan kawasan LP2B pada sentra sawah produktif serta pemanfaatan telemetri lengas tanah **ECMWF ERA5-Land** untuk mitigasi kekeringan.`;
  }

  // 3. KWT (84 KWT Tergeokode)
  if (q.includes('kwt') || q.includes('wanita tani')) {
    const kwtCtx = buildKwtPromptContext(userQuery);
    if (kwtCtx) return kwtCtx.replace(/### \[.*?\]\n?/g, '').trim();
  }

  // 4. Perikanan (termasuk penjelasan Pangkalan Terate 9 vs 8 Nelayan Andon)
  if (isPerikananQuery(q)) {
    return `### 🐟 Profil Perikanan Tangkap & Budidaya Kota Cilegon (2025)

* **Total Nelayan:** **723 Orang** (Pulomerak 306, Grogol 133, Citangkil 120, Ciwandan 108, Cibeber 20, Purwakarta 19, Jombang 10, Cilegon 7)
* **Armada & Alat Tangkap:** **410 Perahu/Kapal** & **425 Alat Tangkap** (422 Pancing, 3 Bagan Tancap)
* **Kelembagaan & Perlindungan:** **58 KUB Aktif**, **3 Koperasi Nelayan**, **28 POKDAKAN** (395 pembudidaya, kolam 37.461 m²), **17 POKLASHAR**, serta **652 Nelayan terlindungi Asuransi BPAN 2025**
* **Realisasi Produksi Ikan 2025:** **600,319 Ton** (Perikanan Budidaya **361,455 Ton** + Perikanan Tangkap Laut **238,864 Ton**)

#### Daftar 9 Pangkalan Nelayan Resmi Kota Cilegon:
1. **Tanjung Peni** (Citangkil): 191 Nelayan | 102 Perahu
2. **Suralaya** (Pulomerak): 144 Nelayan | 67 Perahu
3. **Lelean** (Grogol): 110 Nelayan | 54 Perahu
4. **Medaksa Seberang** (Pulomerak): 76 Nelayan | 52 Perahu
5. **Tanjung Leneng** (Ciwandan): 72 Nelayan | 64 Perahu
6. **Pantai Mabak** (Pulomerak): 65 Nelayan | 10 Perahu
7. **Lebak Gede** (Pulomerak): 24 Nelayan | 16 Perahu
8. **Pangkalan Terate** (Cibeber): 18 Nelayan | 5 Perahu
9. **Kaltek** (Pulomerak): 15 Nelayan | 40 Perahu

> *Catatan Pangkalan Terate (9 vs 8 Pangkalan):* Secara kewilayahan terdapat **9 Pangkalan Nelayan**. Apabila pada sebagian rekapitulasi tercatat 8 pangkalan, hal tersebut karena nelayan di **Pangkalan Terate** menjual hasil tangkapannya ke luar wilayah Cilegon (**Nelayan Andon**) sehingga tidak tercatat di TPI lokal Cilegon.`;
  }

  // 5. Sawah & Lengas Tanah ECMWF
  if (q.includes('sawah') || q.includes('lengas') || q.includes('ecmwf') || q.includes('agroklimat')) {
    return `### 🌾 Luas Baku Sawah (LBS) & Telemetri Lengas Tanah ECMWF Kota Cilegon

* **Total Luas Baku Sawah (LBS):** **1.151,97 Ha** dalam **407 petak poligon GIS**
* **Realisasi Produksi Padi 2025:** **13.772,30 Ton GKG** dari luas panen **2.428,32 Ha** (Produktivitas **56,72 Ku/Ha**)
* **Sebaran Terluas:** Ciwandan (**266,41 Ha**), Jombang (**229,40 Ha**), Purwakarta (**201,36 Ha**), Cibeber (**181,16 Ha**), Citangkil (**132,65 Ha**), Gerogol (**99,00 Ha**), Cilegon (**28,38 Ha**), dan Pulomerak (**13,60 Ha**).

| Status Agroklimat ECMWF | Rentang Lengas Tanah | Rekomendasi Manajemen Irigasi |
| :--- | :--- | :--- |
| **Jenuh Air (Biru)** | > 0,32 m³/m³ | Optimal untuk olah tanah & awal tanam padi |
| **Kapasitas Lapang (Hijau)** | 0,24 – 0,32 m³/m³ | Kondisi prima pertumbuhan vegetatif & generatif |
| **Waspada (Kuning)** | 0,18 – 0,24 m³/m³ | Jadwalkan pembukaan pintu air suplesi tersier |
| **Defisit Kritis (Merah)** | < 0,18 m³/m³ | Siagakan pompanisasi darurat cegah stres kering |`;
  }

  // 6. Renstra DKPP
  if (isRenstraQuery(q)) {
    return `### 🎯 Ringkasan IKU & Program Renstra DKPP Kota Cilegon (2025–2030)

* **7 Indikator Kinerja Utama (IKU) DKPP:**
  1. **Kontribusi Pertanian terhadap PDRB:** Baseline 0,2178% → Target 2026: **0,217%**
  2. **Prevalensi Ketidakcukupan Konsumsi Pangan (PoU):** Baseline 1,96% → Target 2026: **1,90%** → Target 2030: **1,78%**
  3. **Indeks Reformasi Birokrasi PD:** Baseline 44 poin → Target 2026: **70 poin** → Target 2030: **72 poin**
  4. **Produksi Perikanan Tangkap:** Target 2026: **237 Ton** → Target 2030: **241 Ton**
  5. **Produksi Perikanan Budidaya:** Target 2026: **360 Ton** → Target 2030: **365 Ton**
  6. **Pertumbuhan Produksi Tanaman Pangan:** **+1% per tahun**
  7. **Pertumbuhan Produksi Hortikultura:** **+1% per tahun**`;
  }

  return `### 🏛️ PANCI — Food Security Intelligence Kota Cilegon (DKPP)

* **Indeks Ketahanan Pangan (IKP):** **80,12** (*Sangat Tahan*, di atas rata-rata Provinsi Banten 79,25)
* **PoU & PPH Konsumsi:** PoU **2,78%** (Nasional 7,89%) | Skor PPH **90,9 poin** (Standar Nasional 90,0)
* **Status SKPG & Gizi Balita:** **AMAN (Hijau)** di seluruh 8 kecamatan (91,78% gizi normal dari 27.286 balita)
* **Lahan Baku Sawah & Produksi:** **1.151,97 Ha** (407 petak GIS) | Produksi Padi **13.772,30 Ton GKG** (2025)
* **Perikanan & Pemberdayaan:** **723 Nelayan**, **600,32 Ton** produksi ikan, dan **84 KWT aktif** se-Kota Cilegon

Silakan ajukan pertanyaan analitis maupun data spesifik seperti *tantangan ketahanan pangan*, *neraca beras*, *panel harga harian SAGON*, *peramalan ML*, *profil 84 KWT*, atau *program Renstra DKPP 2025–2030*.`;
}

// ─── Spatial Filter Natural Language ────────────────────────────────────────
interface SpatialFilterResult {
  filteredWilayah: string[];
  filterActive: boolean;
  filterLabel: string;
}

function evaluateSpatialFilter(query: string): SpatialFilterResult | null {
  const q = query.toLowerCase();
  const hasFilterKeyword =
    q.includes('tampilkan hanya') ||
    q.includes('filter') ||
    (q.includes('kelurahan yang') && (q.includes('sawah') || q.includes('stunting') || q.includes('penduduk')));
  if (!hasFilterKeyword) return null;

  let minSawah: number | null = null;
  let maxSawah: number | null = null;
  let minStunting: number | null = null;
  let maxStunting: number | null = null;
  let minPenduduk: number | null = null;

  const sAbove = q.match(/sawah\s*(?:di\s*atas|lebih\s*dari|>|>=)\s*(\d+(?:\.\d+)?)/i);
  if (sAbove) minSawah = parseFloat(sAbove[1]);
  const sBelow = q.match(/sawah\s*(?:di\s*bawah|kurang\s*dari|<|<=)\s*(\d+(?:\.\d+)?)/i);
  if (sBelow) maxSawah = parseFloat(sBelow[1]);
  const stAbove = q.match(/stunting(?:nya)?\s*(?:di\s*atas|lebih\s*dari|>|>=)\s*(\d+(?:\.\d+)?)/i);
  if (stAbove) minStunting = parseFloat(stAbove[1]);
  const stBelow = q.match(/stunting(?:nya)?\s*(?:di\s*bawah|kurang\s*dari|<|<=)\s*(\d+(?:\.\d+)?)/i);
  if (stBelow) maxStunting = parseFloat(stBelow[1]);
  const pAbove = q.match(/penduduk(?:nya)?\s*(?:di\s*atas|lebih\s*dari|>|>=)\s*(\d+)/i);
  if (pAbove) minPenduduk = parseInt(pAbove[1], 10);

  if (minSawah !== null || maxSawah !== null || minStunting !== null || maxStunting !== null || minPenduduk !== null) {
    const matched: string[] = [];
    for (const [name, d] of Object.entries(BASELINE_KELURAHAN_DATA)) {
      let ok = true;
      if (minSawah !== null && (d.luasSawahHa || 0) <= minSawah) ok = false;
      if (maxSawah !== null && (d.luasSawahHa || 0) >= maxSawah) ok = false;
      if (minStunting !== null && (d.stuntingPct || 0) <= minStunting) ok = false;
      if (maxStunting !== null && (d.stuntingPct || 0) >= maxStunting) ok = false;
      if (minPenduduk !== null && (d.penduduk || 0) <= minPenduduk) ok = false;
      if (ok) matched.push(name);
    }

    const labels: string[] = [];
    if (minSawah !== null) labels.push(`Sawah > ${minSawah} Ha`);
    if (maxSawah !== null) labels.push(`Sawah < ${maxSawah} Ha`);
    if (minStunting !== null) labels.push(`Stunting > ${minStunting}%`);
    if (maxStunting !== null) labels.push(`Stunting < ${maxStunting}%`);
    if (minPenduduk !== null) labels.push(`Penduduk > ${minPenduduk.toLocaleString('id-ID')}`);

    return {
      filteredWilayah: matched,
      filterActive: true,
      filterLabel: labels.join(' & ') || 'Filter Kriteria Spasial',
    };
  }
  return null;
}

// ─── Multi-Turn History Builder (10 Putaran ala dkpp-info) ──────────────────
type HistoryMessage = { role: 'user' | 'model' | 'assistant'; text?: string; content?: string };

function buildGeminiContents(
  history: HistoryMessage[],
  userMessage: string,
  contextualQuery: string,
  isThinkingMode: boolean,
  imageData?: { data: string; mimeType: string }
) {
  const contents: Array<{ role: string; parts: unknown[] }> = [];

  // Ambil 10 pesan terakhir (identik dengan dkpp-info) agar konteks percakapan multi-turn terjaga utuh
  const recentHistory = history.slice(-10);
  for (const h of recentHistory) {
    const msgText = (h.text || h.content || '').trim();
    if (!msgText) continue;
    const isModel = h.role === 'model' || h.role === 'assistant';
    const trimmedText = isModel && msgText.length > 750
      ? msgText.substring(0, 750) + '... [ringkasan konteks sebelumnya]'
      : msgText;

    contents.push({
      role: isModel ? 'model' : 'user',
      parts: [{ text: trimmedText }],
    });
  }

  let effectivePrompt = userMessage || 'Analisis kondisi ketahanan pangan atau foto terlampir di Kota Cilegon.';
  if (contextualQuery && contextualQuery.toLowerCase() !== userMessage.trim().toLowerCase()) {
    effectivePrompt = `${userMessage}\n\n[Konteks Maksud Hasil Rekonstruksi Multi-Turn: "${contextualQuery}"]`;
  }
  if (isThinkingMode) {
    effectivePrompt = `[MODE BERPIKIR MENDALAM AKTIF: Uraikan struktur logika, perbandingan indikator, metodologi perhitungan bertahap, dan implikasi kebijakan secara komprehensif]\n${effectivePrompt}`;
  }

  const userParts: unknown[] = [{ text: effectivePrompt }];
  if (imageData?.data) {
    userParts.push({
      inline_data: {
        mime_type: imageData.mimeType || 'image/jpeg',
        data: imageData.data,
      },
    });
  }

  contents.push({
    role: 'user',
    parts: userParts,
  });

  return contents;
}

// ============================================================
// POST /api/ai-intelligence
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUserMessage: string = body?.message || '';
    const history: HistoryMessage[] = Array.isArray(body?.history) ? body.history : [];
    const imageData: { data: string; mimeType: string } | undefined = body?.imageData;
    const isThinkingMode: boolean =
      Boolean(body?.thinkingMode) || rawUserMessage.startsWith('[MODE BERPIKIR MENDALAM');

    // Bersihkan prefix lama jika dikirim dari client versi sebelumnya
    const cleanUserMessage = rawUserMessage
      .replace(/^\[MODE BERPIKIR MENDALAM[^\]]*\]\s*/i, '')
      .trim();

    if (!cleanUserMessage && !imageData?.data) {
      return NextResponse.json({ error: 'Pesan atau foto tidak boleh kosong' }, { status: 400 });
    }

    // 1. Multi-Turn Contextual Query Reconstruction (Algoritma dkpp-info)
    const contextualQuery = reconstructContextualQuery(cleanUserMessage, history);
    const activeQuery = contextualQuery || cleanUserMessage;
    const normMsg = activeQuery.toLowerCase();
    const isAnalytical = isAnalyticalOrStrategicQuery(normMsg);

    // 2. Interactive Live Panel Intent Routing (Adopsi dkpp-info/src/app/api/chat/route.ts)
    //    Hanya diaktifkan jika BUKAN pertanyaan analitik/strategis & tanpa lampiran foto Vision!
    if (!imageData?.data && !isThinkingMode) {
      // 2a. Panel Harga Pangan Strategis Harian (SAGON Live)
      const isSagonHargaRequest =
        normMsg.includes('harga pangan strategis') ||
        normMsg.includes('panel harga') ||
        normMsg.includes('sagon live') ||
        normMsg.includes('harga sagon') ||
        normMsg.includes('harga hari ini') ||
        normMsg.includes('harga pangan hari ini') ||
        normMsg.includes('harga komoditas hari ini') ||
        normMsg.includes('harga pangan terkini') ||
        normMsg.includes('harga sembako hari ini') ||
        normMsg.includes('tabel harga pangan') ||
        normMsg.includes('tabel harga komoditas');

      if (
        isSagonHargaRequest &&
        !isAnalytical &&
        !normMsg.includes('forecast') &&
        !normMsg.includes('peramalan') &&
        !normMsg.includes('proyeksi') &&
        !normMsg.includes('prediksi')
      ) {
        const sagonData = await getLiveSagonPanelData();
        const waspadaItems = sagonData.items.filter((i) => i.status === 'WASPADA');
        const amanItems = sagonData.items.filter((i) => i.status === 'AMAN');
        const summaryText =
          `Berikut **Panel Harga Pangan Strategis (SAGON LIVE)** rata-rata 3 pasar tradisional se-Kota Cilegon (*Pasar Baru Kranggot, Pasar Blok F, dan Pasar Baru Merak*) per tanggal **${sagonData.formattedDate}**:\n\n` +
          `### 📊 Status & Ringkasan Pergerakan YoY\n` +
          `• ⚠️ **Kategori Waspada (Kenaikan > 5% YoY):** ${waspadaItems.map((i) => `**${i.name}** (Rp ${Math.round(i.curr).toLocaleString('id-ID')}, ${i.changeText})`).join(', ') || 'Seluruh komoditas stabil'}\n` +
          `• 🟢 **Kategori Aman / Terkendali:** ${amanItems.slice(0, 6).map((i) => `**${i.name}** (Rp ${Math.round(i.curr).toLocaleString('id-ID')})`).join(', ')}${amanItems.length > 6 ? `, dan ${amanItems.length - 6} komoditas lainnya` : ''}\n\n` +
          `*Gunakan tombol navigasi tanggal 📅 pada panel di bawah untuk meninjau riwayat arsip harian atau unduh format XLSX.*`;

        return NextResponse.json({
          success: true,
          type: 'harga_sagon_panel',
          text: summaryText,
          harga_sagon_panel: sagonData,
          tool_calls: [{ id: `tool-sagon-${Date.now()}`, name: 'harga_sagon_panel', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: 'harga_sagon_harian (SAGON Cilegon)', detail: sagonData.formattedDate }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2b. Tabel Peramalan Harga Pangan (ML Forecasting)
      const isForecastTableRequest =
        normMsg.includes('tabel peramalan') ||
        normMsg.includes('tabel forecast') ||
        normMsg.includes('ml forecasting') ||
        normMsg.includes('peramalan harga') ||
        normMsg.includes('prediksi harga') ||
        normMsg.includes('proyeksi harga') ||
        normMsg.includes('ramalan harga');

      if (isForecastTableRequest && !isAnalytical) {
        const forecastData = await getLiveForecastTableData();
        const upItems = forecastData.items.filter((i) => i.trend === 'up');
        const downItems = forecastData.items.filter((i) => i.trend === 'down');
        const stableItems = forecastData.items.filter((i) => i.trend === 'stable');

        const summaryText =
          `Berikut tabel **Peramalan Harga Pangan (ML Forecasting)** proyeksi +1 bulan (**${forecastData.t1Month}**) dan +3 bulan (**${forecastData.t3Month}**) Kota Cilegon:\n\n` +
          `### 📊 Ringkasan Arah Tren (+1 Bulan)\n` +
          `• 🔴 **Tren Naik:** ${upItems.map((i) => `**${i.name}** (+${i.changePct}%)`).join(', ') || 'Tidak ada'}\n` +
          `• 🟢 **Tren Turun:** ${downItems.map((i) => `**${i.name}** (${i.changePct}%)`).join(', ') || 'Tidak ada'}\n` +
          `• 🟡 **Tren Stabil:** ${stableItems.map((i) => `**${i.name}** (${i.changePct > 0 ? '+' : ''}${i.changePct}%)`).join(', ') || 'Tidak ada'}\n\n` +
          `*Klik baris komoditas pada tabel di bawah untuk meminta analisis faktor pendorong EWS secara mendalam.*`;

        return NextResponse.json({
          success: true,
          type: 'forecast_table',
          text: summaryText,
          forecast_table: forecastData,
          tool_calls: [{ id: `tool-forecast-${Date.now()}`, name: 'forecast_table', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: 'forecast_result (Champion-Challenger ML)', detail: forecastData.t1Month }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2c. Panel IKP & PoU 5 Tahun
      const isIkpPouRequest =
        (normMsg.includes('ikp') || normMsg.includes('pou') || normMsg.includes('indeks ketahanan pangan') || normMsg.includes('prevalensi ketidakcukupan')) &&
        !normMsg.includes('fsva') &&
        !normMsg.includes('skpg') &&
        !isAnalytical;

      if (isIkpPouRequest) {
        const ikpPouData = await getLiveIkpPouData();
        const latestIkp = ikpPouData.ikp[ikpPouData.ikp.length - 1];
        const latestPou = ikpPouData.pou[ikpPouData.pou.length - 1];
        const summaryText =
          `Berikut visualisasi live **Indeks Ketahanan Pangan (IKP)** dan **Prevalence of Undernourishment (PoU)** Kota Cilegon 5 tahun terakhir:\n\n` +
          `• 🏆 **IKP (${latestIkp?.year || '2024'}):** Skor **${latestIkp?.cilegon || 80.12}** (*Sangat Tahan Pangan*) — melampaui rata-rata Provinsi Banten (${latestIkp?.provinsi || 79.25}).\n` +
          `• 📉 **PoU (${latestPou?.year || '2025'}):** Sebesar **${latestPou?.cilegon || 2.78}%** — jauh lebih terkendali dibandingkan rata-rata Nasional (${latestPou?.nasional || 7.89}%).`;

        return NextResponse.json({
          success: true,
          type: 'ikp_pou_panel',
          text: summaryText,
          ikp_pou_panel: ikpPouData,
          tool_calls: [{ id: `tool-ikp-pou-${Date.now()}`, name: 'ikp_pou_panel', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: 'ikp_data & pou_data', detail: 'Time-Series 5 Tahun' }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2d. Panel 7 Indikator Ketahanan Pangan
      const isIndikatorRequest =
        (normMsg.includes('7 indikator') ||
          normMsg.includes('capaian indikator ketahanan pangan') ||
          normMsg.includes('cv beras') ||
          normMsg.includes('pola pangan harapan') ||
          normMsg.includes('konsumsi energi') ||
          normMsg.includes('konsumsi protein') ||
          normMsg.includes('ketersediaan energi') ||
          normMsg.includes('ketersediaan protein')) &&
        !isAnalytical;

      if (isIndikatorRequest) {
        const indikatorData = await getLiveIndikatorKetapangData();
        const summaryText =
          `Berikut panel interaktif **Capaian 7 Indikator Utama Ketahanan Pangan Kota Cilegon vs Standar Nasional** dalam 5 tahun terakhir (*Ketersediaan Energi, CV Beras, PPH, Konsumsi Protein & Energi, Ketersediaan Protein, serta CPPD*). Pilih tab indikator di bawah untuk mengganti grafik:`;

        return NextResponse.json({
          success: true,
          type: 'indikator_ketapang_panel',
          text: summaryText,
          indikator_ketapang_panel: indikatorData,
          tool_calls: [{ id: `tool-indikator-${Date.now()}`, name: 'indikator_ketapang_panel', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: '7 Tabel Indikator Ketahanan Pangan PANCI' }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2e. Panel Early Warning System (EWS)
      const isEwsRequest =
        (normMsg.includes('early warning system') ||
          normMsg.includes('panel ews') ||
          normMsg.includes('status ews') ||
          normMsg.includes('peringatan dini pangan') ||
          normMsg.includes('anomali harga')) &&
        !isAnalytical;

      if (isEwsRequest) {
        const ewsData = await getLiveEwsData();
        const summaryText =
          `Berikut status aktif **Early Warning System (EWS)** komoditas pangan strategis Kota Cilegon. Terdeteksi **${ewsData.warnings.length} komoditas** dalam pemantauan khusus volatilitas & proyeksi 3 bulan ke depan:`;

        return NextResponse.json({
          success: true,
          type: 'ews_panel',
          text: summaryText,
          ews_panel: ewsData,
          tool_calls: [{ id: `tool-ews-${Date.now()}`, name: 'ews_panel', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: 'Integrated EWS PANCI (forecast_result)' }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2f. Panel Produksi GKG 5 Tahun
      const isGkgRequest =
        (normMsg.includes('gkg') ||
          normMsg.includes('gabah kering giling') ||
          normMsg.includes('panel produksi padi') ||
          normMsg.includes('panel produksi beras')) &&
        !normMsg.includes('trendline') &&
        !isAnalytical;

      if (isGkgRequest) {
        const gkgData = await getLiveGkgData();
        const summaryText =
          `Berikut data dan grafik **Produksi Gabah Kering Giling (GKG) & Konversi Beras** Kota Cilegon 5 tahun terakhir (**${gkgData.latestYear}: ${gkgData.totalGkgLatest.toLocaleString('id-ID')} Ton GKG** / **${gkgData.totalBerasLatest.toLocaleString('id-ID')} Ton Beras**):`;

        return NextResponse.json({
          success: true,
          type: 'gkg_panel',
          text: summaryText,
          gkg_panel: gkgData,
          tool_calls: [{ id: `tool-gkg-${Date.now()}`, name: 'gkg_panel', status: 'completed' }],
          sources: [{ type: 'LIVE DATABASE', title: 'produksi_beras_data (DKPP Cilegon)' }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: null,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }

      // 2g. Direct Thematic GIS Map Card
      const isDirectMapCardRequest =
        !isPerikananQuery(activeQuery) &&
        (normMsg === 'peta tematik' ||
          normMsg === 'peta fsva' ||
          normMsg === 'peta skpg' ||
          normMsg === 'kontrol peta tematik');

      if (isDirectMapCardRequest) {
        const mapMode = normMsg.includes('skpg') ? 'skpg' : 'fsva';
        const mapAction = {
          type: 'HIGHLIGHT' as const,
          lat: -6.01,
          lng: 106.02,
          zoom: 12.5,
          layers_to_enable: ['kelurahan'],
          thematic_mode: mapMode as 'fsva' | 'skpg',
        };
        return NextResponse.json({
          success: true,
          type: 'map_card',
          text: `Berikut kontrol cepat **Peta Tematik Spasial GIS Kota Cilegon** (*FSVA, SKPG, IKP Kelurahan, dan Surveilans Gizi Balita*). Pilih layer untuk memperbarui tampilan peta:`,
          tool_calls: [{ id: `tool-map-${Date.now()}`, name: 'map_thematic_gis', status: 'completed' }],
          sources: [{ type: 'GIS SPATIAL', title: 'Peta Poligon 43 Kelurahan Kota Cilegon' }],
          wilayah_highlight: [],
          matched_pins: [],
          map_action: mapAction,
          referenced_docs: [],
          model: 'panci-live-tool',
        });
      }
    }

    // 3. Conditional & TTL-Cached Context Aggregation (Hemat Supabase Egress!)
    const trivial = isTrivialQuery(activeQuery) && !imageData?.data;
    const needPerikanan = !trivial && isPerikananQuery(activeQuery);
    const needRenstra = !trivial && isRenstraQuery(activeQuery);
    const needDetailedKelurahan =
      !trivial &&
      (/kelurahan|kecamatan|sawah|penduduk|kamera cerdas|pasokan beras|peternak|fsva|skpg|stunting/.test(normMsg) ||
        Object.keys(KELURAHAN_COORDINATES).some((k) => normMsg.includes(k.toLowerCase())));

    const [spCtx, coreDbNarrative, perikananNarrative, renstraData, matchedChunks] = await Promise.all([
      getCached('sp_ctx', TTL_5M, getSpContextData).catch(() => ({} as Record<string, unknown>)),
      trivial ? Promise.resolve('') : getCached('core_db_ctx', TTL_5M, getLiveCoreDatabaseContext).catch(() => ''),
      needPerikanan ? getCached('perikanan_ctx', TTL_10M, getPerikananContext).catch(() => '') : Promise.resolve(''),
      needRenstra
        ? getCached(`renstra_${normMsg.slice(0, 32)}`, TTL_10M, () => fetchRenstraData(activeQuery)).catch(() => undefined)
        : Promise.resolve(undefined),
      trivial ? Promise.resolve([] as MatchedKnowledgeChunk[]) : searchKnowledgeBase(activeQuery, 6).catch(() => [] as MatchedKnowledgeChunk[]),
    ]);

    const agriAndNeracaNarrative = trivial ? '' : buildAgricultureAndNeracaContext(spCtx, needDetailedKelurahan);
    const renstraNarrative = needRenstra ? buildRenstraContext(renstraData) : '';
    const kwtNarrative = !trivial ? (buildKwtPromptContext(activeQuery) || '') : '';

    // Bangun sitasi sumber & narasi Knowledge Base RAG
    const sources: SourceCitation[] = [];
    let referencedDocs: string[] = [];
    let knowledgeNarrative = '';

    if (matchedChunks.length > 0) {
      referencedDocs = Array.from(new Set(matchedChunks.map((c) => c.doc_title)));
      const chunkTexts = matchedChunks
        .slice(0, 5)
        .map((c) => `[DOKUMEN RESMI: ${c.doc_title} | Bagian #${c.chunk_index + 1}]\n${c.content.substring(0, 900)}`);
      knowledgeNarrative = `=== REFERENSI DOKUMEN RESMI TERKAIT (RAG KNOWLEDGE BASE) ===\n${chunkTexts.join('\n\n---\n\n')}`;

      for (const docTitle of referencedDocs.slice(0, 4)) {
        sources.push({ type: 'KNOWLEDGE BASE', title: docTitle });
      }
    }

    if (!trivial) {
      sources.push({ type: 'LIVE DATABASE', title: 'Database Real-Time PANCI & GIS DKPP Cilegon' });
    }

    // 4. Bangun System Prompt Komprehensif (Adopsi penuh dkpp-info: Langkah 0, Master Prompt, 7-Langkah Neraca, Strict Formatting)
    const systemPrompt = `# SYSTEM PROMPT — PANCI: Food Security Intelligence & Decision Support System (DSS) Kota Cilegon
Anda adalah AI Intelligence resmi **PANCI (Platform Analisis Pangan Kota Cilegon)** pada **Dinas Ketahanan Pangan dan Pertanian (DKPP) Kota Cilegon**.
Anda terhubung penuh ke **4 PILAR DATA RESMI KOTA CILEGON**:
1. **DATABASE REAL-TIME PANCI SUPABASE** (IKP, PoU, 7 Indikator Pangan, FSVA 43 Kelurahan Live, SKPG Gizi Balita, EWS, ML Forecasting, & Harga Harian SAGON 3 Pasar)
2. **PETA SPASIAL GIS SERUMPUN-PADI** (407 Petak Sawah Baku 1.151,97 Ha, Lengas Tanah Satelit ECMWF ERA5-Land, 9 Pangkalan Nelayan, 84 KWT Tergeokode, Kolam Budidaya, Ternak, & Kamera Cerdas GPS)
3. **BASIS DATA RENSTRA DKPP 2025–2030 & 11 TABEL PROFIL PERIKANAN** (Tujuan, Sasaran, IKU, IKK, IKD, Cascading Program, Subkegiatan Prioritas, Pagu Indikatif, 58 KUB, 3 Koperasi Nelayan, BPAN)
4. **RAG KNOWLEDGE BASE DOKUMEN RESMI** (Susenas, DKB Penduduk, Realisasi Produksi DKPP, Perda RPJMD, UU Pangan, Laporan FSVA & Juknis Bapanas)

## ATURAN IDENTITAS PENGEMBANG & ADMINISTRATOR PLATFORM:
Jika pengguna bertanya mengenai siapa pembuat, pengembang, perancang, pengelola, atau administrator platform PANCI / aplikasi ketahanan pangan ini (misal: "siapa admin panci", "siapa yang buat aplikasi ini", "siapa pengembangnya", dsb.), Anda WAJIB menjawab dengan narasi baku dan profesional berikut:
"Platform **PANCI (Platform Analisis Pangan Kota Cilegon)** dikembangkan dan dikelola secara mandiri oleh seorang **Analis Ketahanan Pangan Ahli Muda** pada **Dinas Ketahanan Pangan dan Pertanian (DKPP) Kota Cilegon** sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan pertanian daerah.

Pengembangan dilakukan secara bertahap dengan pendekatan inovatif yang mengintegrasikan dashboard analitik, visualisasi spasial, pengelolaan data, dan teknologi kecerdasan buatan guna mendukung tata kelola pangan yang lebih efektif dan adaptif."

---

## ⚠️ ATURAN KRITIS CARA BERPIKIR & MENJAWAB (LANGKAH 0 — WAJIB DITERAPKAN SETIAP SAAT):

Sebelum menyusun kalimat pertama, **klasifikasikan maksud pertanyaan pengguna** ke salah satu dari 3 kategori berikut:

### KATEGORI A — PERTANYAAN ANALITIK / KUALITATIF / STRATEGIS / MENGAPA / NERACA
Mengandung kata/maksud seperti: *"tantangan"*, *"isu"*, *"apa yang perlu dibenahi"*, *"permasalahan"*, *"kendala"*, *"rekomendasi"*, *"solusi"*, *"strategi"*, *"kebijakan"*, *"mengapa"*, *"kenapa"*, *"bagaimana cara"*, *"analisis"*, *"neraca"*, *"kemandirian"*, *"defisit"*, *"perbandingan"*, *"faktor penyebab"*.
- **WAJIB** menjawab langsung substansi analitis yang ditanyakan secara tajam, terstruktur, sebab-akibat, dan berbasis bukti angka.
- **DILARANG KERAS** membuka atau mengisi jawaban dengan template daftar KPI seragam (memuntahkan semua skor IKP, SKPG, CPPD, Sawah sekaligus padahal tidak relevan dengan inti pertanyaan)!

### KATEGORI B — PERTANYAAN DATA / FAKTA SPESIFIK
Meminta angka, daftar kelompok, wilayah, anggaran, regulasi, atau indikator tertentu (misal: *"berapa luas sawah di Cibeber?"*, *"daftar KWT di Citangkil"*, *"target IKU DKPP 2026"*, *"mengapa pangkalan nelayan tertulis 8 atau 9?"*).
- Sajikan angka/daftar yang diminta secara **presisi, lengkap (jangan dipotong sembarangan)**, gunakan tabel Markdown bila membandingkan >2 entitas, lalu beri interpretasi singkat yang bernas.

### KATEGORI C — PERTANYAAN GAMBARAN UMUM / STATUS MENYELURUH
Menanyakan *"bagaimana kondisi ketahanan pangan Cilegon saat ini?"*, *"gambaran umum pangan Cilegon"*.
- Barulah sajikan sintesis utuh lintas pilar (Makro KPI, Ketersediaan Pertanian & Perikanan, Stabilitas Harga SAGON/EWS, Pemanfaatan Gizi SKPG/FSVA, serta Rekomendasi).

---

## 🧠 ALGORITMA 7 LANGKAH SINTESIS NERACA & KEMANDIRIAN PANGAN (AKTIFKAN SAAT MEMBAHAS NERACA / KEBUTUHAN KOMODITAS):
1. **Identifikasi Komoditas & Periode** (misal realisasi 2025 & proyeksi 2026).
2. **Konsumsi Per Kapita (Susenas 2023)**: \`gram/pekan ÷ 7 = gram/hari\`; \`(gram/hari × 365) ÷ 1.000 = kg/kapita/tahun\`.
3. **Kebutuhan Total Kota (DKB 2025: 480.378 Jiwa)**: \`Ton/tahun = (480.378 × kg/tahun) ÷ 1.000\`.
4. **Konversi Produksi Bersih Lokal**: GKG → Beras = **64,02%** | Jagung pipilan = **75%** | Karkas sapi = **50%** | Karkas ayam = **70%**.
5. **Hitung Tingkat Kemandirian & Defisit**: \`Kemandirian (%) = (Produksi Bersih ÷ Total Konsumsi) × 100%\`; \`Defisit Pasokan Luar = Total Konsumsi − Produksi Bersih\`.
6. **Proyeksi Tahun Depan**: Pertumbuhan penduduk BPS Cilegon **+1,30%/tahun** (2026 = **486.623 Jiwa**).
7. **Rekomendasi Intervensi Konkret**: KAD, GPM, CPPD Bulog, intensifikasi LP2B, atau diversifikasi pangan lokal (singkong/sukun/P2L KWT).

---

## 📊 FITUR GRAFIK INTERAKTIF (RECHARTS JSON BLOCK):
Jika pengguna secara eksplisit meminta **grafik / chart / visualisasi tren / perbandingan**, sertakan blok \`\`\`json:chart (tipe: \`"line"\`, \`"bar"\`, \`"area"\`, atau \`"pie"\`) dengan data riil:
\`\`\`json:chart
{
  "type": "line",
  "title": "Tren Produksi Padi Sawah Kota Cilegon (2021-2025)",
  "description": "Realisasi Gabah Kering Giling (Ton)",
  "xAxisKey": "tahun",
  "showTrendline": true,
  "series": [
    { "key": "produksi", "label": "Produksi GKG (Ton)", "color": "#10B981" }
  ],
  "data": [
    { "tahun": "2021", "produksi": 11687 },
    { "tahun": "2022", "produksi": 11401 },
    { "tahun": "2023", "produksi": 9852 },
    { "tahun": "2024", "produksi": 10461 },
    { "tahun": "2025", "produksi": 13772 }
  ]
}
\`\`\`

## 🗺️ TAG WILAYAH INTERAKTIF GIS & ATURAN FORMATTING KETAT:
- Gunakan tag \`[KELURAHAN:NamaKelurahan]\` atau \`[KECAMATAN:NamaKecamatan]\` saat merujuk wilayah spesifik di Kota Cilegon agar pengguna dapat mengeklik sorotan peta GIS.
- **DILARANG KERAS** menggunakan sintaks LaTeX/dollar (\`$...$\`, \`$$...$$\`, \`\\rightarrow\`, \`\\times\`). Tulis rumus langsung dengan karakter bersih: \`→\`, \`×\`, \`÷\`, \`≤\`, \`≥\`.
- **DILARANG** menaruh tanda peluru (\`•\` atau \`-\`) sendirian di baris kosong tanpa teks.
- **DILARANG** memberi baris kosong di tengah-tengah baris tabel Markdown agar tabel ter-render sempurna.
- **DILARANG** menggunakan judul klise "Ringkasan Eksekutif". Langsung masuk ke judul topik yang tajam dan informatif.

${DKPP_MASTER_PROMPT}

${renstraNarrative ? `\n${renstraNarrative}\n` : ''}
${kwtNarrative ? `\n${kwtNarrative}\n` : ''}
${perikananNarrative ? `\n${perikananNarrative}\n` : ''}
${coreDbNarrative ? `\n${coreDbNarrative}\n` : ''}
${agriAndNeracaNarrative ? `\n${agriAndNeracaNarrative}\n` : ''}
${knowledgeNarrative ? `\n${knowledgeNarrative}\n` : ''}`;

    // 5. Panggil Gemini API dengan Fallback Cerdas
    const apiKey = process.env.GEMINI_API_KEY || '';
    const maxTokens = isThinkingMode ? 4096 : 3000;
    let rawText = '';
    let usedModel = '';

    if (apiKey) {
      try {
        const contents = buildGeminiContents(history, cleanUserMessage, activeQuery, isThinkingMode, imageData);
        const res = await callGeminiWithFallback(apiKey, contents, systemPrompt, maxTokens, !!imageData?.data);
        rawText = res.text;
        usedModel = res.model;
      } catch (err) {
        console.warn('[PANCI AI Intelligence] Gemini unavailable, activating rule-based analytical synthesizer:', err);
        rawText = generateDomainFallbackResponse(activeQuery);
        usedModel = 'panci-synthesizer-offline';
      }
    } else {
      rawText = generateDomainFallbackResponse(activeQuery);
      usedModel = 'panci-synthesizer-offline';
    }

    const wilayahHighlight = extractWilayahHighlights(rawText);
    const cleanText = cleanResponseText(rawText);

    // 6. Smart Map Actions & Geocoded Pins (Adopsi aturan dkpp-info: jangan paksa lompat peta untuk kueri perikanan non-peta & abaikan 'cilegon' generik sebagai Kec. Cilegon)
    const matchedPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [];
    let mapAction: {
      type: 'FLY_TO' | 'RESET' | 'HIGHLIGHT' | 'FILTER';
      target?: string;
      lat?: number;
      lng?: number;
      zoom?: number;
      layers_to_enable?: string[];
      thematic_mode?: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting';
      filtered_wilayah?: string[];
      filter_active?: boolean;
      filter_label?: string;
      pin?: {
        lat: number;
        lng: number;
        name: string;
        category: string;
        kelurahan: string;
        kecamatan: string;
      };
    } | null = null;

    const qLower = activeQuery.toLowerCase();
    const rawTextLower = rawText.toLowerCase();
    const isPerikananNonMap =
      isPerikananQuery(activeQuery) && !qLower.includes('peta') && !qLower.includes('gis') && !qLower.includes('lokasi');

    if (!isPerikananNonMap && !trivial) {
      // Gabungkan seluruh pin tematik resmi + 84 KWT tergeokode dari kwt/data.ts + Kamera Cerdas
      const allThematicPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [
        { lat: -6.02121, lng: 105.95186, name: 'Pangkalan Nelayan Tanjung Leneng', category: 'nelayan', kelurahan: 'Gunung Sugih', kecamatan: 'Ciwandan' },
        { lat: -5.94000, lng: 105.99996, name: 'Pangkalan Nelayan Medaksa', category: 'nelayan', kelurahan: 'Tamansari', kecamatan: 'Pulomerak' },
        { lat: -6.00265, lng: 106.08792, name: 'Pangkalan Nelayan Terate', category: 'nelayan', kelurahan: 'Terate', kecamatan: 'Cibeber' },
        { lat: -5.98419, lng: 105.99079, name: 'Pangkalan Nelayan Tanjung Peni', category: 'nelayan', kelurahan: 'Warnasari', kecamatan: 'Citangkil' },
        { lat: -5.89686, lng: 106.01774, name: 'Pangkalan Nelayan Suralaya', category: 'nelayan', kelurahan: 'Suralaya', kecamatan: 'Pulomerak' },
        { lat: -5.92845, lng: 105.99612, name: 'Pangkalan Nelayan Mabak', category: 'nelayan', kelurahan: 'Mekarsari', kecamatan: 'Pulomerak' },
        { lat: -5.93412, lng: 105.99841, name: 'Pangkalan Nelayan Kaltex', category: 'nelayan', kelurahan: 'Tamansari', kecamatan: 'Pulomerak' },
        { lat: -5.90874, lng: 106.00421, name: 'Pangkalan Nelayan Lebak Gede', category: 'nelayan', kelurahan: 'Lebakgede', kecamatan: 'Pulomerak' },
        { lat: -6.00891, lng: 105.97234, name: 'Pangkalan Nelayan Lelean', category: 'nelayan', kelurahan: 'Gerem', kecamatan: 'Gerogol' },
        ...getAllKwtPins().map((k) => ({
          lat: k.lat,
          lng: k.lng,
          name: k.name.startsWith('KWT') ? k.name : `KWT ${k.name}`,
          category: 'kwt',
          kelurahan: k.kelurahan,
          kecamatan: k.kecamatan,
        })),
        { lat: -6.02954, lng: 106.00843, name: 'Kolam Nurholis (Lele/Nila/Gurame)', category: 'kolam', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
        { lat: -6.01145, lng: 106.05094, name: 'Kolam Budidaya Nila Masigit', category: 'kolam', kelurahan: 'Masigit', kecamatan: 'Jombang' },
        { lat: -6.00723, lng: 106.05795, name: 'Peternakan Sapi (Masigit)', category: 'ternak', kelurahan: 'Masigit', kecamatan: 'Jombang' },
        { lat: -6.00845, lng: 106.05912, name: 'Peternakan Kambing (Masigit)', category: 'ternak', kelurahan: 'Masigit', kecamatan: 'Jombang' },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kameraRawList = (spCtx['kamera_cerdas_observasi'] as any)?.data;
      if (Array.isArray(kameraRawList)) {
        for (const obs of kameraRawList) {
          if (obs.latitude && obs.longitude && Number(obs.latitude) !== 0) {
            allThematicPins.push({
              lat: Number(obs.latitude),
              lng: Number(obs.longitude),
              name: obs.nama_lokasi || (obs.mode === 'pasokan_beras' ? `Pemasok: ${obs.kategori_label || 'Beras'}` : `Pangan: ${obs.kategori_label || 'Tanaman'}`),
              category: obs.mode === 'pasokan_beras' ? 'beras' : 'pangan_lokal',
              kelurahan: obs.kelurahan || '',
              kecamatan: obs.kecamatan || '',
            });
          }
        }
      }

      for (const p of allThematicPins) {
        const nameLower = p.name.toLowerCase();
        const kelLower = p.kelurahan.toLowerCase();
        const kecLower = p.kecamatan.toLowerCase();

        const nameMatch = qLower.includes(nameLower) || rawTextLower.includes(nameLower);
        const isNelayanMatch = (qLower.includes('nelayan') || qLower.includes('pangkalan')) && p.category === 'nelayan';
        const isKwtMatch = (qLower.includes('kwt') || qLower.includes('wanita tani')) && p.category === 'kwt';
        const isKolamMatch = (qLower.includes('kolam') || qLower.includes('budidaya')) && p.category === 'kolam';
        const isTernakMatch = (qLower.includes('ternak') || qLower.includes('sapi') || qLower.includes('kambing')) && p.category === 'ternak';
        const isBerasMatch = (qLower.includes('pemasok') || qLower.includes('toko beras') || qLower.includes('agen beras')) && p.category === 'beras';
        const isPanganLokalMatch = (qLower.includes('pangan lokal') || qLower.includes('sukun') || qLower.includes('kamera cerdas')) && (p.category === 'pangan_lokal' || p.category === 'beras');

        const locScopedMatch =
          (kelLower && qLower.includes(kelLower) || kecLower && qLower.includes(kecLower)) &&
          (isNelayanMatch || isKwtMatch || isKolamMatch || isTernakMatch || isBerasMatch || isPanganLokalMatch);

        if (nameMatch || locScopedMatch) {
          if (!matchedPins.some((mp) => mp.name === p.name)) matchedPins.push(p);
        }
      }

      if (matchedPins.length === 0) {
        if (qLower.includes('kwt') || qLower.includes('wanita tani')) {
          matchedPins.push(...allThematicPins.filter((p) => p.category === 'kwt'));
        } else if (qLower.includes('pangkalan') || (qLower.includes('nelayan') && qLower.includes('peta'))) {
          matchedPins.push(...allThematicPins.filter((p) => p.category === 'nelayan'));
        } else if (qLower.includes('pemasok') || qLower.includes('toko beras')) {
          matchedPins.push(...allThematicPins.filter((p) => p.category === 'beras'));
        }
      }

      const spatialFilterResult = evaluateSpatialFilter(activeQuery);
      if (spatialFilterResult) {
        mapAction = {
          type: 'FILTER',
          lat: -6.01,
          lng: 106.02,
          zoom: 12.5,
          layers_to_enable: ['kelurahan', 'sawah'],
          filtered_wilayah: spatialFilterResult.filteredWilayah,
          filter_active: true,
          filter_label: spatialFilterResult.filterLabel,
        };
        for (const w of spatialFilterResult.filteredWilayah) {
          if (!wilayahHighlight.includes(w)) wilayahHighlight.push(w);
        }
      } else if (qLower.includes('reset peta') || qLower.includes('seluruh cilegon') || qLower.includes('semua wilayah')) {
        mapAction = {
          type: 'RESET',
          lat: -6.01,
          lng: 106.02,
          zoom: 12.5,
          filter_active: false,
          filtered_wilayah: [],
          layers_to_enable: ['kelurahan', 'kecamatan', 'sawah'],
        };
      } else {
        // Cek kecocokan 43 kelurahan pada query user (utamakan yang disebut eksplisit oleh user)
        for (const [kelName, coord] of Object.entries(KELURAHAN_COORDINATES)) {
          if (qLower.includes(kelName.toLowerCase())) {
            const isSawah = qLower.includes('sawah');
            const isKwt = qLower.includes('kwt') || qLower.includes('wanita tani');
            const sawahHa = KELURAHAN_SAWAH[kelName] ?? null;
            const category = isSawah ? 'sawah' : isKwt ? 'kwt' : 'wilayah';
            const pinName = isSawah
              ? `Sawah Kelurahan ${kelName}${sawahHa !== null ? ` (${sawahHa} Ha)` : ''}`
              : `Kelurahan ${kelName} (${coord.kec})`;
            const layersToEnable = ['kelurahan'];
            if (isSawah) layersToEnable.push('sawah');
            if (isKwt) layersToEnable.push('kwt', 'poktan');

            const customPin = {
              lat: coord.lat,
              lng: coord.lng,
              name: pinName,
              category,
              kelurahan: kelName,
              kecamatan: coord.kec,
            };
            if (!matchedPins.some((p) => p.name === customPin.name)) matchedPins.unshift(customPin);
            if (!wilayahHighlight.includes(kelName)) wilayahHighlight.push(kelName);

            mapAction = {
              type: 'FLY_TO',
              target: kelName,
              lat: coord.lat,
              lng: coord.lng,
              zoom: isSawah ? 16 : 15.5,
              layers_to_enable: layersToEnable,
              pin: customPin,
            };
            break;
          }
        }

        // Cek 8 Kecamatan (abaikan kata 'cilegon' umum kecuali 'kecamatan cilegon' / 'kec cilegon' — fix bug dkpp-info!)
        if (!mapAction) {
          for (const [kecName, coord] of Object.entries(KECAMATAN_COORDINATES)) {
            if (kecName.toLowerCase() === 'cilegon' && !qLower.includes('kecamatan cilegon') && !qLower.includes('kec cilegon') && !qLower.includes('kec. cilegon')) {
              continue;
            }
            if (qLower.includes(kecName.toLowerCase())) {
              const isSawah = qLower.includes('sawah');
              const layersToEnable = ['kecamatan', 'kelurahan'];
              if (isSawah) layersToEnable.push('sawah');
              mapAction = {
                type: 'FLY_TO',
                target: kecName,
                lat: coord.lat,
                lng: coord.lng,
                zoom: 14,
                layers_to_enable: layersToEnable,
              };
              if (!wilayahHighlight.includes(kecName)) wilayahHighlight.push(kecName);
              break;
            }
          }
        }

        if (!mapAction && matchedPins.length > 0 && (qLower.includes('peta') || qLower.includes('lokasi') || qLower.includes('sebaran') || qLower.includes('kwt'))) {
          const firstPin = matchedPins[0];
          const layersToEnable = ['kelurahan'];
          if (firstPin.category === 'kwt') layersToEnable.push('kwt', 'poktan');
          if (firstPin.category === 'nelayan') layersToEnable.push('nelayan');
          if (firstPin.category === 'kolam') layersToEnable.push('kolam');
          if (firstPin.category === 'ternak') layersToEnable.push('ternak');

          mapAction = {
            type: 'FLY_TO',
            target: matchedPins.length > 5 ? 'Sebaran Titik Kota Cilegon' : firstPin.name,
            lat: matchedPins.length > 5 ? -6.005 : firstPin.lat,
            lng: matchedPins.length > 5 ? 106.03 : firstPin.lng,
            zoom: matchedPins.length > 5 ? 12.5 : 15.5,
            layers_to_enable: layersToEnable,
            pin: firstPin,
          };
        }

        if (!mapAction && (qLower.includes('lengas') || qLower.includes('kelembapan tanah') || qLower.includes('ecmwf') || qLower.includes('soil moisture'))) {
          mapAction = {
            type: 'FLY_TO',
            lat: -6.01,
            lng: 106.03,
            zoom: 13,
            layers_to_enable: ['sawah'],
          };
        }
      }

      // Mode tematik choropleth hanya bila relevan dengan peta/spasial
      if (qLower.includes('peta') || qLower.includes('spasial') || qLower.includes('choropleth') || qLower.includes('fsva') || qLower.includes('skpg')) {
        let detectedThematicMode: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting' | undefined;
        if (qLower.includes('fsva') || qLower.includes('prioritas kerentanan')) detectedThematicMode = 'fsva';
        else if (qLower.includes('skpg') || qLower.includes('kewaspadaan pangan')) detectedThematicMode = 'skpg';
        else if (qLower.includes('stunting')) detectedThematicMode = 'stunting';
        else if (qLower.includes('kepadatan penduduk')) detectedThematicMode = 'penduduk';
        else if (qLower.includes('peta ikp')) detectedThematicMode = 'ikp';

        if (detectedThematicMode) {
          if (mapAction) {
            mapAction.thematic_mode = detectedThematicMode;
          } else {
            mapAction = {
              type: 'HIGHLIGHT',
              lat: -6.01,
              lng: 106.02,
              zoom: 12.5,
              layers_to_enable: ['kelurahan'],
              thematic_mode: detectedThematicMode,
            };
          }
        }
      }
    }

    // Diagnosis Hama / Multimodal Vision Pin
    const isPestDiagnosis =
      !!imageData?.data ||
      qLower.includes('wereng') ||
      qLower.includes('blas') ||
      qLower.includes('hama') ||
      qLower.includes('penyakit tanaman') ||
      qLower.includes('hawar');

    if (isPestDiagnosis) {
      const optPin = {
        lat: -6.01245,
        lng: 106.03512,
        name: '⚠️ Peringatan OPT Terdeteksi (Diagnosis AI)',
        category: 'warning',
        kelurahan: 'Cilegon',
        kecamatan: 'Pusat',
      };
      matchedPins.unshift(optPin);
      if (!mapAction) {
        mapAction = {
          type: 'FLY_TO',
          lat: optPin.lat,
          lng: optPin.lng,
          zoom: 15,
          layers_to_enable: ['kelurahan', 'sawah'],
          pin: optPin,
        };
      }
    }

    return NextResponse.json({
      success: true,
      type: 'text',
      text: cleanText,
      reconstructed_query: contextualQuery !== cleanUserMessage ? contextualQuery : undefined,
      wilayah_highlight: wilayahHighlight,
      matched_pins: matchedPins.slice(0, 84),
      map_action: mapAction,
      sources,
      source_tables: ['ikp_data', 'pou_data', 'fsva_matang', 'gizi_balita_skpg_kelurahan', 'harga_sagon_harian'],
      referenced_docs: referencedDocs,
      model: usedModel,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('/api/ai-intelligence error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — status cache SP
export async function GET() {
  const spCtx = await getCached('sp_ctx', TTL_5M, getSpContextData);
  return NextResponse.json({
    status: 'ok',
    sp_cache_tables: Object.keys(spCtx).length,
    tables: Object.entries(spCtx).map(([tabel, v]) => ({
      tabel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      age_minutes: (v as any)?.age_minutes || 0,
    })),
  });
}
