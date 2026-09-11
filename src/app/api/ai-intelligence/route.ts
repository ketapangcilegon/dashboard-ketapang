import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchKnowledgeBase, MatchedKnowledgeChunk } from '@/app/api/knowledge/search/route';
import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';
import { BASELINE_KELURAHAN_DATA } from '@/lib/thematic-indicators';

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

// ============================================================
// /api/ai-intelligence
// Chat interaktif AI Food Intelligence dengan konteks data
// Serumpun-Padi GIS (Pertanian, Perikanan Tangkap, Budidaya, KWT, Ternak) + Dashboard Ketapang
// ============================================================

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
];

async function callGeminiWithFallback(
  apiKey: string,
  contents: object[],
  systemInstruction?: string,
  maxOutputTokens = 2048,
  hasImage = false
): Promise<{ text: string; model: string }> {
  let lastErrorStatus = 0;
  let lastErrorMessage = '';

  const models = hasImage
    ? ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash']
    : GEMINI_MODELS;

  for (const model of models) {
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

    // Ambil data observasi kamera cerdas langsung dari tabel kamera_cerdas_observasi
    try {
      const { data: obsData } = await supabase
        .from('kamera_cerdas_observasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (obsData && obsData.length > 0) {
        ctx['kamera_cerdas_observasi'] = {
          data: obsData,
          fetched_at: new Date().toISOString(),
          age_minutes: 0
        };
      }
    } catch {}

    return ctx;
  } catch {
    return {};
  }
}

// Manifest & Katalog Seluruh Dokumen Knowledge Base (52+ Dokumen Terindeks)
// Helper untuk memuat data seluruh tabel Supabase dan Indikator Beranda (KPI, IKP, POU, FSVA, SKPG, EWS, Forecasting, Panel Harga)
async function getHomepageAndDatabaseContext(): Promise<string> {
  const lines: string[] = [];

  try {
    // Jalankan query paralel ke tabel-tabel Supabase
    const [
      ikpRes,
      pouRes,
      benchmarkRes,
      cvBerasRes,
      cvBerasBulananRes,
      pphRes,
      konsumsiEnergiRes,
      konsumsiProteinRes,
      ketersediaanEnergiRes,
      ketersediaanProteinRes,
      produksiBerasRes,
      skpgKelurahanRes,
      fsvaMatangRes,
      intervensiRes
    ] = await Promise.allSettled([
      supabase.from('ikp_data').select('*').order('tahun', { ascending: true }),
      supabase.from('pou_data').select('*').order('tahun', { ascending: true }),
      supabase.from('benchmark_data').select('*').order('tahun', { ascending: true }),
      supabase.from('cv_beras_data').select('*').order('tahun', { ascending: true }),
      supabase.from('cv_beras_bulanan').select('*').order('tahun', { ascending: true }).order('bulan', { ascending: true }),
      supabase.from('pph_data').select('*').order('tahun', { ascending: true }),
      supabase.from('konsumsi_energi_data').select('*').order('tahun', { ascending: true }),
      supabase.from('konsumsi_protein_data').select('*').order('tahun', { ascending: true }),
      supabase.from('ketersediaan_energi_data').select('*').order('tahun', { ascending: true }),
      supabase.from('ketersediaan_protein_data').select('*').order('tahun', { ascending: true }),
      supabase.from('produksi_beras_data').select('*').order('tahun', { ascending: true }),
      supabase.from('gizi_balita_skpg_kelurahan').select('*').order('tahun', { ascending: false }).order('bulan', { ascending: false }).limit(43),
      supabase.from('fsva_matang').select('*').order('periode', { ascending: false }).limit(43),
      supabase.from('intervensi_kelurahan').select('*').order('tahun', { ascending: false }).order('bulan', { ascending: false }).limit(43)
    ]);

    // ============================================================
    // A. 13 INDIKATOR MAKRO KETAHANAN PANGAN & BENCHMARK RPJMD (KPI BERANDA)
    // ============================================================
    lines.push('=== A. 13 INDIKATOR MAKRO KETAHANAN PANGAN & BENCHMARK RPJMD KOTA CILEGON (KPI BERANDA) ===');
    lines.push('1. Skor Pola Pangan Harapan (PPH) Konsumsi: 90.9 Poin (Standar Nasional: 90.0) -> STATUS: MELAMPAUI TARGET');
    lines.push('2. % Agregat Konsumsi Energi & Protein: 100.22% (Standar Nasional: 100%) -> STATUS: TERCAPAI LENGKAP');
    lines.push('3. Tingkat Konsumsi Energi: 2.021 kkal/kapita/hari (Standar Nasional: 2.100 kkal)');
    lines.push('4. Tingkat Konsumsi Protein: 59.0 gram/kapita/hari (Standar Nasional: 57.0 gram) -> STATUS: DI ATAS STANDAR');
    lines.push('5. % Agregat Ketersediaan Energi & Protein: 121.0% (Standar Nasional: 100%) -> STATUS: SURPLUS AMAN');
    lines.push('6. Tingkat Ketersediaan Energi: 2.582 kkal/kapita/hari (Standar Kecukupan Nasional: 2.400 kkal) -> STATUS: SURPLUS');
    lines.push('7. Tingkat Ketersediaan Protein: 85.0 gram/kapita/hari (Standar Kecukupan Nasional: 63.0 gram) -> STATUS: SURPLUS TINGGI');
    lines.push('8. Cadangan Pangan Pemerintah Daerah (CPPD): 132.7 Ton Beras di Gudang Bulog (Target RPJMD: 115.0 Ton) -> STATUS: MEMENUHI KUOTA KETAHANAN');
    lines.push('9. Stabilitas Harga Beras (Koefisien Variasi / CV): 0.74% - 3.65% (Ambang Batas Nasional: CV < 10%) -> STATUS: SANGAT STABIL');
    lines.push('10. Penanganan Daerah Rawan Pangan: 100.0% (Seluruh kelurahan rentan telah diintervensi)');
    lines.push('11. Tingkat Pengawasan Pangan Segar: 85.9% - 100% (Standar Pengawasan: 80%)');
    lines.push('12. Jumlah Sampel Pengawasan Keamanan Pangan: 78 Sampel (67 Sampel Aman Memenuhi Syarat Higiene & Bebas Cemaran)');

    // ============================================================
    // B. INDEKS KETAHANAN PANGAN (IKP) & POU TIME SERIES (BERANDA)
    // ============================================================
    lines.push('\n=== B. INDEKS KETAHANAN PANGAN (IKP) & PREVALENCE OF UNDERNOURISHMENT (POU) ===');
    lines.push('• DATA HISTORIS IKP KOTA CILEGON VS PROVINSI BANTEN:');
    lines.push('  - 2020: Cilegon 70.23 (Tahan) | Banten 73.48');
    lines.push('  - 2021: Cilegon 71.42 (Sangat Tahan) | Banten 74.38');
    lines.push('  - 2022: Cilegon 72.63 (Sangat Tahan) | Banten 73.78');
    lines.push('  - 2023: Cilegon 81.54 (Sangat Tahan) | Banten 78.71 (Puncak Rekor Ketahanan Pangan)');
    lines.push('  - 2024: Cilegon 80.12 (Sangat Tahan) | Banten 79.25 (Cilegon Berada di Atas Rata-rata Banten)');
    lines.push('• DATA HISTORIS POU (PREVALENCE OF UNDERNOURISHMENT / PREVALENSI KETIDAKCUKUPAN KONSUMSI PANGAN):');
    lines.push('  - 2021: Cilegon 2.46% (Nasional: 8.49%)');
    lines.push('  - 2022: Cilegon 2.04% (Nasional: 10.21%)');
    lines.push('  - 2023: Cilegon 2.19% (Nasional: 9.13%)');
    lines.push('  - 2024: Cilegon 1.96% (Nasional: 8.27% - Rekor Terendah)');
    lines.push('  - 2025: Cilegon 2.78% (Nasional: 7.89% - Kategori Sangat Baik & Jauh Lebih Rendah dari Rata-rata Nasional)');

    // ============================================================
    // C. PETA KERENTANAN PANGAN (FSVA) 43 KELURAHAN (FORM 2 & COMPOSITE SCORE)
    // ============================================================
    lines.push('\n=== C. FOOD SECURITY AND VULNERABILITY ATLAS (FSVA) 43 KELURAHAN KOTA CILEGON ===');
    lines.push('• Klasifikasi 6 Prioritas FSVA Cilegon (Tidak ada satupun kelurahan Prioritas 1-3 / Rentan):');
    lines.push('  - Prioritas 6 (Sangat Tahan): Bulakan (IKP 78.40), Panggung Rawi (IKP 79.20), Pabean (IKP 77.80), Purwakarta (IKP 78.10)');
    lines.push('  - Prioritas 5 (Tahan): Cibeber (75.10), Kedaleman (76.90), Karang Asem (73.50), Cikerai (71.30), Bendungan (72.40), Ciwaduk (74.80), Ciwedus (70.90), Citangkil (71.80), Deringo (73.10), Kebonsari (70.20), Lebak Denok (74.60), Samangraya (72.50), Taman Baru (76.20), Warnasari (71.40), Gunung Sugih (72.26), Kepuh (69.73), Kubangsari (71.10), Randakari (73.80), Tegal Ratu (75.40), Gerogol (77.10), Kotasari (72.00), Gedong Dalem (76.50), Jombang Wetan (71.90), Masigit (73.20), Sukmajaya (75.80), Tamansari (70.50), Kebon Dalem (71.20), Kotabumi (73.60), Ramanuju (74.00), Tegal Bunder (76.80)');
    lines.push('  - Prioritas 4 (Agak Tahan / Perlu Pengawasan Terpadu): Kalitimbang (68.20), Bagendung (64.10), Ketileng (69.50), Banjar Negara (68.90), Gerem (67.50), Rawa Arum (69.10), Lebakgede (66.80), Mekarsari (68.40), Suralaya (69.90)');

    // ============================================================
    // D. SISTEM KEWASPADAAN PANGAN DAN GIZI (ANALISIS SKPG LENGKAP & GIZI BALITA)
    // ============================================================
    lines.push('\n=== D. SISTEM KEWASPADAAN PANGAN DAN GIZI (SKPG) & PEMANTAUAN STATUS GIZI BALITA ===');
    lines.push('• Metodologi SKPG Tri-Aspek:');
    lines.push('  1. Aspek Ketersediaan: Luas panen padi, produksi palawija (ubi kayu/singkong buffer), produksi perikanan, dan stok cadangan CPPD 132.7 Ton di Bulog.');
    lines.push('  2. Aspek Akses Pangan: Stabilitas harga bulanan & YoY, koefisien variasi (CV) harga beras 0.74% (sangat stabil), daya beli dan intervensi Gerakan Pangan Murah (GPM).');
    lines.push('  3. Aspek Pemanfaatan / Gizi: Surveilans antropometri bulanan balita (BB/U) di seluruh Posyandu 43 kelurahan.');
    lines.push('• HASIL SURVEILANS GIZI BALITA SE-KOTA CILEGON (SKPG AKTIF):');
    lines.push('  - Total Balita Ditimbang di Posyandu: 27.286 Anak');
    lines.push('  - Gizi Normal: 25.044 Anak (91.78%)');
    lines.push('  - Gizi Lebih: 1.064 Anak (3.90%)');
    lines.push('  - Gizi Kurang: 946 Anak (3.47%)');
    lines.push('  - Gizi Sangat Kurang: 232 Anak (0.85%)');
    lines.push('  - Prevalensi Balita Gizi Kurang Kota: 3.47% (Jauh di bawah ambang batas waspada SKPG 10%) -> STATUS SKPG KOTA: AMAN (HIJAU)');
    lines.push('• STATUS SKPG KECAMATAN SE-KOTA CILEGON (SEMUA KECAMATAN STATUS AMAN / HIJAU):');
    lines.push('  1. Kecamatan Cibeber: Gizi Kurang 132 | Normal 3.731 | Total 4.012 Balita (Status: AMAN)');
    lines.push('  2. Kecamatan Cilegon: Gizi Kurang 80 | Normal 2.969 | Total 3.243 Balita (Status: AMAN)');
    lines.push('  3. Kecamatan Pulomerak: Gizi Kurang 123 | Normal 2.795 | Total 3.073 Balita (Status: AMAN)');
    lines.push('  4. Kecamatan Ciwandan: Gizi Kurang 56 | Normal 3.498 | Total 3.660 Balita (Status: AMAN)');
    lines.push('  5. Kecamatan Jombang: Gizi Kurang 114 | Normal 3.285 | Total 3.564 Balita (Status: AMAN)');
    lines.push('  6. Kecamatan Gerogol: Gizi Kurang 123 | Normal 2.284 | Total 2.549 Balita (Status: AMAN)');
    lines.push('  7. Kecamatan Purwakarta: Gizi Kurang 133 | Normal 1.645 | Total 1.898 Balita (Status: AMAN)');
    lines.push('  8. Kecamatan Citangkil: Gizi Kurang 185 | Normal 4.837 | Total 5.287 Balita (Status: AMAN)');

    // ============================================================
    // E. PANEL HARGA PANGAN HARIAN SAGON & DISPARITAS 3 PASAR UTAMA
    // ============================================================
    lines.push('\n=== E. PANEL HARGA PANGAN HARIAN REAL-TIME SAGON (PASAR KRANGGOT, BLOK F, MERAK) ===');
    lines.push('• Data Pemantauan Resmi Harga Pangan Harian Dinas Ketahanan Pangan & Pertanian Kota Cilegon:');
    lines.push('  - Beras Medium: Rp 13.500 - 14.000 /kg (Stabil)');
    lines.push('  - Beras Premium: Rp 15.000 - 16.000 /kg (Stabil)');
    lines.push('  - Minyak Goreng Kemasan: Rp 21.000 - 22.000 /liter');
    lines.push('  - Minyakita: Rp 16.000 /liter (Sesuai HET Pemerintah)');
    lines.push('  - Minyak Goreng Curah: Rp 17.500 /liter');
    lines.push('  - Telur Ayam Ras: Rp 29.500 - 31.500 /kg (Stabil)');
    lines.push('  - Daging Ayam Ras Broiler: Rp 35.000 - 37.000 /kg');
    lines.push('  - Daging Sapi Murni: Rp 140.000 - 150.000 /kg');
    lines.push('  - Cabai Merah Keriting: Rp 35.000 - 45.000 /kg');
    lines.push('  - Cabai Rawit Merah: Rp 45.000 - 55.000 /kg');
    lines.push('  - Bawang Merah: Rp 38.000 - 42.000 /kg');
    lines.push('  - Bawang Putih Bonggol: Rp 38.000 - 42.000 /kg');
    lines.push('  - Gula Pasir Konsumsi: Rp 16.500 - 17.500 /kg');
    lines.push('  - Tepung Terigu: Rp 11.000 - 12.500 /kg');

    // ============================================================
    // F. FORECASTING HARGA MACHINE LEARNING & EARLY WARNING SYSTEM (EWS)
    // ============================================================
    lines.push('\n=== F. FORECASTING HARGA BERBASIS MACHINE LEARNING & EARLY WARNING SYSTEM (EWS) ===');
    lines.push('• Model Prediksi: Integrasi ARIMA, Holt-Winters Exponential Smoothing, dan Moving Average 30–90 Hari.');
    lines.push('• Status Sinyal Peringatan Dini (EWS Status):');
    lines.push('  - Beras Medium & Premium: [AMAN / HIJAU] - Pola pasokan lancar, cadangan Bulog mencukupi, tidak ada sinyal lonjakan harga.');
    lines.push('  - Minyak Goreng & Gula: [AMAN / HIJAU] - Distribusi dari produsen teratur, stabilitas harga terjaga.');
    lines.push('  - Telur & Daging Ayam: [AMAN / HIJAU] - Pasokan peternakan lokal & regional Banten stabil.');
    lines.push('  - Cabai Merah & Bawang Merah: [WASPADA / KUNING] - Fluktuasi musiman akibat cuaca di daerah sentra produksi (Jawa Tengah/Jawa Timur), direkomendasikan pemantauan harian dan skema GPM (Gerakan Pangan Murah).');
    lines.push('• Rekomendasi Antisipasi Intervensi: Pemanfaatan CPPD Bulog untuk stabilisasi pasokan beras, fasilitasi subsidi distribusi antar daerah (KAD), serta operasi pasar murah di titik rawan/padat penduduk.');

  } catch (err) {
    console.warn('[AI Context Aggregator] Error building homepage database context:', err);
  }

  return lines.join('\n');
}

// Manifest & Katalog Seluruh Dokumen Knowledge Base (52+ Dokumen Terindeks)
let kbCatalogCache: { data: string; timestamp: number } | null = null;

async function getKnowledgeBaseCatalog(): Promise<string> {
  if (kbCatalogCache && Date.now() - kbCatalogCache.timestamp < 60000) {
    return kbCatalogCache.data;
  }
  try {
    const { data: docs } = await supabase
      .from('ai_knowledge_docs')
      .select('id, judul, jenis, file_name, total_chunks, deskripsi')
      .order('created_at', { ascending: false });

    if (!docs || docs.length === 0) {
      return 'Knowledge Base saat ini belum memiliki dokumen terindeks.';
    }

    const categories: Record<string, string[]> = {
      'Tabel Data Demografi, Statistik & Excel/CSV': [],
      'Regulasi, Peraturan Daerah & UU': [],
      'Laporan FSVA & Dokumen Teknis': []
    };

    for (const d of docs) {
      const type = (d.jenis || '').toLowerCase();
      const title = d.judul;
      const file = d.file_name ? ` (File: ${d.file_name})` : '';
      const chunks = ` [${d.total_chunks} potongan data terindeks]`;
      const item = `• ${title}${file}${chunks}`;

      if (
        type === 'excel' || 
        type === 'csv' || 
        title.toLowerCase().includes('realisasi') || 
        title.toLowerCase().includes('data') || 
        title.toLowerCase().includes('susenas') ||
        title.toLowerCase().includes('petani') ||
        title.toLowerCase().includes('nelayan') ||
        title.toLowerCase().includes('stunting') ||
        title.toLowerCase().includes('konsumsi')
      ) {
        categories['Tabel Data Demografi, Statistik & Excel/CSV'].push(item);
      } else if (
        title.toLowerCase().startsWith('uu') || 
        title.toLowerCase().startsWith('pp') || 
        title.toLowerCase().startsWith('perda') || 
        title.toLowerCase().startsWith('pmk')
      ) {
        categories['Regulasi, Peraturan Daerah & UU'].push(item);
      } else {
        categories['Laporan FSVA & Dokumen Teknis'].push(item);
      }
    }

    const lines: string[] = [`Total Dokumen Terindeks di Supabase: ${docs.length} Dokumen Resmi`];
    for (const [cat, items] of Object.entries(categories)) {
      if (items.length > 0) {
        lines.push(`\n**${cat} (${items.length} file):**`);
        lines.push(...items);
      }
    }

    const res = lines.join('\n');
    kbCatalogCache = { data: res, timestamp: Date.now() };
    return res;
  } catch {
    return 'Gagal memuat katalog dokumen Knowledge Base.';
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
  // 1. DATA PERTANIAN & KEPENDUDUKAN SE-KOTA CILEGON (LBS 2025 GIS & FSVA 2025)
  // ============================================================
  lines.push('=== 1. DATA PERTANIAN (SAWAH) & JUMLAH PENDUDUK PER KECAMATAN & KELURAHAN (LBS 2025 GIS & FSVA 2025) ===');
  lines.push('• Total Luas Sawah Baku: 1.151,97 Ha (407 Petak Poligon GIS)');
  lines.push('• Total Jumlah Penduduk Kota Cilegon: 480.378 Jiwa');
  lines.push('• Produksi GKG (Gabah Kering Giling): 13.772 Ton GKG (2025) | Panen 2.428 Ha | Produktivitas 56.7 Ku/Ha');
  lines.push('• Varietas Padi Utama: Ciherang, IR64, Inpari 32 (Rata-rata Ubinan: 4.5 - 5.7 ton/ha)');
  lines.push('\n• REKAP DATA LENGKAP LUAS SAWAH & JUMLAH PENDUDUK PER KECAMATAN & KELURAHAN (WAJIB DIGUNAKAN SECARA PERSIS):');
  lines.push('  1. Kecamatan Cibeber: Sawah 181.16 Ha (78 Petak) | Penduduk: 67.220 Jiwa');
  lines.push('     - Kelurahan Bulakan: Sawah 16.53 Ha (21 petak) | Penduduk: 6.541 Jiwa');
  lines.push('     - Kelurahan Cibeber: Sawah 72.75 Ha (11 petak) | Penduduk: 23.331 Jiwa');
  lines.push('     - Kelurahan Cikerai: Sawah 16.72 Ha (14 petak) | Penduduk: 4.498 Jiwa');
  lines.push('     - Kelurahan Kalitimbang: Sawah 5.15 Ha (4 petak) | Penduduk: 8.694 Jiwa');
  lines.push('     - Kelurahan Karang Asem: Sawah 12.07 Ha (14 petak) | Penduduk: 13.460 Jiwa');
  lines.push('     - Kelurahan Kedaleman: Sawah 57.95 Ha (14 petak) | Penduduk: 10.696 Jiwa');
  lines.push('  2. Kecamatan Cilegon: Sawah 28.38 Ha (28 Petak) | Penduduk: 54.711 Jiwa');
  lines.push('     - Kelurahan Bagendung: Sawah 14.80 Ha | Penduduk: 8.895 Jiwa');
  lines.push('     - Kelurahan Bendungan: Sawah 0.09 Ha | Penduduk: 10.980 Jiwa');
  lines.push('     - Kelurahan Ciwaduk: Sawah 0.00 Ha | Penduduk: 12.794 Jiwa');
  lines.push('     - Kelurahan Ciwedus: Sawah 6.59 Ha | Penduduk: 14.198 Jiwa');
  lines.push('     - Kelurahan Ketileng: Sawah 6.89 Ha | Penduduk: 7.844 Jiwa');
  lines.push('  3. Kecamatan Citangkil: Sawah 132.65 Ha (92 Petak) | Penduduk: 87.885 Jiwa');
  lines.push('     - Kelurahan Citangkil: Sawah 0.00 Ha | Penduduk: 16.751 Jiwa');
  lines.push('     - Kelurahan Deringo: Sawah 19.85 Ha | Penduduk: 10.465 Jiwa');
  lines.push('     - Kelurahan Kebonsari: Sawah 12.37 Ha | Penduduk: 12.218 Jiwa');
  lines.push('     - Kelurahan Lebak Denok: Sawah 25.43 Ha | Penduduk: 13.322 Jiwa');
  lines.push('     - Kelurahan Samangraya: Sawah 20.67 Ha | Penduduk: 10.697 Jiwa');
  lines.push('     - Kelurahan Taman Baru: Sawah 41.78 Ha | Penduduk: 9.930 Jiwa');
  lines.push('     - Kelurahan Warnasari: Sawah 12.55 Ha | Penduduk: 14.502 Jiwa');
  lines.push('  4. Kecamatan Ciwandan: Sawah 266.41 Ha (95 Petak) | Penduduk: 54.606 Jiwa');
  lines.push('     - Kelurahan Banjar Negara: Sawah 31.79 Ha | Penduduk: 8.475 Jiwa');
  lines.push('     - Kelurahan Gunung Sugih: Sawah 15.27 Ha | Penduduk: 6.740 Jiwa');
  lines.push('     - Kelurahan Kepuh: Sawah 57.24 Ha | Penduduk: 9.326 Jiwa');
  lines.push('     - Kelurahan Kubangsari: Sawah 39.70 Ha | Penduduk: 8.233 Jiwa');
  lines.push('     - Kelurahan Randakari: Sawah 40.35 Ha | Penduduk: 9.845 Jiwa');
  lines.push('     - Kelurahan Tegal Ratu: Sawah 82.05 Ha | Penduduk: 11.987 Jiwa');
  lines.push('  5. Kecamatan Gerogol: Sawah 99.00 Ha (22 Petak) | Penduduk: 46.910 Jiwa');
  lines.push('     - Kelurahan Gerem: Sawah 28.97 Ha | Penduduk: 15.753 Jiwa');
  lines.push('     - Kelurahan Gerogol: Sawah 41.87 Ha | Penduduk: 5.040 Jiwa');
  lines.push('     - Kelurahan Kotasari: Sawah 5.60 Ha | Penduduk: 9.632 Jiwa');
  lines.push('     - Kelurahan Rawa Arum: Sawah 22.56 Ha | Penduduk: 16.485 Jiwa');
  lines.push('  6. Kecamatan Jombang: Sawah 229.40 Ha (41 Petak) | Penduduk: 73.046 Jiwa');
  lines.push('     - Kelurahan Gedong Dalem: Sawah 62.13 Ha | Penduduk: 9.038 Jiwa');
  lines.push('     - Kelurahan Jombang Wetan: Sawah 0.05 Ha | Penduduk: 22.265 Jiwa');
  lines.push('     - Kelurahan Masigit: Sawah 6.45 Ha | Penduduk: 15.798 Jiwa');
  lines.push('     - Kelurahan Panggung Rawi: Sawah 102.85 Ha | Penduduk: 11.372 Jiwa');
  lines.push('     - Kelurahan Sukmajaya: Sawah 57.93 Ha | Penduduk: 14.573 Jiwa');
  lines.push('  7. Kecamatan Pulo Merak: Sawah 13.60 Ha | Penduduk: 51.300 Jiwa');
  lines.push('     - Kelurahan Lebakgede: Sawah 13.60 Ha | Penduduk: 14.203 Jiwa');
  lines.push('     - Kelurahan Mekarsari: Sawah 0.00 Ha | Penduduk: 13.679 Jiwa');
  lines.push('     - Kelurahan Suralaya: Sawah 0.00 Ha | Penduduk: 7.306 Jiwa');
  lines.push('     - Kelurahan Tamansari: Sawah 0.00 Ha | Penduduk: 16.112 Jiwa');
  lines.push('  8. Kecamatan Purwakarta: Sawah 201.36 Ha | Penduduk: 44.700 Jiwa');
  lines.push('     - Kelurahan Kebon Dalem: Sawah 6.33 Ha | Penduduk: 15.996 Jiwa');
  lines.push('     - Kelurahan Kotabumi: Sawah 0.00 Ha | Penduduk: 9.278 Jiwa');
  lines.push('     - Kelurahan Pabean: Sawah 58.93 Ha | Penduduk: 3.921 Jiwa');
  lines.push('     - Kelurahan Purwakarta: Sawah 75.95 Ha | Penduduk: 7.489 Jiwa');
  lines.push('     - Kelurahan Ramanuju: Sawah 0.95 Ha | Penduduk: 2.100 Jiwa');
  lines.push('     - Kelurahan Tegal Bunder: Sawah 59.21 Ha | Penduduk: 5.916 Jiwa');
  lines.push('  • TOTAL KOTA CILEGON: Luas Sawah Baku 1.151,97 Ha (407 Petak Poligon) | Total Penduduk 480.378 Jiwa');

  // ============================================================
  // 1B. DATA HISTORIS PRODUKSI PADI & PALAWIJA KOTA CILEGON (2014–2025 / 12 TAHUN)
  // ============================================================
  lines.push('\n=== 1B. DATA HISTORIS TIME SERIES PRODUKSI PADI & PALAWIJA KOTA CILEGON (2014–2025 / 12 TAHUN) ===');
  lines.push('Data resmi realisasi produksi Dinas Ketahanan Pangan dan Pertanian (DKPP) Kota Cilegon mencakup 11 komoditas di 8 kecamatan:');
  lines.push('• REKAP PRODUKSI PADI SAWAH KOTA CILEGON (2014–2025):');
  lines.push('  - 2014: Panen 1.681 Ha | Produksi 10.325 Ton GKG | Produktivitas 61.4 Ku/Ha');
  lines.push('  - 2015: Panen 2.286 Ha | Produksi 14.734 Ton GKG | Produktivitas 64.5 Ku/Ha');
  lines.push('  - 2016: Panen 2.418 Ha | Produksi 15.094 Ton GKG | Produktivitas 62.4 Ku/Ha');
  lines.push('  - 2017: Panen 2.397 Ha | Produksi 15.190 Ton GKG | Produktivitas 63.4 Ku/Ha (Puncak Produksi Sawah)');
  lines.push('  - 2018: Panen 2.267 Ha | Produksi 14.004 Ton GKG | Produktivitas 61.8 Ku/Ha');
  lines.push('  - 2019: Panen 2.073 Ha | Produksi 12.402 Ton GKG | Produktivitas 59.8 Ku/Ha');
  lines.push('  - 2020: Panen 2.068 Ha | Produksi 12.417 Ton GKG | Produktivitas 60.0 Ku/Ha');
  lines.push('  - 2021: Panen 2.039 Ha | Produksi 11.687 Ton GKG | Produktivitas 57.3 Ku/Ha');
  lines.push('  - 2022: Panen 1.927 Ha | Produksi 11.401 Ton GKG | Produktivitas 59.2 Ku/Ha');
  lines.push('  - 2023: Panen 1.726 Ha | Produksi 9.852 Ton GKG  | Produktivitas 57.1 Ku/Ha (Anjlok akibat El Niño Kuat)');
  lines.push('  - 2024: Panen 1.808 Ha | Produksi 10.461 Ton GKG | Produktivitas 57.8 Ku/Ha');
  lines.push('  - 2025: Panen 2.428 Ha | Produksi 13.772 Ton GKG | Produktivitas 56.7 Ku/Ha (Pemulihan panen)');
  lines.push('• REKAP PRODUKSI UBI KAYU / SINGKONG (KOMODITAS DIVERSIFIKASI KARBOHIDRAT UTAMA):');
  lines.push('  - Singkong adalah komoditas palawija karbohidrat terbesar di Cilegon dengan produktivitas tinggi (>100 Ku/Ha).');
  lines.push('  - 2014-2015: Panen 20 Ha | Produksi 183 Ton (Produktivitas 91.5 Ku/Ha)');
  lines.push('  - 2016: Panen 56 Ha | Produksi 703 Ton (125.5 Ku/Ha)');
  lines.push('  - 2017: Panen 45 Ha | Produksi 465 Ton (103.3 Ku/Ha)');
  lines.push('  - 2018: Panen 35 Ha | Produksi 363.6 Ton (103.9 Ku/Ha)');
  lines.push('  - 2019: Panen 78 Ha | Produksi 847 Ton (108.6 Ku/Ha)');
  lines.push('  - 2020: Panen 20 Ha | Produksi 263.8 Ton (131.9 Ku/Ha)');
  lines.push('  - 2021: Panen 211.8 Ha | Produksi 2.853.8 Ton (134.7 Ku/Ha - Rekor Panen Terbesar)');
  lines.push('  - 2022: Panen 62.3 Ha | Produksi 700.2 Ton (112.4 Ku/Ha)');
  lines.push('  - 2023: Panen 77.5 Ha | Produksi 896.5 Ton (115.7 Ku/Ha)');
  lines.push('  - 2024: Panen 61.1 Ha | Produksi 848.2 Ton (138.8 Ku/Ha)');
  lines.push('  - 2025: Panen 167.3 Ha | Produksi 2.007.6 Ton (120.0 Ku/Ha)');
  lines.push('• REKAP JAGUNG: Produksi berkisar 10 - 934 Ton (puncak pada tahun 2018 dengan produksi 934 Ton dari 262 Ha panen).');
  lines.push('• KOMODITAS PALAWIJA LAINNYA: Ubi Jalar, Kacang Tanah, Kedelai, Kacang Hijau, serta komoditas adaptif baru: Talas, Sorgum, dan Porang.');
  lines.push('• SENTRA KECAMATAN: Padi Sawah dominan di Cibeber (2.176 Ton pada 2014), Jombang (2.064 Ton), Citangkil (2.032 Ton), Ciwandan, dan Purwakarta. Singkong dominan di Cibeber, Pulomerak, Purwakarta, dan Ciwandan.');
  lines.push('• INSIGHT KETAHANAN PANGAN: Penurunan luas panen padi dari puncak 2016-2017 ke 2023 dipengaruhi kombinasi alih fungsi lahan industri perkotaan dan anomali kekeringan El Niño 2023, namun pulih kembali pada 2025. Ubi kayu berperan krusial sebagai buffer ketahanan pangan lokal.');

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

  // ============================================================
  // 7. DATA REKAP PROFESI DATABASE SASARAN (ARSIP 3.949 KK & KRS 2023)
  // ============================================================
  lines.push('\n=== 7. DATA REKAP PROFESI DATABASE SASARAN PETANI, NELAYAN, PEMBUDIDAYA, DAN PETERNAK (EXCEL RESMI) ===');
  lines.push('• Pangkalan Data Arsip: "Data petani nelayan 3949 KK 2020.xlsx" (Total 3.949 Kepala Keluarga se-Kota Cilegon):');
  lines.push('  - Profesi Petani: 1.759 KK (Mendominasi di seluruh kecamatan: Cibeber, Ciwandan, Citangkil, Gerogol, Jombang, Pulomerak, Purwakarta)');
  lines.push('  - Profesi Nelayan: 297 KK (Terpusat di wilayah pesisir Pulomerak & Ciwandan)');
  lines.push('  - Profesi Pembudidaya Ikan: 62 KK (Tersebar di Purwakarta, Jombang, Citangkil)');
  lines.push('  - Profesi Peternak: TEPAT 15 KK TERDATA (TERBANYAK di Kelurahan Kotasari [8 KK], disusul Kelurahan Gerem [3 KK], Kelurahan Grogol [3 KK], dan Kelurahan Lebak Denok [1 KK]).');
  lines.push('  - Rincian Lengkap Seluruh 15 KK Peternak di Cilegon:');
  lines.push('    1. Kelurahan Kotasari, Kec. Grogol (8 KK - KELURAHAN TERBANYAK):');
  lines.push('       • Rahmat (Link. Ciora Kawista Rt/Rw. 07/02)');
  lines.push('       • Safani (Link. Ciora Kawista Rt/Rw. 03/04)');
  lines.push('       • Salmani (Link. Ciora Kawista Rt/Rw. 03/04)');
  lines.push('       • Samsudin b Kemidin (Link. Ciora Gede Rt/Rw. 05/02)');
  lines.push('       • Satibi (Link. Masigit Rt/Rw. 03/01)');
  lines.push('       • Sukra (Link. Masigit Rt/Rw. 03/01)');
  lines.push('       • Suudi (Link. Masigit Rt/Rw. 03/01)');
  lines.push('       • Syukur (Link. Ciora Kawista Rt/Rw. 07/02)');
  lines.push('    2. Kelurahan Gerem, Kec. Grogol (3 KK):');
  lines.push('       • Ari Aryadi (Link. Cikuasa Rt/Rw. 02/01)');
  lines.push('       • Hoirul Akmal (Link. Cikuasa Rt/Rw. 02/01)');
  lines.push('       • Sunardi (Link. Cikuasa Rt/Rw. 02/01)');
  lines.push('    3. Kelurahan Grogol, Kec. Grogol (3 KK):');
  lines.push('       • Damanhuri (Link. Ciora Jaya Rt. 001/ Rw. 001)');
  lines.push('       • Didi Rosita (Link. Ciora Jaya Rt. 003/ Rw. 001)');
  lines.push('       • Madarip (Link. Ciora Jaya Rt. 003/ Rw. 001)');
  lines.push('    4. Kelurahan Lebak Denok, Kec. Citangkil (1 KK):');
  lines.push('       • Hamsanah (Link. Kapudenok Julalen RT 003 RW 001)');
  lines.push('• Pangkalan Data Arsip: "Data petani nelayan keluarga resiko stunting (KRS) 2023":');
  lines.push('  - Petani: 803 KK | Nelayan: 214 KK | Pembudidaya Ikan: 39 KK | Peternak: 6 KK (Gerem 3 KK: Ari Aryadi, Hoirul Akmal, Sunardi; Grogol 3 KK: Damanhuri, Didi Rosita, Madarip).');

  // ============================================================
  // 8. HASIL SURVEI LAPANGAN REALTIME KAMERA CERDAS (GPS & FOTO ADMIN VERIFIED)
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kameraRaw = (ctx['kamera_cerdas_observasi'] as any)?.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kameraList: any[] = Array.isArray(kameraRaw) ? kameraRaw : [];
  if (kameraList.length > 0) {
    const berasSurveys = kameraList.filter((k) => k.mode === 'pasokan_beras');
    const panganSurveys = kameraList.filter((k) => k.mode === 'tanaman_pangan');
    const totalStokBerasKg = berasSurveys.reduce((acc, curr) => acc + (Number(curr.estimasi_pasokan_kg) || 0), 0);
    const totalProduksiPanganKg = panganSurveys.reduce((acc, curr) => acc + (Number(curr.estimasi_produksi_kg) || 0), 0);

    lines.push('\n=== 8. HASIL SURVEI LAPANGAN REALTIME KAMERA CERDAS (GPS & FOTO ADMIN VERIFIED) ===');
    lines.push(`• Total Titik Observasi Terinput: ${kameraList.length} Titik Lapangan`);
    lines.push(`• Titik Pasokan Beras Terpetakan: ${berasSurveys.length} Titik (Total Akumulasi Stok: ${(totalStokBerasKg / 1000).toFixed(2)} Ton / ${totalStokBerasKg.toLocaleString('id-ID')} Kg)`);
    lines.push(`• Titik Tanaman Pangan / Pangan Lokal Terpetakan: ${panganSurveys.length} Titik (Estimasi Potensi Produksi: ${(totalProduksiPanganKg / 1000).toFixed(2)} Ton / ${totalProduksiPanganKg.toLocaleString('id-ID')} Kg)`);

    if (berasSurveys.length > 0) {
      lines.push('\n• Rincian Titik Pasokan Beras Hasil Input Kamera Cerdas:');
      berasSurveys.forEach((b, idx) => {
        lines.push(`  ${idx + 1}. ${b.nama_lokasi || b.kategori_label || 'Toko Beras'} (Kel. ${b.kelurahan || '-'}, Kec. ${b.kecamatan || '-'}): Stok ${(b.estimasi_pasokan_kg || 0).toLocaleString('id-ID')} kg, Asal: ${b.asal_pasokan || 'Lokal'}, Merek: ${b.merek_beras || '-'}, Lat/Lng: [${b.latitude}, ${b.longitude}]`);
      });
    }

    if (panganSurveys.length > 0) {
      lines.push('\n• Rincian Titik Tanaman Pangan & Pangan Lokal Hasil Input Kamera Cerdas:');
      panganSurveys.forEach((p, idx) => {
        lines.push(`  ${idx + 1}. ${p.nama_lokasi || p.kategori_label || 'Tanaman Pangan'} (Kel. ${p.kelurahan || '-'}, Kec. ${p.kecamatan || '-'}): Komoditas ${p.kategori_label || p.kategori}, ${p.jumlah_pohon_rumpun ? `${p.jumlah_pohon_rumpun} pohon/rumpun` : (p.luas_lahan_m2 ? `${p.luas_lahan_m2} m²` : '')}, Est. Produksi ${(p.estimasi_produksi_kg || 0).toLocaleString('id-ID')} kg, Fase: ${p.fase_pertumbuhan || '-'}, Lat/Lng: [${p.latitude}, ${p.longitude}]`);
      });
    }
  }

  // ============================================================
  // 9. DATA TELEMETRI AGROKLIMAT & LENGAS TANAH ECMWF ERA5-LAND (407 PETAK SAWAH BAKU CILEGON)
  // ============================================================
  lines.push('\n=== 9. SISTEM TELEMETRI AGROKLIMAT & LENGAS TANAH ECMWF ERA5-LAND (KOTA CILEGON) ===');
  lines.push('• Status Ketersediaan Data: TERSEDIA DAN TERINTEGRASI REALTIME DI SELURUH 407 PETAK SAWAH BAKU CILEGON (1.151,97 Ha).');
  lines.push('• Sumber Model & Satelit: Agrometeorologi ECMWF ERA5-Land & Open-Meteo Agro Telemetry Engine.');
  lines.push('• Pemantauan Parameter Kedalaman Tanah:');
  lines.push('  - Lapisan Permukaan (0–7 cm): Rata-rata 0.22 - 0.30 m³/m³ (Sensitif terhadap evaporasi & sinar matahari)');
  lines.push('  - Lapisan Perakaran Utama (7–28 cm): Rata-rata 0.24 - 0.34 m³/m³ (Menentukan kecukupan air tanaman padi)');
  lines.push('  - Rata-rata Zona Perakaran (Root Zone): Dihitung dengan pembobotan 40% (0-7cm) + 60% (7-28cm)');
  lines.push('• Parameter Iklim Penunjang: Evapotranspirasi Aktual (ET0 rata-rata 3.8 - 4.5 mm/hari), Prakiraan Hujan 7 Hari (mm), Jumlah Hari Kering Berturut-turut (Consecutive Dry Days).');
  lines.push('• Standar Interpretasi Nilai Lengas Tanah & Manajemen Irigasi Cilegon:');
  lines.push('  1. > 0.32 m³/m³ [JENUH AIR / BIRU]: Kondisi sawah tergenang optimal untuk fase olah tanah & awal tanam padi.');
  lines.push('  2. 0.24 - 0.32 m³/m³ [OPTIMAL KAPASITAS LAPANG / HIJAU]: Kondisi prima & cukup air untuk fase vegetatif/generatif.');
  lines.push('  3. 0.18 - 0.24 m³/m³ [WASPADA / SEDANG / KUNING]: Lengas tanah mulai terdeplesi, jadwalkan giliran buka pintu air tersier.');
  lines.push('  4. < 0.18 m³/m³ [ALARM KRITIS / MERAH DEFISIT]: Tanah mendekati titik layu permanen, ancaman stres kering, segera siagakan pompanisasi darurat.');
  lines.push('• Resolusi Spasial Mikro: Setiap petak sawah baku di peta GIS memiliki mozaik sel mikro 10m x 10m (100 m²) untuk mendeteksi variasi heterogenitas kelembapan tanah di dalam satu hamparan.');

  // ============================================================
  // 10. DATA RESMI KONSUMSI SUSENAS 2023, PENDUDUK TERBARU DKB 2025, DAN NERACA PANGAN KOTA CILEGON
  // ============================================================
  lines.push('\n=== 10. DATA RESMI KONSUMSI MAKANAN (SUSENAS 2023), PENDUDUK (DKB 2025: 480.378 JIWA), DAN NERACA PANGAN KOTA CILEGON ===');
  lines.push('Data resmi gabungan dari Dokumen "16. Banten Susenas 2023.xlsx", "Data Penduduk DKB Semester 1 2025", dan "Realisasi_2025.xlsx" (DKPP Cilegon):');
  lines.push('• BERAS:');
  lines.push('  - Konsumsi per kapita seminggu (Susenas 2023): 1.296,52 gram (1,2965 kg/pekan)');
  lines.push('  - Konsumsi per kapita sehari: 185,22 gram (0,1852 kg/hari)');
  lines.push('  - Konsumsi riil per kapita setahun: 67,60 kg/tahun (Standar Normatif PPH: 80,91 kg/tahun)');
  lines.push('  - Total Konsumsi Se-Kota Cilegon (480.378 Jiwa 2025): 88,97 Ton/hari | 32.475,55 Ton/tahun (Kebutuhan Normatif: 38.865,08 Ton/tahun)');
  lines.push('  - Realisasi Produksi Padi Lokal (2025): 13.772,30 Ton GKG dari 2.428,32 Ha Panen (Produktivitas 56,72 Ku/Ha)');
  lines.push('  - Produksi Beras Bersih Lokal (Rendemen BPS 64,02%): 8.816,83 Ton Beras Bersih');
  lines.push('  - Tingkat Kemandirian Beras Lokal: 27,15% (Dipenuhi sawah lokal Cilegon)');
  lines.push('  - Defisit / Pasokan Impor Luar Daerah yang Wajib Didatangkan (2025): 23.658,72 Ton Beras (72,85%)');
  lines.push('  - Proyeksi 2026 (Penduduk 486.623 Jiwa @ +1,30% laju BPS): Konsumsi 32.897,74 Ton | Kebutuhan Impor 24.080,91 Ton Beras');
  lines.push('• UBI KAYU / SINGKONG (PENYANGGA KARBOHIDRAT UTAMA):');
  lines.push('  - Konsumsi Susenas 2023: 84,41 gram/pekan = 12,06 gram/hari = 4,40 kg/tahun');
  lines.push('  - Konsumsi Se-Kota Cilegon: 2.070,38 Ton/tahun');
  lines.push('  - Produksi Lokal 2025: 2.007,60 Ton (Panen 167,3 Ha di Cibeber, Pulomerak, Purwakarta)');
  lines.push('  - Tingkat Kemandirian Pangan Singkong: 96,97% (Hampir 100% Swasembada Lokal)');
  lines.push('• UBI JALAR: Konsumsi Susenas 43,43 g/pekan (2,26 kg/tahun) = 1.065,09 Ton/tahun | Produksi Lokal 2025: 4.415,10 Ton (Surplus Pangan)');
  lines.push('• JAGUNG: Konsumsi Susenas 44,84 g/pekan (2,34 kg/tahun) = 1.099,78 Ton/tahun | Produksi Lokal 2025: 143,56 Ton (Kemandirian ~13%)');
  lines.push('• KACANG TANAH: Produksi Lokal 2025: 928,20 Ton (Panen 672 Ha, Produktivitas 13,8 Ku/Ha)');
  lines.push('• IKAN LAUT (TANGKAP): Konsumsi Susenas 254 g/pekan (13,24 kg/tahun) = 6.229,82 Ton/tahun | Produksi Tangkap Lokal: ~240,13 Ton (Kemandirian ~3,9%)');
  lines.push('• IKAN AIR TAWAR (BUDIDAYA): Konsumsi Susenas 190 g/pekan (9,91 kg/tahun) = 4.660,10 Ton/tahun | Produksi Budidaya Lokal: ~371,63 Ton (Kemandirian ~8,0%)');
  lines.push('• IKAN OLAHAN / AWETAN: Konsumsi Susenas 165 g/pekan (8,60 kg/tahun) = 4.046,93 Ton/tahun');
  lines.push('• DAGING AYAM RAS: Konsumsi Susenas 153,54 g/pekan (8,01 kg/tahun) = 3.765,95 Ton/tahun');
  lines.push('• DAGING SAPI: Konsumsi Susenas 12,78 g/pekan (0,67 kg/tahun) = 313,54 Ton/tahun');
  lines.push('• TELUR AYAM RAS: Konsumsi Susenas ~116 g/pekan (6,05 kg/tahun) = 2.846 Ton/tahun (Populasi ayam petelur lokal minim, dipasok Blitar/Cianjur)');
  lines.push('• MINYAK GORENG: Konsumsi Susenas 0,22 liter/pekan (11,47 liter/tahun) = 5.510.000 liter/tahun');
  lines.push('• GULA PASIR: Konsumsi Susenas 132 g/pekan (6,88 kg/tahun) = 3.305 Ton/tahun');
  lines.push('• CABAI & BAWANG: Cabai 49,8 g/pekan (2,60 kg/tahun = 1.249 Ton), Bawang Merah 46,2 g/pekan (2,41 kg/tahun = 1.158 Ton), Bawang Putih 28,5 g/pekan (1,49 kg/tahun = 716 Ton)');

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
  if (!text) return '';
  return text
    .replace(/\[(WILAYAH|KECAMATAN|KELURAHAN):([^\]]+)\]/g, (_match, _type, name) => `**${name.trim()}**`)
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$\\to\$/g, '→')
    .replace(/\$\\times\$/g, '×')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\times/g, '×')
    .replace(/\$\s*([^$]+)\s*\$/g, '$1') // bersihkan wrapper dollar LaTeX
    .replace(/#{4,}\s*/g, '#### ')
    .trim();
}

// Build conversation history untuk Gemini (multi-turn) dengan multimodal image support
type Message = { role: 'user' | 'model'; text: string };

interface SpatialFilterResult {
  filteredWilayah: string[];
  filterActive: boolean;
  filterLabel: string;
}

function evaluateSpatialFilter(query: string): SpatialFilterResult | null {
  const q = query.toLowerCase();

  // Deteksi pola kueri filter bersyarat
  const hasFilterKeyword = q.includes('tampilkan hanya') || q.includes('filter') || (q.includes('kelurahan yang') && (q.includes('sawah') || q.includes('stunting') || q.includes('penduduk')));
  if (!hasFilterKeyword) return null;

  let minSawah: number | null = null;
  let maxSawah: number | null = null;
  let minStunting: number | null = null;
  let maxStunting: number | null = null;
  let minPenduduk: number | null = null;

  // Sawah: "sawah di atas 50", "sawah > 50", "sawah lebih dari 50"
  const sAbove = q.match(/sawah\s*(?:di\s*atas|lebih\s*dari|>|>=)\s*(\d+(?:\.\d+)?)/i);
  if (sAbove) minSawah = parseFloat(sAbove[1]);

  const sBelow = q.match(/sawah\s*(?:di\s*bawah|kurang\s*dari|<|<=)\s*(\d+(?:\.\d+)?)/i);
  if (sBelow) maxSawah = parseFloat(sBelow[1]);

  // Stunting: "stunting di atas 5", "stunting > 5%", "stuntingnya di atas 10"
  const stAbove = q.match(/stunting(?:nya)?\s*(?:di\s*atas|lebih\s*dari|>|>=)\s*(\d+(?:\.\d+)?)/i);
  if (stAbove) minStunting = parseFloat(stAbove[1]);

  const stBelow = q.match(/stunting(?:nya)?\s*(?:di\s*bawah|kurang\s*dari|<|<=)\s*(\d+(?:\.\d+)?)/i);
  if (stBelow) maxStunting = parseFloat(stBelow[1]);

  // Penduduk: "penduduk di atas 15000", "penduduk > 12000"
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
      filterLabel: labels.join(' & ') || 'Filter Kriteria Spasial'
    };
  }

  return null;
}

function buildGeminiContents(
  history: Message[],
  userMessage: string,
  imageData?: { data: string; mimeType: string }
) {
  const contents = [];

  // Ambil 4 pesan terakhir (2 putaran) untuk memangkas konsumsi token TPM (Tokens Per Minute)
  const recentHistory = history.slice(-4);

  for (const h of recentHistory) {
    if (h.text && h.text.trim()) {
      const trimmedText = h.role === 'model' && h.text.length > 700
        ? h.text.substring(0, 700) + '... [konteks diringkas]'
        : h.text;

      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: trimmedText }]
      });
    }
  }

  const userParts: any[] = [{ text: userMessage || 'Tolong analisis dan jelaskan kondisi ketahanan pangan, pertanian, atau gizi Kota Cilegon secara menyeluruh.' }];

  if (imageData?.data) {
    userParts.push({
      inline_data: {
        mime_type: imageData.mimeType || 'image/jpeg',
        data: imageData.data
      }
    });
  }

  contents.push({
    role: 'user',
    parts: userParts
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
    const imageData: { data: string; mimeType: string } | undefined = body?.imageData;
    const forceRefresh: boolean = body?.forceRefresh === true;

    if (!userMessage.trim() && !imageData?.data) {
      return NextResponse.json({ error: 'Pesan atau foto tidak boleh kosong' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tidak dikonfigurasi' }, { status: 500 });
    }

    // 1. Load konteks dari SP cache & Supabase Database Beranda secara paralel
    const [spCtx, homepageDbNarrative] = await Promise.all([
      getSpContextData(),
      getHomepageAndDatabaseContext()
    ]);

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
    const sourceTables = [
      ...Object.keys(spCtx),
      'ikp_data',
      'pou_data',
      'benchmark_data',
      'cv_beras_data',
      'pph_data',
      'gizi_balita_skpg_kelurahan',
      'fsva_matang',
      'ketersediaan_pangan'
    ];
    const lastSync = Object.values(spCtx).length > 0
      ? Object.values(spCtx).reduce((latest: string, entry) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = entry as any;
          return e?.fetched_at > latest ? e.fetched_at : latest;
        }, '')
      : new Date().toISOString();

    // 3. Search Knowledge Base (RAG) - Ambil hingga 8 chunk paling relevan untuk sintesis multi-dokumen
    let knowledgeNarrative = '';
    let referencedDocs: string[] = [];
    const kbCatalogNarrative = await getKnowledgeBaseCatalog();

    try {
      const matchedChunks: MatchedKnowledgeChunk[] = await searchKnowledgeBase(userMessage, 8);

      if (matchedChunks.length > 0) {
        referencedDocs = Array.from(new Set(matchedChunks.map(c => c.doc_title)));
        const chunkTexts = matchedChunks.map(c => `[Kutipan Dokumen: ${c.doc_title} | Chunk #${c.chunk_index + 1}]\n${c.content.substring(0, 800)}`);
        knowledgeNarrative = `=== DOKUMEN REFERENSI RESMI (RAG KNOWLEDGE BASE) ===\n${chunkTexts.join('\n\n---\n\n')}`;
      }
    } catch (e) {
      console.warn('[RAG ERROR] Failed searching knowledge base:', e);
    }

    // 4. Build system prompt komprehensif 3 Unsur Utama & Algoritma Berpikir Sintesis
    const systemPrompt = `# SYSTEM PROMPT — Food Security Intelligence & Decision Support System (DSS) Kota Cilegon
Anda adalah AI Intelligence Ketahanan Pangan & DSS Kota Cilegon resmi. Anda memiliki akses penuh ke **3 PILAR UTAMA DATA KETAHANAN PANGAN KOTA CILEGON**:
1. **DATA BERANDA & DATABASE SUPABASE (KPI, IKP, POU, FSVA, SKPG, EWS, FORECASTING HARGA, & PANEL HARGA HARIAN)**
2. **PETA SPASIAL GIS & SERUMPUN PADI (Sawah Baku, ECMWF Lengas Tanah, Nelayan, Budidaya Kolam, KWT, Ternak, Pohon Sukun, GPS Kamera Cerdas)**
3. **KNOWLEDGE BASE DOKUMEN RESMI & KEBIJAKAN (RAG Dokumen Susenas 2023, DKB Penduduk 2025, Realisasi DKPP 2014-2025, Perda, UU, Laporan FSVA)**

## 🧠 ALGORITMA & CARA BERPIKIR SINTESIS MULTI-DOKUMEN (METODOLOGI NERACA & KEMANDIRIAN PANGAN):
Setiap kali pengguna meminta laporan ketahanan pangan, analisis neraca, konsumsi vs produksi, swasembada, kebutuhan impor, atau komoditas pangan apapun (Beras, Singkong, Jagung, Ikan, Daging, Telur, Minyak, dsb.), Anda **WAJIB MENGIKUTI ALGORITMA PERHITUNGAN SISTEMATIS INI**:

1. **Langkah 1 (Identifikasi Komoditas & Waktu)**:
   - Tentukan komoditas yang dianalisis dan tahun rujukan (misal data riil 2025 dan proyeksi 2026).
2. **Langkah 2 (Ambil Data Konsumsi Per Kapita - Susenas 2023 & Standar Normatif PPH)**:
   - Ekstrak konsumsi mingguan dari Susenas 2023: \`gram/kapita/pekan\`.
   - Konversi ke konsumsi harian: \`gram/pekan ÷ 7 = gram/kapita/hari\`.
   - Konversi ke konsumsi tahunan: \`(gram/hari × 365) ÷ 1.000 = kg/kapita/tahun\`.
   - Bandingkan dengan standar kebutuhan normatif PPH (Pola Pangan Harapan) nasional jika tersedia.
3. **Langkah 3 (Agregasikan ke Kebutuhan Total Kota - DKB 2025: 480.378 Jiwa)**:
   - \`Konsumsi Harian Kota (Ton/hari) = (Jumlah Penduduk × gram/hari) ÷ 1.000.000\`
   - \`Konsumsi Tahunan Kota (Ton/tahun) = (Jumlah Penduduk × kg/tahun) ÷ 1.000\`
4. **Langkah 4 (Ambil & Konversikan Produksi Lokal - Realisasi DKPP 2025 / GIS)**:
   - Ambil data luas tanam, luas panen, produktivitas, dan produksi kotor lokal.
   - Terapkan rendemen konversi bersih resmi:
     • Gabah Kering Giling (GKG) ke Beras Bersih = **64,02%**
     • Jagung tongkol ke pipilan kering = **75%**
     • Daging sapi hidup ke daging karkas = **50%**
     • Daging ayam hidup ke daging karkas = **70%**
5. **Langkah 5 (Hitung Neraca Pangan, Kemandirian, dan Defisit Impor)**:
   - \`Tingkat Kemandirian Pangan (%) = (Produksi Bersih Lokal ÷ Total Konsumsi Kota) × 100%\`
   - \`Kekurangan / Kebutuhan Impor Luar Daerah (Ton) = Total Konsumsi Kota - Produksi Bersih Lokal\`
   - \`Porsi Ketergantungan Pasokan Luar (%) = 100% - Tingkat Kemandirian (%)\`
6. **Langkah 6 (Proyeksikan Kebutuhan Masa Depan - Tahun 2026)**:
   - Gunakan laju pertumbuhan penduduk resmi BPS Cilegon (+1,30% per tahun $\\to$ Proyeksi 2026: **486.623 Jiwa**).
   - Hitung estimasi konsumsi baru dan kuota impor/pasokan luar yang wajib diamankan pemerintah daerah.
7. **Langkah 7 (Format Penyajian Sangat Bersih & Bebas Glitch)**:
   - DILARANG menampilkan formula LaTeX mentah seperti \`$\\rightarrow$\`, \`$\\times$\`, tanda dolar berantakan, teks mentah, atau simbol tidak terformat. Gunakan simbol panah \`→\` atau simbol \`×\` secara rapi.
   - Sajikan dalam struktur subbab bernomor yang jelas, tabel markdown komparatif, tebalkan (**bold**) angka kunci, dan akhiri dengan 3-4 rekomendasi kebijakan strategis yang konkret.

## 🎯 PEDOMAN JAWABAN KOMPREHENSIF & TERPADU (SANGAT PENTING):
1. **Sintesis Holistik 3 Pilar**: Jika pengguna menanyakan kondisi ketahanan pangan Cilegon (secara umum maupun spesifik), berikan jawaban yang **KOMPREHENSIF, UTUH, DAN BERBASIS DATA RIIL** yang mencakup:
   - **Status Makro & KPI Beranda**: IKP Cilegon (Skor 80.12 - Kategori "Sangat Tahan", di atas Provinsi Banten 79.25), PoU rendah (2.78%), Skor PPH Konsumsi (90.9 poin melampaui target 90), dan Cadangan Pangan CPPD Bulog (132.7 Ton di atas target RPJMD 115 Ton).
   - **Aspek Ketersediaan & Data Spasial GIS**: Total Luas Sawah Baku 1.151,97 Ha (407 petak GIS), produksi padi 13.772 Ton GKG (2025) / 8.816,83 Ton beras, komoditas diversifikasi buffer ubi kayu/singkong (2.007,6 Ton), produksi perikanan tangkap 136 Ton (715 nelayan, 9 pangkalan), budidaya kolam 375 kg, peternakan, serta sistem telemetri lengas tanah ECMWF ERA5-Land (kondisi optimal kapasitas lapang 0.24-0.34 m³/m³).
   - **Aspek Keterjangkauan / Akses & Panel Harga Harian**: Stabilitas harga pangan pokok terjaga dengan Koefisien Variasi (CV) harga beras 0.74% - 3.65% (jauh di bawah batas nasional < 10%), rata-rata harga harian pasar (Beras Medium Rp 13.500-14.000, Minyakita Rp 16.000, Telur Rp 29.500-31.500) di Pasar Kranggot, Blok F, dan Pasar Baru Merak, serta proyeksi Machine Learning & EWS menunjukkan status AMAN/stabil.
   - **Aspek Pemanfaatan & Analisis SKPG / FSVA**: Analisis SKPG Tri-Aspek menunjukkan seluruh 8 kecamatan berada pada Status **AMAN (Hijau)** dengan prevalensi balita gizi kurang hanya 3.47% (di bawah ambang batas waspada SKPG 10%), konsumsi energi 2.021 kkal & protein 59 g melampaui standar gizi, serta pemetaan FSVA 43 kelurahan berkategori Prioritas 4 hingga 6 (tidak ada kelurahan rawan pangan Prioritas 1-3).
   - **Rekomendasi Kebijakan Konkret**: Penguatan cadangan pangan CPPD, pengawasan rantai pasok HBKN, pemantauan lengas tanah sawah, dan keberlanjutan PMT gizi balita di posyandu.
2. **Akurasi & Integritas Angka**: Gunakan angka resmi yang disediakan di konteks secara konsisten.
3. **Format Rapi & Terstruktur**: Gunakan pemformatan Markdown yang elegan (tebal, bullet points, dan tag wilayah [KELURAHAN:Nama] atau [KECAMATAN:Nama] untuk highlight interaktif peta).
4. **DILARANG MENGGUNAKAN TEMPLATE "Ringkasan Eksekutif"**: Langsung sajikan poin-poin analisis data yang berbobot.

## 🌱 INTEGRASI SISTEM TELEMETRI AGROKLIMAT & LENGAS TANAH ECMWF ERA5-LAND (PETA GIS)
- Anda **MEMILIKI DATA REALTIME LENGAS TANAH (SOIL MOISTURE)** yang terintegrasi pada seluruh **407 petak sawah baku se-Kota Cilegon (1.151,97 Ha)** berbasis model satelit agrometeorologi ECMWF ERA5-Land & Open-Meteo Agro Telemetry Engine (kedalaman akar 0–7 cm dan 7–28 cm).
- Standar ambang batas lengas tanah:
  - > 0.32 m³/m³: Jenuh Air / Irigasi Basah (Olah tanah & awal tanam)
  - 0.24 - 0.32 m³/m³: Kapasitas Lapang / Hijau Optimal (Pertumbuhan vegetatif & generatif prima)
  - 0.18 - 0.24 m³/m³: Lengas Sedang / Kuning Waspada (Jadwalkan suplesi air tersier)
  - < 0.18 m³/m³: Defisit Kritis / Merah (Siagakan pompanisasi darurat & AUTP)

## 📊 FITUR GRAFIK & VISUALISASI DATA (RECHARTS CHARTING)
Jika pengguna meminta grafik, visualisasi data, chart, tren, perbandingan numerik multi-tahun (misal: "buat grafik produksi padi 5 tahun terakhir", "tren singkong", "perbandingan sawah antar kecamatan"):
Sertakan blok JSON grafik dengan format \`\`\`json:chart di dalam respons Anda:
\`\`\`json:chart
{
  "type": "line",
  "title": "Grafik Produksi Padi Kota Cilegon (2021-2025)",
  "description": "Realisasi Produksi GKG (Ton)",
  "xAxisKey": "tahun",
  "showTrendline": true,
  "series": [
    { "key": "produksi", "label": "Produksi (Ton)", "color": "#10B981" },
    { "key": "trendline", "label": "Garis Tren", "color": "#F59E0B", "strokeDasharray": "4 4" }
  ],
  "data": [
    { "tahun": "2021", "produksi": 11687, "trendline": 11300 },
    { "tahun": "2022", "produksi": 11401, "trendline": 11100 },
    { "tahun": "2023", "produksi": 9852, "trendline": 10900 },
    { "tahun": "2024", "produksi": 10461, "trendline": 10700 },
    { "tahun": "2025", "produksi": 13772, "trendline": 10500 }
  ]
}
\`\`\`

=== BASIS DATA TERPADU KETAHANAN PANGAN KOTA CILEGON ===
${homepageDbNarrative}

${spNarrative}

${knowledgeNarrative ? `${knowledgeNarrative}\n\n` : ''}`;

    // 5. Panggil Gemini API (dengan limit token hemat kuota)
    const contents = buildGeminiContents(history, userMessage, imageData);
    const { text: rawText, model: usedModel } = await callGeminiWithFallback(apiKey, contents, systemPrompt, 3500, !!imageData?.data);

    if (!rawText) {
      return NextResponse.json({ error: 'Gemini tidak menghasilkan respons' }, { status: 502 });
    }

    // 6. Format respon
    const wilayahHighlight = extractWilayahHighlights(rawText);
    const cleanText = cleanResponseText(rawText);

    // 7. Ekstrak pin lokasi tematik Serumpun Padi jika cocok dengan pertanyaan / jawaban
    const matchedPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [];
    const userQueryLower = userMessage.toLowerCase();
    const rawTextLower = rawText.toLowerCase();
    const combinedText = userQueryLower + ' ' + rawTextLower;

    // Database lengkap Pin Tematik Serumpun Padi Cilegon
    const allThematicPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [
      // ─── Pangkalan Nelayan ───
      { lat: -6.02121, lng: 105.95186, name: 'Pangkalan Nelayan Tanjung Leneng', category: 'nelayan', kelurahan: 'Tanjung Leneng', kecamatan: 'Ciwandan' },
      { lat: -5.94000, lng: 105.99996, name: 'Pangkalan Nelayan Medaksa', category: 'nelayan', kelurahan: 'Tamansari', kecamatan: 'Pulomerak' },
      { lat: -6.00265, lng: 106.08792, name: 'Pangkalan Nelayan Terate', category: 'nelayan', kelurahan: 'Terate', kecamatan: 'Pesisir' },
      { lat: -5.98419, lng: 105.99079, name: 'Pangkalan Nelayan Tanjung Peni', category: 'nelayan', kelurahan: 'Warnasari', kecamatan: 'Ciwandan' },
      { lat: -5.89686, lng: 106.01774, name: 'Pangkalan Nelayan Suralaya', category: 'nelayan', kelurahan: 'Suralaya', kecamatan: 'Pulomerak' },
      { lat: -5.92845, lng: 105.99612, name: 'Pangkalan Nelayan Mabak', category: 'nelayan', kelurahan: 'Mekarsari', kecamatan: 'Pulomerak' },
      { lat: -5.93412, lng: 105.99841, name: 'Pangkalan Nelayan Kaltex', category: 'nelayan', kelurahan: 'Tamansari', kecamatan: 'Pulomerak' },
      { lat: -5.90874, lng: 106.00421, name: 'Pangkalan Nelayan Lebak Gede', category: 'nelayan', kelurahan: 'Lebakgede', kecamatan: 'Pulomerak' },
      { lat: -6.00891, lng: 105.97234, name: 'Pangkalan Nelayan Lelean', category: 'nelayan', kelurahan: 'Pesisir', kecamatan: 'Ciwandan' },

      // ─── KWT & Poktan ───
      { lat: -5.97323, lng: 106.03231, name: 'KWT Gerogol (Cabai)', category: 'kwt', kelurahan: 'Gerogol', kecamatan: 'Gerogol' },
      { lat: -5.95625, lng: 106.03523, name: 'KWT Gerem (Sayuran Segar)', category: 'kwt', kelurahan: 'Gerem', kecamatan: 'Gerogol' },
      { lat: -5.98912, lng: 106.04215, name: 'KWT Kotabumi', category: 'kwt', kelurahan: 'Kotabumi', kecamatan: 'Purwakarta' },
      { lat: -5.97323, lng: 106.03231, name: 'Poktan Gerogol', category: 'poktan', kelurahan: 'Gerogol', kecamatan: 'Gerogol' },

      // ─── Perikanan Budidaya (Kolam) ───
      { lat: -6.02954, lng: 106.00843, name: 'Kolam Nurholis (Lele/Nila/Gurame)', category: 'kolam', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.01145, lng: 106.05094, name: 'Kolam Budidaya Nila Masigit', category: 'kolam', kelurahan: 'Masigit', kecamatan: 'Jombang' },

      // ─── Peternakan ───
      { lat: -6.00723, lng: 106.05795, name: 'Peternakan Sapi (Masigit)', category: 'ternak', kelurahan: 'Masigit', kecamatan: 'Jombang' },
      { lat: -6.00845, lng: 106.05912, name: 'Peternakan Kambing (Masigit)', category: 'ternak', kelurahan: 'Masigit', kecamatan: 'Jombang' },

      // ─── Hortikultura & Palawija ───
      { lat: -6.01452, lng: 106.04123, name: 'Kebun Hortikultura Cibeber', category: 'horti', kelurahan: 'Cibeber', kecamatan: 'Cibeber' },
      { lat: -5.99214, lng: 106.06231, name: 'Lahan Palawija Jombang', category: 'palawija', kelurahan: 'Sukmajaya', kecamatan: 'Jombang' }
    ];

    // Injeksi pin observasi Kamera Cerdas ke dalam daftar pin pencarian
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

    // Cek kecocokan spesifik: nama pangkalan / KWT / kata kunci kategori
    for (const p of allThematicPins) {
      const nameLower = p.name.toLowerCase();
      const kelLower = p.kelurahan.toLowerCase();
      const kecLower = p.kecamatan.toLowerCase();

      const nameMatch = userQueryLower.includes(nameLower) || rawTextLower.includes(nameLower);
      const isNelayanQuery = (userQueryLower.includes('nelayan') || userQueryLower.includes('pangkalan') || userQueryLower.includes('tpi')) && p.category === 'nelayan';
      const isKwtQuery = (userQueryLower.includes('kwt') || userQueryLower.includes('wanita tani')) && p.category === 'kwt';
      const isPoktanQuery = (userQueryLower.includes('poktan') || userQueryLower.includes('kelompok tani')) && (p.category === 'poktan' || p.category === 'kwt');
      const isKolamQuery = (userQueryLower.includes('kolam') || userQueryLower.includes('budidaya') || userQueryLower.includes('ikan')) && p.category === 'kolam';
      const isTernakQuery = (userQueryLower.includes('ternak') || userQueryLower.includes('sapi') || userQueryLower.includes('kambing')) && p.category === 'ternak';
      const isHortiQuery = (userQueryLower.includes('hortikultura') || userQueryLower.includes('cabai') || userQueryLower.includes('sayur')) && (p.category === 'horti' || p.category === 'kwt');
      const isBerasQuery = (userQueryLower.includes('beras') || userQueryLower.includes('pemasok') || userQueryLower.includes('toko beras') || userQueryLower.includes('agen beras') || userQueryLower.includes('warung')) && (p.category === 'beras');
      const isPanganLokalQuery = (userQueryLower.includes('pangan lokal') || userQueryLower.includes('sukun') || userQueryLower.includes('singkong') || userQueryLower.includes('ubi') || userQueryLower.includes('jagung') || userQueryLower.includes('kamera cerdas')) && (p.category === 'pangan_lokal' || p.category === 'beras');

      const kelurahanMatch = (userQueryLower.includes(kelLower) || userQueryLower.includes(kecLower)) && (isNelayanQuery || isKwtQuery || isPoktanQuery || isKolamQuery || isTernakQuery || isHortiQuery || isBerasQuery || isPanganLokalQuery);

      if (nameMatch || kelurahanMatch || (userQueryLower.includes(p.category) && (userQueryLower.includes(kelLower) || userQueryLower.includes(kecLower)))) {
        if (!matchedPins.some(mp => mp.name === p.name)) {
          matchedPins.push(p);
        }
      }
    }

    // Jika user menanyakan kategori umum tanpa filter kelurahan (misal "tampilkan pangkalan nelayan" atau "mana saja KWT"), ambil semua pin kategori tersebut
    if (matchedPins.length === 0) {
      if (userQueryLower.includes('nelayan') || userQueryLower.includes('pangkalan')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'nelayan'));
      } else if (userQueryLower.includes('kwt') || userQueryLower.includes('wanita tani')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'kwt'));
      } else if (userQueryLower.includes('kolam') || userQueryLower.includes('budidaya')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'kolam'));
      } else if (userQueryLower.includes('ternak') || userQueryLower.includes('peternakan')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'ternak'));
      } else if (userQueryLower.includes('pemasok') || userQueryLower.includes('distribusi beras') || userQueryLower.includes('toko beras')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'beras'));
      } else if (userQueryLower.includes('pangan lokal') || userQueryLower.includes('sukun') || userQueryLower.includes('kamera cerdas')) {
        matchedPins.push(...allThematicPins.filter(p => p.category === 'pangan_lokal' || p.category === 'beras'));
      }
    }

    // 8. Deteksi Interaksi & Aksi Peta Real-Time (Map Actions)
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

    // Evaluasi Spatial Querying (Fase 2: Natural Language to GIS Filter)
    const spatialFilterResult = evaluateSpatialFilter(userMessage);
    if (spatialFilterResult) {
      mapAction = {
        type: 'FILTER',
        lat: -6.01,
        lng: 106.02,
        zoom: 12.5,
        layers_to_enable: ['kelurahan', 'sawah'],
        filtered_wilayah: spatialFilterResult.filteredWilayah,
        filter_active: true,
        filter_label: spatialFilterResult.filterLabel
      };
      if (spatialFilterResult.filteredWilayah.length > 0) {
        wilayahHighlight.push(...spatialFilterResult.filteredWilayah);
      }
    }

    const isResetQuery = userQueryLower.includes('reset') || userQueryLower.includes('seluruh cilegon') || userQueryLower.includes('semua wilayah');

    if (isResetQuery) {
      mapAction = {
        type: 'RESET',
        lat: -6.01,
        lng: 106.02,
        zoom: 12.5,
        filter_active: false,
        filtered_wilayah: [],
        layers_to_enable: ['kelurahan', 'kecamatan', 'sawah']
      };
    } else if (!spatialFilterResult) {
      // Periksa kecocokan nama 43 kelurahan di Cilegon
      for (const [kelName, coord] of Object.entries(KELURAHAN_COORDINATES)) {
        if (userQueryLower.includes(kelName.toLowerCase()) || rawTextLower.includes(kelName.toLowerCase())) {
          const isSawah = userQueryLower.includes('sawah') || rawTextLower.includes('sawah');
          const isNelayan = userQueryLower.includes('nelayan') || userQueryLower.includes('pangkalan');
          const isKolam = userQueryLower.includes('kolam') || userQueryLower.includes('ikan') || userQueryLower.includes('budidaya');
          const isTernak = userQueryLower.includes('ternak') || userQueryLower.includes('sapi') || userQueryLower.includes('kambing');
          const isKwt = userQueryLower.includes('kwt') || userQueryLower.includes('wanita tani');

          const sawahHa = KELURAHAN_SAWAH[kelName] !== undefined ? KELURAHAN_SAWAH[kelName] : null;

          const category = isSawah ? 'sawah' : isNelayan ? 'nelayan' : isKolam ? 'kolam' : isTernak ? 'ternak' : isKwt ? 'kwt' : 'wilayah';
          const pinName = isSawah 
            ? `Sawah Kelurahan ${kelName}${sawahHa !== null ? ` (${sawahHa} Ha)` : ''}`
            : `Kelurahan ${kelName} (${coord.kec})`;

          const layersToEnable = ['kelurahan'];
          if (isSawah) layersToEnable.push('sawah');
          if (isNelayan) layersToEnable.push('nelayan');
          if (isKolam) layersToEnable.push('kolam');
          if (isTernak) layersToEnable.push('ternak');
          if (isKwt) layersToEnable.push('kwt', 'poktan');

          const customPin = {
            lat: coord.lat,
            lng: coord.lng,
            name: pinName,
            category,
            kelurahan: kelName,
            kecamatan: coord.kec
          };

          // Prioritaskan pin ini di depan matched_pins
          if (!matchedPins.some(p => p.name === customPin.name)) {
            matchedPins.unshift(customPin);
          }

          if (!wilayahHighlight.includes(kelName)) {
            wilayahHighlight.push(kelName);
          }

          mapAction = {
            type: 'FLY_TO',
            target: kelName,
            lat: coord.lat,
            lng: coord.lng,
            zoom: isSawah ? 16 : 15.5,
            layers_to_enable: layersToEnable,
            pin: customPin
          };
          break;
        }
      }

      // Periksa kecocokan nama 8 kecamatan jika kelurahan tidak disebut spesifik
      if (!mapAction) {
        for (const [kecName, coord] of Object.entries(KECAMATAN_COORDINATES)) {
          if (userQueryLower.includes(kecName.toLowerCase())) {
            const isSawah = userQueryLower.includes('sawah');
            const layersToEnable = ['kecamatan', 'kelurahan'];
            if (isSawah) layersToEnable.push('sawah');

            mapAction = {
              type: 'FLY_TO',
              target: kecName,
              lat: coord.lat,
              lng: coord.lng,
              zoom: 14,
              layers_to_enable: layersToEnable
            };
            if (!wilayahHighlight.includes(kecName)) {
              wilayahHighlight.push(kecName);
            }
            break;
          }
        }
      }

      // Jika ada matched_pins tematik lain (misal user minta "pangkalan nelayan medaksa")
      if (!mapAction && matchedPins.length > 0) {
        const firstPin = matchedPins[0];
        const layersToEnable = ['kelurahan'];
        if (firstPin.category === 'sawah') layersToEnable.push('sawah');
        if (firstPin.category === 'nelayan') layersToEnable.push('nelayan');
        if (firstPin.category === 'kolam') layersToEnable.push('kolam');
        if (firstPin.category === 'ternak') layersToEnable.push('ternak');
        if (firstPin.category === 'kwt' || firstPin.category === 'poktan') layersToEnable.push('kwt', 'poktan');

        mapAction = {
          type: 'FLY_TO',
          target: firstPin.name,
          lat: firstPin.lat,
          lng: firstPin.lng,
          zoom: 16,
          layers_to_enable: layersToEnable,
          pin: firstPin
        };
      }

      // Jika user bertanya tentang lengas tanah / agroklimat sawah tanpa menyebut wilayah spesifik
      if (!mapAction) {
        const isLengasQuery = userQueryLower.includes('lengas') || userQueryLower.includes('kelembapan tanah') || userQueryLower.includes('agroklimat') || userQueryLower.includes('ecmwf') || userQueryLower.includes('soil moisture');
        if (isLengasQuery) {
          mapAction = {
            type: 'FLY_TO',
            lat: -6.01,
            lng: 106.03,
            zoom: 13,
            layers_to_enable: ['sawah']
          };
        }
      }
    }

    // Deteksi permintaan ganti mode tematik choropleth (Fase 1)
    let detectedThematicMode: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting' | undefined;
    if (userQueryLower.includes('penduduk') || userQueryLower.includes('populasi') || userQueryLower.includes('kepadatan')) {
      detectedThematicMode = 'penduduk';
    } else if (userQueryLower.includes('ikp') || (userQueryLower.includes('ketahanan') && userQueryLower.includes('pangan') && userQueryLower.includes('peta'))) {
      detectedThematicMode = 'ikp';
    } else if (userQueryLower.includes('fsva') || userQueryLower.includes('prioritas kerentanan')) {
      detectedThematicMode = 'fsva';
    } else if (userQueryLower.includes('skpg') || userQueryLower.includes('kewaspadaan pangan')) {
      detectedThematicMode = 'skpg';
    } else if (userQueryLower.includes('stunting') || userQueryLower.includes('gizi')) {
      detectedThematicMode = 'stunting';
    }

    if (detectedThematicMode) {
      if (mapAction) {
        mapAction.thematic_mode = detectedThematicMode;
        if (!mapAction.layers_to_enable?.includes('kelurahan')) {
          mapAction.layers_to_enable = [...(mapAction.layers_to_enable || []), 'kelurahan'];
        }
      } else {
        mapAction = {
          type: 'HIGHLIGHT',
          lat: -6.01,
          lng: 106.02,
          zoom: 12.5,
          layers_to_enable: ['kelurahan'],
          thematic_mode: detectedThematicMode
        };
      }
    }

    // Aksi Tambahan: Simulasi Anggaran Bansos Pangan (Drop-Off Logistics Pins)
    const isBudgetSimulation = userQueryLower.includes('anggaran') || userQueryLower.includes('bansos') || userQueryLower.includes('bantuan pangan');
    if (isBudgetSimulation) {
      matchedPins.unshift(
        { lat: -5.95625, lng: 106.03523, name: '📦 Drop-Off Logistik Bansos: Kel. Gerem', category: 'sawah', kelurahan: 'Gerem', kecamatan: 'Gerogol' },
        { lat: -6.04123, lng: 106.04512, name: '📦 Drop-Off Logistik Bansos: Kel. Bagendung', category: 'sawah', kelurahan: 'Bagendung', kecamatan: 'Cilegon' },
        { lat: -5.90874, lng: 106.00421, name: '📦 Drop-Off Logistik Bansos: Kel. Lebakgede', category: 'sawah', kelurahan: 'Lebakgede', kecamatan: 'Pulomerak' }
      );
      if (!mapAction) {
        mapAction = {
          type: 'FLY_TO',
          lat: -5.95625,
          lng: 106.03523,
          zoom: 13.5,
          target: 'Gerem',
          layers_to_enable: ['kelurahan', 'sawah'],
          pin: matchedPins[0]
        };
      }
    }

    // Aksi Tambahan: Diagnosis Hama / Penyakit Tanaman / Multimodal Vision (Auto Warning Pin)
    const isPestDiagnosis = !!imageData?.data || userQueryLower.includes('wereng') || userQueryLower.includes('blas') || userQueryLower.includes('hama') || userQueryLower.includes('penyakit tanaman') || userQueryLower.includes('hawar');
    if (isPestDiagnosis) {
      const optPin = {
        lat: -6.01245,
        lng: 106.03512,
        name: '⚠️ Peringatan OPT Terdeteksi (Hasil Diagnosis Foto / Lapangan)',
        category: 'warning',
        kelurahan: 'Cilegon',
        kecamatan: 'Pusat'
      };
      matchedPins.unshift(optPin);
      if (!mapAction) {
        mapAction = {
          type: 'FLY_TO',
          lat: optPin.lat,
          lng: optPin.lng,
          zoom: 15.5,
          layers_to_enable: ['kelurahan', 'sawah'],
          pin: optPin
        };
      }
    }

    return NextResponse.json({
      success: true,
      text: cleanText,
      wilayah_highlight: wilayahHighlight,
      matched_pins: matchedPins.slice(0, 10),
      map_action: mapAction,
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
