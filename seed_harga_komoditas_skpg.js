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
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx'));

const kecNormalization = {
  'CIWANDAN': 'Ciwandan',
  'CITANGKIL': 'Citangkil',
  'PULOMERAK': 'Pulomerak',
  'PURWAKARTA': 'Purwakarta',
  'GROGOL': 'Gerogol',
  'CILEGON': 'Cilegon',
  'JOMBANG': 'Jombang',
  'CIBEBER': 'Cibeber',
  'Ciwandan': 'Ciwandan',
  'Citangkil': 'Citangkil',
  'Pulomerak': 'Pulomerak',
  'Purwakarta': 'Purwakarta',
  'Gerogol': 'Gerogol',
  'Cilegon': 'Cilegon',
  'Jombang': 'Jombang',
  'Cibeber': 'Cibeber'
};

const priceMap = {}; // Key: "year-month-kecamatan" -> { beras, jagung, gula, minyak, daging, telur }

function setPrice(year, month, kec, commodity, value) {
  if (value === 0 || isNaN(value)) return;
  const key = `${year}-${month}-${kec}`;
  if (!priceMap[key]) {
    priceMap[key] = { beras: 0, jagung: 0, gula: 0, minyak: 0, daging: 0, telur: 0 };
  }
  priceMap[key][commodity] = value;
}

// Helper to extract month and year from filename
function parseFilename(filename) {
  const clean = filename.toLowerCase();
  let month = 1;
  let year = 2024;
  
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

  if (clean.includes('2024')) year = 2024;
  else if (clean.includes('2025')) year = 2025;
  
  return { month, year };
}

console.log(`Analyzing and parsing ${files.length} Excel files...`);

files.forEach(file => {
  const { month, year } = parseFilename(file);
  const is3Com = file.includes('3 komoditas');
  const wb = XLSX.readFile(path.join(dirPath, file));
  
  if (!wb.SheetNames.includes('IA')) return;
  const ws = wb.Sheets['IA'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[2]) continue;
    const rawKecName = row[2].toString().trim();
    if (rawKecName === 'KOTA CILEGON' || rawKecName.toUpperCase() === 'KOTA CILEGON') continue;
    const normalizedKec = kecNormalization[rawKecName];
    if (!normalizedKec) continue;
    
    if (is3Com) {
      const beras_prev = parseFloat(row[3]) || 0;
      const beras_cur = parseFloat(row[4]) || 0;
      const minyak_prev = parseFloat(row[5]) || 0;
      const minyak_cur = parseFloat(row[6]) || 0;
      const telur_prev = parseFloat(row[7]) || 0;
      const telur_cur = parseFloat(row[8]) || 0;
      
      setPrice(year, month, normalizedKec, 'beras', beras_cur);
      setPrice(year, month, normalizedKec, 'minyak', minyak_cur);
      setPrice(year, month, normalizedKec, 'telur', telur_cur);
      
      setPrice(year - 1, month, normalizedKec, 'beras', beras_prev);
      setPrice(year - 1, month, normalizedKec, 'minyak', minyak_prev);
      setPrice(year - 1, month, normalizedKec, 'telur', telur_prev);
    } else {
      const beras_cur = parseFloat(row[6]) || 0;
      const jagung_cur = parseFloat(row[10]) || 0;
      const gula_cur = parseFloat(row[14]) || 0;
      const minyak_cur = parseFloat(row[18]) || 0;
      const daging_cur = parseFloat(row[22]) || 0;
      const telur_cur = parseFloat(row[26]) || 0;
      
      setPrice(year, month, normalizedKec, 'beras', beras_cur);
      setPrice(year, month, normalizedKec, 'jagung', jagung_cur);
      setPrice(year, month, normalizedKec, 'gula', gula_cur);
      setPrice(year, month, normalizedKec, 'minyak', minyak_cur);
      setPrice(year, month, normalizedKec, 'daging', daging_cur);
      setPrice(year, month, normalizedKec, 'telur', telur_cur);
      
      for (let i = 0; i < 3; i++) {
        let prevM = month - (3 - i);
        let prevY = year;
        if (prevM <= 0) {
          prevM += 12;
          prevY -= 1;
        }
        
        setPrice(prevY, prevM, normalizedKec, 'beras', parseFloat(row[3 + i]) || 0);
        setPrice(prevY, prevM, normalizedKec, 'jagung', parseFloat(row[7 + i]) || 0);
        setPrice(prevY, prevM, normalizedKec, 'gula', parseFloat(row[11 + i]) || 0);
        setPrice(prevY, prevM, normalizedKec, 'minyak', parseFloat(row[15 + i]) || 0);
        setPrice(prevY, prevM, normalizedKec, 'daging', parseFloat(row[19 + i]) || 0);
        setPrice(prevY, prevM, normalizedKec, 'telur', parseFloat(row[23 + i]) || 0);
      }
    }
  }
});

const sortedKeys = Object.keys(priceMap).sort((a, b) => {
  const [y1, m1, k1] = a.split('-');
  const [y2, m2, k2] = b.split('-');
  return parseInt(y1) - parseInt(y2) || parseInt(m1) - parseInt(m2) || k1.localeCompare(k2);
});

const records = sortedKeys.map(key => {
  const [year, month, kecamatan] = key.split('-');
  return {
    tahun: parseInt(year),
    bulan: parseInt(month),
    kecamatan,
    ...priceMap[key]
  };
});

console.log(`Generated ${records.length} unique records to seed.`);

async function run() {
  // Sign in as admin to bypass RLS policies for writing
  if (adminEmail && adminPassword) {
    console.log(`🔑 Signing in as admin (${adminEmail})...`);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    if (signInError) {
      console.warn("⚠️ Sign in failed, attempting direct insert anyway:", signInError.message);
    } else {
      console.log("✅ Authenticated successfully!");
    }
  } else {
    console.log("ℹ️ No admin email/password found in .env.local. Proceeding directly...");
  }

  console.log("Upserting records in Supabase table `harga_komoditas_skpg`...");
  
  // Upsert in chunks to prevent large payload errors
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('harga_komoditas_skpg')
      .upsert(chunk, { onConflict: 'tahun, bulan, kecamatan' });

    if (error) {
      console.error(`❌ Error seeding chunk starting at index ${i}:`, error.message);
      if (error.message.includes('does not exist')) {
        console.log('\n👉 IMPORTANT: Please execute `migrate_harga_komoditas_skpg.sql` in your Supabase SQL Editor first!');
      }
      process.exit(1);
    } else {
      console.log(`Uploaded records ${i + 1} to ${Math.min(i + chunkSize, records.length)}`);
    }
  }

  console.log("🎉 Database seeding completed successfully!");
}

run().catch(console.error);
