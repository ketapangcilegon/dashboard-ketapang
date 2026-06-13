import { useState, useEffect } from 'react';

interface NBMGaugeProps {
  value: number;
}

export default function NBMGauge({ value = 94.2 }: NBMGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  const target = 90;

  // Determine indicator text and style
  let statusTitle = 'Buruk / Kurang';
  let statusDesc = 'Pola konsumsi pangan masyarakat belum beragam dan bergizi seimbang.';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value > 90) {
    statusTitle = 'Aman / Baik';
    statusDesc = 'Pola konsumsi pangan masyarakat sangat beragam, bergizi seimbang, dan pemenuhan gizinya telah optimal.';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 80) {
    statusTitle = 'Sedang';
    statusDesc = 'Pola konsumsi pangan masyarakat cukup beragam, namun keseimbangan antar kelompok pangan tertentu masih perlu ditingkatkan (distanpangan.baliprov.go.id).';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Trigonometry to position the needle (range 0 to 100)
  const clampedValue = Math.min(Math.max(animatedValue, 0), 100);
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
    <div className="flex flex-col h-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] p-4 rounded-xl shadow-sm border border-[#A7F3D0]/60 items-center justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Skor NBM</h4>
        <h3 className="text-xs font-bold text-emerald-900 mt-1 leading-tight">(Neraca Bahan Makanan)</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* 1. Background Gray Track (up to 100% / 180 degrees) */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* 2. Target Nasional Track (0 to 90) - Light Green */}
            <path d={getArcPath(target)} fill="none" stroke="#A7F3D0" strokeWidth="8" />
            
            {/* 3. Achieved City Track - Overlaps from 0 to value */}
            <path d={getArcPath(animatedValue)} fill="none" stroke={progressColor} strokeWidth="8" />
            
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
          <span className="text-xl font-black text-emerald-950 leading-none">{value.toFixed(1)}</span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-emerald-700/60 mt-0.5">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2 space-y-1">
        <div className={`text-center py-1 rounded-md border text-[9px] font-black tracking-wide shadow-sm ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
        <p className="text-[8px] text-emerald-900/80 font-bold text-center leading-normal max-h-[40px] overflow-y-auto custom-scrollbar px-1">
          {statusDesc}
        </p>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-emerald-800 font-bold mt-2">Target Nasional: 90</p>
    </div>
  );
}
