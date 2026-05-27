"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BalitaChartProps {
  balitaData: {
    sangatKurang: number;
    kurang: number;
    normal: number;
    lebih: number;
    total: number;
    status: string;
  };
}

export default function BalitaChart({ balitaData }: BalitaChartProps) {
  const data = [
    { name: 'Sangat Kurang', value: balitaData.sangatKurang, color: '#EF4444' },
    { name: 'Kurang', value: balitaData.kurang, color: '#F59E0B' },
    { name: 'Normal', value: balitaData.normal, color: '#10B981' },
    { name: 'Gizi Lebih', value: balitaData.lebih, color: '#3B82F6' }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <h3 className="font-bold text-slate-800 text-sm">Status BB/U Balita</h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Berat Badan menurut Umur Balita Cilegon (Feb-26)</p>
      </div>

      <div className="flex-1 w-full h-32 flex items-center justify-center relative">
        <ResponsiveContainer width="99%" height={130}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            />
            <Legend 
              iconType="circle" 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#64748B', right: -10 }} 
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ left: '-40px' }}>
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
            {balitaData.status}
          </span>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 font-semibold text-center border-t border-slate-50 pt-2">
        Total Balita Diukur: <span className="font-black text-slate-800">{balitaData.total.toLocaleString('id-ID')} balita</span>
      </div>
    </div>
  );
}
