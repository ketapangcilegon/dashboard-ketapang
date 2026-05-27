"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { IKP_HISTORY } from '@/lib/ikp';

export default function TrendChart() {
  const chartData = IKP_HISTORY.map(x => ({
    name: x.year.toString(),
    'Kota Cilegon': x.cilegon,
    'Provinsi Banten': x.banten,
    'Kategori Cilegon': x.cilegonKategori,
    'Kategori Banten': x.bantenKategori
  }));

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div className="mb-2">
        <h3 className="font-bold text-slate-800 text-sm">Indeks Ketahanan Pangan (IKP)</h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Perbandingan Kota Cilegon vs Provinsi Banten (2020 - 2024)</p>
      </div>
      
      <div className="flex-1 w-full mt-2 h-64">
        <ResponsiveContainer width="99%" height={230}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} domain={[60, 90]} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#0B1E41', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}
              formatter={(value, name, props) => {
                const yearIndex = chartData.findIndex(d => d.name === props.payload.name);
                const item = IKP_HISTORY[yearIndex];
                const kat = name === 'Kota Cilegon' ? item?.cilegonKategori : item?.bantenKategori;
                return [`${value} (${kat})`, name];
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B', paddingTop: '10px' }} />
            
            <Line type="monotone" dataKey="Kota Cilegon" name="Kota Cilegon" stroke="#10B981" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
            <Line type="monotone" dataKey="Provinsi Banten" name="Provinsi Banten" stroke="#F59E0B" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] text-emerald-800 font-semibold leading-relaxed">
        💡 Proyeksi IKP Kota Cilegon menunjukkan arah **tren positif (Sangat Tahan Pangan)**, melampaui rata-rata provinsi sejak 2021.
      </div>
    </div>
  );
}
