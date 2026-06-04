const fs = require('fs');
const cheerio = require('cheerio');

async function extractSagon() {
  // Disable TLS verification to bypass self-signed SSL issues on government websites
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  console.log('[Extract] Memulai ekstraksi data dari SAGON Kota Cilegon...');
  console.log('[Extract] Target Pasar: Kranggot (ID: 1), Range: 2022 - 2026');

  // We fetch from Pasar 1 (Kranggot) which represents the main market
  const body = new URLSearchParams({
    pasar: '1',
    tahun_pertama: '2022',
    tahun_kedua: '2026',
    daterange: '01/01/2022 - 12/31/2026'
  });

  try {
    const res = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    
    const result = {};
    let commodityCount = 0;
    
    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;

      let scriptText = '';
      // Find the script block associated with this chart
      $(header).parent().find('script').each((_, scr) => {
        const htmlText = $(scr).html() || '';
        if (htmlText.includes('series:')) {
          scriptText = htmlText;
        }
      });
      
      if (!scriptText) return;

      const seriesRegex = /name:\s*['"]([^'"]+)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;
      const commodityData = {};
      
      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const seriesName = match[1];
        
        // Skip benchmark lines
        if (seriesName.toLowerCase().includes('het') || 
            seriesName.toLowerCase().includes('hap') || 
            seriesName.toLowerCase().includes('referensi')) {
          continue;
        }
        
        // Ensure seriesName is a year between 2022 and 2026
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
        result[headerText] = commodityData;
        commodityCount++;
      }
    });

    console.log(`[Extract] Sukses mengekstrak ${commodityCount} komoditas.`);
    
    fs.writeFileSync('./raw_sagon_data.json', JSON.stringify(result, null, 2));
    console.log('[Extract] Data mentah disimpan ke raw_sagon_data.json');
    
  } catch (error) {
    console.error('[Extract] Error:', error);
    process.exit(1);
  }
}

// Support being run directly or imported
if (require.main === module) {
  extractSagon();
}

module.exports = extractSagon;
