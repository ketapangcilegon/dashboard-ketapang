const cheerio = require('cheerio');

async function checkFormInputs() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch('https://sagon.cilegon.go.id/infografis');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('form').first().find('input, select, textarea').each((_, el) => {
    console.log($(el).attr('name'));
  });
}

checkFormInputs().catch(console.error);
