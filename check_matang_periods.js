const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: fsva } = await supabase.from('fsva_matang').select('periode').order('periode');
  const periods = [...new Set(fsva.map(x => x.periode))];
  console.log("FSVA Matang periods in DB:", periods);

  const { data: skpg } = await supabase.from('skpg_matang').select('periode').order('periode');
  const skpgPeriods = [...new Set(skpg.map(x => x.periode))];
  console.log("SKPG Matang periods in DB:", skpgPeriods);

  const { data: gizi } = await supabase.from('gizi_balita').select('tahun, bulan').order('tahun').order('bulan');
  console.log("Gizi Balita years/months in DB:", gizi.map(x => `${x.tahun}-${x.bulan}`).filter((v, i, a) => a.indexOf(v) === i));
}

run();
