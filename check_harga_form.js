const cheerio = require('cheerio');
async function getHargaForm() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch('https://sagon.cilegon.go.id/harga');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('form').each((i, form) => {
    console.log(`Form ${i} action:`, $(form).attr('action'));
    $(form).find('input, select, textarea').each((_, el) => {
      console.log(`- ${$(el).attr('name')}`);
    });
  });
}
getHargaForm().catch(console.error);
