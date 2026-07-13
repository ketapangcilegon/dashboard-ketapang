"use client";

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface BalitaDoughnutProps {
  balitaData: {
    sangatKurang: number;
    kurang: number;
    normal: number;
    lebih: number;
    total: number;
    status: string;
    tahun?: number;
    bulan?: number;
  };
}

export default function BalitaDoughnut({ balitaData }: BalitaDoughnutProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const totalVal = balitaData.total > 0 ? balitaData.total : 27286;
  const statusLabel = balitaData.status || 'AMAN';
  const statusColor = statusLabel === 'AMAN' 
    ? 'text-emerald-800 bg-emerald-50 border-emerald-100 shadow-inner' 
    : 'text-rose-800 bg-rose-50 border-rose-100 shadow-inner';

  // Map categories to standard terms
  const data = [
    { name: 'Normal', value: balitaData.normal, color: '#10B981' },
    { name: 'Gizi Lebih', value: balitaData.lebih, color: '#2563EB' },
    { name: 'Gizi Kurang', value: balitaData.kurang, color: '#F59E0B' },
    { name: 'Gizi Buruk', value: balitaData.sangatKurang, color: '#EF4444' }
  ];

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#6D28D9] via-[#C4B5FD]/45 to-white/95 p-4 rounded-xl shadow-md border border-purple-200/50 justify-between select-none">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white hover:bg-slate-50 text-purple-600 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center border border-purple-100 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header with AMAN Badge */}
      <div className="w-full flex justify-between items-start">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">Status</h4>
          <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none mt-0.5">BB/U</h4>
          <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none mt-0.5">Balita</h4>
          <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none mt-0.5 text-yellow-300">
            {(balitaData.bulan !== undefined && ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'][balitaData.bulan - 1]) || 'JUNI'} {balitaData.tahun || 2026}
          </h4>
        </div>
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border shadow-sm uppercase mr-8 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Modern SaaS-Style Linear Progress Indicators */}
      <div className="w-full space-y-2.5 my-3 flex-1 flex flex-col justify-center">
        {data.map((item, index) => {
          const pct = ((item.value / totalVal) * 100).toFixed(1);
          return (
            <div key={index} className="w-full text-left">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span>
                  {item.value.toLocaleString('id-ID')}{' '}
                  <span className="text-[8px] font-medium text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Balita Diukur */}
      <div className="w-full border-t border-purple-500/10 pt-2 text-center">
        <p className="text-[8px] text-slate-400 font-bold leading-none">Total Balita Diukur</p>
        <p className="text-[11px] font-black text-slate-800 mt-1">
          {totalVal.toLocaleString('id-ID')}{' '}
          <span className="text-[9px] font-medium text-slate-500">balita</span>
        </p>
      </div>

      {/* AI Modal Popup */}
      {showAIModal && (
        <div className="absolute inset-0 bg-white/98 rounded-xl border border-purple-200/50 p-4 flex flex-col justify-between shadow-lg z-30 animate-in fade-in zoom-in-95 duration-200 text-left">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <div className="flex items-center gap-1.5 text-purple-600">
                 <Sparkles className="w-4 h-4 animate-pulse" />
                 <span className="font-extrabold text-[10px] tracking-wide uppercase">Analisis AI GovTech</span>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕</button>
           </div>
           {/* Body */}
           <div className="flex-1 py-2 overflow-y-auto custom-scrollbar select-text">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                 Berdasarkan data penimbangan Balita BB/U terbaru di Kota Cilegon, status ketahanan gizi dikategorikan **{statusLabel}**. Dari total **{totalVal.toLocaleString('id-ID')}** balita yang diukur, mayoritas berada pada status gizi Normal (**{((balitaData.normal/totalVal)*100).toFixed(1)}%**), gizi Kurang (**{((balitaData.kurang/totalVal)*100).toFixed(1)}%**), dan gizi Buruk/Sangat Kurang (**{((balitaData.sangatKurang/totalVal)*100).toFixed(1)}%**). Intervensi PMT pangan lokal terbukti efektif mempertahankan status gizi balita perkotaan.
              </p>
           </div>
           {/* Footer */}
           <div className="border-t border-purple-100 pt-2 flex justify-between items-center text-[7px] font-bold text-slate-400">
              <span>SEKTOR KETAHANAN PANGAN CILEGON</span>
              <button onClick={() => setShowAIModal(false)} className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded text-[8px] font-black transition-all active:scale-95 shadow-sm cursor-pointer">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
