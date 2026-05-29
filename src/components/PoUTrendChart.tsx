"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PoUTrendChartProps {
  giziData: any[];
  selectedYear: number;
}

export default function PoUTrendChart({ giziData = [], selectedYear }: PoUTrendChartProps) {
  
  // Calculate dynamic average PoU from database for the selected year
  const getAveragePoU = (fallback: number) => {
    if (giziData.length === 0) return fallback;
    const valid = giziData.filter(x => (x.pou || 0) > 0);
    if (valid.length === 0) return fallback;
    const sum = valid.reduce((s, x) => s + (x.pou || 0), 0);
    return parseFloat((sum / valid.length).toFixed(2));
  };

  const dynamicPoU = getAveragePoU(2.78);

  // 5-year PoU historic trend (lower is better)
  const chartData = [
    { name: '2022', pou: 3.25 },
    { name: '2023', pou: 3.01 },
    { name: '2024', pou: 2.89 },
    { name: '2025', pou: selectedYear === 2025 ? dynamicPoU : 2.78 },
    { name: '2026', pou: selectedYear === 2026 ? dynamicPoU : 2.65 },
  ];

  return (
    <div className="dashboard-card border-none shadow-sm bg-white p-4 rounded-xl flex flex-col h-full min-h-[220px] justify-between">
      <div>
        <h3 className="font-extrabold text-[#7C3AED] text-sm leading-none flex items-center gap-1.5">
          <span>💜</span> Prevalence of Undernourishment (PoU)
        </h3>
        <p className="text-[10px] text-slate-500 mt-1">
          Tren Persentase Angka Prevalensi Kerawanan Konsumsi Pangan (2022 - 2026)
        </p>
      </div>

      {/* Main Area Chart - FIXED: Explicit height h-[140px] to prevent collapsed 0px height in flex layouts */}
      <div className="w-full h-[140px] mt-3">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPoUTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, 4]} tickFormatter={(val) => `${val}%`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '10px' }}
              labelStyle={{ color: '#0B1E41', fontWeight: 'bold' }}
              itemStyle={{ color: '#7C3AED', fontWeight: 'bold', fontSize: '10px' }}
              formatter={(value: any) => [`${value}%`, 'Prevalensi PoU']}
            />
            <Area type="monotone" dataKey="pou" stroke="#7C3AED" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPoUTrend)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Info Banner */}
      <div className="mt-2.5 p-2 bg-violet-50 rounded-lg border border-violet-100 text-[8px] text-violet-800 font-bold leading-normal">
        💡 **Rekomendasi**: Angka PoU Kota Cilegon berada di bawah target maksimal nasional (&lt; 5%). Hal ini mengindikasikan tingkat kecukupan konsumsi pangan masyarakat yang relatif terjaga dan sangat baik.
      </div>
    </div>
  );
}
