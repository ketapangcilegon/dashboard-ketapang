// Standar Perhitungan & Klasifikasi SKPG Wilayah Perkotaan
// Mengacu pada Petunjuk Teknis Sistem Peringatan Dini Kerawanan Pangan dan Gizi (SKPG) Tahun 2026
// Badan Pangan Nasional (Bapanas) — Tabel 2, Tabel 4, Tabel 5, Tabel 7, Tabel 12, Tabel 13

export const SKPG_KECAMATANS = [
  'Cibeber',
  'Cilegon',
  'Pulomerak',
  'Ciwandan',
  'Jombang',
  'Gerogol',
  'Purwakarta',
  'Citangkil',
] as const;

export type SkpgKecamatan = (typeof SKPG_KECAMATANS)[number];

export const SKPG_MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const SKPG_MONTH_SHORT = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agt',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

// Pemetaan kode wilayah administrasi (adm4) BMKG resmi untuk 8 Kecamatan Kota Cilegon
export const BMKG_ADM4_BY_KECAMATAN: Record<SkpgKecamatan, { adm4: string; refKelurahan: string }> = {
  Cibeber:    { adm4: '36.72.01.1001', refKelurahan: 'Cibeber' },
  Cilegon:    { adm4: '36.72.02.1001', refKelurahan: 'Bagendung' },
  Pulomerak:  { adm4: '36.72.03.1001', refKelurahan: 'Tamansari' },
  Ciwandan:   { adm4: '36.72.04.1001', refKelurahan: 'Banjar Negara' },
  Jombang:    { adm4: '36.72.05.1002', refKelurahan: 'Jombang Wetan' },
  Gerogol:    { adm4: '36.72.06.1001', refKelurahan: 'Kotasari' },
  Purwakarta: { adm4: '36.72.07.1001', refKelurahan: 'Ramanuju' },
  Citangkil:  { adm4: '36.72.08.1001', refKelurahan: 'Warnasari' },
};

export type SkpgStatus = 'AMAN' | 'WASPADA' | 'RENTAN';
export type SkpgIklimStatus = 'AMAN' | 'WASPADA' | 'SIAGA' | 'AWAS';
export type SkpgBencanaLevel = 'PUTIH' | 'HIJAU' | 'ORANYE' | 'MERAH';

/**
 * Tabel 2 & Tabel 4 Juknis SKPG 2026: Aspek Keterjangkauan Pangan (Harga Konsumen YoY)
 * - Beras Medium: r > 10% = 1 (Rentan), 5% <= r <= 10% = 2 (Waspada), r < 5% = 3 (Aman)
 * - Minyak Goreng Kemasan & Telur Ayam Ras: r > 15% = 1 (Rentan), 5% <= r <= 15% = 2 (Waspada), r < 5% = 3 (Aman)
 * - Total Skor 3-5 => Indeks 1 (Rentan), 6-7 => Indeks 2 (Waspada), 8-9 => Indeks 3 (Aman)
 */
export function scoreKeterjangkauan(
  cur: { beras: number; minyak: number; telur: number },
  prev: { beras: number; minyak: number; telur: number }
) {
  const available =
    cur.beras > 0 && cur.minyak > 0 && cur.telur > 0 &&
    prev.beras > 0 && prev.minyak > 0 && prev.telur > 0;

  if (!available) {
    return {
      available: false,
      rBeras: 0,
      rMinyak: 0,
      rTelur: 0,
      bobotBeras: 0,
      bobotMinyak: 0,
      bobotTelur: 0,
      totalBobot: 0,
      index: 0,
      status: 'N/A' as SkpgStatus | 'N/A',
    };
  }

  const rBeras = parseFloat((((cur.beras - prev.beras) / prev.beras) * 100).toFixed(1));
  const rMinyak = parseFloat((((cur.minyak - prev.minyak) / prev.minyak) * 100).toFixed(1));
  const rTelur = parseFloat((((cur.telur - prev.telur) / prev.telur) * 100).toFixed(1));

  const bobotBeras = rBeras > 10 ? 1 : rBeras >= 5 ? 2 : 3;
  const bobotMinyak = rMinyak > 15 ? 1 : rMinyak >= 5 ? 2 : 3;
  const bobotTelur = rTelur > 15 ? 1 : rTelur >= 5 ? 2 : 3;

  const totalBobot = bobotBeras + bobotMinyak + bobotTelur;
  const index = totalBobot >= 8 ? 3 : totalBobot >= 6 ? 2 : 1;
  const status: SkpgStatus = index === 3 ? 'AMAN' : index === 2 ? 'WASPADA' : 'RENTAN';

  return {
    available: true,
    rBeras,
    rMinyak,
    rTelur,
    bobotBeras,
    bobotMinyak,
    bobotTelur,
    totalBobot,
    index,
    status,
  };
}

/**
 * Tabel 2 & Tabel 5 Juknis SKPG 2026: Aspek Pemanfaatan Pangan (Status Gizi Balita BB/U)
 * Persentase Underweight = (BB Sangat Kurang + BB Kurang) / Total Balita Ditimbang * 100%
 * Cut-off: r > 15% = 1 (Rentan), 10% <= r <= 15% = 2 (Waspada), r < 10% = 3 (Aman)
 */
export function scorePemanfaatan(sangatKurang: number, kurang: number, totalBalita: number) {
  if (!totalBalita || totalBalita <= 0) {
    return {
      available: false,
      underweightTotal: 0,
      prevalensi: 0,
      index: 0,
      status: 'N/A' as SkpgStatus | 'N/A',
    };
  }
  const underweightTotal = (sangatKurang || 0) + (kurang || 0);
  const prevalensi = parseFloat(((underweightTotal / totalBalita) * 100).toFixed(2));
  const index = prevalensi > 15 ? 1 : prevalensi >= 10 ? 2 : 3;
  const status: SkpgStatus = index === 3 ? 'AMAN' : index === 2 ? 'WASPADA' : 'RENTAN';

  return {
    available: true,
    underweightTotal,
    prevalensi,
    index,
    status,
  };
}

/**
 * Tabel 7 Juknis SKPG 2026: Penilaian Komposit SKPG Wilayah Perkotaan
 * Wilayah perkotaan tidak menganalisis aspek ketersediaan pangan;
 * Komposit dihitung dari Indeks Keterjangkauan (IA: 1-3) + Indeks Pemanfaatan (IP: 1-3).
 * Total Indeks Komposit 2-3 = Rentan (Merah), 4-5 = Waspada (Kuning), 6 = Aman (Hijau).
 */
export function scoreKompositPerkotaan(indexAkses: number, indexPemanfaatan: number) {
  if (!indexAkses || !indexPemanfaatan) {
    return {
      available: false,
      skor: 0,
      index: 0,
      status: 'N/A' as SkpgStatus | 'N/A',
    };
  }
  const skor = indexAkses + indexPemanfaatan;
  const index = skor === 6 ? 3 : skor >= 4 ? 2 : 1;
  const status: SkpgStatus = index === 3 ? 'AMAN' : index === 2 ? 'WASPADA' : 'RENTAN';

  return {
    available: true,
    skor,
    index,
    status,
  };
}

/**
 * Tabel 2 Juknis SKPG 2026: Data Dukung Situasi Kebencanaan (Jumlah Kejadian Bencana)
 * 0 = Putih (Nihil), 1-10 = Hijau (Rendah), 11-50 = Oranye (Sedang), >50 = Merah (Tinggi)
 */
export function classifyKebencanaan(totalKejadian: number): {
  level: SkpgBencanaLevel;
  label: string;
  badgeClass: string;
  hex: string;
} {
  if (totalKejadian > 50) {
    return {
      level: 'MERAH',
      label: 'Tinggi (>50 Kejadian)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      hex: '#EF4444',
    };
  }
  if (totalKejadian >= 11) {
    return {
      level: 'ORANYE',
      label: 'Sedang (11–50 Kejadian)',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      hex: '#F97316',
    };
  }
  if (totalKejadian >= 1) {
    return {
      level: 'HIJAU',
      label: 'Rendah (1–10 Kejadian)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      hex: '#10B981',
    };
  }
  return {
    level: 'PUTIH',
    label: 'Nihil (0 Kejadian)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    hex: '#94A3B8',
  };
}

/**
 * Klasifikasi Indikatif Situasi Iklim dari Prakiraan Cuaca BMKG (Potensi Basah / Kering)
 * Mengacu kategori Juknis SKPG 2026 (hal. 28): Aman (Hijau), Waspada (Kuning), Siaga (Jingga), Awas (Merah)
 */
export function classifyIklimFromWeather(params: {
  estCurahHujanMm: number;
  maxDailyRainMm: number;
  avgSuhuC: number;
  maxSuhuC: number;
  avgKelembapan: number;
  maxAnginKmh: number;
  hasExtremeDesc: boolean;
}): {
  status: SkpgIklimStatus;
  potensi: 'NORMAL' | 'BASAH' | 'KERING';
  ringkasan: string;
  badgeClass: string;
} {
  const { estCurahHujanMm, maxDailyRainMm, avgSuhuC, maxSuhuC, avgKelembapan, maxAnginKmh, hasExtremeDesc } = params;

  // Potensi Basah (Curah hujan tinggi / hujan lebat / petir / angin kencang)
  let wetRisk = 0;
  if (estCurahHujanMm > 300) wetRisk += 2;
  else if (estCurahHujanMm > 150) wetRisk += 1;
  if (maxDailyRainMm >= 50) wetRisk += 2;
  else if (maxDailyRainMm >= 20) wetRisk += 1;
  if (hasExtremeDesc || maxAnginKmh >= 30) wetRisk += 1;

  // Potensi Kering (Curah hujan sangat rendah + suhu tinggi + kelembapan rendah)
  let dryRisk = 0;
  if (estCurahHujanMm < 50 && maxDailyRainMm < 2) dryRisk += 1;
  if (maxSuhuC >= 35 || avgSuhuC >= 32) dryRisk += 1;
  if (avgKelembapan <= 65) dryRisk += 1;

  if (wetRisk >= 4) {
    return {
      status: 'AWAS',
      potensi: 'BASAH',
      ringkasan: 'Potensi hujan lebat / cuaca ekstrem tinggi, rawan banjir dan gangguan distribusi pangan.',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  }
  if (wetRisk === 3) {
    return {
      status: 'SIAGA',
      potensi: 'BASAH',
      ringkasan: 'Potensi basah meningkat (CH tinggi / hujan intens), perlu antisipasi genangan jalur logistik pasar.',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }
  if (wetRisk === 2) {
    return {
      status: 'WASPADA',
      potensi: 'BASAH',
      ringkasan: 'Potensi basah moderat, pantau kelancaran pasokan hortikultura dan kelembapan gudang pangan.',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  if (dryRisk >= 3) {
    return {
      status: 'SIAGA',
      potensi: 'KERING',
      ringkasan: 'Potensi kering signifikan (suhu tinggi & minim hujan), waspadai tekanan harga hortikultura dan kekeringan.',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }
  if (dryRisk === 2) {
    return {
      status: 'WASPADA',
      potensi: 'KERING',
      ringkasan: 'Kecenderungan cuaca kering dan hangat, pantau ketersediaan air bersih dan stabilitas pasokan.',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }

  return {
    status: 'AMAN',
    potensi: 'NORMAL',
    ringkasan: 'Kondisi cuaca/iklim relatif kondusif dan normal bagi distribusi pangan serta kesehatan masyarakat.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
}

export function normalizeKecamatanName(raw: string | null | undefined): SkpgKecamatan | null {
  if (!raw) return null;
  const clean = raw.replace(/^kec(amatan|\.?)\s+/i, '').trim().toLowerCase().replace(/\s+/g, '');
  const map: Record<string, SkpgKecamatan> = {
    cibeber: 'Cibeber',
    cilegon: 'Cilegon',
    pulomerak: 'Pulomerak',
    ciwandan: 'Ciwandan',
    jombang: 'Jombang',
    gerogol: 'Gerogol',
    grogol: 'Gerogol',
    purwakarta: 'Purwakarta',
    citangkil: 'Citangkil',
  };
  return map[clean] || null;
}
