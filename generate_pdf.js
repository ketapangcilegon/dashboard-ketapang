const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tentukan berkas sumber dan tujuan secara absolut
const htmlPath = path.join(__dirname, 'DOKUMENTASI_TEKNIS.html');
const pdfPath = path.join(__dirname, 'DOKUMENTASI_TEKNIS.pdf');

// Daftar lokasi standar Microsoft Edge dan Google Chrome pada Windows
const browserPaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

function findBrowser() {
  for (const browserPath of browserPaths) {
    if (fs.existsSync(browserPath)) {
      return browserPath;
    }
  }
  return null;
}

console.log('=== PEMBUAT DOKUMEN PDF TEKNIS ===');
console.log(`Sumber HTML: ${htmlPath}`);
console.log(`Target PDF: ${pdfPath}`);

const selectedBrowser = findBrowser();

if (!selectedBrowser) {
  console.error('\n❌ ERROR: Microsoft Edge atau Google Chrome tidak ditemukan di folder instalasi standar Windows.');
  console.error('Silakan buka file "DOKUMENTASI_TEKNIS.html" langsung di browser Anda dan cetak manual ke PDF (Ctrl+P).');
  process.exit(1);
}

console.log(`\nUsing browser: ${selectedBrowser}`);
console.log('Sedang memproses konversi ke PDF. Silakan tunggu...');

// Susun argumen pemanggilan browser headless
// --headless: menjalankan tanpa memunculkan jendela browser
// --disable-gpu: menonaktifkan GPU hardware acceleration untuk performa headless
// --print-to-pdf: mencetak halaman HTML langsung ke berkas PDF tujuan
const command = `"${selectedBrowser}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" "${htmlPath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`\n❌ ERROR: Gagal mencetak ke PDF. Detail error: ${error.message}`);
    process.exit(1);
  }
  
  if (fs.existsSync(pdfPath)) {
    console.log('\n==================================================');
    console.log('✅ BERHASIL! Dokumen PDF telah sukses dibuat di:');
    console.log(`👉 ${pdfPath}`);
    console.log('==================================================\n');
  } else {
    console.error('\n❌ ERROR: Skrip selesai berjalan tetapi file PDF tujuan tidak terbentuk.');
    process.exit(1);
  }
});
