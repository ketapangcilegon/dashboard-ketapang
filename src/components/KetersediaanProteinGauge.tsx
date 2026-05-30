"use client";

import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface KetersediaanProteinGaugeProps {
  value: number;
}

export default function KetersediaanProteinGauge({ value = 85 }: KetersediaanProteinGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const target = 63;
  const maxScale = 120;

  // Determine indicator text and style
  let statusTitle = 'Kurang';
  let statusDesc = 'Ketersediaan protein pangan masih di bawah standar kebutuhan, mengindikasikan pasokan protein belum memadai dan dapat mempengaruhi kualitas konsumsi serta pemenuhan kebutuhan gizi penduduk.';
  let statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  
  if (value > 63) {
    statusTitle = 'Baik';
    statusDesc = 'Ketersediaan protein pangan sudah memadai atau melampaui standar kebutuhan, menunjukkan pasokan protein relatif cukup untuk mendukung kualitas konsumsi dan pemenuhan kebutuhan gizi masyarakat.';
    statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  } else if (value >= 59 && value <= 63) {
    statusTitle = 'Sedang';
    statusDesc = 'Ketersediaan protein pangan berada di sekitar tingkat kebutuhan standar, menunjukkan kecukupan pasokan protein relatif terpenuhi namun masih perlu dipertahankan dan ditingkatkan kualitas maupun keragamannya.';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Convert scale (0-120 g) to percentage (0-100) for drawing
  const percentValue = (value / maxScale) * 100;
  const percentTarget = (target / maxScale) * 100; // 52.5%

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
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] p-4 rounded-xl shadow-sm border border-[#A7F3D0]/60 items-center justify-between group">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 p-1 rounded-lg bg-white/80 border border-emerald-200/50 hover:bg-white text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer shadow-sm hover:shadow active:scale-90 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Ketersediaan Protein</h4>
        <h3 className="text-xs font-bold text-emerald-900 mt-1 leading-tight">(gram/kapita/hari)</h3>
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
          <span className="text-xl font-black text-emerald-950 leading-none">{value.toFixed(1)} <span className="text-[10px] text-emerald-500 font-bold">g</span></span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-emerald-700/60 mt-0.5">
        <span>0</span>
        <span>60</span>
        <span>120</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1 rounded-md border text-[9px] font-black tracking-wide shadow-sm ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-emerald-800 font-bold mt-2">Target Nasional: 63</p>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={() => setShowAIModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left" onClick={(e) => e.stopPropagation()}>
             {/* Header */}
             <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                   <span className="font-extrabold text-xs tracking-wide uppercase">Analisis AI GovTech</span>
                </div>
                <button onClick={() => setShowAIModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
             </div>
             {/* Body */}
             <div className="p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                      <Brain className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none">Ketersediaan Protein</h4>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">STATISTIK LOGISTIK PANGAN</span>
                   </div>
                </div>
                
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60">
                   <div className="text-[10px] font-black text-emerald-700 uppercase">Capaian Saat Ini</div>
                   <div className="text-2xl font-black text-emerald-950 mt-1">{value.toFixed(1)} <span className="text-xs font-bold text-slate-500">gram/kapita/hari</span></div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                   Ketersediaan protein pangan di wilayah Kota Cilegon mencapai **{value.toFixed(1)} gram/kapita/hari**, surplus sebesar **+{(value - 63).toFixed(1)} gram** di atas standar kecukupan nasional 63 gram. Angka ini menjamin ketersediaan stok protein hewani dan nabati yang sangat aman bagi stabilitas pangan dan gizi daerah.
                </p>
             </div>
             {/* Footer */}
             <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400">
                <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
                <button onClick={() => setShowAIModal(false)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-[9px] font-black transition-all active:scale-95 shadow-sm">Tutup</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
