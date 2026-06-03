const cheerio = require('cheerio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function parseForm() {
  try {
    const response = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('--- FORM INPUTS ---');
    $('form select, form input').each((_, el) => {
      const name = $(el).attr('name');
      const id = $(el).attr('id');
      console.log(`Tag: ${el.name}, Name: "${name}", Id: "${id}"`);
      if (el.name === 'select') {
        $(el).find('option').each((_, opt) => {
          console.log(`   Option value: "${$(opt).attr('value')}" text: "${$(opt).text().trim()}"`);
        });
      }
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

parseForm();
