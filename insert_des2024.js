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

// Desember 2024 - rata-rata Kota Cilegon (sama untuk semua kecamatan)
const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'];

const records = KECAMATANS.map(kec => ({
  tahun: 2024,
  bulan: 12,
  kecamatan: kec,
  beras: 13500,
  jagung: 0,
  gula: 0,
  minyak: 17863,
  daging: 0,
  telur: 29283,
}));

async function run() {
  if (adminEmail && adminPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) console.warn('⚠️ Sign in failed:', error.message);
    else console.log('✅ Authenticated');
  }

  console.log('\nMenambahkan data Desember 2024 (8 kecamatan):');
  console.log('  beras=13.500, minyak=17.863, telur=29.283\n');

  const { error } = await supabase
    .from('harga_komoditas_skpg')
    .upsert(records, { onConflict: 'tahun, bulan, kecamatan' });

  if (error) {
    console.error('❌ Gagal insert:', error.message);
  } else {
    console.log('✅ Data Desember 2024 berhasil ditambahkan ke Supabase!');
    console.log('   Total: 8 kecamatan × 1 bulan = 8 records');
  }
}

run().catch(console.error);
