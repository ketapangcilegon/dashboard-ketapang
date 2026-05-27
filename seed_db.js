const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WILAYAH = {
  'Cibeber':    ['Cibeber','Kedaleman','Bulakan','Cikerai','Karang Asem','Kalitimbang'],
  'Cilegon':    ['Bagendung','Ciwedus','Bendungan','Ketileng','Ciwaduk'],
  'Pulo Merak': ['Tamansari','Lebakgede','Mekarsari','Suralaya'],
  'Ciwandan':   ['Banjar Negara','Tegal Ratu','Kubangsari','Gunung Sugih','Kepuh','Randakari'],
  'Jombang':    ['Sukmajaya','Jombang Wetan','Masigit','Panggung Rawi','Gedong Dalem'],
  'Gerogol':    ['Kotasari','Gerogol','Rawa Arum','Gerem'],
  'Purwakarta': ['Ramanuju','Kotabumi','Kebon Dalem','Purwakarta','Tegal Bunder','Pabean'],
  'Citangkil':  ['Warnasari','Deringo','Kebonsari','Taman Baru','Lebak Denok','Samangraya','Citangkil'],
};

async function seed() {
  console.log('Starting seeder for Kelurahan & Kecamatan level data...');

  // 1. Clean existing records
  console.log('Cleaning existing data...');
  await supabase.from('harga_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ketersediaan_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gizi_masyarakat').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('intervensi_pangan').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Let's create monthly data from Jan 2025 to Dec 2025, and Jan 2026 to May 2026
  const dates = [];
  const years = [2025, 2026];
  
  for (const year of years) {
    const maxMonth = year === 2026 ? 5 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      dates.push({
        year,
        month,
        tanggal: `${year}-${monthStr}-15`
      });
    }
  }

  console.log(`Generating records for ${dates.length} periods...`);

  // Seeding ketersediaan_pangan (Kota level / aggregations)
  const ketersediaanPanganRows = [];
  for (const p of dates) {
    // Produksi beras lokal Kota Cilegon bulanan (10.000 s/d 25.000 ton)
    const baseProd = 15000 + Math.sin(p.month) * 5000 + Math.random() * 2000;
    ketersediaanPanganRows.push({
      tahun: p.year,
      bulan: p.month,
      produksi_beras_ton: parseFloat(baseProd.toFixed(1)),
      skor_nbm: parseFloat((92 + Math.random() * 6).toFixed(1))
    });
  }
  await supabase.from('ketersediaan_pangan').insert(ketersediaanPanganRows);
  console.log('Seeded ketersediaan_pangan table successfully.');

  // Seeding kelurahan level tables: harga_pangan, gizi_masyarakat, intervensi_pangan
  const hargaPanganRows = [];
  const giziMasyarakatRows = [];
  const intervensiPanganRows = [];

  // Generate data per Kelurahan
  for (const [kec, kels] of Object.entries(WILAYAH)) {
    for (const kel of kels) {
      // 1. Generate gizi_masyarakat (annual / year-based, so 2025 and 2026)
      for (const year of years) {
        // Base values per subdistrict/village to make it look realistic
        const basePPH = 85 + Math.random() * 8;
        const baseEnergy = 1950 + Math.random() * 300;
        const baseProtein = 55 + Math.random() * 15;
        const baseStunting = 3.5 + Math.random() * 10;
        const basePoU = 4.0 + Math.random() * 6;

        giziMasyarakatRows.push({
          tahun: year,
          kecamatan: kec,
          kelurahan: kel,
          skor_pph: parseFloat(basePPH.toFixed(1)),
          konsumsi_energi_kkal: parseFloat(baseEnergy.toFixed(1)),
          konsumsi_protein_gram: parseFloat(baseProtein.toFixed(1)),
          prevalensi_stunting: parseFloat(baseStunting.toFixed(1)),
          pou: parseFloat(basePoU.toFixed(1))
        });
      }

      // 2. Generate monthly data for harga_pangan and intervensi_pangan
      for (const p of dates) {
        // Base prices with random fluctuations and seasonal peaks
        const beras = 13500 + Math.sin(p.month) * 500 + Math.random() * 1000;
        const telur = 25000 + Math.cos(p.month) * 1000 + Math.random() * 2000;
        const daging_ayam = 35000 + Math.sin(p.month * 1.5) * 2000 + Math.random() * 3000;
        const minyak = 17500 + Math.random() * 1500;
        const gula = 15500 + Math.random() * 1000;
        const cabe = 40000 + Math.sin(p.month * 2.5) * 8000 + Math.random() * 10000;

        // Calculate a simulated CV
        const prices = [beras, telur, daging_ayam, minyak, gula, cabe];
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = Math.sqrt(prices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / prices.length);
        const cv_harga = parseFloat(((stdDev / mean) * 100).toFixed(2));

        hargaPanganRows.push({
          tanggal: p.tanggal,
          kecamatan: kec,
          kelurahan: kel,
          beras: Math.round(beras / 100) * 100, // Round to nearest 100
          telur: Math.round(telur / 100) * 100,
          daging_ayam: Math.round(daging_ayam / 100) * 100,
          minyak_goreng: Math.round(minyak / 100) * 100,
          gula_pasir: Math.round(gula / 100) * 100,
          cabe_merah: Math.round(cabe / 100) * 100,
          cv_harga
        });

        // Intervensi pangan
        const penerimaBantuan = 200 + Math.round(Math.random() * 1500);
        const gpmCount = Math.random() > 0.7 ? 1 : 0;

        intervensiPanganRows.push({
          tahun: p.year,
          bulan: p.month,
          kecamatan: kec,
          kelurahan: kel,
          penerima_bantuan_jiwa: penerimaBantuan,
          kegiatan_gpm: gpmCount
        });
      }
    }
  }

  // Bulk insert with chunks to avoid hitting Supabase payload limits
  console.log(`Inserting ${hargaPanganRows.length} rows into harga_pangan...`);
  await bulkInsert('harga_pangan', hargaPanganRows);

  console.log(`Inserting ${giziMasyarakatRows.length} rows into gizi_masyarakat...`);
  await bulkInsert('gizi_masyarakat', giziMasyarakatRows);

  console.log(`Inserting ${intervensiPanganRows.length} rows into intervensi_pangan...`);
  await bulkInsert('intervensi_pangan', intervensiPanganRows);

  console.log('🎉 Seeding successfully completed for all 43 Kelurahan!');
}

async function bulkInsert(table, rows) {
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`Error inserting into ${table} (chunk index ${i}):`, error.message);
      throw error;
    }
  }
}

seed();
