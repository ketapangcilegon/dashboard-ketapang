const cheerio = require('cheerio');
const fs = require('fs');

async function testHargaKomoditas() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const body = new URLSearchParams({
    id_komoditas: '1', // Beras Medium
    id_pasar: '1',     // Kranggot
    tahun_pertama: '2022',
    tahun_kedua: '2023'
  });
  
  const res = await fetch('https://sagon.cilegon.go.id/harga/filter_komoditas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  
  const html = await res.text();
  fs.writeFileSync('harga_komoditas.html', html);
  console.log("Saved to harga_komoditas.html");
}

testHargaKomoditas().catch(console.error);
