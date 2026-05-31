"use client";

import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface PPHGaugeProps {
  value: number;
}

export default function PPHGauge({ value = 88.1 }: PPHGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const target = 90;

  // Determine indicator text and style
  let statusText = 'Kurang';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value > 90) {
    statusText = 'Baik';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 80) {
    statusText = 'Sedang';
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
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] p-4 rounded-xl shadow-sm border border-[#BFDBFE]/60 items-center justify-between group">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 p-1 rounded-lg bg-white/80 border border-blue-200/50 hover:bg-white text-blue-600 hover:text-blue-800 transition-all cursor-pointer shadow-sm hover:shadow active:scale-90 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">Skor PPH Konsumsi</h4>
        <h3 className="text-xs font-bold text-blue-900 mt-1 leading-tight">(Pola Pangan Harapan)</h3>
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
          <span className="text-xl font-black text-blue-950 leading-none">{value.toFixed(1)}</span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-blue-700/60 mt-0.5">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1.5 px-2 rounded-lg border text-[9px] font-black tracking-wide shadow-sm transition-all duration-300 ${statusColor}`}>
          {statusText.toUpperCase()}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-blue-800 font-bold mt-2">Target Nasional: 90</p>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="absolute inset-0 bg-white/98 rounded-xl border border-blue-200/50 p-4 flex flex-col justify-between shadow-lg z-30 animate-in fade-in zoom-in-95 duration-200 text-left">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-blue-100 pb-2">
              <div className="flex items-center gap-1.5 text-blue-600">
                 <Sparkles className="w-4 h-4 animate-pulse" />
                 <span className="font-extrabold text-[10px] tracking-wide uppercase">Analisis AI GovTech</span>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕</button>
           </div>
           {/* Body */}
           <div className="flex-1 py-2 overflow-y-auto custom-scrollbar select-text">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                 Pencapaian Skor Pola Pangan Harapan (PPH) Kota Cilegon berada pada angka **{value.toFixed(1)}**, melampaui target nasional sebesar **90 poin**. Hal ini mengindikasikan diversifikasi konsumsi pangan masyarakat yang sangat baik, dengan keseimbangan gizi karbohidrat, protein hewani, serta sayuran yang memadai untuk mendukung hidup sehat dan produktif secara makro.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-blue-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>BPN / KEMENTAN RI</span>
              <button onClick={() => setShowAIModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
