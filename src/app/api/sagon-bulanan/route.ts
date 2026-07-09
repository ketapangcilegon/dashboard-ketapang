import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

async function scrapeMarketInfografis(marketId: string): Promise<CommodityData> {
  const defaultData: CommodityData = {
    beras: { '2025': Array(12).fill(FALLBACKS_2025.beras), '2026': Array(12).fill(FALLBACKS_2026_MARKETS[marketId].beras) },
    minyak: { '2025': Array(12).fill(FALLBACKS_2025.minyak), '2026': Array(12).fill(FALLBACKS_2026_MARKETS[marketId].minyak) },
    telur: { '2025': Array(12).fill(FALLBACKS_2025.telur), '2026': Array(12).fill(FALLBACKS_2026_MARKETS[marketId].telur) }
  };

  try {
    const body = new URLSearchParams({
      pasar: marketId,
      tahun_pertama: '2025',
      tahun_kedua: '2026',
      daterange: '01/01/2025 - 12/31/2026'
    });

    const response = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body,
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 86400 }
    });

    if (!response.ok) return defaultData;

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any = {};

    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;

      let matchedKey: 'beras' | 'minyak' | 'telur' | null = null;
      if (['beras medium (cimanuk)', 'beras medium (dk)', 'beras medium', 'beras'].some(alias => headerText.toLowerCase().includes(alias))) {
        matchedKey = 'beras';
      } else if (['minyak goreng kemasan', 'minyak goreng', 'minyakita', 'minyak kemasan'].some(alias => headerText.toLowerCase().includes(alias))) {
        matchedKey = 'minyak';
      } else if (['telur ayam ras', 'telur ayam', 'telur'].some(alias => headerText.toLowerCase().includes(alias))) {
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

      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;

      if (!results[matchedKey]) results[matchedKey] = {};

      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const year = match[1];
        const dataStr = match[2];
        const dataArr = dataStr
          .split(',')
          .map(val => parseInt(val.trim().replace(/['"]/g, ''), 10))
          .map(val => isNaN(val) ? 0 : val);

        results[matchedKey][year] = dataArr;
      }
    });

    const mergedData = { ...defaultData };
    for (const key of ['beras', 'minyak', 'telur'] as const) {
      if (results[key]) {
        if (results[key]['2025'] && results[key]['2025'].length === 12) mergedData[key]['2025'] = results[key]['2025'];
        if (results[key]['2026'] && results[key]['2026'].length === 12) mergedData[key]['2026'] = results[key]['2026'];
      }
    }
    return mergedData;
  } catch (err) {
    return defaultData;
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

    const { error: upsertError } = await authClient
      .from('harga_komoditas_skpg')
      .upsert(records, { onConflict: 'tahun, bulan, kecamatan' });

    if (upsertError) {
      console.error('[AutoBackup] Price upsert failed:', upsertError.message);
    } else {
      console.log(`[AutoBackup] Successfully saved and backed up prices for ${year}/${month} into database.`);
    }
  } catch (err: any) {
    console.error('[AutoBackup] Error during automated backup:', err.message || err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const selectedMonth = monthParam ? parseInt(monthParam, 10) : 3;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : 2026;

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
      // Tahun 2026 ke atas: 3 komoditas, curPrices = scraping SAGON live, prevPrices = YoY dari DB (tahun-1, bulan sama)
      console.log(`[Sagon API] Year ${effectiveYear} >= 2026: scraping Sagon + YoY from DB (${effectiveYear - 1}/${effectiveMonth}).`);

      const [market1, market2, market3] = await Promise.all([scrapeMarketInfografis('1'), scrapeMarketInfografis('2'), scrapeMarketInfografis('3')]);
      const monthIdx = Math.max(0, Math.min(11, effectiveMonth - 1));

      const pricesMarket = {
        '1': { beras: market1.beras[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].beras, minyak: market1.minyak[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].minyak, telur: market1.telur[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['1'].telur },
        '2': { beras: market2.beras[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].beras, minyak: market2.minyak[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].minyak, telur: market2.telur[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['2'].telur },
        '3': { beras: market3.beras[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].beras, minyak: market3.minyak[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].minyak, telur: market3.telur[String(effectiveYear)]?.[monthIdx] || FALLBACKS_2026_MARKETS['3'].telur }
      };

      const getCitangkilAverage = () => ({
        beras: Math.round((pricesMarket['1'].beras + pricesMarket['2'].beras + pricesMarket['3'].beras) / 3),
        minyak: Math.round((pricesMarket['1'].minyak + pricesMarket['2'].minyak + pricesMarket['3'].minyak) / 3),
        telur: Math.round((pricesMarket['1'].telur + pricesMarket['2'].telur + pricesMarket['3'].telur) / 3)
      });

      Object.assign(pricesCur, { Cibeber: pricesMarket['2'], Cilegon: pricesMarket['2'], Pulomerak: pricesMarket['3'], Gerogol: pricesMarket['3'], Ciwandan: pricesMarket['1'], Jombang: pricesMarket['1'], Purwakarta: pricesMarket['1'], Citangkil: getCitangkilAverage() });

      const { data: dbRows } = await supabase.from('harga_komoditas_skpg').select('*').eq('tahun', effectiveYear - 1).eq('bulan', effectiveMonth);
      for (const kec of KECAMATANS) {
        const dbRow = dbRows?.find(r => r.kecamatan.toLowerCase() === kec.toLowerCase());
        pricesPrev[kec] = { beras: dbRow ? Number(dbRow.beras) : FALLBACKS_2025.beras, minyak: dbRow ? Number(dbRow.minyak) : FALLBACKS_2025.minyak, telur: dbRow ? Number(dbRow.telur) : FALLBACKS_2025.telur };
      }

      // --- AUTOMATED BACKUP TRIGGER ---
      // Check if this month is completed or if it is the end of the current month (>= 23:30)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const isPastMonth = effectiveYear < currentYear || (effectiveYear === currentYear && effectiveMonth < currentMonth);
      const isBackupTime = (
        effectiveYear === currentYear &&
        effectiveMonth === currentMonth &&
        currentDate === lastDayOfCurrentMonth &&
        (currentHour > 23 || (currentHour === 23 && currentMinute >= 30))
      );

      if (isPastMonth || isBackupTime) {
        // Run backup asynchronously without blocking response
        autoBackupPrices(effectiveYear, effectiveMonth, pricesCur).catch(err => {
          console.error('[AutoBackup] Error triggered during request:', err);
        });
      }
    }

    return NextResponse.json({ success: true, month: selectedMonth, year: selectedYear, pricesCur, pricesPrev });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
