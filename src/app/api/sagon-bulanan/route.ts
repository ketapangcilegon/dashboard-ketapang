import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

// TLS bypass dipindah ke dalam fungsi scraping — tidak lagi di root module scope

interface CommodityData {
  beras: Record<string, number[]>;
  minyak: Record<string, number[]>;
  telur: Record<string, number[]>;
}

const FALLBACKS_2025 = {
  beras: 13200,
  minyak: 18000,
  telur: 29500
};

const FALLBACKS_2026_MARKETS: Record<string, { beras: number; minyak: number; telur: number }> = {
  '1': { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
  '2': { beras: 13500, minyak: 22000, telur: 30033 }, // Blok F
  '3': { beras: 14000, minyak: 21032, telur: 31967 }  // Merak
};

const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'] as const;

function avgMonthSeries(variants: number[][]): number[] {
  const out: number[] = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    let sum = 0;
    let cnt = 0;
    for (const arr of variants) {
      const v = arr?.[m] || 0;
      if (v > 0) {
        sum += v;
        cnt++;
      }
    }
    out[m] = cnt > 0 ? Math.round(sum / cnt) : 0;
  }
  return out;
}

async function scrapeMarketInfografis(
  marketId: string,
  prevYear: number,
  curYear: number
): Promise<{ data: CommodityData; isFallback: boolean }> {
  const yPrev = String(prevYear);
  const yCur = String(curYear);
  const defaultData: CommodityData = {
    beras: { [yPrev]: Array(12).fill(FALLBACKS_2025.beras), [yCur]: Array(12).fill(FALLBACKS_2026_MARKETS[marketId].beras) },
    minyak: { [yPrev]: Array(12).fill(FALLBACKS_2025.minyak), [yCur]: Array(12).fill(FALLBACKS_2026_MARKETS[marketId].minyak) },
    telur: { [yPrev]: Array(12).fill(FALLBACKS_2025.telur), [yCur]: Array(12).fill(FALLBACKS_2026_MARKETS[marketId].telur) }
  };

  try {
    const body = new URLSearchParams({
      id_pasar: marketId,
      tahun_pertama: yPrev,
      tahun_kedua: yCur,
      daterange: `01/01/${yPrev} - 12/31/${yCur}`
    });

    // TLS bypass scoped: aktif hanya saat request ke sagon.cilegon.go.id
    const _prevTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let response: Response;
    try {
      response = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body,
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 }
      });
    } finally {
      if (_prevTLS === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = _prevTLS;
    }

    if (!response.ok) return { data: defaultData, isFallback: true };

    const html = await response.text();
    const $ = cheerio.load(html);

    // Kumpulkan SEMUA varian per komoditas di pasar ini agar bisa dirata-ratakan (bukan saling menimpa):
    // 1. Beras Medium: wajib mengandung "beras" & "medium", serta BUKAN "premium"
    // 2. Minyak Kemasan: semua "minyak" (Minyakita, Minyak Goreng Kemasan, merk apapun) KECUALI "curah"
    // 3. Telur Ayam Ras: semua "telur" ayam ras/negeri (bukan kampung/bebek/puyuh)
    const variants: Record<'beras' | 'minyak' | 'telur', Record<string, number[][]>> = {
      beras: { [yPrev]: [], [yCur]: [] },
      minyak: { [yPrev]: [], [yCur]: [] },
      telur: { [yPrev]: [], [yCur]: [] },
    };

    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;
      const lower = headerText.toLowerCase();

      let matchedKey: 'beras' | 'minyak' | 'telur' | null = null;
      if (lower.includes('beras') && lower.includes('medium') && !lower.includes('premium')) {
        matchedKey = 'beras';
      } else if (lower.includes('minyak') && !lower.includes('curah')) {
        matchedKey = 'minyak';
      } else if (
        lower.includes('telur') &&
        !lower.includes('kampung') &&
        !lower.includes('bebek') &&
        !lower.includes('puyuh')
      ) {
        matchedKey = 'telur';
      }

      if (!matchedKey) return;

      const parent = $(header).parent();
      let scriptText = '';
      parent.find('script').each((_, scr) => {
        const htmlText = $(scr).html() || '';
        if (htmlText.includes('series:')) scriptText = htmlText;
      });

      if (!scriptText.includes('series:')) return;

      const seriesRegex = new RegExp(`name:\\s*['"](${yPrev}|${yCur})['"],\\s*data:\\s*\\[([^\\]]+)\\]`, 'g');
      let match;

      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const year = match[1];
        const dataStr = match[2];
        const dataArr = dataStr
          .split(',')
          .map(val => parseInt(val.trim().replace(/['"]/g, ''), 10))
          .map(val => isNaN(val) ? 0 : val);

        if (dataArr.length === 12 && variants[matchedKey][year]) {
          variants[matchedKey][year].push(dataArr);
        }
      }
    });

    const mergedData: CommodityData = {
      beras: { ...defaultData.beras },
      minyak: { ...defaultData.minyak },
      telur: { ...defaultData.telur },
    };
    let hasScrapedData = false;
    for (const key of ['beras', 'minyak', 'telur'] as const) {
      if (variants[key][yPrev].length > 0) {
        mergedData[key][yPrev] = avgMonthSeries(variants[key][yPrev]);
        hasScrapedData = true;
      }
      if (variants[key][yCur].length > 0) {
        mergedData[key][yCur] = avgMonthSeries(variants[key][yCur]);
        hasScrapedData = true;
      }
    }
    return { data: mergedData, isFallback: !hasScrapedData };
  } catch (err) {
    return { data: defaultData, isFallback: true };
  }
}

async function autoBackupPrices(year: number, month: number, prices: Record<string, { beras: number; minyak: number; telur: number }>) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      console.warn('[AutoBackup] ADMIN_EMAIL or ADMIN_PASSWORD not set in env. Skipping backup.');
      return;
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
      telur: p.telur
    }));

    // Perform sign in dynamically using isolated Supabase auth to write under RLS bypass
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (signInError) {
      console.error('[AutoBackup] Admin authentication failed:', signInError.message);
      return;
    }

    await authClient
      .from('harga_komoditas_skpg')
      .delete()
      .eq('tahun', year)
      .eq('bulan', month);

    const { error: upsertError } = await authClient
      .from('harga_komoditas_skpg')
      .insert(records);

    if (upsertError) {
      console.error('[AutoBackup] Price upsert failed:', upsertError.message);
    } else {
      console.log(`[AutoBackup] Successfully saved and backed up prices for ${year}/${month} into database.`);
    }
  } catch (err: any) {
    console.error('[AutoBackup] Error during automated backup:', err.message || err);
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

  const selectedMonth = monthParam ? parseInt(monthParam, 10) : 3;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : 2026;
  const cacheKey = `${selectedYear}-${selectedMonth}`;

  const cachedEntry = sagonBulananCache.get(cacheKey);
  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    return NextResponse.json(cachedEntry.payload, { headers: SAGON_CDN_HEADERS });
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();

  const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;
  const isCurFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

  if (isCurFuture) {
    const emptyPrices: Record<string, { beras: number; minyak: number; telur: number }> = {};
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
    const pricesCur: Record<string, { beras: number; minyak: number; telur: number }> = {};
    const pricesPrev: Record<string, { beras: number; minyak: number; telur: number }> = {};

    if (effectiveYear <= 2024) {
      // Tahun 2024 ke bawah: harga komoditas 6 (data historis)
      // prevPrices = rata-rata 3 bulan sebelumnya
      console.log(`[Sagon API] Year ${effectiveYear} <= 2024: fetching from DB with 3-month prior average.`);

      const { data: dbRows, error: dbError } = await supabase
        .from('harga_komoditas_skpg')
        .select('*')
        .in('tahun', [effectiveYear, effectiveYear - 1]);

      if (dbError) throw new Error(`Failed to fetch from Supabase: ${dbError.message}`);

      const findRecord = (y: number, m: number, kec: string) => dbRows?.find(r => r.tahun === y && r.bulan === m && r.kecamatan.toLowerCase() === kec.toLowerCase());

      const prevMonths: { tahun: number; bulan: number }[] = [];
      for (let i = 1; i <= 3; i++) {
        let pm = effectiveMonth - i, py = effectiveYear;
        if (pm <= 0) { pm += 12; py -= 1; }
        prevMonths.push({ tahun: py, bulan: pm });
      }

      for (const kec of KECAMATANS) {
        const curRow = findRecord(effectiveYear, effectiveMonth, kec);
        pricesCur[kec] = { beras: curRow ? Number(curRow.beras) : FALLBACKS_2025.beras, minyak: curRow ? Number(curRow.minyak) : FALLBACKS_2025.minyak, telur: curRow ? Number(curRow.telur) : FALLBACKS_2025.telur };

        let sumBeras = 0, sumMinyak = 0, sumTelur = 0, cB = 0, cM = 0, cT = 0;
        for (const pm of prevMonths) {
          const pmRow = findRecord(pm.tahun, pm.bulan, kec);
          if (pmRow) {
            if (Number(pmRow.beras) > 0) { sumBeras += Number(pmRow.beras); cB++; }
            if (Number(pmRow.minyak) > 0) { sumMinyak += Number(pmRow.minyak); cM++; }
            if (Number(pmRow.telur) > 0) { sumTelur += Number(pmRow.telur); cT++; }
          }
        }
        pricesPrev[kec] = { beras: cB > 0 ? Math.round(sumBeras / cB) : FALLBACKS_2025.beras, minyak: cM > 0 ? Math.round(sumMinyak / cM) : FALLBACKS_2025.minyak, telur: cT > 0 ? Math.round(sumTelur / cT) : FALLBACKS_2025.telur };
      }

    } else if (effectiveYear === 2025) {
      // Tahun 2025: 3 komoditas, prevPrices = YoY (bulan yang sama tahun 2024) dari DB
      console.log(`[Sagon API] Year 2025: fetching current from DB + YoY (2024 same month) as prev.`);

      const { data: dbCur, error: e1 } = await supabase
        .from('harga_komoditas_skpg')
        .select('*')
        .eq('tahun', 2025)
        .eq('bulan', effectiveMonth);

      const { data: dbPrev, error: e2 } = await supabase
        .from('harga_komoditas_skpg')
        .select('*')
        .eq('tahun', 2024)
        .eq('bulan', effectiveMonth);

      if (e1) throw new Error(`Failed to fetch 2025 prices: ${e1.message}`);

      for (const kec of KECAMATANS) {
        const curRow = dbCur?.find(r => r.kecamatan.toLowerCase() === kec.toLowerCase());
        const prevRow = dbPrev?.find(r => r.kecamatan.toLowerCase() === kec.toLowerCase());
        pricesCur[kec] = { beras: curRow ? Number(curRow.beras) : FALLBACKS_2025.beras, minyak: curRow ? Number(curRow.minyak) : FALLBACKS_2025.minyak, telur: curRow ? Number(curRow.telur) : FALLBACKS_2025.telur };
        pricesPrev[kec] = { beras: prevRow ? Number(prevRow.beras) : FALLBACKS_2025.beras, minyak: prevRow ? Number(prevRow.minyak) : FALLBACKS_2025.minyak, telur: prevRow ? Number(prevRow.telur) : FALLBACKS_2025.telur };
      }

    } else {
      // Tahun 2026 ke atas: 3 komoditas, curPrices & prevPrices dihitung konsisten dari rata-rata varian per pasar di SAGON
      // (Beras Medium non-premium, Minyak Kemasan non-curah termasuk Minyakita, Telur Ayam Ras) lalu dirata-ratakan 3 pasar
      console.log(`[Sagon API] Year ${effectiveYear} >= 2026: scraping Sagon per-market average for ${effectiveYear} & ${effectiveYear - 1} (month ${effectiveMonth}).`);

      const prevYear = effectiveYear - 1;
      const yCur = String(effectiveYear);
      const yPrev = String(prevYear);

      let anyFallback = false;
      const [m1Result, m2Result, m3Result] = await Promise.all([
        scrapeMarketInfografis('1', prevYear, effectiveYear),
        scrapeMarketInfografis('2', prevYear, effectiveYear),
        scrapeMarketInfografis('3', prevYear, effectiveYear)
      ]);
      const market1 = m1Result.data;
      const market2 = m2Result.data;
      const market3 = m3Result.data;
      anyFallback = m1Result.isFallback || m2Result.isFallback || m3Result.isFallback;

      const monthIdx = Math.max(0, Math.min(11, effectiveMonth - 1));

      const pricesMarketCur = {
        '1': { beras: market1.beras[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].beras, minyak: market1.minyak[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].minyak, telur: market1.telur[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].telur },
        '2': { beras: market2.beras[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].beras, minyak: market2.minyak[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].minyak, telur: market2.telur[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].telur },
        '3': { beras: market3.beras[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].beras, minyak: market3.minyak[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].minyak, telur: market3.telur[yCur]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].telur }
      };

      const pricesMarketPrev = {
        '1': { beras: market1.beras[yPrev]?.[monthIdx] || 0, minyak: market1.minyak[yPrev]?.[monthIdx] || 0, telur: market1.telur[yPrev]?.[monthIdx] || 0 },
        '2': { beras: market2.beras[yPrev]?.[monthIdx] || 0, minyak: market2.minyak[yPrev]?.[monthIdx] || 0, telur: market2.telur[yPrev]?.[monthIdx] || 0 },
        '3': { beras: market3.beras[yPrev]?.[monthIdx] || 0, minyak: market3.minyak[yPrev]?.[monthIdx] || 0, telur: market3.telur[yPrev]?.[monthIdx] || 0 }
      };

      // Market mapping: Kranggot(1)->Ciwandan,Citangkil,Purwakarta,Jombang | BlokF(2)->Cibeber,Cilegon | Merak(3)->Gerogol,Pulomerak
      Object.assign(pricesCur, {
        Cibeber: pricesMarketCur['2'],
        Cilegon: pricesMarketCur['2'],
        Pulomerak: pricesMarketCur['3'],
        Gerogol: pricesMarketCur['3'],
        Ciwandan: pricesMarketCur['1'],
        Jombang: pricesMarketCur['1'],
        Purwakarta: pricesMarketCur['1'],
        Citangkil: pricesMarketCur['1']
      });

      const marketPrevByKec: Record<string, { beras: number; minyak: number; telur: number }> = {
        Cibeber: pricesMarketPrev['2'],
        Cilegon: pricesMarketPrev['2'],
        Pulomerak: pricesMarketPrev['3'],
        Gerogol: pricesMarketPrev['3'],
        Ciwandan: pricesMarketPrev['1'],
        Jombang: pricesMarketPrev['1'],
        Purwakarta: pricesMarketPrev['1'],
        Citangkil: pricesMarketPrev['1']
      };

      // Gunakan hasil rata-rata varian SAGON tahun sebelumnya agar 100% apple-to-apple;
      // fallback ke DB harga_komoditas_skpg hanya jika nilai SAGON tahun lalu 0/kosong
      const { data: dbPrevRows } = await supabase.from('harga_komoditas_skpg').select('*').eq('tahun', prevYear).eq('bulan', effectiveMonth);
      for (const kec of KECAMATANS) {
        const sPrev = marketPrevByKec[kec];
        const dbRow = dbPrevRows?.find(r => r.kecamatan.toLowerCase() === kec.toLowerCase());
        pricesPrev[kec] = {
          beras: sPrev.beras > 0 ? sPrev.beras : (dbRow ? Number(dbRow.beras) : FALLBACKS_2025.beras),
          minyak: sPrev.minyak > 0 ? sPrev.minyak : (dbRow ? Number(dbRow.minyak) : FALLBACKS_2025.minyak),
          telur: sPrev.telur > 0 ? sPrev.telur : (dbRow ? Number(dbRow.telur) : FALLBACKS_2025.telur)
        };
      }

      // --- DYNAMIC DATABASE CACHE & AUTO-COPY SYSTEM ---
      let source = 'live';

      if (anyFallback) {
        // Try to fetch from DB cache first before using fallback constants
        try {
          const { data: dbRows } = await supabase
            .from('harga_komoditas_skpg')
            .select('*')
            .eq('tahun', effectiveYear)
            .eq('bulan', effectiveMonth);
            
          if (dbRows && dbRows.length >= 8) {
            for (const kec of KECAMATANS) {
              const dbRow = dbRows.find(r => r.kecamatan.toLowerCase() === kec.toLowerCase());
              if (dbRow && Number(dbRow.beras) > 0) {
                pricesCur[kec] = {
                  beras: Number(dbRow.beras),
                  minyak: Number(dbRow.minyak),
                  telur: Number(dbRow.telur)
                };
              }
            }
            source = 'database';
            anyFallback = false; // Successfully recovered via database cache!
          }
        } catch (dbErr) {
          console.warn('[Sagon API] Failed to fetch current prices from DB cache:', dbErr);
        }
      }

      if (anyFallback) {
        source = 'fallback';
      } else if (source === 'live') {
        // Automatically save/backup successfully scraped live prices to the DB
        autoBackupPrices(effectiveYear, effectiveMonth, pricesCur).catch(err => {
          console.error('[AutoBackup] Error triggered during request:', err);
        });
      }

      const payload2026 = { 
        success: true, 
        month: selectedMonth, 
        year: selectedYear, 
        pricesCur, 
        pricesPrev,
        source
      };
      sagonBulananCache.set(cacheKey, { payload: payload2026, expiresAt: Date.now() + SAGON_BULANAN_TTL_MS });
      return NextResponse.json(payload2026, { headers: SAGON_CDN_HEADERS });
    }

    const payloadDb = { 
      success: true, 
      month: selectedMonth, 
      year: selectedYear, 
      pricesCur, 
      pricesPrev,
      source: 'database'
    };
    sagonBulananCache.set(cacheKey, { payload: payloadDb, expiresAt: Date.now() + SAGON_BULANAN_TTL_MS });
    return NextResponse.json(payloadDb, { headers: SAGON_CDN_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
