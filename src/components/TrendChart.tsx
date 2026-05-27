"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

interface TrendChartProps {
  trendData: any[];
}

export default function TrendChart({ trendData = [] }: TrendChartProps) {
  
  const defaultData = [
    { name: 'Des', nbm: 85, pph: 80, skpg: 75, fsva: 70 },
    { name: 'Jan', nbm: 88, pph: 82, skpg: 72, fsva: 75 },
    { name: 'Feb', nbm: 86, pph: 85, skpg: 78, fsva: 73 },
    { name: 'Mar', nbm: 90, pph: 84, skpg: 82, fsva: 80 },
    { name: 'Apr', nbm: 92, pph: 86, skpg: 85, fsva: 83 },
    { name: 'Mei', nbm: 94.2, pph: 88.1, skpg: 87, fsva: 85 },
  ];

  const chartData = trendData.length > 0 ? trendData : defaultData;

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <h3 className="font-bold text-slate-800 text-sm mb-4">Tren Skor Ketahanan Pangan</h3>
      
      <div className="flex-1 w-full mt-2 h-64">
        <ResponsiveContainer width="99%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#0B1E41', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500', color: '#64748B', paddingTop: '20px' }} />
            
            <Line type="monotone" dataKey="nbm" name="NBM" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="pph" name="PPH" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="skpg" name="SKPG" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="fsva" name="FSVA" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
