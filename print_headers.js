const cheerio = require('cheerio');

// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function printHeaders() {
  console.log('Fetching Kranggot filter response to read headers...');
  
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
    
    console.log('Total card headers found:', $('div.card-header').length);
    $('div.card-header').each((i, el) => {
      console.log(`Header ${i + 1}: "${$(el).text().trim()}"`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

printHeaders();
