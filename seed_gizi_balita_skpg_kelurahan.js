/**
 * seed_gizi_balita_skpg_kelurahan.js
 * 
 * Mengimpor data status gizi balita tingkat kelurahan dari folder:
 * C:\Users\THINKPAD\.gemini\antigravity\scratch\dashboard-ketapang\public\data balita per kelurahan
 * 
 * Meliputi data balita 2025.xlsx (12 bulan) dan data balita 2026.xlsx (baru terisi Januari, sisa bulan 0).
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

const DIR = 'C:\\Users\\THINKPAD\\.gemini\\antigravity\\scratch\\dashboard-ketapang\\public\\data balita per kelurahan';

// Normalisasi Nama Kecamatan dari Excel ke standard UI
const kecNorm = {
  'Ciwandan': 'Ciwandan',
  'Citangkil 1': 'Citangkil',
  'Citangkil 2': 'Citangkil',
  'Citangkil': 'Citangkil',
  'Pulomerak': 'Pulomerak',
  'Purwakarta': 'Purwakarta',
  'Grogol': 'Gerogol',
  'Gerogol': 'Gerogol',
  'Cilegon': 'Cilegon',
  'Jombang': 'Jombang',
  'Cibeber': 'Cibeber'
};

// Normalisasi Nama Kelurahan dari Excel (ALL CAPS / spasi salah) ke standard UI
const kelNorm = {
  'GUNUNG SUGIH': 'Gunung Sugih',
  'KEPUH': 'Kepuh',
  'RANDAKARI': 'Randakari',
  'TEGALRATU': 'Tegal Ratu',
  'BANJARNEGARA': 'Banjar Negara',
  'KUBANGSARI': 'Kubangsari',
  'TAMANBARU': 'Taman Baru',
  'CITANGKIL': 'Citangkil',
  'KEBONSARI': 'Kebonsari',
  'DERINGO': 'Deringo',
  'LEBAKDENOK': 'Lebak Denok',
  'WARNASARI': 'Warnasari',
  'SAMANGRAYA': 'Samangraya',
  'MEKARSARI': 'Mekarsari',
  'TAMANSARI': 'Tamansari',
  'LEBAK GEDE': 'Lebakgede',
  'SURALAYA': 'Suralaya',
  'PABEAN': 'Pabean',
  'TEGAL BUNDER': 'Tegal Bunder',
  'PURWAKARTA': 'Purwakarta',
  'KOTABUMI': 'Kotabumi',
  'KEBON DALEM': 'Kebon Dalem',
  'RAMANUJU': 'Ramanuju',
  'KOTASARI': 'Kotasari',
  'GROGOL': 'Gerogol',
  'RAWA ARUM': 'Rawa Arum',
  'GEREM': 'Gerem',
  'CIWADUK': 'Ciwaduk',
  'CIWEDUS': 'Ciwedus',
  'BENDUNGAN': 'Bendungan',
  'KETILENG': 'Ketileng',
  'BAGENDUNG': 'Bagendung',
  'JOMBANG WETAN': 'Jombang Wetan',
  'MASIGIT': 'Masigit',
  'PANGGUNGRAWI': 'Panggung Rawi',
  'GEDONG DALEM': 'Gedong Dalem',
  'SUKMAJAYA': 'Sukmajaya',
  'BULAKAN': 'Bulakan',
  'CIKERAI': 'Cikerai',
  'KALITIMBANG': 'Kalitimbang',
  'KARANG ASEM': 'Karang Asem',
  'CIBEBER': 'Cibeber',
  'KEDALEMAN': 'Kedaleman'
};

function toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }

const records = [];
const seen = new Set();

const files = [
  { name: 'data balita 2025.xlsx', year: 2025 },
  { name: 'data balita 2026.xlsx', year: 2026 }
];

console.log(`Parsing Excel files in: ${DIR}...\n`);

files.forEach(f => {
  const filePath = path.join(DIR, f.name);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Skip (file not found): ${f.name}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let currentMonth = '';
  let found = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const cell1 = String(row[1] || '').trim().toUpperCase();
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    if (monthNames.includes(cell1)) {
      currentMonth = cell1;
      continue;
    }

    const kecRaw = String(row[1] || '').trim();
    const kelRaw = String(row[2] || '').trim();

    if (currentMonth && kecRaw && kelRaw && kelRaw !== 'KELURAHAN' && kecRaw !== 'KECAMATAN' && !kecRaw.toUpperCase().includes('TOTAL') && !kelRaw.toUpperCase().includes('TOTAL')) {
      const kec = kecNorm[kecRaw] || kecRaw;
      const kel = kelNorm[kelRaw.toUpperCase()] || kelRaw;

      const sangatKurang = toInt(row[3]);
      const kurang       = toInt(row[4]);
      const normal       = toInt(row[5]);
      const lebih        = toInt(row[6]);
      const totalKurang  = sangatKurang + kurang;
      const totalBalita  = sangatKurang + kurang + normal + lebih;

      // Calculate percentage underweight (nilai)
      const nilai = totalBalita > 0 ? toFloat((totalKurang / totalBalita) * 100) : 0;
      
      // Calculate Bobot / Skor:
      // r > 15% = 1 (Rentan), 10-15% = 2 (Waspada), r < 10% = 3 (Aman)
      let bobot = 3;
      if (nilai > 15) bobot = 1;
      else if (nilai >= 10) bobot = 2;

      const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

      // Map month name to number
      const monthMap = {
        'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4, 'MEI': 5, 'JUNI': 6,
        'JULI': 7, 'AGUSTUS': 8, 'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
      };
      const monthNum = monthMap[currentMonth];

      const key = `${f.year}-${monthNum}-${kel}`;
      if (seen.has(key)) continue;
      seen.add(key);

      records.push({
        tahun: f.year,
        bulan: monthNum,
        kecamatan: kec,
        kelurahan: kel,
        bb_sangat_kurang: sangatKurang,
        bb_kurang: kurang,
        bb_normal: normal,
        bb_lebih: lebih,
        total_kurang: totalKurang,
        total_balita: totalBalita,
        nilai,
        bobot,
        status
      });
      found++;
    }
  }

  console.log(`✅ Loaded ${found} records from ${f.name}`);
});

// Summary
console.log(`\nGenerated ${records.length} total records to upload.`);

async function run() {
  if (adminEmail && adminPassword) {
    console.log(`🔑 Authenticating with Supabase...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    if (authErr) {
      console.warn("⚠️  Authentication failed:", authErr.message);
    } else {
      console.log("✅ Authenticated successfully!\n");
    }
  }

  console.log("🗑️  Clearing existing gizi_balita_skpg_kelurahan records...");
  const { error: delErr } = await supabase
    .from('gizi_balita_skpg_kelurahan')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (delErr) {
    if (delErr.code === '42P01' || delErr.message.includes('does not exist')) {
      console.error("❌ Table does not exist. Please run migrate_gizi_balita_skpg_kelurahan.sql first.");
      process.exit(1);
    }
    console.error("❌ Failed to clear database:", delErr.message);
    process.exit(1);
  }
  console.log("✅ Database cleared.\n");

  console.log("⬆️  Uploading records in chunks...");
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error: upsertErr } = await supabase
      .from('gizi_balita_skpg_kelurahan')
      .upsert(chunk, { onConflict: 'tahun, bulan, kelurahan' });

    if (upsertErr) {
      console.error(`❌ Upsert error at index ${i}:`, upsertErr.message);
      process.exit(1);
    }
    console.log(`  Uploaded ${i + 1} to ${Math.min(i + chunkSize, records.length)} of ${records.length}`);
  }

  console.log("\n🎉 Seeding completed successfully!");
}

run().catch(console.error);
