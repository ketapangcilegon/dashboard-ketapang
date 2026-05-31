"use client";

import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface CVGaugeProps {
  value: number;
}

export default function CVGauge({ value = 3.65 }: CVGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);

  // Determine status and style
  let statusText = 'HARGA STABIL';
  let statusColor = 'text-emerald-800 bg-emerald-50/80 border-emerald-200';
  
  if (value > 20) {
    statusText = 'HARGA BERGEJOLAK';
    statusColor = 'text-rose-800 bg-rose-50/80 border-rose-200';
  } else if (value > 10) {
    statusText = 'HARGA FLUKTUATIF';
    statusColor = 'text-amber-800 bg-amber-50/80 border-amber-200';
  }

  // Trigonometry to position the needle (range 0 to 30)
  const clampedCV = Math.min(Math.max(value, 0), 30);
  const angleRad = (clampedCV / 30) * Math.PI; // 0 (left) to Math.PI (right)
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] p-4 rounded-xl shadow-sm border border-[#FECDD3]/60 items-center justify-between group">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 p-1 rounded-lg bg-white/80 border border-rose-200/50 hover:bg-white text-rose-600 hover:text-rose-800 transition-all cursor-pointer shadow-sm hover:shadow active:scale-90 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest leading-none">CV Koefisien Variasi</h4>
        <h3 className="text-xs font-bold text-rose-900 mt-1 leading-tight">Harga Beras</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Outer Gray Track */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
            
            {/* Green (0-10) - Target Area */}
            <path d="M 15 50 A 35 35 0 0 1 38.3 19.7" fill="none" stroke="#10B981" strokeWidth="8" />
            
            {/* Yellow (10-20) */}
            <path d="M 38.3 19.7 A 35 35 0 0 1 61.7 19.7" fill="none" stroke="#F59E0B" strokeWidth="8" />
            
            {/* Red (20-30) */}
            <path d="M 61.7 19.7 A 35 35 0 0 1 85 50" fill="none" stroke="#EF4444" strokeWidth="8" />
            
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
          <span className="text-xl font-black text-rose-950 leading-none">{value.toFixed(2)}%</span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-rose-700/60 mt-0.5">
        <span>0%</span>
        <span>15%</span>
        <span>30%</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1.5 px-2 rounded-lg border text-[9px] font-black tracking-wide shadow-sm ${statusColor} transition-all duration-300`}>
          {statusText}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-rose-800 font-bold mt-2">Target Nasional &lt; 10%</p>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="absolute inset-0 bg-white/98 rounded-xl border border-rose-200/50 p-4 flex flex-col justify-between shadow-lg z-30 animate-in fade-in zoom-in-95 duration-200 text-left">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-rose-100 pb-2">
              <div className="flex items-center gap-1.5 text-rose-600">
                 <Sparkles className="w-4 h-4 animate-pulse" />
                 <span className="font-extrabold text-[10px] tracking-wide uppercase">Analisis AI GovTech</span>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕</button>
           </div>
           {/* Body */}
           <div className="flex-1 py-2 overflow-y-auto custom-scrollbar select-text">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                 Berdasarkan pemantauan real-time **SAGON**, koefisien variasi harga beras di Kota Cilegon berada pada tingkat **{value.toFixed(2)}%**, jauh di bawah ambang batas kerawanan nasional sebesar 10%. Angka ini mencerminkan stabilitas pasokan beras lokal yang sangat kokoh di pasar tradisional serta keberhasilan distribusi bantuan pangan yang tepat waktu dan efisien dalam menjaga keseimbangan harga pasar.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-rose-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>BPN / KEMENTAN RI</span>
              <button onClick={() => setShowAIModal(false)} className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}

