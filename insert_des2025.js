const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

let supabaseUrl = '';
let supabaseAnonKey = '';
let adminEmail = '';
let adminPassword = '';

const dotenvContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
dotenvContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const val = (match[2] || '').trim();
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    if (match[1] === 'ADMIN_EMAIL') adminEmail = val;
    if (match[1] === 'ADMIN_PASSWORD') adminPassword = val;
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data Desember 2025 - dari Tabel Perkembangan Harga Pangan 3 Komoditas Utama
// Sumber: Disperindag Kota Cilegon
const des2025 = [
  { kecamatan: 'Cibeber',   beras: 13500, minyak: 22000, telur: 30333 },
  { kecamatan: 'Cilegon',   beras: 13500, minyak: 22000, telur: 30333 },
  { kecamatan: 'Pulomerak', beras: 14000, minyak: 21000, telur: 31310 },
  { kecamatan: 'Ciwandan',  beras: 13259, minyak: 21483, telur: 30138 },
  { kecamatan: 'Jombang',   beras: 13259, minyak: 21483, telur: 30138 },
  { kecamatan: 'Gerogol',   beras: 14000, minyak: 21000, telur: 31310 },
  { kecamatan: 'Purwakarta',beras: 13259, minyak: 21483, telur: 30138 },
  { kecamatan: 'Citangkil', beras: 13259, minyak: 21483, telur: 30138 },
];

const records = des2025.map(r => ({
  tahun: 2025,
  bulan: 12,
  kecamatan: r.kecamatan,
  beras: r.beras,
  jagung: 0,
  gula: 0,
  minyak: r.minyak,
  daging: 0,
  telur: r.telur,
}));

async function run() {
  if (adminEmail && adminPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) console.warn('⚠️ Sign in failed:', error.message);
    else console.log('✅ Authenticated');
  }

  console.log('\nMenambahkan data Desember 2025 (8 kecamatan)...');
  console.log('');
  records.forEach(r => console.log(`  ${r.kecamatan}: beras=${r.beras}, minyak=${r.minyak}, telur=${r.telur}`));
  console.log('');

  const { error } = await supabase
    .from('harga_komoditas_skpg')
    .upsert(records, { onConflict: 'tahun, bulan, kecamatan' });

  if (error) {
    console.error('❌ Gagal insert:', error.message);
  } else {
    console.log('✅ Data Desember 2025 berhasil ditambahkan ke Supabase!');
  }
}

run().catch(console.error);
