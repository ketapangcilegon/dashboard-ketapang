const cheerio = require('cheerio');

async function fetchYears(y1, y2) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const body = new URLSearchParams({
    pasar: '1',
    tahun_pertama: y1.toString(),
    tahun_kedua: y2.toString(),
    daterange: `01/01/${y1} - 12/31/${y2}`
  });

  const res = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0'
    },
    body
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  
  const header = $('div.card-header').first();
  let scriptText = '';
  header.parent().find('script').each((_, scr) => {
    const htmlText = $(scr).html() || '';
    if (htmlText.includes('series:')) {
      scriptText = htmlText;
    }
  });

  const seriesRegex = /name:\s*['"]([^'"]+)['"]/g;
  let match;
  const yearsFound = [];
  while ((match = seriesRegex.exec(scriptText)) !== null) {
    yearsFound.push(match[1]);
  }
  
  console.log(`Requested ${y1} & ${y2} -> Got:`, yearsFound);
}

async function run() {
  await fetchYears(2022, 2023);
  await fetchYears(2024, 2025);
  await fetchYears(2026, 2026);
}

run().catch(console.error);
