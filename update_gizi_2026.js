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

const DIR_BALITA_PER_KEL = 'C:\\Users\\THINKPAD\\.gemini\\antigravity\\scratch\\dashboard-ketapang\\public\\data balita per kelurahan';
const DIR_MONTHLY = 'C:\\Users\\THINKPAD\\.gemini\\antigravity\\scratch\\dashboard-ketapang\\public\\data balita bulanan 2026';

const kecNorm = {
  'Ciwandan': 'Ciwandan',
  'Citangkil 1': 'Citangkil',
  'Citangkil 2': 'Citangkil',
  'Citangkil': 'Citangkil',
  'CITANGKIL I': 'Citangkil',
  'CITANGKIL II': 'Citangkil',
  'CITANGKIL': 'Citangkil',
  'Pulomerak': 'Pulomerak',
  'Pulo Merak': 'Pulomerak',
  'PULOMERAK': 'Pulomerak',
  'PULO MERAK': 'Pulomerak',
  'Purwakarta': 'Purwakarta',
  'PURWAKARTA': 'Purwakarta',
  'Grogol': 'Gerogol',
  'Gerogol': 'Gerogol',
  'GROGOL': 'Gerogol',
  'Cilegon': 'Cilegon',
  'CILEGON': 'Cilegon',
  'Jombang': 'Jombang',
  'JOMBANG': 'Jombang',
  'Cibeber': 'Cibeber',
  'CIBEBER': 'Cibeber'
};

const kelNorm = {
  'GUNUNG SUGIH': 'Gunung Sugih',
  'GUNUNGSUGIH': 'Gunung Sugih',
  'KEPUH': 'Kepuh',
  'RANDAKARI': 'Randakari',
  'TEGALRATU': 'Tegal Ratu',
  'TEGAL RATU': 'Tegal Ratu',
  'BANJARNEGARA': 'Banjar Negara',
  'BANJAR NEGARA': 'Banjar Negara',
  'KUBANGSARI': 'Kubangsari',
  'TAMANBARU': 'Taman Baru',
  'TAMAN BARU': 'Taman Baru',
  'CITANGKIL': 'Citangkil',
  'KEBONSARI': 'Kebonsari',
  'DERINGO': 'Deringo',
  'LEBAKDENOK': 'Lebak Denok',
  'LEBAK DENOK': 'Lebak Denok',
  'WARNASARI': 'Warnasari',
  'SAMANGRAYA': 'Samangraya',
  'MEKARSARI': 'Mekarsari',
  'MEKAR SARI': 'Mekarsari',
  'TAMANSARI': 'Tamansari',
  'TAMAN SARI': 'Tamansari',
  'LEBAK GEDE': 'Lebakgede',
  'LEBAKGEDE': 'Lebakgede',
  'SURALAYA': 'Suralaya',
  'PABEAN': 'Pabean',
  'TEGAL BUNDER': 'Tegal Bunder',
  'TEGALBUNDER': 'Tegal Bunder',
  'KOTABUMI': 'Kotabumi',
  'KOTA BUMI': 'Kotabumi',
  'KEBON DALEM': 'Kebon Dalem',
  'KEBONDALEM': 'Kebon Dalem',
  'RAMANUJU': 'Ramanuju',
  'KOTASARI': 'Kotasari',
  'GROGOL': 'Gerogol',
  'GEROGOL': 'Gerogol',
  'RAWA ARUM': 'Rawa Arum',
  'RAWAARUM': 'Rawa Arum',
  'GEREM': 'Gerem',
  'CIWADUK': 'Ciwaduk',
  'CIWEDUS': 'Ciwedus',
  'BENDUNGAN': 'Bendungan',
  'KETILENG': 'Ketileng',
  'BAGENDUNG': 'Bagendung',
  'JOMBANG WETAN': 'Jombang Wetan',
  'MASIGIT': 'Masigit',
  'PANGGUNGRAWI': 'Panggung Rawi',
  'PANGGUNG RAWI': 'Panggung Rawi',
  'GEDONG DALEM': 'Gedong Dalem',
  'GEDONGDALEM': 'Gedong Dalem',
  'SUKMAJAYA': 'Sukmajaya',
  'BULAKAN': 'Bulakan',
  'CIKERAI': 'Cikerai',
  'KALITIMBANG': 'Kalitimbang',
  'KARANG ASEM': 'Karang Asem',
  'KARANGASEM': 'Karang Asem',
  'CIBEBER': 'Cibeber',
  'KEDALEMAN': 'Kedaleman'
};

function toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }

// Map kelurahan name to kecamatan standard list
const kelToKecMapping = {};
const KELURAHANS = [
  { nama: 'Gunung Sugih', kecamatan: 'Ciwandan' },
  { nama: 'Kepuh', kecamatan: 'Ciwandan' },
  { nama: 'Randakari', kecamatan: 'Ciwandan' },
  { nama: 'Tegal Ratu', kecamatan: 'Ciwandan' },
  { nama: 'Banjar Negara', kecamatan: 'Ciwandan' },
  { nama: 'Kubangsari', kecamatan: 'Ciwandan' },
  { nama: 'Taman Baru', kecamatan: 'Citangkil' },
  { nama: 'Citangkil', kecamatan: 'Citangkil' },
  { nama: 'Kebonsari', kecamatan: 'Citangkil' },
  { nama: 'Deringo', kecamatan: 'Citangkil' },
  { nama: 'Lebak Denok', kecamatan: 'Citangkil' },
  { nama: 'Warnasari', kecamatan: 'Citangkil' },
  { nama: 'Samangraya', kecamatan: 'Citangkil' },
  { nama: 'Mekarsari', kecamatan: 'Pulomerak' },
  { nama: 'Tamansari', kecamatan: 'Pulomerak' },
  { nama: 'Lebakgede', kecamatan: 'Pulomerak' },
  { nama: 'Suralaya', kecamatan: 'Pulomerak' },
  { nama: 'Pabean', kecamatan: 'Purwakarta' },
  { nama: 'Tegal Bunder', kecamatan: 'Purwakarta' },
  { nama: 'Purwakarta', kecamatan: 'Purwakarta' },
  { nama: 'Kotabumi', kecamatan: 'Purwakarta' },
  { nama: 'Kebon Dalem', kecamatan: 'Purwakarta' },
  { nama: 'Ramanuju', kecamatan: 'Purwakarta' },
  { nama: 'Kotasari', kecamatan: 'Purwakarta' },
  { nama: 'Gerogol', kecamatan: 'Gerogol' },
  { nama: 'Rawa Arum', kecamatan: 'Gerogol' },
  { nama: 'Gerem', kecamatan: 'Gerogol' },
  { nama: 'Ciwaduk', kecamatan: 'Cilegon' },
  { nama: 'Ciwedus', kecamatan: 'Cilegon' },
  { nama: 'Bendungan', kecamatan: 'Cilegon' },
  { nama: 'Ketileng', kecamatan: 'Cilegon' },
  { nama: 'Bagendung', kecamatan: 'Cilegon' },
  { nama: 'Jombang Wetan', kecamatan: 'Jombang' },
  { nama: 'Masigit', kecamatan: 'Jombang' },
  { nama: 'Panggung Rawi', kecamatan: 'Jombang' },
  { nama: 'Gedong Dalem', kecamatan: 'Jombang' },
  { nama: 'Sukmajaya', kecamatan: 'Jombang' },
  { nama: 'Bulakan', kecamatan: 'Cibeber' },
  { nama: 'Cikerai', kecamatan: 'Cibeber' },
  { nama: 'Kalitimbang', kecamatan: 'Cibeber' },
  { nama: 'Karang Asem', kecamatan: 'Cibeber' },
  { nama: 'Cibeber', kecamatan: 'Cibeber' },
  { nama: 'Kedaleman', kecamatan: 'Cibeber' }
];

KELURAHANS.forEach(k => {
  kelToKecMapping[k.nama.toLowerCase()] = k.kecamatan;
});

// Records containers
const recordsKel = []; // for gizi_balita_skpg_kelurahan
const recordsGizi = []; // for gizi_balita (Beranda & Kecamatan)

// 1. Parsing Bulan Januari 2026 dari data balita 2026.xlsx
const filePathJan = path.join(DIR_BALITA_PER_KEL, 'data balita 2026.xlsx');
if (fs.existsSync(filePathJan)) {
  console.log(`Parsing January 2026 from: ${filePathJan}`);
  const wb = XLSX.readFile(filePathJan);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  let currentMonth = '';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const cell1 = String(row[1] || '').trim().toUpperCase();
    if (cell1 === 'JANUARI') {
      currentMonth = cell1;
      continue;
    }
    if (cell1 && ['FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'].includes(cell1)) {
      currentMonth = ''; // hentikan jika masuk bulan lain
    }

    if (currentMonth === 'JANUARI') {
      const kecRaw = String(row[1] || '').trim();
      const kelRaw = String(row[2] || '').trim();

      if (kecRaw && kelRaw && kelRaw !== 'KELURAHAN' && kecRaw !== 'KECAMATAN' && !kecRaw.toUpperCase().includes('TOTAL') && !kelRaw.toUpperCase().includes('TOTAL')) {
        const kec = kecNorm[kecRaw] || kecRaw;
        const kelUpper = kelRaw.toUpperCase();
        const kel = kelNorm[kelUpper] || kelRaw;

        const sangatKurang = toInt(row[3]);
        const kurang       = toInt(row[4]);
        const normal       = toInt(row[5]);
        const lebih        = toInt(row[6]);
        const totalKurang  = sangatKurang + kurang;
        const totalBalita  = sangatKurang + kurang + normal + lebih;

        const nilai = totalBalita > 0 ? toFloat((totalKurang / totalBalita) * 100) : 0;
        let bobot = 3;
        if (nilai > 15) bobot = 1;
        else if (nilai >= 10) bobot = 2;
        const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

        recordsKel.push({
          tahun: 2026,
          bulan: 1,
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

        recordsGizi.push({
          tahun: 2026,
          bulan: 1,
          nama_kelurahan: kel,
          gizi_sangat_kurang: sangatKurang,
          gizi_kurang: kurang,
          gizi_normal: normal,
          gizi_berlebih: lebih
        });
      }
    }
  }
} else {
  console.warn('⚠️ January baseline data balita 2026.xlsx not found!');
}

// 2. Parsing Bulan April, Mei, Juni dari monthly files
const monthlyFiles = [
  { name: '4 data gizi per kel april.xlsx', month: 4 },
  { name: '5 data gizi per kel mei.xlsx', month: 5 },
  { name: '6 data gizi kel juni.xlsx', month: 6 }
];

monthlyFiles.forEach(f => {
  const filePath = path.join(DIR_MONTHLY, f.name);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  console.log(`Parsing ${f.name} for Month ${f.month}...`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const no = String(row[0] || '').trim();
    if (no === '' || isNaN(parseInt(no))) continue; // skip header/footer total

    const kecRaw = String(row[1] || '').trim();
    const kelRaw = String(row[2] || '').trim();
    if (!kecRaw || !kelRaw) continue;

    const kec = kecNorm[kecRaw] || kecRaw;
    const kelUpper = kelRaw.replace(/\s+/g, ' ').toUpperCase();
    const kel = kelNorm[kelUpper] || kelRaw;

    const sangatKurang = toInt(row[3]);
    const kurang       = toInt(row[4]);
    const outlier      = toInt(row[7]);
    const normal       = toInt(row[5]) + outlier;
    const lebih        = toInt(row[6]);
    const totalKurang  = sangatKurang + kurang;
    const totalBalita  = sangatKurang + kurang + normal + lebih;

    const nilai = totalBalita > 0 ? toFloat((totalKurang / totalBalita) * 100) : 0;
    let bobot = 3;
    if (nilai > 15) bobot = 1;
    else if (nilai >= 10) bobot = 2;
    const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

    recordsKel.push({
      tahun: 2026,
      bulan: f.month,
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

    recordsGizi.push({
      tahun: 2026,
      bulan: f.month,
      nama_kelurahan: kel,
      gizi_sangat_kurang: sangatKurang,
      gizi_kurang: kurang,
      gizi_normal: normal,
      gizi_berlebih: lebih
    });
  }
});

// 3. Tambahkan Bulan Kosong (Februari & Maret 2026, dan Juli s/d Desember 2026)
// Jangan dibuat 0 untuk kelurahan riil, buat records dengan total_balita = 0 dan status = 'N/A'
const emptyMonths = [2, 3, 7, 8, 9, 10, 11, 12];
emptyMonths.forEach(m => {
  KELURAHANS.forEach(kel => {
    recordsKel.push({
      tahun: 2026,
      bulan: m,
      kecamatan: kel.kecamatan,
      kelurahan: kel.nama,
      bb_sangat_kurang: 0,
      bb_kurang: 0,
      bb_normal: 0,
      bb_lebih: 0,
      total_kurang: 0,
      total_balita: 0, // 0 as indicator of no data
      nilai: 0,
      bobot: 0,
      status: 'N/A'
    });

    recordsGizi.push({
      tahun: 2026,
      bulan: m,
      nama_kelurahan: kel.nama,
      gizi_sangat_kurang: 0,
      gizi_kurang: 0,
      gizi_normal: 0,
      gizi_berlebih: 0
    });
  });
});

async function run() {
  if (adminEmail && adminPassword) {
    console.log(`🔑 Authenticating to Supabase as admin...`);
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    if (error) {
      console.warn("⚠️ Authentication failed:", error.message);
    } else {
      console.log("✅ Authenticated successfully!\n");
    }
  }

  // A. UPSERT Kelurahan-level SKPG table
  console.log(`⬆️ Upserting ${recordsKel.length} records into gizi_balita_skpg_kelurahan...`);
  // Delete all 2026 records first to clear any leftovers
  await supabase.from('gizi_balita_skpg_kelurahan').delete().eq('tahun', 2026);
  
  const { error: errKel } = await supabase
    .from('gizi_balita_skpg_kelurahan')
    .insert(recordsKel);

  if (errKel) {
    console.error("❌ Failed to upsert gizi_balita_skpg_kelurahan:", errKel.message);
  } else {
    console.log("✅ Seeding gizi_balita_skpg_kelurahan success!");
  }

  // B. UPSERT gizi_balita table
  console.log(`⬆️ Upserting ${recordsGizi.length} records into gizi_balita...`);
  // Delete all 2026 records first to clear any leftovers
  await supabase.from('gizi_balita').delete().eq('tahun', 2026);

  const { error: errGizi } = await supabase
    .from('gizi_balita')
    .insert(recordsGizi);

  if (errGizi) {
    console.error("❌ Failed to upsert gizi_balita:", errGizi.message);
  } else {
    console.log("✅ Seeding gizi_balita success!");
  }
}

run().catch(console.error);
