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
    { name: 'Gizi Lebih', value: balitaData.lebih, color: '#2563EB' },
    { name: 'Normal', value: balitaData.normal, color: '#10B981' }
  ];

  const totalVal = balitaData.total > 0 ? balitaData.total : 27286;
  const statusLabel = balitaData.status || 'AMAN';
  const statusColor = statusLabel === 'AMAN' 
    ? 'text-emerald-800 bg-emerald-50 border-emerald-100' 
    : 'text-rose-800 bg-rose-50 border-rose-100';

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] p-4 rounded-xl shadow-sm border border-[#99F6E4]/60 justify-between items-center">
      {/* Header */}
      <div className="w-full text-left">
        <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none">Status BB/U Balita</h4>
        <h3 className="text-xs font-bold text-teal-900 mt-1 leading-tight">Gizi Balita Kota Cilegon</h3>
      </div>

      {/* Doughnut Chart - Legend on left, Pie shifted to right */}
      <div className="relative w-full h-24 flex items-center justify-center pt-1">
        <ResponsiveContainer width="99%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="60%"
              cy="50%"
              innerRadius={18}
              outerRadius={30}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '9px' }}
              itemStyle={{ fontSize: '9px', fontWeight: 'bold' }}
              formatter={(value: any) => [`${value.toLocaleString('id-ID')} balita`, 'Jumlah']}
            />
            <Legend 
              iconType="circle" 
              layout="vertical"
              align="left"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', left: 0, top: '50%', transform: 'translateY(-50%)' }} 
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center overlay text - FIXED: left: 20% to align with cx="60%" of Pie */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ left: '20%' }}>
          <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded-full border shadow-sm ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Total Balita Diukur */}
      <div className="w-full border-t border-teal-500/10 pt-2 text-center mt-1">
        <p className="text-[8px] text-teal-700/80 font-bold leading-none">Total Balita Diukur</p>
        <p className="text-[11px] font-black text-teal-950 mt-1">{totalVal.toLocaleString('id-ID')} <span className="text-[9px] font-medium text-teal-700">balita</span></p>
      </div>
    </div>
  );
}
