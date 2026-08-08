const cheerio = require('cheerio');

async function testFetchYears() {
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
  
  console.log("Years found in chart:", yearsFound);
}

testFetchYears().catch(console.error);
