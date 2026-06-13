"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { useState, useEffect } from 'react';
import { Brain, X } from 'lucide-react';

interface PoUTrendChartProps {
  pouData: any[];
  selectedYear: number;
}

export default function PoUTrendChart({ pouData = [], selectedYear }: PoUTrendChartProps) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Default fallback data matching the historic spreadsheet uploaded by the user
  const defaultChartData = [
    { name: '2021', nasional: 8.49, provinsi: 2.80, cilegon: 2.46 },
    { name: '2022', nasional: 10.21, provinsi: 2.46, cilegon: 2.04 },
    { name: '2023', nasional: 9.13, provinsi: 2.87, cilegon: 2.19 },
    { name: '2024', nasional: 8.27, provinsi: 2.55, cilegon: 1.96 },
    { name: '2025', nasional: 7.89, provinsi: 2.88, cilegon: 2.78 },
  ];

  // Map Supabase rows to Recharts series (ordered by year)
  const chartData = pouData.length > 0
    ? pouData.map(x => ({
        name: String(x.tahun),
        nasional: parseFloat(x.pou_nasional) || 0,
        provinsi: parseFloat(x.pou_provinsi) || 0,
        cilegon: parseFloat(x.pou_cilegon) || 0
      }))
    : defaultChartData;

  const [visibleData, setVisibleData] = useState<any[]>([]);

  useEffect(() => {
    if (chartData.length === 0) return;
    setVisibleData([chartData[0]]);
    
    let currentIndex = 1;
    const interval = setInterval(() => {
      if (currentIndex < chartData.length) {
        setVisibleData(prev => [...prev, chartData[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    
    return () => clearInterval(interval);
  }, [pouData]);

  return (
    <div className="dashboard-card relative border-none shadow-sm bg-white p-4 rounded-xl flex flex-col h-full min-h-[260px] justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="pr-8">
          <h3 className="font-extrabold text-[#7C3AED] text-sm leading-none flex items-center gap-1.5">
            <span>💜</span> Prevalence of Undernourishment (PoU) Lintas Tahun
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Tren Perbandingan Angka Prevalensi Kerawanan Konsumsi Pangan (%)
          </p>
        </div>
        <button 
          onClick={() => setIsAIOpen(!isAIOpen)}
          className={`absolute right-0 top-0 p-1.5 rounded-lg transition-all border ${isAIOpen ? 'bg-violet-600 text-white border-violet-700 shadow-inner' : 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100 hover:scale-105 active:scale-95 shadow-sm'}`}
          title="Tampilkan AI Insight"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>

      {/* Pop-over AI Insight */}
      {isAIOpen && (
        <div className="absolute top-12 right-4 bottom-4 w-[80%] sm:w-[55%] bg-white border border-violet-100 shadow-[0_10px_40px_-10px_rgba(109,40,217,0.2)] rounded-xl z-20 flex flex-col animate-in slide-in-from-right-8 duration-300 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h4 className="text-xs font-black text-violet-700 uppercase flex items-center gap-2 tracking-wide">
              <Brain className="w-4 h-4" /> AI Insight
            </h4>
            <button onClick={() => setIsAIOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-white to-violet-50/30">
            <p className="text-xs text-slate-700 font-medium leading-relaxed text-justify mt-2">
              {(() => {
                const latest = chartData[chartData.length - 1];
                const first = chartData[0];
                const isBelowNasional = latest.cilegon < latest.nasional;
                const trendStr = latest.cilegon < first.cilegon ? 'penurunan (perbaikan)' : 'peningkatan';
                const status = latest.cilegon < 5 ? 'sangat baik dan memenuhi standar FAO' : 'memerlukan perhatian untuk mitigasi kerawanan';
                
                return `Berdasarkan tren historis, angka PoU Kota Cilegon pada tahun ${latest.name} tercatat sebesar ${latest.cilegon}%. Angka ini ${isBelowNasional ? 'secara konsisten berada jauh di bawah' : 'berada di atas'} Prevalensi Nasional (${latest.nasional}%). Terdapat tren ${trendStr} sejak ${first.name}, yang mengindikasikan tingkat kecukupan konsumsi pangan masyarakat kota yang ${status}. Kapasitas daya beli masyarakat dan stabilisasi pasokan terbukti efektif meredam risiko kerawanan pangan absolut.`;
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Main Area Chart with 3 comparative layers (National, Provincial, City) */}
      <div className="w-full h-[160px] mt-3">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={visibleData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCilegon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProvinsi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNasional" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.05}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, 12]} tickFormatter={(val) => `${val}%`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '10px' }}
              labelStyle={{ color: '#0B1E41', fontWeight: 'bold' }}
              formatter={(value: any, name: any) => {
                const labelMap: Record<string, string> = {
                  nasional: 'POU Nasional',
                  provinsi: 'POU Provinsi Banten',
                  cilegon: 'POU Kota Cilegon'
                };
                return [`${value}%`, labelMap[name] || name];
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={24} 
              iconType="circle" 
              wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', top: -10 }} 
            />
            <Area type="monotone" dataKey="nasional" name="nasional" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorNasional)">
              <LabelList dataKey="nasional" position="top" style={{ fontSize: '8px', fill: '#D97706', fontWeight: 'bold' }} offset={5} />
            </Area>
            <Area type="monotone" dataKey="provinsi" name="provinsi" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorProvinsi)">
              <LabelList dataKey="provinsi" position="top" style={{ fontSize: '8px', fill: '#0891B2', fontWeight: 'bold' }} offset={5} />
            </Area>
            <Area type="monotone" dataKey="cilegon" name="cilegon" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCilegon)">
              <LabelList dataKey="cilegon" position="bottom" style={{ fontSize: '8px', fill: '#6D28D9', fontWeight: 'bold' }} offset={8} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
