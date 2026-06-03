"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { useState } from 'react';
import { Brain, X } from 'lucide-react';

interface IKPTrendChartProps {
  ikpData: any[];
  selectedYear: number;
}

export default function IKPTrendChart({ ikpData = [], selectedYear }: IKPTrendChartProps) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Default fallback data matching the historic dataset
  const defaultChartData = [
    { name: '2020', cilegon: 70.23, provinsi: 73.48, nasional: 72.44 },
    { name: '2021', cilegon: 71.42, provinsi: 82.69, nasional: 72.44 },
    { name: '2022', cilegon: 72.63, provinsi: 73.78, nasional: 72.91 },
    { name: '2023', cilegon: 81.54, provinsi: 78.71, nasional: 74.20 },
    { name: '2024', cilegon: 80.12, provinsi: 79.25, nasional: 74.91 },
    { name: '2025', cilegon: 76.15, provinsi: 77.78, nasional: 73.00 },
  ];

  // Map Supabase rows to Recharts series (ordered by year)
  const chartData = ikpData.length > 0
    ? ikpData.map(x => ({
        name: String(x.tahun),
        cilegon: parseFloat(x.ikp_cilegon) || 0,
        provinsi: x.ikp_provinsi !== null && x.ikp_provinsi !== undefined ? parseFloat(x.ikp_provinsi) : null,
        nasional: x.ikp_nasional !== null && x.ikp_nasional !== undefined ? parseFloat(x.ikp_nasional) : null
      })).sort((a, b) => parseInt(a.name) - parseInt(b.name))
    : defaultChartData;

  return (
    <div className="dashboard-card relative border-none shadow-sm bg-white p-4 rounded-xl flex flex-col h-full min-h-[260px] justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="pr-8">
          <h3 className="font-extrabold text-[#10B981] text-sm leading-none flex items-center gap-1.5">
            <span>🌾</span> Indeks Ketahanan Pangan (IKP) Lintas Tahun
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Perbandingan Nilai Indeks Ketahanan Pangan Daerah vs Provinsi & Nasional
          </p>
        </div>
        <button 
          onClick={() => setIsAIOpen(!isAIOpen)}
          className={`absolute right-0 top-0 p-1.5 rounded-lg transition-all border ${isAIOpen ? 'bg-emerald-600 text-white border-emerald-700 shadow-inner' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:scale-105 active:scale-95 shadow-sm'}`}
          title="Tampilkan AI Insight"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>

      {/* Pop-over AI Insight */}
      {isAIOpen && (
        <div className="absolute top-12 right-4 bottom-4 w-[80%] sm:w-[55%] bg-white border border-emerald-100 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] rounded-xl z-20 flex flex-col animate-in slide-in-from-right-8 duration-300 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h4 className="text-xs font-black text-emerald-700 uppercase flex items-center gap-2 tracking-wide">
              <Brain className="w-4 h-4" /> AI Insight
            </h4>
            <button onClick={() => setIsAIOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100 text-emerald-800 mb-4 flex items-center gap-2 text-xs font-bold">
              <span className="text-sm">💡</span> Interpretasi Cerdas
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed text-justify mb-4">
              {(() => {
                const latest = chartData[chartData.length - 1];
                const first = chartData[0];
                const diff = (latest.cilegon - first.cilegon).toFixed(2);
                const isAboveNasional = latest.cilegon > latest.nasional;
                const status = latest.cilegon >= 75 ? 'sangat tangguh' : 'memerlukan penguatan determinan spesifik';
                
                return `Indeks Ketahanan Pangan Kota Cilegon pada ${latest.name} mencapai angka ${latest.cilegon.toFixed(2)}. Selama periode ${first.name}-${latest.name}, terjadi ${parseFloat(diff) > 0 ? 'peningkatan' : 'penurunan'} sebesar ${Math.abs(parseFloat(diff))} poin. Posisi terkini ${isAboveNasional ? 'melampaui' : 'berada di bawah'} target Nasional (${latest.nasional.toFixed(2)}), yang merepresentasikan sistem pangan daerah yang ${status}.`;
              })()}
            </p>
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-amber-900 shadow-sm text-[10px] font-bold">
              ⚠️ Catatan Metodologi
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-2 text-justify">
              Tahun 2025 menggunakan metodologi baru (12 indikator) sehingga tidak sepenuhnya sebanding dengan seri sebelumnya.
            </p>
          </div>
        </div>
      )}

      {/* Main Composed Chart (Area for Cilegon, Line for Provinsi & Nasional target) */}
      <div className="w-full h-[160px] mt-3">
        <ResponsiveContainer width="99%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIKPCilegon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[65, 85]} tickFormatter={(val) => String(val)} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '10px' }}
              labelStyle={{ color: '#0B1E41', fontWeight: 'bold' }}
              formatter={(value: any, name: any) => {
                const labelMap: Record<string, string> = {
                  nasional: 'IKP Nasional',
                  provinsi: 'IKP Prov. Banten',
                  cilegon: 'IKP Kota Cilegon'
                };
                if (value === null) return ['N/A', labelMap[name] || name];
                return [value.toFixed(2), labelMap[name] || name];
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={24} 
              iconType="circle" 
              wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', top: -10 }} 
            />
            <Area type="monotone" dataKey="cilegon" name="cilegon" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIKPCilegon)">
              <LabelList dataKey="cilegon" position="top" style={{ fontSize: '8px', fill: '#059669', fontWeight: 'bold' }} offset={8} />
            </Area>
            <Line type="monotone" dataKey="provinsi" name="provinsi" stroke="#3B82F6" strokeWidth={2.2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={true}>
              <LabelList dataKey="provinsi" position="bottom" style={{ fontSize: '8px', fill: '#2563EB', fontWeight: 'bold' }} offset={8} />
            </Line>
            <Line type="monotone" dataKey="nasional" name="nasional" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={true}>
              <LabelList dataKey="nasional" position="top" style={{ fontSize: '8px', fill: '#D97706', fontWeight: 'bold' }} offset={8} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
