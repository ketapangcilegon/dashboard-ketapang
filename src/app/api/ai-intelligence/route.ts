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


// ============================================================
// Helper untuk memuat 11 Tabel Resmi Profil Perikanan Kota Cilegon 2025
// ============================================================
async function getPerikananDatabaseContext(): Promise<string> {
  const lines: string[] = [];

  try {
    const [
      rekapRes,
      tahunanRes,
      bulananRes,
      distribusiRes,
      pangkalanRes,
      kapalRes,
      usahaRes,
      asuransiRes,
      koperasiRes,
      kubRes,
      anggaranRes
    ] = await Promise.allSettled([
      supabase.from('perikanan_rekap_potensi').select('*').order('no', { ascending: true }),
      supabase.from('perikanan_produksi_tahunan').select('*').order('tahun', { ascending: true }),
      supabase.from('perikanan_produksi_bulanan').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_nelayan_distribusi').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_pangkalan_nelayan').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_armada_kapal').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_armada_jenis_usaha').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_asuransi_nelayan').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_koperasi').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_kub').select('*').order('id', { ascending: true }),
      supabase.from('perikanan_anggaran_program').select('*').order('id', { ascending: true })
    ]);

    lines.push('=== DATA RESMI 11 TABEL PROFIL PERIKANAN KOTA CILEGON 2025 ===');

    // 1. REKAP POTENSI PERIKANAN (perikanan_rekap_potensi)
    lines.push('\n[TABEL 1: perikanan_rekap_potensi]');
    lines.push('19 Indikator Makro Potensi Kelautan & Perikanan Kota Cilegon (2025):');
    lines.push('• Nelayan: 723 Orang');
    lines.push('• Koperasi Nelayan: 3 Koperasi');
    lines.push('• Kelompok Usaha Bersama (KUB) Nelayan: 58 KUB');
    lines.push('• Pangkalan Nelayan: 8 Pangkalan (9 termasuk Pangkalan Terate)');
    lines.push('• Kapal / Perahu Perikanan: 410 Unit Perahu');
    lines.push('• Alat Tangkap: 425 Buah (Pancing 422, Bagan Tancap 3)');
    lines.push('• Pembudidaya Ikan Kota Cilegon: 395 Orang');
    lines.push('• Kelompok Pembudidaya Ikan (POKDAKAN): 28 Pokdakan');
    lines.push('• Pembudidaya Pembesaran Lele: 360 Orang');
    lines.push('• Pembudidaya Pembenihan Lele: 30 Orang');
    lines.push('• Luas Kolam Budidaya: 37.461 m²');
    lines.push('• Pelaku Usaha Ikan Hias: 45 Orang (Pembudidaya Ikan Hias: 6 Orang)');
    lines.push('• Pengolah Hasil Perikanan: 131 Orang');
    lines.push('• Kelompok Pengolah & Pemasar (POKLASHAR): 17 Kelompok');
    lines.push('• Produksi Budidaya 2024: 360,5 Ton/Tahun');
    lines.push('• Produksi Tangkap 2024: 237,1 Ton/Tahun');
    lines.push('• Jumlah Pulau di Cilegon: 5 Pulau');
    lines.push('• Panjang Garis Pantai Cilegon: 40,8 km');

    // 2. PRODUKSI TAHUNAN (perikanan_produksi_tahunan)
    lines.push('\n[TABEL 2: perikanan_produksi_tahunan]');
    lines.push('Realisasi Produksi Perikanan Tangkap vs Budidaya 6 Tahun Terakhir (2020–2025):');
    lines.push('• 2020: Tangkap 219,300 Ton | Budidaya 230,000 Ton | Total 449,300 Ton');
    lines.push('• 2021: Tangkap 238,400 Ton | Budidaya 262,000 Ton | Total 500,400 Ton');
    lines.push('• 2022: Tangkap 241,900 Ton | Budidaya 354,600 Ton | Total 596,500 Ton');
    lines.push('• 2023: Tangkap 240,130 Ton | Budidaya 371,630 Ton | Total 611,760 Ton (Puncak Produksi)');
    lines.push('• 2024: Tangkap 237,200 Ton | Budidaya 360,500 Ton | Total 597,700 Ton');
    lines.push('• 2025: Tangkap 238,864 Ton | Budidaya 361,455 Ton | Total 600,319 Ton');

    // 3. PRODUKSI BULANAN 2025 (perikanan_produksi_bulanan)
    lines.push('\n[TABEL 3: perikanan_produksi_bulanan]');
    lines.push('Rincian Produksi Bulanan Tahun 2025 (kg):');
    lines.push('• Ikan Air Tawar (Budidaya) - Total: 349.144 kg (349,14 Ton):');
    lines.push('  Jan: 31.422 kg | Feb: 29.462 kg | Mar: 29.720 kg | Apr: 27.570 kg | Mei: 29.656 kg | Jun: 33.210 kg | Jul: 35.550 kg (Puncak) | Agu: 32.365 kg | Sep: 30.126 kg | Okt: 24.811 kg | Nov: 22.810 kg | Des: 22.442 kg');
    lines.push('• Hasil Tangkapan di Laut - Total: 230.036 kg (230,04 Ton):');
    lines.push('  Jan: 11.464 kg | Feb: 15.834 kg | Mar: 17.476 kg | Apr: 23.582 kg | Mei: 22.654 kg | Jun: 23.167 kg | Jul: 24.654 kg | Agu: 22.476 kg | Sep: 25.732 kg (Puncak Musim Ikan) | Okt: 22.597 kg | Nov: 12.435 kg | Des: 7.965 kg');

    // 4. DISTRIBUSI NELAYAN (perikanan_nelayan_distribusi)
    lines.push('\n[TABEL 4: perikanan_nelayan_distribusi]');
    lines.push('Sebaran 723 Nelayan di 8 Kecamatan & 35 Kelurahan Kota Cilegon:');
    lines.push('1. Kecamatan Pulomerak: 306 Nelayan (Sentra Nelayan Terbesar Cilegon - 42,3%)');
    lines.push('   - Kelurahan Suralaya: 126 Nelayan');
    lines.push('   - Kelurahan Tamansari: 91 Nelayan');
    lines.push('   - Kelurahan Mekarsari: 65 Nelayan');
    lines.push('   - Kelurahan Lebak Gede: 24 Nelayan');
    lines.push('2. Kecamatan Grogol: 133 Nelayan');
    lines.push('   - Kelurahan Rawa Arum: 83 Nelayan');
    lines.push('   - Kelurahan Gerem: 47 Nelayan');
    lines.push('   - Kelurahan Grogol: 3 Nelayan');
    lines.push('3. Kecamatan Citangkil: 120 Nelayan');
    lines.push('   - Kelurahan Kebonsari: 40 Nelayan');
    lines.push('   - Kelurahan Warnasari: 26 Nelayan');
    lines.push('   - Kelurahan Semang Raya: 15 Nelayan');
    lines.push('   - Kelurahan Citangkil: 15 Nelayan');
    lines.push('   - Kelurahan LebakDenok: 12 Nelayan');
    lines.push('   - Kelurahan Deringo: 9 Nelayan');
    lines.push('   - Kelurahan Taman Baru: 3 Nelayan');
    lines.push('4. Kecamatan Ciwandan: 108 Nelayan');
    lines.push('   - Kelurahan Kepuh: 42 Nelayan');
    lines.push('   - Kelurahan Tegal Ratu: 26 Nelayan');
    lines.push('   - Kelurahan Randa Kari: 14 Nelayan');
    lines.push('   - Kelurahan Gunung Sugih: 9 Nelayan');
    lines.push('   - Kelurahan Banjarnegara: 9 Nelayan');
    lines.push('   - Kelurahan Kubang Sari: 8 Nelayan');
    lines.push('5. Kecamatan Cibeber: 20 Nelayan (Kedaleman 16, Cibeber 2, Kalitimbang 2)');
    lines.push('6. Kecamatan Purwakarta: 19 Nelayan (Kebon Dalem 15, Kota Bumi 2, Pabean 2, Purwakarta 0)');
    lines.push('7. Kecamatan Jombang: 10 Nelayan (Sukmajaya 3, Panggung Rawi 3, Jombang Wetan 2, Gedong Dalem 2)');
    lines.push('8. Kecamatan Cilegon: 7 Nelayan (Bendungan 4, Ciwaduk 1, Ketileng 1, Bagendung 1)');

    // 5 & 6. PANGKALAN NELAYAN & ARMADA KAPAL (perikanan_pangkalan_nelayan & perikanan_armada_kapal)
    lines.push('\n[TABEL 5 & 6: perikanan_pangkalan_nelayan & perikanan_armada_kapal]');
    lines.push('Sebaran Nelayan & Armada Kapal di 9 Pangkalan/Pesisir Kota Cilegon:');
    lines.push('1. Pangkalan Tanjung Peni (Citangkil): 191 Nelayan | 102 Perahu/Kapal (Pangkalan Terbesar)');
    lines.push('2. Pangkalan Suralaya (Pulomerak): 144 Nelayan | 67 Perahu/Kapal');
    lines.push('3. Pangkalan Lelean (Grogol): 110 Nelayan (asal Gerem) | 54 Perahu/Kapal');
    lines.push('4. Pangkalan Medaksa Seberang (Pulomerak): 76 Nelayan (asal Tamansari) | 52 Perahu/Kapal');
    lines.push('5. Pangkalan Tanjung Leneng (Ciwandan): 72 Nelayan | 64 Perahu/Kapal');
    lines.push('6. Pangkalan Pantai Mabak (Pulomerak): 65 Nelayan (asal Mekarsari) | 10 Perahu/Kapal');
    lines.push('7. Pangkalan Lebak Gede (Pulomerak): 24 Nelayan | 16 Perahu/Kapal');
    lines.push('8. Pangkalan Terate (Cibeber/Pesisir): 18 Nelayan | 5 Perahu/Kapal');
    lines.push('9. Pangkalan Kaltek (Pulomerak): 15 Nelayan (asal Tamansari) | 40 Perahu/Kapal');
    lines.push('• Total Seluruh Kapal/Perahu: 410 Unit (Dominasi Perahu Motor Tempel Ketingting)');

    // 7. ARMADA & JENIS USAHA PENANGKAPAN (perikanan_armada_jenis_usaha)
    lines.push('\n[TABEL 7: perikanan_armada_jenis_usaha]');
    lines.push('Rincian Alat Tangkap & Mesin Armada:');
    lines.push('• Pancing: Total 422 Unit (15 Perahu Tanpa Motor, 383 Mesin Tempel Ketingting, 19 Kapal Motor 0-5 GT, 5 Kapal Motor 5-10 GT)');
    lines.push('• Bagan Tancap: 3 Unit (Mesin Tempel)');
    lines.push('• Total Alat Tangkap Aktif: 425 Buah');

    // 8. ASURANSI NELAYAN (perikanan_asuransi_nelayan)
    lines.push('\n[TABEL 8: perikanan_asuransi_nelayan]');
    lines.push('Cakupan Asuransi Perlindungan Nelayan (BPAN):');
    lines.push('• 2015: 415 Nelayan');
    lines.push('• 2016: 311 Nelayan');
    lines.push('• 2018: 7 Nelayan | 2019: 155 Nelayan');
    lines.push('• 2024: 439 Nelayan (Dibiayai 100% dari APBD Kota Cilegon)');
    lines.push('• 2025: 652 Nelayan Tercover Asuransi (439 Nelayan didanai APBD Kota Cilegon + 213 Nelayan tambahan didanai APBD Provinsi Banten)');

    // 9. KOPERASI NELAYAN (perikanan_koperasi)
    lines.push('\n[TABEL 9: perikanan_koperasi]');
    lines.push('3 Koperasi Nelayan Resmi Kota Cilegon:');
    lines.push('1. Koperasi Konsumen Nelayan Tanjung Peni: Jl. Amerika II Tanjung Peni, Kel. Warnasari, Citangkil | Ketua: Ibrahim (087871170310) | 206 Anggota');
    lines.push('2. Koperasi Nelayan Tanjung Harapan Jaya: Link. Rombongan RT 01/01, Kel. Kepuh, Ciwandan | Ketua: Ajat (0858-8840-8496) | 45 Anggota');
    lines.push('3. Koperasi Nelayan Samudera Biru: Link. Baru, Kel. Kebon Dalem, Kec. Purwakarta | Ketua: Azis Sanjaya (0877-7117-0405) | 25 Anggota');

    // 10. KELOMPOK USAHA BERSAMA NELAYAN (perikanan_kub)
    lines.push('\n[TABEL 10: perikanan_kub]');
    lines.push('58 Kelompok Usaha Bersama (KUB) Nelayan di Kota Cilegon (Seluruhnya Berstatus Aktif & Kelas Pemula):');
    lines.push('• Kecamatan Pulomerak (21 KUB): KUB Bahari Kaltek (12 org), KUB Jaya Bahari (14 org), KUB Pandan Wangi (10 org), KUB Medaksa Bahari (16 org), KUB Mabak Raya (13 org), KUB Ratu Pantai (13 org), KUB Pancuran Jaya (12 org), KUB Gunung Bahari (14 org), KUB Bintang Timur Makmur (12 org), KUB Alam Samudera (11 org), KUB Kaltek (14 org), KUB Sinar Bahari (12 org), KUB Nusa Mandala (12 org), KUB Mekar Wangi (12 org), KUB Putera Samudera (11 org), KUB Mitra Bahari (12 org), KUB Gunung Samudera (12 org), KUB Berkah Bahari (12 org), KUB Kelapa Tujuh (13 org), KUB Buah Kepudang (12 org), KUB Watu Ireng (13 org), KUB Pinggir Jintung (11 org), KUB Kali Kembu (10 org), KUB Pelandau (12 org), KUB Gunung Salak (13 org), KUB Suramina Bahari (11 org), KUB Tanjut Poejut (10 org), KUB Kali Kahal (10 org), KUB Ketapang (12 org).');
    lines.push('• Kecamatan Grogol (11 KUB): KUB Bahari Bersama (10 org), KUB Bintang Laut (15 org), KUB Nelayan Mandiri (12 org), KUB Bahari Sejahtera Lelean (10 org), KUB Mina Arum Bahari (10 org), KUB Bahari Selat Sunda (10 org), KUB Bubu Bahari Jaya (10 org), KUB Putra Bahari Lelean (10 org), KUB Bina Sejahtera Lelean (12 org), KUB Sri Gobel (11 org), KUB Bahari Sebrang Lelean (10 org).');
    lines.push('• Kecamatan Citangkil (11 KUB): KUB Layang Satu (10 org), KUB Mina Tanjung Peni (10 org), KUB Kerapu Macan (10 org), KUB Putra Tanjung I (10 org), KUB Mina Bahari (10 org), KUB Aka Abadi (10 org), KUB Lintas Pulau (10 org), KUB Karang Tanjung (14 org), KUB Berkah Mandiri (10 org), KUB Akur Abadi (14 org), KUB Tanjung Cemara (13 org).');
    lines.push('• Kecamatan Ciwandan (3 KUB): KUB Tanjung Harapan (13 org), KUB Harapan Jaya (10 org), KUB Tanjung Cayur (17 org).');
    lines.push('• Kecamatan Cibeber (1 KUB): KUB Sejahtera Mandiri (10 org, Kedaleman).');
    lines.push('• Kecamatan Purwakarta (2 KUB): KUB Samudera Biru (12 org, Kebondalem), KUB Bebuar Jaya (14 org, Kebondalem).');
    lines.push('• Kecamatan Cilegon (1 KUB): KUB Layang Empat (16 org, Ciwaduk).');

    // 11. ANGGARAN PROGRAM PERIKANAN (perikanan_anggaran_program)
    lines.push('\n[TABEL 11: perikanan_anggaran_program]');
    lines.push('Alokasi Anggaran Program Urusan Perikanan DKPP Kota Cilegon:');
    lines.push('1. Program Perikanan Tangkap: 2024: Rp 50.000.000 | 2025: Rp 85.971.000 | 2026: Rp 75.000.000');
    lines.push('2. Program Perikanan Budidaya: 2024: Rp 50.000.000 | 2025: Rp 86.447.000 | 2026: Rp 157.500.000 (Meningkat Signifikan)');
    lines.push('3. Program Pengolahan & Pemasaran Hasil Perikanan: 2025: Rp 39.593.000 | 2026: Rp 32.500.000');
    lines.push('4. Program Pengawasan Sumberdaya Kelautan & Perikanan (SDKP): 2026: Rp 7.500.000');

  } catch (err) {
    console.warn('[Perikanan Context Aggregator] Error building perikanan database context:', err);
  }

  return lines.join('\n');
}

// ============================================================
// Helper untuk memuat 9 Tabel Renstra DKPP & 84 KWT Kota Cilegon 2026
// ============================================================
async function getRenstraAndKwtDatabaseContext(): Promise<string> {
  const lines: string[] = [];

  try {
    const [
      kwtRes,
      tujuanRes,
      ikuRes,
      ikdRes,
      ikkRes,
      cascadingRes,
      prioritasRes
    ] = await Promise.allSettled([
      supabase.from('data_kwt_cilegon').select('*').order('id', { ascending: true }),
      supabase.from('renstra_tujuan_sasaran').select('*').order('id', { ascending: true }),
      supabase.from('renstra_iku').select('*').order('id', { ascending: true }),
      supabase.from('renstra_ikd').select('*').order('id', { ascending: true }),
      supabase.from('renstra_ikk').select('*').order('id', { ascending: true }),
      supabase.from('renstra_cascading_program').select('*').order('id', { ascending: true }),
      supabase.from('renstra_subkegiatan_prioritas').select('*').order('id', { ascending: true })
    ]);

    lines.push('=== DATA RESMI RENSTRA DKPP 2025-2030 & 84 KWT KOTA CILEGON 2026 ===');

    // 1. DATA KWT (KELOMPOK WANITA TANI) SE-KOTA CILEGON
    lines.push('\n[TABEL 1: data_kwt_cilegon (84 Kelompok Wanita Tani Aktif)]');
    lines.push('Sebaran dan Profil 84 Kelompok Wanita Tani (KWT) di 8 Kecamatan Kota Cilegon:');
    lines.push('• Total KWT Terdata: 84 Kelompok (Status 100% Aktif)');
    lines.push('• Bidang Usaha: Olahan Pertanian dan Penjualan Sayuran Pekarangan Lestari (P2L, P2KP)');
    lines.push('• Bantuan yang Diterima: Benih, Pupuk Organik, Media Tanam, dan Sarana Hidroponik/Polybag dari DKPP Kota Cilegon');
    lines.push('• Distribusi per Kecamatan:');
    lines.push('  1. Citangkil (19 KWT): KWT Mangga (Kebonsari), KWT Melati (Samangraya), KWT Mawar (Warnasari), KWT Anggrek (Tamanbaru), KWT Aster (Deringo), KWT Teratai, KWT Dahlia, KWT Nusa Indah, KWT Kenanga, KWT Cempaka, KWT Asoka, KWT Flamboyan, KWT Bougenville, KWT Kamboja, KWT Kemuning, KWT Lavender, KWT Sakura, KWT Tulip, KWT Melati Putih.');
    lines.push('  2. Ciwandan (15 KWT): KWT Harapan Baru (Kepuh), KWT Tunas Mandiri (Gunung Sugih), KWT Bina Sejahtera (Tegal Ratu), KWT Sumber Rezeki (Kubangsari), KWT Makmur Bersama (Banjarnegara), KWT Subur Asri (Randakari), KWT Melati Ciwandan, KWT Mawar Indah, KWT Flamboyan Ciwandan, KWT Kenanga Asri, KWT Cempaka Putih, KWT Dahlia Makmur, KWT Teratai Biru, KWT Aster Jaya, KWT Anggrek Ungu.');
    lines.push('  3. Cibeber (14 KWT): KWT Kembangwaluh (Cikerai), KWT Kedaleman Mandiri (Kedaleman), KWT Cibeber Asri (Cibeber), KWT Kalitimbang Jaya (Kalitimbang), KWT Sukmajaya Makmur, KWT Bagendung Hijau, KWT Harapan Kita, KWT Melati Cibeber, KWT Dahlia Asri, KWT Mawar Merah, KWT Teratai Indah, KWT Anggrek Cibeber, KWT Kenanga Jaya, KWT Flamboyan Indah.');
    lines.push('  4. Cilegon (10 KWT): KWT Ciwaduk Asri (Ciwaduk), KWT Bendungan Mandiri (Bendungan), KWT Ketileng Hijau (Ketileng), KWT Bagendung Makmur (Bagendung), KWT Ciwaduk Lestari, KWT Melati Cilegon, KWT Mawar Putih, KWT Anggrek Jaya, KWT Dahlia Hijau, KWT Kenanga Makmur.');
    lines.push('  5. Pulomerak (9 KWT): KWT Suralaya Asri (Suralaya), KWT Tamansari Mandiri (Tamansari), KWT Mekarsari Hijau (Mekarsari), KWT Lebakgede Makmur (Lebakgede), KWT Kaltek Bahari, KWT Medaksa Jaya, KWT Mabak Lestari, KWT Pancuran Asri, KWT Pelandau Mandiri.');
    lines.push('  6. Purwakarta (6 KWT): KWT Kebondalem Mandiri (Kebon Dalem), KWT Kotabumi Hijau (Kotabumi), KWT Pabean Asri (Pabean), KWT Purwakarta Jaya (Purwakarta), KWT Ramanuju Makmur, KWT Tegal Bunder Asri.');
    lines.push('  7. Grogol (6 KWT): KWT Gerogol (Gerogol), KWT Gerem Asri (Gerem), KWT Rawa Arum Mandiri (Rawa Arum), KWT Kotasari Hijau (Kotasari), KWT Lelean Jaya, KWT Grogol Makmur.');
    lines.push('  8. Jombang (5 KWT): KWT Jombang Wetan (Jombang Wetan), KWT Gedong Dalem (Gedong Dalem), KWT Sukmajaya Hijau (Sukmajaya), KWT Panggung Rawi (Panggung Rawi), KWT Masigit Mandiri (Masigit).');

    // 2. TUJUAN & SASARAN RENSTRA DKPP (renstra_tujuan_sasaran)
    lines.push('\n[TABEL 2: renstra_tujuan_sasaran]');
    lines.push('6 Sasaran Strategis DKPP Kota Cilegon (Baseline 2024 s.d. Target 2030):');
    lines.push('1. Peningkatan Kinerja Penyelenggaraan Pemerintahan: Indeks Reformasi Birokrasi (Baseline 2024: 44 poin, 2025: 48, 2026: 70 poin, 2027: 71, 2028: 71, 2029: 72, 2030: 72 poin).');
    lines.push('2. Peningkatan Kemandirian Pangan Daerah: Prevalensi Ketidakcukupan Konsumsi Pangan / PoU (Baseline 2024: 1.96%, 2025: 1.93%, 2026: 1.90%, 2027: 1.87%, 2028: 1.84%, 2029: 1.81%, 2030: 1.78%).');
    lines.push('3. Peningkatan Pertumbuhan Ekonomi Daerah: Jumlah Produksi Perikanan Tangkap (Baseline 2024: 237 Ton, 2025: 237, 2026: 237 Ton, 2027: 238, 2028: 239, 2029: 240, 2030: 241 Ton).');
    lines.push('4. Peningkatan Pertumbuhan Ekonomi Daerah: Jumlah Produksi Perikanan Budidaya (Baseline 2024: 360 Ton, 2025: 360, 2026: 360 Ton, 2027: 361, 2028: 362, 2029: 364, 2030: 365 Ton).');
    lines.push('5. Peningkatan Nilai Tambah Pertanian: Peningkatan Produksi Tanaman Pangan (Target pertumbuhan +1% per tahun secara konsisten).');
    lines.push('6. Peningkatan Nilai Tambah Pertanian: Peningkatan Produksi Hortikultura (Target pertumbuhan +1% per tahun secara konsisten).');

    // 3. INDIKATOR KINERJA UTAMA (renstra_iku)
    lines.push('\n[TABEL 3: renstra_iku]');
    lines.push('7 Indikator Kinerja Utama (IKU) Resmi DKPP Kota Cilegon:');
    lines.push('1. Kontribusi sektor pertanian terhadap PDRB: Baseline 2024 = 0.2178% | Target 2025 = 0.217% | 2026 = 0.217% | 2027 = 0.216% | 2028 = 0.216% | 2029 = 0.215% | 2030 = 0.215%');
    lines.push('2. Jumlah Produksi Perikanan Tangkap: Baseline = 237 Ton | 2026 = 237 Ton | 2030 = 241 Ton');
    lines.push('3. Indeks Reformasi Birokrasi Perangkat Daerah: Baseline = 44 poin | 2026 = 70 poin | 2030 = 72 poin');
    lines.push('4. Peningkatan Produksi Tanaman Pangan: Target tumbuh 1% per tahun');
    lines.push('5. Prevalensi Ketidakcukupan Konsumsi Pangan (PoU): Baseline = 1.96% | 2026 = 1.90% | 2030 = 1.78% (Tren Menurun Positif)');
    lines.push('6. Peningkatan Produksi Hortikultura: Target tumbuh 1% per tahun');
    lines.push('7. Jumlah Produksi Perikanan Budidaya: Baseline = 360 Ton | 2026 = 360 Ton | 2030 = 365 Ton');

    // 4. CASCADING PROGRAM & PAGU INDIKATIF (renstra_cascading_program)
    lines.push('\n[TABEL 4: renstra_cascading_program]');
    lines.push('20 Cascading Program, Indikator Sasaran, Target, dan Pagu Anggaran 2025-2030:');
    lines.push('1. Program Penunjang Urusan Pemerintahan Daerah (2.09.01): Tingkat Kepuasan Pegawai (Target 2026: 3.5 skor), Pagu 2025: Rp 14.848.970.000 | Pagu 2026: Rp 15.157.320.000 | Pagu 2027: Rp 15.483.350.000 | Pagu 2028: Rp 15.816.470.000 | Pagu 2029: Rp 15.816.060.000');
    lines.push('2. Indeks Pelayanan Publik Program Penunjang (2.09.01): Target 2026: 80%');
    lines.push('3. Tingkat Penerapan SPBE Perangkat Daerah (2.09.01): Target 2026: 60 skor');
    lines.push('4. Persentase BMD Baik & Termanfaatkan (2.09.01): Target 2026: 100%');
    lines.push('5. Program Pengelolaan Kerawanan Pangan (2.09.02): Persentase Daerah Rentan Rawan Pangan 100% | Pagu 2026: Rp 140.000.000 (Pagu 2027: Rp 140 jt, 2028: Rp 140 jt, 2029: Rp 140 jt)');
    lines.push('6. Program Pengawasan Keamanan Pangan (2.09.03): Persentase Pangan Segar Memenuhi Mutu Keamanan 86% | Pagu 2026: Rp 568.300.000 (Pagu 2027: Rp 596,7 jt, 2028: Rp 626,5 jt, 2029: Rp 626,5 jt)');
    lines.push('7. Program Pengelolaan Perikanan Budidaya - Nila (3.25.04): Target Produksi Nila 2,1 Ton | Pagu 2026: Rp 110.000.000');
    lines.push('8. Program Pengelolaan Perikanan Budidaya - Lele (3.25.04): Target Produksi Lele 358,9 Ton');
    lines.push('9. Program Penyediaan Sarana Pertanian - Padi (3.27.02): Target Produksi Padi 10.461 Ton | Pagu 2026: Rp 100.000.000');
    lines.push('10. Program Penyediaan Sarana Pertanian - Jagung (3.27.02): Target Produksi Jagung 150,8 Ton');
    lines.push('11. Program Penyediaan Sarana Pertanian - Bawang Merah (3.27.02): Target Produksi Bawang Merah 90,35 Ton');
    lines.push('12. Program Penyediaan Sarana Pertanian - Cabai (3.27.02): Target Produksi Cabai 107,65 Ton');
    lines.push('13. Program Penyediaan & Pengembangan Prasarana Pertanian (3.27.03): Cakupan LP2B Ditetapkan 55 Ha | Pagu 2026: Rp 125.000.000');
    lines.push('14. Program Penyediaan Prasarana (3.27.03): 1 Jenis Prasarana Terbangun');
    lines.push('15. Program Pengendalian Kesehatan Hewan & Kesmavet (3.27.04): Pengendalian PHMS (1 Dokumen) | Pagu 2026: Rp 350.000.000');
    lines.push('16. Sertifikasi Pra-NKV/NKV Unit Usaha Hewan (3.27.04): Target 100% Unit Usaha Tersertifikasi');
    lines.push('17. Program Penanggulangan Bencana Pertanian (3.27.05): Penanganan Bencana 100% | Pagu 2026: Rp 102.000.000');
    lines.push('18. Penanganan Dampak Perubahan Iklim (3.27.05): Penanganan 100%');
    lines.push('19. Program Perizinan Usaha Pertanian (3.27.06): 100% Izin Diterbitkan | Pagu 2026: Rp 25.000.000');
    lines.push('20. Program Penyuluhan Pertanian (3.27.07): 100% SDM Penyuluh Ditingkatkan | Pagu 2026: Rp 190.000.000');

    // 5. SUBKEGIATAN PRIORITAS DAERAH (renstra_subkegiatan_prioritas)
    lines.push('\n[TABEL 5: renstra_subkegiatan_prioritas]');
    lines.push('3 Subkegiatan Prioritas Daerah DKPP Kota Cilegon:');
    lines.push('1. Subkegiatan 3.25.04.2.02.0001: Pengembangan Kapasitas Pembudi Daya Ikan Kecil (Program Pengelolaan Perikanan Budidaya - Outcome: Meningkatnya produksi perikanan budidaya)');
    lines.push('2. Subkegiatan 3.27.02.2.01.0016: Pengawasan Penggunaan Sarana Pascapanen Hortikultura (Program Penyediaan dan Pengembangan Sarana Pertanian - Outcome: Meningkatnya distribusi dan kualitas sarana pertanian)');
    lines.push('3. Subkegiatan 3.27.02.2.02.0016: Pengawasan Penggunaan Sarana Pasca Panen Tanaman Pangan (Program Penyediaan dan Pengembangan Sarana Pertanian - Outcome: Meningkatnya distribusi dan kualitas sarana pertanian)');

    // 6. INDIKATOR KINERJA DAERAH & KUNCI (renstra_ikd & renstra_ikk)
    lines.push('\n[TABEL 6 & 7: renstra_ikd & renstra_ikk]');
    lines.push('Ringkasan 26 Indikator IKD & 31 Indikator IKK:');
    lines.push('• Skor Pola Pangan Harapan (PPH): Baseline 90.9 -> Target 2026: 91 -> Target 2030: 93');
    lines.push('• Prevalensi PoU: 1.96% -> 1.90% (2026) -> 1.78% (2030)');
    lines.push('• Kontribusi PDRB Pertanian: 0.2178% -> 0.217% (2026) -> 0.215% (2030)');
    lines.push('• Produksi Padi (10.461 Ton), Jagung (150,8 Ton), Bawang Merah (90,35 Ton), Cabai (107,65 Ton)');
    lines.push('• Perikanan Tangkap (237 Ton) & Budidaya (360 Ton)');

  } catch (err) {
    console.warn('[Renstra Context Aggregator] Error building renstra and kwt database context:', err);
  }

  return lines.join('\n');
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

    // 1. Load konteks dari SP cache, Database Beranda, 11 Tabel Perikanan, serta 9 Tabel Renstra & 84 KWT secara paralel
    const [spCtx, homepageDbNarrative, perikananNarrative, renstraAndKwtNarrative] = await Promise.all([
      getSpContextData(),
      getHomepageAndDatabaseContext(),
      getPerikananDatabaseContext(),
      getRenstraAndKwtDatabaseContext()
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
      'ketersediaan_pangan',
      'perikanan_rekap_potensi',
      'perikanan_produksi_tahunan',
      'perikanan_produksi_bulanan',
      'perikanan_nelayan_distribusi',
      'perikanan_pangkalan_nelayan',
      'perikanan_armada_kapal',
      'perikanan_armada_jenis_usaha',
      'perikanan_asuransi_nelayan',
      'perikanan_koperasi',
      'perikanan_kub',
      'perikanan_anggaran_program',
      'data_kwt_cilegon',
      'renstra_tujuan_sasaran',
      'renstra_iku',
      'renstra_ikd',
      'renstra_ikk',
      'renstra_cascading_program',
      'renstra_subkegiatan_prioritas',
      'renstra_program_kegiatan_pagu',
      'renstra_teknik_rumusan_pelayanan'
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
   - **Aspek Ketersediaan & Data Spasial GIS**: Total Luas Sawah Baku 1.151,97 Ha (407 petak GIS), produksi padi 13.772 Ton GKG (2025) / 8.816,83 Ton beras, buffer ubi kayu/singkong (2.007,6 Ton), serta **11 TABEL RESMI PROFIL PERIKANAN KOTA CILEGON 2025** (723 Nelayan, 395 Pembudidaya, 410 Kapal, 425 Alat Tangkap Pancing/Bagan, 58 KUB, 3 Koperasi Nelayan, 8-9 Pangkalan, 652 Nelayan Tercover Asuransi BPAN 2025, Total Produksi Ikan 2025: 600,319 Ton [Budidaya Air Tawar 361,455 Ton / 349.144 kg bulanan + Tangkap Laut 238,864 Ton / 230.036 kg bulanan], dan alokasi anggaran program perikanan 2024-2026).
   - **Rujukan 11 Tabel Perikanan**: Jika pengguna bertanya tentang data perikanan, nelayan, budidaya, kapal, KUB, pangkalan, asuransi nelayan, atau anggaran, Anda **WAJIB MERUJUK SECARA PERSIS** ke 11 tabel resmi perikanan Cilegon tersebut.
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

${perikananNarrative}

${renstraAndKwtNarrative}

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

      // ─── Koperasi Nelayan ───
      { lat: -5.98419, lng: 105.99079, name: 'Koperasi Konsumen Nelayan Tanjung Peni (206 Anggota)', category: 'nelayan', kelurahan: 'Warnasari', kecamatan: 'Citangkil' },
      { lat: -6.02121, lng: 105.95186, name: 'Koperasi Nelayan Tanjung Harapan Jaya (45 Anggota)', category: 'nelayan', kelurahan: 'Kepuh', kecamatan: 'Ciwandan' },
      { lat: -5.98765, lng: 106.04678, name: 'Koperasi Nelayan Samudera Biru (25 Anggota)', category: 'nelayan', kelurahan: 'Kebon Dalem', kecamatan: 'Purwakarta' },

      // ─── 84 KWT Resmi Kota Cilegon 2026 (data_kwt_cilegon) ───
      { lat: -6.0198729, lng: 106.0220361, name: 'KWT MANGGA', category: 'kwt', kelurahan: 'Kebonsari', kecamatan: 'Citangkil' },
      { lat: -6.0198729, lng: 106.0213361, name: 'KWT ROSELLA', category: 'kwt', kelurahan: 'Kebonsari', kecamatan: 'Citangkil' },
      { lat: -6.0190933, lng: 106.0412086, name: 'KWT MANGGIS', category: 'kwt', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.0096292, lng: 106.0446181, name: 'KWT PAKCOY', category: 'kwt', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.0190933, lng: 106.0405086, name: 'KWT SELADA', category: 'kwt', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.015477, lng: 106.0403824, name: 'KWT KANGKUNG', category: 'kwt', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.0353023, lng: 106.0672444, name: 'KWT TAMAN WARGA', category: 'kwt', kelurahan: 'Warnasari', kecamatan: 'Citangkil' },
      { lat: -6.0211533, lng: 106.0323972, name: 'KWT LIDAH BUAYA', category: 'kwt', kelurahan: 'Warnasari', kecamatan: 'Citangkil' },
      { lat: -6.0258906, lng: 106.0385799, name: 'KWT MAWAR', category: 'kwt', kelurahan: 'Taman Baru', kecamatan: 'Citangkil' },
      { lat: -6.0299491, lng: 106.0254219, name: 'KWT MELATI', category: 'kwt', kelurahan: 'Taman Baru', kecamatan: 'Citangkil' },
      { lat: -6.0236066, lng: 106.0326992, name: 'KWT EUNCUNG', category: 'kwt', kelurahan: 'Taman Baru', kecamatan: 'Citangkil' },
      { lat: -6.0396115, lng: 106.0308337, name: 'KWT BAYAM', category: 'kwt', kelurahan: 'Taman Baru', kecamatan: 'Citangkil' },
      { lat: -6.025101, lng: 106.0220575, name: 'SINTRONG', category: 'kwt', kelurahan: 'Citangkil', kecamatan: 'Citangkil' },
      { lat: -6.0325812, lng: 106.0185325, name: 'KWT CENGEK', category: 'kwt', kelurahan: 'Lebak Denok', kecamatan: 'Citangkil' },
      { lat: -6.0325812, lng: 106.0178325, name: 'KWT KATUK', category: 'kwt', kelurahan: 'Lebak Denok', kecamatan: 'Citangkil' },
      { lat: -6.0295182, lng: 106.0039258, name: 'KWT KACANG TUNGGAK', category: 'kwt', kelurahan: 'Deringo', kecamatan: 'Citangkil' },
      { lat: -6.0252898, lng: 106.0074646, name: 'KWT JUWET', category: 'kwt', kelurahan: 'Deringo', kecamatan: 'Citangkil' },
      { lat: -6.0129269, lng: 106.0104704, name: 'KWT ANGGREK', category: 'kwt', kelurahan: 'Samangraya', kecamatan: 'Citangkil' },
      { lat: -6.0115476, lng: 106.0032423, name: 'KWT KEMANGI', category: 'kwt', kelurahan: 'Samangraya', kecamatan: 'Citangkil' },
      { lat: -6.047336, lng: 105.9502709, name: 'KWT POJOK MARENGMANG LESTARI', category: 'kwt', kelurahan: 'Gunung Sugih', kecamatan: 'Ciwandan' },
      { lat: -6.0267362, lng: 105.9496331, name: 'KWT ROMBONGAN', category: 'kwt', kelurahan: 'Kepuh', kecamatan: 'Ciwandan' },
      { lat: -6.0429083, lng: 105.968982, name: 'KWT CIKENDAT INDAH', category: 'kwt', kelurahan: 'Kepuh', kecamatan: 'Ciwandan' },
      { lat: -6.0290386, lng: 105.9651806, name: 'KWT KEPUH LESTARI', category: 'kwt', kelurahan: 'Kepuh', kecamatan: 'Ciwandan' },
      { lat: -6.02688, lng: 105.9695585, name: 'KWT TUNAS BAROKAH', category: 'kwt', kelurahan: 'Randakari', kecamatan: 'Ciwandan' },
      { lat: -6.0279285, lng: 105.9866953, name: 'KWT RATU LESTARI', category: 'kwt', kelurahan: 'Tegal Ratu', kecamatan: 'Ciwandan' },
      { lat: -6.0211533, lng: 106.0316972, name: 'KWT PANDAN LESTARI', category: 'kwt', kelurahan: 'Tegal Ratu', kecamatan: 'Ciwandan' },
      { lat: -6.0176828, lng: 105.9784996, name: 'KWT TELANG', category: 'kwt', kelurahan: 'Tegal Ratu', kecamatan: 'Ciwandan' },
      { lat: -6.0214058, lng: 105.9799703, name: 'KWT CENDRAWASI', category: 'kwt', kelurahan: 'Tegal Ratu', kecamatan: 'Ciwandan' },
      { lat: -6.0327617, lng: 105.980891, name: 'KWT RATU HEBAT', category: 'kwt', kelurahan: 'Tegal Ratu', kecamatan: 'Ciwandan' },
      { lat: -5.9701872, lng: 106.012878, name: 'KWT ASOKA', category: 'kwt', kelurahan: 'Kubang Sari', kecamatan: 'Ciwandan' },
      { lat: -6.0163109, lng: 106.0006668, name: 'KWT KUBANG LESTARI', category: 'kwt', kelurahan: 'Kubang Sari', kecamatan: 'Ciwandan' },
      { lat: -6.0163109, lng: 105.9999668, name: 'KWT TERATAI INDAH', category: 'kwt', kelurahan: 'Kubang Sari', kecamatan: 'Ciwandan' },
      { lat: -6.0123494, lng: 105.9838489, name: 'KWT MELATI', category: 'kwt', kelurahan: 'Kubang Sari', kecamatan: 'Ciwandan' },
      { lat: -6.0350983, lng: 105.9984112, name: 'KWT TEMU GIRING BERSERI', category: 'kwt', kelurahan: 'Banjar Negara', kecamatan: 'Ciwandan' },
      { lat: -6.0482163, lng: 106.0338187, name: 'KWT KEMBANG SEPATU', category: 'kwt', kelurahan: 'Bagendung', kecamatan: 'Cilegon' },
      { lat: -6.0516486, lng: 106.0335556, name: 'KWT BUKIT ASRI', category: 'kwt', kelurahan: 'Bagendung', kecamatan: 'Cilegon' },
      { lat: -6.0313724, lng: 106.0409355, name: 'KWT NAGA JAYA', category: 'kwt', kelurahan: 'Ciwedus', kecamatan: 'Cilegon' },
      { lat: -6.0335257, lng: 106.0323158, name: 'KWT KEMUNING', category: 'kwt', kelurahan: 'Ciwedus', kecamatan: 'Cilegon' },
      { lat: -6.0393954, lng: 106.0390787, name: 'KWT RAKATA ASRI', category: 'kwt', kelurahan: 'Ciwedus', kecamatan: 'Cilegon' },
      { lat: -6.0335257, lng: 106.0316158, name: 'KWT BAYAM MERAH', category: 'kwt', kelurahan: 'Ciwedus', kecamatan: 'Cilegon' },
      { lat: -6.0247319, lng: 106.0499662, name: 'KWT SEJAHTERA', category: 'kwt', kelurahan: 'Ciwaduk', kecamatan: 'Cilegon' },
      { lat: -6.0219002, lng: 106.045661, name: 'KWT PUCUK MERAH', category: 'kwt', kelurahan: 'Ciwaduk', kecamatan: 'Cilegon' },
      { lat: -6.0338073, lng: 106.0540724, name: 'KWT SEJAHTERA', category: 'kwt', kelurahan: 'Bendungan', kecamatan: 'Cilegon' },
      { lat: -6.0234579, lng: 106.0549521, name: 'KWT MAKMUR', category: 'kwt', kelurahan: 'Ketileng', kecamatan: 'Cilegon' },
      { lat: -6.0330525, lng: 106.0677254, name: 'KWT KOBE', category: 'kwt', kelurahan: 'Cibeber', kecamatan: 'Cibeber' },
      { lat: -6.0355314, lng: 106.0668747, name: 'KWT MAWAR', category: 'kwt', kelurahan: 'Cibeber', kecamatan: 'Cibeber' },
      { lat: -6.0355314, lng: 106.0661747, name: 'KWT KENIKIR', category: 'kwt', kelurahan: 'Cibeber', kecamatan: 'Cibeber' },
      { lat: -6.0351814, lng: 106.0661747, name: 'KWT KEMUNING', category: 'kwt', kelurahan: 'Cibeber', kecamatan: 'Cibeber' },
      { lat: -6.1170548, lng: 106.1161987, name: 'KWT ANGGREK BULAN', category: 'kwt', kelurahan: 'Kedaleman', kecamatan: 'Cibeber' },
      { lat: -6.0329427, lng: 106.0787294, name: 'KWT MELATI', category: 'kwt', kelurahan: 'Kedaleman', kecamatan: 'Cibeber' },
      { lat: -6.0583926, lng: 106.0386187, name: 'KWT KEMBANGWALUH', category: 'kwt', kelurahan: 'Cikerai', kecamatan: 'Cibeber' },
      { lat: -6.0523061, lng: 106.0554357, name: 'KWT SIRSAK', category: 'kwt', kelurahan: 'Cikerai', kecamatan: 'Cibeber' },
      { lat: -6.0523061, lng: 106.0547357, name: 'KWT SRI REZEKI', category: 'kwt', kelurahan: 'Cikerai', kecamatan: 'Cibeber' },
      { lat: -6.054975, lng: 106.047281, name: 'KWT WIJAYA KUSUMA', category: 'kwt', kelurahan: 'Bulakan', kecamatan: 'Cibeber' },
      { lat: -6.0447172, lng: 106.0607399, name: 'KWT NUSA INDAH', category: 'kwt', kelurahan: 'Kalitimbang', kecamatan: 'Cibeber' },
      { lat: -6.0461774, lng: 106.0597485, name: 'KWT LEMBAYUNG', category: 'kwt', kelurahan: 'Kalitimbang', kecamatan: 'Cibeber' },
      { lat: -6.0385982, lng: 106.0524519, name: 'KWT SEDAP MALAM', category: 'kwt', kelurahan: 'Karang Asem', kecamatan: 'Cibeber' },
      { lat: -6.0385982, lng: 106.0517519, name: 'KWT TERATAI', category: 'kwt', kelurahan: 'Karang Asem', kecamatan: 'Cibeber' },
      { lat: -5.9923377, lng: 106.0289998, name: 'KWT KALIMAYA', category: 'kwt', kelurahan: 'Gedong Dalem', kecamatan: 'Jombang' },
      { lat: -5.9944012, lng: 106.0647433, name: 'KWT SIRIH MERAH', category: 'kwt', kelurahan: 'Gedong Dalem', kecamatan: 'Jombang' },
      { lat: -6.0031853, lng: 106.0699189, name: 'KWT KECOMBRANG MERAH', category: 'kwt', kelurahan: 'Panggung Rawi', kecamatan: 'Jombang' },
      { lat: -6.0220207, lng: 106.0668477, name: 'KWT KARYA ASIH', category: 'kwt', kelurahan: 'Masigit', kecamatan: 'Jombang' },
      { lat: -6.0220207, lng: 106.0661477, name: 'KWT NYIKEMBANG MEKAR JAYA', category: 'kwt', kelurahan: 'Sukmajaya', kecamatan: 'Jombang' },
      { lat: -5.9624364, lng: 106.0484922, name: 'KWT SINAR LESTARI', category: 'kwt', kelurahan: 'Pabean', kecamatan: 'Purwakarta' },
      { lat: -6.0208033, lng: 106.0316972, name: 'KWT DAHLIA', category: 'kwt', kelurahan: 'Tegal Bunder', kecamatan: 'Purwakarta' },
      { lat: -5.9926911, lng: 106.0486876, name: 'KWT WANITA KARYA', category: 'kwt', kelurahan: 'Kota Bumi', kecamatan: 'Purwakarta' },
      { lat: -5.9801016, lng: 106.0585933, name: 'KWT RIMBA SARI', category: 'kwt', kelurahan: 'Purwakarta', kecamatan: 'Purwakarta' },
      { lat: -6.0056434, lng: 106.0463346, name: 'KWT SEMANGAT BERSAMA', category: 'kwt', kelurahan: 'Kebon Dalem', kecamatan: 'Purwakarta' },
      { lat: -5.9923377, lng: 106.0282998, name: 'KWT LESTARI ALAM', category: 'kwt', kelurahan: 'Kebon Dalem', kecamatan: 'Purwakarta' },
      { lat: -5.9536263, lng: 106.0047439, name: 'CAHAYA MANDIRI', category: 'kwt', kelurahan: 'Gerem', kecamatan: 'Grogol' },
      { lat: -5.9663726, lng: 106.0230875, name: 'SEDAP MALAM', category: 'kwt', kelurahan: 'Gerem', kecamatan: 'Grogol' },
      { lat: -5.9842991, lng: 106.0508966, name: 'SURYA TANI MANDIRI', category: 'kwt', kelurahan: 'Rawa Arum', kecamatan: 'Grogol' },
      { lat: -5.9837655, lng: 106.0136676, name: 'TUNAS MUDA', category: 'kwt', kelurahan: 'Grogol', kecamatan: 'Grogol' },
      { lat: -5.9707048, lng: 106.0379362, name: 'ANGGUR', category: 'kwt', kelurahan: 'Grogol', kecamatan: 'Grogol' },
      { lat: -6.0069541, lng: 106.0575688, name: 'SEREH WANGI', category: 'kwt', kelurahan: 'Kota Sari', kecamatan: 'Grogol' },
      { lat: -5.8995288, lng: 106.027368, name: 'SURALAYA INDAH', category: 'kwt', kelurahan: 'Suralaya', kecamatan: 'Pulomerak' },
      { lat: -5.9210657, lng: 106.0026347, name: 'TANJUNG SEKONG', category: 'kwt', kelurahan: 'Lebak Gede', kecamatan: 'Pulomerak' },
      { lat: -5.9172046, lng: 106.030795, name: 'PENAWEN INDAH', category: 'kwt', kelurahan: 'Lebak Gede', kecamatan: 'Pulomerak' },
      { lat: -6.0243919, lng: 106.0509375, name: 'KELAPA BARIS INDAH', category: 'kwt', kelurahan: 'Lebak Gede', kecamatan: 'Pulomerak' },
      { lat: -5.9187478, lng: 106.0069189, name: 'BINANGKIT', category: 'kwt', kelurahan: 'Lebak Gede', kecamatan: 'Pulomerak' },
      { lat: -5.9348448, lng: 106.0068547, name: 'MEKARSARI BERSINAR', category: 'kwt', kelurahan: 'Mekarsari', kecamatan: 'Pulomerak' },
      { lat: -5.9353553, lng: 106.0035001, name: 'ALMUJAHIDIN', category: 'kwt', kelurahan: 'Mekarsari', kecamatan: 'Pulomerak' },
      { lat: -5.9827243, lng: 106.008474, name: 'BUNGA TAMANSARI', category: 'kwt', kelurahan: 'Taman Sari', kecamatan: 'Pulomerak' },
      { lat: -5.9421071, lng: 106.0021872, name: 'SEJAHTERA INDAH', category: 'kwt', kelurahan: 'Taman Sari', kecamatan: 'Pulomerak' },
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
