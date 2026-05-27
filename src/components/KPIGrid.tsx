import { TrendingUp } from 'lucide-react';

export default function KPIGrid() {
  const kpis = [
    { 
      title: 'Skor NBM', 
      subtitle: '(Neraca Bahan Makanan)', 
      value: '94,2', 
      status: 'Baik',
      trend: '▲ 2,6 poin dari bulan lalu',
      bgClass: 'bg-[#10B981]' 
    },
    { 
      title: 'Skor PPH', 
      subtitle: '(Pola Pangan Harapan)', 
      value: '88,1', 
      status: 'Baik',
      trend: '▲ 3,1 poin dari bulan lalu',
      bgClass: 'bg-[#3B82F6]' 
    },
    { 
      title: 'Konsumsi Energi', 
      subtitle: '(kkal/kap/hari)', 
      value: '2.163', 
      status: 'Cukup',
      trend: '▲ 45 kkal dari bulan lalu',
      bgClass: 'bg-[#F59E0B]' 
    },
    { 
      title: 'Konsumsi Protein', 
      subtitle: '(gram/kap/hari)', 
      value: '63,4', 
      status: 'Baik',
      trend: '▲ 2,8 gr dari bulan lalu',
      bgClass: 'bg-[#8B5CF6]' 
    },
    { 
      title: 'Status Gizi Balita', 
      subtitle: '(Gizi Baik)', 
      value: '87%', 
      isDonut: true,
      trend: '▲ 2% dari bulan lalu',
      bgClass: 'bg-[#14B8A6]' 
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
      {kpis.map((kpi, i) => (
        <div key={i} className={`kpi-card ${kpi.bgClass}`}>
          {/* Subtle wave background for premium feel */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, white 0%, transparent 50%)' }}></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="font-bold text-sm tracking-wide">{kpi.title}</h3>
            <p className="text-[10px] text-white/80 font-medium mb-3">{kpi.subtitle}</p>
            
            <div className="flex-1 flex items-end justify-between mb-3">
              {kpi.isDonut ? (
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-white/20" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-white" strokeWidth="4" strokeDasharray="87, 100" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black">{kpi.value}</div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black leading-none">{kpi.value}</span>
                  {kpi.status && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold mb-1 border border-white/30 backdrop-blur-sm">
                      {kpi.status}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sparkline decoration */}
            {!kpi.isDonut && (
               <div className="w-full h-6 mb-2 flex items-end">
                 <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                   <path d="M0 20 L 20 15 L 40 18 L 60 10 L 80 12 L 100 5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                   <circle cx="100" cy="5" r="2" fill="white" />
                 </svg>
               </div>
            )}

            <div className="text-[10px] font-medium text-white/90 flex items-center gap-1 mt-auto">
              {kpi.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
