"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface EnergiGaugeProps {
  value: number;
  year?: number;
}

export default function EnergiGauge({ value = 2163, year = 2025 }: EnergiGaugeProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  const [isVisible, setIsVisible] = useState(false);
  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!elementRef) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false); // Reset so it runs again when scrolled/carousel shifts into view
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(elementRef);
    return () => observer.disconnect();
  }, [elementRef]);

  useEffect(() => {
    if (!isVisible) {
      setAnimatedValue(0);
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 1000; // 1 second duration
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
  }, [isVisible, value]);

  const target = 2100;
  const maxScale = 3000;

  // Determine indicator text and style
  let statusTitle = 'Buruk / Sangat Kurang';
  let statusColor = 'text-red-700 bg-red-50/90 border-red-200';
  
  if (value >= 2100) {
    statusTitle = 'Aman / Baik';
    statusColor = 'text-[#EA580C] bg-orange-50/90 border-orange-200';
  } else if (value >= 1700) {
    statusTitle = 'Sedang / Rentan';
    statusColor = 'text-amber-700 bg-amber-50/90 border-amber-200';
  }

  // Convert scale (0-3000 kkal) to percentage (0-100) for drawing
  const percentValue = (animatedValue / maxScale) * 100;

  // Trigonometry to position the needle (range 0 to 100)
  const clampedPercent = Math.min(Math.max(percentValue, 0), 100);
  const angleRad = (clampedPercent / 100) * Math.PI; // 0 to Math.PI
  const needleAngleRad = Math.PI - angleRad;
  const needleX = 50 + 32 * Math.cos(needleAngleRad);
  const needleY = 50 - 32 * Math.sin(needleAngleRad);

  const getArcPath = (vPercent: number) => {
    const clamped = Math.min(Math.max(vPercent, 0), 100);
    const endX = 50 - 35 * Math.cos((clamped / 100) * Math.PI);
    const endY = 50 - 35 * Math.sin((clamped / 100) * Math.PI);
    return `M 15 50 A 35 35 0 0 1 ${endX} ${endY}`;
  };

  return (
    <div ref={setElementRef} className="relative flex flex-col h-full bg-gradient-to-br from-[#EA580C] via-[#FDBA74]/45 to-white/95 p-4 rounded-xl shadow-md border border-orange-200/50 items-center justify-between group select-none">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white hover:bg-slate-50 text-orange-600 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center border border-orange-100 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left h-[54px] flex flex-col justify-start">
        <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">Konsumsi Energi</h4>
        <span className="text-[10px] font-black text-white/90 leading-none mt-0.5">{year}</span>
        <h3 className="text-xs font-bold text-white mt-0.5 leading-tight">(kkal/kapita/hari)</h3>
      </div>
      
      {/* Gauge Visual Area */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-36 h-18 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Outer Gray Track */}
            <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" strokeLinecap="round" />
            
            {/* Orange Progress Arc */}
            <path d={getArcPath(percentValue)} fill="none" stroke="#D97706" strokeWidth="8" strokeLinecap="round" />
            
            {/* Jarum Penunjuk (Needle) */}
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
          <span className="text-xl font-black text-slate-800 leading-none">{Math.round(value).toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-bold">kkal</span></span>
        </div>
      </div>

      {/* Target/Scale Limits */}
      <div className="flex justify-between w-32 text-[8px] font-bold text-orange-800/80 mt-0.5">
        <span>0</span>
        <span>1.500</span>
        <span>3.000</span>
      </div>

      {/* Indicator Status Box */}
      <div className="w-full mt-2">
        <div className={`text-center py-1.5 px-2 rounded-lg border text-[9px] font-black tracking-wide shadow-sm transition-all duration-300 ${statusColor}`}>
          {statusTitle.toUpperCase()}
        </div>
      </div>
      
      {/* Target info */}
      <p className="text-[9px] text-[#A33A00] font-bold mt-2">Target Nasional: 2.100</p>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="absolute inset-0 bg-white/98 rounded-xl border border-orange-200/50 p-4 flex flex-col justify-between shadow-lg z-30 animate-in fade-in zoom-in-95 duration-200 text-left">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-orange-100 pb-2">
              <div className="flex items-center gap-1.5 text-orange-600">
                 <Sparkles className="w-4 h-4 animate-pulse" />
                 <span className="font-extrabold text-[10px] tracking-wide uppercase">Analisis AI GovTech</span>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕</button>
           </div>
           {/* Body */}
           <div className="flex-1 py-2 overflow-y-auto custom-scrollbar select-text">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                 Angka konsumsi energi rata-rata harian masyarakat Cilegon saat ini tercatat sebesar <strong>{Math.round(value).toLocaleString('id-ID')} kkal/kapita/hari</strong>, sedikit di bawah target nasional sebesar <strong>2100 kkal</strong>. Meskipun surplus di sektor protein, akselerasi edukasi diversifikasi pangan karbohidrat non-beras perlu terus digalakkan untuk mencapai pemenuhan energi yang optimal di wilayah perkotaan.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-orange-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
              <button onClick={() => setShowAIModal(false)} className="bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
