const cheerio = require('cheerio');

// Disable TLS verification for Cilegon government site if self-signed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SAGON_URL = 'https://sagon.cilegon.go.id/';
const INFOGRAFIS_URL = 'https://sagon.cilegon.go.id/infografis/filter';

const COMMODITY_MAP = {
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

async function testDailyScraper() {
  console.log('🧪 Running Test: Daily market scraping pipeline...');
  const date = new Date().toISOString().split('T')[0]; // Try today
  
  const body = new URLSearchParams({
    id_pasar: '1',
    tanggal: date
  });

  const res = await fetch(SAGON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body
  });

  if (!res.ok) {
    throw new Error(`[FAIL] HTTP status ${res.status} returned by SAGON main website.`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  
  const tableExists = $('table.table-komoditi').length > 0;
  if (!tableExists) {
    console.log(`[WARN] Table 'table-komoditi' not found for date ${date}. This is normal if there are no listings for today.`);
  } else {
    let rowsCount = 0;
    $('table.table-komoditi tbody tr').each((_, row) => {
      const td = $(row).find('td');
      if (td.length === 4) {
        rowsCount++;
      }
    });
    console.log(`[PASS] Daily scraper HTML parse successful. Found ${rowsCount} commodity rows.`);
  }
}

async function testInfografisScraper() {
  console.log('🧪 Running Test: Infografis monthly scraping pipeline...');
  
  const body = new URLSearchParams({
    pasar: '1',
    tahun_pertama: '2025',
    tahun_kedua: '2026',
    daterange: '01/01/2025 - 12/31/2026'
  });

  const res = await fetch(INFOGRAFIS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body
  });

  if (!res.ok) {
    throw new Error(`[FAIL] HTTP status ${res.status} returned by SAGON infografis filter endpoint.`);
  }

  const html = await res.text();
  
  if (!html.includes('card-header')) {
    throw new Error(`[FAIL] Expected 'card-header' elements not found in response. SAGON layout might have changed.`);
  }

  const $ = cheerio.load(html);
  const cardHeaders = $('div.card-header');
  console.log(`[INFO] Found ${cardHeaders.length} card-header elements in Infografis.`);
  
  if (cardHeaders.length === 0) {
    throw new Error(`[FAIL] No 'card-header' elements found. SAGON layout changed.`);
  }

  let mappedCommoditiesCount = 0;
  let parsedSeriesCount = 0;

  cardHeaders.each((_, header) => {
    const headerText = $(header).find('strong').text().trim();
    if (!headerText) return;

    if (COMMODITY_MAP[headerText]) {
      mappedCommoditiesCount++;
    }

    let scriptText = '';
    $(header).parent().find('script').each((_, scr) => {
      const htmlText = $(scr).html() || '';
      if (htmlText.includes('series:')) {
        scriptText = htmlText;
      }
    });
    
    if (scriptText) {
      const seriesRegex = /name:\s*['"]([^'"]+)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;
      while ((match = seriesRegex.exec(scriptText)) !== null) {
        parsedSeriesCount++;
      }
    }
  });

  console.log(`[INFO] Found ${mappedCommoditiesCount} of our mapped commodities in SAGON.`);
  console.log(`[INFO] Successfully matched ${parsedSeriesCount} data series charts.`);

  if (mappedCommoditiesCount === 0) {
    throw new Error(`[FAIL] None of our target commodities could be found by name in SAGON headers. Name mapping might have broken.`);
  }

  if (parsedSeriesCount === 0) {
    throw new Error(`[FAIL] Could not parse any 'series' data from scripts. Chart plotting library structure might have changed on SAGON.`);
  }

  console.log('[PASS] Infografis scraper HTML and JS series parse successful.');
}

async function runTests() {
  console.log('================================================');
  console.log('🚀 STARTING SAGON PIPELINE INTEGRITY SMOKE TESTS');
  console.log('================================================');
  
  try {
    await testDailyScraper();
    await testInfografisScraper();
    console.log('\n================================================');
    console.log('✅ ALL SAGON PIPELINE TESTS PASSED SUCCESSFULLY!');
    console.log('================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n================================================');
    console.error('❌ PIPELINE TEST FAILED! DETECTED LAYOUT BREAKAGE:');
    console.error(err.message);
    console.error('================================================');
    process.exit(1);
  }
}

runTests();
