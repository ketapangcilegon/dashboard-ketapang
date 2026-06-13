"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface CVGaugeProps {
  value: number;
}

export default function CVGauge({ value = 3.65 }: CVGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds
    const startValue = 0;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      setAnimatedValue(startValue + easeOutQuad * (value - startValue));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    const timer = setTimeout(() => {
      animationFrameId = window.requestAnimationFrame(step);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value]);

  // Determine status and style based on requested CV thresholds:
  // < 10%: Aman / Stabil
  // 10-20%: Waspada / Fluktuatif Sedang
  // > 20%: Rentan / Tidak Stabil
  let statusText = 'AMAN / STABIL';
  let statusColor = 'text-emerald-700 bg-emerald-50/90 border-emerald-200';
  
  if (value > 20) {
    statusText = 'RENTAN / TIDAK STABIL';
    statusColor = 'text-red-700 bg-red-50/90 border-red-200';
  } else if (value >= 10) {
    statusText = 'WASPADA / FLUKTUATIF SEDANG';
    statusColor = 'text-amber-700 bg-amber-50/90 border-amber-200';
  }

  // Trigonometry to position the needle (range 0 to 30)
  const clampedCV = Math.min(Math.max(animatedValue, 0), 30);
  const angleRad = (clampedCV / 30) * Math.PI; // 0 (left) to Math.PI (right)
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#2563EB] via-[#93C5FD]/45 to-white/95 p-4 rounded-xl shadow-md border border-blue-200/50 items-center justify-between group select-none">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white hover:bg-slate-50 text-blue-600 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center border border-blue-100 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left h-[42px] flex flex-col justify-start">
        <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">CV Koefisien Variasi</h4>
        <h3 className="text-xs font-bold text-white mt-1 leading-tight">Harga Beras</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Background base track */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" strokeLinecap="round" />
            
            {/* Green Segment (0% - 10%) */}
            <path d="M 15 50 A 35 35 0 0 1 32.5 19.69" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
            
            {/* Yellow/Orange Segment (10% - 20%) */}
            <path d="M 32.5 19.69 A 35 35 0 0 1 67.5 19.69" fill="none" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />
            
            {/* Red Segment (20% - 30%) */}
            <path d="M 67.5 19.69 A 35 35 0 0 1 85 50" fill="none" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
            
            {/* Dynamic Jarum Penunjuk (Needle) */}
            <line 
              x1="50" 
              y1="50" 
              x2={needleX} 
              y2={needleY} 
              stroke="#1E293B" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              className="transition-none" 
            />
            
            {/* Center Anchor Pin */}
            <circle cx="50" cy="50" r="4.5" fill="#1E293B" />
            <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Percentage Number - absolute below the gauge center anchor */}
        <div className="text-center mt-1.5 z-10">
          <span className="text-xl font-black text-slate-800 leading-none">{value.toFixed(2)}%</span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-blue-800/80 mt-0.5">
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
      <p className="text-[9px] text-blue-900 font-bold mt-2">Target Nasional &lt; 10%</p>

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
                 Berdasarkan pemantauan real-time **SAGON**, koefisien variasi harga beras di Kota Cilegon berada pada tingkat **{value.toFixed(2)}%**, yang dikategorikan sebagai **{statusText}**. Rentang ini menunjukkan bahwa kestabilan harga beras lokal berada pada tingkat aman, meminimalkan gejolak pasar dan menjaga keterjangkauan daya beli masyarakat secara luas dan merata.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-blue-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
              <button onClick={() => setShowAIModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
