const cheerio = require('cheerio');

// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function printKranggotScripts() {
  console.log('Fetching Kranggot filter response...');
  
  const body = new URLSearchParams({
    pasar: '1', // Kranggot
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
    
    // Find script tags inside div.card-body
    $('div.card-body').each((i, card) => {
      const headerText = $(card).find('div.card-header strong').text().trim();
      if (headerText.includes('Beras Medium') || headerText.includes('Telur Ayam Ras') || headerText.includes('Minyak')) {
        console.log(`\n=================== CARD: ${headerText} ===================`);
        const scriptText = $(card).find('script').html() || '';
        
        // Print lines containing 'series' and the next 15 lines
        const lines = scriptText.split('\n');
        let foundSeries = false;
        let count = 0;
        
        for (const line of lines) {
          if (line.includes('series:')) {
            foundSeries = true;
          }
          if (foundSeries) {
            console.log(line);
            count++;
            if (count > 25) break; // print 25 lines
          }
        }
      }
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

printKranggotScripts();
