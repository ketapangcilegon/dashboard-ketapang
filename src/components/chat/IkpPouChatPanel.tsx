'use client';

import React, { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Download, Brain, Sparkles, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { IkpPouPanelData } from '@/lib/chatPanels';

interface IkpPouChatPanelProps {
  data?: IkpPouPanelData;
  className?: string;
}

export const IkpPouChatPanel: React.FC<IkpPouChatPanelProps> = ({
  data,
  className = '',
}) => {
  const [showAiInterpretationIkp, setShowAiInterpretationIkp] = useState(false);
  const [showAiInterpretationPou, setShowAiInterpretationPou] = useState(false);

  if (!data) return null;

  const { ikp = [], pou = [] } = data;
  const latestIkp = ikp[ikp.length - 1];
  const latestPou = pou[pou.length - 1];

  const handleDownloadIkp = () => {
    const headers = [['Tahun', 'IKP Cilegon', 'IKP Provinsi Banten', 'IKP Nasional']];
    const rows = ikp.map((d) => [d.year, d.cilegon, d.provinsi ?? '-', d.nasional ?? '-']);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IKP Cilegon');
    XLSX.writeFile(wb, `IKP_Kota_Cilegon_5_Tahun_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPou = () => {
    const headers = [['Tahun', 'PoU Cilegon (%)', 'PoU Provinsi Banten (%)', 'PoU Nasional (%)']];
    const rows = pou.map((d) => [d.year, `${d.cilegon}%`, d.provinsi ? `${d.provinsi}%` : '-', d.nasional ? `${d.nasional}%` : '-']);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PoU Cilegon');
    XLSX.writeFile(wb, `PoU_Kota_Cilegon_5_Tahun_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className={`space-y-4 my-3 w-full max-w-full ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0" />
        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight uppercase tracking-wide">
          IKP & POU KOTA CILEGON 5 TAHUN TERAKHIR
        </h3>
      </div>

      {/* Card 1: IKP */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex flex-col space-y-3 select-none">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base select-none">🌾</span>
              <h4 className="font-extrabold text-emerald-600 text-sm sm:text-base leading-tight">
                Indeks Ketahanan Pangan (IKP) Lintas Tahun
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Perbandingan Nilai Indeks Ketahanan Pangan Daerah vs Provinsi & Nasional
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAiInterpretationIkp((prev) => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              showAiInterpretationIkp
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/30'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Interpretasi AI Cerdas IKP"
          >
            <Brain className="w-4 h-4 text-emerald-700" />
          </button>
        </div>

        {showAiInterpretationIkp && (
          <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-300/80 text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Interpretasi AI Skor IKP ({latestIkp?.year || '2024'}):</span>
              </div>
              <button type="button" onClick={() => setShowAiInterpretationIkp(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-700">
              Skor IKP Kota Cilegon pada tahun {latestIkp?.year || '2024'} mencapai <strong>{latestIkp?.cilegon || 80.12}</strong> (kategori <strong>Sangat Tahan Pangan</strong>), berada di atas rata-rata Provinsi Banten ({latestIkp?.provinsi || 79.25}) dan Nasional ({latestIkp?.nasional || 74.91}).
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>cilegon</span></div>
          <div className="flex items-center gap-1.5 text-amber-500"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>nasional</span></div>
          <div className="flex items-center gap-1.5 text-blue-500"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>provinsi</span></div>
        </div>

        <div className="h-[200px] sm:h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={ikp} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cilegonIkpGradPanci" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[65, 85]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="cilegon" name="Cilegon" stroke="#10b981" strokeWidth={3} fill="url(#cilegonIkpGradPanci)" />
              <Line type="monotone" dataKey="provinsi" name="Banten" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="nasional" name="Nasional" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#f59e0b' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleDownloadIkp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download xlsx</span>
          </button>
        </div>
      </div>

      {/* Card 2: PoU */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-purple-100 p-4 sm:p-5 shadow-xs flex flex-col space-y-3 select-none">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base select-none">💜</span>
              <h4 className="font-extrabold text-purple-700 text-sm sm:text-base leading-tight">
                Prevalence of Undernourishment (PoU) Lintas Tahun
              </h4>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Tren Perbandingan Angka Prevalensi Ketidakcukupan Konsumsi Pangan (%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAiInterpretationPou((prev) => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              showAiInterpretationPou
                ? 'bg-purple-100 border-purple-400 text-purple-800 ring-2 ring-purple-400/30'
                : 'bg-purple-50/90 border-purple-200 text-purple-700 hover:bg-purple-100'
            }`}
            title="Interpretasi AI Cerdas PoU"
          >
            <Brain className="w-4 h-4 text-purple-700" />
          </button>
        </div>

        {showAiInterpretationPou && (
          <div className="p-3 bg-purple-50/90 rounded-xl border border-purple-300/80 text-xs text-slate-800 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-purple-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Interpretasi AI Angka PoU ({latestPou?.year || '2025'}):</span>
              </div>
              <button type="button" onClick={() => setShowAiInterpretationPou(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-700">
              Angka PoU Kota Cilegon tercatat sebesar <strong>{latestPou?.cilegon || 2.78}%</strong>, jauh lebih rendah (lebih baik) dibanding rata-rata Nasional ({latestPou?.nasional || 7.89}%).
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-purple-600"><div className="w-3 h-3 rounded-full bg-purple-600" /><span>cilegon</span></div>
          <div className="flex items-center gap-1.5 text-amber-500"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>nasional</span></div>
          <div className="flex items-center gap-1.5 text-cyan-600"><div className="w-3 h-3 rounded-full bg-cyan-500" /><span>provinsi</span></div>
        </div>

        <div className="h-[200px] sm:h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pou} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cilegonPouGradPanci" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="nasional" name="Nasional (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3.5, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="provinsi" name="Banten (%)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3.5, fill: '#06b6d4' }} />
              <Area type="monotone" dataKey="cilegon" name="Cilegon (%)" stroke="#9333ea" strokeWidth={3} fill="url(#cilegonPouGradPanci)" dot={{ r: 4, fill: '#9333ea' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleDownloadPou}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-black text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>Download xlsx</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IkpPouChatPanel;
