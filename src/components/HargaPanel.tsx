"use client";

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Loader2, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import CommodityIcon from './CommodityIcon';

interface HargaPanelProps {
  hargaData: any[];
  previousHargaData?: any[];
  livePrices?: Record<string, number> | null;
  liveDate?: string | null;
  liveHistory?: Record<string, Record<string, number>> | null;
  loadingLive?: boolean;
}

export default function HargaPanel({ 
  hargaData = [], 
  previousHargaData = [],
  livePrices: propLivePrices,
  liveDate: propLiveDate,
  liveHistory: propLiveHistory,
  loadingLive: propLoadingLive
}: HargaPanelProps) {
  const [localLivePrices, setLocalLivePrices] = useState<Record<string, number> | null>(null);
  const [localLiveDate, setLocalLiveDate] = useState<string | null>(null);
  const [localLiveHistory, setLocalLiveHistory] = useState<Record<string, Record<string, number>> | null>(null);
  const [localLoadingLive, setLocalLoadingLive] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const hasPropLive = propLivePrices !== undefined || propLoadingLive !== undefined;
  const livePrices = hasPropLive ? propLivePrices : localLivePrices;
  const liveDate = hasPropLive ? propLiveDate : localLiveDate;
  const liveHistory = propLiveHistory !== undefined ? propLiveHistory : localLiveHistory;
  const loadingLive = hasPropLive ? propLoadingLive : localLoadingLive;

  // Date Navigation State
  const todayStr = new Date().toISOString().split('T')[0];
  const liveDateString = liveDate || todayStr;

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
            if (data.history) {
              setLocalLiveHistory(data.history);
            }
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
  const berasCur = getAverage(hargaData, 'beras', 13833);
  const minyakCur = getAverage(hargaData, 'minyak_goreng', 19600);
  const minyakKemasanCur = getAverage(hargaData, 'minyak_goreng_kemasan', 19800);
  const telurCur = getAverage(hargaData, 'telur', 25667);
  const ayamCur = getAverage(hargaData, 'daging_ayam', 40667);
  const gulaCur = getAverage(hargaData, 'gula_pasir', 19000);
  const cabeCur = getAverage(hargaData, 'cabe_merah', 37500);
  const cabeKeritingCur = getAverage(hargaData, 'cabe_merah_keriting', 39000);

  const bawangMerahCur = getAverage(hargaData, 'bawang_merah', 30000);
  const bawangPutihCur = getAverage(hargaData, 'bawang_putih', 35333);
  const cabeRawitMerahCur = getAverage(hargaData, 'cabe_rawit_merah', 51667);
  const cabeRawitHijauCur = getAverage(hargaData, 'cabe_rawit_hijau', 43333);
  const dagingSapiCur = getAverage(hargaData, 'daging_sapi', 140000);
  const tepungTeriguCur = getAverage(hargaData, 'tepung_terigu', 13500);

  // Previous year averages (YoY)
  const berasPrev = getAverage(previousHargaData, 'beras', 14050);
  const minyakPrev = getAverage(previousHargaData, 'minyak_goreng', 18000);
  const minyakKemasanPrev = getAverage(previousHargaData, 'minyak_goreng_kemasan', 18500);
  const telurPrev = getAverage(previousHargaData, 'telur', 26500);
  const ayamPrev = getAverage(previousHargaData, 'daging_ayam', 36364);
  const gulaPrev = getAverage(previousHargaData, 'gula_pasir', 17000);
  const cabePrev = getAverage(previousHargaData, 'cabe_merah', 53184);
  const cabeKeritingPrev = getAverage(previousHargaData, 'cabe_merah_keriting', 48000);

  const bawangMerahPrev = getAverage(previousHargaData, 'bawang_merah', 34000);
  const bawangPutihPrev = getAverage(previousHargaData, 'bawang_putih', 38000);
  const cabeRawitMerahPrev = getAverage(previousHargaData, 'cabe_rawit_merah', 50000);
  const cabeRawitHijauPrev = getAverage(previousHargaData, 'cabe_rawit_hijau', 42000);
  const dagingSapiPrev = getAverage(previousHargaData, 'daging_sapi', 130000);
  const tepungTeriguPrev = getAverage(previousHargaData, 'tepung_terigu', 12500);

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

  // Active date selected by navigation buttons
  const activeDate = dates[dateIndex];

  // Retrieve real historical price from Supabase archive without any artificial interpolation formulas
  const getRealHistoricalPrice = (key: string, fallbackCur: number): number => {
    // 1. If currently on latest/live tab (index 4) and livePrices has value
    if (dateIndex === 4 && livePrices && livePrices[key] !== undefined && livePrices[key] > 0) {
      return livePrices[key];
    }

    // 2. If history is available from Supabase archive for this specific date
    if (liveHistory) {
      // Check exact match for activeDate
      if (liveHistory[activeDate] && liveHistory[activeDate][key] !== undefined && liveHistory[activeDate][key] > 0) {
        return liveHistory[activeDate][key];
      }

      // If activeDate has no entry (e.g. weekend/holiday), find closest recorded date <= activeDate
      const availableDates = Object.keys(liveHistory)
        .filter(d => d <= activeDate)
        .sort()
        .reverse();

      if (availableDates.length > 0) {
        const closestDate = availableDates[0];
        if (liveHistory[closestDate] && liveHistory[closestDate][key] !== undefined && liveHistory[closestDate][key] > 0) {
          return liveHistory[closestDate][key];
        }
      }
    }

    // 3. Fallback to live prices or current dataset baseline
    if (livePrices && livePrices[key] !== undefined && livePrices[key] > 0) {
      return livePrices[key];
    }

    return fallbackCur;
  };

  const commStats = [
    { name: 'Beras Medium', curr: getRealHistoricalPrice('beras', berasCur), prev: berasPrev, emoji: '🍚' },
    { name: 'Bawang Merah', curr: getRealHistoricalPrice('bawang_merah', bawangMerahCur), prev: bawangMerahPrev, emoji: '🧅' },
    { name: 'Bawang Putih Bonggol', curr: getRealHistoricalPrice('bawang_putih', bawangPutihCur), prev: bawangPutihPrev, emoji: '🧄' },
    { name: 'Cabe Merah Besar', curr: getRealHistoricalPrice('cabe_merah', cabeCur), prev: cabePrev, emoji: '🌶️' },
    { name: 'Cabe Merah Keriting', curr: getRealHistoricalPrice('cabe_merah_keriting', cabeKeritingCur), prev: cabeKeritingPrev, emoji: '🌶️' },
    { name: 'Cabe Rawit Merah', curr: getRealHistoricalPrice('cabe_rawit_merah', cabeRawitMerahCur), prev: cabeRawitMerahPrev, emoji: '🌶️' },
    { name: 'Cabe Rawit Hijau', curr: getRealHistoricalPrice('cabe_rawit_hijau', cabeRawitHijauCur), prev: cabeRawitHijauPrev, emoji: '🌶️' },
    { name: 'Daging Sapi Murni', curr: getRealHistoricalPrice('daging_sapi', dagingSapiCur), prev: dagingSapiPrev, emoji: '🥩' },
    { name: 'Daging Ayam Ras', curr: getRealHistoricalPrice('daging_ayam', ayamCur), prev: ayamPrev, emoji: '🍗' },
    { name: 'Telur Ayam Ras', curr: getRealHistoricalPrice('telur', telurCur), prev: telurPrev, emoji: '🥚' },
    { name: 'Gula Pasir', curr: getRealHistoricalPrice('gula_pasir', gulaCur), prev: gulaPrev, emoji: '🧂' },
    { name: 'Minyak Goreng Kemasan', curr: getRealHistoricalPrice('minyak_goreng_kemasan', minyakKemasanCur), prev: minyakKemasanPrev, emoji: '🧴' },
    { name: 'Tepung Terigu Kemasan', curr: getRealHistoricalPrice('tepung_terigu', tepungTeriguCur), prev: tepungTeriguPrev, emoji: '🌾' },
  ];

  // Export current table view to XLSX Excel
  const handleDownloadXlsx = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');

      const formattedActiveDate = formatIndoDate(dates[dateIndex]);
      const isLive = dateIndex === 4 && livePrices;
      const sumberText = isLive 
        ? 'Sistem SAGON Cilegon (Live Rata-rata 3 Pasar)' 
        : 'Arsip Database SAGON Cilegon (Rata-rata 3 Pasar)';

      const sheetData = commStats.map((c, idx) => {
        const stats = getYoYStats(c.curr, c.prev);
        return {
          'No': idx + 1,
          'Komoditas': c.name,
          'Harga Rata-Rata (Rp)': Math.round(c.curr),
          'Harga Acuan YoY (Rp)': Math.round(c.prev),
          'Perubahan (YoY)': stats.changeText,
          'Status': stats.status,
          'Tanggal': dates[dateIndex],
          'Tanggal Format': formattedActiveDate,
          'Sumber Data': sumberText
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 6 },  // No
        { wch: 26 }, // Komoditas
        { wch: 22 }, // Harga Rata-Rata (Rp)
        { wch: 22 }, // Harga Acuan YoY (Rp)
        { wch: 16 }, // Perubahan (YoY)
        { wch: 14 }, // Status
        { wch: 14 }, // Tanggal
        { wch: 24 }, // Tanggal Format
        { wch: 45 }  // Sumber Data
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Harga Harian SAGON');

      const fileName = `Harga_Pangan_SAGON_Cilegon_${dates[dateIndex]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Failed to export XLSX:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#E6FDF4] p-4 rounded-xl border border-emerald-200/50 shadow-sm justify-between select-none">
      <div>
        <div className="flex justify-between items-center gap-2">
          <p className="text-[9px] text-[#0B7A53]/70 font-semibold leading-tight">
            {dateIndex === 4 && livePrices 
              ? `Sumber: sagon.cilegon.go.id - Rata-rata Seluruh Pasar (${formatIndoDate(dates[dateIndex])})` 
              : `Sumber: Arsip Database SAGON Cilegon (${formatIndoDate(dates[dateIndex])})`}
          </p>
          <div className="shrink-0">
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
              <span className="text-[8px] bg-emerald-700 text-white px-1.5 py-0.5 rounded-full border border-emerald-800 font-extrabold flex items-center gap-1 shadow-sm">
                <span className="w-1 h-1 bg-emerald-200 rounded-full"></span>
                ARSIP SAGON RIIL
              </span>
            )}
          </div>
        </div>

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
              <th className="pb-1.5 font-bold text-center w-[25%]">Harga Rata-Rata</th>
              <th className="pb-1.5 font-bold text-center w-[22%]">Perubahan (YoY)</th>
              <th className="pb-1.5 font-bold text-right w-[18%] pr-1">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0B7A53]/5">
            {commStats.map((c, i) => {
              const stats = getYoYStats(c.curr, c.prev);
              return (
                <tr key={i} className="hover:bg-white/40 transition-colors">
                  <td className="py-1 flex items-center gap-1.5 text-slate-700 text-[10px] sm:text-xs font-bold whitespace-normal break-words leading-tight">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 font-mono w-3.5 shrink-0 text-right">{i + 1}.</span>
                    <CommodityIcon name={c.name} size={16} className="shrink-0" />
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
      
      {/* Footer Benchmark & Download XLSX */}
      <div className="mt-2.5 pt-2 border-t border-[#0B7A53]/15 flex justify-between items-center text-[9px] font-bold text-[#0B7A53]/80">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[8px] sm:text-[9px]">
          <span>*Benchmark YoY</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">Ter-update otomatis</span>
        </div>

        <button
          onClick={handleDownloadXlsx}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-sm hover:shadow transition-all text-[9px] sm:text-[10px] font-bold cursor-pointer border-none disabled:opacity-50"
          title={`Unduh Data Tabel (${dates[dateIndex]}) Format Excel .XLSX`}
        >
          {isExporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? 'Mengunduh...' : 'Unduh XLSX'}</span>
        </button>
      </div>
    </div>
  );
}

