"use client";

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Loader2 } from 'lucide-react';

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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
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
  const ayamCur = getAverage(hargaData, 'daging_ayam', 36364); // Chicken price
  const gulaCur = getAverage(hargaData, 'gula_pasir', 15963); // Sugar price
  const cabeCur = getAverage(hargaData, 'cabe_merah', 53184); // Chili price

  // Previous year averages (YoY)
  const berasPrev = getAverage(previousHargaData, 'beras', 14050);
  const minyakPrev = getAverage(previousHargaData, 'minyak_goreng', 18000);
  const telurPrev = getAverage(previousHargaData, 'telur', 30543);
  const ayamPrev = getAverage(previousHargaData, 'daging_ayam', 36364);
  const gulaPrev = getAverage(previousHargaData, 'gula_pasir', 15900);
  const cabePrev = getAverage(previousHargaData, 'cabe_merah', 53184);

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

  const commStats = [
    { name: 'Beras Medium', curr: livePrices ? livePrices.beras : berasCur, prev: berasPrev, emoji: '🍚' },
    { name: 'Minyak Goreng', curr: livePrices ? livePrices.minyak_goreng : minyakCur, prev: minyakPrev, emoji: '🧴' },
    { name: 'Telur Ayam Ras', curr: livePrices ? livePrices.telur : telurCur, prev: telurPrev, emoji: '🥚' },
    { name: 'Daging Ayam', curr: livePrices ? livePrices.daging_ayam : ayamCur, prev: ayamPrev, emoji: '🍗' },
    { name: 'Gula Pasir', curr: livePrices ? livePrices.gula_pasir : gulaCur, prev: gulaPrev, emoji: '🧂' },
    { name: 'Cabe Merah', curr: livePrices ? livePrices.cabe_merah : cabeCur, prev: cabePrev, emoji: '🌶️' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#E6FDF4] p-4 rounded-xl border border-emerald-200/50 shadow-sm justify-between">
      <div>
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-[#0B7A53] text-sm leading-none flex items-center gap-1.5">
            <span className="text-base">🟢</span> 1. Harga Pangan Strategis
          </h3>
          {loadingLive ? (
            <span className="flex items-center gap-1 text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 font-bold animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              SAGON...
            </span>
          ) : livePrices ? (
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
          {livePrices ? `Sumber: sagon.cilegon.go.id - Rata-rata 3 Pasar (${formatIndoDate(liveDate)})` : 'Analisis Perbandingan Harga dengan Bulan Yang Sama Tahun Lalu (YoY)'}
        </p>
      </div>
      
      {/* Table */}
      <div className="flex-1 mt-3 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#0B7A53]/10 text-[9px] font-black uppercase text-[#0B7A53]/70 tracking-wider">
              <th className="pb-1.5 font-bold">Komoditas</th>
              <th className="pb-1.5 font-bold text-right">Harga Riil</th>
              <th className="pb-1.5 font-bold text-right">Perubahan (YoY)</th>
              <th className="pb-1.5 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0B7A53]/5">
            {commStats.map((c, i) => {
              const stats = getYoYStats(c.curr, c.prev);
              return (
                <tr key={i} className="hover:bg-white/40 transition-colors">
                  <td className="py-2 flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                    <span className="text-sm shrink-0">{c.emoji}</span>
                    <span className="truncate">{c.name}</span>
                  </td>
                  <td className="py-2 text-right font-extrabold text-slate-800 text-xs">
                    Rp {Math.round(c.curr).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-[10px] font-bold ${stats.isZero ? 'text-slate-500' : stats.isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {stats.changeText}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border shadow-sm ${stats.colorClass}`}>
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
