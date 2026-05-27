export default function CVGauge() {
  return (
    <div className="flex flex-col h-full items-center">
      <h3 className="font-bold text-slate-800 text-sm mb-4 w-full">2. CV Koefisien Variasi<br/><span className="font-normal text-slate-500">Harga Pangan Strategis</span></h3>
      
      <div className="flex-1 flex flex-col items-center justify-center relative w-full pt-4">
        {/* SVG Gauge */}
        <div className="relative w-40 h-20 overflow-hidden">
          {/* Background track */}
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Green (0-10) */}
            <path d="M 10 50 A 40 40 0 0 1 30 15.35" fill="none" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />
            {/* Yellow (10-20) */}
            <path d="M 30 15.35 A 40 40 0 0 1 70 15.35" fill="none" stroke="#F59E0B" strokeWidth="12" />
            {/* Red (20-30) */}
            <path d="M 70 15.35 A 40 40 0 0 1 90 50" fill="none" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
            
            {/* Value Indicator (Needle or dot) */}
            <circle cx="28" cy="18" r="4" fill="white" stroke="#10B981" strokeWidth="2" />
          </svg>
          
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
            <span className="text-2xl font-black text-slate-800">8,7%</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">Rendah</span>
          </div>
        </div>

        <div className="flex justify-between w-40 text-[10px] font-semibold text-slate-400 mt-2">
          <span>0%</span>
          <span>30%</span>
        </div>
        
        <p className="text-[11px] text-slate-500 font-medium mt-4">Target &lt; 10%</p>
      </div>
    </div>
  );
}
