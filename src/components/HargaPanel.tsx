import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface HargaPanelProps {
  hargaData: any[];
  previousHargaData?: any[];
}

export default function HargaPanel({ hargaData = [], previousHargaData = [] }: HargaPanelProps) {
  
  // Calculate averages from live dataset
  const getAverage = (data: any[], key: string, fallback: number) => {
    if (!data || data.length === 0) return fallback;
    const valid = data.filter(x => x[key] > 0);
    if (valid.length === 0) return fallback;
    return valid.reduce((sum, item) => sum + (item[key] || 0), 0) / valid.length;
  };

  // Current averages
  const berasCur = getAverage(hargaData, 'beras', 13473);
  const minyakCur = getAverage(hargaData, 'minyak_goreng', 21334);
  const telurCur = getAverage(hargaData, 'telur', 30482);
  const ayamCur = getAverage(hargaData, 'daging_ayam', 35000);
  const gulaCur = getAverage(hargaData, 'gula_pasir', 16000);
  const cabeCur = getAverage(hargaData, 'cabe_merah', 45000);

  // Previous year averages (YoY)
  const berasPrev = getAverage(previousHargaData, 'beras', 14000);
  const minyakPrev = getAverage(previousHargaData, 'minyak_goreng', 18000);
  const telurPrev = getAverage(previousHargaData, 'telur', 30500);
  const ayamPrev = getAverage(previousHargaData, 'daging_ayam', 34500);
  const gulaPrev = getAverage(previousHargaData, 'gula_pasir', 15800);
  const cabePrev = getAverage(previousHargaData, 'cabe_merah', 48000);

  // Helper to calculate YoY change and metadata
  const getYoYStats = (curr: number, prev: number) => {
    const change = ((curr - prev) / prev) * 100;
    const isUp = change > 0;
    const isZero = Math.abs(change) < 0.05;
    
    // Status thresholds: e.g. for rice/oil increases > 5% are WASPADA
    const isWaspada = isUp && change > 5;
    const status = isWaspada ? 'WASPADA' : isUp ? 'NAIK' : isZero ? 'STABIL' : 'AMAN';
    
    return {
      changeText: `${isUp ? '+' : ''}${change.toFixed(1)}%`,
      isUp,
      isZero,
      status,
      colorClass: isWaspada 
        ? 'bg-red-50 text-red-600 border border-red-100' 
        : isUp 
          ? 'bg-amber-50 text-amber-600 border border-amber-100' 
          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    };
  };

  const commStats = [
    { name: 'Beras Medium', curr: berasCur, prev: berasPrev, emoji: '🍚' },
    { name: 'Minyak Goreng', curr: minyakCur, prev: minyakPrev, emoji: '🧴' },
    { name: 'Telur Ayam Ras', curr: telurCur, prev: telurPrev, emoji: '🥚' },
    { name: 'Daging Ayam', curr: ayamCur, prev: ayamPrev, emoji: '🍗' },
    { name: 'Gula Pasir', curr: gulaCur, prev: gulaPrev, emoji: '🧂' },
    { name: 'Cabe Merah', curr: cabeCur, prev: cabePrev, emoji: '🌶️' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="font-bold text-slate-800 text-sm">1. Harga Pangan Strategis</h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Analisis Perbandingan Harga Bulan yang Sama Tahun Lalu (YoY)</p>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold text-slate-500">Komoditas</th>
              <th className="pb-3 font-semibold text-slate-500 text-right">Harga Riil</th>
              <th className="pb-3 font-semibold text-slate-500 text-right">Perubahan (YoY)</th>
              <th className="pb-3 font-semibold text-slate-500 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {commStats.map((c, i) => {
              const stats = getYoYStats(c.curr, c.prev);
              return (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 flex items-center gap-2 text-slate-700 font-semibold">
                    <span className="text-base">{c.emoji}</span> {c.name}
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-800">
                    Rp {Math.round(c.curr).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${stats.isZero ? 'text-slate-500' : stats.isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                      {stats.isZero ? <Minus className="w-3 h-3" /> : stats.isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {stats.changeText.replace('+', '').replace('-', '')}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${stats.colorClass}`}>
                      {stats.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 text-right">
        <span className="text-slate-400 text-[10px]">Benchmark: yoy (Tahun Lalu)</span>
      </div>
    </div>
  );
}
