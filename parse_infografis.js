const cheerio = require('cheerio');

// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const MARKETS = {
  'Kranggot': '1',
  'Blok F': '2',
  'Merak': '3'
};

const COMMODITY_NAMES = {
  'Beras Medium': ['Beras Medium (Cimanuk)', 'Beras Medium (DK)', 'Beras Medium', 'Beras'],
  'Minyak Kemasan': ['Minyak Goreng Kemasan', 'Minyak Goreng', 'Minyakita'],
  'Telur Ayam Ras': ['Telur Ayam Ras', 'Telur Ayam', 'Telur']
};

async function scrapeMarketInfografis(marketId) {
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
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = {};
    
    // Each commodity card has a card-header and card-body as siblings
    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;
      
      // Check if this header matches any of our target commodities
      let matchedKey = null;
      for (const [key, aliases] of Object.entries(COMMODITY_NAMES)) {
        if (aliases.some(alias => headerText.toLowerCase() === alias.toLowerCase())) {
          matchedKey = key;
          break;
        }
      }
      
      if (!matchedKey) return;
      
      // Find sibling card-body which contains the script block
      const cardBody = $(header).next('div.card-body');
      const scriptText = cardBody.find('script').html() || '';
      
      if (!scriptText.includes('series:')) return;
      
      // Parse Highcharts series using regex
      // We want to find the year data blocks inside series: [...]
      // e.g. name: "2025", data: ['13000', '13500', ...]
      // Spacing and single/double quotes can vary, so we use a flexible regex
      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;
      results[matchedKey] = {};
      
      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const year = match[1];
        const dataStr = match[2];
        
        // Clean up the data array (remove quotes, convert to numbers)
        const dataArr = dataStr
          .split(',')
          .map(val => parseInt(val.trim().replace(/['"]/g, ''), 10))
          .map(val => isNaN(val) ? 0 : val);
          
        results[matchedKey][year] = dataArr;
      }
    });
    
    return results;
  } catch (err) {
    console.error(`Error scraping market ${marketId}:`, err);
    return null;
  }
}

async function run() {
  console.log('Scraping and parsing sagon monthly series for Kranggot, Blok F, and Merak...');
  
  for (const [name, id] of Object.entries(MARKETS)) {
    console.log(`\n=================== MARKET: ${name} (ID: ${id}) ===================`);
    const data = await scrapeMarketInfografis(id);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Failed to scrape data.');
    }
  }
}

run();
