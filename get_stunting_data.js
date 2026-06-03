const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const WILAYAH = {
  'Cibeber':    ['Cibeber', 'Kedaleman', 'Bulakan', 'Cikerai', 'Karang Asem', 'Kalitimbang'],
  'Cilegon':    ['Bagendung', 'Ciwedus', 'Bendungan', 'Ketileng', 'Ciwaduk'],
  'Pulo Merak': ['Tamansari', 'Lebakgede', 'Mekarsari', 'Suralaya'],
  'Ciwandan':   ['Banjar Negara', 'Tegal Ratu', 'Kubangsari', 'Gunung Sugih', 'Kepuh', 'Randakari'],
  'Jombang':    ['Sukmajaya', 'Jombang Wetan', 'Masigit', 'Panggung Rawi', 'Gedong Dalem'],
  'Gerogol':    ['Kotasari', 'Gerogol', 'Rawa Arum', 'Gerem'],
  'Purwakarta': ['Ramanuju', 'Kotabumi', 'Kebon Dalem', 'Purwakarta', 'Tegal Bunder', 'Pabean'],
  'Citangkil':  ['Warnasari', 'Deringo', 'Kebonsari', 'Taman Baru', 'Lebak Denok', 'Samangraya', 'Citangkil'],
};

async function getStuntingData() {
  console.log('Fetching stunting data for Jan 2026...');
  
  const { data, error } = await supabase
    .from('gizi_balita')
    .select('*')
    .eq('tahun', 2026)
    .eq('bulan', 1);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Fetched ${data.length} rows.`);
  
  // Group by kecamatan
  const kecData = {};
  Object.keys(WILAYAH).forEach(k => {
    kecData[k] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };
  });
  
  data.forEach(r => {
    // Find which kecamatan this kelurahan belongs to
    let foundKec = 'Other';
    for (const [kec, kels] of Object.entries(WILAYAH)) {
      if (kels.some(k => k.toLowerCase() === r.nama_kelurahan.toLowerCase())) {
        foundKec = kec;
        break;
      }
    }
    
    if (foundKec !== 'Other') {
      kecData[foundKec].sangatKurang += r.gizi_sangat_kurang || 0;
      kecData[foundKec].kurang += r.gizi_kurang || 0;
      kecData[foundKec].normal += r.gizi_normal || 0;
      kecData[foundKec].lebih += r.gizi_berlebih || 0;
      kecData[foundKec].total += (r.gizi_sangat_kurang || 0) + (r.gizi_kurang || 0) + (r.gizi_normal || 0) + (r.gizi_berlebih || 0);
    }
  });
  
  console.log('\nStunting / Underweight Averages by Kecamatan:');
  Object.entries(kecData).forEach(([kec, s]) => {
    const rate = s.total > 0 ? ((s.sangatKurang + s.kurang) / s.total * 100).toFixed(2) : '0.00';
    console.log(`${kec}: Total Balita=${s.total}, Underweight Rate=${rate}%, Sangat Kurang=${s.sangatKurang}, Kurang=${s.kurang}`);
  });
}

getStuntingData();
