"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BalitaDoughnutProps {
  balitaData: {
    sangatKurang: number;
    kurang: number;
    normal: number;
    lebih: number;
    total: number;
    status: string;
  };
}

export default function BalitaDoughnut({ balitaData }: BalitaDoughnutProps) {
  // Map categories to standard terms: Gizi Buruk (sangat kurang), Gizi Kurang (kurang), Normal, Gizi Lebih
  const data = [
    { name: 'Gizi Buruk', value: balitaData.sangatKurang, color: '#EF4444' },
    { name: 'Gizi Kurang', value: balitaData.kurang, color: '#F59E0B' },
    { name: 'Normal', value: balitaData.normal, color: '#10B981' },
    { name: 'Gizi Lebih', value: balitaData.lebih, color: '#3B82F6' }
  ];

  const totalVal = balitaData.total > 0 ? balitaData.total : 27286;
  const statusLabel = balitaData.status || 'AMAN';
  const statusColor = statusLabel === 'AMAN' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100';

  return (
    <div className="flex flex-col h-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 justify-between">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status BB/U Balita</h4>
        <h3 className="text-xs font-bold text-slate-700 mt-1 leading-tight">Gizi Balita Kota Cilegon</h3>
      </div>

      {/* Doughnut Chart */}
      <div className="relative w-full h-24 flex items-center justify-center pt-1">
        <ResponsiveContainer width="99%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="40%"
              cy="50%"
              innerRadius={20}
              outerRadius={36}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '10px' }}
              itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
              formatter={(value: any) => [`${value.toLocaleString('id-ID')} balita`, 'Jumlah']}
            />
            <Legend 
              iconType="circle" 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', color: '#64748B', right: -5, top: '55%', transform: 'translateY(-50%)' }} 
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center overlay text (dynamic status label) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ left: '-20%' }}>
          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border shadow-sm ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Total Balita Diukur */}
      <div className="w-full border-t border-slate-50 pt-2 text-center">
        <p className="text-[8px] text-slate-500 font-bold leading-none">Total Balita Diukur</p>
        <p className="text-[11px] font-black text-slate-800 mt-1">{totalVal.toLocaleString('id-ID')} <span className="text-[9px] font-medium text-slate-500">balita</span></p>
      </div>
    </div>
  );
}
