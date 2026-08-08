const XLSX = require('xlsx');

const filePath = 'public/Form Analisis 2025_Kabupaten Kota_Ver1- Rev/2. Form Penentuan Cut Off dan Analisis Komposit Baseline FSVA Kabupaten Kota ver.1.xlsb';
const wb = XLSX.readFile(filePath);

console.log('--- AVAILABLE SHEETS ---');
console.log(wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);
  
  const sheet = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
  for (let i = 0; i < Math.min(10, sheet.length); i++) {
    const row = sheet[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}:`, row.slice(0, 15));
    }
  }
});
