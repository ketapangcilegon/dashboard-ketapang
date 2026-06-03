const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testScrape(marketId) {
  const body = new URLSearchParams({
    pasar: marketId,
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
    const results = {};

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

      console.log(`\nFound matched header: "${headerText}" -> key: ${matchedKey}`);
      console.log(`Matched Script length: ${scriptText.length}`);

      // Let's test the regex
      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;
      let matchCount = 0;

      while ((match = seriesRegex.exec(scriptText)) !== null) {
        matchCount++;
        const year = match[1];
        const dataStr = match[2];
        console.log(`   Regex Match ${matchCount}: Year ${year}, Data string length: ${dataStr.length}`);
      }

      if (matchCount === 0) {
        console.log(`   Regex failed! Let's print a small snippet of scriptText near name:`);
        const nameIdx = scriptText.indexOf('name');
        if (nameIdx !== -1) {
          console.log(scriptText.substring(nameIdx - 10, nameIdx + 300));
        } else {
          console.log(scriptText.substring(0, 300));
        }
      }
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

testScrape('2'); // Test Blok F
