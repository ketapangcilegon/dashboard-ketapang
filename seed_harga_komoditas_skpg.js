/**
 * seed_harga_komoditas_skpg.js
 * 
 * Sumber data: File 3 komoditas SKPG (Jan-Nov 2025)
 * Setiap file memiliki:
 *   - row[3] = harga beras tahun lalu (prev = 2024, bulan sama)
 *   - row[4] = harga beras bulan berjalan (cur = 2025)
 *   - row[5] = harga minyak tahun lalu
 *   - row[6] = harga minyak bulan berjalan
 *   - row[7] = harga telur tahun lalu
 *   - row[8] = harga telur bulan berjalan
 * 
 * File 6-komoditas DIABAIKAN. 
 * 2024 data diambil dari kolom "prev" file 3-komoditas 2025 
 * sebagai sumber yang sama persis dipakai dalam form SKPG.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local
let supabaseUrl = '';
let supabaseAnonKey = '';
let adminEmail = '';
let adminPassword = '';

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const dotenvContent = fs.readFileSync(envPath, 'utf-8');
    dotenvContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] ? match[2].trim() : '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
        if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value;
        if (match[1] === 'ADMIN_EMAIL') adminEmail = value;
        if (match[1] === 'ADMIN_PASSWORD') adminPassword = value;
      }
    });
  }
} catch (err) {
  console.error("Failed to read .env.local:", err.message);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dirPath = 'C:\\Users\\THINKPAD\\.gemini\\antigravity\\scratch\\dashboard-ketapang\\public\\data SKPG';

// Hanya file 3 komoditas
const files = fs.readdirSync(dirPath)
  .filter(f => f.endsWith('.xlsx') && f.toLowerCase().includes('3 komoditas'));

const kecNormalization = {
  'CIWANDAN': 'Ciwandan', 'CITANGKIL': 'Citangkil', 'PULOMERAK': 'Pulomerak',
  'PURWAKARTA': 'Purwakarta', 'GROGOL': 'Gerogol', 'CILEGON': 'Cilegon',
  'JOMBANG': 'Jombang', 'CIBEBER': 'Cibeber',
  'Ciwandan': 'Ciwandan', 'Citangkil': 'Citangkil', 'Pulomerak': 'Pulomerak',
  'Purwakarta': 'Purwakarta', 'Gerogol': 'Gerogol', 'Cilegon': 'Cilegon',
  'Jombang': 'Jombang', 'Cibeber': 'Cibeber'
};

// Key: "year-month-kecamatan" -> { beras, minyak, telur }
const priceMap = {};

function setPrice(year, month, kec, commodity, value) {
  if (!value || isNaN(value) || value === 0) return;
  const key = `${year}-${month}-${kec}`;
  if (!priceMap[key]) priceMap[key] = { beras: 0, jagung: 0, gula: 0, minyak: 0, daging: 0, telur: 0 };
  priceMap[key][commodity] = Math.round(value);
}

function parseFilename(filename) {
  const clean = filename.toLowerCase();
  let month = 0, year = 0;
  if (clean.includes('jan')) month = 1;
  else if (clean.includes('feb')) month = 2;
  else if (clean.includes('mar')) month = 3;
  else if (clean.includes('apr')) month = 4;
  else if (clean.includes('mei')) month = 5;
  else if (clean.includes('jun')) month = 6;
  else if (clean.includes('jul')) month = 7;
  else if (clean.includes('aug')) month = 8;
  else if (clean.includes('sep')) month = 9;
  else if (clean.includes('okt')) month = 10;
  else if (clean.includes('nov')) month = 11;
  else if (clean.includes('des')) month = 12;
  if (clean.includes('2025')) year = 2025;
  else if (clean.includes('2024')) year = 2024;
  return { month, year };
}

console.log(`Found ${files.length} file(s) "3 komoditas" to process:\n`);
files.forEach(f => console.log('  -', f));
console.log('');

files.forEach(file => {
  const { month, year } = parseFilename(file);
  if (!month || !year) {
    console.warn(`⚠️ Skip (cannot parse month/year): ${file}`);
    return;
  }

  const wb = XLSX.readFile(path.join(dirPath, file));
  if (!wb.SheetNames.includes('IA')) {
    console.warn(`⚠️ Skip (no sheet 'IA'): ${file}`);
    return;
  }

  const ws = wb.Sheets['IA'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let rowsFound = 0;
  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[2]) continue;
    const rawKecName = row[2].toString().trim();
    if (rawKecName.toUpperCase().includes('KOTA') || rawKecName.toUpperCase() === 'KOTA CILEGON') continue;
    const kec = kecNormalization[rawKecName];
    if (!kec) continue;

    // Kolom dari form 3-komoditas:
    // row[3] = harga beras bulan berjalan, 1 tahun sebelumnya (= tahun lalu, bulan sama)
    // row[4] = harga beras bulan berjalan (tahun ini)
    // row[5] = harga minyak goreng bulan berjalan, 1 tahun sebelumnya
    // row[6] = harga minyak goreng bulan berjalan
    // row[7] = harga telur bulan berjalan, 1 tahun sebelumnya
    // row[8] = harga telur bulan berjalan

    const beras_prev  = parseFloat(row[3]) || 0;
    const beras_cur   = parseFloat(row[4]) || 0;
    const minyak_prev = parseFloat(row[5]) || 0;
    const minyak_cur  = parseFloat(row[6]) || 0;
    const telur_prev  = parseFloat(row[7]) || 0;
    const telur_cur   = parseFloat(row[8]) || 0;

    // Tulis data tahun berjalan (mis: 2025)
    setPrice(year,     month, kec, 'beras',  beras_cur);
    setPrice(year,     month, kec, 'minyak', minyak_cur);
    setPrice(year,     month, kec, 'telur',  telur_cur);

    // Tulis data tahun lalu dari kolom prev (mis: 2024, bulan sama)
    setPrice(year - 1, month, kec, 'beras',  beras_prev);
    setPrice(year - 1, month, kec, 'minyak', minyak_prev);
    setPrice(year - 1, month, kec, 'telur',  telur_prev);

    rowsFound++;
  }

  console.log(`✅ ${file} (${year}/${month}): ${rowsFound} kecamatan diproses`);
});

console.log('');

const sortedKeys = Object.keys(priceMap).sort((a, b) => {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return y1 - y2 || m1 - m2;
});

const records = sortedKeys.map(key => {
  const parts = key.split('-');
  const tahun = parseInt(parts[0]);
  const bulan = parseInt(parts[1]);
  const kecamatan = parts.slice(2).join('-'); // handle kec names with dashes
  return { tahun, bulan, kecamatan, ...priceMap[key] };
});

// Summary per year
const byYear = {};
records.forEach(r => {
  byYear[r.tahun] = (byYear[r.tahun] || 0) + 1;
});
console.log(`Generated ${records.length} total records:`);
Object.entries(byYear).sort().forEach(([y, c]) => console.log(`  - Tahun ${y}: ${c} records`));
console.log('');

async function run() {
  if (adminEmail && adminPassword) {
    console.log(`🔑 Signing in as admin (${adminEmail})...`);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (signInError) {
      console.warn("⚠️ Sign in failed:", signInError.message);
    } else {
      console.log("✅ Authenticated successfully!");
    }
  }

  // Clear existing data first
  console.log("🗑️  Clearing existing records...");
  const { error: delErr } = await supabase.from('harga_komoditas_skpg').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error("❌ Delete failed:", delErr.message);
    process.exit(1);
  }
  console.log("✅ Cleared.\n");

  console.log("⬆️  Upserting records...");
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('harga_komoditas_skpg')
      .upsert(chunk, { onConflict: 'tahun, bulan, kecamatan' });
    if (error) {
      console.error(`❌ Error at chunk ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`  Uploaded ${i + 1}–${Math.min(i + chunkSize, records.length)} of ${records.length}`);
  }

  console.log("\n🎉 Seeding selesai!");
}

run().catch(console.error);
