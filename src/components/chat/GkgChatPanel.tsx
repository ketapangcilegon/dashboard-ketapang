'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Brain, Sparkles, TrendingUp, ChevronUp, Wheat } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GkgPanelData } from '@/lib/chatPanels';

interface GkgChatPanelProps {
  data?: GkgPanelData;
}

export const GkgChatPanel: React.FC<GkgChatPanelProps> = ({ data }) => {
  const [showAiInterpretation, setShowAiInterpretation] = useState(true);

  if (!data || !data.items || data.items.length === 0) return null;

  const { items, latestYear, totalGkgLatest, totalBerasLatest, growthPct, aiInterpretation } = data;

  const handleDownloadXlsx = () => {
    const headers = [['Tahun', 'Produksi GKG (Ton)', 'Konversi Rendemen (%)', 'Produksi Beras (Ton)']];
    const rows = items.map((i) => [i.tahun, i.produksi_gkg, i.konversi_pct, i.produksi_beras]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produksi GKG Cilegon');
    XLSX.writeFile(wb, `Produksi_GKG_Beras_Cilegon_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="my-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-md shadow-emerald-500/5 overflow-hidden">
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-xs">
            <Wheat className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 tracking-tight">Produksi GKG & Beras Kota Cilegon</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                5 Tahun Terakhir
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tren Gabah Kering Giling (GKG) dan Konversi Rendemen Beras Lokal
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
            title="Interpretasi AI Cerdas"
          >
            <Brain className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            type="button"
            onClick={handleDownloadXlsx}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unduh XLSX</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Total GKG ({latestYear})</div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-950 mt-0.5">
            {totalGkgLatest.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton</span>
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5 flex items-center justify-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {growthPct >= 0 ? `+${growthPct}` : growthPct}% YoY
          </div>
        </div>

        <div className="bg-teal-50/80 border border-teal-200/80 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Estimasi Beras ({latestYear})</div>
          <div className="text-base sm:text-lg font-extrabold text-teal-950 mt-0.5">
            {totalBerasLatest.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton</span>
          </div>
          <div className="text-[10px] font-medium text-teal-700 mt-0.5">Rendemen 63.23%</div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Sentra Utama</div>
          <div className="text-xs font-bold text-slate-800 mt-1">Ciwandan, Jombang & Cibeber</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Kota Cilegon, Banten</div>
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-2">
        <div className="h-56 sm:h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit=" t" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="produksi_gkg" name="Produksi GKG (Ton)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="produksi_beras" name="Konversi Beras (Ton)" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAiInterpretation && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-300/80 text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-emerald-900">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Interpretasi AI & Analisis Produksi Pangan:</span>
            </div>
            <button type="button" onClick={() => setShowAiInterpretation(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-700">{aiInterpretation}</p>
        </div>
      )}
    </div>
  );
};

export default GkgChatPanel;
