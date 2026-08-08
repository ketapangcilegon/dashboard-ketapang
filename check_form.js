const cheerio = require('cheerio');

async function checkForm() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const res = await fetch('https://sagon.cilegon.go.id/infografis');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('form').each((i, form) => {
    console.log(`Form ${i} Action:`, $(form).attr('action'));
    $(form).find('input, select').each((_, input) => {
      console.log(`- ${$(input).prop('tagName')} Name: ${$(input).attr('name')}, Value: ${$(input).val()}`);
    });
  });
}

checkForm().catch(console.error);
