const fs = require('fs');
const cheerio = require('cheerio');

async function testScrape() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('Fetching data from SAGON...');
  
  // We need to fetch from 2022 to 2026. Sagon's filter can take daterange.
  // But maybe we should fetch one market first to see.
  // Pasar Kranggot is '1'.
  
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
  
  const commodities = [];
  
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

    if (scriptText) {
      commodities.push(headerText);
    }
  });

  console.log('Found commodities:', commodities);
  
  // Try extracting data for the first commodity
  const firstScript = $('div.card-header').first().parent().find('script').html();
  if (firstScript) {
    const seriesRegex = /name:\s*['"](\d{4})['"],\s*data:\s*\[([^\]]+)\]/g;
    let match;
    const seriesData = {};
    while ((match = seriesRegex.exec(firstScript)) !== null) {
      const year = match[1];
      const dataStr = match[2];
      const dataArr = dataStr.split(',').map(val => parseInt(val.trim().replace(/['"]/g, ''), 10)).map(val => isNaN(val) ? 0 : val);
      seriesData[year] = dataArr;
    }
    console.log('First commodity data:', seriesData);
  }
}

testScrape().catch(console.error);
