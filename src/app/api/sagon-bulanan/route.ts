import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

// ============================================================================
// /api/sagon-bulanan
// Penautan Harga Pangan per Pasar Tradisional Kota Cilegon untuk Analisis SKPG:
// - Pasar 1 (id_jenis_pasar='1' : Pasar Kranggot / Pasar Baru Cilegon)
//     -> Kecamatan Jombang, Purwakarta, Ciwandan, Citangkil (beserta seluruh kelurahannya)
// - Pasar 2 (id_jenis_pasar='2' : Pasar Kavling Blok F)
//     -> Kecamatan Cilegon, Cibeber (beserta seluruh kelurahannya)
// - Pasar 3 (id_jenis_pasar='3' : Pasar Baru Merak)
//     -> Kecamatan Pulomerak, Gerogol (beserta seluruh kelurahannya)
//
// Komoditas SKPG:
// 1. Beras Medium: rata-rata semua varian beras berlabel "medium" (non-premium) di pasar tsb (anti-anomali)
// 2. Minyak Goreng Kemasan: rata-rata semua minyak kemasan termasuk Minyakita & merk lain (non-curah, anti-anomali)
// 3. Telur Ayam Ras: harga telur ayam ras di pasar tsb
// ============================================================================

const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'] as const;

type MarketPrices = { beras: number; minyak: number; telur: number };

const FALLBACKS_2025_MARKETS: Record<'1' | '2' | '3', MarketPrices> = {
  '1': { beras: 13500, minyak: 18500, telur: 28500 }, // Kranggot
  '2': { beras: 14000, minyak: 19500, telur: 28500 }, // Blok F
  '3': { beras: 15000, minyak: 19500, telur: 29000 }, // Merak
};

const FALLBACKS_2026_MARKETS: Record<'1' | '2' | '3', MarketPrices> = {
  '1': { beras: 14000, minyak: 18850, telur: 25500 }, // Kranggot
  '2': { beras: 13500, minyak: 19350, telur: 25500 }, // Blok F
  '3': { beras: 14000, minyak: 21000, telur: 26000 }, // Merak
};

// Rata-rata aman dengan filter anti-anomali (membuang nilai di luar rentang wajar atau deviasi ekstrem dari median)
function safeAverageNonAnomaly(values: number[], minValid: number, maxValid: number, maxRelDiffFromMedian = 0.55): number {
  const inBounds = values.filter((v) => Number.isFinite(v) && v >= minValid && v <= maxValid);
  if (inBounds.length === 0) return 0;
  if (inBounds.length === 1) return Math.round(inBounds[0]);

  const sorted = [...inBounds].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const filtered = inBounds.filter((v) => Math.abs(v - median) / Math.max(1, median) <= maxRelDiffFromMedian);
  const target = filtered.length > 0 ? filtered : inBounds;
  return Math.round(target.reduce((s, v) => s + v, 0) / target.length);
}

// Scrape harga 1 pasar pada 1 tanggal spesifik dari https://sagon.cilegon.go.id/laporan
async function scrapeLaporanMarketDate(marketId: '1' | '2' | '3', isoDate: string): Promise<MarketPrices | null> {
  const _prevTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  let response: Response;
  try {
    response = await fetch('https://sagon.cilegon.go.id/laporan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: new URLSearchParams({ id_jenis_pasar: marketId, tanggal: isoDate }),
      signal: AbortSignal.timeout(7000),
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  } finally {
    if (_prevTLS === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = _prevTLS;
  }

  if (!response.ok) return null;
  const html = await response.text();
  const $ = cheerio.load(html);

  const berasMed: number[] = [];
  const minyakKem: number[] = [];
  const telurRas: number[] = [];

  $('table tbody tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length < 5) return;
    const kom = $(tds[1]).text().trim().toLowerCase();
    // Kolom index 4 adalah "Harga Hari ini" (atau fallback kolom index 3 "Rata Rata Kemarin" bila hari libur/0)
    const todayRaw = $(tds[4]).text().trim().split(/[^\d.]/)[0]?.replace(/\./g, '') || '';
    const yestRaw = $(tds[3]).text().trim().split(/[^\d.]/)[0]?.replace(/\./g, '') || '';
    const val = parseInt(todayRaw, 10) || parseInt(yestRaw, 10) || 0;
    if (val <= 0) return;

    if (kom.includes('beras') && kom.includes('medium') && !kom.includes('premium')) {
      berasMed.push(val);
    } else if (kom.includes('minyak') && !kom.includes('curah')) {
      minyakKem.push(val);
    } else if (kom.includes('telur') && !kom.includes('kampung') && !kom.includes('bebek') && !kom.includes('puyuh')) {
      telurRas.push(val);
    }
  });

  const beras = safeAverageNonAnomaly(berasMed, 8000, 30000, 0.45);
  const minyak = safeAverageNonAnomaly(minyakKem, 10000, 40000, 0.55);
  const telur = safeAverageNonAnomaly(telurRas, 15000, 55000, 0.45);

  if (beras <= 0 && minyak <= 0 && telur <= 0) return null;
  return { beras, minyak, telur };
}

// Hitung rata-rata bulanan 1 pasar dengan 4 titik sampel mingguan dalam bulan tsb (tanggal 07, 14, 21, 28/akhir bulan)
async function scrapeMarketMonthlyAverage(marketId: '1' | '2' | '3', year: number, month: number): Promise<MarketPrices | null> {
  const now = new Date();
  const lastDay = new Date(year, month, 0).getDate();
  const maxDay = (year === now.getFullYear() && month === now.getMonth() + 1)
    ? Math.min(lastDay, now.getDate())
    : lastDay;

  const candidateDays = Array.from(new Set([7, 14, 21, Math.min(28, maxDay), maxDay].filter((d) => d >= 1 && d <= maxDay))).slice(0, 4);
  if (candidateDays.length === 0) return null;

  const mm = String(month).padStart(2, '0');
  const samples = await Promise.all(
    candidateDays.map((d) => scrapeLaporanMarketDate(marketId, `${year}-${mm}-${String(d).padStart(2, '0')}`))
  );

  const valid = samples.filter((s): s is MarketPrices => s !== null);
  if (valid.length === 0) return null;

  const beras = safeAverageNonAnomaly(valid.map((v) => v.beras).filter((x) => x > 0), 8000, 30000, 0.45);
  const minyak = safeAverageNonAnomaly(valid.map((v) => v.minyak).filter((x) => x > 0), 10000, 40000, 0.55);
  const telur = safeAverageNonAnomaly(valid.map((v) => v.telur).filter((x) => x > 0), 15000, 55000, 0.45);

  if (beras <= 0 || minyak <= 0 || telur <= 0) return null;
  return { beras, minyak, telur };
}

function mapMarketsToKecamatans(m1: MarketPrices, m2: MarketPrices, m3: MarketPrices): Record<string, MarketPrices> {
  return {
    // Pasar Kavling Blok F (2) -> Cibeber & Cilegon
    Cibeber: { ...m2 },
    Cilegon: { ...m2 },
    // Pasar Baru Merak (3) -> Pulomerak & Gerogol
    Pulomerak: { ...m3 },
    Gerogol: { ...m3 },
    // Pasar Kranggot / Baru Cilegon (1) -> Ciwandan, Jombang, Purwakarta, Citangkil
    Ciwandan: { ...m1 },
    Jombang: { ...m1 },
    Purwakarta: { ...m1 },
    Citangkil: { ...m1 },
  };
}

async function savePeriodPricesToDb(year: number, month: number, prices: Record<string, MarketPrices>) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!supabaseUrl || (!serviceKey && !anonKey)) return;

    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl, serviceKey || anonKey, {
      auth: { persistSession: false },
    });

    if (!serviceKey) {
      if (!adminEmail || !adminPassword) return;
      const { error: signInErr } = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (signInErr) return;
    }

    const records = Object.entries(prices).map(([kec, p]) => ({
      tahun: year,
      bulan: month,
      kecamatan: kec,
      beras: p.beras,
      jagung: 0,
      gula: 0,
      minyak: p.minyak,
      daging: 0,
      telur: p.telur,
    }));

    await client.from('harga_komoditas_skpg').delete().eq('tahun', year).eq('bulan', month);
    await client.from('harga_komoditas_skpg').insert(records);
  } catch (err) {
    console.warn('[AutoBackup SAGON] Warning:', err);
  }
}

const SAGON_BULANAN_TTL_MS = 30 * 60 * 1000; // 30 menit server memory cache
const sagonBulananCache = new Map<string, { payload: Record<string, unknown>; expiresAt: number }>();

const SAGON_CDN_HEADERS = {
  'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=7200',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const forceScrape = searchParams.get('refresh') === '1';

  const selectedMonth = monthParam ? parseInt(monthParam, 10) : 3;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : 2026;
  const cacheKey = `${selectedYear}-${selectedMonth}`;

  if (!forceScrape) {
    const cachedEntry = sagonBulananCache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      return NextResponse.json(cachedEntry.payload, { headers: SAGON_CDN_HEADERS });
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();

  const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;
  const isCurFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

  if (isCurFuture) {
    const emptyPrices: Record<string, MarketPrices> = {};
    for (const kec of KECAMATANS) emptyPrices[kec] = { beras: 0, minyak: 0, telur: 0 };
    return NextResponse.json({ success: true, month: selectedMonth, year: selectedYear, pricesCur: emptyPrices, pricesPrev: emptyPrices });
  }

  let effectiveMonth = selectedMonth;
  let effectiveYear = selectedYear;

  if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
    effectiveMonth = selectedMonth - 1;
    if (effectiveMonth === 0) {
      effectiveMonth = 12;
      effectiveYear = selectedYear - 1;
    }
  }

  try {
    let pricesCur: Record<string, MarketPrices> = {};
    let pricesPrev: Record<string, MarketPrices> = {};

    if (effectiveYear <= 2024) {
      // Tahun 2024 ke bawah: data historis DB + rata-rata 3 bulan sebelumnya
      const { data: dbRows, error: dbError } = await supabase
        .from('harga_komoditas_skpg')
        .select('tahun, bulan, kecamatan, beras, minyak, telur')
        .in('tahun', [effectiveYear, effectiveYear - 1]);

      if (dbError) throw new Error(`Failed to fetch from Supabase: ${dbError.message}`);

      const findRecord = (y: number, m: number, kec: string) =>
        dbRows?.find((r) => r.tahun === y && r.bulan === m && r.kecamatan.toLowerCase() === kec.toLowerCase());

      const prevMonths: { tahun: number; bulan: number }[] = [];
      for (let i = 1; i <= 3; i++) {
        let pm = effectiveMonth - i;
        let py = effectiveYear;
        if (pm <= 0) {
          pm += 12;
          py -= 1;
        }
        prevMonths.push({ tahun: py, bulan: pm });
      }

      const fb = FALLBACKS_2025_MARKETS['1'];
      for (const kec of KECAMATANS) {
        const curRow = findRecord(effectiveYear, effectiveMonth, kec);
        pricesCur[kec] = {
          beras: curRow ? Number(curRow.beras) : fb.beras,
          minyak: curRow ? Number(curRow.minyak) : fb.minyak,
          telur: curRow ? Number(curRow.telur) : fb.telur,
        };

        let sumBeras = 0, sumMinyak = 0, sumTelur = 0, cB = 0, cM = 0, cT = 0;
        for (const pm of prevMonths) {
          const pmRow = findRecord(pm.tahun, pm.bulan, kec);
          if (pmRow) {
            if (Number(pmRow.beras) > 0) { sumBeras += Number(pmRow.beras); cB++; }
            if (Number(pmRow.minyak) > 0) { sumMinyak += Number(pmRow.minyak); cM++; }
            if (Number(pmRow.telur) > 0) { sumTelur += Number(pmRow.telur); cT++; }
          }
        }
        pricesPrev[kec] = {
          beras: cB > 0 ? Math.round(sumBeras / cB) : fb.beras,
          minyak: cM > 0 ? Math.round(sumMinyak / cM) : fb.minyak,
          telur: cT > 0 ? Math.round(sumTelur / cT) : fb.telur,
        };
      }

      const payload2024 = { success: true, month: selectedMonth, year: selectedYear, pricesCur, pricesPrev, source: 'database' };
      sagonBulananCache.set(cacheKey, { payload: payload2024, expiresAt: Date.now() + SAGON_BULANAN_TTL_MS });
      return NextResponse.json(payload2024, { headers: SAGON_CDN_HEADERS });
    }

    // Tahun 2025 ke atas (YoY bulan sama tahun sebelumnya):
    // 1. Strategi DB-First (hemat kuota free tier Vercel & Supabase): cek harga_komoditas_skpg terlebih dahulu
    const prevYear = effectiveYear - 1;
    const { data: dbBoth } = await supabase
      .from('harga_komoditas_skpg')
      .select('tahun, bulan, kecamatan, beras, minyak, telur')
      .in('tahun', [effectiveYear, prevYear])
      .eq('bulan', effectiveMonth);

    const curRows = (dbBoth || []).filter((r) => r.tahun === effectiveYear && Number(r.beras) > 0);
    const prevRows = (dbBoth || []).filter((r) => r.tahun === prevYear && Number(r.beras) > 0);

    let source: 'database' | 'live' | 'fallback' = 'database';

    // Ambil/lengkapi harga tahun berjalan (effectiveYear)
    if (!forceScrape && curRows.length >= 8) {
      for (const kec of KECAMATANS) {
        const r = curRows.find((x) => x.kecamatan.toLowerCase() === kec.toLowerCase());
        pricesCur[kec] = {
          beras: Number(r?.beras) || FALLBACKS_2026_MARKETS['1'].beras,
          minyak: Number(r?.minyak) || FALLBACKS_2026_MARKETS['1'].minyak,
          telur: Number(r?.telur) || FALLBACKS_2026_MARKETS['1'].telur,
        };
      }
    } else {
      // Scrape langsung per pasar dari /laporan (Pasar 1 Kranggot, Pasar 2 Blok F, Pasar 3 Merak)
      const [m1, m2, m3] = await Promise.all([
        scrapeMarketMonthlyAverage('1', effectiveYear, effectiveMonth),
        scrapeMarketMonthlyAverage('2', effectiveYear, effectiveMonth),
        scrapeMarketMonthlyAverage('3', effectiveYear, effectiveMonth),
      ]);
      if (m1 && m2 && m3) {
        pricesCur = mapMarketsToKecamatans(m1, m2, m3);
        source = 'live';
        savePeriodPricesToDb(effectiveYear, effectiveMonth, pricesCur).catch(() => {});
      } else {
        pricesCur = mapMarketsToKecamatans(
          m1 || FALLBACKS_2026_MARKETS['1'],
          m2 || FALLBACKS_2026_MARKETS['2'],
          m3 || FALLBACKS_2026_MARKETS['3']
        );
        source = m1 || m2 || m3 ? 'live' : 'fallback';
      }
    }

    // Ambil/lengkapi harga 1 tahun sebelumnya pada bulan yang sama (prevYear)
    if (!forceScrape && prevRows.length >= 8) {
      for (const kec of KECAMATANS) {
        const r = prevRows.find((x) => x.kecamatan.toLowerCase() === kec.toLowerCase());
        pricesPrev[kec] = {
          beras: Number(r?.beras) || FALLBACKS_2025_MARKETS['1'].beras,
          minyak: Number(r?.minyak) || FALLBACKS_2025_MARKETS['1'].minyak,
          telur: Number(r?.telur) || FALLBACKS_2025_MARKETS['1'].telur,
        };
      }
    } else {
      const [pm1, pm2, pm3] = await Promise.all([
        scrapeMarketMonthlyAverage('1', prevYear, effectiveMonth),
        scrapeMarketMonthlyAverage('2', prevYear, effectiveMonth),
        scrapeMarketMonthlyAverage('3', prevYear, effectiveMonth),
      ]);
      if (pm1 && pm2 && pm3) {
        pricesPrev = mapMarketsToKecamatans(pm1, pm2, pm3);
        savePeriodPricesToDb(prevYear, effectiveMonth, pricesPrev).catch(() => {});
      } else {
        pricesPrev = mapMarketsToKecamatans(
          pm1 || FALLBACKS_2025_MARKETS['1'],
          pm2 || FALLBACKS_2025_MARKETS['2'],
          pm3 || FALLBACKS_2025_MARKETS['3']
        );
      }
    }

    const payload = {
      success: true,
      month: selectedMonth,
      year: selectedYear,
      pricesCur,
      pricesPrev,
      source,
    };
    sagonBulananCache.set(cacheKey, { payload, expiresAt: Date.now() + SAGON_BULANAN_TTL_MS });
    return NextResponse.json(payload, { headers: SAGON_CDN_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
