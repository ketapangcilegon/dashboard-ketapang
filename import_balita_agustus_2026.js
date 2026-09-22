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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = v;
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = v;
      if (match[1] === 'ADMIN_EMAIL') adminEmail = v;
      if (match[1] === 'ADMIN_PASSWORD') adminPassword = v;
    }
  });
} catch (err) {
  console.error('Failed to read .env.local:', err.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FILE_PATH = path.join(__dirname, 'public', 'data balita agustus 2026', 'data balita agustus 2026.xlsx');

const kecNorm = {
  'Ciwandan': 'Ciwandan',
  'CIWANDAN': 'Ciwandan',
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
  'PURWAKARTA': 'Purwakarta',
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
  { nama: 'Kotasari', kecamatan: 'Gerogol' },
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

const kelToKecMapping = {};
KELURAHANS.forEach(k => {
  kelToKecMapping[k.nama.toLowerCase()] = k.kecamatan;
});

function toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }

async function processData() {
  console.log(`Reading: ${FILE_PATH}`);
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`File tidak ditemukan di ${FILE_PATH}`);
  }

  const wb = XLSX.readFile(FILE_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const TAHUN = 2026;
  const BULAN = 8; // Agustus

  const recordsKel = [];     // for gizi_balita_skpg_kelurahan
  const recordsGizi = [];    // for gizi_balita
  const kecAgg = {};         // for gizi_balita_skpg (kecamatan-level)

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const noStr = String(row[0] || '').trim();
    if (!noStr || noStr.toUpperCase().includes('JUMLAH') || noStr.toUpperCase().includes('TOTAL')) {
      continue;
    }
    const no = parseInt(noStr);
    if (isNaN(no)) continue;

    const kecRaw = String(row[1] || '').trim();
    const kelRaw = String(row[2] || '').trim();
    if (!kecRaw || !kelRaw) continue;

    const kelUpper = kelRaw.replace(/\s+/g, ' ').toUpperCase();
    const kel = kelNorm[kelUpper] || kelRaw;
    const targetKec = kelToKecMapping[kel.toLowerCase()];
    const kec = targetKec || kecNorm[kecRaw] || kecRaw;

    const sangatKurang = toInt(row[3]);
    const kurang       = toInt(row[4]);
    const normalRaw    = toInt(row[5]);
    const lebih        = toInt(row[6]);
    const outlier      = toInt(row[7]);
    const normal       = normalRaw + outlier;

    const totalKurang  = sangatKurang + kurang;
    const totalBalita  = sangatKurang + kurang + normal + lebih;
    const nilai        = totalBalita > 0 ? toFloat((totalKurang / totalBalita) * 100) : 0;
    
    let bobot = 3;
    if (nilai >= 15) bobot = 1;
    else if (nilai >= 10) bobot = 2;
    const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

    recordsKel.push({
      tahun: TAHUN,
      bulan: BULAN,
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
      tahun: TAHUN,
      bulan: BULAN,
      nama_kelurahan: kel,
      gizi_sangat_kurang: sangatKurang,
      gizi_kurang: kurang,
      gizi_normal: normal,
      gizi_berlebih: lebih
    });

    if (!kecAgg[kec]) {
      kecAgg[kec] = {
        bb_sangat_kurang: 0,
        bb_kurang: 0,
        bb_normal: 0,
        bb_lebih: 0,
        total_kurang: 0,
        total_balita: 0
      };
    }
    kecAgg[kec].bb_sangat_kurang += sangatKurang;
    kecAgg[kec].bb_kurang += kurang;
    kecAgg[kec].bb_normal += normal;
    kecAgg[kec].bb_lebih += lebih;
    kecAgg[kec].total_kurang += totalKurang;
    kecAgg[kec].total_balita += totalBalita;
  }

  const recordsKec = Object.entries(kecAgg).map(([kecName, v]) => {
    const nilai = v.total_balita > 0 ? toFloat((v.total_kurang / v.total_balita) * 100) : 0;
    let bobot = 3;
    if (nilai >= 15) bobot = 1;
    else if (nilai >= 10) bobot = 2;
    const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';
    return {
      tahun: TAHUN,
      bulan: BULAN,
      kecamatan: kecName,
      bb_sangat_kurang: v.bb_sangat_kurang,
      bb_kurang: v.bb_kurang,
      bb_normal: v.bb_normal,
      bb_lebih: v.bb_lebih,
      total_kurang: v.total_kurang,
      total_balita: v.total_balita,
      nilai,
      bobot,
      status
    };
  });

  console.log(`Parsed ${recordsKel.length} kelurahan and ${recordsKec.length} kecamatan for Agustus 2026.`);

  // Generate SQL file
  let sql = `-- ========================================================\n`;
  sql += `-- MIGRATION DATA BALITA AGUSTUS 2026 (KOTA CILEGON)\n`;
  sql += `-- Generated on ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `-- 1. Hapus data existing untuk periode Agustus 2026\n`;
  sql += `DELETE FROM gizi_balita_skpg_kelurahan WHERE tahun = ${TAHUN} AND bulan = ${BULAN};\n`;
  sql += `DELETE FROM gizi_balita WHERE tahun = ${TAHUN} AND bulan = ${BULAN};\n`;
  sql += `DELETE FROM gizi_balita_skpg WHERE tahun = ${TAHUN} AND bulan = ${BULAN};\n\n`;

  sql += `-- 2. Insert ke tabel gizi_balita_skpg_kelurahan (43 Kelurahan)\n`;
  sql += `INSERT INTO gizi_balita_skpg_kelurahan (tahun, bulan, kecamatan, kelurahan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_kurang, total_balita, nilai, bobot, status)\nVALUES\n`;
  const kelValues = recordsKel.map(r => 
    `  (${r.tahun}, ${r.bulan}, '${r.kecamatan}', '${r.kelurahan}', ${r.bb_sangat_kurang}, ${r.bb_kurang}, ${r.bb_normal}, ${r.bb_lebih}, ${r.total_kurang}, ${r.total_balita}, ${r.nilai}, ${r.bobot}, '${r.status}')`
  ).join(',\n');
  sql += kelValues + `\nON CONFLICT (tahun, bulan, kelurahan) DO UPDATE SET\n  kecamatan = EXCLUDED.kecamatan,\n  bb_sangat_kurang = EXCLUDED.bb_sangat_kurang,\n  bb_kurang = EXCLUDED.bb_kurang,\n  bb_normal = EXCLUDED.bb_normal,\n  bb_lebih = EXCLUDED.bb_lebih,\n  total_kurang = EXCLUDED.total_kurang,\n  total_balita = EXCLUDED.total_balita,\n  nilai = EXCLUDED.nilai,\n  bobot = EXCLUDED.bobot,\n  status = EXCLUDED.status;\n\n`;

  sql += `-- 3. Insert ke tabel gizi_balita (43 Kelurahan)\n`;
  sql += `INSERT INTO gizi_balita (tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih)\nVALUES\n`;
  const giziValues = recordsGizi.map(r =>
    `  (${r.tahun}, ${r.bulan}, '${r.nama_kelurahan}', ${r.gizi_sangat_kurang}, ${r.gizi_kurang}, ${r.gizi_normal}, ${r.gizi_berlebih})`
  ).join(',\n');
  sql += giziValues + `;\n\n`;

  sql += `-- 4. Insert ke tabel gizi_balita_skpg (8 Kecamatan)\n`;
  sql += `INSERT INTO gizi_balita_skpg (tahun, bulan, kecamatan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_kurang, total_balita, nilai, bobot, status)\nVALUES\n`;
  const kecValues = recordsKec.map(r =>
    `  (${r.tahun}, ${r.bulan}, '${r.kecamatan}', ${r.bb_sangat_kurang}, ${r.bb_kurang}, ${r.bb_normal}, ${r.bb_lebih}, ${r.total_kurang}, ${r.total_balita}, ${r.nilai}, ${r.bobot}, '${r.status}')`
  ).join(',\n');
  sql += kecValues + `\nON CONFLICT (tahun, bulan, kecamatan) DO UPDATE SET\n  bb_sangat_kurang = EXCLUDED.bb_sangat_kurang,\n  bb_kurang = EXCLUDED.bb_kurang,\n  bb_normal = EXCLUDED.bb_normal,\n  bb_lebih = EXCLUDED.bb_lebih,\n  total_kurang = EXCLUDED.total_kurang,\n  total_balita = EXCLUDED.total_balita,\n  nilai = EXCLUDED.nilai,\n  bobot = EXCLUDED.bobot,\n  status = EXCLUDED.status;\n`;

  const sqlFilePath = path.join(__dirname, 'migrate_balita_agustus_2026.sql');
  fs.writeFileSync(sqlFilePath, sql, 'utf-8');
  console.log(`Generated SQL file: ${sqlFilePath}`);

  // Push to Supabase directly
  if (adminEmail && adminPassword) {
    console.log(`Authenticating as admin (${adminEmail})...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    if (authErr) {
      console.warn(`Admin login warning: ${authErr.message}`);
    } else {
      console.log(`Admin login success!`);
    }
  }

  console.log(`Deleting existing August 2026 records from Supabase...`);
  await supabase.from('gizi_balita_skpg_kelurahan').delete().eq('tahun', TAHUN).eq('bulan', BULAN);
  await supabase.from('gizi_balita').delete().eq('tahun', TAHUN).eq('bulan', BULAN);
  await supabase.from('gizi_balita_skpg').delete().eq('tahun', TAHUN).eq('bulan', BULAN);

  console.log(`Inserting ${recordsKel.length} records into gizi_balita_skpg_kelurahan...`);
  const { error: errKel } = await supabase.from('gizi_balita_skpg_kelurahan').insert(recordsKel);
  if (errKel) {
    console.error('Error inserting into gizi_balita_skpg_kelurahan:', errKel.message);
  } else {
    console.log('✅ gizi_balita_skpg_kelurahan inserted successfully!');
  }

  console.log(`Inserting ${recordsGizi.length} records into gizi_balita...`);
  const { error: errGizi } = await supabase.from('gizi_balita').insert(recordsGizi);
  if (errGizi) {
    console.error('Error inserting into gizi_balita:', errGizi.message);
  } else {
    console.log('✅ gizi_balita inserted successfully!');
  }

  console.log(`Inserting ${recordsKec.length} records into gizi_balita_skpg...`);
  const { error: errKec } = await supabase.from('gizi_balita_skpg').insert(recordsKec);
  if (errKec) {
    console.error('Error inserting into gizi_balita_skpg:', errKec.message);
  } else {
    console.log('✅ gizi_balita_skpg inserted successfully!');
  }

  console.log('\n--- RINGKASAN DATA AGUSTUS 2026 ---');
  console.table(recordsKec);
}

processData().catch(console.error);
