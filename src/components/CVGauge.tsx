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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={() => setShowAIModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left" onClick={(e) => e.stopPropagation()}>
             {/* Header */}
             <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                   <span className="font-extrabold text-xs tracking-wide uppercase">Analisis AI GovTech</span>
                </div>
                <button onClick={() => setShowAIModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
             </div>
             {/* Body */}
             <div className="p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                   <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
                      <Brain className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none">Koefisien Variasi (CV)</h4>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">STATISTIK STABILITAS HARGA</span>
                   </div>
                </div>
                
                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/60">
                   <div className="text-[10px] font-black text-rose-700 uppercase">Capaian Saat Ini</div>
                   <div className="text-2xl font-black text-rose-950 mt-1">{value.toFixed(2)}% <span className="text-xs font-bold text-slate-500">Koefisien</span></div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                   Berdasarkan pemantauan real-time **SAGON**, koefisien variasi harga beras di Kota Cilegon berada pada tingkat **{value.toFixed(2)}%**, jauh di bawah ambang batas kerawanan nasional sebesar 10%. Angka ini mencerminkan stabilitas pasokan beras lokal yang sangat kokoh di pasar tradisional serta keberhasilan distribusi bantuan pangan yang tepat waktu dan efisien dalam menjaga keseimbangan harga pasar.
                </p>
             </div>
             {/* Footer */}
             <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400">
                <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
                <button onClick={() => setShowAIModal(false)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-[9px] font-black transition-all active:scale-95 shadow-sm">Tutup</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

