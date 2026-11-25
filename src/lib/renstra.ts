import { supabase } from './supabase';

/**
 * renstra.ts
 * Integrasi Renstra (Rencana Strategis) DKPP Kota Cilegon 2025-2030.
 * Mendukung query langsung ke tabel Supabase `renstra_*` JIKA sudah dibuat,
 * sekaligus memiliki Fallback Master Data Resmi 100% akurat (0 error jika tabel belum dibuat di Supabase Ketapang).
 */

export interface RenstraData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tujuanSasaran: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cascading: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prioritas: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iku: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ikk: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ikd: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paguSearchResults: any[];
  fromLiveTables: boolean;
}

export function isRenstraQuery(q: string): boolean {
  const lq = q.toLowerCase();
  const keywords = [
    'renstra', 'rencana strategis', 'rpjmd', 'program', 'kegiatan', 'subkegiatan', 'sub kegiatan',
    'iku', 'ikk', 'ikd', 'indikator kinerja', 'pagu', 'anggaran', 'tujuan', 'sasaran',
    'prioritas daerah', 'target 2025', 'target 2026', 'target 2027', 'target 2028', 'target 2029', 'target 2030',
    'keamanan pangan', 'penyuluhan', 'lahan lp2b', 'lp2b', 'reformasi birokrasi',
    'sakip', 'phms', 'nkv', 'uptd', 'rph', 'puskeswan', 'cascading'
  ];
  return keywords.some(k => lq.includes(k));
}

function formatRupiah(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '-';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

const FALLBACK_RENSTRA_SUMMARY = `=== BASIS DATA RESMI RENSTRA DKPP KOTA CILEGON (2025 - 2030) ===

[A. 6 TUJUAN & SASARAN STRATEGIS RENSTRA DKPP (TABEL 3.3)]:
1. Peningkatan Kinerja Penyelenggaraan Pemerintahan Daerah -> Indeks Reformasi Birokrasi Perangkat Daerah (Baseline 2024: 44 poin | Target 2025: 48 | 2026: 70 | 2027: 71 | 2028: 71 | 2029: 72 | 2030: 72 poin).
2. Peningkatan Kemandirian & Ketahanan Pangan Daerah -> Prevalensi Ketidakcukupan Konsumsi Pangan / PoU (Baseline 2024: 1,96% | Target 2025: 1,93% | 2026: 1,90% | 2027: 1,87% | 2028: 1,84% | 2029: 1,81% | 2030: 1,78% — semakin rendah semakin baik).
3. Peningkatan Pertumbuhan Ekonomi Sektor Perikanan -> Jumlah Produksi Perikanan Tangkap (Baseline 2024: 237 Ton | 2026: 237 Ton | 2027: 238 Ton | 2028: 239 Ton | 2029: 240 Ton | 2030: 241 Ton).
4. Peningkatan Pertumbuhan Ekonomi Sektor Perikanan -> Jumlah Produksi Perikanan Budidaya (Baseline 2024: 360 Ton | 2026: 360 Ton | 2027: 361 Ton | 2028: 362 Ton | 2029: 364 Ton | 2030: 365 Ton).
5. Peningkatan Nilai Tambah Pertanian -> Pertumbuhan Produksi Tanaman Pangan (+1% per tahun secara berkelanjutan).
6. Peningkatan Nilai Tambah Pertanian -> Pertumbuhan Produksi Hortikultura (+1% per tahun secara berkelanjutan).

[B. 7 INDIKATOR KINERJA UTAMA (IKU) RESMI DKPP KOTA CILEGON (TABEL 4.5)]:
1. Kontribusi sektor pertanian terhadap PDRB: Baseline 2024 = 0,2178% | Target 2025 = 0,217% | 2026 = 0,217% | 2027 = 0,216% | 2028 = 0,216% | 2029 = 0,215% | 2030 = 0,215%
2. Jumlah Produksi Perikanan Tangkap: Baseline = 237 Ton | 2026 = 237 Ton | 2030 = 241 Ton
3. Indeks Reformasi Birokrasi Perangkat Daerah: Baseline = 44 poin | 2026 = 70 poin | 2030 = 72 poin
4. Peningkatan Produksi Tanaman Pangan: Target tumbuh +1% per tahun
5. Prevalensi Ketidakcukupan Konsumsi Pangan (PoU): Baseline = 1,96% | 2026 = 1,90% | 2030 = 1,78%
6. Peningkatan Produksi Hortikultura: Target tumbuh +1% per tahun
7. Jumlah Produksi Perikanan Budidaya: Baseline = 360 Ton | 2026 = 360 Ton | 2030 = 365 Ton

[C. CASCADING PROGRAM & PAGU INDIKATIF UTAMA DKPP 2025-2029 (TABEL 4.1)]:
1. Program Penunjang Urusan Pemerintahan Daerah (2.09.01): Pagu 2025: Rp 14.848.970.000 | Pagu 2026: Rp 15.157.320.000 | Pagu 2027: Rp 15.483.350.000 | Pagu 2028: Rp 15.816.470.000 | Pagu 2029: Rp 15.816.060.000
2. Program Pengelolaan Sumber Daya Ekonomi untuk Kedaulatan & Kemandirian Pangan / Kerawanan Pangan (2.09.02): Persentase Penanganan Daerah Rentan Rawan Pangan 100% | Pagu 2026: Rp 140.000.000
3. Program Peningkatan Diversifikasi & Ketahanan Pangan Masyarakat / Pengawasan Keamanan Pangan (2.09.03): Persentase Pangan Segar Memenuhi Syarat Mutu & Keamanan 86% | Skor PPH Target 2026: 91,0 -> 2030: 93,0 | Pagu 2026: Rp 568.300.000 (2027: Rp 596,7 jt, 2028: Rp 626,5 jt)
4. Program Pengelolaan Perikanan Tangkap: Pagu 2025: Rp 85.971.000 | Pagu 2026: Rp 75.000.000
5. Program Pengelolaan Perikanan Budidaya (3.25.04): Target Nila 2,1 Ton & Lele 358,9 Ton | Pagu 2026: Rp 157.500.000 (Cascading Budidaya Indikatif Rp 110.000.000)
6. Program Pengolahan & Pemasaran Hasil Perikanan: Pagu 2025: Rp 39.593.000 | Pagu 2026: Rp 32.500.000
7. Program Pengawasan Sumber Daya Kelautan & Perikanan (SDKP): Pagu 2026: Rp 7.500.000
8. Program Penyediaan & Pengembangan Sarana Pertanian (3.27.02): Target Padi 10.461 Ton, Jagung 150,8 Ton, Bawang Merah 90,35 Ton, Cabai 107,65 Ton | Pagu 2026: Rp 100.000.000
9. Program Penyediaan & Pengembangan Prasarana Pertanian (3.27.03): Cakupan LP2B Ditetapkan 55 Ha | Pagu 2026: Rp 125.000.000
10. Program Pengendalian Kesehatan Hewan & Kesmavet (3.27.04): Pengendalian PHMS & Sertifikasi Pra-NKV/NKV 100% | Pagu 2026: Rp 350.000.000
11. Program Penanggulangan Bencana Pertanian (3.27.05): Penanganan Dampak Iklim/Bencana 100% | Pagu 2026: Rp 102.000.000
12. Program Perizinan Usaha Pertanian (3.27.06): 100% Izin Terbit | Pagu 2026: Rp 25.000.000
13. Program Penyuluhan Pertanian (3.27.07): Peningkatan Kapasitas SDM Penyuluh & Kelembagaan Petani/KWT 100% | Pagu 2026: Rp 190.000.000

[D. 3 SUBKEGIATAN PRIORITAS DAERAH DKPP (TABEL 4.4)]:
1. 3.25.04.2.02.0001 — Pengembangan Kapasitas Pembudi Daya Ikan Kecil (Outcome: Meningkatnya produksi perikanan budidaya).
2. 3.27.02.2.01.0016 — Pengawasan Penggunaan Sarana Pascapanen Hortikultura (Outcome: Meningkatnya distribusi dan kualitas sarana pertanian).
3. 3.27.02.2.02.0016 — Pengawasan Penggunaan Sarana Pascapanen Tanaman Pangan (Outcome: Meningkatnya distribusi dan kualitas sarana pertanian).`;

export async function fetchRenstraData(query?: string): Promise<RenstraData> {
  const lq = (query || '').toLowerCase().trim();

  try {
    const [
      { data: tujuanSasaran, error: errTujuan },
      { data: cascading },
      { data: prioritas },
      { data: iku },
      { data: ikk },
      { data: ikd },
    ] = await Promise.all([
      supabase.from('renstra_tujuan_sasaran').select('*').limit(20),
      supabase.from('renstra_cascading_program').select('*').limit(30),
      supabase.from('renstra_subkegiatan_prioritas').select('*').limit(20),
      supabase.from('renstra_iku').select('*').limit(20),
      supabase.from('renstra_ikk').select('*').limit(50),
      supabase.from('renstra_ikd').select('*').limit(50),
    ]);

    // Jika tabel belum ada di Supabase Ketapang, kembalikan flag fromLiveTables = false agar fallback dipakai tanpa query berulang
    if (errTujuan || ((!tujuanSasaran || tujuanSasaran.length === 0) && (!iku || iku.length === 0))) {
      return {
        tujuanSasaran: [],
        cascading: [],
        prioritas: [],
        iku: [],
        ikk: [],
        ikd: [],
        paguSearchResults: [],
        fromLiveTables: false,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paguSearchResults: any[] = [];
    if (lq && lq.length > 2) {
      const words = lq
        .split(/\s+/)
        .filter(w => w.length > 3 && !['berapa', 'apakah', 'bagaimana', 'tampilkan', 'minta', 'data', 'pada', 'yang', 'untuk', 'kota', 'cilegon'].includes(w))
        .slice(0, 4);
      const searchTerms = words.length > 0 ? words : [lq];

      let queryBuilder = supabase.from('renstra_program_kegiatan_pagu').select('*');
      if (searchTerms.length === 1) {
        queryBuilder = queryBuilder.or(`kode_uraian.ilike.%${searchTerms[0]}%,indikator.ilike.%${searchTerms[0]}%,perangkat_daerah.ilike.%${searchTerms[0]}%`);
      } else {
        const orConditions = searchTerms.map(term => `kode_uraian.ilike.%${term}%,indikator.ilike.%${term}%`).join(',');
        queryBuilder = queryBuilder.or(orConditions);
      }
      const { data: searchData } = await queryBuilder.limit(20);
      paguSearchResults = searchData || [];
    }

    return {
      tujuanSasaran: tujuanSasaran || [],
      cascading: cascading || [],
      prioritas: prioritas || [],
      iku: iku || [],
      ikk: ikk || [],
      ikd: ikd || [],
      paguSearchResults,
      fromLiveTables: true,
    };
  } catch {
    return {
      tujuanSasaran: [],
      cascading: [],
      prioritas: [],
      iku: [],
      ikk: [],
      ikd: [],
      paguSearchResults: [],
      fromLiveTables: false,
    };
  }
}

export function buildRenstraContext(data?: RenstraData): string {
  if (!data || !data.fromLiveTables) {
    return FALLBACK_RENSTRA_SUMMARY;
  }

  let ctx = `\n=== BASIS DATA RESMI RENSTRA DKPP KOTA CILEGON (2025 - 2030) ===\n`;

  if (data.prioritas.length > 0) {
    ctx += `\n[PROGRAM & SUBKEGIATAN PRIORITAS DAERAH RENSTRA DKPP]:\n`;
    data.prioritas.forEach((p, idx) => {
      ctx += `${idx + 1}. ${p.nama_program} (${p.kode_program})\n`;
      ctx += `   - Outcome: ${p.outcome}\n`;
      ctx += `   - Kegiatan: ${p.nama_kegiatan} (${p.kode_kegiatan})\n`;
      ctx += `   - Subkegiatan: ${p.nama_subkegiatan} (${p.kode_subkegiatan})\n`;
    });
  }

  if (data.iku.length > 0) {
    ctx += `\n[INDIKATOR KINERJA UTAMA (IKU) DKPP KOTA CILEGON]:\n`;
    data.iku.forEach((i, idx) => {
      ctx += `${idx + 1}. ${i.indikator} (Satuan: ${i.satuan})\n`;
      ctx += `   - Baseline 2024: ${i.baseline_2024} | Target 2025: ${i.target_2025} | 2026: ${i.target_2026} | 2027: ${i.target_2027} | 2028: ${i.target_2028} | 2029: ${i.target_2029} | 2030: ${i.target_2030}\n`;
    });
  }

  if (data.tujuanSasaran.length > 0) {
    ctx += `\n[TUJUAN, SASARAN, & INDIKATOR SASARAN STRATEGIS (TABEL 3.3)]:\n`;
    data.tujuanSasaran.forEach((t, idx) => {
      ctx += `${idx + 1}. Sasaran RPJMD: ${t.nspk_sasaran_rpjmd}\n`;
      ctx += `   - Tujuan DKPP: ${t.tujuan}\n`;
      ctx += `   - Indikator: ${t.indikator_sasaran} (Satuan: ${t.satuan}, Baseline 2024: ${t.baseline_2024}, Target 2026: ${t.target_2026}, Target 2030: ${t.target_2030})\n`;
    });
  }

  if (data.cascading.length > 0) {
    ctx += `\n[CASCADING PROGRAM, TARGET OUTCOME & PAGU INDIKATIF (TABEL 4.1)]:\n`;
    data.cascading.slice(0, 15).forEach((c, idx) => {
      ctx += `${idx + 1}. ${c.program}\n`;
      ctx += `   - Indikator Outcome: ${c.indikator_program} (Satuan: ${c.satuan})\n`;
      ctx += `   - Target: Baseline ${c.target_baseline_2024} -> 2026: ${c.target_2026} -> 2030: ${c.target_2030}\n`;
      if (c.pagu_2026) {
        ctx += `   - Pagu Indikatif: 2025: ${formatRupiah(c.pagu_2025)}, 2026: ${formatRupiah(c.pagu_2026)}, 2027: ${formatRupiah(c.pagu_2027)}, 2028: ${formatRupiah(c.pagu_2028)}, 2029: ${formatRupiah(c.pagu_2029)}\n`;
      }
    });
  }

  if (data.ikk.length > 0) {
    ctx += `\n[INDIKATOR KINERJA KUNCI (IKK) URUSAN PANGAN, PERIKANAN, PERTANIAN, & UPTD]:\n`;
    data.ikk.slice(0, 20).forEach((k) => {
      ctx += `- [${k.kode_urusan_pd}] ${k.indikator}: Baseline ${k.baseline_2024} ${k.satuan} | Target 2026: ${k.target_2026} | Target 2030: ${k.target_2030}\n`;
    });
  }

  if (data.paguSearchResults.length > 0) {
    ctx += `\n[RINCIAN PROGRAM / KEGIATAN / SUBKEGIATAN & PAGU ANGGARAN RELEVAN (TABEL 4.3 V2)]:\n`;
    data.paguSearchResults.forEach((p, idx) => {
      ctx += `${idx + 1}. Uraian: ${p.kode_uraian}\n`;
      if (p.indikator) ctx += `   - Indikator: ${p.indikator}\n`;
      if (p.target_2026) ctx += `   - Target Output: 2026 (${p.target_2026}), 2027 (${p.target_2027}), 2030 (${p.target_2030})\n`;
      if (p.pagu_2026 || p.pagu_2027 || p.pagu_2028) {
        ctx += `   - Pagu Anggaran: 2026 (${formatRupiah(p.pagu_2026)}), 2027 (${formatRupiah(p.pagu_2027)}), 2028 (${formatRupiah(p.pagu_2028)}), 2029 (${formatRupiah(p.pagu_2029)}), 2030 (${formatRupiah(p.pagu_2030)})\n`;
      }
    });
  }

  return ctx;
}
