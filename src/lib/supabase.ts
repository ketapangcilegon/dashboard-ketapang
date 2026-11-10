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

const REST_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes client-side deduplication & cache
const MAX_CACHE_ENTRIES = 120;
const MAX_CACHEABLE_BYTES = 512 * 1024; // Only cache payloads <= 512 KB in memory

const restGetCache = new Map<string, CachedRestResponse>();
const inFlightRestRequests = new Map<string, Promise<CachedRestResponse>>();

export function clearSupabaseRestCache() {
  restGetCache.clear();
  inFlightRestRequests.clear();
}

const customDeduplicatedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase();

  // Only deduplicate & cache browser-side PostgREST GET queries
  const isBrowser = typeof window !== 'undefined';
  const isRestEndpoint = url.includes('/rest/v1/');

  if (!isBrowser || !isRestEndpoint) {
    return fetch(input, init);
  }

  // Any mutation (POST, PATCH, PUT, DELETE) immediately invalidates cached GET responses
  if (method !== 'GET' && method !== 'HEAD') {
    restGetCache.clear();
    return fetch(input, init);
  }

  if (method !== 'GET') {
    return fetch(input, init);
  }

  const headersObj = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
  const cacheKey = `${url}::${headersObj.get('accept') || ''}::${headersObj.get('range') || ''}::${headersObj.get('prefer') || ''}`;

  const now = Date.now();
  const cached = restGetCache.get(cacheKey);
  if (cached && now - cached.timestamp < REST_CACHE_TTL_MS) {
    return new Response(cached.bodyText, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }

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
    const res = await fetch(input, sharedInit);
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

    if (res.ok && bodyText.length <= MAX_CACHEABLE_BYTES) {
      if (restGetCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = restGetCache.keys().next().value;
        if (oldestKey) restGetCache.delete(oldestKey);
      }
      restGetCache.set(cacheKey, entry);
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customDeduplicatedFetch,
  },
});
