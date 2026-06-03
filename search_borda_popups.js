const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPeriod(year, month = null) {
  const { data: fsvaMatang } = await supabase.from('fsva_matang').select('*').eq('periode', year);
  
  let skpgMatang;
  if (year === 2026) {
    const { data: skpgM } = await supabase.from('gizi_balita').select('*').eq('tahun', year).eq('bulan', month);
    skpgMatang = (skpgM || []).map(x => ({
      nama_kelurahan: x.nama_kelurahan,
      gizi_kurang: x.gizi_kurang,
      gizi_sangat_kurang: x.gizi_sangat_kurang,
      gizi_normal: x.gizi_normal,
      gizi_berlebih: x.gizi_berlebih,
    }));
  } else {
    const { data: skpgM } = await supabase.from('skpg_matang').select('*').eq('periode', year);
    skpgMatang = skpgM || [];
  }

  if (!skpgMatang || skpgMatang.length === 0) return;

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
  
  const mapped = sortedSums.map((r, idx) => {
    const rank = idx + 1;
    const desil = Math.min(10, Math.ceil((rank / sortedSums.length) * 10));
    return { kelurahan: r.kelurahan, fsvaRank: r.fsvaRank, skpgRank: r.skpgRank, sum: r.sum, rank, desil };
  });

  const lebakgede = mapped.find(x => x.kelurahan === 'Lebakgede');
  const ketileng = mapped.find(x => x.kelurahan === 'Ketileng');

  console.log(`\n=== Year: ${year}, Month: ${month} ===`);
  if (lebakgede) {
    console.log(`Lebakgede: Sum = ${lebakgede.sum} (FSVA rank ${lebakgede.fsvaRank} + SKPG rank ${lebakgede.skpgRank}), Rank = ${lebakgede.rank}, Desil = D${lebakgede.desil}`);
  }
  if (ketileng) {
    console.log(`Ketileng: Sum = ${ketileng.sum} (FSVA rank ${ketileng.fsvaRank} + SKPG rank ${ketileng.skpgRank}), Rank = ${ketileng.rank}, Desil = D${ketileng.desil}`);
  }
}

async function run() {
  await checkPeriod(2025);
  await checkPeriod(2026, 1);
}

run();
