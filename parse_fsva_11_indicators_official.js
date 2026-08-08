const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'public/Form Analisis 2025_Kabupaten Kota_Ver1- Rev/2. Form Penentuan Cut Off dan Analisis Komposit Baseline FSVA Kabupaten Kota ver.1.xlsb';
const wb = XLSX.readFile(filePath);

const sheet21 = XLSX.utils.sheet_to_json(wb.Sheets['2.1 Data FSVA 2024 & Bobot'], { header: 1 });
const sheet23 = XLSX.utils.sheet_to_json(wb.Sheets['2.3 Indeks & Cut off Komposit'], { header: 1 });

console.log('=== Sheet 2.1 Header Row 5 ===');
console.log(sheet21[5]);

console.log('=== Sheet 2.3 Header Row 9 ===');
console.log(sheet23[9]);

const data2025 = {};

// Parse sheet 2.1 (Raw Values & Adjustment Values)
const rows21 = sheet21.slice(6);
rows21.forEach(r => {
  if (r && r[1] && r[5] && typeof r[0] === 'number') {
    const kec = String(r[1]).trim();
    const kel = String(r[5]).trim();
    
    data2025[kel] = {
      no: r[0],
      kecamatan: kec,
      kelurahan: kel,
      bps_code: r[4] ? String(r[4]).trim() : '',
      ncpr: +(r[6] ?? 0).toFixed(2),
      energy: +(r[8] ?? 0).toFixed(1),
      animal_protein: +(r[10] ?? 0).toFixed(1),
      food_reserves: +(r[12] ?? 0).toFixed(2),
      poverty: +(r[14] ?? 0).toFixed(1),
      price_cv: +(r[16] ?? 0).toFixed(1),
      pou: +(r[18] ?? 0).toFixed(1),
      female_school: +(r[20] ?? 0).toFixed(1),
      no_water: +(r[22] ?? 0).toFixed(1),
      pph: +(r[24] ?? 0).toFixed(1),
      stunting: +(r[26] ?? 0).toFixed(1)
    };
  }
});

console.log(`Parsed ${Object.keys(data2025).length} kelurahan rows! Sample Gunungsugih:`, data2025['Gunung Sugih'] || data2025['Gunungsugih']);

fs.writeFileSync('src/lib/fsva-form2-11-indicators.json', JSON.stringify(data2025, null, 2));
