/**
 * Estimasi Pasokan Beras Tahunan per Titik (Kamera Cerdas)
 * ---------------------------------------------------------
 * Menggabungkan dua sumber data dengan peran berbeda:
 *  1. Isian manual (frekuensi × jumlah per kiriman)  → ARUS (flow)  → sumber PRIMER
 *  2. Stok hasil AI Vision (estimasi_pasokan_kg)     → STOK (stock) → FALLBACK & VALIDATOR
 *
 * Stok dikonversi menjadi arus tahunan memakai koefisien perputaran stok (turnover)
 * per jenis sarana. Koefisien awal bersifat normatif dan dikalibrasi otomatis dari
 * titik yang memiliki kedua data (median P_manual / S_AI per kategori).
 *
 * Seluruh nilai dihitung saat render (tidak disimpan) sehingga perubahan koefisien
 * atau kalibrasi otomatis memperbarui semua titik.
 */
import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';

export type SatuanFrekuensi = 'hari' | 'minggu' | 'bulan';
export type SatuanVolume = 'kg' | 'kwintal' | 'ton';

export const PERIODE_PER_TAHUN: Record<SatuanFrekuensi, number> = { hari: 365, minggu: 52, bulan: 12 };
export const KG_PER_SATUAN: Record<SatuanVolume, number> = { kg: 1, kwintal: 100, ton: 1000 };

/** Koefisien awal perputaran stok per tahun (normatif, dapat dikalibrasi). */
export const TURNOVER_DEFAULT: Record<string, number> = {
  toko_beras: 36,
  warung_madura: 48,
  warung_kelontong: 48,
  distributor_agen: 18,
  gudang_beras: 12,
  minimarket: 52,
  supermarket: 52,
  pasar_tradisional: 36,
  toko_sayur: 48,
  lainnya: 36
};

/** Rentang rasio manual vs AI yang dianggap konsisten. */
export const RASIO_KONSISTEN = { min: 0.33, max: 3 };
/** Minimal jumlah titik berdata lengkap agar kalibrasi kategori dipakai. */
const MIN_SAMPEL_KALIBRASI = 3;

export type SumberEstimasi = 'manual_tervalidasi' | 'manual' | 'ai_turnover' | 'tidak_ada';
export type TingkatKeyakinan = 'tinggi' | 'sedang' | 'rendah' | 'tidak_ada';

export interface EstimasiTahunan {
  tahunanKg: number;
  tahunanTon: number;
  sumber: SumberEstimasi;
  keyakinan: TingkatKeyakinan;
  perluVerifikasi: boolean;
  manualKg: number | null;
  stokAiKg: number | null;
  turnover: number;
  turnoverTerkalibrasi: boolean;
  aiTahunanKg: number | null;
  rasio: number | null;
  isLokal: boolean;
}

export interface Kalibrasi {
  turnover: Record<string, { nilai: number; sampel: number; terkalibrasi: boolean }>;
}

/** Arus tahunan dari isian manual (kg/tahun), atau null bila belum lengkap. */
export function hitungManualTahunanKg(r: Partial<ObservasiRecord>): number | null {
  const f = Number(r.frekuensi_pasokan_angka) || 0;
  const q = Number(r.volume_pasokan_angka) || 0;
  if (f > 0 && q > 0) {
    const sf = (r.frekuensi_pasokan_satuan || 'minggu') as SatuanFrekuensi;
    const sv = (r.volume_pasokan_satuan || 'kg') as SatuanVolume;
    return f * PERIODE_PER_TAHUN[sf] * q * KG_PER_SATUAN[sv];
  }
  const legacy = Number(r.total_pasokan_tahunan_kg) || 0;
  return legacy > 0 ? legacy : null;
}

export function isPasokanLokal(r: Partial<ObservasiRecord>): boolean {
  return (r.asal_pasokan || '').toLowerCase().includes('cilegon');
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Kalibrasi koefisien perputaran dari titik yang memiliki data manual & stok AI. */
export function hitungKalibrasi(list: ObservasiRecord[]): Kalibrasi {
  const sampel: Record<string, number[]> = {};
  list.forEach((r) => {
    if (r.mode !== 'pasokan_beras') return;
    const manual = hitungManualTahunanKg(r);
    const stok = Number(r.estimasi_pasokan_kg) || 0;
    if (manual && stok > 0) {
      const t = manual / stok;
      if (t >= 1 && t <= 365) (sampel[r.kategori || 'lainnya'] ||= []).push(t);
    }
  });

  const turnover: Kalibrasi['turnover'] = {};
  const kategoriSet = new Set([...Object.keys(TURNOVER_DEFAULT), ...Object.keys(sampel)]);
  kategoriSet.forEach((k) => {
    const s = sampel[k] || [];
    const cukup = s.length >= MIN_SAMPEL_KALIBRASI;
    turnover[k] = {
      nilai: cukup ? Math.round(median(s) * 10) / 10 : TURNOVER_DEFAULT[k] ?? TURNOVER_DEFAULT.lainnya,
      sampel: s.length,
      terkalibrasi: cukup
    };
  });
  return { turnover };
}

export function hitungEstimasiTahunan(r: ObservasiRecord, kalibrasi?: Kalibrasi): EstimasiTahunan {
  const kat = r.kategori || 'lainnya';
  const t = kalibrasi?.turnover[kat] ?? {
    nilai: TURNOVER_DEFAULT[kat] ?? TURNOVER_DEFAULT.lainnya,
    sampel: 0,
    terkalibrasi: false
  };
  const manualKg = hitungManualTahunanKg(r);
  const stok = Number(r.estimasi_pasokan_kg) || 0;
  const stokAiKg = stok > 0 ? stok : null;
  const aiTahunanKg = stokAiKg ? stokAiKg * t.nilai : null;

  let tahunanKg = 0;
  let sumber: SumberEstimasi = 'tidak_ada';
  let keyakinan: TingkatKeyakinan = 'tidak_ada';
  let perluVerifikasi = false;
  let rasio: number | null = null;

  if (manualKg) {
    tahunanKg = manualKg;
    if (aiTahunanKg) {
      rasio = manualKg / aiTahunanKg;
      const konsisten = rasio >= RASIO_KONSISTEN.min && rasio <= RASIO_KONSISTEN.max;
      sumber = konsisten ? 'manual_tervalidasi' : 'manual';
      keyakinan = konsisten ? 'tinggi' : 'rendah';
      perluVerifikasi = !konsisten;
    } else {
      sumber = 'manual';
      keyakinan = 'sedang';
    }
  } else if (aiTahunanKg) {
    tahunanKg = aiTahunanKg;
    sumber = 'ai_turnover';
    keyakinan = t.terkalibrasi ? 'sedang' : 'rendah';
  }

  return {
    tahunanKg,
    tahunanTon: tahunanKg / 1000,
    sumber,
    keyakinan,
    perluVerifikasi,
    manualKg,
    stokAiKg,
    turnover: t.nilai,
    turnoverTerkalibrasi: t.terkalibrasi,
    aiTahunanKg,
    rasio,
    isLokal: isPasokanLokal(r)
  };
}

export interface RingkasanTahunan {
  totalKotaTon: number; // hanya pasokan dari luar Cilegon (anti hitung ganda)
  lokalTon: number; // pasokan antar-titik lokal (ditampilkan, tidak dijumlahkan ke total kota)
  manualTon: number;
  aiTon: number;
  jumlahManual: number;
  jumlahAi: number;
  jumlahVerifikasi: number;
  jumlahTanpaData: number;
}

export function ringkasEstimasi(list: ObservasiRecord[], kalibrasi: Kalibrasi): RingkasanTahunan {
  const res: RingkasanTahunan = {
    totalKotaTon: 0, lokalTon: 0, manualTon: 0, aiTon: 0,
    jumlahManual: 0, jumlahAi: 0, jumlahVerifikasi: 0, jumlahTanpaData: 0
  };
  list.forEach((r) => {
    if (r.mode !== 'pasokan_beras') return;
    const e = hitungEstimasiTahunan(r, kalibrasi);
    if (e.sumber === 'tidak_ada') { res.jumlahTanpaData++; return; }
    if (e.isLokal) res.lokalTon += e.tahunanTon;
    else res.totalKotaTon += e.tahunanTon;
    if (e.sumber === 'ai_turnover') { res.aiTon += e.tahunanTon; res.jumlahAi++; }
    else { res.manualTon += e.tahunanTon; res.jumlahManual++; }
    if (e.perluVerifikasi) res.jumlahVerifikasi++;
  });
  return res;
}

export const LABEL_SUMBER: Record<SumberEstimasi, string> = {
  manual_tervalidasi: 'Manual ✓ AI',
  manual: 'Manual',
  ai_turnover: 'AI × Perputaran',
  tidak_ada: 'Belum ada data'
};

export const WARNA_KEYAKINAN: Record<TingkatKeyakinan, string> = {
  tinggi: '#16a34a',
  sedang: '#f59e0b',
  rendah: '#dc2626',
  tidak_ada: '#94a3b8'
};

export function formatTonTahun(ton: number): string {
  if (!ton) return '-';
  return `${ton.toLocaleString('id-ID', { maximumFractionDigits: ton < 10 ? 2 : 1 })} T/Thn`;
}

