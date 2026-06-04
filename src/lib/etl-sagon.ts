import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase'; // We should use the existing supabase client if possible

// Or use @supabase/supabase-js directly to use SERVICE_ROLE_KEY
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

function toSnakeCase(str: string) {
  return 'harga_' + str
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

export async function runETLPipeline() {
  console.log('[ETL] Memulai ekstraksi data dari SAGON...');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const body = new URLSearchParams({
    pasar: '1',
    tahun_pertama: '2022',
    tahun_kedua: '2026',
    daterange: '01/01/2022 - 12/31/2026'
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
    throw new Error(`Gagal menghubungi SAGON: HTTP ${res.status}`);
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
      if (!isNaN(year) && year >= 2022 && year <= 2026) {
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

  console.log(`[ETL] Ekstraksi sukses. Ditemukan ${commodityCount} komoditas.`);
  console.log('[ETL] Memulai transformasi (Pivoting)...');

  const rows: Record<number, Record<number, any>> = {};
  const columnsSet = new Set(['tahun', 'bulan']);

  for (const [commodityRawName, yearData] of Object.entries(rawData)) {
    let colName = COMMODITY_MAP[commodityRawName];
    
    // Skip commodities not explicitly mapped to prevent Supabase schema errors
    if (!colName) continue;
    
    columnsSet.add(colName);
    
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

  const flatRows: any[] = [];
  for (const year of Object.keys(rows).sort()) {
    for (const month of Object.keys(rows[parseInt(year)]).sort((a,b) => parseInt(a) - parseInt(b))) {
      flatRows.push(rows[parseInt(year)][parseInt(month)]);
    }
  }

  console.log(`[ETL] Transformasi sukses. Total baris: ${flatRows.length}. Mengunggah ke Supabase...`);

  // Ensure we have permission to write. If SUPABASE_SERVICE_ROLE_KEY is set, use it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Kredensial Supabase tidak ditemukan (URL atau KEY).');
  }

  const adminSupabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await adminSupabase
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
