import * as cheerio from 'cheerio';

// Use @supabase/supabase-js directly to use SERVICE_ROLE_KEY
import { createClient } from '@supabase/supabase-js';

const COMMODITY_MAP: Record<string, string> = {
  'Beras Medium (Cimanuk)': 'harga_beras',
  'Bawang Merah': 'harga_bawang_merah',
  'Bawang Putih Bonggol': 'harga_bawang_putih',
  'Cabe Merah Besar': 'harga_cabai_merah',
  'Cabe Rawit Merah': 'harga_cabai_rawit',
  'Daging Sapi Murni': 'harga_daging_sapi',
  'Daging Ayam Ras': 'harga_daging_ayam_ras',
  'Telur Ayam Ras': 'harga_telur_ayam_ras',
  'Gula Pasir': 'harga_gula_pasir',
  'Minyak Goreng Kemasan': 'harga_minyak_goreng'
};



async function scrapeMarketDaily(marketId: string, date: string): Promise<Record<string, number> | null> {
  try {
    const body = new URLSearchParams({
      id_pasar: marketId,
      tanggal: date
    });

    const res = await fetch('https://sagon.cilegon.go.id/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body
    });

    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes('table-komoditi')) return null;

    const $ = cheerio.load(html);
    const data: Record<string, number> = {};
    $('table.table-komoditi tbody tr').each((_, row) => {
      const td = $(row).find('td');
      if (td.length === 4) {
        const commodity = $(td[1]).text().trim();
        const priceStr = $(td[3]).text().trim().replace(/\./g, '');
        const price = parseInt(priceStr, 10);
        if (!isNaN(price) && price > 0 && COMMODITY_MAP[commodity]) {
          data[COMMODITY_MAP[commodity]] = price;
        }
      }
    });

    return data;
  } catch (err) {
    console.error(`[ETL] Error scraping daily market ${marketId} on ${date}:`, err);
    return null;
  }
}

async function scrapeMonthDaily(year: number, month: number): Promise<Record<string, number> | null> {
  const dateStr = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const daysToTry = [15, 16, 17, 14, 13, 18, 12, 19, 11, 20, 10, 21, 9, 22, 8, 23, 7, 24, 6, 25, 5, 26, 4, 27, 3, 28, 2, 29, 1, 30, 31];

  for (const day of daysToTry) {
    const date = dateStr(day);
    const data1 = await scrapeMarketDaily('1', date);
    if (data1 && Object.keys(data1).length > 0) {
      const data2 = await scrapeMarketDaily('2', date);
      const data3 = await scrapeMarketDaily('3', date);

      const merged: Record<string, number> = {};
      for (const colName of Object.values(COMMODITY_MAP)) {
        const prices: number[] = [];
        if (data1[colName]) prices.push(data1[colName]);
        if (data2 && data2[colName]) prices.push(data2[colName]);
        if (data3 && data3[colName]) prices.push(data3[colName]);

        if (prices.length > 0) {
          merged[colName] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }
      return merged;
    }
  }
  return null;
}

export async function runETLPipeline() {
  console.log('[ETL] Memulai ekstraksi data dari SAGON...');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // 1. Ambil data 2025-2026 dari endpoint infografis/filter
  const body = new URLSearchParams({
    pasar: '1',
    tahun_pertama: '2025',
    tahun_kedua: '2026',
    daterange: '01/01/2025 - 12/31/2026'
  });

  const res = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body
  });

  if (!res.ok) {
    throw new Error(`Gagal menghubungi SAGON infografis: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  
  const rawData: Record<string, Record<string, number[]>> = {};
  let commodityCount = 0;
  
  $('div.card-header').each((_, header) => {
    const headerText = $(header).find('strong').text().trim();
    if (!headerText) return;

    let scriptText = '';
    $(header).parent().find('script').each((_, scr) => {
      const htmlText = $(scr).html() || '';
      if (htmlText.includes('series:')) {
        scriptText = htmlText;
      }
    });
    
    if (!scriptText) return;

    const seriesRegex = /name:\s*['"]([^'"]+)['"],\s*data:\s*\[([^\]]+)\]/g;
    let match;
    const commodityData: Record<string, number[]> = {};
    
    while ((match = seriesRegex.exec(scriptText)) !== null) {
      const seriesName = match[1];
      
      if (seriesName.toLowerCase().includes('het') || 
          seriesName.toLowerCase().includes('hap') || 
          seriesName.toLowerCase().includes('referensi')) {
        continue;
      }
      
      const year = parseInt(seriesName, 10);
      if (!isNaN(year) && year >= 2025 && year <= 2026) {
        const dataArr = match[2]
          .split(',')
          .map(val => parseInt(val.trim().replace(/['"]/g, ''), 10))
          .map(val => isNaN(val) ? 0 : val);
        
        commodityData[year] = dataArr;
      }
    }

    if (Object.keys(commodityData).length > 0) {
      rawData[headerText] = commodityData;
      commodityCount++;
    }
  });

  console.log(`[ETL] Ekstraksi bulanan (2025-2026) sukses. Ditemukan ${commodityCount} komoditas.`);

  // 2. Ambil data harian representatif untuk 2023-2024 dan Desember 2022 (secara paralel)
  const monthsToScrape: { year: number; month: number }[] = [];
  for (let year = 2022; year <= 2024; year++) {
    const startMonth = year === 2022 ? 12 : 1;
    for (let month = startMonth; month <= 12; month++) {
      monthsToScrape.push({ year, month });
    }
  }

  console.log(`[ETL] Men-scrape data harian untuk ${monthsToScrape.length} bulan (Des 2022 - Des 2024)...`);
  const scrapedMonthsResults = await Promise.all(
    monthsToScrape.map(async ({ year, month }) => {
      const data = await scrapeMonthDaily(year, month);
      return { year, month, data };
    })
  );

  const dailyData: Record<number, Record<number, Record<string, number>>> = {};
  for (const result of scrapedMonthsResults) {
    if (result.data) {
      if (!dailyData[result.year]) dailyData[result.year] = {};
      dailyData[result.year][result.month] = result.data;
    }
  }

  // 3. Ekstrapolasi mundur untuk Jan 2022 - Nov 2022 berdasarkan baseline Des 2022
  const dec2022Data = dailyData[2022]?.[12];
  if (!dec2022Data) {
    throw new Error('Gagal mendapatkan data baseline Desember 2022.');
  }

  const inflationRates: Record<string, number> = {
    harga_beras: 0.004,
    harga_bawang_merah: 0.008,
    harga_bawang_putih: 0.005,
    harga_cabai_merah: 0.012,
    harga_cabai_rawit: 0.015,
    harga_daging_sapi: 0.002,
    harga_daging_ayam_ras: 0.005,
    harga_telur_ayam_ras: 0.003,
    harga_gula_pasir: 0.002,
    harga_minyak_goreng: 0.004
  };

  if (!dailyData[2022]) dailyData[2022] = {};
  for (let month = 1; month <= 11; month++) {
    const monthData: Record<string, number> = {};
    const monthsDiff = 12 - month;
    for (const [colName, decPrice] of Object.entries(dec2022Data)) {
      const rate = inflationRates[colName] || 0.005;
      monthData[colName] = Math.round(decPrice * (1 - monthsDiff * rate));
    }
    dailyData[2022][month] = monthData;
  }

  console.log('[ETL] Ekstrapolasi mundur untuk Jan-Nov 2022 berhasil.');

  // 4. Transformasi (Pivoting dan Penggabungan)
  console.log('[ETL] Memulai transformasi (Pivoting)...');
  const rows: Record<number, Record<number, Record<string, number | null>>> = {};

  // Pivot 2025-2026
  for (const [commodityRawName, yearData] of Object.entries(rawData)) {
    const colName = COMMODITY_MAP[commodityRawName];
    if (!colName) continue;
    
    for (const [yearStr, monthArray] of Object.entries(yearData)) {
      const year = parseInt(yearStr, 10);
      if (!rows[year]) rows[year] = {};
      
      monthArray.forEach((price, index) => {
        const month = index + 1;
        if (!rows[year][month]) {
          rows[year][month] = { tahun: year, bulan: month };
        }
        rows[year][month][colName] = price === 0 ? null : price;
      });
    }
  }

  // Gabungkan 2022, 2023, 2024
  for (let year = 2022; year <= 2024; year++) {
    if (!rows[year]) rows[year] = {};
    for (let month = 1; month <= 12; month++) {
      if (!rows[year][month]) {
        rows[year][month] = { tahun: year, bulan: month };
      }
      const monthData = dailyData[year]?.[month] || {};
      for (const colName of Object.values(COMMODITY_MAP)) {
        rows[year][month][colName] = monthData[colName] ?? null;
      }
    }
  }

  const flatRows: Record<string, number | null>[] = [];
  for (const year of Object.keys(rows).sort()) {
    for (const month of Object.keys(rows[parseInt(year)]).sort((a,b) => parseInt(a) - parseInt(b))) {
      flatRows.push(rows[parseInt(year)][parseInt(month)]);
    }
  }

  console.log(`[ETL] Transformasi sukses. Total baris: ${flatRows.length}. Mengunggah ke Supabase...`);

  // 5. Muat (Load) ke Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Kredensial Supabase tidak ditemukan (URL atau KEY).');
  }

  const adminSupabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await adminSupabase
    .from('harga_pangan_ml')
    .upsert(flatRows, { onConflict: 'tahun, bulan' });

  if (error) {
    console.error('[ETL] Error saat upsert ke Supabase:', error);
    throw new Error(`Gagal menyimpan ke Supabase: ${error.message}`);
  }

  console.log('[ETL] Upload ke Supabase berhasil!');

  return {
    totalRows: flatRows.length,
    commodityCount
  };
}
