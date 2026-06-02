import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface CommodityData {
  beras: Record<string, number[]>;
  minyak: Record<string, number[]>;
  telur: Record<string, number[]>;
}

// Fallback arrays (12 identical elements representing Jan-Dec)
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
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      console.warn(`[Sagon Monthly] Market ${marketId} request failed. Using fallback data.`);
      return defaultData;
    }

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

      const cardBody = $(header).next('div.card-body');
      const scriptText = cardBody.find('script').html() || '';

      if (!scriptText.includes('series:')) return;

      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;

      if (!results[matchedKey]) {
        results[matchedKey] = {};
      }

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

    // Merge scrapped data into defaults (in case some commodities are missing in response)
    const mergedData = { ...defaultData };
    for (const key of ['beras', 'minyak', 'telur'] as const) {
      if (results[key]) {
        if (results[key]['2025'] && results[key]['2025'].length === 12) {
          mergedData[key]['2025'] = results[key]['2025'];
        }
        if (results[key]['2026'] && results[key]['2026'].length === 12) {
          mergedData[key]['2026'] = results[key]['2026'];
        }
      }
    }

    return mergedData;
  } catch (err) {
    console.error(`[Sagon Monthly] Error scraping market ${marketId}:`, err);
    return defaultData;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const selectedMonth = monthParam ? parseInt(monthParam, 10) : 3;
  const selectedYear = yearParam ? parseInt(yearParam, 10) : 2026;

  // Month Index: Jan = 0, Feb = 1, ..., Dec = 11
  const monthIdx = Math.max(0, Math.min(11, selectedMonth - 1));
  const prevYear = selectedYear - 1;

  console.log(`[Sagon Monthly] Fetching dynamic market prices for Month Index ${monthIdx} (Year: ${selectedYear} vs ${prevYear})`);

  try {
    // Fetch all 3 markets concurrently
    const [market1, market2, market3] = await Promise.all([
      scrapeMarketInfografis('1'), // Kranggot
      scrapeMarketInfografis('2'), // Blok F
      scrapeMarketInfografis('3')  // Merak
    ]);

    // Extract values for requested month index
    const pricesMarket = {
      '1': {
        cur: {
          beras: market1.beras[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['1'].beras,
          minyak: market1.minyak[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['1'].minyak,
          telur: market1.telur[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['1'].telur,
        },
        prev: {
          beras: market1.beras[String(prevYear)][monthIdx] || FALLBACKS_2025.beras,
          minyak: market1.minyak[String(prevYear)][monthIdx] || FALLBACKS_2025.minyak,
          telur: market1.telur[String(prevYear)][monthIdx] || FALLBACKS_2025.telur,
        }
      },
      '2': {
        cur: {
          beras: market2.beras[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['2'].beras,
          minyak: market2.minyak[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['2'].minyak,
          telur: market2.telur[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['2'].telur,
        },
        prev: {
          beras: market2.beras[String(prevYear)][monthIdx] || FALLBACKS_2025.beras,
          minyak: market2.minyak[String(prevYear)][monthIdx] || FALLBACKS_2025.minyak,
          telur: market2.telur[String(prevYear)][monthIdx] || FALLBACKS_2025.telur,
        }
      },
      '3': {
        cur: {
          beras: market3.beras[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['3'].beras,
          minyak: market3.minyak[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['3'].minyak,
          telur: market3.telur[String(selectedYear)][monthIdx] || FALLBACKS_2026_MARKETS['3'].telur,
        },
        prev: {
          beras: market3.beras[String(prevYear)][monthIdx] || FALLBACKS_2025.beras,
          minyak: market3.minyak[String(prevYear)][monthIdx] || FALLBACKS_2025.minyak,
          telur: market3.telur[String(prevYear)][monthIdx] || FALLBACKS_2025.telur,
        }
      }
    };

    // Helper to calculate Citangkil balanced average of the 3 markets
    const getCitangkilAverage = (yearKey: 'cur' | 'prev') => {
      const b = Math.round((pricesMarket['1'][yearKey].beras + pricesMarket['2'][yearKey].beras + pricesMarket['3'][yearKey].beras) / 3);
      const m = Math.round((pricesMarket['1'][yearKey].minyak + pricesMarket['2'][yearKey].minyak + pricesMarket['3'][yearKey].minyak) / 3);
      const t = Math.round((pricesMarket['1'][yearKey].telur + pricesMarket['2'][yearKey].telur + pricesMarket['3'][yearKey].telur) / 3);
      return { beras: b, minyak: m, telur: t };
    };

    // Apply official market mapping rules per Kecamatan
    const mappedPricesCur = {
      Cibeber:    pricesMarket['2'].cur, // Blok F
      Cilegon:    pricesMarket['2'].cur, // Blok F
      Pulomerak:  pricesMarket['3'].cur, // Merak
      Gerogol:    pricesMarket['3'].cur, // Merak
      Ciwandan:   pricesMarket['1'].cur, // Kranggot
      Jombang:    pricesMarket['1'].cur, // Kranggot
      Purwakarta: pricesMarket['1'].cur, // Kranggot
      Citangkil:  getCitangkilAverage('cur') // Balanced Average
    };

    const mappedPricesPrev = {
      Cibeber:    pricesMarket['2'].prev,
      Cilegon:    pricesMarket['2'].prev,
      Pulomerak:  pricesMarket['3'].prev,
      Gerogol:    pricesMarket['3'].prev,
      Ciwandan:   pricesMarket['1'].prev,
      Jombang:    pricesMarket['1'].prev,
      Purwakarta: pricesMarket['1'].prev,
      Citangkil:  getCitangkilAverage('prev')
    };

    return NextResponse.json({
      success: true,
      month: selectedMonth,
      year: selectedYear,
      pricesCur: mappedPricesCur,
      pricesPrev: mappedPricesPrev
    });
  } catch (err: any) {
    console.error('[Sagon Monthly API] Server error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Server error while scraping monthly data'
    }, { status: 500 });
  }
}
