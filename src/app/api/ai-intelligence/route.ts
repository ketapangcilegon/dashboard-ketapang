import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchKnowledgeBase, MatchedKnowledgeChunk } from '@/app/api/knowledge/search/route';
import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';

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
  // 1. DATA PERTANIAN & KEPENDUDUKAN SE-KOTA CILEGON (LBS 2025 GIS & FSVA 2025)
  // ============================================================
  lines.push('=== 1. DATA PERTANIAN (SAWAH) & JUMLAH PENDUDUK PER KECAMATAN & KELURAHAN (LBS 2025 GIS & FSVA 2025) ===');
  lines.push('• Total Luas Sawah Baku: 1.151,97 Ha (407 Petak Poligon GIS)');
  lines.push('• Total Jumlah Penduduk Kota Cilegon: 480.378 Jiwa');
  lines.push('• Produksi GKG (Gabah Kering Giling): 308.6 Ton | Luas Tanam: 0.57 Ha | Siap Panen: 0.57 Ha');
  lines.push('• Varietas Padi Utama: Ciherang, IR64, Inpari 32 (Rata-rata Ubinan: 4.5 ton/ha)');
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
   - **Pertanian, Sawah & Kependudukan**: Total Luas Sawah 1.151,97 Ha (407 Petak Poligon GIS), Total Penduduk Kota Cilegon 480.378 Jiwa (FSVA 2025 / Dukcapil 2025), Produksi GKG 308.6 Ton, Luas Tanam 0,57 Ha, Siap Panen 0,57 Ha, Varietas Ciherang, IR64, Inpari 32, Ubinan 4.5 ton/ha.
   - **Perikanan Tangkap**: 715 Nelayan, 9 Pangkalan/TPI, 410 Kapal Motor Tempel, Produksi Bulanan 73 Kg, Omset Bulanan Rp 2.555.000, Produksi 2026 136 Kg, Omset 2026 Rp 4.760.000. Ikan Kuwe (50kg @ Rp 35rb di Tanjung Leneng), Kerapu (23kg @ Rp 80rb di Medaksa), Tenggiri (63kg @ Rp 80rb di Terate). Pangkalan: Tanjung Peni, Lelean, Kaltex, Mabak, Suralaya, Lebak Gede, Tanjung Leneng, Medaksa, Terate.
   - **Perikanan Budidaya**: 2 Unit Pembudidaya Aktif, Luas Kolam 270 m² (Kolam Tanah 120 m², Kolam Terpal 150 m²), Produksi Bulanan 55 Kg, Omset Bulanan Rp 200.000, Produksi 2026 375 Kg. Pembenihan Gurame 1.000 ekor @ Rp 200 (Omset Rp 200.000), Pembesaran Lele 55 kg. Pembudidaya Nurholis (170 m² di Citangkil/Cilegon) dan tes (100 m²).
   - **KWT (Kelompok Wanita Tani)**: 3 KWT, 79 Anggota, Luas Lahan 0,02 Ha (200 m²), Produksi Bulanan 7 Kg, Omset Bulanan Rp 140.000. KWT Gerogol (23 anggota, lahan 150 m², Cabai 2 kg @ Rp 45.000 -> Omset Rp 90.000), KWT Gerem (23 anggota, lahan 50 m², Sayuran 5 kg @ Rp 10.000 -> Omset Rp 50.000), KWT Kotabumi (33 anggota).
   - **Peternakan**: Populasi 4 Ekor, 2 Kelompok Peternak di Kelurahan Masigit Kec. Jombang, Estimasi Nilai Rp 44.000.000 (2 Sapi @ Rp 20 Jt = Rp 40 Jt, 2 Kambing @ Rp 2 Jt = Rp 4 Jt, Unggas -).
3. **Knowledge Base Dokumen** — kumpulan dokumen resmi (Peraturan/UU, laporan tahunan, pedoman teknis) yang telah diindeks ke sistem.

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia yang formal, presisi, analitis, dan solutif.
- Gunakan data angka resmi di atas secara akurat, konsisten, dan TIDAK BOLEH MENGARANG ANGKA.
- Jika pengguna meminta tabel luas lahan sawah dan/atau jumlah penduduk per kelurahan dan kecamatan, WAJIB menyajikan tabel Markdown lengkap merinci seluruh 8 kecamatan dan seluruh kelurahannya dengan kolom: No, Kecamatan, Kelurahan, Luas Sawah (Ha), Jumlah Petak, dan Jumlah Penduduk (Jiwa) sesuai angka resmi.
- Jika pengguna meminta tabel, rekap data, atau perbandingan (nelayan/kolam/KWT/ternak/sawah/penduduk), SELALU sajikan dalam format Markdown Table yang rapi dan terstruktur (| ... |).
- ATURAN TAGGING PETA & KONTROL GIS REALTIME:
  * Panel chat Anda terhubung realtime dengan panel Peta GIS di sebelah kiri!
  * Gunakan format [KECAMATAN:NamaKecamatan] atau [KELURAHAN:NamaKelurahan] untuk setiap nama kecamatan atau kelurahan di Cilegon yang relevan.
  * Jika pengguna meminta untuk zoom/melihat/fokus/menandai/menaruh pin di suatu kelurahan, sawah, atau lokasi nelayan/kolam (contoh: "zoom ke sawah di kelurahan samangraya", "berikan pin di peta", "tampilkan pangkalan nelayan"):
    Konfirmasikan dengan ramah bahwa peta di panel kiri telah otomatis diarahkan (flyTo zoom) langsung ke lokasi tersebut, layer yang relevan (seperti layer sawah/nelayan/kolam) telah diaktifkan, dan pin penanda interaktif telah ditancapkan di peta.
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

    // 7. Ekstrak pin lokasi tematik Serumpun Padi jika cocok dengan pertanyaan / jawaban
    const matchedPins: Array<{ lat: number; lng: number; name: string; category: string; kelurahan: string; kecamatan: string }> = [];
    const userQueryLower = userMessage.toLowerCase();
    const rawTextLower = rawText.toLowerCase();
    const combinedText = userQueryLower + ' ' + rawTextLower;

    // Database lengkap Pin Tematik Serumpun Padi Cilegon
    const allThematicPins = [
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

      const kelurahanMatch = (userQueryLower.includes(kelLower) || userQueryLower.includes(kecLower)) && (isNelayanQuery || isKwtQuery || isPoktanQuery || isKolamQuery || isTernakQuery || isHortiQuery);

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
      }
    }

    // 8. Deteksi Interaksi & Aksi Peta Real-Time (Map Actions)
    let mapAction: {
      type: 'FLY_TO' | 'RESET' | 'HIGHLIGHT';
      target?: string;
      lat?: number;
      lng?: number;
      zoom?: number;
      layers_to_enable?: string[];
      thematic_mode?: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting';
      pin?: {
        lat: number;
        lng: number;
        name: string;
        category: string;
        kelurahan: string;
        kecamatan: string;
      };
    } | null = null;

    const isResetQuery = userQueryLower.includes('reset') || userQueryLower.includes('seluruh cilegon') || userQueryLower.includes('semua wilayah');

    if (isResetQuery) {
      mapAction = {
        type: 'RESET',
        lat: -6.01,
        lng: 106.02,
        zoom: 12.5,
        layers_to_enable: ['kelurahan', 'kecamatan', 'sawah']
      };
    } else {
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
