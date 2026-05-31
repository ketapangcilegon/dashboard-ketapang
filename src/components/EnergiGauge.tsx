"use client";

import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface EnergiGaugeProps {
  value: number;
}

export default function EnergiGauge({ value = 2163 }: EnergiGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const target = 2100;
  const maxScale = 3000;

  // Determine indicator text and style
  let statusTitle = 'Buruk / Sangat Kurang';
  let statusDesc = 'Tingkat konsumsi kalori berada di bawah standar minimal (defisit kronis). Kondisi ini mengindikasikan adanya masalah kerawanan pangan atau kemiskinan yang membuat masyarakat kesulitan mengakses makanan pokok.';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value >= 2100) {
    statusTitle = 'Aman / Baik';
    statusDesc = 'Masyarakat telah mengonsumsi kalori dalam jumlah yang cukup untuk mendukung aktivitas fisik harian secara produktif dan sehat. Wilayah perkotaan seperti Kota Cilegon umumnya memiliki ketersediaan pangan yang stabil pada kelompok ini (banten.bps.go.id).';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 1700) {
    statusTitle = 'Sedang / Rentan';
    statusDesc = 'Asupan kalori masyarakat berada di batas ambang toleransi. Kebutuhan dasar tubuh untuk bertahan hidup terpenuhi, tetapi belum optimal jika mereka harus melakukan kerja fisik yang berat.';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Convert scale (0-3000 kkal) to percentage (0-100) for drawing
  const percentValue = (value / maxScale) * 100;
  const percentTarget = (target / maxScale) * 100; // 70%

  // Trigonometry to position the needle (range 0 to 100)
  const clampedPercent = Math.min(Math.max(percentValue, 0), 100);
  const angleRad = (clampedPercent / 100) * Math.PI; // 0 to Math.PI
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  // SVG Paths - FIXED: large-arc-flag is ALWAYS 0 for a semicircle!
  const getArcPath = (vPercent: number) => {
    const clamped = Math.min(Math.max(vPercent, 0), 100);
    const endX = 50 - 35 * Math.cos((clamped / 100) * Math.PI);
    const endY = 50 - 35 * Math.sin((clamped / 100) * Math.PI);
    return `M 15 50 A 35 35 0 0 1 ${endX} ${endY}`;
  };

  const isBelowTarget = value < target;
  const progressColor = isBelowTarget ? "#EF4444" : "#2563EB"; // Solid red or blue

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4 rounded-xl shadow-sm border border-[#FDE68A]/60 items-center justify-between group">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 p-1 rounded-lg bg-white/80 border border-amber-200/50 hover:bg-white text-amber-600 hover:text-amber-800 transition-all cursor-pointer shadow-sm hover:shadow active:scale-90 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Konsumsi Energi</h4>
        <h3 className="text-xs font-bold text-amber-900 mt-1 leading-tight">(kkal/kapita/hari)</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* 1. Background Gray Track (up to 3000 kkal / 180 degrees) */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* 2. Target Nasional Track (0 to 2100 kkal / 70%) - Light Green */}
            <path d={getArcPath(percentTarget)} fill="none" stroke="#A7F3D0" strokeWidth="8" />
            
            {/* 3. Achieved City Track - Overlaps from 0 to value */}
            <path d={getArcPath(percentValue)} fill="none" stroke={progressColor} strokeWidth="8" />
            
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
          <span className="text-xl font-black text-amber-950 leading-none">{Math.round(value).toLocaleString('id-ID')} <span className="text-[10px] text-amber-500 font-bold">kkal</span></span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-amber-700/60 mt-0.5">
        <span>0</span>
        <span>1.500</span>
        <span>3.000</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1 rounded-md border text-[9px] font-black tracking-wide shadow-sm ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-amber-800 font-bold mt-2">Target Nasional: 2.100</p>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="absolute inset-0 bg-white/98 rounded-xl border border-amber-200/50 p-4 flex flex-col justify-between shadow-lg z-30 animate-in fade-in zoom-in-95 duration-200 text-left">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <div className="flex items-center gap-1.5 text-amber-600">
                 <Sparkles className="w-4 h-4 animate-pulse" />
                 <span className="font-extrabold text-[10px] tracking-wide uppercase">Analisis AI GovTech</span>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕</button>
           </div>
           {/* Body */}
           <div className="flex-1 py-2 overflow-y-auto custom-scrollbar select-text">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                 Angka konsumsi energi rata-rata harian masyarakat Cilegon saat ini tercatat sebesar **{Math.round(value).toLocaleString('id-ID')} kkal/kapita/hari**, sedikit di bawah target nasional sebesar **2100 kkal**. Meskipun surplus di sektor protein, akselerasi edukasi diversifikasi pangan karbohidrat non-beras perlu terus digalakkan untuk mencapai pemenuhan energi yang optimal di wilayah perkotaan.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-amber-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
              <button onClick={() => setShowAIModal(false)} className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
