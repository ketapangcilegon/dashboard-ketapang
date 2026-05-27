interface KPIGridProps {
  giziData: any[];
  ketersediaanData: any[];
  year: number;
  month: number;
}

export default function KPIGrid({ giziData = [], ketersediaanData = [], year, month }: KPIGridProps) {
  
  // 1. Skor NBM (From ketersediaan_pangan for current month, or the latest available)
  const currentMonthKetersediaan = ketersediaanData.find(x => x.bulan === month) || ketersediaanData[ketersediaanData.length - 1];
  const nbmValue = currentMonthKetersediaan ? currentMonthKetersediaan.skor_nbm : 94.2;

  // 2. Averages from giziData (annual per kelurahan)
  const avgPPH = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.skor_pph || 0), 0) / giziData.length 
    : 88.1;

  const avgEnergi = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.konsumsi_energi_kkal || 0), 0) / giziData.length 
    : 2163;

  const avgProtein = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.konsumsi_protein_gram || 0), 0) / giziData.length 
    : 63.4;

  const avgStunting = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.prevalensi_stunting || 0), 0) / giziData.length 
    : 8.7;
    
  // Status gizi baik is roughly 100 - stunting prevalensi
  const giziBaikValue = Math.round(100 - avgStunting);

  const kpis = [
    { 
      title: 'Skor NBM', 
      subtitle: '(Neraca Bahan Makanan)', 
      value: nbmValue.toFixed(1), 
      status: nbmValue >= 90 ? 'Baik' : nbmValue >= 80 ? 'Cukup' : 'Kurang',
      trend: 'Target Nasional: 90',
      bgClass: 'bg-[#10B981]' 
    },
    { 
      title: 'Skor PPH', 
      subtitle: '(Pola Pangan Harapan)', 
      value: avgPPH.toFixed(1), 
      status: avgPPH >= 90 ? 'Baik' : avgPPH >= 80 ? 'Cukup' : 'Kurang',
      trend: 'Target Nasional: 90',
      bgClass: 'bg-[#3B82F6]' 
    },
    { 
      title: 'Konsumsi Energi', 
      subtitle: '(kkal/kapita/hari)', 
      value: Math.round(avgEnergi).toLocaleString('id-ID'), 
      status: avgEnergi >= 2100 ? 'Baik' : avgEnergi >= 1800 ? 'Cukup' : 'Kurang',
      trend: 'Target Nasional: 2.100',
      bgClass: 'bg-[#F59E0B]' 
    },
    { 
      title: 'Konsumsi Protein', 
      subtitle: '(gram/kapita/hari)', 
      value: avgProtein.toFixed(1), 
      status: avgProtein >= 57 ? 'Baik' : avgProtein >= 48 ? 'Cukup' : 'Kurang',
      trend: 'Target Nasional: 57',
      bgClass: 'bg-[#8B5CF6]' 
    },
    { 
      title: 'Status Gizi Balita', 
      subtitle: '(Persentase Gizi Baik)', 
      value: `${giziBaikValue}%`, 
      isDonut: true,
      trend: `Prevalensi Stunting: ${avgStunting.toFixed(1)}%`,
      bgClass: 'bg-[#14B8A6]' 
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
      {kpis.map((kpi, i) => (
        <div key={i} className={`kpi-card ${kpi.bgClass} relative overflow-hidden`}>
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
                    <path className="text-white" strokeWidth="4" strokeDasharray={`${giziBaikValue}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
