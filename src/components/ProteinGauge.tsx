"use client";

interface ProteinGaugeProps {
  value: number;
}

export default function ProteinGauge({ value = 63.4 }: ProteinGaugeProps) {
  const target = 57;

  // Determine indicator text and style
  let statusTitle = 'Buruk / Kurang';
  let statusDesc = 'Tingkat konsumsi berada di bawah ambang batas minimal gizi nasional (banten.bps.go.id). Kondisi ini rawan memicu masalah gizi kronis seperti stunting pada balita.';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value >= 57) {
    statusTitle = 'Aman / Baik';
    statusDesc = 'Masyarakat telah memenuhi atau melebihi batas kecukurn gizi protein harian nasional. Kota Cilegon berada di kategori ini berkat tingginya konsumsi produk hewani (seperti ikan, telur, dan daging) serta makanan jadi di wilayah perkotaan (banten.bps.go.id).';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 52) {
    statusTitle = 'Sedang';
    statusDesc = 'Asupan protein masyarakat sudah melewati ambang batas minimal pemeliharaan fisik darurat (52 gram) (banten.bps.go.id), namun belum optimal untuk mendorong kualitas tumbuh kembang gizi yang ideal.';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Trigonometry to position the needle (range 0 to 100)
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const angleRad = (clampedValue / 100) * Math.PI; // 0 to Math.PI
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  // SVG Paths - FIXED: large-arc-flag is ALWAYS 0 for a semicircle!
  const getArcPath = (v: number) => {
    const clamped = Math.min(Math.max(v, 0), 100);
    const endX = 50 - 35 * Math.cos((clamped / 100) * Math.PI);
    const endY = 50 - 35 * Math.sin((clamped / 100) * Math.PI);
    return `M 15 50 A 35 35 0 0 1 ${endX} ${endY}`;
  };

  const isBelowTarget = value < target;
  const progressColor = isBelowTarget ? "#EF4444" : "#2563EB"; // Solid red or blue

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] p-4 rounded-xl shadow-sm border border-[#DDD6FE]/60 items-center justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-violet-700 uppercase tracking-widest leading-none">Konsumsi Protein</h4>
        <h3 className="text-xs font-bold text-violet-900 mt-1 leading-tight">(gram/kapita/hari)</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* 1. Background Gray Track (up to 100 / 180 degrees) */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* 2. Target Nasional Track (0 to 57) - Light Green */}
            <path d={getArcPath(target)} fill="none" stroke="#A7F3D0" strokeWidth="8" />
            
            {/* 3. Achieved City Track - Overlaps from 0 to value */}
            <path d={getArcPath(value)} fill="none" stroke={progressColor} strokeWidth="8" />
            
            {/* 4. Jarum Penunjuk (Needle) */}
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
          <span className="text-xl font-black text-violet-950 leading-none">{value.toFixed(1)} <span className="text-[10px] text-violet-400 font-bold">g</span></span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-violet-700/60 mt-0.5">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2 space-y-1">
        <div className={`text-center py-1 rounded-md border text-[9px] font-black tracking-wide shadow-sm ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
        <p className="text-[8px] text-violet-900/80 font-bold text-center leading-normal max-h-[40px] overflow-y-auto custom-scrollbar px-1">
          {statusDesc}
        </p>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-violet-800 font-bold mt-2">Target Nasional: 57</p>
    </div>
  );
}
