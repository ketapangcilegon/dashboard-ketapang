/**
 * KONFIGURASI THRESHOLD & BOBOT — INTEGRATED EARLY WARNING SYSTEM (EWS) PANCI
 * ===========================================================================
 * File ini SENGAJA dipisahkan dari algoritma (engine.ts) agar threshold & bobot dapat
 * diperbarui (mis. hasil kajian TPID) tanpa mengubah logika perhitungan.
 *
 * Klasifikasi status EWS resmi:
 *   - AMAN    (Skor: 0)
 *   - WASPADA (Skor: 1)
 *   - AWAS    (Skor: 2)  [Menggantikan istilah lama KRITIS/RENTAN]
 *
 * Semua batas bersifat "batas atas kelas bawah" (inklusif):
 *   AMAN    : nilai ≤ waspada
 *   WASPADA : waspada < nilai ≤ awas
 *   AWAS    : nilai > awas
 */

export type DimensionKey = 'f1' | 'f3' | 'cv' | 'yoy';

export type RiskStatus = 'AMAN' | 'WASPADA' | 'AWAS' | 'KRITIS';
export type FinalStatus = 'AMAN' | 'WASPADA' | 'AWAS' | 'KRITIS' | 'DATA TIDAK LENGKAP';

export interface DimensionThreshold {
  /** Batas atas kelas AMAN (nilai ≤ batas = AMAN). Satuan: persen. */
  waspada: number;
  /** Batas atas kelas WASPADA (nilai ≤ batas = WASPADA, di atasnya AWAS). Satuan: persen. */
  awas: number;
  /** @deprecated alias untuk kompatibilitas mundur */
  kritis?: number;
  basis: 'existing' | 'spec' | 'proposal';
  catatan: string;
}

export interface EwsConfig {
  version: string;
  weights: Record<DimensionKey, number>;
  thresholds: Record<DimensionKey, DimensionThreshold>;
  /** Override per komoditas (kunci = nama kolom, mis. `harga_telur_ayam_ras`). */
  perCommodity: Record<string, Partial<Record<DimensionKey, DimensionThreshold>>>;
  /** Klasifikasi skor komposit 0–2: [0, waspadaMin) AMAN, [waspadaMin, awasMin) WASPADA, [awasMin, 2] AWAS. */
  composite: { waspadaMin: number; awasMin: number; kritisMin?: number };
  /** Klasifikasi skor kelompok (prediktif / aktual) 0–2. */
  group: { waspadaMin: number; awasMin: number; kritisMin?: number };
  /** Periode pengamatan CV (bulan) & jenis standar deviasi — harus sama dengan train_model.ts. */
  cv: { windowMonths: number; stdev: 'population' | 'sample' };
}

export const DIMENSION_LABELS: Record<DimensionKey, { nama: string; singkat: string; kelompok: 'prediktif' | 'aktual' }> = {
  f1: { nama: 'Forecast +1 Bulan', singkat: 'F+1', kelompok: 'prediktif' },
  f3: { nama: 'Forecast +3 Bulan', singkat: 'F+3', kelompok: 'prediktif' },
  cv: { nama: 'Volatilitas (CV)', singkat: 'CV', kelompok: 'aktual' },
  yoy: { nama: 'Tekanan Tahunan (YoY)', singkat: 'YoY', kelompok: 'aktual' }
};

export const DEFAULT_EWS_CONFIG: EwsConfig = {
  version: '2.1.0',
  weights: { f1: 0.25, f3: 0.25, cv: 0.25, yoy: 0.25 },
  thresholds: {
    f1: {
      waspada: 3,
      awas: 10,
      kritis: 10,
      basis: 'proposal',
      catatan: 'Batas WASPADA 3% = ambang "Naik" yang sudah dipakai PANCI (train_model.ts L1). Batas AWAS 10% = usulan awal, perlu validasi TPID.'
    },
    f3: {
      waspada: 5,
      awas: 15,
      kritis: 15,
      basis: 'proposal',
      catatan: 'Horizon +3 bulan memiliki ketidakpastian lebih besar sehingga ambang dibuat lebih lebar dari +1 bulan. Usulan awal, perlu validasi TPID.'
    },
    cv: {
      waspada: 5,
      awas: 10,
      kritis: 10,
      basis: 'spec',
      catatan: 'AMAN ≤5%, WASPADA 5–10%, AWAS >10% (Master Prompt). CV = STDEV.P / rata-rata × 100 pada 12 bulan terakhir.'
    },
    yoy: {
      waspada: 5,
      awas: 10,
      kritis: 10,
      basis: 'existing',
      catatan: 'Mengikuti ambang L3 SKPG yang sudah berjalan di PANCI (≥5% waspada, >10% rentan/awas). Hanya kenaikan harga dinilai sebagai risiko.'
    }
  },
  perCommodity: {
    harga_minyak_goreng: {
      yoy: { waspada: 5, awas: 15, kritis: 15, basis: 'existing', catatan: 'Override existing train_model.ts: minyak goreng AWAS bila YoY >15%.' }
    },
    harga_telur_ayam_ras: {
      yoy: { waspada: 5, awas: 15, kritis: 15, basis: 'existing', catatan: 'Override existing train_model.ts: telur ayam ras AWAS bila YoY >15%.' }
    }
  },
  composite: { waspadaMin: 0.5, awasMin: 1.2, kritisMin: 1.2 },
  group: { waspadaMin: 0.5, awasMin: 1.5, kritisMin: 1.5 },
  cv: { windowMonths: 12, stdev: 'population' }
};
