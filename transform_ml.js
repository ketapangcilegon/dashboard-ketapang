const fs = require('fs');

// Mappings for main commodities requested by user to standardize column names
const COMMODITY_MAP = {
  'Beras Medium (Cimanuk)': 'harga_beras',
  'Bawang Merah': 'harga_bawang_merah',
  'Bawang Putih Bonggol': 'harga_bawang_putih',
  'Cabe Merah Besar': 'harga_cabai_merah',
  'Cabe Rawit Merah': 'harga_cabai_rawit',
  'Daging Sapi Murni': 'harga_daging_sapi',
  'Daging Ayam Ras': 'harga_daging_ayam_ras',
  'Telur Ayam Ras': 'harga_telur_ayam_ras',
  'Gula Pasir': 'harga_gula_pasir',
  'Minyak Goreng Kemasan': 'harga_minyak_goreng'
};

function toSnakeCase(str) {
  return 'harga_' + str
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '') // remove parentheses and content
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

async function transformML() {
  console.log('[Transform] Memulai transformasi data untuk ML...');
  
  if (!fs.existsSync('./raw_sagon_data.json')) {
    console.error('[Transform] Error: raw_sagon_data.json tidak ditemukan. Jalankan extract_sagon.js dulu.');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync('./raw_sagon_data.json', 'utf8'));
  
  // We need to pivot by year and month
  // Structure: rows[year][month] = { ...data }
  // Month is 1-12
  const rows = {};
  
  // Determine all unique column names
  const columnsSet = new Set(['tahun', 'bulan']);
  
  for (const [commodityRawName, yearData] of Object.entries(rawData)) {
    // Determine column name
    let colName = COMMODITY_MAP[commodityRawName];
    if (!colName) {
      colName = toSnakeCase(commodityRawName);
    }
    
    // Add to columns set
    columnsSet.add(colName);
    
    for (const [yearStr, monthArray] of Object.entries(yearData)) {
      const year = parseInt(yearStr, 10);
      
      if (!rows[year]) rows[year] = {};
      
      // monthArray is 0-indexed (Jan = 0)
      monthArray.forEach((price, index) => {
        const month = index + 1; // 1-12
        if (!rows[year][month]) {
          rows[year][month] = { tahun: year, bulan: month };
        }
        
        // 0 indicates N/A or empty, we will save it as null or just empty string in CSV
        rows[year][month][colName] = price === 0 ? null : price;
      });
    }
  }

  const columns = Array.from(columnsSet);
  
  // Convert rows object to array
  const flatRows = [];
  for (const year of Object.keys(rows).sort()) {
    for (const month of Object.keys(rows[year]).sort((a,b) => parseInt(a) - parseInt(b))) {
      flatRows.push(rows[year][month]);
    }
  }
  
  // Write CSV
  const csvLines = [];
  // Header
  csvLines.push(columns.join(','));
  
  // Data
  for (const row of flatRows) {
    const line = columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      return val;
    }).join(',');
    csvLines.push(line);
  }
  
  fs.writeFileSync('./ml_dataset.csv', csvLines.join('\n'));
  
  console.log(`[Transform] Sukses. Total baris: ${flatRows.length} (Minimal 60 diharapkan)`);
  console.log(`[Transform] Total kolom: ${columns.length}`);
  console.log('[Transform] Data disimpan ke ml_dataset.csv');
}

if (require.main === module) {
  transformML();
}

module.exports = transformML;
