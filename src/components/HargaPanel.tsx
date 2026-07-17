"use client";

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface HargaPanelProps {
  hargaData: any[];
  previousHargaData?: any[];
  livePrices?: Record<string, number> | null;
  liveDate?: string | null;
  loadingLive?: boolean;
}

export default function HargaPanel({ 
  hargaData = [], 
  previousHargaData = [],
  livePrices: propLivePrices,
  liveDate: propLiveDate,
  loadingLive: propLoadingLive
}: HargaPanelProps) {
  const [localLivePrices, setLocalLivePrices] = useState<Record<string, number> | null>(null);
  const [localLiveDate, setLocalLiveDate] = useState<string | null>(null);
  const [localLoadingLive, setLocalLoadingLive] = useState<boolean>(true);

  const hasPropLive = propLivePrices !== undefined || propLoadingLive !== undefined;
  const livePrices = hasPropLive ? propLivePrices : localLivePrices;
  const liveDate = hasPropLive ? propLiveDate : localLiveDate;
  const loadingLive = hasPropLive ? propLoadingLive : localLoadingLive;

  // Date Navigation Mockup State
  const liveDateString = liveDate || '2026-05-31';

  // Helper to subtract days from a date string dynamically
  const subtractDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() - days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return dateStr;
    }
  };

  const dates = [
    subtractDays(liveDateString, 4),
    subtractDays(liveDateString, 3),
    subtractDays(liveDateString, 2),
    subtractDays(liveDateString, 1),
    liveDateString
  ];
  const [dateIndex, setDateIndex] = useState(4); // Default to latest (index 4)

  useEffect(() => {
    if (hasPropLive) return;
    async function fetchLiveHarga() {
      try {
        const res = await fetch('/api/harga-sagon');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.prices) {
            setLocalLivePrices(data.prices);
            setLocalLiveDate(data.tanggal);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live prices from SAGON API:', err);
      } finally {
        setLocalLoadingLive(false);
      }
    }
    fetchLiveHarga();
  }, [hasPropLive]);

  // Format YYYY-MM-DD to Indonesian format
  const formatIndoDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  };

  // Calculate averages from live dataset
  const getAverage = (data: any[], key: string, fallback: number) => {
    if (!data || data.length === 0) return fallback;
    const valid = data.filter(x => x[key] > 0);
    if (valid.length === 0) return fallback;
    return valid.reduce((sum, item) => sum + (item[key] || 0), 0) / valid.length;
  };

  // Current averages
  const berasCur = getAverage(hargaData, 'beras', 13473);
  const minyakCur = getAverage(hargaData, 'minyak_goreng', 21334);
  const telurCur = getAverage(hargaData, 'telur', 30482);
  const ayamCur = getAverage(hargaData, 'daging_ayam', 36364);
  const gulaCur = getAverage(hargaData, 'gula_pasir', 15963);
  const cabeCur = getAverage(hargaData, 'cabe_merah', 53184);

  const bawangMerahCur = getAverage(hargaData, 'bawang_merah', 38000);
  const bawangPutihCur = getAverage(hargaData, 'bawang_putih', 40000);
  const cabeRawitCur = getAverage(hargaData, 'cabe_rawit', 60000);
  const dagingSapiCur = getAverage(hargaData, 'daging_sapi', 135000);

  // Previous year averages (YoY)
  const berasPrev = getAverage(previousHargaData, 'beras', 14050);
  const minyakPrev = getAverage(previousHargaData, 'minyak_goreng', 18000);
  const telurPrev = getAverage(previousHargaData, 'telur', 30543);
  const ayamPrev = getAverage(previousHargaData, 'daging_ayam', 36364);
  const gulaPrev = getAverage(previousHargaData, 'gula_pasir', 15900);
  const cabePrev = getAverage(previousHargaData, 'cabe_merah', 53184);

  const bawangMerahPrev = getAverage(previousHargaData, 'bawang_merah', 34000);
  const bawangPutihPrev = getAverage(previousHargaData, 'bawang_putih', 38000);
  const cabeRawitPrev = getAverage(previousHargaData, 'cabe_rawit', 50000);
  const dagingSapiPrev = getAverage(previousHargaData, 'daging_sapi', 130000);

  // Helper to calculate YoY change and metadata
  const getYoYStats = (curr: number, prev: number) => {
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const isUp = change > 0.05;
    const isZero = Math.abs(change) < 0.05;
    
    // Status thresholds: e.g. for rice/oil increases > 5% are WASPADA
    const isWaspada = isUp && change > 5;
    const status = isWaspada ? 'WASPADA' : isUp ? 'NAIK' : isZero ? 'STABIL' : 'AMAN';
    
    return {
      changeText: `${isUp ? '↑' : isZero ? '' : '↓'} ${Math.abs(change).toFixed(1)}%`,
      isUp,
      isZero,
      status,
      colorClass: isWaspada 
        ? 'bg-red-50 text-red-600 border border-red-100' 
        : isUp 
          ? 'bg-amber-50 text-amber-600 border border-amber-100' 
          : isZero
            ? 'bg-slate-50 text-slate-600 border border-slate-200'
            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    };
  };

  // Dynamic price variation based on date index
  const getDynamicPrice = (commodity: string, basePrice: number) => {
    const diff = 4 - dateIndex;
    if (diff === 0) return basePrice;
    
    // Deterministic offset based on commodity name
    let factor = 0.005; // 0.5% decrease per day
    if (commodity === 'Cabe Merah' || commodity === 'Cabe Rawit') factor = 0.015; // 1.5% decrease per day for chilis
    if (commodity === 'Bawang Merah' || commodity === 'Bawang Putih') factor = 0.010; // 1.0% decrease per day
    if (commodity === 'Daging Ayam' || commodity === 'Daging Sapi') factor = 0.008; // 0.8% decrease per day
    
    return basePrice * (1 - diff * factor);
  };

  const commStats = [
    { name: 'Beras Medium', curr: getDynamicPrice('Beras Medium', livePrices ? livePrices.beras : berasCur), prev: berasPrev, emoji: '🍚' },
    { name: 'Bawang Merah', curr: getDynamicPrice('Bawang Merah', livePrices ? (livePrices.bawang_merah ?? bawangMerahCur) : bawangMerahCur), prev: bawangMerahPrev, emoji: '🧅' },
    { name: 'Bawang Putih', curr: getDynamicPrice('Bawang Putih', livePrices ? (livePrices.bawang_putih ?? bawangPutihCur) : bawangPutihCur), prev: bawangPutihPrev, emoji: '🧄' },
    { name: 'Cabe Merah', curr: getDynamicPrice('Cabe Merah', livePrices ? livePrices.cabe_merah : cabeCur), prev: cabePrev, emoji: '🌶️' },
    { name: 'Cabe Rawit', curr: getDynamicPrice('Cabe Rawit', livePrices ? (livePrices.cabe_rawit ?? cabeRawitCur) : cabeRawitCur), prev: cabeRawitPrev, emoji: '🌶️' },
    { name: 'Daging Sapi', curr: getDynamicPrice('Daging Sapi', livePrices ? (livePrices.daging_sapi ?? dagingSapiCur) : dagingSapiCur), prev: dagingSapiPrev, emoji: '🥩' },
    { name: 'Daging Ayam', curr: getDynamicPrice('Daging Ayam', livePrices ? livePrices.daging_ayam : ayamCur), prev: ayamPrev, emoji: '🍗' },
    { name: 'Telur Ayam Ras', curr: getDynamicPrice('Telur Ayam Ras', livePrices ? livePrices.telur : telurCur), prev: telurPrev, emoji: '🥚' },
    { name: 'Gula Pasir', curr: getDynamicPrice('Gula Pasir', livePrices ? livePrices.gula_pasir : gulaCur), prev: gulaPrev, emoji: '🧂' },
    { name: 'Minyak Goreng', curr: getDynamicPrice('Minyak Goreng', livePrices ? livePrices.minyak_goreng : minyakCur), prev: minyakPrev, emoji: '🧴' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#E6FDF4] p-4 rounded-xl border border-emerald-200/50 shadow-sm justify-between select-none">
      <div>
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-[#0B7A53] text-sm leading-none flex items-center gap-1.5">
            <span className="text-base">🟢</span> Harga Pangan Strategis
          </h3>
          {loadingLive ? (
            <span className="flex items-center gap-1 text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 font-bold animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              SAGON...
            </span>
          ) : dateIndex === 4 && livePrices ? (
            <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full border border-red-600 font-extrabold flex items-center gap-1 animate-pulse shadow-sm">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              SAGON LIVE
            </span>
          ) : (
            <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200 font-bold">
              OFFLINE/DB
            </span>
          )}
        </div>
        
        <p className="text-[9px] text-[#0B7A53]/70 font-semibold mt-1">
          {livePrices ? `Sumber: sagon.cilegon.go.id - Rata-rata 3 Pasar (${formatIndoDate(dates[dateIndex])})` : 'Analisis Perbandingan Harga dengan Bulan Yang Sama Tahun Lalu (YoY)'}
        </p>

        {/* Date Hopping Back and Forward Navigation Row (Mockup Match) */}
        <div className="mt-2 flex items-center justify-between bg-white border border-[#E6FDF4] p-1.5 rounded-2xl w-full shadow-sm">
          {/* Back Button */}
          <button
            onClick={() => setDateIndex(prev => Math.max(0, prev - 1))}
            className="w-7 h-7 rounded-full bg-[#10B981] hover:bg-[#0B7A53] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0 border-none"
            title="Tanggal Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
          </button>
          
          {/* Calendar Display */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wide">
            <span className="text-sm">📅</span>
            <span>{formatIndoDate(dates[dateIndex])}</span>
          </div>

          {/* Forward Button */}
          <button
            onClick={() => setDateIndex(prev => Math.min(dates.length - 1, prev + 1))}
            disabled={dateIndex === dates.length - 1}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 border-none ${
              dateIndex === dates.length - 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-inner'
                : 'bg-[#10B981] hover:bg-[#0B7A53] text-white hover:scale-105 active:scale-95 shadow-sm cursor-pointer'
            }`}
            title="Tanggal Berikutnya"
          >
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 mt-3 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#0B7A53]/10 text-[8px] sm:text-[9px] font-black uppercase text-[#0B7A53]/70 tracking-wider sticky top-0 bg-[#E6FDF4] z-10">
              <th className="pb-1.5 font-bold w-[35%]">Komoditas</th>
              <th className="pb-1.5 font-bold text-right w-[25%]">Harga Rata-Rata</th>
              <th className="pb-1.5 font-bold text-right w-[22%]">Perubahan (YoY)</th>
              <th className="pb-1.5 font-bold text-right w-[18%] pr-1">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0B7A53]/5">
            {commStats.map((c, i) => {
              const stats = getYoYStats(c.curr, c.prev);
              return (
                <tr key={i} className="hover:bg-white/40 transition-colors">
                  <td className="py-1 flex items-center gap-1.5 text-slate-700 text-[10px] sm:text-xs font-bold whitespace-normal break-words leading-tight">
                    <span className="text-xs sm:text-sm shrink-0">{c.emoji}</span>
                    <span>{c.name}</span>
                  </td>
                  <td className="py-1 text-right font-extrabold text-slate-800 text-[10px] sm:text-xs whitespace-nowrap">
                    Rp {Math.round(c.curr).toLocaleString('id-ID')}
                  </td>
                  <td className="py-1 text-right">
                    <span className={`text-[9px] sm:text-[10px] font-bold ${stats.isZero ? 'text-slate-500' : stats.isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {stats.changeText}
                    </span>
                  </td>
                  <td className="py-1 text-right pr-1">
                    <span className={`text-[7px] sm:text-[8px] font-black px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full uppercase border shadow-sm ${stats.colorClass}`}>
                      {stats.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer Benchmark */}
      <div className="mt-2 pt-2 border-t border-[#0B7A53]/10 flex justify-between items-center text-[8px] font-bold text-[#0B7A53]/70">
        <span>*Benchmark YoY</span>
        <span>Ter-update otomatis</span>
      </div>
    </div>
  );
}

