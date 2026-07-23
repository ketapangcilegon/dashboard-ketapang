"use client";

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';

interface ProduksiBerasData {
  tahun: number;
  produksi_gkg: number;
  konversi: number;
  produksi_beras: number;
}

interface ProduksiLokalChartProps {
  produksiBerasData: ProduksiBerasData[];
  selectedYear: number;
  selectedMonth: number;
  year?: number;
}

export default function ProduksiLokalChart({ produksiBerasData = [], selectedYear, selectedMonth, year = 2025 }: ProduksiLokalChartProps) {
  const [showAIModal, setShowAIModal] = useState(false);

  // Compute annual average or latest production values from the database
  const getProdForYear = (year: number, fallback: number) => {
    const row = produksiBerasData.find(x => x.tahun === year);
    if (row) return Math.round(row.produksi_beras);
    return fallback;
  };

  // Dynamic 5-year series: 2021 to 2025 matching the user's Excel uploads
  const prod2021 = getProdForYear(2021, 7390);
  const prod2022 = getProdForYear(2022, 7209);
  const prod2023 = getProdForYear(2023, 6230);
  const prod2024 = getProdForYear(2024, 6614);
  const prod2025 = getProdForYear(2025, 8708);

  const chartData = [
    { name: '2021', produksi: prod2021 },
    { name: '2022', produksi: prod2022 },
    { name: '2023', produksi: prod2023 },
    { name: '2024', produksi: prod2024 },
    { name: '2025', produksi: prod2025 },
  ];

  // Current display value based on selected year/month
  const currentYearRow = produksiBerasData.find(x => x.tahun === selectedYear);
  const displayValue = currentYearRow 
    ? Math.round(currentYearRow.produksi_beras)
    : (selectedYear === 2021 ? 7390 : selectedYear === 2022 ? 7209 : selectedYear === 2023 ? 6230 : selectedYear === 2024 ? 6614 : 8708);

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-[#EA580C] via-[#FDBA74]/45 to-white/95 p-4 rounded-xl shadow-md border border-orange-200/50 justify-between items-center select-none overflow-hidden">
      
      {/* AI Interpretation Icon */}
      <button 
        onClick={() => setShowAIModal(true)}
        title="Analisis AI GovTech"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white hover:bg-slate-50 text-orange-600 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center border border-orange-100 z-10"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>

      {/* Header */}
      <div className="w-full text-left z-10 flex flex-col justify-start h-[32px]">
        <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none">Produksi Beras</h4>
        <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none mt-0.5">Lokal {year}</h4>
      </div>
      
      {/* Value Display */}
      <div className="mt-1.5 flex items-baseline gap-1.5 w-full text-left z-10">
        <span className="text-xl font-black text-slate-800">{displayValue.toLocaleString('id-ID')}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase">ton</span>
      </div>

      {/* Recharts Bar Chart - Centered by shifting left margin to -38 */}
      <div className="w-full h-20 mt-2 flex-1 z-10">
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: -38, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#475569', fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#475569', fontWeight: 'bold' }} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '9px' }}
              labelStyle={{ color: '#475569', fontWeight: 'bold' }}
              itemStyle={{ color: '#EA580C', fontWeight: 'bold', fontSize: '9px' }}
              formatter={(value: any) => [`${value.toLocaleString('id-ID')} ton`, 'Produksi']}
            />
            <Bar 
              dataKey="produksi" 
              fill="#EA580C" 
              radius={[4, 4, 0, 0]} 
              barSize={12} 
              label={{ position: 'top', fill: '#334155', fontSize: 6.5, fontWeight: 'bold', offset: 3 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
                 Berdasarkan data kompilasi dinas, total produksi beras lokal Kota Cilegon pada tahun <strong>{selectedYear}</strong> tercatat mencapai <strong>{displayValue.toLocaleString('id-ID')} ton</strong>. Peningkatan kapasitas giling padi (GKG ke Beras) serta pengamanan lahan sawah lestari di beberapa kelurahan sentra produksi pangan secara konsisten memperkuat ketahanan pangan wilayah dari fluktuasi pasokan luar daerah.
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

