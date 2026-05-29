"use client";

interface CVGaugeProps {
  hargaData: any[];
}

export default function CVGauge({ hargaData = [] }: CVGaugeProps) {
  // Calculate average CV from database
  const avgCV = hargaData.length > 0 
    ? hargaData.reduce((sum, item) => sum + (item.cv_harga || 0), 0) / hargaData.length 
    : 3.65; // Fallback to historical Cilegon CV (3.65%)

  // Determine status and style
  let statusText = 'HARGA STABIL';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  
  if (avgCV > 20) {
    statusText = 'HARGA BERGEJOLAK';
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (avgCV > 10) {
    statusText = 'HARGA FLUKTUATIF';
    statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  // Trigonometry to position the needle (range 0 to 30)
  const clampedCV = Math.min(Math.max(avgCV, 0), 30);
  const angleRad = (clampedCV / 30) * Math.PI; // 0 (left) to Math.PI (right)
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  return (
    <div className="flex flex-col h-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 items-center justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">2. CV Koefisien Variasi</h4>
        <h3 className="text-xs font-bold text-slate-700 mt-1 leading-tight">Harga Pangan Strategis</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Outer Gray Track */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* Green (0-10) - Target Area */}
            <path d="M 15 50 A 35 35 0 0 1 32.5 19.7" fill="none" stroke="#10B981" strokeWidth="8" />
            
            {/* Yellow (10-20) */}
            <path d="M 32.5 19.7 A 35 35 0 0 1 67.5 19.7" fill="none" stroke="#F59E0B" strokeWidth="8" />
            
            {/* Red (20-30) */}
            <path d="M 67.5 19.7 A 35 35 0 0 1 85 50" fill="none" stroke="#EF4444" strokeWidth="8" />
            
            {/* Dynamic Jarum Penunjuk (Needle) */}
            <line 
              x1="50" 
              y1="50" 
              x2={needleX} 
              y2={needleY} 
              stroke="#1E293B" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              className="transition-all duration-700 ease-out" 
            />
            
            {/* Center Anchor Pin */}
            <circle cx="50" cy="50" r="4.5" fill="#1E293B" />
            <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Percentage Number - absolute below the gauge center anchor */}
        <div className="text-center mt-1 z-10">
          <span className="text-xl font-black text-slate-800 leading-none">{avgCV.toFixed(2)}%</span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-slate-400 mt-0.5">
        <span>0%</span>
        <span>15%</span>
        <span>30%</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1.5 px-2 rounded-lg border text-[9px] font-black tracking-wide ${statusColor} transition-all duration-300`}>
          {statusText}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-slate-400 font-bold mt-2">Target Nasional &lt; 10%</p>
    </div>
  );
}
