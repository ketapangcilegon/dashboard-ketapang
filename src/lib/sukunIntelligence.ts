/**
 * ============================================================
 * Sukun & Pangan Lokal Intelligence Engine
 * Algoritma simulasi potensi pangan lokal, substitusi karbohidrat beras,
 * dan rekomendasi diversifikasi pangan B2SA Kota Cilegon
 * ============================================================
 */

export interface SukunAnalysisResult {
  kelurahan: string;
  kecamatan: string;
  totalPohon: number;
  estimasiProduksiKgTahun: number;
  estimasiProduksiTonTahun: number;
  potensiTepungSukunKg: number;
  pendudukJiwa: number;
  kebutuhanBerasTotalKgTahun: number;
  potensiSubstitusiBerasKgTahun: number;
  persentaseSubstitusiBeras: number;
  kapasitasSubstitusiJiwa100Persen: number;
  kapasitasSubstitusiSarapanPagi20Persen: number;
  rekomendasiOlahan: string[];
}

// Standar parameter pangan nasional & FAO
export const PARAMETER_PANGAN = {
  PRODUKTIVITAS_SUKUN_KG_POHON_TAHUN: 200,      // Rata-rata 1 pohon dewasa = 200 kg buah/tahun
  KONSUMSI_BERAS_KG_KAPITA_TAHUN: 85,           // Konsumsi beras ~85 kg/jiwa/tahun (~233 gram/hari)
  FAKTOR_KONVERSI_BERAS_KE_SUKUN_SEGAR: 1.2,    // 1 kg beras setara kalori dengan ~1.2 kg sukun kukus/rebus
  RENDEMEN_TEPUNG_SUKUN: 0.25,                  // 1 kg sukun segar = 0.25 kg tepung sukun kering
};

// Rekomendasi olahan spesifik per target program
export const REKOMENDASI_OLAHAN_SUKUN = [
  {
    nama: 'Tepung Sukun Komposit (Bahan Baku Mie & Roti)',
    target: 'Substitusi Terigu & Beras untuk UMKM/KWT',
    manfaat: 'Dapat menggantikan 30-50% tepung terigu/beras pada pembuatan mie basah, bolu, biskuit, dan olahan pangan lokal KWT.'
  },
  {
    nama: 'Sukun Kukus/Rebus B2SA (Pengganti Nasi Sarapan)',
    target: 'Program "One Day No Rice" / Sarapan Sehat',
    manfaat: 'Indeks glikemik rendah (GI ~45-50), cocok untuk pencegahan diabetes masyarakat perkotaan dan substitusi nasi pagi hari (20% kalori harian).'
  },
  {
    nama: 'Puree / Bubur Sukun PMT Balita',
    target: 'Pencegahan & Intervensi Stunting Kelurahan',
    manfaat: 'Kaya akan kalsium, zat besi, serat, dan prebiotik alami untuk Pemberian Makanan Tambahan (PMT) balita gizi kurang di posyandu.'
  },
  {
    nama: 'Keripik & Stik Sukun Gurih',
    target: 'Pemberdayaan Ekonomi KWT Kelurahan',
    manfaat: 'Produk olahan bernilai ekonomi tinggi dengan daya simpan 3-6 bulan sebagai oleh-oleh khas pesisir Cilegon.'
  }
];

/**
 * Menghitung potensi substitusi karbohidrat dan ketahanan pangan sukun per wilayah
 */
export function hitungPotensiSukun(
  totalPohon: number,
  pendudukJiwa: number,
  kelurahan: string = 'Kelurahan',
  kecamatan: string = 'Kota Cilegon'
): SukunAnalysisResult {
  const p = PARAMETER_PANGAN;
  const estimasiProduksiKgTahun = totalPohon * p.PRODUKTIVITAS_SUKUN_KG_POHON_TAHUN;
  const estimasiProduksiTonTahun = Math.round((estimasiProduksiKgTahun / 1000) * 100) / 100;
  const potensiTepungSukunKg = Math.round(estimasiProduksiKgTahun * p.RENDEMEN_TEPUNG_SUKUN);

  const kebutuhanBerasTotalKgTahun = Math.round(pendudukJiwa * p.KONSUMSI_BERAS_KG_KAPITA_TAHUN);
  const potensiSubstitusiBerasKgTahun = Math.round(estimasiProduksiKgTahun / p.FAKTOR_KONVERSI_BERAS_KE_SUKUN_SEGAR);

  const persentaseSubstitusiBeras = kebutuhanBerasTotalKgTahun > 0
    ? Math.round((potensiSubstitusiBerasKgTahun / kebutuhanBerasTotalKgTahun) * 10000) / 100
    : 0;

  // Berapa jiwa yang kebutuhan karbohidrat berasnya bisa dipenuhi 100% dari sukun sepanjang tahun
  const kapasitasSubstitusiJiwa100Persen = Math.round(potensiSubstitusiBerasKgTahun / p.KONSUMSI_BERAS_KG_KAPITA_TAHUN);

  // Jika sukun hanya dijadikan pengganti nasi sarapan pagi (porsi 20% kalori harian), berapa jiwa yang tercover
  const kapasitasSubstitusiSarapanPagi20Persen = kapasitasSubstitusiJiwa100Persen * 5;

  return {
    kelurahan,
    kecamatan,
    totalPohon,
    estimasiProduksiKgTahun,
    estimasiProduksiTonTahun,
    potensiTepungSukunKg,
    pendudukJiwa,
    kebutuhanBerasTotalKgTahun,
    potensiSubstitusiBerasKgTahun,
    persentaseSubstitusiBeras,
    kapasitasSubstitusiJiwa100Persen,
    kapasitasSubstitusiSarapanPagi20Persen,
    rekomendasiOlahan: REKOMENDASI_OLAHAN_SUKUN.map(r => `${r.nama} (${r.target}): ${r.manfaat}`)
  };
}
