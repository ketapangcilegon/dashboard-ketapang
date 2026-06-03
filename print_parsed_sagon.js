const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testScrape(marketId) {
  const body = new URLSearchParams({
    id_pasar: marketId,
    tahun_pertama: '2025',
    tahun_kedua: '2026',
    daterange: '01/01/2025 - 12/31/2026'
  });

  try {
    const response = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log(`\n=================== MARKET ${marketId} ===================`);

    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;

      let matchedKey = null;
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
        if (htmlText.includes('series:')) {
          scriptText = htmlText;
        }
      });

      if (!scriptText.includes('series:')) return;

      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;

      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const year = match[1];
        const dataStr = match[2];
        const dataArr = dataStr
          .split(',')
          .map(val => parseInt(val.trim().replace(/['"]/g, ''), 10))
          .map(val => isNaN(val) ? 0 : val);

        console.log(`${headerText} [${year}] (Jan):`, dataArr[0]);
      }
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

async function run() {
  await testScrape('1'); // Kranggot
  await testScrape('2'); // Blok F
  await testScrape('3'); // Merak
}

run();
