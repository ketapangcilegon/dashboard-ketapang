"use client";

interface KetersediaanEnergiGaugeProps {
  value: number;
}

export default function KetersediaanEnergiGauge({ value = 2582 }: KetersediaanEnergiGaugeProps) {
  const target = 2400;
  const maxScale = 3500;

  // Determine indicator text and style
  let statusTitle = 'Kurang';
  let statusDesc = 'Ketersediaan energi pangan masih di bawah standar kebutuhan, mengindikasikan pasokan energi pangan belum optimal dan berpotensi membatasi pemenuhan kebutuhan konsumsi masyarakat.';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value > 2400) {
    statusTitle = 'Baik';
    statusDesc = 'Ketersediaan energi pangan sudah memadai atau melampaui standar kebutuhan, menunjukkan pasokan energi pangan wilayah relatif cukup untuk mendukung pemenuhan kebutuhan konsumsi penduduk.';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 2200 && value <= 2400) {
    statusTitle = 'Sedang';
    statusDesc = 'Ketersediaan energi pangan berada di sekitar tingkat kebutuhan standar, menunjukkan kecukupan pasokan relatif terpenuhi namun masih memerlukan penjagaan stabilitas produksi, distribusi, atau akses pangan.';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Convert scale (0-3500 kkal) to percentage (0-100) for drawing
  const percentValue = (value / maxScale) * 100;
  const percentTarget = (target / maxScale) * 100; // 68.5%

  // Trigonometry to position the needle (range 0 to 100)
  const clampedPercent = Math.min(Math.max(percentValue, 0), 100);
  const angleRad = (clampedPercent / 100) * Math.PI; // 0 to Math.PI
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  // SVG Paths
  const getArcPath = (vPercent: number) => {
    const clamped = Math.min(Math.max(vPercent, 0), 100);
    const endX = 50 - 35 * Math.cos((clamped / 100) * Math.PI);
    const endY = 50 - 35 * Math.sin((clamped / 100) * Math.PI);
    return `M 15 50 A 35 35 0 0 1 ${endX} ${endY}`;
  };

  const isBelowTarget = value < target;
  const progressColor = isBelowTarget ? "#EF4444" : "#2563EB"; // Solid red or blue

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4 rounded-xl shadow-sm border border-[#FDE68A]/60 items-center justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Ketersediaan Energi</h4>
        <h3 className="text-xs font-bold text-amber-900 mt-1 leading-tight">(kkal/kapita/hari)</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* 1. Background Gray Track */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* 2. Target Track */}
            <path d={getArcPath(percentTarget)} fill="none" stroke="#A7F3D0" strokeWidth="8" />
            
            {/* 3. Achieved Track */}
            <path d={getArcPath(percentValue)} fill="none" stroke={progressColor} strokeWidth="8" />
            
            {/* 4. Needle */}
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

        {/* Percentage Number */}
        <div className="text-center mt-1 z-10">
          <span className="text-xl font-black text-amber-950 leading-none">{Math.round(value).toLocaleString('id-ID')} <span className="text-[10px] text-amber-500 font-bold">kkal</span></span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-amber-700/60 mt-0.5">
        <span>0</span>
        <span>1.750</span>
        <span>3.500</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1 rounded-md border text-[9px] font-black tracking-wide shadow-sm ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-amber-800 font-bold mt-2">Target Nasional: 2.400</p>
    </div>
  );
}
