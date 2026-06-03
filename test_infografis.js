// Disable TLS verification to bypass self-signed SSL issues on government websites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testInfografis() {
  console.log('Sending test POST to sagon infografis filter...');
  
  // Market mapping:
  // 1 = Pasar Baru Cilegon (Kranggot)
  // 2 = Pasar Kavling Blok F
  // 3 = Pasar Baru Merak
  
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
    
    console.log('Response Status:', response.status);
    const html = await response.text();
    console.log('HTML Length:', html.length);
    
    // Check if it has the keyword 'series' or HET
    console.log('Contains series:', html.includes('series:'));
    console.log('Contains HET:', html.includes('HET'));
    console.log('Contains Beras:', html.includes('Beras'));
    
    // Print a snippet of where series might be
    const index = html.indexOf('series:');
    if (index !== -1) {
      console.log('\n--- Script Snippet containing series ---');
      console.log(html.substring(index - 100, index + 2500));
    } else {
      console.log('\nCould not find series in HTML.');
      // Print first 500 characters of html to see what is returned
      console.log('\n--- HTML Start ---');
      console.log(html.substring(0, 800));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testInfografis();
