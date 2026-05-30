"use client";

import { useState, useRef } from 'react';
import { BENCHMARKS, BenchmarkIndicator } from '@/lib/benchmark';
import { 
  Award, CheckCircle2, AlertCircle, HelpCircle, 
  ChevronLeft, ChevronRight, TrendingUp, BarChart3, Sparkles
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, ReferenceLine 
} from 'recharts';

interface BenchmarkPanelProps {
  currentData?: Record<number, number>; // Maps indicator number to current value (2025/2026)
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
  no: number;
}

// Mockup-aligned Custom Tooltip
const CustomTooltip = ({ active, payload, label, unit, no }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const capaian = payload.find(p => p.name === 'Capaian Cilegon' || p.dataKey === 'Capaian Cilegon')?.value;
    const targetVal = payload.find(p => p.name === 'Target Nasional' || p.dataKey === 'Target Nasional')?.value;
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
              <span className="text-slate-500">Target Nasional:</span>
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

// Helper to generate dynamic, premium bullet insights matching mockup style
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
  
  // Bullet 1: Comparison to Target
  if (target !== null) {
    if (item.no === 9) {
      const avgCv = (values.reduce((s, x) => s + x, 0) / values.length).toFixed(2);
      bullets.push(`Cilegon **selalu menjaga stabilitas harga** di bawah target nasional (< ${target}%), dengan rata-rata indeks variasi sekitar **${avgCv}%**.`);
    } else if (item.no === 1) {
      bullets.push(`Cilegon **selalu melampaui** target nasional (80 poin) di seluruh periode, dengan surplus rata-rata sekitar **+8-10 poin**.`);
    } else {
      const pctDev = Math.abs(dev).toFixed(1);
      if (isPassed) {
        bullets.push(`Capaian Cilegon secara konsisten **melampaui target nasional** (${target} ${unit}) dengan surplus sebesar **+${pctDev} ${unit}** pada tahun terbaru.`);
      } else {
        bullets.push(`Capaian berada dekat dengan target nasional (${target} ${unit}), hanya terpaut **-${pctDev} ${unit}** dari pemenuhan standar penuh.`);
      }
    }
  } else {
    bullets.push(`Tren volume menunjukkan aktivitas **pemantauan pangan yang aktif** dengan capaian rata-rata sebesar **${(values.reduce((s, x) => s + x, 0) / values.length).toFixed(1)} ${unit}**.`);
  }
  
  // Bullet 2: Max/Min details
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
  
  // Bullet 3: Stabilisation
  if (item.no === 1) {
    bullets.push(`Tren **menstabilkan** di ${latest.toFixed(1)} pada 2024-2025, menandakan capaian yang sudah matang.`);
  } else {
    if (isPassed) {
      bullets.push(`Pada periode terbaru (2024-2025), angka stabil di **${latest.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}**, mengukuhkan posisi Cilegon dalam kategori **${target !== null ? 'Sangat Aman & Kondusif' : 'Optimal'}**.`);
    } else {
      bullets.push(`Diperlukan akselerasi intervensi lokal pada periode mendatang agar target nasional **${target} ${unit}** dapat segera terpenuhi secara merata.`);
    }
  }
  
  return bullets;
}

export default function BenchmarkPanel({ currentData = {} }: BenchmarkPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const activeIndicator = BENCHMARKS[currentIndex];
  
  // Get active indicator values
  const currentVal = currentData[activeIndicator.no] !== undefined 
    ? currentData[activeIndicator.no] 
    : (activeIndicator.no === 8 ? 132.7 : activeIndicator.history['2024']);
  
  const target = activeIndicator.no === 1 ? 80 : (typeof activeIndicator.nationalStandard === 'number' ? activeIndicator.nationalStandard : (typeof activeIndicator.nationalStandard === 'string' ? parseFloat(activeIndicator.nationalStandard.replace(/[^\d.]/g, '')) : null));
  const unit = activeIndicator.unit;

  // Chart Data compilation (2021 to 2025)
  const chartData = [
    { name: '2021', 'Capaian Cilegon': activeIndicator.history['2021'], 'Target Nasional': target },
    { name: '2022', 'Capaian Cilegon': activeIndicator.history['2022'], 'Target Nasional': target },
    { name: '2023', 'Capaian Cilegon': activeIndicator.history['2023'], 'Target Nasional': target },
    { name: '2024', 'Capaian Cilegon': activeIndicator.history['2024'], 'Target Nasional': target },
    { name: '2025', 'Capaian Cilegon': currentVal, 'Target Nasional': target },
  ];

  // Dynamic Y-Axis Domain calculation to fit chart snugly
  const values = chartData.map(d => d['Capaian Cilegon']);
  const minVal = Math.min(...values, target !== null ? target : 9999);
  const maxVal = Math.max(...values, target !== null ? target : -9999);
  const padding = (maxVal - minVal) * 0.15 || 5;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  let isPassed = false;
  if (target !== null) {
    if (activeIndicator.no === 9 || activeIndicator.indicator.toLowerCase().includes('stunting') || activeIndicator.indicator.toLowerCase().includes('undernourishment')) {
      isPassed = currentVal <= target;
    } else {
      isPassed = currentVal >= target;
    }
  } else {
    isPassed = true;
  }

  const devVal = target !== null ? currentVal - target : 0;
  const devText = target !== null 
    ? `${devVal >= 0 ? '+' : ''}${devVal.toFixed(1)} ${unit} (${devVal >= 0 ? 'Surplus' : 'Defisit'})` 
    : 'N/A';

  const insights = getBenchmarkInsights(activeIndicator, chartData, currentVal);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? BENCHMARKS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === BENCHMARKS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="dashboard-card border-none shadow-xl bg-white rounded-2xl p-6 md:p-8 space-y-6">
      
      {/* Title & Carousel Selector Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Benchmark Capaian Kota Cilegon & Standar Nasional
          </h2>
          <p className="text-xs text-slate-500 mt-1">Evaluasi visual data historis (2021-2025) perbandingan daerah terhadap standar baku nasional.</p>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-slate-900 active:scale-95 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-black text-slate-700 bg-slate-100/80 px-3.5 py-2 rounded-lg">
            {currentIndex + 1} / {BENCHMARKS.length}
          </span>

          <button 
            onClick={handleNext}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-slate-900 active:scale-95 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Indicator Select Grid Bar with Scroll Chevrons */}
      <div className="relative flex items-center border-b border-slate-50 -mx-6 px-10">
        {/* Left Scroll Chevron */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 z-10 p-1.5 rounded-full bg-white/90 border border-slate-200 shadow-md text-slate-600 hover:text-slate-900 transition-all hover:bg-slate-50 active:scale-90"
          title="Scroll Kiri"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
        >
          <div className="flex flex-nowrap gap-1.5">
            {BENCHMARKS.map((item, idx) => (
              <button
                key={item.no}
                onClick={() => setCurrentIndex(idx)}
                className={`px-3 py-2 text-[11px] font-black rounded-lg transition-all whitespace-nowrap border capitalize cursor-pointer ${
                  currentIndex === idx
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.no}. {item.indicator.replace('Pencapaian ', '').replace('Persentase ', '').replace('Tingkat ', '').replace('Jumlah ', '').substring(0, 20)}...
              </button>
            ))}
          </div>
        </div>

        {/* Right Scroll Chevron */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 z-10 p-1.5 rounded-full bg-white/90 border border-slate-200 shadow-md text-slate-600 hover:text-slate-900 transition-all hover:bg-slate-50 active:scale-90"
          title="Scroll Kanan"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide Content Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Mockup Composed Line & Area Chart (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 relative">
            
            {/* Chart Title Label */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm leading-snug">
                  {activeIndicator.indicator}
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Kota Cilegon vs. Target Nasional • 2021-2025
                </p>
              </div>
            </div>

            {/* Custom Interactive Recharts Chart Container */}
            <div className="w-full h-72">
              <ResponsiveContainer width="99%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="deficitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
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
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} 
                    domain={[yMin, yMax]}
                    unit={` ${unit}`}
                  />
                  
                  <Tooltip 
                    content={<CustomTooltip unit={unit} no={activeIndicator.no} />}
                  />

                  {/* Shaded Area for Surplus relative to baseline target */}
                  <Area 
                    type="monotone" 
                    dataKey="Capaian Cilegon" 
                    stroke="none" 
                    fill="url(#surplusGrad)" 
                    baseValue={target !== null ? target : 0} 
                  />

                  {/* Standard reference target line */}
                  {target !== null && (
                    <ReferenceLine 
                      y={target} 
                      stroke="#F97316" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4" 
                      label={{ 
                        value: `Target (${target} ${unit})`, 
                        position: 'top', 
                        fill: '#D97706', 
                        fontSize: 10,
                        fontWeight: 'bold'
                      }} 
                    />
                  )}

                  {/* Rich CAPAIAN line */}
                  <Line 
                    type="monotone" 
                    dataKey="Capaian Cilegon" 
                    name="Capaian Cilegon"
                    stroke="#10B981" 
                    strokeWidth={4} 
                    dot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#10B981' }} 
                    activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 3 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Custom chart legend aligned to mockup */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-4 border-t border-slate-100 pt-3 text-[11px] font-black text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-5 h-1.5 bg-[#10B981] rounded-full inline-block"></span>
                <span>Capaian {activeIndicator.indicator.includes('PPH') ? 'PPH ' : ''}Cilegon</span>
              </div>
              {target !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-5 border-t border-dashed border-[#F97316] inline-block"></span>
                  <span>Target Nasional ({target} {unit})</span>
                </div>
              )}
              {target !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#10B981]/15 rounded-sm inline-block"></span>
                  <span>Surplus terhadap target</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Mockup Styled Executive Insights (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            
            {/* Stat 1: National Target */}
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Standar Target</span>
              <span className="text-sm font-black text-slate-700 block mt-1">
                {target !== null ? `${target} ${unit}` : '-'}
              </span>
            </div>

            {/* Stat 2: Realtime Capaian */}
            <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-center">
              <span className="text-[10px] font-bold text-blue-500 block uppercase">Capaian Kini</span>
              <span className="text-sm font-black text-blue-900 block mt-1">
                {currentVal.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {unit}
              </span>
            </div>

            {/* Stat 3: Status Box */}
            <div className={`p-3 rounded-xl border text-center flex flex-col justify-center items-center ${
              isPassed 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50/50 border-amber-100 text-amber-800'
            }`}>
              <span className="text-[10px] font-bold block uppercase opacity-80">Status Capaian</span>
              <span className="text-xs font-black flex items-center gap-1 mt-1 justify-center">
                {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {isPassed ? 'Tercapai' : 'Belum'}
              </span>
            </div>
          </div>

          {/* Deviasi/Surplus Alert Panel */}
          {target !== null && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              isPassed 
                ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' 
                : 'bg-amber-50/30 border-amber-100/50 text-amber-900'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPassed ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold block text-slate-400 uppercase">Akurasi & Deviasi</span>
                <span className="text-xs font-black">{devText}</span>
              </div>
            </div>
          )}

          {/* Bulleted Insights Styled Exactly like Mockup */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Catatan Analitis Capaian Daerah:
            </h4>

            <div className="space-y-3 pl-1">
              {insights.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                  <p 
                    className="text-xs text-slate-600 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{
                      __html: bullet
                        .replace(/\*\*(.*?)\*\*/g, '<b class="font-extrabold text-slate-800">$1</b>')
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
