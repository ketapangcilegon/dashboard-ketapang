const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: fsvaMatang } = await supabase.from('fsva_matang').select('*').eq('periode', 2025);
  const { data: skpgMatang } = await supabase.from('skpg_matang').select('*').eq('periode', 2025);

  // 1. Calculate using dashboard-ketapang's current method
  const calculatedBorda1 = skpgMatang.map(item => {
    const fsvaRow = fsvaMatang?.find(x => x.nama_kelurahan === item.nama_kelurahan || x.kelurahan === item.nama_kelurahan);
    const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
    const prev = total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : parseFloat(item.prevalensi || 0);
    return {
      kelurahan: item.nama_kelurahan || item.kelurahan,
      ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
      prevalensi: prev
    };
  });
  
  const fsvaSorted1 = [...calculatedBorda1].sort((a, b) => a.ikp - b.ikp);
  const skpgSorted1 = [...calculatedBorda1].sort((a, b) => b.prevalensi - a.prevalensi);
  
  const allBordaSums1 = calculatedBorda1.map(r => {
    const fRank = fsvaSorted1.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    const sRank = skpgSorted1.findIndex(x => x.kelurahan === r.kelurahan) + 1;
    return { kelurahan: r.kelurahan, sum: fRank + sRank };
  });
  
  const sortedSums1 = [...allBordaSums1].sort((a, b) => a.sum - b.sum);
  
  const mapped1 = sortedSums1.map((r, idx) => {
    const rank = idx + 1;
    const desil = Math.min(10, Math.ceil((rank / sortedSums1.length) * 10));
    return { kelurahan: r.kelurahan, sum: r.sum, rank, desil };
  });

  // 2. Calculate using serumpun-padi-v2's exact method in IKPGAdmin.js
  const withPrev = skpgMatang.map(item => {
    const fsvaRow = fsvaMatang?.find(x => x.nama_kelurahan === item.nama_kelurahan || x.kelurahan === item.nama_kelurahan);
    const gk = parseInt(item.gizi_kurang || 0), gsk = parseInt(item.gizi_sangat_kurang || 0);
    const gb = parseInt(item.gizi_berlebih || 0), gn = parseInt(item.gizi_normal || 0);
    const total = gk + gsk + gb + gn;
    const prev = total > 0 ? parseFloat(((gk + gsk) / total * 100).toFixed(2)) : parseFloat(item.prevalensi || 0);
    return {
      nama_kelurahan: item.nama_kelurahan || item.kelurahan,
      gizi_kurang: gk, gizi_sangat_kurang: gsk, gizi_berlebih: gb, gizi_normal: gn,
      total_balita: total, prevalensi_gizi_buruk: prev
    };
  });

  // Sort descending by prevalensi_gizi_buruk, fallback to alphabetical
  const sortedSKPG = [...withPrev].sort((a, b) => b.prevalensi_gizi_buruk - a.prevalensi_gizi_buruk || (a.nama_kelurahan || '').localeCompare(b.nama_kelurahan || ''));
  const total = sortedSKPG.length;

  // Sort FSVA ascending by IKP
  const sortedFSVA = [...fsvaMatang].sort((a, b) => parseFloat(a.ikp || 0) - parseFloat(b.ikp || 0));

  const withRank2 = sortedSKPG.map((r, idx) => {
    const skpgRank = idx + 1;
    const fsvaRow = sortedFSVA.find(f => f.nama_kelurahan === r.nama_kelurahan);
    const fsvaRank = fsvaRow ? sortedFSVA.findIndex(f => f.nama_kelurahan === r.nama_kelurahan) + 1 : null;
    const bordaSum = fsvaRank ? fsvaRank + skpgRank : null;
    
    // bordaRank calculations with ties
    const allSums = sortedSKPG.map((_, i) => {
      const frIdx = sortedFSVA.findIndex(f => f.nama_kelurahan === sortedSKPG[i].nama_kelurahan);
      return frIdx !== -1 ? (frIdx + 1) + (i + 1) : null;
    }).filter(Boolean).sort((a, b) => a - b);
    
    const bordaRank = bordaSum ? allSums.indexOf(bordaSum) + 1 : null;
    
    // desilSize = Math.ceil(total / 10), desil = Math.ceil(rank / desilSize)
    const desilSize = Math.ceil(total / 10);
    const desil = bordaRank ? Math.ceil(bordaRank / desilSize) : null;

    return {
      kelurahan: r.nama_kelurahan,
      sum: bordaSum,
      rank: bordaRank,
      desil: desil
    };
  });

  // Sort by sum ascending for display comparison
  const sorted2 = [...withRank2].sort((a, b) => a.sum - b.sum);

  console.log("=== COMPARISON ===");
  console.log("Format: [Kelurahan] | Method 1 (Dashboard) vs Method 2 (Serumpun)");
  for (let i = 0; i < total; i++) {
    const m1 = mapped1.find(x => x.kelurahan === sorted2[i].kelurahan);
    const m2 = sorted2[i];
    const diff = m1.rank !== m2.rank || m1.desil !== m2.desil ? "⚠️ DIFF" : "✅ MATCH";
    console.log(`${m2.kelurahan.padEnd(20)} | M1: Sum=${m1.sum}, Rank=${m1.rank}, Desil=D${m1.desil} | M2: Sum=${m2.sum}, Rank=${m2.rank}, Desil=D${m2.desil} | ${diff}`);
  }
}

run();
