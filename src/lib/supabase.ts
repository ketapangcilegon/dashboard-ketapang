import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface CachedRestResponse {
  bodyText: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  timestamp: number;
}

const SHORT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit untuk tabel operasional/dinamis
const LONG_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam untuk tabel referensi/historis yang jarang berubah
const MAX_CACHE_ENTRIES = 150;
const MAX_MEMORY_CACHE_BYTES = 512 * 1024; // <= 512 KB di RAM
const MAX_LOCALSTORAGE_BYTES = 180 * 1024; // <= 180 KB per entry di localStorage agar kuota browser aman
const LS_REST_PREFIX = 'panci_rest_v2_';
const LS_API_PREFIX = 'panci_api_v2_';

// Tabel yang datanya bersifat operasional harian (TTL 30 menit di localStorage)
const SHORT_TTL_TABLES = new Set([
  'forecast_result',
  'dashboard_media',
  'harga_sagon_harian',
  'sp_cache_data',
  'page_visits',
  'feature_access_settings',
]);

const restGetCache = new Map<string, CachedRestResponse>();
const inFlightRestRequests = new Map<string, Promise<CachedRestResponse>>();

function hashCacheKey(raw: string): string {
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function getRestTtlForUrl(url: string): number {
  const match = url.match(/\/rest\/v1\/([a-zA-Z0-9_]+)/);
  const tableName = match ? match[1] : '';
  return SHORT_TTL_TABLES.has(tableName) ? SHORT_CACHE_TTL_MS : LONG_CACHE_TTL_MS;
}

function readFromLocalStorageCache(prefix: string, rawKey: string, ttlMs: number): CachedRestResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const lsKey = prefix + hashCacheKey(rawKey);
    const raw = localStorage.getItem(lsKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRestResponse & { k?: string };
    if (parsed.k && parsed.k !== rawKey) return null;
    if (Date.now() - parsed.timestamp > ttlMs) {
      localStorage.removeItem(lsKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeToLocalStorageCache(prefix: string, rawKey: string, entry: CachedRestResponse) {
  if (typeof window === 'undefined') return;
  if (entry.bodyText.length > MAX_LOCALSTORAGE_BYTES) return;
  const lsKey = prefix + hashCacheKey(rawKey);
  const serialized = JSON.stringify({ ...entry, k: rawKey });
  try {
    localStorage.setItem(lsKey, serialized);
  } catch {
    // Jika localStorage penuh, bersihkan cache lama berprefiks panci_ lalu coba sekali lagi
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(LS_REST_PREFIX) || k.startsWith(LS_API_PREFIX))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(lsKey, serialized);
    } catch {
      // Abaikan jika browser memblokir storage
    }
  }
}

export function clearSupabaseRestCache() {
  restGetCache.clear();
  inFlightRestRequests.clear();
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(LS_REST_PREFIX) || k.startsWith(LS_API_PREFIX))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}

// Simpan referensi native fetch sebelum di-wrap
const nativeFetch: typeof fetch =
  typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

const customDeduplicatedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase();

  // Hanya deduplikasi & cache query PostgREST di sisi browser
  const isBrowser = typeof window !== 'undefined';
  const isRestEndpoint = url.includes('/rest/v1/');

  if (!isBrowser || !isRestEndpoint) {
    return nativeFetch(input, init);
  }

  // Setiap mutasi (POST, PATCH, PUT, DELETE) langsung mengosongkan cache agar perubahan Admin langsung tampil
  if (method !== 'GET' && method !== 'HEAD') {
    clearSupabaseRestCache();
    return nativeFetch(input, init);
  }

  if (method !== 'GET') {
    return nativeFetch(input, init);
  }

  const headersObj = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
  const cacheKey = `${url}::${headersObj.get('accept') || ''}::${headersObj.get('range') || ''}::${headersObj.get('prefer') || ''}`;
  const ttlMs = getRestTtlForUrl(url);

  const now = Date.now();
  // 1. Cek Memory Cache (0 ms)
  const memCached = restGetCache.get(cacheKey);
  if (memCached && now - memCached.timestamp < ttlMs) {
    return new Response(memCached.bodyText, {
      status: memCached.status,
      statusText: memCached.statusText,
      headers: memCached.headers,
    });
  }

  // 2. Cek Persistent localStorage Cache untuk pengunjung berulang / refresh halaman (0 network request!)
  const lsCached = readFromLocalStorageCache(LS_REST_PREFIX, cacheKey, ttlMs);
  if (lsCached) {
    restGetCache.set(cacheKey, lsCached);
    return new Response(lsCached.bodyText, {
      status: lsCached.status,
      statusText: lsCached.statusText,
      headers: lsCached.headers,
    });
  }

  // 3. Deduplikasi request paralel yang sedang berjalan
  const existingInFlight = inFlightRestRequests.get(cacheKey);
  if (existingInFlight) {
    const shared = await existingInFlight;
    return new Response(shared.bodyText, {
      status: shared.status,
      statusText: shared.statusText,
      headers: shared.headers,
    });
  }

  const fetchPromise = (async (): Promise<CachedRestResponse> => {
    const { signal: _omitSignal, ...sharedInit } = init || {};
    void _omitSignal;
    const res = await nativeFetch(input, sharedInit);
    const bodyText = await res.text();
    const headerPairs: [string, string][] = [];
    res.headers.forEach((val, key) => {
      headerPairs.push([key, val]);
    });

    const entry: CachedRestResponse = {
      bodyText,
      status: res.status,
      statusText: res.statusText,
      headers: headerPairs,
      timestamp: Date.now(),
    };

    if (res.ok && bodyText.length <= MAX_MEMORY_CACHE_BYTES) {
      if (restGetCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = restGetCache.keys().next().value;
        if (oldestKey) restGetCache.delete(oldestKey);
      }
      restGetCache.set(cacheKey, entry);
      writeToLocalStorageCache(LS_REST_PREFIX, cacheKey, entry);
    }

    return entry;
  })();

  inFlightRestRequests.set(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return new Response(result.bodyText, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  } finally {
    inFlightRestRequests.delete(cacheKey);
  }
};

// ============================================================================
// INTERCEPTOR GLOBAL UNTUK READ-ONLY NEXT.JS API ROUTES DI BROWSER
// Mengeliminasi panggilan ganda (/api/harga-sagon 4x, /api/sagon-bulanan 3x, dll.)
// dan menyimpan hasilnya di localStorage agar tidak membebani Vercel Fast Origin Transfer.
// ============================================================================
const CACHEABLE_INTERNAL_API_PATTERNS: { pattern: RegExp; ttlMs: number }[] = [
  { pattern: /^\/api\/harga-sagon(?:\?|$)/, ttlMs: 30 * 60 * 1000 },
  { pattern: /^\/api\/sagon-bulanan(?:\?|$)/, ttlMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/agro-climate\/sawah(?:\?|$)/, ttlMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/sp-sync(?:\?|$)/, ttlMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/settings\/feature-access(?:\?|$)/, ttlMs: 5 * 60 * 1000 },
  { pattern: /^\/api\/visit-count\?/, ttlMs: 5 * 60 * 1000 },
  { pattern: /^\/api\/kamera-cerdas\/observasi\?summary=1/, ttlMs: 30 * 60 * 1000 },
];

const apiMemoryCache = new Map<string, CachedRestResponse>();
const apiInFlight = new Map<string, Promise<CachedRestResponse>>();

if (typeof window !== 'undefined' && !(window as unknown as { __panciFetchWrapped?: boolean }).__panciFetchWrapped) {
  (window as unknown as { __panciFetchWrapped?: boolean }).__panciFetchWrapped = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase();

    // Normalisasi URL internal (/api/...)
    let relativePath = rawUrl;
    if (rawUrl.startsWith(window.location.origin)) {
      relativePath = rawUrl.slice(window.location.origin.length);
    }

    if (relativePath.startsWith('/api/')) {
      // Jika ada mutasi (POST/PUT/PATCH/DELETE) ke /api/, bersihkan cache API terkait
      if (method !== 'GET' && method !== 'HEAD') {
        if (relativePath.startsWith('/api/visit-count')) {
          // Biarkan POST /api/visit-count lewat sekali per sesi, tetapi jangan hapus semua cache lain
          apiMemoryCache.forEach((_v, k) => {
            if (k.startsWith('/api/visit-count')) apiMemoryCache.delete(k);
          });
        } else {
          apiMemoryCache.clear();
          clearSupabaseRestCache();
        }
        return nativeFetch(input, init);
      }

      const matchedRule = CACHEABLE_INTERNAL_API_PATTERNS.find((r) => r.pattern.test(relativePath));
      const bypassCache = relativePath.includes('refresh=1') || relativePath.includes('force=true');

      if (method === 'GET' && matchedRule && !bypassCache) {
        const now = Date.now();
        const memHit = apiMemoryCache.get(relativePath);
        if (memHit && now - memHit.timestamp < matchedRule.ttlMs) {
          return new Response(memHit.bodyText, {
            status: memHit.status,
            statusText: memHit.statusText,
            headers: memHit.headers,
          });
        }

        const lsHit = readFromLocalStorageCache(LS_API_PREFIX, relativePath, matchedRule.ttlMs);
        if (lsHit) {
          apiMemoryCache.set(relativePath, lsHit);
          return new Response(lsHit.bodyText, {
            status: lsHit.status,
            statusText: lsHit.statusText,
            headers: lsHit.headers,
          });
        }

        const inflight = apiInFlight.get(relativePath);
        if (inflight) {
          const shared = await inflight;
          return new Response(shared.bodyText, {
            status: shared.status,
            statusText: shared.statusText,
            headers: shared.headers,
          });
        }

        const promise = (async (): Promise<CachedRestResponse> => {
          const { signal: _omit, ...restInit } = init || {};
          void _omit;
          const res = await nativeFetch(input, restInit);
          const bodyText = await res.text();
          const headers: [string, string][] = [];
          res.headers.forEach((v, k) => headers.push([k, v]));

          const entry: CachedRestResponse = {
            bodyText,
            status: res.status,
            statusText: res.statusText,
            headers,
            timestamp: Date.now(),
          };

          if (res.ok && bodyText.length <= MAX_MEMORY_CACHE_BYTES) {
            apiMemoryCache.set(relativePath, entry);
            writeToLocalStorageCache(LS_API_PREFIX, relativePath, entry);
          }
          return entry;
        })();

        apiInFlight.set(relativePath, promise);
        try {
          const result = await promise;
          return new Response(result.bodyText, {
            status: result.status,
            statusText: result.statusText,
            headers: result.headers,
          });
        } finally {
          apiInFlight.delete(relativePath);
        }
      }
    }

    return nativeFetch(input, init);
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customDeduplicatedFetch,
  },
});
