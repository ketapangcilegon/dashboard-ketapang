/**
 * ENGINE INTEGRATED EARLY WARNING SYSTEM (EWS) PANCI — SINGLE SOURCE OF TRUTH
 * ===========================================================================
 * Semua panel (dashboard desktop, mobile, notifikasi, laporan, AI Insight) WAJIB memakai
 * hasil fungsi di file ini. Tidak ada klasifikasi EWS lain di tempat lain.
 *
 * Modul ini murni (pure functions): tanpa akses jaringan/DB/React, sehingga dapat diuji unit.
 *
 * Empat dimensi (bobot sama 25%):
 *   F+1 : ((Forecast+1 − Harga Aktual) / Harga Aktual) × 100
 *   F+3 : ((Forecast+3 − Harga Aktual) / Harga Aktual) × 100
 *   CV  : (STDEV.P 12 bulan / Rata-rata 12 bulan) × 100   (STDEV.P: seluruh observasi periode tersedia)
 *   YoY : ((Harga bulan ini − Harga bulan sama tahun lalu) / Harga bulan sama tahun lalu) × 100
 *
 * Skor tiap dimensi: AMAN=0, WASPADA=1, AWAS=2 (menggantikan istilah lama KRITIS/RENTAN).
 * Composite Risk Score = Σ(bobot × skor)  (rentang 0–2)  → status komposit.
 * Matriks irisan 3×3 (prediktif × aktual) = alat interpretasi silang, BUKAN pengganti komposit.
 */
import {
  DEFAULT_EWS_CONFIG,
  DIMENSION_LABELS,
  type DimensionKey,
  type DimensionThreshold,
  type EwsConfig,
  type RiskStatus as ConfigRiskStatus,
  type FinalStatus as ConfigFinalStatus
} from './thresholds';

export type Level = 0 | 1 | 2;
export type RiskStatus = 'AMAN' | 'WASPADA' | 'AWAS' | 'KRITIS';
export type FinalStatus = RiskStatus | 'DATA TIDAK LENGKAP';
export type DimensionStatus = RiskStatus | 'DATA TIDAK TERSEDIA';

export const DIMENSION_KEYS: DimensionKey[] = ['f1', 'f3', 'cv', 'yoy'];
export const LEVEL_TO_STATUS: RiskStatus[] = ['AMAN', 'WASPADA', 'AWAS'];
export const STATUS_TO_LEVEL: Record<string, Level> = { 
  AMAN: 0, 
  WASPADA: 1, 
  AWAS: 2,
  KRITIS: 2 // Kompatibilitas mundur
};

/** Matriks irisan: MATRIX[aktual][prediktif]. */
export const INTERSECTION_MATRIX: Record<RiskStatus, Record<RiskStatus, RiskStatus>> = {
  AMAN: { AMAN: 'AMAN', WASPADA: 'AMAN', AWAS: 'WASPADA', KRITIS: 'WASPADA' },
  WASPADA: { AMAN: 'AMAN', WASPADA: 'WASPADA', AWAS: 'AWAS', KRITIS: 'AWAS' },
  AWAS: { AMAN: 'WASPADA', WASPADA: 'AWAS', AWAS: 'AWAS', KRITIS: 'AWAS' },
  KRITIS: { AMAN: 'WASPADA', WASPADA: 'AWAS', AWAS: 'AWAS', KRITIS: 'AWAS' }
};

export interface EwsInput {
  komoditas: string;
  nama?: string;
  /** Harga aktual bulan acuan (Rp). Bisa menggunakan hargaAktual atau alias currentPrice. */
  hargaAktual?: number | null;
  currentPrice?: number | null;
  forecast1m: number | null;
  forecast3m: number | null;
  /** CV 12 bulan (%), dihitung hulu (train_model.ts) dengan STDEV.P. Bisa cv atau modelCv. */
  cv?: number | null;
  modelCv?: number | null;
  /** YoY (%), dihitung hulu: bulan acuan vs bulan sama tahun lalu. Bisa yoy atau modelGrowthYoy. */
  yoy?: number | null;
  modelGrowthYoy?: number | null;
  /** Batas bawah/atas prediction interval forecast +1 (Rp) bila model menyediakan. */
  lower1m?: number | null;
  upper1m?: number | null;
  modelLowerBound?: number | null;
  modelUpperBound?: number | null;
  /** Akurasi model (100 − MAPE, %) bila tersedia. */
  confidence?: number | null;
  updatedAt?: string | null;
  historyPrices12m?: number[] | null;
  previousYearPrice?: number | null;
  commodityKey?: string;
  drivers?: string[];
}

export interface DimensionResult {
  key: DimensionKey;
  nama: string;
  singkat: string;
  kelompok: 'prediktif' | 'aktual';
  /** Nilai indikator dalam persen; null bila tidak valid/tidak tersedia. */
  value: number | null;
  level: Level | null;
  status: DimensionStatus;
  weight: number;
  /** Kontribusi ke skor komposit = bobot × skor (null bila data tidak tersedia). */
  contribution: number | null;
  threshold: DimensionThreshold;
  alasan?: string;
}

export interface OverrideFlag {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  judul: string;
  alasan: string;
  logika: string;
  /** Catatan audit: aturan ini tidak mengubah nilai statistik maupun status komposit. */
  audit: string;
}

export interface UncertaintyInfo {
  tersedia: boolean;
  changeLowerPct: number | null;
  changeUpperPct: number | null;
  levelMin: Level | null;
  levelMax: Level | null;
  /** True bila batas bawah/atas interval menghasilkan klasifikasi F+1 berbeda dari titik prediksi. */
  statusDapatBerubah: boolean;
  confidence: number | null;
  catatan: string;
}

export interface EwsResult {
  komoditas: string;
  nama: string;
  input: EwsInput;
  dimensions: Record<DimensionKey, DimensionResult>;
  complete: boolean;
  missing: string[];
  compositeScore: number | null;
  riskIndexPct: number | null;
  status: FinalStatus;
  compositeStatus: FinalStatus;
  predictiveScore: number | null;
  actualScore: number | null;
  predictiveStatus: RiskStatus | null;
  actualStatus: RiskStatus | null;
  matrixStatus: RiskStatus | null;
  diagnostic: {
    sesuai: boolean | null;
    compositeStatus: FinalStatus;
    matrixStatus: RiskStatus | null;
    penjelasan: string;
  };
  diagnostics: string[];
  overrides: OverrideFlag[];
  uncertainty: UncertaintyInfo;
  /** Penjelasan perhitungan komposit yang transparan. */
  rumusKomposit: string;
  rekomendasi: string[];
  drivers: string[];
}

export type CommodityEvaluationResult = EwsResult;

export interface EwsSummary {
  total: number;
  aman: number;
  waspada: number;
  awas: number;
  /** @deprecated Kompatibilitas mundur */
  kritis?: number;
  tidakLengkap: number;
}

// ---------------------------------------------------------------------------
// Utilitas statistik
// ---------------------------------------------------------------------------
export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Perubahan persen dari `from` ke `to`; null bila data tidak valid (from ≤ 0 / bukan angka). */
export function pctChange(from: unknown, to: unknown): number | null {
  if (!isNum(from) || !isNum(to) || from <= 0 || to <= 0) return null;
  return ((to - from) / from) * 100;
}

/**
 * Coefficient of Variation (%) = SD / Mean × 100.
 * kind='population' → STDEV.P (dibagi n); 'sample' → STDEV.S (dibagi n−1).
 * Mengembalikan null bila observasi < 2 atau rata-rata ≤ 0.
 */
export function coefficientOfVariation(values: number[], kind: 'population' | 'sample' = 'population'): number | null {
  const v = values.filter(isNum);
  if (v.length < 2) return null;
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  if (mean <= 0) return null;
  const ss = v.reduce((s, x) => s + (x - mean) ** 2, 0);
  const sd = Math.sqrt(ss / (kind === 'population' ? v.length : v.length - 1));
  return (sd / mean) * 100;
}

/** YoY (%) = (sekarang − tahun lalu) / tahun lalu × 100. */
export function yoyPct(current: unknown, previousYear: unknown): number | null {
  return pctChange(previousYear, current);
}

// ---------------------------------------------------------------------------
// Klasifikasi
// ---------------------------------------------------------------------------
export function getThreshold(config: EwsConfig, komoditas: string, dim: DimensionKey): DimensionThreshold {
  return config.perCommodity[komoditas]?.[dim] ?? config.thresholds[dim];
}

/** AMAN ≤ waspada < WASPADA ≤ awas < AWAS. Hanya kenaikan harga yang dinilai risiko. */
export function classifyValue(value: number | null, th: Pick<DimensionThreshold, 'waspada' | 'awas' | 'kritis'>): Level | null {
  if (!isNum(value)) return null;
  const awasLimit = th.awas ?? th.kritis ?? 10;
  if (value <= th.waspada) return 0;
  if (value <= awasLimit) return 1;
  return 2;
}

export function compositeStatusFromScore(score: number, config: EwsConfig): RiskStatus {
  const awasMin = config.composite.awasMin ?? config.composite.kritisMin ?? 1.2;
  if (score < config.composite.waspadaMin) return 'AMAN';
  if (score < awasMin) return 'WASPADA';
  return 'AWAS';
}

export function groupStatusFromScore(score: number, config: EwsConfig): RiskStatus {
  const awasMin = config.group.awasMin ?? config.group.kritisMin ?? 1.5;
  if (score < config.group.waspadaMin) return 'AMAN';
  if (score < awasMin) return 'WASPADA';
  return 'AWAS';
}

export function matrixLookup(actual: RiskStatus | string, predictive: RiskStatus | string): RiskStatus {
  const act = (actual === 'KRITIS' ? 'AWAS' : actual) as RiskStatus;
  const pred = (predictive === 'KRITIS' ? 'AWAS' : predictive) as RiskStatus;
  return INTERSECTION_MATRIX[act]?.[pred] ?? 'AMAN';
}

// ---------------------------------------------------------------------------
// Evaluasi satu komoditas
// ---------------------------------------------------------------------------
function buildDimension(
  key: DimensionKey,
  value: number | null,
  alasanTidakTersedia: string,
  config: EwsConfig,
  komoditas: string
): DimensionResult {
  const th = getThreshold(config, komoditas, key);
  const level = classifyValue(value, th);
  const meta = DIMENSION_LABELS[key];
  return {
    key,
    nama: meta.nama,
    singkat: meta.singkat,
    kelompok: meta.kelompok,
    value: level === null ? null : value,
    level,
    status: level === null ? 'DATA TIDAK TERSEDIA' : LEVEL_TO_STATUS[level],
    weight: config.weights[key],
    contribution: level === null ? null : round(level * config.weights[key]),
    threshold: th,
    alasan: level === null ? alasanTidakTersedia : undefined
  };
}

/** Rekomendasi Intervensi Kebijakan Resmi (Capture 4 & Master Prompt Bab 7) */
export function getEwsRecommendations(status: FinalStatus | string, komoditas?: string): string[] {
  const normStatus = status === 'KRITIS' ? 'AWAS' : status;
  if (normStatus === 'AWAS') {
    return [
      'siapkan GPM & perluas kios pangan SPHP Bulog di kelurahan prioritas',
      'intensifkan monitoring harian harga dan pasokan distributor',
      'fasilitasi distribusi pangan / bantuan ongkos angkut dari sentra produsen',
      'optimalisasi Cadangan Pangan Pemerintah Daerah (CPPD) untuk stabilisasi'
    ];
  }
  if (normStatus === 'WASPADA') {
    return [
      'pantau pasokan distributor dan pergerakan stok pedagang',
      'koordinasi pasokan dengan daerah produsen mitra',
      'siapkan opsi operasi pasar mandiri jika tren berlanjut',
      'intensifkan pelaporan harga harian dari enumerator pasar'
    ];
  }
  if (normStatus === 'DATA TIDAK LENGKAP') {
    return [
      'lengkapi observasi harga historis dan input peramalan',
      'validasi model forecast pada horizon yang belum tersedia'
    ];
  }
  return [
    'monitoring rutin mingguan stabilitas pasokan dan harga',
    'jaga kestabilan pasokan dan kelancaran distribusi normal'
  ];
}

/** Pendorong Utama (Top Drivers) Dinamis berbasis 4 Dimensi & Karakteristik Komoditas */
export function getCommodityDrivers(
  k: string, 
  dims: Record<DimensionKey, DimensionResult>, 
  customDrivers?: string[]
): string[] {
  if (customDrivers && Array.isArray(customDrivers) && customDrivers.length > 0) {
    return customDrivers;
  }

  const drivers: string[] = [];
  const f1Val = dims.f1.value;
  const f3Val = dims.f3.value;
  const cvVal = dims.cv.value;
  const yoyVal = dims.yoy.value;

  // Driver 1: Sisi proyeksi harga terdekat atau fluktuasi
  if (f1Val !== null && f1Val > 3) {
    drivers.push(`Tren kenaikan proyeksi jangka pendek (+${f1Val.toFixed(1)}% +1 Bln)`);
  } else if (f3Val !== null && f3Val > 5) {
    drivers.push(`Akumulasi tekanan harga jangka menengah (+${f3Val.toFixed(1)}% +3 Bln)`);
  } else {
    drivers.push('Tren harga 3 bulan terakhir relatif terkendali');
  }

  // Driver 2: Volatilitas atau Pasokan
  if (cvVal !== null && cvVal > 10) {
    drivers.push(`Volatilitas harga pasar tinggi (CV ${cvVal.toFixed(1)}% di atas ambang aman)`);
  } else if (yoyVal !== null && yoyVal > 10) {
    drivers.push(`Tekanan harga tahunan di atas rata-rata (YoY +${yoyVal.toFixed(1)}%)`);
  } else {
    drivers.push('Kelancaran pasokan dari sentra produksi');
  }

  // Driver 3: Faktor makro / iklim / musiman
  if (k.includes('cabai') || k.includes('bawang')) {
    drivers.push('Kondisi cuaca & hasil panen daerah produsen utama (Jateng/Jatim)');
  } else if (k.includes('beras') || k.includes('minyak') || k.includes('gula')) {
    drivers.push('Kebijakan penyaluran SPHP Bulog & cadangan pangan pemerintah');
  } else if (k.includes('ayam') || k.includes('telur')) {
    drivers.push('Stabilitas harga pakan jagung & komponen sapronak');
  } else {
    drivers.push('Stabilitas inflasi makro daerah Kota Cilegon');
  }

  return drivers;
}

export function evaluateCommodity(input: EwsInput, config: EwsConfig = DEFAULT_EWS_CONFIG): EwsResult {
  const k = input.komoditas || input.commodityKey || 'komoditas';
  const harga = input.hargaAktual ?? input.currentPrice ?? null;
  const hargaValid = isNum(harga) && harga > 0;

  // Hitung CV dan YoY jika dikirim dalam array history
  let calculatedCv = input.cv ?? input.modelCv ?? null;
  if (!isNum(calculatedCv) && input.historyPrices12m && input.historyPrices12m.length >= 2) {
    calculatedCv = coefficientOfVariation(input.historyPrices12m, 'population');
  }

  let calculatedYoy = input.yoy ?? input.modelGrowthYoy ?? null;
  if (!isNum(calculatedYoy) && hargaValid && isNum(input.previousYearPrice) && input.previousYearPrice > 0) {
    calculatedYoy = pctChange(input.previousYearPrice, harga);
  }

  const f1 = hargaValid ? pctChange(harga, input.forecast1m) : null;
  const f3 = hargaValid ? pctChange(harga, input.forecast3m) : null;
  const cv = isNum(calculatedCv) && calculatedCv >= 0 ? calculatedCv : null;
  const yoy = isNum(calculatedYoy) ? calculatedYoy : null;

  const dimensions: Record<DimensionKey, DimensionResult> = {
    f1: buildDimension('f1', f1, hargaValid ? 'Forecast +1 bulan tidak valid / model gagal' : 'Harga aktual tidak valid', config, k),
    f3: buildDimension('f3', f3, hargaValid ? 'Forecast +3 bulan tidak valid / model gagal' : 'Harga aktual tidak valid', config, k),
    cv: buildDimension('cv', cv, 'CV 12 bulan tidak tersedia (observasi kurang / rata-rata ≤ 0)', config, k),
    yoy: buildDimension('yoy', yoy, 'Harga bulan yang sama tahun lalu tidak tersedia', config, k)
  };

  const missing = DIMENSION_KEYS.filter((d) => dimensions[d].level === null).map(
    (d) => `${dimensions[d].nama}: ${dimensions[d].alasan}`
  );
  const complete = missing.length === 0;

  // Skor komposit penuh HANYA bila keempat dimensi tersedia (aturan #6).
  let compositeScore: number | null = null;
  let status: FinalStatus = 'DATA TIDAK LENGKAP';
  let rumusKomposit = `Skor komposit tidak dihitung — ${missing.length} dimensi wajib tidak tersedia.`;
  if (complete) {
    compositeScore = round(DIMENSION_KEYS.reduce((s, d) => s + config.weights[d] * (dimensions[d].level as Level), 0));
    status = compositeStatusFromScore(compositeScore, config);
    rumusKomposit =
      DIMENSION_KEYS.map((d) => `(${config.weights[d].toFixed(2)}×${dimensions[d].level})`).join(' + ') +
      ` = ${compositeScore.toFixed(2)} → ${status}`;
  }
  const riskIndexPct = compositeScore === null ? null : round((compositeScore / 2) * 100, 1);

  // Skor kelompok untuk matriks irisan (rata-rata sederhana dua indikator, sesuai spesifikasi).
  const avg2 = (a: Level | null, b: Level | null) => (a === null || b === null ? null : round((a + b) / 2));
  const predictiveScore = avg2(dimensions.f1.level, dimensions.f3.level);
  const actualScore = avg2(dimensions.cv.level, dimensions.yoy.level);
  const predictiveStatus = predictiveScore === null ? null : groupStatusFromScore(predictiveScore, config);
  const actualStatus = actualScore === null ? null : groupStatusFromScore(actualScore, config);
  const matrixStatus = predictiveStatus && actualStatus ? matrixLookup(actualStatus, predictiveStatus) : null;

  // Diagnostik: tampilkan kedua hasil; status komposit TIDAK diubah.
  let sesuai: boolean | null = null;
  let penjelasan = 'Matriks irisan tidak dapat dihitung karena data tidak lengkap.';
  if (matrixStatus && status !== 'DATA TIDAK LENGKAP') {
    sesuai = matrixStatus === status;
    penjelasan = sesuai
      ? `Matriks irisan (aktual ${actualStatus} × prediktif ${predictiveStatus}) = ${matrixStatus}, sejalan dengan status komposit.`
      : `Matriks irisan (aktual ${actualStatus} [skor ${actualScore?.toFixed(2)}] × prediktif ${predictiveStatus} [skor ${predictiveScore?.toFixed(2)}]) = ${matrixStatus}, ` +
        `berbeda dari status komposit ${status} (skor ${compositeScore?.toFixed(2)}). Perbedaan wajar karena komposit menimbang empat dimensi dengan batas kelas ` +
        `${config.composite.waspadaMin}/${config.composite.awasMin ?? 1.2}, sedangkan matriks memetakan dua kelompok dengan batas ${config.group.waspadaMin}/${config.group.awasMin ?? 1.5}. ` +
        `Status komposit tetap menjadi hasil resmi; matriks dipakai sebagai pembanding interpretasi.`;
  }

  // Ketidakpastian prediksi (+1 bulan; model hanya menyediakan interval untuk horizon ini).
  const lowerBoundVal = input.lower1m ?? input.modelLowerBound ?? null;
  const upperBoundVal = input.upper1m ?? input.modelUpperBound ?? null;
  const lowerChg = hargaValid ? pctChange(harga, lowerBoundVal) : null;
  const upperChg = hargaValid ? pctChange(harga, upperBoundVal) : null;
  const th1 = dimensions.f1.threshold;
  const lvLower = classifyValue(lowerChg, th1);
  const lvUpper = classifyValue(upperChg, th1);
  const lvMid = dimensions.f1.level;
  const levels = [lvLower, lvUpper, lvMid].filter((x): x is Level => x !== null);
  const intervalTersedia = lowerChg !== null && upperChg !== null;
  const uncertainty: UncertaintyInfo = {
    tersedia: intervalTersedia,
    changeLowerPct: lowerChg,
    changeUpperPct: upperChg,
    levelMin: levels.length ? (Math.min(...levels) as Level) : null,
    levelMax: levels.length ? (Math.max(...levels) as Level) : null,
    statusDapatBerubah: intervalTersedia && levels.length > 0 && Math.min(...levels) !== Math.max(...levels),
    confidence: isNum(input.confidence) ? input.confidence : null,
    catatan: intervalTersedia
      ? 'Interval +1 bulan berbasis MAPE model. Interval untuk +3 bulan tidak disediakan model sehingga ketidakpastian +3 bulan lebih besar dan belum terkuantifikasi.'
      : 'Model tidak menyediakan prediction interval; ketidakpastian prediksi belum terkuantifikasi.'
  };

  const overrides = buildOverrides({ dimensions, complete, missing, uncertainty, f1, f3, yoy, config });
  const diagnostics = overrides.map(o => `${o.judul}: ${o.alasan}`);
  const drivers = getCommodityDrivers(k, dimensions, input.drivers);

  return {
    komoditas: k,
    nama: input.nama || k,
    input,
    dimensions,
    complete,
    missing,
    compositeScore,
    riskIndexPct,
    status,
    compositeStatus: status,
    predictiveScore,
    actualScore,
    predictiveStatus,
    actualStatus,
    matrixStatus,
    diagnostic: { sesuai, compositeStatus: status, matrixStatus, penjelasan },
    diagnostics,
    overrides,
    uncertainty,
    rumusKomposit,
    rekomendasi: getEwsRecommendations(status, k),
    drivers
  };
}

// ---------------------------------------------------------------------------
// Aturan pengaman (override) — hanya memberi peringatan, tidak mengubah angka/status.
// ---------------------------------------------------------------------------
function buildOverrides(ctx: {
  dimensions: Record<DimensionKey, DimensionResult>;
  complete: boolean;
  missing: string[];
  uncertainty: UncertaintyInfo;
  f1: number | null;
  f3: number | null;
  yoy: number | null;
  config: EwsConfig;
}): OverrideFlag[] {
  const { dimensions: d, complete, missing, uncertainty, f1, f3, yoy } = ctx;
  const flags: OverrideFlag[] = [];
  const AUDIT = 'Aturan ini hanya menambahkan peringatan; nilai statistik asli dan skor komposit tidak diubah.';

  if (!complete) {
    flags.push({
      id: 'R4-R6-data-tidak-lengkap',
      severity: 'warning',
      judul: 'DATA TIDAK LENGKAP',
      alasan: `Dimensi wajib tidak tersedia: ${missing.join('; ')}.`,
      logika: 'Indikator tanpa data tidak dianggap AMAN dan skor komposit penuh tidak dihitung.',
      audit: AUDIT
    });
  }
  if (d.cv.level === 2 && d.yoy.level === 2) {
    flags.push({
      id: 'R1-cv-yoy-awas',
      severity: 'critical',
      judul: 'Tekanan harga dan volatilitas tinggi',
      alasan: 'CV dan YoY sama-sama AWAS: harga tidak stabil sekaligus jauh di atas tahun lalu.',
      logika: 'CV.level = 2 ∧ YoY.level = 2',
      audit: AUDIT
    });
  }
  if (d.f1.level === 2 && d.f3.level === 2) {
    flags.push({
      id: 'R2-f1-f3-awas',
      severity: 'critical',
      judul: 'Risiko proyeksi tinggi',
      alasan: 'Forecast +1 bulan dan +3 bulan sama-sama AWAS: potensi kenaikan berlanjut.',
      logika: 'F1.level = 2 ∧ F3.level = 2',
      audit: AUDIT
    });
  }
  if (d.cv.level === 2 && d.yoy.level === 0) {
    flags.push({
      id: 'R3-cv-awas-yoy-aman',
      severity: 'info',
      judul: 'Risiko volatilitas, bukan kenaikan harga berkelanjutan',
      alasan: 'CV berstatus AWAS namun YoY AMAN: pasar bergejolak fluktuatif tanpa tren kenaikan harga tahunan sistemik.',
      logika: 'CV.level = 2 ∧ YoY.level = 0',
      audit: AUDIT
    });
  }
  if (isNum(yoy) && yoy < -20) {
    flags.push({
      id: 'base-effect-warning',
      severity: 'info',
      judul: 'Potensi Base Effect',
      alasan: `YoY sebesar ${yoy.toFixed(1)}% sangat rendah karena lonjakan harga tinggi pada periode yang sama tahun lalu.`,
      logika: 'YoY < -20%',
      audit: AUDIT
    });
  }
  if ((isNum(f1) && Math.abs(f1) > 50) || (isNum(f3) && Math.abs(f3) > 50)) {
    flags.push({
      id: 'extreme-forecast-warning',
      severity: 'warning',
      judul: 'Perubahan Proyeksi Ekstrem',
      alasan: 'Perubahan forecast > 50% dari harga aktual. Periksa anomali model dan validasi lapangan sebelum intervensi skala penuh.',
      logika: '|F1| > 50% ∨ |F3| > 50%',
      audit: AUDIT
    });
  }
  if (uncertainty.statusDapatBerubah) {
    flags.push({
      id: 'prediction-uncertainty-warning',
      severity: 'info',
      judul: 'Ketidakpastian Prediksi Mempengaruhi Status F+1',
      alasan: 'Rentang prediction interval +1 bulan melintasi ambang klasifikasi sehingga status F+1 dapat berubah.',
      logika: 'min/max level pada batas bawah-atas interval ≠ level titik prediksi',
      audit: AUDIT
    });
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Agregasi
// ---------------------------------------------------------------------------
const STATUS_RANK: Record<FinalStatus, number> = { AWAS: 3, KRITIS: 3, WASPADA: 2, 'DATA TIDAK LENGKAP': 1, AMAN: 0 };

export function summarize(results: EwsResult[]): EwsSummary {
  const awasCount = results.filter((r) => r.status === 'AWAS').length;
  return {
    total: results.length,
    aman: results.filter((r) => r.status === 'AMAN').length,
    waspada: results.filter((r) => r.status === 'WASPADA').length,
    awas: awasCount,
    kritis: awasCount, // Kompatibilitas mundur
    tidakLengkap: results.filter((r) => r.status === 'DATA TIDAK LENGKAP').length
  };
}

/** Urut dari risiko tertinggi (status → skor) — dipakai notifikasi & daftar prioritas. */
export function sortByRisk(results: EwsResult[]): EwsResult[] {
  return [...results].sort(
    (a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || (b.compositeScore ?? -1) - (a.compositeScore ?? -1)
  );
}

export function evaluateAll(inputs: EwsInput[], config: EwsConfig = DEFAULT_EWS_CONFIG) {
  const results = inputs.map((i) => evaluateCommodity(i, config));
  return { results, summary: summarize(results) };
}

// ---------------------------------------------------------------------------
// Analisis sensitivitas (threshold ±20% dan skema bobot alternatif)
// ---------------------------------------------------------------------------
export interface SensitivityScenario {
  nama: string;
  stabilPct: number;
  berubah: { komoditas: string; dari: FinalStatus; ke: FinalStatus }[];
}

function scaleConfig(base: EwsConfig, factor: number): EwsConfig {
  const scaleTh = (t: DimensionThreshold): DimensionThreshold => {
    const awasLimit = t.awas ?? t.kritis ?? 10;
    return {
      ...t,
      waspada: t.waspada * factor,
      awas: awasLimit * factor,
      kritis: awasLimit * factor
    };
  };
  const thresholds = Object.fromEntries(DIMENSION_KEYS.map((d) => [d, scaleTh(base.thresholds[d])])) as EwsConfig['thresholds'];
  const perCommodity: EwsConfig['perCommodity'] = {};
  for (const [c, m] of Object.entries(base.perCommodity)) {
    perCommodity[c] = Object.fromEntries(Object.entries(m).map(([d, t]) => [d, scaleTh(t as DimensionThreshold)]));
  }
  return { ...base, thresholds, perCommodity };
}

export function sensitivityAnalysis(inputs: EwsInput[], base: EwsConfig = DEFAULT_EWS_CONFIG): SensitivityScenario[] {
  const baseline = evaluateAll(inputs, base).results;
  const scenarios: { nama: string; cfg: EwsConfig }[] = [
    { nama: 'Threshold −20% (lebih sensitif)', cfg: scaleConfig(base, 0.8) },
    { nama: 'Threshold +20% (lebih longgar)', cfg: scaleConfig(base, 1.2) },
    { nama: 'Bobot dominan prediktif (35/35/15/15)', cfg: { ...base, weights: { f1: 0.35, f3: 0.35, cv: 0.15, yoy: 0.15 } } },
    { nama: 'Bobot dominan aktual (15/15/35/35)', cfg: { ...base, weights: { f1: 0.15, f3: 0.15, cv: 0.35, yoy: 0.35 } } }
  ];
  return scenarios.map(({ nama, cfg }) => {
    const alt = evaluateAll(inputs, cfg).results;
    const berubah = baseline
      .map((b, i) => ({ komoditas: b.komoditas, dari: b.status, ke: alt[i].status }))
      .filter((x) => x.dari !== x.ke);
    return { nama, stabilPct: baseline.length ? round(((baseline.length - berubah.length) / baseline.length) * 100, 1) : 100, berubah };
  });
}
