"use client";

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { TrendingUp, ShieldCheck, Activity, Info } from 'lucide-react';

export interface IkpPouDataPoint {
  year: string;
  ikp: number;
  pou: number;
  ikpKategori: string;
  pouKategori: string;
}

export const IKP_POU_5_YEARS_DATA: IkpPouDataPoint[] = [
  { year: '2021', ikp: 71.42, pou: 2.46, ikpKategori: 'Sangat Tahan', pouKategori: 'Terkendali Baik' },
  { year: '2022', ikp: 72.63, pou: 2.04, ikpKategori: 'Sangat Tahan', pouKategori: 'Terkendali Baik' },
  { year: '2023', ikp: 81.54, pou: 2.19, ikpKategori: 'Sangat Tahan', pouKategori: 'Terkendali Baik' },
  { year: '2024', ikp: 80.12, pou: 1.96, ikpKategori: 'Sangat Tahan', pouKategori: 'Terkendali Baik' },
  { year: '2025', ikp: 83.20, pou: 2.78, ikpKategori: 'Sangat Tahan', pouKategori: 'Terkendali Baik' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = IKP_POU_5_YEARS_DATA.find((d) => d.year === label);
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-slate-700/80 shadow-xl text-left text-[11px] min-w-[190px]">
        <div className="font-black text-slate-300 pb-1.5 border-b border-slate-800 flex items-center justify-between">
          <span>Tahun {label}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            Cilegon
          </span>
        </div>
        <div className="pt-2 space-y-1.5">
          {payload.map((entry, index) => {
            const isIkp = entry.dataKey === 'ikp';
            return (
              <div key={`item-${index}`} className="flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color }}>
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: entry.color }}
                    />
                    {isIkp ? 'IKP (Indeks)' : 'PoU (Prevalensi)'}
                  </span>
                  <span className="font-black text-white font-mono">
                    {isIkp
                      ? `${Number(entry.value).toFixed(2)} Poin`
                      : `${Number(entry.value).toFixed(2)}%`}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 pl-3.5">
                  {isIkp ? item?.ikpKategori : `Status: ${item?.pouKategori}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function MobileIkpPouChart() {
  const [activeMetric, setActiveMetric] = useState<'all' | 'ikp' | 'pou'>('all');
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const latestPoint = IKP_POU_5_YEARS_DATA[IKP_POU_5_YEARS_DATA.length - 1];

  return (
    <div className="bg-white/95 rounded-2xl border border-emerald-200/80 p-3 sm:p-3.5 shadow-xs space-y-2.5 text-left">
      {/* Header Segmen */}
      <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 leading-tight">
                IKP & POU KOTA CILEGON 5 TAHUN TERAKHIR
              </h4>
              <p className="text-[9px] text-slate-500 font-medium">
                Indeks Ketahanan Pangan & Prevalence of Undernourishment (2021-2025)
              </p>
            </div>
          </div>
        </div>

        {/* Metric Badges Quick Info */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* IKP Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-2 rounded-xl border border-emerald-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-tight flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                IKP 2025
              </span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white leading-none">
                Sangat Tahan
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-sm font-black text-emerald-950 font-mono">
                {latestPoint.ikp.toFixed(2)}
              </span>
              <span className="text-[8px] font-bold text-emerald-700">/ 100 Poin</span>
            </div>
          </div>

          {/* PoU Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 p-2 rounded-xl border border-amber-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-amber-800 uppercase tracking-tight flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-600" />
                PoU 2025
              </span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-600 text-white leading-none">
                Terkendali
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-sm font-black text-amber-950 font-mono">
                {latestPoint.pou.toFixed(2)}%
              </span>
              <span className="text-[8px] font-bold text-amber-700">Prevalensi</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher Filter: Semua, IKP, PoU */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[8.5px] font-bold text-slate-400">Tampilkan Garis:</span>
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[9px] font-black">
            <button
              type="button"
              onClick={() => setActiveMetric('all')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeMetric === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('ikp')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeMetric === 'ikp'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              IKP Saja
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('pou')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                activeMetric === 'pou'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PoU Saja
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Line Chart */}
      <div className="w-full h-48 sm:h-52 relative">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={IKP_POU_5_YEARS_DATA}
              margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }}
                dy={6}
              />
              
              {/* Left Y Axis for IKP */}
              {(activeMetric === 'all' || activeMetric === 'ikp') && (
                <YAxis
                  yAxisId="ikp"
                  axisLine={false}
                  tickLine={false}
                  domain={[65, 90]}
                  tick={{ fontSize: 9, fill: '#059669', fontWeight: 'bold' }}
                  orientation="left"
                  tickFormatter={(v) => `${v}`}
                />
              )}

              {/* Right Y Axis for PoU */}
              {(activeMetric === 'all' || activeMetric === 'pou') && (
                <YAxis
                  yAxisId="pou"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 4.5]}
                  tick={{ fontSize: 9, fill: '#D97706', fontWeight: 'bold' }}
                  orientation={activeMetric === 'pou' ? 'left' : 'right'}
                  tickFormatter={(v) => `${v}%`}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={20}
                iconType="circle"
                wrapperStyle={{ fontSize: '9.5px', fontWeight: 'bold', paddingTop: '4px' }}
              />

              {/* IKP Dynamic Animated Line */}
              {(activeMetric === 'all' || activeMetric === 'ikp') && (
                <Line
                  yAxisId="ikp"
                  type="monotone"
                  dataKey="ikp"
                  name="IKP (Skor Indeks)"
                  stroke="#059669"
                  strokeWidth={3}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  dot={{ r: 4, stroke: '#059669', strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 6, stroke: '#047857', strokeWidth: 2, fill: '#10B981' }}
                />
              )}

              {/* PoU Dynamic Animated Line */}
              {(activeMetric === 'all' || activeMetric === 'pou') && (
                <Line
                  yAxisId="pou"
                  type="monotone"
                  dataKey="pou"
                  name="PoU (Prevalensi %)"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  strokeDasharray={activeMetric === 'pou' ? undefined : '4 3'}
                  isAnimationActive={true}
                  animationDuration={1700}
                  animationEasing="ease-in-out"
                  dot={{ r: 3.5, stroke: '#D97706', strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 6, stroke: '#B45309', strokeWidth: 2, fill: '#F59E0B' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            Memuat grafik IKP & PoU...
          </div>
        )}
      </div>

      {/* Footer Insight Note */}
      <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 flex items-start gap-1.5 text-[9px] text-emerald-900 leading-tight">
        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Tren Positif:</strong> IKP Kota Cilegon konsisten menguat dari <strong>71,42</strong> (2021) ke <strong>83,20</strong> (2025), sejalan dengan prevalensi ketidakcukupan pangan (PoU) yang terjaga stabil di tingkat rendah.
        </span>
      </div>
    </div>
  );
}
