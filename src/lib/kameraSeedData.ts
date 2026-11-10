import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import rawData from './kameraSeedData.json';

/**
 * Data observasi pasokan beras lapangan (seluruh titik sarana distribusi terverifikasi di Kota Cilegon).
 * Memuat koordinat presisi GPS, foto lapangan ber-watermark, estimasi karung/tonase, serta nama toko.
 * Dijadikan jaminan integritas data (seed & offline/network fallback) agar data pasokan langsung tampil tanpa delay.
 */
export const SEED_OBSERVASI_DATA: ObservasiRecord[] = (rawData as unknown) as ObservasiRecord[];

const seedByIdMap = new Map<string, ObservasiRecord>();
for (const item of SEED_OBSERVASI_DATA) {
  if (item.id) {
    seedByIdMap.set(item.id, item);
  }
}

export function getSeedObservasiById(id: string): ObservasiRecord | undefined {
  return seedByIdMap.get(id);
}

/**
 * Rehydrate foto_url dari SEED_OBSERVASI_DATA lokal jika respons API menggunakan mode ringkasan (?summary=1)
 */
export function hydrateObservasiPhotos(records: ObservasiRecord[]): ObservasiRecord[] {
  return records.map((r) => {
    if ((!r.foto_url || r.foto_url === '__SEED_PHOTO__') && r.id) {
      const seed = seedByIdMap.get(r.id);
      if (seed?.foto_url) {
        return { ...r, foto_url: seed.foto_url };
      }
    }
    return r;
  });
}

// Client-side singleton cache & request deduplication across KameraCerdasView, MapUnified, and AIIntelligenceMap
let clientCachedObservasi: ObservasiRecord[] | null = null;
let clientCacheTimestamp = 0;
let inFlightObservasiPromise: Promise<ObservasiRecord[]> | null = null;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LS_CACHE_KEY = 'panci_kamera_observasi_cache_v2';

export function getInitialObservasiList(): ObservasiRecord[] {
  if (clientCachedObservasi && clientCachedObservasi.length > 0) {
    return clientCachedObservasi;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hydrated = hydrateObservasiPhotos(parsed);
          clientCachedObservasi = hydrated;
          return hydrated;
        }
      }
    } catch {}
  }
  return SEED_OBSERVASI_DATA;
}

export function invalidateObservasiClientCache(updatedList?: ObservasiRecord[]) {
  if (updatedList && updatedList.length > 0) {
    const hydrated = hydrateObservasiPhotos(updatedList);
    clientCachedObservasi = hydrated;
    clientCacheTimestamp = Date.now();
    if (typeof window !== 'undefined') {
      try {
        const compact = hydrated.map((r) =>
          r.id && seedByIdMap.has(r.id) && r.foto_url === seedByIdMap.get(r.id)?.foto_url
            ? { ...r, foto_url: '__SEED_PHOTO__' }
            : r
        );
        localStorage.setItem(LS_CACHE_KEY, JSON.stringify(compact));
      } catch {}
    }
  } else {
    clientCachedObservasi = null;
    clientCacheTimestamp = 0;
  }
  inFlightObservasiPromise = null;
}

export async function fetchObservasiClientCached(forceRefresh = false): Promise<ObservasiRecord[]> {
  if (
    !forceRefresh &&
    clientCachedObservasi &&
    clientCachedObservasi.length > 0 &&
    Date.now() - clientCacheTimestamp < CLIENT_CACHE_TTL_MS
  ) {
    return clientCachedObservasi;
  }

  if (!forceRefresh && inFlightObservasiPromise) {
    return inFlightObservasiPromise;
  }

  inFlightObservasiPromise = (async () => {
    try {
      const res = await fetch('/api/kamera-cerdas/observasi?summary=1');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          const hydrated = hydrateObservasiPhotos(json.data);
          invalidateObservasiClientCache(hydrated);
          return hydrated;
        }
      }
    } catch (err) {
      console.warn('[ObservasiCache] Fallback ke data tersimpan:', err);
    } finally {
      inFlightObservasiPromise = null;
    }
    return getInitialObservasiList();
  })();

  return inFlightObservasiPromise;
}
