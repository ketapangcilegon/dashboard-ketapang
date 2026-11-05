"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Info, 
  Minus, 
  Check, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Square, 
  Download, 
  Lightbulb,
  CheckCircle2,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import CommodityIcon from './CommodityIcon';
import { evaluateCommodity, EwsResult, RiskStatus, FinalStatus } from '@/lib/ews/engine';

const COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras Medium',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih Bonggol',
  harga_cabai_merah: 'Cabe Merah Besar',
  harga_cabai_merah_keriting: 'Cabe Merah Keriting',
  harga_cabai_rawit_merah: 'Cabe Rawit Merah',
  harga_cabai_rawit_hijau: 'Cabe Rawit Hijau',
  harga_cabai_rawit: 'Cabe Rawit Merah',
  harga_daging_sapi: 'Daging Sapi Murni',
  harga_daging_ayam_ras: 'Daging Ayam Ras',
  harga_telur_ayam_ras: 'Telur Ayam Ras',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng Kemasan',
  harga_tepung_terigu: 'Tepung Terigu Kemasan'
};

const COMMODITY_ORDER = [
  'harga_beras',
  'harga_bawang_merah',
  'harga_bawang_putih',
  'harga_cabai_merah',
  'harga_cabai_merah_keriting',
  'harga_cabai_rawit_merah',
  'harga_cabai_rawit_hijau',
  'harga_daging_sapi',
  'harga_daging_ayam_ras',
  'harga_telur_ayam_ras',
  'harga_gula_pasir',
  'harga_minyak_goreng',
  'harga_tepung_terigu'
];

const getIndonesianMonthName = (monthIndex: number): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthIndex];
};

const getBaselineMonthStr = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${getIndonesianMonthName(d.getMonth()).toUpperCase()} ${d.getFullYear()}`;
};

const getT1MonthStr = (): string => {
  const d = new Date();
  return `${getIndonesianMonthName(d.getMonth()).toUpperCase()} ${d.getFullYear()}`;
};

const getT3MonthStr = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return `${getIndonesianMonthName(d.getMonth()).toUpperCase()} ${d.getFullYear()}`;
};

interface ForecastItem {
  id: string;
  name: string;
  current: number;
  month1: number;
  month3: number;
  cv: number;
  growth_yoy: number;
  isWarning: boolean;
  trend: 'up' | 'down' | 'stable';
  changePct: number;
  trend3m: 'up' | 'down' | 'stable';
  changePct3m: number;
  compositeStatus: FinalStatus;
  compositeScore: number | null;
  riskIndex: number;
  evalRes: EwsResult;
  rekomendasi: string[];
}

interface ForecastPanelProps {
  livePrices?: Record<string, number>;
  onSwitchView?: (view: string) => void;
}

interface DBForecastResult {
  komoditas: string;
  harga_aktual: number;
  forecast_1m: number;
  forecast_3m: number;
  cv: number;
  growth_yoy?: number;
  status_forecast?: string;
  status_cv?: string;
  status_skpg?: string;
  perubahan_pct?: number;
  drivers?: string[];
  rekomendasi?: string[];
}

const getDimensionBadgeClass = (status: string) => {
  switch (status) {
    case 'AWAS':
    case 'KRITIS':
      return 'text-rose-700 bg-rose-50 border border-rose-200';
    case 'WASPADA':
      return 'text-amber-700 bg-amber-50 border border-amber-200';
    case 'AMAN':
      return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
    default:
      return 'text-slate-500 bg-slate-100 border border-slate-200';
  }
};

export default function ForecastPanel({ livePrices, onSwitchView }: ForecastPanelProps) {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [rawDbData, setRawDbData] = useState<DBForecastResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showMobileSumberModel, setShowMobileSumberModel] = useState(false);
  const [showForecastInfo, setShowForecastInfo] = useState(false);
  const [showEwsInfo, setShowEwsInfo] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDownloadXlsx = () => {
    const headers = [["Komoditas", "Harga Aktual (Rp/kg)", "Forecast +1 Bulan (Rp/kg)", "Forecast +3 Bulan (Rp/kg)", "Tren +1 Bln", "Tren +3 Bln", "Status EWS Komposit", "Indeks Variasi (CV)"]];
    const rows = forecasts.map(item => [
      item.name,
      item.current,
      item.month1,
      item.month3,
      item.trend === 'up' ? `Naik (+${item.changePct.toFixed(1)}%)` : item.trend === 'down' ? `Turun (${item.changePct.toFixed(1)}%)` : `Stabil (${item.changePct.toFixed(1)}%)`,
      item.trend3m === 'up' ? `Naik (+${item.changePct3m.toFixed(1)}%)` : item.trend3m === 'down' ? `Turun (${item.changePct3m.toFixed(1)}%)` : `Stabil (${item.changePct3m.toFixed(1)}%)`,
      item.compositeStatus,
      item.cv
    ]);
    const data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Forecast & EWS");
    XLSX.writeFile(wb, "AI_Forecast_Pangan_Strategis_Cilegon.xlsx");
  };

  const handleDownloadEwsDocx = () => {
    if (warnings.length === 0) return;

    const contentHtml = warnings.map(w => {
      const isAwas = w.compositeStatus === 'AWAS';
      const statusColor = isAwas ? '#dc2626' : '#d97706';
      return `
        <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #fed7aa; background-color: #fff7ed; border-radius: 8px;">
          <h3 style="color: #c2410c; margin-top: 0; font-size: 14pt; border-bottom: 1px solid #ffedd5; padding-bottom: 5px;">
            ${w.name.toUpperCase()}
          </h3>
          <p><strong>Status EWS Komposit:</strong> <span style="color: ${statusColor}; font-weight: bold;">${w.compositeStatus} (Skor: ${w.compositeScore !== null ? w.compositeScore.toFixed(2) : '-'}/2.00 - Indeks Risiko: ${w.riskIndex.toFixed(0)}%)</span></p>
          <p><strong>Evaluasi 4 Dimensi Terpadu:</strong></p>
          <ul>
            <li>Proyeksi +1 Bln: Rp ${Math.round(w.month1).toLocaleString('id-ID')} (${w.changePct >= 0 ? '+' : ''}${w.changePct.toFixed(1)}%) -> Status: ${w.evalRes.dimensions.f1.status} (Skor: ${w.evalRes.dimensions.f1.level ?? '-'})</li>
            <li>Proyeksi +3 Bln: Rp ${Math.round(w.month3).toLocaleString('id-ID')} (${w.changePct3m >= 0 ? '+' : ''}${w.changePct3m.toFixed(1)}%) -> Status: ${w.evalRes.dimensions.f3.status} (Skor: ${w.evalRes.dimensions.f3.level ?? '-'})</li>
            <li>Volatilitas Harga (CV 12-Bulan STDEV.P): ${w.cv.toFixed(1)}% -> Status: ${w.evalRes.dimensions.cv.status} (Skor: ${w.evalRes.dimensions.cv.level ?? '-'})</li>
            <li>Tekanan Harga Tahunan (YoY): ${w.growth_yoy >= 0 ? '+' : ''}${w.growth_yoy.toFixed(1)}% -> Status: ${w.evalRes.dimensions.yoy.status} (Skor: ${w.evalRes.dimensions.yoy.level ?? '-'})</li>
          </ul>
          <p><strong>Bobot Komposit (4 Dimensi Terpadu):</strong> Bobot 25% F+1 + 25% F+3 + 25% CV + 25% YoY</p>
          <p><strong>Pendorong Utama (Top Drivers):</strong></p>
          <ol>
            ${w.evalRes.drivers.map((drv: string) => `<li>${drv.replace(/^\d+\s*/, '')}</li>`).join('')}
          </ol>
          <p><strong>Rekomendasi Kebijakan & Intervensi:</strong></p>
          <ul>
            ${w.rekomendasi.map((r: string) => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');

    const formattedHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Laporan Early Warning System (EWS) Kota Cilegon</title>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
          h2 { font-size: 16pt; color: #7c2d12; border-bottom: 2.5px solid #f97316; padding-bottom: 6px; margin-top: 20px; }
          h3 { font-size: 13pt; color: #c2410c; margin-top: 15px; }
          p { margin-bottom: 10px; text-align: justify; }
          li { margin-left: 20px; margin-bottom: 5px; }
          strong { color: #0f172a; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>LAPORAN EARLY WARNING SYSTEM (EWS) KETAHANAN PANGAN KOTA CILEGON</h2>
        <p style="font-size: 9.5pt; color: #64748b; margin-top: -8px; margin-bottom: 25px;">
          Laporan Peringatan Dini Berbasis Model 4-Dimensi Terpadu (Equal Weighting 25%) - Diterbitkan otomatis oleh AI GovTech PANCI pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div>
          ${contentHtml}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([formattedHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_EWS_Pangan_Kota_Cilegon_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchForecasts = async () => {
      try {
        const { data, error } = await supabase
          .from('forecast_result')
          .select('*')
          .order('komoditas', { ascending: true });
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setRawDbData(data as unknown as DBForecastResult[]);
        } else {
          // Fallback simulation if table is empty
          const fallback: DBForecastResult[] = Object.keys(COMMODITY_MAP).map(key => ({
            komoditas: key,
            harga_aktual: 15000,
            forecast_1m: 15400,
            forecast_3m: 16200,
            cv: 3.5,
            status_forecast: 'Stabil',
            status_cv: 'AMAN',
            status_skpg: 'AMAN',
            perubahan_pct: 2.67,
            rekomendasi: ["monitoring rutin"]
          }));
          setRawDbData(fallback);
        }
      } catch (err) {
        console.error('Error fetching dashboard forecasts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecasts();
  }, []);

  // Map data whenever rawDbData or livePrices updates
  useEffect(() => {
    if (rawDbData.length === 0) return;

    // Filter out old generic 'harga_cabai_rawit' if specific 'harga_cabai_rawit_merah' exists
    const hasSpecificRawit = rawDbData.some(r => r.komoditas === 'harga_cabai_rawit_merah');
    const filteredDbData = hasSpecificRawit 
      ? rawDbData.filter(r => r.komoditas !== 'harga_cabai_rawit')
      : rawDbData;

    const mapped: ForecastItem[] = filteredDbData.map((item) => {
      const current = Number(item.harga_aktual) || 0;
      const month1 = Number(item.forecast_1m) || 0;
      const month3 = Number(item.forecast_3m) || 0;
      const cv = Number(item.cv) || 0;
      const growthYoY = Number((item as any).growth_yoy) || 0;
      
      const changePct = current > 0 ? ((month1 - current) / current) * 100 : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePct > 3) {
        trend = 'up';
      } else if (changePct < -3) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      const changePct3m = current > 0 ? ((month3 - current) / current) * 100 : 0;
      let trend3m: 'up' | 'down' | 'stable' = 'stable';
      if (changePct3m > 3) {
        trend3m = 'up';
      } else if (changePct3m < -3) {
        trend3m = 'down';
      } else {
        trend3m = 'stable';
      }

      // Evaluasi 4 Dimensi Terpadu (Single Source of Truth)
      const evalRes = evaluateCommodity({
        komoditas: item.komoditas,
        hargaAktual: current,
        forecast1m: month1,
        forecast3m: month3,
        cv,
        yoy: growthYoY,
        drivers: item.drivers
      });

      const compositeStatus = evalRes.compositeStatus === 'DATA TIDAK LENGKAP' ? 'AMAN' : evalRes.compositeStatus;
      const isWarning = compositeStatus === 'AWAS' || compositeStatus === 'WASPADA';

      return {
        id: item.komoditas,
        name: COMMODITY_MAP[item.komoditas] || item.komoditas,
        current,
        month1,
        month3,
        cv,
        growth_yoy: growthYoY,
        isWarning,
        trend,
        changePct,
        trend3m,
        changePct3m,
        compositeStatus,
        compositeScore: evalRes.compositeScore,
        riskIndex: evalRes.riskIndexPct ?? 0,
        evalRes,
        rekomendasi: evalRes.rekomendasi.length > 0 ? evalRes.rekomendasi : (item.rekomendasi || ["monitoring rutin"])
      };
    });

    mapped.sort((a, b) => {
      const idxA = COMMODITY_ORDER.indexOf(a.id);
      const idxB = COMMODITY_ORDER.indexOf(b.id);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    setForecasts(mapped);
  }, [rawDbData, livePrices]);

  const warnings = forecasts.filter(f => f.isWarning);

  return (
    <div className="mt-8 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Forecast Table Header + Card */}
        <div className="lg:col-span-7 flex flex-col">
          {/* Header OUTSIDE & ABOVE panel box (Capture 1: Tanpa kalimat proyeksi 1 dan 3 bulan) */}
          <div className="mb-3">
            <div className="flex items-stretch gap-2.5">
              <div className="w-[3px] bg-emerald-600 rounded-full shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-wide">
                    PERAMALAN HARGA PANGAN (ML FORECASTING)
                  </h3>
                  <button
                    onClick={() => setShowForecastInfo(!showForecastInfo)}
                    className="p-1 hover:bg-amber-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                    title="Info Model"
                  >
                    <Lightbulb className="w-4 h-4 fill-amber-100 text-amber-500" />
                  </button>
                </div>
              </div>
            </div>
            {showForecastInfo && (
              <div className="mt-2 ml-3 text-xs text-slate-700 bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-md">
                Proyeksi pergerakan harga pangan strategis 1 dan 3 bulan ke depan menggunakan model Machine Learning terintegrasi.
              </div>
            )}
          </div>

          {/* Left Column Card: Forecast Table */}
          <div className="dashboard-card bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200/80 rounded-3xl p-0 flex flex-col shadow-lg overflow-hidden h-[640px] max-h-[640px] min-h-[640px] flex-1">
            <div className="overflow-y-auto overflow-x-auto flex-1 px-1 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 transition-all">
              {loading ? (
                <div className="p-16 flex justify-center items-center text-slate-400 font-bold text-xs h-full">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-600" />
                  Memuat proyeksi...
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-xs">
                    <tr className="text-[#0B4D3C] font-extrabold border-b border-emerald-100/50 text-[11px] sm:text-xs uppercase tracking-wide">
                      <th className="p-2 py-3 bg-emerald-50/50 align-middle">KOMODITAS</th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right">
                        <div className="leading-tight">HARGA AKTUAL</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{getBaselineMonthStr()}</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right">
                        <div className="leading-tight">PERAMALAN +1 BULAN</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{getT1MonthStr()}</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right">
                        <div className="leading-tight">PERAMALAN +3 BULAN</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{getT3MonthStr()}</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-center align-middle whitespace-nowrap">
                        <div className="leading-tight">ARAH TREN +1 BULAN</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">(+1 Bln)</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-center align-middle whitespace-nowrap">
                        <div className="leading-tight">ARAH TREN +3 BULAN</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">(+3 Bln)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    {forecasts.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-emerald-200/50 transition-colors border-b border-emerald-100/60 ${index % 2 === 0 ? 'bg-emerald-50/70' : 'bg-emerald-100/35'}`}>
                        <td className="p-2 py-2.5 font-bold text-slate-800 flex items-center gap-2 text-xs sm:text-[13px] whitespace-nowrap">
                          <span className="text-[11px] font-bold text-slate-400 font-mono w-4 shrink-0 text-right">{index + 1}.</span>
                          <CommodityIcon id={item.id} name={item.name} size={20} className="shrink-0" />
                          <span className="truncate max-w-[130px]">{item.name}</span>
                        </td>
                        <td className="p-2 text-right text-slate-800 font-extrabold text-xs sm:text-[13px] whitespace-nowrap">
                          Rp{item.current.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-2 text-right font-bold text-xs sm:text-[13px] whitespace-nowrap ${item.month1 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                          Rp{item.month1.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-2 text-right font-black text-xs sm:text-[13px] whitespace-nowrap ${item.month3 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                          Rp{item.month3.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center gap-1 font-bold text-xs sm:text-[12.5px] ${
                            item.trend === 'up' 
                              ? 'text-red-500' 
                              : item.trend === 'down' 
                              ? 'text-emerald-600' 
                              : 'text-amber-500'
                          }`}>
                            {item.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend === 'stable' && <Minus className="w-3.5 h-3.5 shrink-0" />}
                            <span className="font-mono">
                              {item.changePct > 0 ? `+${item.changePct.toFixed(1)}%` : `${item.changePct.toFixed(1)}%`}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center gap-1 font-bold text-xs sm:text-[12.5px] ${
                            item.trend3m === 'up' 
                              ? 'text-red-500' 
                              : item.trend3m === 'down' 
                              ? 'text-emerald-600' 
                              : 'text-amber-500'
                          }`}>
                            {item.trend3m === 'up' && <TrendingUp className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend3m === 'down' && <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend3m === 'stable' && <Minus className="w-3.5 h-3.5 shrink-0" />}
                            <span className="font-mono">
                              {item.changePct3m > 0 ? `+${item.changePct3m.toFixed(1)}%` : `${item.changePct3m.toFixed(1)}%`}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-3 px-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-bold text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Turun</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Stabil</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Naik</div>
                <button
                  onClick={handleDownloadXlsx}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 ml-1"
                  title="Download xlsx"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download xlsx
                </button>
              </div>
              {onSwitchView && (
                <button
                  onClick={() => onSwitchView('validasi_forecast')}
                  className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-black rounded-lg uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                  title="Validasi Akurasi Peramalan"
                >
                  <span>🎯 Validasi Akurasi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: EWS Header + Card (Capture 3: Tinggi Permanen h-[640px] & Scrollable Internal) */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Header OUTSIDE & ABOVE EWS card box */}
          <div className="mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0"></div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-none uppercase tracking-wide flex items-center gap-2">
                <span>EARLY WARNING SYSTEM (ML)</span>
                <button
                  onClick={() => setShowEwsInfo(!showEwsInfo)}
                  className="p-1 hover:bg-amber-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                  title="Metodologi EWS"
                >
                  <Lightbulb className="w-4 h-4 fill-amber-100 text-amber-500" />
                </button>
              </h3>
            </div>
            {showEwsInfo && (
              <div className="mt-2 ml-3 text-xs text-slate-700 bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-md">
                Integrated Food Price Early Warning System (EWS) Kota Cilegon menganalisis 4 dimensi terpadu: Proyeksi +1 Bln (25%), Proyeksi +3 Bln (25%), Volatilitas Harga CV 12-Bulan (25%), dan Tekanan Tahunan YoY (25%) dengan klasifikasi status terpadu AMAN, WASPADA, dan AWAS.
              </div>
            )}
          </div>

          {/* Right Column Card: EWS Panel (Tinggi PERMANEN 640px, Scrollable Internal - Capture 3) */}
          <div className="dashboard-card bg-gradient-to-br from-teal-50/40 to-emerald-50/60 border border-emerald-200/80 rounded-3xl p-4 sm:p-5 flex flex-col shadow-lg overflow-hidden h-[640px] max-h-[640px] min-h-[640px] flex-1">
          
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-slate-50/80 [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 pr-1.5">
                {loading ? (
                  <div className="py-24 text-center text-slate-500 font-bold text-xs sm:text-sm">
                    Mengevaluasi risiko 4 dimensi pangan Cilegon...
                  </div>
                ) : warnings.length > 0 ? (
                  <div className="bg-amber-50/70 border border-amber-200/60 p-4 sm:p-5 rounded-2xl relative border-r-[6px] border-r-amber-500 shadow-inner">
                    <div className="flex items-center justify-between border-b border-amber-200/40 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2 text-amber-850 font-black text-xs sm:text-sm uppercase tracking-wider">
                        <div className="p-1.5 bg-amber-200/60 rounded-full text-amber-700 shrink-0">
                          <AlertTriangle className="w-4 h-4 fill-amber-600 text-[#fffbeb]" />
                        </div>
                        <span>EWS AKTIF ({warnings.length} Komoditas Terdeteksi)</span>
                      </div>
                      <button
                        onClick={handleDownloadEwsDocx}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 border border-amber-200/70"
                        title="Download Laporan EWS (.doc)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download docx
                      </button>
                    </div>

                    <ul className="space-y-3">
                      {warnings.map(w => {
                        const isExpanded = !!expandedIds[w.id];
                        const isAwas = w.compositeStatus === 'AWAS';
                        return (
                          <li key={w.id} className="bg-white rounded-2xl border border-amber-200/50 shadow-xs overflow-hidden transition-all">
                            <button
                              onClick={() => toggleExpand(w.id)}
                              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-amber-50/30 transition-colors cursor-pointer text-left focus:outline-none group text-xs font-black uppercase tracking-wider"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-amber-50/80 rounded-xl border border-amber-100 shrink-0 flex items-center justify-center">
                                  <CommodityIcon id={w.id} name={w.name} size={24} className="shrink-0" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-slate-800 font-extrabold text-sm sm:text-base uppercase tracking-wider truncate">{w.name}</span>
                                  <span className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                                    SKOR: {w.compositeScore !== null ? w.compositeScore.toFixed(2) : '-'}/2.00 ({w.riskIndex.toFixed(0)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                                  isAwas 
                                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {w.compositeStatus}
                                </span>
                                <div className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200/50 transition-colors shrink-0 flex items-center justify-center">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-amber-700" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-amber-700" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Isi Lengkap Expand: 4 Dimensi, Bobot Komposit, Top Drivers & Rekomendasi (Capture 4: Huruf Diperbesar) */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-3 border-t border-amber-100/60 text-slate-800 bg-amber-50/20 leading-relaxed text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-200 space-y-3.5">
                                
                                {/* 1. 4 Dimensi Terpadu (Bobot 25% Masing-Masing) */}
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs sm:text-sm">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                      <Layers className="w-4 h-4 text-emerald-600" />
                                      <span>4 Dimensi Terpadu (Bobot 25% Masing-Masing)</span>
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">Skor (0-2)</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                                    {/* D1 */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                                      <div>
                                        <div className="font-extrabold text-slate-800">1. Proyeksi +1 Bln</div>
                                        <div className="text-xs text-slate-500 font-mono font-medium mt-0.5">Rp {Math.round(w.month1).toLocaleString('id-ID')}</div>
                                      </div>
                                      <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono ${getDimensionBadgeClass(w.evalRes.dimensions.f1.status)}`}>
                                          {w.changePct >= 0 ? `+${w.changePct.toFixed(1)}%` : `${w.changePct.toFixed(1)}%`} • {w.evalRes.dimensions.f1.status}
                                        </span>
                                        <div className="text-xs font-mono text-slate-500 font-extrabold mt-0.5">S:{w.evalRes.dimensions.f1.level ?? '-'}</div>
                                      </div>
                                    </div>

                                    {/* D2 */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                                      <div>
                                        <div className="font-extrabold text-slate-800">2. Proyeksi +3 Bln</div>
                                        <div className="text-xs text-slate-500 font-mono font-medium mt-0.5">Rp {Math.round(w.month3).toLocaleString('id-ID')}</div>
                                      </div>
                                      <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono ${getDimensionBadgeClass(w.evalRes.dimensions.f3.status)}`}>
                                          {w.changePct3m >= 0 ? `+${w.changePct3m.toFixed(1)}%` : `${w.changePct3m.toFixed(1)}%`} • {w.evalRes.dimensions.f3.status}
                                        </span>
                                        <div className="text-xs font-mono text-slate-500 font-extrabold mt-0.5">S:{w.evalRes.dimensions.f3.level ?? '-'}</div>
                                      </div>
                                    </div>

                                    {/* D3 */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                                      <div>
                                        <div className="font-extrabold text-slate-800">3. Volatilitas Harga (CV)</div>
                                        <div className="text-xs text-slate-500 font-medium mt-0.5">Metode STDEV.P 12-Bulan</div>
                                      </div>
                                      <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono ${getDimensionBadgeClass(w.evalRes.dimensions.cv.status)}`}>
                                          {w.cv.toFixed(1)}% • {w.evalRes.dimensions.cv.status}
                                        </span>
                                        <div className="text-xs font-mono text-slate-500 font-extrabold mt-0.5">S:{w.evalRes.dimensions.cv.level ?? '-'}</div>
                                      </div>
                                    </div>

                                    {/* D4 */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                                      <div>
                                        <div className="font-extrabold text-slate-800">4. Tekanan Tahunan (YoY)</div>
                                        <div className="text-xs text-slate-500 font-medium mt-0.5">Pertumbuhan Thn Lalu</div>
                                      </div>
                                      <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono ${getDimensionBadgeClass(w.evalRes.dimensions.yoy.status)}`}>
                                          {w.growth_yoy >= 0 ? `+${w.growth_yoy.toFixed(1)}%` : `${w.growth_yoy.toFixed(1)}%`} • {w.evalRes.dimensions.yoy.status}
                                        </span>
                                        <div className="text-xs font-mono text-slate-500 font-extrabold mt-0.5">S:{w.evalRes.dimensions.yoy.level ?? '-'}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. Segmen Bobot Komposit (Gabungan 4 Dimensi) - Menggantikan Matriks Irisan (Capture 4) */}
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                    <span className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                                      <span>Bobot Komposit (Gabungan 4 Dimensi)</span>
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-xs tracking-wider border ${
                                      isAwas ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      Status: {w.compositeStatus}
                                    </span>
                                  </div>

                                  {/* Ringkasan Skor & Indeks Risiko */}
                                  <div className="bg-gradient-to-r from-slate-50 to-emerald-50/50 p-3 rounded-xl border border-slate-150 flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                      <span className="text-[11px] font-bold text-slate-500 uppercase block leading-tight">Total Skor Risiko Komposit</span>
                                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                                        <span className="font-mono">{w.compositeScore !== null ? w.compositeScore.toFixed(2) : '-'}</span>
                                        <span className="text-xs text-slate-400 font-medium font-mono"> / 2.00</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[11px] font-bold text-slate-500 uppercase block leading-tight">Indeks Risiko EWS</span>
                                      <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                                        {w.riskIndex.toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Bar Indeks Risiko */}
                                  <div className="space-y-1">
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                                      <div 
                                        className={`h-full transition-all duration-500 rounded-full ${
                                          isAwas ? 'bg-gradient-to-r from-amber-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(5, w.riskIndex))}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Rincian Bobot 4 Dimensi (Equal Weighting 25% Masing-Masing) */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-150 text-center">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">F+1 (25%)</div>
                                      <div className="text-xs font-black text-slate-800 font-mono mt-0.5">
                                        0.25 × {w.evalRes.dimensions.f1.level ?? 0} = <span className="text-emerald-700">{(0.25 * (w.evalRes.dimensions.f1.level ?? 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-150 text-center">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">F+3 (25%)</div>
                                      <div className="text-xs font-black text-slate-800 font-mono mt-0.5">
                                        0.25 × {w.evalRes.dimensions.f3.level ?? 0} = <span className="text-emerald-700">{(0.25 * (w.evalRes.dimensions.f3.level ?? 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-150 text-center">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">CV (25%)</div>
                                      <div className="text-xs font-black text-slate-800 font-mono mt-0.5">
                                        0.25 × {w.evalRes.dimensions.cv.level ?? 0} = <span className="text-emerald-700">{(0.25 * (w.evalRes.dimensions.cv.level ?? 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-150 text-center">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">YoY (25%)</div>
                                      <div className="text-xs font-black text-slate-800 font-mono mt-0.5">
                                        0.25 × {w.evalRes.dimensions.yoy.level ?? 0} = <span className="text-emerald-700">{(0.25 * (w.evalRes.dimensions.yoy.level ?? 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Catatan Pengaman / Diagnostik jika ada */}
                                  {w.evalRes.diagnostics.length > 0 && (
                                    <div className="mt-2 bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-950 space-y-1">
                                      <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Catatan Diagnostik & Pengaman:</span>
                                      </div>
                                      {w.evalRes.diagnostics.map((d: string, i: number) => (
                                        <div key={i} className="pl-4 leading-relaxed font-medium">• {d}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* 3. Top Drivers (Pendorong Utama) - Huruf Lebih Besar */}
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                                    <Info className="w-4 h-4 text-emerald-600" />
                                    <span>Top Drivers (Pendorong Utama)</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {w.evalRes.drivers.map((drv: string, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2.5 text-slate-800 text-xs sm:text-sm font-semibold">
                                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0 border border-slate-300">
                                          {idx + 1}
                                        </span>
                                        <span className="truncate">{drv.replace(/^\d+\s*/, '')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* 4. Rekomendasi Kebijakan Resmi - Huruf Lebih Besar & Nyaman Dibaca */}
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Rekomendasi Kebijakan:</span>
                                  </div>
                                  <ul className="space-y-1.5 pl-1">
                                    {w.rekomendasi.map((r, i) => (
                                      <li key={i} className="flex items-start gap-2 text-emerald-950 text-xs sm:text-sm font-semibold leading-relaxed">
                                        <span className="text-emerald-600 leading-tight shrink-0 font-bold">•</span>
                                        <span>{r}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center gap-4 min-h-full">
                    <div className="p-3 bg-emerald-200 rounded-full text-emerald-700 shrink-0">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-[13px] font-bold text-emerald-800 mb-1">Stabilitas Terjaga</h5>
                      <p className="text-xs sm:text-sm text-emerald-700/80 leading-relaxed">Seluruh komoditas strategis diprediksi stabil (CV dan proyeksi harga dalam batas AMAN) untuk rentang waktu ke depan.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sumber Model - Desktop version (always visible) */}
            <div className="hidden lg:flex mt-3 pt-3 border-t border-slate-100/70 items-start gap-2.5 shrink-0">
              <div className="shrink-0 mt-0.5 text-emerald-600">
                <Check className="w-4 h-4 font-bold" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                  <strong className="text-emerald-800">Sumber Model:</strong> Model ML V1 memproses time series harga 5 tahun, HBKN, iklim makro (curah hujan), dan volatilitas inflasi untuk peramalan harga pangan strategis Kota Cilegon.
                </p>
              </div>
            </div>

            {/* Sumber Model - Mobile version (accordion) */}
            <div className="lg:hidden mt-3 pt-2.5 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowMobileSumberModel(!showMobileSumberModel)}
                className="flex items-center gap-2 text-xs font-black text-slate-850 hover:text-slate-900 cursor-pointer focus:outline-none"
              >
                <Square className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                <span className="uppercase tracking-wider text-[11px]">Sumber Model Peramalan</span>
                {showMobileSumberModel ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
              {showMobileSumberModel && (
                <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed text-justify">
                    <strong className="text-emerald-800">Sumber Model:</strong> Model ML V1 memproses time series harga 5 tahun, HBKN, iklim makro (curah hujan), dan volatilitas inflasi untuk peramalan harga pangan strategis Kota Cilegon.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
