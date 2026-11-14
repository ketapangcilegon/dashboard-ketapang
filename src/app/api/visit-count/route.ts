import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const REGION_NAMES_ID: Record<string, string> = {
  BT: 'Banten',
  JK: 'DKI Jakarta',
  JB: 'Jawa Barat',
  JT: 'Jawa Tengah',
  JI: 'Jawa Timur',
  YO: 'DI Yogyakarta',
  LA: 'Lampung',
  SS: 'Sumatera Selatan',
  SU: 'Sumatera Utara',
  SB: 'Sumatera Barat',
  RI: 'Riau',
  KR: 'Kepulauan Riau',
  JA: 'Jambi',
  BE: 'Bengkulu',
  BA: 'Bali',
  NB: 'Nusa Tenggara Barat',
  NT: 'Nusa Tenggara Timur',
  KB: 'Kalimantan Barat',
  KT: 'Kalimantan Tengah',
  KS: 'Kalimantan Selatan',
  KI: 'Kalimantan Timur',
  KU: 'Kalimantan Utara',
  SN: 'Sulawesi Selatan',
  ST: 'Sulawesi Tengah',
  SG: 'Sulawesi Tenggara',
  SA: 'Sulawesi Utara',
  SR: 'Sulawesi Barat',
  GO: 'Gorontalo',
  MA: 'Maluku',
  MU: 'Maluku Utara',
  PA: 'Papua',
  PB: 'Papua Barat',
};

function getWibDateParts(date = new Date()): {
  todayKey: string;
  thisMonthKey: string;
  lastMonthKey: string;
  todayLabel: string;
  thisMonthLabel: string;
  lastMonthLabel: string;
} {
  // Waktu Indonesia Barat (UTC+7)
  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const year = wib.getUTCFullYear();
  const month = wib.getUTCMonth() + 1; // 1..12
  const day = wib.getUTCDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${year}-${pad(month)}-${pad(day)}`;
  const thisMonthStr = `${year}-${pad(month)}`;

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const lastMonthStr = `${prevYear}-${pad(prevMonth)}`;

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return {
    todayKey: `day:${todayStr}`,
    thisMonthKey: `month:${thisMonthStr}`,
    lastMonthKey: `month:${lastMonthStr}`,
    todayLabel: `${day} ${namaBulan[month - 1]} ${year}`,
    thisMonthLabel: `${namaBulan[month - 1]} ${year}`,
    lastMonthLabel: `${namaBulan[prevMonth - 1]} ${prevYear}`,
  };
}

function extractVisitorGeo(request: NextRequest): {
  city: string;
  region: string;
  country: string;
  locationLabel: string;
  maskedIp: string;
  ipHash: string;
} {
  const rawFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const rawIp = rawFor.split(',')[0].trim();

  // Mask IP untuk privasi (misal: 103.144.12.88 -> 103.144.12.xxx)
  let maskedIp = 'IP Terlindungi';
  if (rawIp.includes('.')) {
    const parts = rawIp.split('.');
    if (parts.length === 4) {
      maskedIp = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  } else if (rawIp.includes(':')) {
    const parts = rawIp.split(':').filter(Boolean);
    maskedIp = parts.length >= 2 ? `${parts[0]}:${parts[1]}:****` : 'IPv6 Terlindungi';
  }

  const ua = request.headers.get('user-agent') || '';
  const ipHash = crypto
    .createHash('sha256')
    .update(`${rawIp}|${ua.slice(0, 60)}`)
    .digest('hex')
    .slice(0, 10);

  const safeDec = (val: string | null) => {
    if (!val) return '';
    try {
      return decodeURIComponent(val).trim();
    } catch {
      return val.trim();
    }
  };

  const countryCode = (safeDec(request.headers.get('x-vercel-ip-country')) || 'ID').toUpperCase();
  const regionCode = safeDec(request.headers.get('x-vercel-ip-country-region')).toUpperCase();
  const rawCity = safeDec(request.headers.get('x-vercel-ip-city'));

  const regionName =
    countryCode === 'ID' && REGION_NAMES_ID[regionCode]
      ? REGION_NAMES_ID[regionCode]
      : regionCode || (countryCode === 'ID' ? 'Banten' : countryCode);

  const cityName = rawCity || (countryCode === 'ID' ? 'Cilegon / Banten' : 'Luar Negeri');
  const countryName = countryCode === 'ID' ? 'Indonesia' : countryCode;
  const locationLabel = `${cityName}, ${regionName} (${countryCode})`;

  return {
    city: cityName,
    region: regionName,
    country: countryName,
    locationLabel,
    maskedIp,
    ipHash,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetPath = body.path || '/';

    const dbClient = createClient(supabaseUrl, supabaseKey);
    const { todayKey, thisMonthKey } = getWibDateParts();
    const { locationLabel, maskedIp, ipHash } = extractVisitorGeo(request);

    const locKey = `loc:${locationLabel}`;
    const onlineKey = `online:${ipHash}|${maskedIp}|${locationLabel}`;

    // 1. Increment total_count utama + metrik harian, bulanan, lokasi, dan sesi online secara paralel
    const [mainRes] = await Promise.all([
      dbClient.rpc('increment_visit_count', { target_path: targetPath }),
      dbClient.rpc('increment_visit_count', { target_path: todayKey }),
      dbClient.rpc('increment_visit_count', { target_path: thisMonthKey }),
      dbClient.rpc('increment_visit_count', { target_path: locKey }),
      dbClient.rpc('increment_visit_count', { target_path: onlineKey }),
    ]);

    if (mainRes.error) {
      console.error('[Visit Counter] Error incrementing:', mainRes.error.message);
      return NextResponse.json({ success: false, error: mainRes.error.message }, { status: 500 });
    }

    // 2. Pembersihan otomatis baris online kedaluwarsa (> 15 menit) agar ukuran tabel tetap < 5 KB
    const expireIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    dbClient
      .from('page_visits')
      .delete()
      .like('page_path', 'online:%')
      .lt('last_visited_at', expireIso)
      .then(() => {});

    return NextResponse.json({ success: true, total_count: Number(mainRes.data) });
  } catch (err: any) {
    console.error('[Visit Counter] POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path') || '/';
    const wantFullStats = searchParams.get('stats') === '1';

    const dbClient = createClient(supabaseUrl, supabaseKey);

    // Jika hanya meminta total_count untuk badge di Beranda (sangat ringan & di-cache CDN)
    if (!wantFullStats) {
      const { data, error } = await dbClient
        .from('page_visits')
        .select('total_count')
        .eq('page_path', targetPath)
        .single();

      if (error) {
        return NextResponse.json({ success: true, total_count: 0 });
      }

      return NextResponse.json(
        { success: true, total_count: Number(data?.total_count || 0) },
        {
          headers: {
            'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Mode lengkap (?stats=1): hanya dipanggil saat membuka panel Tentang Aplikasi
    const { todayKey, thisMonthKey, lastMonthKey, todayLabel, thisMonthLabel, lastMonthLabel } = getWibDateParts();
    const visitorGeo = extractVisitorGeo(request);
    const currentOnlineKey = `online:${visitorGeo.ipHash}|${visitorGeo.maskedIp}|${visitorGeo.locationLabel}`;

    // Pastikan sesi pengunjung saat ini tercatat aktif di daftar online
    await dbClient.rpc('increment_visit_count', { target_path: currentOnlineKey });

    // Bersihkan sesi online > 15 menit
    const expireMs = Date.now() - 15 * 60 * 1000;
    const expireIso = new Date(expireMs).toISOString();
    await dbClient
      .from('page_visits')
      .delete()
      .like('page_path', 'online:%')
      .lt('last_visited_at', expireIso);

    const { data: rows, error } = await dbClient
      .from('page_visits')
      .select('page_path, total_count, last_visited_at');

    if (error || !rows) {
      return NextResponse.json({ success: false, total_count: 0 }, { status: 500 });
    }

    let totalCount = 0;
    let lastVisitedAt: string | null = null;
    let todayCount = 0;
    let thisMonthCount = 0;
    let lastMonthCount = 0;

    const regions: Array<{
      location: string;
      count: number;
      last_visited_at: string;
    }> = [];

    const activeOnlineList: Array<{
      masked_ip: string;
      location: string;
      hits: number;
      last_seen: string;
    }> = [];

    for (const r of rows) {
      const p = String(r.page_path || '');
      const c = Number(r.total_count || 0);
      const ts = String(r.last_visited_at || '');

      if (p === targetPath) {
        totalCount = c;
        lastVisitedAt = ts;
      } else if (p === todayKey) {
        todayCount = c;
      } else if (p === thisMonthKey) {
        thisMonthCount = c;
      } else if (p === lastMonthKey) {
        lastMonthCount = c;
      } else if (p.startsWith('loc:')) {
        regions.push({
          location: p.slice(4),
          count: c,
          last_visited_at: ts,
        });
      } else if (p.startsWith('online:')) {
        const tsMs = new Date(ts).getTime();
        if (!Number.isNaN(tsMs) && tsMs >= expireMs) {
          const parts = p.slice(7).split('|');
          activeOnlineList.push({
            masked_ip: parts[1] || 'IP Terlindungi',
            location: parts[2] || 'Indonesia (ID)',
            hits: c,
            last_seen: ts,
          });
        }
      }
    }

    // Jika hari ini / bulan ini baru mulai dihitung setelah fitur diaktifkan, minimal sinkron dengan sesi aktif
    if (todayCount < 1 && activeOnlineList.length > 0) todayCount = activeOnlineList.length;
    if (thisMonthCount < todayCount) thisMonthCount = todayCount;
    if (regions.length === 0) {
      regions.push({
        location: visitorGeo.locationLabel,
        count: todayCount || 1,
        last_visited_at: new Date().toISOString(),
      });
    }

    regions.sort((a, b) => b.count - a.count);
    activeOnlineList.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());

    return NextResponse.json(
      {
        success: true,
        total_count: totalCount,
        online_count: Math.max(1, activeOnlineList.length),
        today_count: todayCount,
        this_month_count: thisMonthCount,
        last_month_count: lastMonthCount,
        today_label: todayLabel,
        this_month_label: thisMonthLabel,
        last_month_label: lastMonthLabel,
        last_visited_at: lastVisitedAt,
        current_visitor: {
          masked_ip: visitorGeo.maskedIp,
          location: visitorGeo.locationLabel,
        },
        regions: regions.slice(0, 15),
        active_sessions: activeOnlineList.slice(0, 10),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    console.error('[Visit Counter] GET Exception:', err);
    return NextResponse.json({ success: false, total_count: 0 }, { status: 500 });
  }
}
