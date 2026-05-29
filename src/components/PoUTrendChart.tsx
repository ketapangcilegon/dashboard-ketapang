"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface PoUTrendChartProps {
  pouData: any[];
  selectedYear: number;
}

export default function PoUTrendChart({ pouData = [], selectedYear }: PoUTrendChartProps) {
  
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

  return (
    <div className="dashboard-card border-none shadow-sm bg-white p-4 rounded-xl flex flex-col h-full min-h-[260px] justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-extrabold text-[#7C3AED] text-sm leading-none flex items-center gap-1.5">
            <span>💜</span> Prevalence of Undernourishment (PoU) Lintas Tahun
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Tren Perbandingan Angka Prevalensi Kerawanan Konsumsi Pangan (%)
          </p>
        </div>
      </div>

      {/* Main Area Chart with 3 comparative layers (National, Provincial, City) */}
      <div className="w-full h-[160px] mt-3">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
            <Area type="monotone" dataKey="nasional" name="nasional" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorNasional)" />
            <Area type="monotone" dataKey="provinsi" name="provinsi" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorProvinsi)" />
            <Area type="monotone" dataKey="cilegon" name="cilegon" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCilegon)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Info Banner */}
      <div className="mt-2.5 p-2 bg-violet-50 rounded-lg border border-violet-100 text-[8px] text-violet-800 font-bold leading-normal">
        💡 **Rekomendasi**: Angka PoU Kota Cilegon secara konsisten berada jauh di bawah Prevalensi Provinsi Banten dan Target Maksimal Nasional (&lt; 5%). Hal ini mengindikasikan tingkat kecukupan konsumsi pangan masyarakat kota yang sangat baik dan melampaui rata-rata wilayah lain.
      </div>
    </div>
  );
}
