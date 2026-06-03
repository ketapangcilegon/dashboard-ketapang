const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: fsvaMatang } = await supabase.from('fsva_matang').select('*').eq('periode', 2025);
  const { data: skpgMatang } = await supabase.from('skpg_matang').select('*').eq('periode', 2025);

  const calculatedBorda = skpgMatang.map(item => {
    const fsvaRow = fsvaMatang?.find(x => x.nama_kelurahan === item.nama_kelurahan || x.kelurahan === item.nama_kelurahan);
    const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
    const prev = total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : parseFloat(item.prevalensi || 0);
    return {
      kelurahan: item.nama_kelurahan || item.kelurahan,
      ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
      prevalensi: prev
    };
  });
  
  const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
  const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);
  
  const allBordaSums = calculatedBorda.map(r => {
    const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    return { kelurahan: r.kelurahan, fsvaRank: fRank, skpgRank: sRank, sum: fRank + sRank };
  });
  
  const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
  
  console.log("=== Sorted Borda Sums ===");
  sortedSums.forEach((x, idx) => {
    console.log(`Idx ${idx}: ${x.kelurahan} | Sum: ${x.sum} (FSVA: ${x.fsvaRank}, SKPG: ${x.skpgRank})`);
  });
}

run();
