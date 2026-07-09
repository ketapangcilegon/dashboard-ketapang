const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

let supabaseUrl = '', supabaseAnonKey = '', adminEmail = '', adminPassword = '';
const dotenv = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
dotenv.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim().replace(/^["']|["']$/g, '');
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = v;
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = v;
    if (m[1] === 'ADMIN_EMAIL') adminEmail = v;
    if (m[1] === 'ADMIN_PASSWORD') adminPassword = v;
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data Desember 2025 - Tabel 2. Data Berat Badan Balita Kota Cilegon
// Sumber: Puskesmas se-Kota Cilegon
// Kolom: bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih
const rawData = [
  { kecamatan: 'Cibeber',    sk: 49, k: 199, n: 3358, l: 83  },
  { kecamatan: 'Cilegon',    sk: 16, k: 120, n: 2867, l: 170 },
  { kecamatan: 'Pulomerak',  sk: 27, k: 202, n: 2422, l: 183 },
  { kecamatan: 'Ciwandan',   sk: 52, k: 51,  n: 3376, l: 49  },
  { kecamatan: 'Jombang',    sk: 33, k: 115, n: 3344, l: 152 },
  { kecamatan: 'Gerogol',    sk: 32, k: 203, n: 2148, l: 156 },
  { kecamatan: 'Purwakarta', sk: 25, k: 125, n: 2529, l: 97  },
  { kecamatan: 'Citangkil',  sk: 30, k: 164, n: 4313, l: 214 },
];

const records = rawData.map(d => {
  const total_kurang = d.sk + d.k;
  const total_balita = d.sk + d.k + d.n + d.l;
  const nilai = Math.round((total_kurang / total_balita) * 10000) / 100; // 2 decimal
  // Bobot: nilai > 15% = 1 (Rentan), 10-15% = 2 (Waspada), < 10% = 3 (Aman)
  const bobot = nilai > 15 ? 1 : nilai >= 10 ? 2 : 3;
  const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';
  return {
    tahun: 2025, bulan: 12,
    kecamatan: d.kecamatan,
    bb_sangat_kurang: d.sk,
    bb_kurang: d.k,
    bb_normal: d.n,
    bb_lebih: d.l,
    total_kurang,
    total_balita,
    nilai,
    bobot,
    status,
  };
});

async function run() {
  if (adminEmail && adminPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) console.warn('⚠️ Auth failed:', error.message);
    else console.log('✅ Authenticated');
  }

  console.log('\n📋 Data Desember 2025 yang akan diinsert:');
  records.forEach(r => console.log(`  ${r.kecamatan.padEnd(12)}: sk=${r.bb_sangat_kurang}, k=${r.bb_kurang}, n=${r.bb_normal}, l=${r.bb_lebih} | total=${r.total_balita}, nilai=${r.nilai}%, bobot=${r.bobot}, status=${r.status}`));

  const { error } = await supabase
    .from('gizi_balita_skpg')
    .upsert(records, { onConflict: 'tahun, bulan, kecamatan' });

  if (error) console.error('❌ Gagal:', error.message);
  else console.log('\n✅ Data Desember 2025 berhasil diinsert! (8 kecamatan)');
}

run().catch(console.error);
