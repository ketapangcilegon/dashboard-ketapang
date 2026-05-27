interface CVGaugeProps {
  hargaData: any[];
}

export default function CVGauge({ hargaData = [] }: CVGaugeProps) {
  // Calculate average CV from database
  const avgCV = hargaData.length > 0 
    ? hargaData.reduce((sum, item) => sum + (item.cv_harga || 0), 0) / hargaData.length 
    : 3.65; // Fallback to 2024 historical Cilegon CV (3.65%)

  // Determine status based on national target (CV < 10%)
  const isTargetAchieved = avgCV < 10;
  const statusText = isTargetAchieved ? 'Rendah (Sesuai Target)' : 'Tinggi (Di Atas Target)';
  const statusColor = isTargetAchieved ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200';

  // Math to position the gauge needle/dot (value range 0 to 30)
  const clampedCV = Math.min(Math.max(avgCV, 0), 30);
  const angleRad = (clampedCV / 30) * Math.PI; // 0 to 180 degrees in radians
  const needleX = 50 - 40 * Math.cos(angleRad);
  const needleY = 50 - 40 * Math.sin(angleRad);

  return (
    <div className="flex flex-col h-full items-center">
      <h3 className="font-bold text-slate-800 text-sm mb-4 w-full">2. CV Koefisien Variasi<br/><span className="font-normal text-slate-500">Harga Pangan Strategis</span></h3>
      
      <div className="flex-1 flex flex-col items-center justify-center relative w-full pt-4">
        {/* SVG Gauge */}
        <div className="relative w-40 h-20 overflow-hidden">
          {/* Background track */}
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Green (0-10) - Target Area */}
            <path d="M 10 50 A 40 40 0 0 1 50 10" fill="none" stroke="#10B981" strokeWidth="12" />
            {/* Yellow (10-20) */}
            <path d="M 50 10 A 40 40 0 0 1 76.8 19.8" fill="none" stroke="#F59E0B" strokeWidth="12" />
            {/* Red (20-30) */}
            <path d="M 76.8 19.8 A 40 40 0 0 1 90 50" fill="none" stroke="#EF4444" strokeWidth="12" />
            
            {/* Value Indicator (Needle tip dot) */}
            <circle cx={needleX} cy={needleY} r="4" fill="white" stroke="#3B82F6" strokeWidth="2" className="transition-all duration-500" />
            
            {/* Center anchor */}
            <circle cx="50" cy="50" r="5" fill="#3B82F6" />
          </svg>
          
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
            <span className="text-2xl font-black text-slate-800">{avgCV.toFixed(2)}%</span>
            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 border transition-all ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>

        <div className="flex justify-between w-40 text-[10px] font-semibold text-slate-400 mt-2">
          <span>0%</span>
          <span>30%</span>
        </div>
        
        <p className="text-[11px] text-slate-500 font-medium mt-4">Target Nasional &lt; 10%</p>
      </div>
    </div>
  );
}
