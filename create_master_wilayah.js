const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseAnonKey = '';
const dotenvContent = fs.readFileSync('.env.local', 'utf-8');
dotenvContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_BPS = [
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010001', kelurahan: 'Gunung Sugih', kode_kelurahan_bps: '3672010001' },
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010002', kelurahan: 'Kepuh', kode_kelurahan_bps: '3672010002' },
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010003', kelurahan: 'Randakari', kode_kelurahan_bps: '3672010003' },
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010004', kelurahan: 'Tegal Ratu', kode_kelurahan_bps: '3672010004' },
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010005', kelurahan: 'Banjar Negara', kode_kelurahan_bps: '3672010005' },
  { kecamatan: 'Ciwandan', kode_kecamatan_bps: '3672010', no_kode_bps: '3672010013', kelurahan: 'Kubangsari', kode_kelurahan_bps: '3672010013' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011006', kelurahan: 'Deringo', kode_kelurahan_bps: '3672011006' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011007', kelurahan: 'Lebak Denok', kode_kelurahan_bps: '3672011007' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011008', kelurahan: 'Taman Baru', kode_kelurahan_bps: '3672011008' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011009', kelurahan: 'Citangkil', kode_kelurahan_bps: '3672011009' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011010', kelurahan: 'Kebonsari', kode_kelurahan_bps: '3672011010' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011011', kelurahan: 'Warnasari', kode_kelurahan_bps: '3672011011' },
  { kecamatan: 'Citangkil', kode_kecamatan_bps: '3672011', no_kode_bps: '3672011012', kelurahan: 'Samangraya', kode_kelurahan_bps: '3672011012' },
  { kecamatan: 'Pulomerak', kode_kecamatan_bps: '3672020', no_kode_bps: '3672020011', kelurahan: 'Mekarsari', kode_kelurahan_bps: '3672020011' },
  { kecamatan: 'Pulomerak', kode_kecamatan_bps: '3672020', no_kode_bps: '3672020012', kelurahan: 'Tamansari', kode_kelurahan_bps: '3672020012' },
  { kecamatan: 'Pulomerak', kode_kecamatan_bps: '3672020', no_kode_bps: '3672020013', kelurahan: 'Lebakgede', kode_kelurahan_bps: '3672020013' },
  { kecamatan: 'Pulomerak', kode_kecamatan_bps: '3672020', no_kode_bps: '3672020014', kelurahan: 'Suralaya', kode_kelurahan_bps: '3672020014' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021001', kelurahan: 'Ramanuju', kode_kelurahan_bps: '3672021001' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021002', kelurahan: 'Kebon Dalem', kode_kelurahan_bps: '3672021002' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021003', kelurahan: 'Purwakarta', kode_kelurahan_bps: '3672021003' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021004', kelurahan: 'Tegal Bunder', kode_kelurahan_bps: '3672021004' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021005', kelurahan: 'Pabean', kode_kelurahan_bps: '3672021005' },
  { kecamatan: 'Purwakarta', kode_kecamatan_bps: '3672021', no_kode_bps: '3672021006', kelurahan: 'Kotabumi', kode_kelurahan_bps: '3672021006' },
  { kecamatan: 'Gerogol', kode_kecamatan_bps: '3672022', no_kode_bps: '3672022007', kelurahan: 'Kotasari', kode_kelurahan_bps: '3672022007' },
  { kecamatan: 'Gerogol', kode_kecamatan_bps: '3672022', no_kode_bps: '3672022008', kelurahan: 'Gerogol', kode_kelurahan_bps: '3672022008' },
  { kecamatan: 'Gerogol', kode_kecamatan_bps: '3672022', no_kode_bps: '3672022009', kelurahan: 'Rawa Arum', kode_kelurahan_bps: '3672022009' },
  { kecamatan: 'Gerogol', kode_kecamatan_bps: '3672022', no_kode_bps: '3672022010', kelurahan: 'Gerem', kode_kelurahan_bps: '3672022010' },
  { kecamatan: 'Cilegon', kode_kecamatan_bps: '3672030', no_kode_bps: '3672030001', kelurahan: 'Bagendung', kode_kelurahan_bps: '3672030001' },
  { kecamatan: 'Cilegon', kode_kecamatan_bps: '3672030', no_kode_bps: '3672030002', kelurahan: 'Ciwedus', kode_kelurahan_bps: '3672030002' },
  { kecamatan: 'Cilegon', kode_kecamatan_bps: '3672030', no_kode_bps: '3672030003', kelurahan: 'Bendungan', kode_kelurahan_bps: '3672030003' },
  { kecamatan: 'Cilegon', kode_kecamatan_bps: '3672030', no_kode_bps: '3672030004', kelurahan: 'Ciwaduk', kode_kelurahan_bps: '3672030004' },
  { kecamatan: 'Cilegon', kode_kecamatan_bps: '3672030', no_kode_bps: '3672030005', kelurahan: 'Ketileng', kode_kelurahan_bps: '3672030005' },
  { kecamatan: 'Jombang', kode_kecamatan_bps: '3672031', no_kode_bps: '3672031001', kelurahan: 'Jombang Wetan', kode_kelurahan_bps: '3672031001' },
  { kecamatan: 'Jombang', kode_kecamatan_bps: '3672031', no_kode_bps: '3672031002', kelurahan: 'Masigit', kode_kelurahan_bps: '3672031002' },
  { kecamatan: 'Jombang', kode_kecamatan_bps: '3672031', no_kode_bps: '3672031003', kelurahan: 'Panggung Rawi', kode_kelurahan_bps: '3672031003' },
  { kecamatan: 'Jombang', kode_kecamatan_bps: '3672031', no_kode_bps: '3672031004', kelurahan: 'Gedong Dalem', kode_kelurahan_bps: '3672031004' },
  { kecamatan: 'Jombang', kode_kecamatan_bps: '3672031', no_kode_bps: '3672031005', kelurahan: 'Sukmajaya', kode_kelurahan_bps: '3672031005' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040001', kelurahan: 'Bulakan', kode_kelurahan_bps: '3672040001' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040002', kelurahan: 'Cikerai', kode_kelurahan_bps: '3672040002' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040003', kelurahan: 'Kalitimbang', kode_kelurahan_bps: '3672040003' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040004', kelurahan: 'Karang Asem', kode_kelurahan_bps: '3672040004' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040005', kelurahan: 'Cibeber', kode_kelurahan_bps: '3672040005' },
  { kecamatan: 'Cibeber', kode_kecamatan_bps: '3672040', no_kode_bps: '3672040006', kelurahan: 'Kedaleman', kode_kelurahan_bps: '3672040006' }
];

async function run() {
  console.log("🔑 Authenticating to Supabase...");
  console.log("Upserting master data to master_wilayah_bps...");
  
  const { data, error } = await supabase
    .from('master_wilayah_bps')
    .upsert(DATA_BPS, { onConflict: 'kelurahan' });
    
  if (error) {
    console.error("❌ Error upserting to Supabase:", error.message);
    console.log("\n⚠️ Jika tabel 'master_wilayah_bps' belum ada, harap jalankan query di file 'migrate_master_wilayah_bps.sql' terlebih dahulu melalui SQL Editor di dashboard Supabase Anda.");
    process.exit(1);
  } else {
    console.log("✅ Seeding master_wilayah_bps success!");
  }
}

run().catch(console.error);
