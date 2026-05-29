"use client";

interface BalitaDoughnutProps {
  balitaData: {
    sangatKurang: number;
    kurang: number;
    normal: number;
    lebih: number;
    total: number;
    status: string;
  };
}

export default function BalitaDoughnut({ balitaData }: BalitaDoughnutProps) {
  const totalVal = balitaData.total > 0 ? balitaData.total : 27286;
  const statusLabel = balitaData.status || 'AMAN';
  const statusColor = statusLabel === 'AMAN' 
    ? 'text-emerald-800 bg-emerald-50 border-emerald-100' 
    : 'text-rose-800 bg-rose-50 border-rose-100';

  // Map categories to standard terms
  const data = [
    { name: 'Normal', value: balitaData.normal, color: '#10B981' },
    { name: 'Gizi Lebih', value: balitaData.lebih, color: '#2563EB' },
    { name: 'Gizi Kurang', value: balitaData.kurang, color: '#F59E0B' },
    { name: 'Gizi Buruk', value: balitaData.sangatKurang, color: '#EF4444' }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] p-4 rounded-xl shadow-sm border border-[#99F6E4]/60 justify-between">
      {/* Header with AMAN Badge */}
      <div className="w-full flex justify-between items-start">
        <div>
          <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none">Status BB/U Balita</h4>
          <h3 className="text-xs font-bold text-teal-900 mt-1 leading-tight">Gizi Balita Kota Cilegon</h3>
        </div>
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border shadow-sm uppercase ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Modern SaaS-Style Linear Progress Indicators (Zero overlapping, crystal clear!) */}
      <div className="w-full space-y-2.5 my-3 flex-1 flex flex-col justify-center">
        {data.map((item, index) => {
          const pct = ((item.value / totalVal) * 100).toFixed(1);
          return (
            <div key={index} className="w-full">
              <div className="flex justify-between items-center text-[9px] font-bold text-teal-950 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span>
                  {item.value.toLocaleString('id-ID')}{' '}
                  <span className="text-[8px] font-medium text-teal-700/80">({pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-teal-950/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Balita Diukur */}
      <div className="w-full border-t border-teal-500/10 pt-2 text-center">
        <p className="text-[8px] text-teal-700/80 font-bold leading-none">Total Balita Diukur</p>
        <p className="text-[11px] font-black text-teal-950 mt-1">
          {totalVal.toLocaleString('id-ID')}{' '}
          <span className="text-[9px] font-medium text-teal-700">balita</span>
        </p>
      </div>
    </div>
  );
}
