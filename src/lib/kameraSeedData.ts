import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import rawData from './kameraSeedData.json';

/**
 * Data observasi pasokan beras lapangan awal (7 titik sarana distribusi terverifikasi di Kota Cilegon).
 * Memuat koordinat presisi GPS, foto lapangan ber-watermark, estimasi karung/tonase, serta nama toko.
 * Dijadikan jaminan integritas data (seed & offline/network fallback) agar data pasokan tidak pernah hilang.
 */
export const SEED_OBSERVASI_DATA: ObservasiRecord[] = (rawData as unknown) as ObservasiRecord[];

export function getSeedObservasiById(id: string): ObservasiRecord | undefined {
  return SEED_OBSERVASI_DATA.find((r) => r.id === id);
}
