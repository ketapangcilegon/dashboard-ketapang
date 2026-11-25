import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BMKG_ADM4_BY_KECAMATAN,
  SKPG_KECAMATANS,
  SkpgKecamatan,
  classifyIklimFromWeather,
} from '@/lib/skpg/scoring';

interface BMKGWeatherSlot {
  datetime?: string;
  local_datetime?: string;
  t?: number | string;
  hu?: number | string;
  ws?: number | string;
  tp?: number | string;
  weather_desc?: string;
  weather_desc_en?: string;
}

export interface KecamatanWeatherSummary {
  kecamatan: SkpgKecamatan;
  adm4: string;
  refKelurahan: string;
  suhuAvgC: number;
  suhuMaxC: number;
  kelembapanAvg: number;
  anginMaxKmh: number;
  estCurahHujanMm: number;
  maxDailyRainMm: number;
  hariHujanPrakiraan: number;
  cuacaDominan: string;
  statusIklim: 'AMAN' | 'WASPADA' | 'SIAGA' | 'AWAS';
  potensiIklim: 'NORMAL' | 'BASAH' | 'KERING';
  ringkasanIklim: string;
  source: 'bmkg_live' | 'supabase_cuaca_ml';
}

async function fetchBmkgForKecamatan(kecamatan: SkpgKecamatan): Promise<KecamatanWeatherSummary | null> {
  const { adm4, refKelurahan } = BMKG_ADM4_BY_KECAMATAN[kecamatan];
  const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 1800 }, // cache 30 menit di Next.js Data Cache agar hemat Vercel & BMKG
  });
  if (!res.ok) return null;

  const json = await res.json();
  const cuacaDays: BMKGWeatherSlot[][] = json?.data?.[0]?.cuaca;
  if (!Array.isArray(cuacaDays) || cuacaDays.length === 0) return null;

  let sumT = 0;
  let maxT = -Infinity;
  let sumHu = 0;
  let maxWs = 0;
  let totalTp = 0;
  let count = 0;
  let hasExtremeDesc = false;

  const rainByDay: Record<string, number> = {};
  const descCounts: Record<string, number> = {};

  for (const daySlots of cuacaDays) {
    if (!Array.isArray(daySlots)) continue;
    for (const slot of daySlots) {
      const t = typeof slot.t === 'number' ? slot.t : parseFloat(String(slot.t ?? ''));
      const hu = typeof slot.hu === 'number' ? slot.hu : parseFloat(String(slot.hu ?? ''));
      const ws = typeof slot.ws === 'number' ? slot.ws : parseFloat(String(slot.ws ?? '0'));
      const tp = typeof slot.tp === 'number' ? slot.tp : parseFloat(String(slot.tp ?? '0'));

      const dtKey = (slot.local_datetime || slot.datetime || '').slice(0, 10) || 'day';
      if (!rainByDay[dtKey]) rainByDay[dtKey] = 0;

      if (!Number.isNaN(t)) {
        sumT += t;
        if (t > maxT) maxT = t;
        sumHu += Number.isNaN(hu) ? 75 : hu;
        if (!Number.isNaN(ws) && ws > maxWs) maxWs = ws;
        const rainVal = Number.isNaN(tp) ? 0 : tp;
        totalTp += rainVal;
        rainByDay[dtKey] += rainVal;
        count++;
      }

      const desc = (slot.weather_desc || '').trim();
      if (desc) {
        descCounts[desc] = (descCounts[desc] || 0) + 1;
        if (/petir|lebat|ekstrem|badai/i.test(desc)) {
          hasExtremeDesc = true;
        }
      }
    }
  }

  if (count === 0) return null;

  const numDays = Math.max(1, Object.keys(rainByDay).length);
  const dailyRains = Object.values(rainByDay);
  const maxDailyRainMm = parseFloat(Math.max(0, ...dailyRains).toFixed(1));
  const hariHujanPrakiraan = dailyRains.filter((r) => r > 0.5).length;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const estCurahHujanMm = Math.round((totalTp / numDays) * daysInMonth);

  const suhuAvgC = parseFloat((sumT / count).toFixed(1));
  const suhuMaxC = parseFloat((maxT === -Infinity ? suhuAvgC : maxT).toFixed(1));
  const kelembapanAvg = Math.round(sumHu / count);
  const anginMaxKmh = parseFloat(maxWs.toFixed(1));

  const cuacaDominan =
    Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Berawan';

  const iklim = classifyIklimFromWeather({
    estCurahHujanMm,
    maxDailyRainMm,
    avgSuhuC: suhuAvgC,
    maxSuhuC: suhuMaxC,
    avgKelembapan: kelembapanAvg,
    maxAnginKmh: anginMaxKmh,
    hasExtremeDesc,
  });

  return {
    kecamatan,
    adm4,
    refKelurahan,
    suhuAvgC,
    suhuMaxC,
    kelembapanAvg,
    anginMaxKmh,
    estCurahHujanMm,
    maxDailyRainMm,
    hariHujanPrakiraan,
    cuacaDominan,
    statusIklim: iklim.status,
    potensiIklim: iklim.potensi,
    ringkasanIklim: iklim.ringkasan,
    source: 'bmkg_live',
  };
}

export async function GET() {
  // TLS bypass scoped hanya selama fetch ke api.bmkg.go.id
  const prevTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  let results: (KecamatanWeatherSummary | null)[] = [];
  try {
    results = await Promise.all(
      SKPG_KECAMATANS.map((kec) =>
        fetchBmkgForKecamatan(kec).catch(() => null)
      )
    );
  } finally {
    if (prevTLS === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTLS;
  }

  const validLive = results.filter((r): r is KecamatanWeatherSummary => r !== null);

  // Fallback ke tabel cuaca_ml Supabase bila BMKG sedang tidak bisa dijangkau
  let fallbackRow: {
    curah_hujan_mm: number;
    suhu_c: number;
    kelembapan: number;
    hari_hujan: number;
    kecepatan_angin: number;
  } | null = null;

  if (validLive.length < SKPG_KECAMATANS.length) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const sb = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await sb
          .from('cuaca_ml')
          .select('curah_hujan_mm, suhu_c, kelembapan, hari_hujan, kecepatan_angin')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false })
          .limit(1);
        if (data && data[0]) {
          fallbackRow = data[0];
        }
      }
    } catch {
      // ignore fallback error
    }
  }

  const finalList: KecamatanWeatherSummary[] = SKPG_KECAMATANS.map((kec, idx) => {
    const live = results[idx];
    if (live) return live;

    const { adm4, refKelurahan } = BMKG_ADM4_BY_KECAMATAN[kec];
    const ch = Number(fallbackRow?.curah_hujan_mm ?? 140);
    const suhu = Number(fallbackRow?.suhu_c ?? 28.5);
    const hu = Number(fallbackRow?.kelembapan ?? 78);
    const ws = Number(fallbackRow?.kecepatan_angin ?? 12);
    const iklim = classifyIklimFromWeather({
      estCurahHujanMm: ch,
      maxDailyRainMm: Math.round(ch / 15),
      avgSuhuC: suhu,
      maxSuhuC: suhu + 2.5,
      avgKelembapan: hu,
      maxAnginKmh: ws,
      hasExtremeDesc: false,
    });

    return {
      kecamatan: kec,
      adm4,
      refKelurahan,
      suhuAvgC: suhu,
      suhuMaxC: parseFloat((suhu + 2.5).toFixed(1)),
      kelembapanAvg: hu,
      anginMaxKmh: ws,
      estCurahHujanMm: ch,
      maxDailyRainMm: Math.round(ch / 15),
      hariHujanPrakiraan: Math.min(3, Math.round((fallbackRow?.hari_hujan ?? 10) / 10)),
      cuacaDominan: ch > 200 ? 'Hujan Ringan' : 'Berawan',
      statusIklim: iklim.status,
      potensiIklim: iklim.potensi,
      ringkasanIklim: iklim.ringkasan,
      source: 'supabase_cuaca_ml',
    };
  });

  // Hitung status iklim agregat Kota Cilegon (mengambil level kewaspadaan tertinggi sesuai Juknis hal. 28)
  const severityRank: Record<'AMAN' | 'WASPADA' | 'SIAGA' | 'AWAS', number> = {
    AMAN: 0,
    WASPADA: 1,
    SIAGA: 2,
    AWAS: 3,
  };
  const worst = [...finalList].sort(
    (a, b) => severityRank[b.statusIklim] - severityRank[a.statusIklim]
  )[0];

  const kotaSummary = {
    statusIklim: worst?.statusIklim || 'AMAN',
    potensiIklim: worst?.potensiIklim || 'NORMAL',
    avgSuhuC: parseFloat(
      (finalList.reduce((s, r) => s + r.suhuAvgC, 0) / finalList.length).toFixed(1)
    ),
    avgKelembapan: Math.round(
      finalList.reduce((s, r) => s + r.kelembapanAvg, 0) / finalList.length
    ),
    avgEstCurahHujanMm: Math.round(
      finalList.reduce((s, r) => s + r.estCurahHujanMm, 0) / finalList.length
    ),
    maxAnginKmh: parseFloat(Math.max(...finalList.map((r) => r.anginMaxKmh)).toFixed(1)),
    liveCount: validLive.length,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      success: true,
      kotaSummary,
      kecamatanList: finalList,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    }
  );
}
