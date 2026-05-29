"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
}

export default function ProduksiLokalChart({ produksiBerasData = [], selectedYear, selectedMonth }: ProduksiLokalChartProps) {
  
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
    <div className="flex flex-col h-full bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] p-4 rounded-xl shadow-sm border border-[#E2E8F0]/80 justify-between items-center">
      {/* Header - Subtitle and '3.' prefix removed per methodology request */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Produksi Beras Lokal</h4>
      </div>
      
      {/* Value Display */}
      <div className="mt-1.5 flex items-baseline gap-1.5 w-full text-left">
        <span className="text-xl font-black text-[#10B981]">{displayValue.toLocaleString('id-ID')}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase">ton</span>
      </div>

      {/* Recharts Bar Chart - Centered by shifting left margin to -38 */}
      <div className="w-full h-20 mt-2 flex-1">
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 0, left: -38, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748B' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748B' }} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '9px' }}
              labelStyle={{ color: '#475569', fontWeight: 'bold' }}
              itemStyle={{ color: '#10B981', fontWeight: 'bold', fontSize: '9px' }}
              formatter={(value: any) => [`${value.toLocaleString('id-ID')} ton`, 'Produksi']}
            />
            <Bar dataKey="produksi" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
