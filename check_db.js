const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('Querying table structures from Supabase...');
  
  const tables = [
    'harga_pangan',
    'balita_gizi',
    'gizi_balita',
    'intervensi_kelurahan',
    'fsva_matang',
    'skpg_matang',
    'pou_data',
    'cv_beras_data',
    'pph_data',
    'konsumsi_energi_data',
    'konsumsi_protein_data',
    'ketersediaan_energi_data',
    'ketersediaan_protein_data',
    'produksi_beras_data'
  ];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`❌ Table '${table}' ERROR:`, error.message);
    } else {
      console.log(`✅ Table '${table}' EXISTS (Rows: ${count})`);
    }
  }
}

checkColumns();

