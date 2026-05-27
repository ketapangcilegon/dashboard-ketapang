"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProduksiChart() {
  const data = [
    { name: 'Des', produksi: 15000 },
    { name: 'Jan', produksi: 12000 },
    { name: 'Feb', produksi: 18000 },
    { name: 'Mar', produksi: 16000 },
    { name: 'Apr', produksi: 21000 },
    { name: 'Mei', produksi: 23850 },
  ];

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-bold text-slate-800 text-sm mb-2 w-full">3. Produksi Beras Lokal<br/><span className="font-normal text-slate-500">(ton)</span></h3>
      
      <div className="mb-2">
        <span className="text-3xl font-black text-[#10B981]">23.850 <span className="text-sm font-medium text-slate-500">ton</span></span>
        <div className="text-[10px] font-bold text-emerald-600 mt-1">▲ 8,7% dari bulan lalu</div>
      </div>

      <div className="flex-1 w-full mt-2 h-32">
        <ResponsiveContainer width="99%" height={120}>
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProduksi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#64748B', fontWeight: 'bold', fontSize: '12px' }}
              itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey="produksi" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProduksi)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
