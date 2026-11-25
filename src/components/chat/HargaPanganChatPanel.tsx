'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Sparkles, Brain, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import CommodityIcon from '@/components/CommodityIcon';
import { SagonPanelData, SagonCommodityItem, formatIndoDate, getYoYStats } from '@/lib/chatPanels';

interface HargaPanganChatPanelProps {
  data?: SagonPanelData;
  onAskCommodity?: (prompt: string) => void;
  className?: string;
}

export const HargaPanganChatPanel: React.FC<HargaPanganChatPanelProps> = ({
  data,
  onAskCommodity,
  className = '',
}) => {
  const [selectedCommodity, setSelectedCommodity] = useState<SagonCommodityItem | null>(null);
  const [showAiInterpretation, setShowAiInterpretation] = useState(false);

  const availableDates = data?.availableDates && data.availableDates.length > 0
    ? data.availableDates
    : [data?.date || new Date().toISOString().split('T')[0]];

  const [dateIndex, setDateIndex] = useState<number>(availableDates.length - 1);

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Memuat panel harga pangan strategis...</span>
      </div>
    );
  }

  const currentDate = availableDates[dateIndex] || data.date;
  const currentFormattedDate = formatIndoDate(currentDate);

  const historyForDate = data.historyByDate?.[currentDate];
  const items: SagonCommodityItem[] = data.items.map((item) => {
    if (historyForDate && historyForDate[item.id] !== undefined && historyForDate[item.id] > 0) {
      const curr = historyForDate[item.id];
      const stats = getYoYStats(curr, item.prev);
      return {
        ...item,
        curr,
        changePct: stats.changePct,
        changeText: stats.changeText,
        isUp: stats.isUp,
        isZero: stats.isZero,
        status: stats.status,
        colorClass: stats.colorClass,
      };
    }
    return item;
  });

  const isLatestDate = dateIndex === availableDates.length - 1;
  const waspadaItems = items.filter((i) => i.status === 'WASPADA');

  const handleDownloadXlsx = () => {
    const headers = [
      ['No', 'Komoditas', 'Harga Rata-Rata (Rp)', 'Harga Acuan YoY (Rp)', 'Perubahan (YoY)', 'Status', 'Tanggal', 'Sumber Data'],
    ];
    const rows = items.map((item, i) => [
      i + 1,
      item.name,
      item.curr,
      item.prev,
      item.changeText,
      item.status,
      currentDate,
      'sagon.cilegon.go.id - Rata-rata Seluruh Pasar',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Harga Pangan SAGON');
    XLSX.writeFile(wb, `Panel_Harga_Pangan_SAGON_${currentDate}.xlsx`);
  };

  return (
    <div className={`space-y-2.5 my-3 w-full max-w-full ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0" />
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight uppercase tracking-wide">
            PANEL HARGA PANGAN STRATEGIS
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowAiInterpretation((prev) => !prev)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 ${
            showAiInterpretation
              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/30'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
          title="Interpretasi AI Cerdas SAGON"
        >
          <Brain className="w-4 h-4 text-emerald-700" />
        </button>
      </div>

      <div className="flex flex-col bg-[#E6FDF4] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-200/60 shadow-sm select-none">
        <div className="flex justify-between items-center gap-2 pb-1">
          <p className="text-[9.5px] sm:text-[10.5px] text-[#0B7A53]/90 font-semibold leading-tight">
            Sumber: sagon.cilegon.go.id - Rata-rata Seluruh Pasar ({currentFormattedDate})
          </p>
          <div className="shrink-0">
            {isLatestDate ? (
              <span className="text-[8px] sm:text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full border border-red-600 font-extrabold flex items-center gap-1.5 animate-pulse shadow-xs">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                <span>SAGON LIVE</span>
              </span>
            ) : (
              <span className="text-[8px] sm:text-[9px] bg-emerald-700 text-white px-2 py-0.5 rounded-full border border-emerald-800 font-extrabold flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 bg-emerald-200 rounded-full" />
                <span>ARSIP SAGON</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between bg-white border border-emerald-100 p-1.5 rounded-2xl w-full shadow-xs">
          <button
            type="button"
            onClick={() => setDateIndex((prev) => Math.max(0, prev - 1))}
            disabled={dateIndex === 0}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 border-none cursor-pointer ${
              dateIndex === 0
                ? 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                : 'bg-[#10B981] hover:bg-[#0B7A53] text-white hover:scale-105 active:scale-95 shadow-xs'
            }`}
            title="Tanggal Sebelumnya (Arsip SAGON)"
          >
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
          </button>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wide">
            <span className="text-sm">📅</span>
            <span>{currentFormattedDate}</span>
          </div>

          <button
            type="button"
            onClick={() => setDateIndex((prev) => Math.min(availableDates.length - 1, prev + 1))}
            disabled={isLatestDate}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 border-none ${
              isLatestDate
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-inner'
                : 'bg-[#10B981] hover:bg-[#0B7A53] text-white hover:scale-105 active:scale-95 shadow-xs cursor-pointer'
            }`}
            title="Tanggal Berikutnya"
          >
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {showAiInterpretation && (
          <div className="mt-2.5 p-3 bg-white/95 rounded-xl border border-emerald-300/80 text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Interpretasi AI & Diagnosis Inflasi Pasar ({currentFormattedDate}):</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiInterpretation(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-700">
              {waspadaItems.length > 0 ? (
                <>
                  Terdeteksi <strong>{waspadaItems.length} komoditas waspada kenaikan YoY &gt; 5%</strong> yaitu: {waspadaItems.map((w) => `${w.name} (${w.changeText})`).join(', ')}. Sementara komoditas pokok <strong>Beras Medium</strong> tetap berada dalam rentang aman dan stabil terkendali.
                </>
              ) : (
                <>
                  Seluruh 13 komoditas pangan strategis di pasar Kota Cilegon pada tanggal ini berada dalam status <strong>AMAN dan stabil terkendali</strong> dengan pasokan distributor yang mencukupi.
                </>
              )}
            </p>
          </div>
        )}

        <div className="mt-3 overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#0B7A53]/15 text-[9px] sm:text-[10px] font-black uppercase text-[#0B7A53] tracking-wider">
                <th className="pb-2 font-bold w-[38%] pl-1">KOMODITAS</th>
                <th className="pb-2 font-bold text-right w-[24%]">HARGA RATA-RATA</th>
                <th className="pb-2 font-bold text-center w-[20%]">YOY</th>
                <th className="pb-2 font-bold text-right w-[18%] pr-1">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B7A53]/8">
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedCommodity(item === selectedCommodity ? null : item)}
                  className={`transition-colors cursor-pointer ${
                    selectedCommodity?.id === item.id ? 'bg-emerald-200/80' : 'hover:bg-white/60'
                  }`}
                  title="Klik untuk detail komoditas"
                >
                  <td className="py-2 flex items-center gap-1.5 text-slate-800 text-[11px] sm:text-xs font-bold whitespace-normal leading-tight pl-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono w-4 shrink-0 text-right">
                      {i + 1}.
                    </span>
                    <CommodityIcon id={item.id} name={item.name} size={18} className="shrink-0" />
                    <span>{item.name}</span>
                  </td>
                  <td className="py-2 text-right font-extrabold text-slate-900 text-[11px] sm:text-xs whitespace-nowrap font-mono">
                    Rp {Math.round(item.curr).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 text-center whitespace-nowrap">
                    <span
                      className={`text-[10.5px] sm:text-[11px] font-bold ${
                        item.isZero ? 'text-slate-500' : item.isUp ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.changeText}
                    </span>
                  </td>
                  <td className="py-2 text-right pr-1 whitespace-nowrap">
                    <span
                      className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase border shadow-2xs ${
                        item.status === 'WASPADA'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedCommodity && (
          <div className="mt-2.5 p-3 bg-white/95 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CommodityIcon id={selectedCommodity.id} name={selectedCommodity.name} size={16} />
                <span className="font-bold text-xs text-slate-900">{selectedCommodity.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    selectedCommodity.status === 'WASPADA' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedCommodity.status} ({selectedCommodity.changeText})
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600">
                Harga Rata-rata: <strong>Rp {Math.round(selectedCommodity.curr).toLocaleString('id-ID')}</strong> | Acuan YoY: <strong>Rp {Math.round(selectedCommodity.prev).toLocaleString('id-ID')}</strong>
              </p>
            </div>

            {onAskCommodity && (
              <button
                type="button"
                onClick={() => onAskCommodity(`Jelaskan perkembangan harga ${selectedCommodity.name} di pasar Cilegon beserta faktor penyebab dan rekomendasi stabilisasinya`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10.5px] font-bold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Analisis AI</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-[#0B7A53]/20 flex justify-between items-center text-[9.5px] font-bold text-[#0B7A53]">
          <span className="italic">*Benchmark YoY • Terhubung Database PANCI</span>
          <button
            type="button"
            onClick={handleDownloadXlsx}
            className="flex items-center gap-1.5 bg-[#0B7A53] hover:bg-[#086343] active:scale-95 text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Unduh XLSX</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HargaPanganChatPanel;
