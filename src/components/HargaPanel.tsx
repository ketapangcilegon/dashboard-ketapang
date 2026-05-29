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
  const ayamCur = getAverage(hargaData, 'daging_ayam', 36364); // Chicken price from mockup
  const gulaCur = getAverage(hargaData, 'gula_pasir', 15963); // Sugar price from mockup
  const cabeCur = getAverage(hargaData, 'cabe_merah', 53184); // Chili price from mockup

  // Previous year averages (YoY)
  const berasPrev = getAverage(previousHargaData, 'beras', 14050);
  const minyakPrev = getAverage(previousHargaData, 'minyak_goreng', 18000);
  const telurPrev = getAverage(previousHargaData, 'telur', 30543);
  const ayamPrev = getAverage(previousHargaData, 'daging_ayam', 36364);
  const gulaPrev = getAverage(previousHargaData, 'gula_pasir', 15900);
  const cabePrev = getAverage(previousHargaData, 'cabe_merah', 53184);

  // Helper to calculate YoY change and metadata
  const getYoYStats = (curr: number, prev: number) => {
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const isUp = change > 0.05;
    const isZero = Math.abs(change) < 0.05;
    
    // Status thresholds: e.g. for rice/oil increases > 5% are WASPADA
    const isWaspada = isUp && change > 5;
    const status = isWaspada ? 'WASPADA' : isUp ? 'NAIK' : isZero ? 'STABIL' : 'AMAN';
    
    return {
      changeText: `${isUp ? '↑' : isZero ? '' : '↓'} ${Math.abs(change).toFixed(1)}%`,
      isUp,
      isZero,
      status,
      colorClass: isWaspada 
        ? 'bg-red-50 text-red-600 border border-red-100' 
        : isUp 
          ? 'bg-amber-50 text-amber-600 border border-amber-100' 
          : isZero
            ? 'bg-slate-50 text-slate-600 border border-slate-200'
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
    <div className="flex flex-col h-full bg-[#E6FDF4] p-4 rounded-xl border border-emerald-200/50 shadow-sm justify-between">
      <div>
        <h3 className="font-extrabold text-[#0B7A53] text-sm leading-none flex items-center gap-1.5">
          <span className="text-base">🟢</span> 1. Harga Pangan Strategis
        </h3>
        <p className="text-[9px] text-[#0B7A53]/70 font-semibold mt-1">
          Analisis Perbandingan Harga dengan Bulan Yang Sama Tahun Lalu (YoY)
        </p>
      </div>
      
      {/* Table */}
      <div className="flex-1 mt-3 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#0B7A53]/10 text-[9px] font-black uppercase text-[#0B7A53]/70 tracking-wider">
              <th className="pb-1.5 font-bold">Komoditas</th>
              <th className="pb-1.5 font-bold text-right">Harga Riil</th>
              <th className="pb-1.5 font-bold text-right">Perubahan (YoY)</th>
              <th className="pb-1.5 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0B7A53]/5">
            {commStats.map((c, i) => {
              const stats = getYoYStats(c.curr, c.prev);
              return (
                <tr key={i} className="hover:bg-white/40 transition-colors">
                  <td className="py-2 flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                    <span className="text-sm shrink-0">{c.emoji}</span>
                    <span className="truncate">{c.name}</span>
                  </td>
                  <td className="py-2 text-right font-extrabold text-slate-800 text-xs">
                    Rp {Math.round(c.curr).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-[10px] font-bold ${stats.isZero ? 'text-slate-500' : stats.isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {stats.changeText}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border shadow-sm ${stats.colorClass}`}>
                      {stats.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer Benchmark */}
      <div className="mt-2 pt-2 border-t border-[#0B7A53]/10 flex justify-between items-center text-[8px] font-bold text-[#0B7A53]/70">
        <span>*Benchmark YoY</span>
        <span>Ter-update otomatis</span>
      </div>
    </div>
  );
}
