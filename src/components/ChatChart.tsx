"use client";

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, Table as TableIcon, Download, TrendingUp } from 'lucide-react';

export interface ChartSeries {
  key: string;
  label?: string;
  color?: string;
  strokeDasharray?: string;
  type?: 'monotone' | 'linear' | 'step';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  description?: string;
  xAxisKey: string;
  series: ChartSeries[];
  data: Record<string, any>[];
  showTrendline?: boolean;
}

const DEFAULT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];

// Menghitung garis tren linear (Least Squares Regression) otomatis jika dibutuhkan
function calculateLinearTrendline(data: Record<string, any>[], xKey: string, yKey: string) {
  const n = data.length;
  if (n < 2) return data;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  const validPoints = data.map((d, i) => {
    const yVal = typeof d[yKey] === 'number' ? d[yKey] : parseFloat(d[yKey]) || 0;
    return { x: i, y: yVal, original: d };
  });

  validPoints.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  return data.map((item, i) => {
    const rawTrend = slope * i + intercept;
    return {
      ...item,
      [`${yKey}_trend`]: Math.round(rawTrend * 100) / 100
    };
  });
}

export default function ChatChart({ config }: { config: ChartConfig }) {
  const [activeType, setActiveType] = useState<'line' | 'bar' | 'area' | 'pie'>(config.type || 'line');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Siapkan data dengan trendline jika ada atau dihitung otomatis
  const enrichedData = useMemo(() => {
    if (!config.data || config.data.length === 0) return [];
    
    // Cek apakah ada series trendline yang belum diisi nilainya
    const hasTrendSeries = config.series?.some(s => s.key.toLowerCase().includes('trend'));
    const primarySeries = config.series?.[0]?.key || 'value';

    if (config.showTrendline && !hasTrendSeries) {
      return calculateLinearTrendline(config.data, config.xAxisKey, primarySeries);
    }
    return config.data;
  }, [config]);

  // Siapkan series
  const finalSeries = useMemo(() => {
    const seriesList = [...(config.series || [])];
    if (config.showTrendline && !seriesList.some(s => s.key.toLowerCase().includes('trend'))) {
      const primary = seriesList[0]?.key || 'value';
      seriesList.push({
        key: `${primary}_trend`,
        label: `Tren (${seriesList[0]?.label || primary})`,
        color: '#F59E0B',
        strokeDasharray: '4 4'
      });
    }
    return seriesList;
  }, [config]);

  if (!config.data || config.data.length === 0) {
    return null;
  }

  const exportCSV = () => {
    if (!enrichedData.length) return;
    const keys = Object.keys(enrichedData[0]);
    const csvRows = [
      keys.join(','),
      ...enrichedData.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${(config.title || 'data_grafik').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Header Grafik */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-[12.5px] font-extrabold text-slate-800 tracking-tight">
              {config.title || 'Visualisasi Data Interaktif'}
            </h4>
          </div>
          {config.description && (
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 ml-3.5">
              {config.description}
            </p>
          )}
        </div>

        {/* Kontrol Mode Tampilan & Tipe Grafik */}
        <div className="flex items-center gap-1">
          {/* Tipe Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => { setActiveType('line'); setViewMode('chart'); }}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                activeType === 'line' && viewMode === 'chart' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grafik Garis (Line)"
            >
              <LineIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setActiveType('bar'); setViewMode('chart'); }}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                activeType === 'bar' && viewMode === 'chart' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grafik Batang (Bar)"
            >
              <BarChart3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setActiveType('area'); setViewMode('chart'); }}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                activeType === 'area' && viewMode === 'chart' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grafik Area"
            >
              <AreaIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Toggle Tabel */}
          <button
            onClick={() => setViewMode(v => v === 'chart' ? 'table' : 'chart')}
            className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
              viewMode === 'table'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Lihat Data Angka Tabel"
          >
            <TableIcon className="w-2.5 h-2.5" />
            <span>Tabel</span>
          </button>

          {/* Unduh CSV */}
          <button
            onClick={exportCSV}
            className="p-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs transition-colors cursor-pointer shadow-2xs"
            title="Unduh Data CSV"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Konten Grafik / Tabel */}
      <div className="p-3 bg-white">
        {viewMode === 'chart' ? (
          <div className="w-full h-60 sm:h-64 pt-1">
            <ResponsiveContainer width="99%" height="100%">
              {activeType === 'line' ? (
                <LineChart data={enrichedData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey={config.xAxisKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B', fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B' }}
                    tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 800, fontSize: '11.5px', marginBottom: '4px' }}
                    itemStyle={{ color: '#E2E8F0', fontSize: '11px', padding: '2px 0' }}
                    formatter={(val: any, name: any) => [
                      typeof val === 'number' ? val.toLocaleString('id-ID') : val,
                      name
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', paddingTop: '8px' }}
                  />
                  {finalSeries.map((s, idx) => (
                    <Line
                      key={s.key}
                      type={s.type || 'monotone'}
                      dataKey={s.key}
                      name={s.label || s.key}
                      stroke={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                      strokeWidth={s.strokeDasharray ? 2.5 : 3.5}
                      strokeDasharray={s.strokeDasharray}
                      dot={s.strokeDasharray ? false : { r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : activeType === 'bar' ? (
                <BarChart data={enrichedData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey={config.xAxisKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B', fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B' }}
                    tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 800, fontSize: '11.5px', marginBottom: '4px' }}
                    itemStyle={{ color: '#E2E8F0', fontSize: '11px', padding: '2px 0' }}
                    formatter={(val: any, name: any) => [
                      typeof val === 'number' ? val.toLocaleString('id-ID') : val,
                      name
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', paddingTop: '8px' }}
                  />
                  {finalSeries.map((s, idx) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label || s.key}
                      fill={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              ) : activeType === 'area' ? (
                <AreaChart data={enrichedData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <defs>
                    {finalSeries.map((s, idx) => {
                      const color = s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                      return (
                        <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey={config.xAxisKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B', fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10.5, fill: '#64748B' }}
                    tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 800, fontSize: '11.5px', marginBottom: '4px' }}
                    itemStyle={{ color: '#E2E8F0', fontSize: '11px', padding: '2px 0' }}
                    formatter={(val: any, name: any) => [
                      typeof val === 'number' ? val.toLocaleString('id-ID') : val,
                      name
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', paddingTop: '8px' }}
                  />
                  {finalSeries.map((s, idx) => {
                    const color = s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                    return (
                      <Area
                        key={s.key}
                        type={s.type || 'monotone'}
                        dataKey={s.key}
                        name={s.label || s.key}
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#grad-${s.key})`}
                      />
                    );
                  })}
                </AreaChart>
              ) : (
                /* Pie Chart */
                <PieChart>
                  <Pie
                    data={enrichedData}
                    dataKey={finalSeries[0]?.key || 'value'}
                    nameKey={config.xAxisKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry[config.xAxisKey] ?? entry.name ?? ''}: ${entry[finalSeries[0]?.key || 'value'] ?? entry.value ?? ''}`}
                  >
                    {enrichedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto max-h-60 custom-scrollbar rounded-lg border border-slate-200">
            <table className="min-w-full text-[11.5px] text-left border-collapse bg-white">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="px-3 py-2 border-b border-slate-200">{config.xAxisKey}</th>
                  {finalSeries.map((s, idx) => (
                    <th key={idx} className="px-3 py-2 border-b border-slate-200 text-right">
                      {s.label || s.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {enrichedData.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60 hover:bg-emerald-50/50'}>
                    <td className="px-3 py-1.5 font-bold text-slate-900">{row[config.xAxisKey]}</td>
                    {finalSeries.map((s, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-right font-mono text-slate-800">
                        {typeof row[s.key] === 'number' ? row[s.key].toLocaleString('id-ID') : (row[s.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-1.5 bg-emerald-50/60 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span>Grafik Interaktif Recharts · Visualisasi Otomatis AI</span>
        </div>
        <span className="text-[9px] text-emerald-600 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
          DKPP Kota Cilegon
        </span>
      </div>
    </div>
  );
}
