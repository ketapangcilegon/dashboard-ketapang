const cheerio = require('cheerio');

async function checkHargaKomoditas() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const body = new URLSearchParams({
    id_komoditas: '1',
    id_pasar: '1',
    tahun_pertama: '2022',
    tahun_kedua: '2023'
  });
  const res = await fetch('https://sagon.cilegon.go.id/harga/filter_komoditas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await res.text();
  console.log("Filter Komoditas Length:", text.length);
  
  // See if there's series
  const match = text.match(/series:\s*\[([\s\S]*?)\]/);
  if (match) {
    console.log("Found series:", match[0].substring(0, 200));
  } else {
    console.log("No series found");
  }
}

checkHargaKomoditas().catch(console.error);
