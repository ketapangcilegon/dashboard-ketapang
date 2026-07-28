"use client";

import { useState, useEffect } from 'react';
import { BENCHMARKS, BenchmarkIndicator } from '@/lib/benchmark';
import { Lightbulb, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, ReferenceLine, LabelList
} from 'recharts';

interface BenchmarkPanelProps {
  currentData?: Record<number, number>; // Maps indicator number to current value (2025/2026)
  dbBenchmarkList?: any[]; // Array of database benchmark rows
}

const SHORT_LABELS: Record<number, string> = {
  9: 'CV BERAS MEDIUM',
  1: 'PPH',
  4: 'KONSUMSI PROTEIN',
  3: 'KONSUMSI ENERGI',
  6: 'KETERSEDIAAN ENERGI',
  7: 'KETERSEDIAAN PROTEIN',
  8: 'CPPD',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
  no: number;
}

const CustomTooltip = ({ active, payload, label, unit, no }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const capaian = payload.find(p => p.name === 'Capaian Cilegon' || p.dataKey === 'Capaian Cilegon')?.value;
    const targetVal = payload.find(p => p.name === 'Target Nasional' || p.dataKey === 'Target Nasional' || p.name === 'Target RPJMD' || p.dataKey === 'Target RPJMD')?.value;
    const target = no === 1 ? 80 : targetVal;
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden text-xs min-w-[200px] font-sans">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 font-bold text-slate-700">
          Tahun {label}
        </div>
        <div className="p-3 space-y-2 font-medium">
          {capaian !== undefined && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                <span className="text-slate-500">Capaian Cilegon:</span>
                <span className="font-extrabold text-slate-800 ml-auto">
                  {capaian.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {unit}
                </span>
              </div>
              {target !== null && target !== undefined && (
                <div className="text-[10px] text-slate-400 font-bold pl-5">
                  ({capaian >= target ? '+' : ''}{(capaian - target).toFixed(1)} {unit} dari target)
                </div>
              )}
            </div>
          )}
          {target !== null && target !== undefined && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
              <span className="w-3 h-3 border border-dashed border-orange-500 rounded-sm bg-orange-50"></span>
              <span className="text-slate-500">{no === 8 ? 'Target RPJMD:' : 'Target Nasional:'}</span>
              <span className="font-extrabold text-slate-800 ml-auto">
                {target.toLocaleString('id-ID')} {unit}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

function getBenchmarkInsights(item: BenchmarkIndicator, data: any[], currentVal: number) {
  const target = item.no === 1 ? 80 : (typeof item.nationalStandard === 'number' ? item.nationalStandard : (typeof item.nationalStandard === 'string' ? parseFloat(item.nationalStandard.replace(/[^\d.]/g, '')) : null));
  const unit = item.unit;
  const values = data.map(d => d['Capaian Cilegon']);
  
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const maxYear = data.find(d => d['Capaian Cilegon'] === maxVal)?.name || '2025';
  const minYear = data.find(d => d['Capaian Cilegon'] === minVal)?.name || '2022';
  
  const latest = currentVal;
  const dev = target !== null ? latest - target : 0;
  
  let isPassed = false;
  if (target !== null) {
    if (item.no === 9 || item.indicator.toLowerCase().includes('stunting') || item.indicator.toLowerCase().includes('undernourishment')) {
      isPassed = latest <= target;
    } else {
      isPassed = latest >= target;
    }
  } else {
    isPassed = true;
  }
  
  const bullets: string[] = [];
  
  if (target !== null) {
    if (item.no === 9) {
      const avgCv = (values.reduce((s, x) => s + x, 0) / values.length).toFixed(2);
      bullets.push(`Cilegon **selalu menjaga stabilitas harga** di bawah target nasional (< ${target}%), dengan rata-rata indeks variasi sekitar **${avgCv}%**.`);
    } else if (item.no === 1) {
      bullets.push(`Cilegon **selalu melampaui** target nasional (80 poin) di seluruh periode, dengan surplus rata-rata sekitar **+8-10 poin**.`);
    } else {
      const pctDev = Math.abs(dev).toFixed(1);
      const targetLabel = item.no === 8 ? 'Target RPJMD' : 'target nasional';
      if (isPassed) {
        bullets.push(`Capaian Cilegon secara konsisten **melampaui ${targetLabel}** (${target} ${unit}) dengan surplus sebesar **+${pctDev} ${unit}** pada tahun terbaru.`);
      } else {
        bullets.push(`Capaian berada dekat dengan ${targetLabel} (${target} ${unit}), hanya terpaut **-${pctDev} ${unit}** dari pemenuhan standar penuh.`);
      }
    }
  } else {
    bullets.push(`Tren volume menunjukkan aktivitas **pemantauan pangan yang aktif** dengan capaian rata-rata sebesar **${(values.reduce((s, x) => s + x, 0) / values.length).toFixed(1)} ${unit}**.`);
  }
  
  if (maxVal === minVal) {
    bullets.push(`Pencapaian stabil dan konstan pada level **${maxVal} ${unit}** sepanjang rentang tahun pengamatan.`);
  } else {
    if (item.no === 1) {
      bullets.push(`Ada **sedikit penurunan** di 2022 (${minVal.toFixed(1)}) sebelum kembali naik signifikan ke ${data.find(d => d.name === '2023')['Capaian Cilegon'].toFixed(1)} di 2023.`);
    } else {
      const word = (item.no === 9 || item.indicator.toLowerCase().includes('stunting') || item.indicator.toLowerCase().includes('undernourishment')) ? 'terbaik (terendah)' : 'tertinggi';
      bullets.push(`Pencapaian ${word} tercatat pada tahun **${maxYear}** sebesar **${maxVal.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}**, sedangkan titik fluktuasi berada di tahun ${minYear} (${minVal.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}).`);
    }
  }
  
  if (item.no === 1) {
    bullets.push(`Tren **menstabilkan** di ${latest.toFixed(1)} pada 2024-2025, menandakan capaian yang sudah matang.`);
  } else {
    const targetLabel = item.no === 8 ? 'Target RPJMD' : 'target nasional';
    if (isPassed) {
      bullets.push(`Pada periode terbaru (2024-2025), angka stabil di **${latest.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}**, mengukuhkan posisi Cilegon dalam kategori **${target !== null ? 'Sangat Aman & Kondusif' : 'Optimal'}**.`);
    } else {
      bullets.push(`Diperlukan akselerasi intervensi lokal pada periode mendatang agar ${targetLabel} **${target} ${unit}** dapat segera terpenuhi secara merata.`);
    }
  }
  
  return bullets;
}

export default function BenchmarkPanel({ currentData = {}, dbBenchmarkList = [] }: BenchmarkPanelProps) {
  const [activeNo, setActiveNo] = useState<number>(9); // Default to CV Beras Medium (no 9)
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeIndicator = BENCHMARKS.find(b => b.no === activeNo) || BENCHMARKS[0];

  const getHistoricalVal = (year: string, indicatorNo: number, hardcodedFallback: number) => {
    if (dbBenchmarkList && dbBenchmarkList.length > 0) {
      const yearNum = parseInt(year);
      const row = dbBenchmarkList.find(x => x.tahun === yearNum);
      if (row) {
        switch (indicatorNo) {
          case 1: return row.pph !== null && row.pph !== undefined ? parseFloat(row.pph) : hardcodedFallback;
          case 3: return row.konsumsi_energi !== null && row.konsumsi_energi !== undefined ? parseFloat(row.konsumsi_energi) : hardcodedFallback;
          case 4: return row.konsumsi_protein !== null && row.konsumsi_protein !== undefined ? parseFloat(row.konsumsi_protein) : hardcodedFallback;
          case 6: return row.ketersediaan_energi !== null && row.ketersediaan_energi !== undefined ? parseFloat(row.ketersediaan_energi) : hardcodedFallback;
          case 7: return row.ketersediaan_protein !== null && row.ketersediaan_protein !== undefined ? parseFloat(row.ketersediaan_protein) : hardcodedFallback;
          case 8: return row.cadangan_pangan !== null && row.cadangan_pangan !== undefined ? parseFloat(row.cadangan_pangan) : hardcodedFallback;
          case 9: return row.cv_beras !== null && row.cv_beras !== undefined ? parseFloat(row.cv_beras) : hardcodedFallback;
        }
      }
    }
    return hardcodedFallback;
  };

  const currentVal = currentData[activeIndicator.no] !== undefined 
    ? currentData[activeIndicator.no] 
    : (activeIndicator.no === 8 ? 174 : activeIndicator.history['2024']);
  
  const target = activeIndicator.no === 1 ? 80 : (typeof activeIndicator.nationalStandard === 'number' ? activeIndicator.nationalStandard : (typeof activeIndicator.nationalStandard === 'string' ? parseFloat(activeIndicator.nationalStandard.replace(/[^\d.]/g, '')) : null));
  const unit = activeIndicator.unit;
  const displayUnit = (isMobile && (activeIndicator.no === 3 || activeIndicator.no === 6))
    ? 'kkal/kap/hr'
    : unit;

  const targetKey = activeIndicator.no === 8 ? 'Target RPJMD' : 'Target Nasional';

  const chartData = [
    { name: '2021', 'Capaian Cilegon': getHistoricalVal('2021', activeIndicator.no, activeIndicator.history['2021']), [targetKey]: target },
    { name: '2022', 'Capaian Cilegon': getHistoricalVal('2022', activeIndicator.no, activeIndicator.history['2022']), [targetKey]: target },
    { name: '2023', 'Capaian Cilegon': getHistoricalVal('2023', activeIndicator.no, activeIndicator.history['2023']), [targetKey]: target },
    { name: '2024', 'Capaian Cilegon': getHistoricalVal('2024', activeIndicator.no, activeIndicator.history['2024']), [targetKey]: target },
    { name: '2025', 'Capaian Cilegon': getHistoricalVal('2025', activeIndicator.no, currentVal), [targetKey]: target },
  ];

  const values = chartData.map(d => d['Capaian Cilegon']);
  const minVal = Math.min(...values, target !== null ? target : 9999);
  const maxVal = Math.max(...values, target !== null ? target : -9999);
  const padding = (maxVal - minVal) * 0.15 || 5;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  const insights = getBenchmarkInsights(activeIndicator, chartData, currentVal);

  const handleDownloadXlsx = () => {
    const keyName = activeIndicator.no === 8 ? 'Target RPJMD' : 'Target Nasional';
    const headers = [["Tahun", `Capaian Cilegon (${activeIndicator.unit})`, `${keyName} (${activeIndicator.unit})`]];
    const rows = chartData.map(d => [
      d.name,
      d['Capaian Cilegon'],
      d[keyName] ?? "N/A"
    ]);
    const data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Benchmark Detail");
    XLSX.writeFile(wb, `Benchmark_${activeIndicator.indicator.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="dashboard-card border border-[#E9E4D5] shadow-md bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] rounded-2xl p-4 sm:p-6 md:p-8 space-y-6">
      
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between border-b border-slate-200/60 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-emerald-600 rounded-full shrink-0"></div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            CAPAIAN INDIKATOR KETAHANAN PANGAN CILEGON & NASIONAL
          </h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="p-1.5 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-700 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          title="Lihat Catatan Analisis Capaian"
        >
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Catatan Analisis</span>
        </button>
      </div>

      {/* Premium Menu Grid Box (Capture 4 & 5 Style) */}
      <div className="bg-[#1E3A34] p-2.5 sm:p-4 rounded-2xl border border-emerald-700/50 shadow-lg space-y-2">
        {/* Top Row: 4 Buttons */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[9, 1, 4, 3].map((no) => {
            const isSelected = activeNo === no;
            return (
              <button
                key={no}
                onClick={() => setActiveNo(no)}
                className={`py-2 px-1 rounded-xl text-[9px] min-[380px]:text-[10.5px] sm:text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center text-center shadow-sm active:scale-95 cursor-pointer leading-tight min-h-[44px] ${
                  isSelected
                    ? 'bg-emerald-500 text-white border-2 border-emerald-300 ring-2 ring-emerald-400/40 shadow-emerald-600/30'
                    : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-100 border border-emerald-700/50'
                }`}
              >
                <span>{SHORT_LABELS[no]}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Row: 3 Buttons */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[6, 7, 8].map((no) => {
            const isSelected = activeNo === no;
            return (
              <button
                key={no}
                onClick={() => setActiveNo(no)}
                className={`py-2 px-1 rounded-xl text-[9px] min-[380px]:text-[10.5px] sm:text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center text-center shadow-sm active:scale-95 cursor-pointer leading-tight min-h-[44px] ${
                  isSelected
                    ? 'bg-emerald-500 text-white border-2 border-emerald-300 ring-2 ring-emerald-400/40 shadow-emerald-600/30'
                    : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-100 border border-emerald-700/50'
                }`}
              >
                <span>{SHORT_LABELS[no]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-slate-50/70 p-4 md:p-6 rounded-2xl border border-slate-200/60 space-y-4">
        
        {/* Chart Header + Lightbulb Button */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-snug">
              {activeIndicator.indicator}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">
              Kota Cilegon vs. {activeIndicator.no === 8 ? 'Target RPJMD' : 'Target Nasional'} • 2021-2025
            </p>
          </div>

          <button 
            onClick={() => setShowModal(!showModal)}
            className="p-1.5 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-700 font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
            title="Lihat Catatan Analisis"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-xs">Catatan</span>
          </button>
        </div>

        {/* Capture 1 Inline Light Cream Card Box for Analysis Note */}
        {showModal && (
          <div className="bg-[#FFFDF5] border border-[#FDE68A] p-4 rounded-2xl shadow-sm text-xs text-slate-700 font-medium leading-relaxed space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/50">
              <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase">
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                <span>Catatan Analisis Capaian Daerah</span>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100/60 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {insights.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <p 
                    className="text-[11.5px] text-slate-700 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{
                      __html: bullet.replace(/\*\*(.*?)\*\*/g, '<b class="font-extrabold text-slate-900">$1</b>')
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recharts Chart */}
        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="99%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} 
                dy={8} 
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: isMobile ? 9 : 11, fill: '#64748B', fontWeight: 'bold' }} 
                domain={[yMin, yMax]}
                unit={` ${displayUnit}`}
              />
              
              <Tooltip 
                content={<CustomTooltip unit={displayUnit} no={activeIndicator.no} />}
              />

              <Area 
                type="monotone" 
                dataKey="Capaian Cilegon" 
                stroke="none" 
                fill="url(#surplusGrad)" 
                baseValue={target !== null ? target : 0} 
              />

              {target !== null && (
                <ReferenceLine 
                  y={target} 
                  stroke="#F97316" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4" 
                  label={{ 
                    value: `${activeIndicator.no === 8 ? 'Target RPJMD' : 'Target'} (${target} ${displayUnit})`, 
                    position: 'top', 
                    fill: '#D97706', 
                    fontSize: isMobile ? 8.5 : 10,
                    fontWeight: 'bold'
                  }} 
                />
              )}

              <Line 
                type="monotone" 
                dataKey="Capaian Cilegon" 
                name="Capaian Cilegon"
                stroke="#10B981" 
                strokeWidth={4} 
                dot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#10B981' }} 
                activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 3 }} 
              >
                <LabelList dataKey="Capaian Cilegon" position="top" style={{ fontSize: '8.5px', fill: '#059669', fontWeight: 'bold' }} offset={10} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend + Download Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/60 pt-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-black text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-5 h-1.5 bg-[#10B981] rounded-full inline-block"></span>
              <span>Capaian Cilegon</span>
            </div>
            {target !== null && (
              <div className="flex items-center gap-2">
                <span className="w-5 border-t border-dashed border-[#F97316] inline-block"></span>
                <span>{activeIndicator.no === 8 ? 'Target RPJMD' : 'Target Nasional'} ({target} {displayUnit})</span>
              </div>
            )}
          </div>

          <button
            onClick={handleDownloadXlsx}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 border border-emerald-200"
          >
            <Download className="w-3.5 h-3.5" />
            Download xlsx
          </button>
        </div>
      </div>

      {/* Desktop Only Static Analysis Notes */}
      <div className="hidden sm:block space-y-3 pt-2">
        <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400" />
          Catatan Analitis Capaian Daerah:
        </h4>

        <div className="space-y-2 pl-2">
          {insights.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></div>
              <p 
                className="text-xs text-slate-600 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{
                  __html: bullet.replace(/\*\*(.*?)\*\*/g, '<b class="font-extrabold text-slate-800">$1</b>')
                }}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
