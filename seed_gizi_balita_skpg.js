/**
 * seed_gizi_balita_skpg.js
 *
 * Struktur sheet "IP" (terverifikasi untuk kedua jenis file):
 *   idx00: "PEMANFAATAN PANGAN"
 *   idx01: tanggal serial
 *   idx02: baris kosong
 *   idx03: header kolom [NO, KOTA, KECAMATAN, BB Sangat Kurang, BB Kurang, BB Normal, Risiko BB Lebih, total, TOTAL BB/U, HASIL, ...]
 *   idx04: sub-header [... VALUE, BOBOT, STATUS]
 *   idx05: data baris 1 → [NO, KOTA, KECAMATAN(col2), sk(3), k(4), n(5), l(6), totalKurang(7), totalBalita(8), nilai(9), bobot(10), status(11)]
 *   idx06+: data baris 2+ → ["", "", KECAMATAN(col2), sk(3), ...]  ← col 0,1 KOSONG (merged cell)
 *   Stop saat: col[0] = "KOTA CILEGON"
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local
let supabaseUrl = '', supabaseAnonKey = '', adminEmail = '', adminPassword = '';
try {
  const dotenvContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
  dotenvContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let v = (match[2] || '').trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = v;
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = v;
      if (match[1] === 'ADMIN_EMAIL') adminEmail = v;
      if (match[1] === 'ADMIN_PASSWORD') adminPassword = v;
    }
  });
} catch (err) { console.error('Failed to read .env.local:', err.message); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DIR = 'C:\\Users\\THINKPAD\\.gemini\\antigravity\\scratch\\dashboard-ketapang\\public\\data SKPG';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

const kecNorm = {
  'CIWANDAN': 'Ciwandan', 'CITANGKIL': 'Citangkil', 'CITANGKIL ': 'Citangkil',
  'PULOMERAK': 'Pulomerak', 'PURWAKARTA': 'Purwakarta',
  'GROGOL': 'Gerogol', 'GEROGOL': 'Gerogol',
  'CILEGON': 'Cilegon', 'JOMBANG': 'Jombang', 'CIBEBER': 'Cibeber',
  'Ciwandan': 'Ciwandan', 'Citangkil': 'Citangkil',
  'Pulomerak': 'Pulomerak', 'Purwakarta': 'Purwakarta',
  'Gerogol': 'Gerogol', 'Cilegon': 'Cilegon', 'Jombang': 'Jombang', 'Cibeber': 'Cibeber',
};

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

function toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }

const records = [];
const seen = new Set();

console.log(`Found ${files.length} files. Parsing sheet "IP"...\n`);

files.forEach(file => {
  const { month, year } = parseFilename(file);
  if (!month || !year) { console.warn(`⚠️  SKIP (cannot parse month/year): ${file}`); return; }

  const wb = XLSX.readFile(path.join(DIR, file));
  if (!wb.SheetNames.includes('IP')) { console.warn(`⚠️  SKIP (no sheet "IP"): ${file}`); return; }

  const ws = wb.Sheets['IP'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let found = 0;

  // Data starts at row index 5 (verified by diagnostic)
  // Kecamatan ALWAYS in col[2]
  // Stop when col[0] = "KOTA CILEGON"
  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const col0 = String(row[0] || '').trim().toUpperCase();

    // Stop condition: KOTA CILEGON total row
    if (col0 === 'KOTA CILEGON') break;

    // Kecamatan is always in col[2]
    const kecRaw = String(row[2] || '').trim();
    if (!kecRaw) continue; // skip rows where col[2] is empty

    const kec = kecNorm[kecRaw];
    if (!kec) {
      // Only warn for non-numeric, non-empty values
      if (isNaN(parseFloat(kecRaw))) {
        console.warn(`    ⚠️  Unknown kecamatan: "${kecRaw}" in ${file} (row ${r})`);
      }
      continue;
    }

    const sangatKurang = toInt(row[3]);
    const kurang       = toInt(row[4]);
    const normal       = toInt(row[5]);
    const lebih        = toInt(row[6]);
    const totalKurang  = toInt(row[7]);
    const totalBalita  = toInt(row[8]);
    const nilai        = toFloat(row[9]);
    const bobot        = toInt(row[10]);
    const status       = String(row[11] || '').trim();

    if (totalBalita === 0) continue;

    const key = `${year}-${month}-${kec}`;
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({
      tahun: year,
      bulan: month,
      kecamatan: kec,
      bb_sangat_kurang: sangatKurang,
      bb_kurang: kurang,
      bb_normal: normal,
      bb_lebih: lebih,
      total_kurang: totalKurang,
      total_balita: totalBalita,
      nilai,
      bobot,
      status,
    });
    found++;
  }

  const tag = found === 8 ? '✅' : found > 0 ? '⚠️ ' : '❌';
  console.log(`${tag} ${file.padEnd(52)} → ${year}/${String(month).padStart(2,'0')} | ${found} kecamatan`);
});

// Sort by year, month, kecamatan
records.sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan || a.kecamatan.localeCompare(b.kecamatan));

// Summary
console.log('');
const byYear = {};
records.forEach(r => { byYear[r.tahun] = (byYear[r.tahun] || 0) + 1; });
console.log(`Generated ${records.length} total records:`);
Object.entries(byYear).sort().forEach(([y, c]) => console.log(`  - Tahun ${y}: ${c} records (${c / 8} bulan × 8 kecamatan)`));
console.log('');

async function run() {
  if (adminEmail && adminPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) console.warn('⚠️  Sign in failed:', error.message);
    else console.log('✅ Authenticated as admin\n');
  }

  console.log('🗑️  Clearing existing gizi_balita_skpg records...');
  const { error: delErr } = await supabase
    .from('gizi_balita_skpg')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    if (delErr.message.includes('does not exist') || delErr.code === '42P01') {
      console.error('❌ Table not found! Run migrate_gizi_balita_skpg.sql di Supabase SQL Editor dulu.');
      process.exit(1);
    }
    console.error('❌ Delete failed:', delErr.message);
    process.exit(1);
  }
  console.log('✅ Cleared.\n');

  console.log('⬆️  Upserting records into gizi_balita_skpg...');
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('gizi_balita_skpg')
      .upsert(chunk, { onConflict: 'tahun, bulan, kecamatan' });
    if (error) { console.error(`❌ Error at chunk ${i}:`, error.message); process.exit(1); }
    console.log(`  Uploaded ${i + 1}–${Math.min(i + chunkSize, records.length)} of ${records.length}`);
  }

  console.log('\n🎉 Seeding gizi_balita_skpg selesai!\n');

  // Verification: check all months per year
  const { data: allData } = await supabase
    .from('gizi_balita_skpg')
    .select('tahun, bulan, kecamatan')
    .order('tahun').order('bulan');

  if (allData) {
    const grid = {};
    allData.forEach(r => {
      const key = `${r.tahun}-${String(r.bulan).padStart(2,'0')}`;
      grid[key] = (grid[key] || 0) + 1;
    });
    const MONTHS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    [2024, 2025].forEach(y => {
      console.log(`Tahun ${y}:`);
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2,'0')}`;
        const count = grid[key] || 0;
        const icon = count === 8 ? '✅' : count > 0 ? `⚠️ (${count}/8)` : '❌';
        process.stdout.write(`  ${MONTHS[m]}: ${icon}  `);
      }
      console.log('');
    });
  }
}

run().catch(console.error);
