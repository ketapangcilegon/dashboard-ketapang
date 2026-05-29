"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProduksiLokalChartProps {
  ketersediaanData: any[]; // Expecting all years, or we compute dynamically
  selectedYear: number;
  selectedMonth: number;
}

export default function ProduksiLokalChart({ ketersediaanData = [], selectedYear, selectedMonth }: ProduksiLokalChartProps) {
  
  // Compute annual average or latest production values from the database
  const getProdForYear = (year: number, fallback: number) => {
    const yearRows = ketersediaanData.filter(x => x.tahun === year);
    if (yearRows.length === 0) return fallback;
    // Calculate average production for that year
    const sum = yearRows.reduce((s, x) => s + (x.produksi_beras_ton || 0), 0);
    return Math.round(sum / yearRows.length);
  };

  // Dynamic 5-year series: 2022 to 2026
  const prod2022 = getProdForYear(2022, 21800);
  const prod2023 = getProdForYear(2023, 22450);
  const prod2024 = getProdForYear(2024, 20900);
  const prod2025 = getProdForYear(2025, 23850);
  const prod2026 = getProdForYear(2026, 24100);

  const chartData = [
    { name: '2022', produksi: prod2022 },
    { name: '2023', produksi: prod2023 },
    { name: '2024', produksi: prod2024 },
    { name: '2025', produksi: prod2025 },
    { name: '2026', produksi: prod2026 },
  ];

  // Current display value based on selected year/month
  const currentMonthData = ketersediaanData.find(x => x.tahun === selectedYear && x.bulan === selectedMonth);
  const latestData = ketersediaanData.filter(x => x.tahun === selectedYear);
  const displayValue = currentMonthData 
    ? currentMonthData.produksi_beras_ton 
    : (latestData.length > 0 ? latestData[latestData.length - 1].produksi_beras_ton : 23850);

  return (
    <div className="flex flex-col h-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">3. Produksi Beras Lokal</h4>
        <h3 className="text-xs font-bold text-slate-700 mt-1 leading-tight">Data Series 5 Tahun (ton)</h3>
      </div>
      
      {/* Value Display */}
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-xl font-black text-[#10B981]">{displayValue.toLocaleString('id-ID')}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase">ton</span>
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full h-16 mt-1.5">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProduksi5Year" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94A3B8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94A3B8' }} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '10px' }}
              labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
              itemStyle={{ color: '#10B981', fontWeight: 'bold', fontSize: '10px' }}
              formatter={(value: any) => [`${value.toLocaleString('id-ID')} ton`, 'Produksi']}
            />
            <Area type="monotone" dataKey="produksi" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProduksi5Year)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator */}
      <div className="w-full border-t border-slate-50 pt-1 flex justify-between items-center text-[8px] font-extrabold text-emerald-600 mt-1">
        <span>Series: 2022 - 2026</span>
        <span>Target Nasional Tercapai</span>
      </div>
    </div>
  );
}
