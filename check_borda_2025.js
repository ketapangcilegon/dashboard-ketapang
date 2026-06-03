const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: fsvaMatang } = await supabase.from('fsva_matang').select('*').eq('periode', 2025);
  const { data: skpgMatang } = await supabase.from('skpg_matang').select('*').eq('periode', 2025);
  
  const calculatedBorda = skpgMatang.map(item => {
    const fsvaRow = fsvaMatang?.find(x => x.nama_kelurahan === item.nama_kelurahan || x.kelurahan === item.nama_kelurahan);
    return {
      kelurahan: item.nama_kelurahan || item.kelurahan,
      ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
      prevalensi: parseFloat(item.prevalensi || 0)
    };
  });
  
  const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
  const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);
  
  const allBordaSums = calculatedBorda.map(r => {
    const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    return { kelurahan: r.kelurahan, sum: fRank + sRank };
  });
  
  const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
  
  const mapped = sortedSums.map((r, idx) => {
    const rank = idx + 1;
    const desil = Math.min(10, Math.ceil((rank / sortedSums.length) * 10));
    return { kelurahan: r.kelurahan, sum: r.sum, rank, desil };
  });

  console.log("=== 2025 Borda <= 4 ===");
  const d1_4 = mapped.filter(x => x.desil <= 4);
  d1_4.forEach(x => {
    console.log(`Rank ${x.rank}: ${x.kelurahan} (Sum: ${x.sum}, Desil: D${x.desil})`);
  });
  console.log("Total items in Desil 1-4 for 2025:", d1_4.length);

  console.log("\n=== 2025 Borda <= 5 ===");
  const d1_5 = mapped.filter(x => x.desil <= 5);
  d1_5.forEach(x => {
    console.log(`Rank ${x.rank}: ${x.kelurahan} (Sum: ${x.sum}, Desil: D${x.desil})`);
  });
  console.log("Total items in Desil 1-5 for 2025:", d1_5.length);
}

run();
