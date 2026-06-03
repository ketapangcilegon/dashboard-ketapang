const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: skpgM } = await supabase.from('gizi_balita').select('*').eq('tahun', 2026).eq('bulan', 1);
  
  const skpgMatang = (skpgM || []).map(x => ({
    nama_kelurahan: x.nama_kelurahan,
    gizi_kurang: x.gizi_kurang,
    gizi_sangat_kurang: x.gizi_sangat_kurang,
    gizi_normal: x.gizi_normal,
    gizi_berlebih: x.gizi_berlebih,
  }));

  // fsvaMatangData is empty for 2026
  const fsvaMatangData = [];

  const calculatedBorda = skpgMatang.map(item => {
    const fsvaRow = fsvaMatangData.find(x => x.nama_kelurahan === item.nama_kelurahan);
    const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
    const prev = total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : 0;
    return {
      kelurahan: item.nama_kelurahan,
      ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70, // will be 70 for all
      prevalensi: prev
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

  console.log("=== Borda Ranks (FSVA Empty, IKP = 70) ===");
  mapped.forEach(x => {
    console.log(`Rank ${x.rank}: ${x.kelurahan} (Sum: ${x.sum}, Desil: D${x.desil})`);
  });
}

run();
