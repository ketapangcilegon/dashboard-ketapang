const XLSX = require('xlsx');
const fs = require('fs');

const dir = 'public/Form Analisis 2025_Kabupaten Kota_Ver1- Rev';
const files = fs.readdirSync(dir);

console.log('Files in directory:', files);

files.forEach(file => {
  const filePath = `${dir}/${file}`;
  try {
    const wb = XLSX.readFile(filePath);
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    console.log(`Sheets:`, wb.SheetNames);
    
    wb.SheetNames.forEach(sheetName => {
      const sheet = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
      const kelRows = sheet.filter(r => r && r.some(c => String(c).toLowerCase().includes('citangkil') || String(c).toLowerCase().includes('deringo') || String(c).toLowerCase().includes('bagendung')));
      if (kelRows.length > 0) {
        console.log(`  Sheet [${sheetName}] has ${kelRows.length} kelurahan rows! Sample row 0:`, kelRows[0].slice(0, 10));
      }
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
