'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, ShieldAlert, TrendingUp, Brain, Sparkles, ArrowRight } from 'lucide-react';
import { EwsPanelData, EwsWarningItem } from '@/lib/chatPanels';

interface EwsChatPanelProps {
  data?: EwsPanelData;
  onOpenActionPlan?: (item: EwsWarningItem) => void;
}

export const EwsChatPanel: React.FC<EwsChatPanelProps> = ({ data, onOpenActionPlan }) => {
  const [expandedCommodity, setExpandedCommodity] = useState<string | null>(
    data?.warnings?.[0]?.name || 'Bawang Merah'
  );
  const [showAiInterpretation, setShowAiInterpretation] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!data || !data.warnings || data.warnings.length === 0) return null;

  const toggleAccordion = (commodityName: string) => {
    setExpandedCommodity((prev) => (prev === commodityName ? null : commodityName));
  };

  const handleDownloadDocx = () => {
    setIsExporting(true);
    try {
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>Laporan Early Warning System (EWS) Pangan Kota Cilegon</title></head>
        <body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5;">
          <h1 style="color: #b45309;">LAPORAN SISTEM PERINGATAN DINI (EWS) PANGAN KOTA CILEGON</h1>
          <p><strong>Tanggal Terbit:</strong> ${new Date(data.updatedAt).toLocaleDateString('id-ID')}</p>
          <p><strong>Status EWS:</strong> AKTIF (${data.warnings.length} Komoditas Pantauan Volatilitas)</p>
          <hr/>
          ${data.warnings.map((item: EwsWarningItem) => `
            <h3>${item.name} — Status: ${item.statusCv}</h3>
            <p>Harga Aktual: Rp ${(item.current || 0).toLocaleString('id-ID')}/kg | CV: ${item.cv.toFixed(1)}% | Proyeksi +3B: Rp ${(item.month3 || 0).toLocaleString('id-ID')}/kg</p>
            <ul>${item.rekomendasi.map((rec: string) => `<li>${rec}</li>`).join('')}</ul>
          `).join('')}
        </body></html>
      `;
      const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_EWS_Pangan_Cilegon_${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 via-white to-white shadow-md shadow-amber-500/5 overflow-hidden">
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-400/40 shadow-xs">
            <ShieldAlert className="w-5 h-5 animate-pulse text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 tracking-tight">Early Warning System (EWS)</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                EWS AKTIF
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deteksi Volatilitas CV & Proyeksi Harga Pangan Kota Cilegon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAiInterpretation((prev) => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 ${
              showAiInterpretation
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/30'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Interpretasi AI EWS Pangan"
          >
            <Brain className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>{isExporting ? 'Memproses...' : 'Download doc'}</span>
          </button>
        </div>
      </div>

      {showAiInterpretation && (
        <div className="mx-3.5 sm:mx-4 mt-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Interpretasi AI & Diagnosis Kerentanan EWS:</span>
            </div>
            <button type="button" onClick={() => setShowAiInterpretation(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-700">
            Terdeteksi <strong>{data.warnings.length} komoditas</strong> pada status pantauan khusus akibat volatilitas pasokan sentra produksi dan fluktuasi musiman. Direkomendasikan langkah antisipatif Gerakan Pangan Murah (GPM) dan pengawasan distribusi harian di 3 pasar rakyat Cilegon.
          </p>
        </div>
      )}

      <div className="p-3 sm:p-4 space-y-2.5">
        {data.warnings.map((item) => {
          const isExpanded = expandedCommodity === item.name;
          const isDanger = item.statusCv === 'RENTAN' || item.statusSkpg === 'RENTAN';
          const isUp = item.month3 > item.current;

          return (
            <div
              key={item.id}
              className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                isExpanded ? 'border-amber-300 bg-amber-50/30 shadow-xs' : 'border-slate-200 hover:border-amber-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleAccordion(item.name)}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-amber-50/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDanger ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">{item.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Aktual: <strong className="text-slate-700">Rp {(item.current || 0).toLocaleString('id-ID')}</strong>
                      {' • '}CV: <span className="font-semibold text-amber-700">{item.cv.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    isDanger ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {item.statusCv}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-amber-100 bg-white/80 space-y-3 animate-in fade-in duration-150">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-amber-600" />
                      Proyeksi Harga 3 Bulan Ke Depan
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase">HARGA AKTUAL</div>
                        <div className="text-sm font-extrabold text-slate-800 mt-1">Rp {(item.current || 0).toLocaleString('id-ID')}</div>
                      </div>
                      <div className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-bold text-amber-800 uppercase">PROYEKSI +3 BULAN</div>
                        <div className="text-sm font-extrabold text-amber-950 mt-1">Rp {(item.month3 || 0).toLocaleString('id-ID')}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase">ARAH TREN</div>
                        <div className={`text-sm font-extrabold mt-1 ${isUp ? 'text-red-600' : 'text-emerald-700'}`}>
                          {isUp ? '↗ Naik' : '— Stabil'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-2.5 text-xs">
                    <div className="font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Rekomendasi Tindakan DKPP Kota Cilegon:
                    </div>
                    <ul className="space-y-1 text-slate-700 pl-4 list-disc text-[11px] leading-relaxed">
                      {item.rekomendasi.map((rec: string, rIdx: number) => (
                        <li key={rIdx}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  {onOpenActionPlan && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenActionPlan(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Simulasikan Intervensi Pasar
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EwsChatPanel;
