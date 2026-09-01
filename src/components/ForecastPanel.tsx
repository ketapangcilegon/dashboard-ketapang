"use client";

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Info, Minus, Check, RefreshCw, ChevronDown, ChevronUp, Square, Download, Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras Medium',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih (Bonggol)',
  harga_cabai_merah: 'Cabai Merah (Besar)',
  harga_cabai_merah_keriting: 'Cabai Merah Keriting',
  harga_cabai_rawit_merah: 'Cabai Rawit Merah',
  harga_cabai_rawit_hijau: 'Cabai Rawit Hijau',
  harga_cabai_rawit: 'Cabai Rawit Merah',
  harga_daging_sapi: 'Daging Sapi (Murni)',
  harga_daging_ayam_ras: 'Daging Ayam Ras',
  harga_telur_ayam_ras: 'Telur Ayam Ras',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng (Kemasan)',
  harga_tepung_terigu: 'Tepung Terigu (Kemasan)'
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

const SHORT_KEY_MAP: Record<string, string> = {
  harga_beras: 'beras',
  harga_bawang_merah: 'bawang_merah',
  harga_bawang_putih: 'bawang_putih',
  harga_cabai_merah: 'cabe_merah',
  harga_cabai_merah_keriting: 'cabe_merah_keriting',
  harga_cabai_rawit_merah: 'cabe_rawit_merah',
  harga_cabai_rawit_hijau: 'cabe_rawit_hijau',
  harga_cabai_rawit: 'cabe_rawit_merah',
  harga_daging_sapi: 'daging_sapi',
  harga_daging_ayam_ras: 'daging_ayam',
  harga_telur_ayam_ras: 'telur',
  harga_gula_pasir: 'gula_pasir',
  harga_minyak_goreng: 'minyak_goreng_kemasan',
  harga_tepung_terigu: 'tepung_terigu'
};

const getIcon = (id: string) => {
  if (id.includes('beras')) return '🌾';
  if (id.includes('bawang_merah')) return '🧅';
  if (id.includes('bawang_putih')) return '🧄';
  if (id.includes('cabai')) return '🌶️';
  if (id.includes('sapi')) return '🥩';
  if (id.includes('ayam') && !id.includes('telur')) return '🐔';
  if (id.includes('telur')) return '🥚';
  if (id.includes('gula')) return '🍚';
  if (id.includes('minyak')) return '🧴';
  if (id.includes('tepung')) return '🌾';
  return '📦';
};

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
  isWarning: boolean;
  trend: 'up' | 'down' | 'stable';
  changePct: number;
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
  status_forecast: string;
  status_cv: string;
  status_skpg: string;
  perubahan_pct?: number;
  rekomendasi: string[];
}

export default function ForecastPanel({ livePrices, onSwitchView }: ForecastPanelProps) {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [rawDbData, setRawDbData] = useState<DBForecastResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showMobileMetodologi, setShowMobileMetodologi] = useState(false);
  const [showMobileSumberModel, setShowMobileSumberModel] = useState(false);
  const [showForecastInfo, setShowForecastInfo] = useState(false);
  const [showEwsInfo, setShowEwsInfo] = useState(false);

  const hasLivePrices = Boolean(livePrices && Object.keys(livePrices).length > 0 && Object.values(livePrices).some(v => v > 0));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDownloadXlsx = () => {
    const headers = [["Komoditas", "Harga Aktual (Rp/kg)", "Forecast +1 Bulan (Rp/kg)", "Forecast +3 Bulan (Rp/kg)", "Indeks Variasi (CV)", "Tren"]];
    const rows = forecasts.map(item => [
      item.name,
      item.current,
      item.month1,
      item.month3,
      item.cv,
      item.trend === 'up' ? 'Naik' : item.trend === 'down' ? 'Turun' : 'Stabil'
    ]);
    const data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Forecast");
    XLSX.writeFile(wb, "AI_Forecast_Pangan_Strategis.xlsx");
  };

  const handleDownloadEwsDocx = () => {
    if (warnings.length === 0) return;

    const contentHtml = warnings.map(w => {
      return `
        <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #fed7aa; background-color: #fff7ed; border-radius: 8px;">
          <h3 style="color: #c2410c; margin-top: 0; font-size: 14pt; border-bottom: 1px solid #ffedd5; padding-bottom: 5px;">
            ${w.name.toUpperCase()}
          </h3>
          <p><strong>Status Risiko:</strong> <span style="color: #dc2626; font-weight: bold;">WASPADA / RENTAN</span></p>
          <p><strong>Interpretasi AI:</strong> Komoditas ini terdeteksi memiliki peningkatan risiko fluktuasi harga yang signifikan berdasarkan 3 layer analisis (Tren Perubahan, Volatilitas CV, dan Nilai SKPG YoY Growth). Proyeksi harga untuk 3 bulan ke depan diperkirakan mencapai <strong>Rp ${Math.round(w.month3).toLocaleString('id-ID')}/kg</strong> dengan indeks variabilitas (CV) sebesar <strong>${w.cv.toFixed(1)}%</strong>.</p>
          <p><strong>Rekomendasi Intervensi:</strong></p>
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
          Laporan Peringatan Dini Kerentanan Harga Pangan Strategis - Dibuat secara otomatis oleh AI GovTech pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

  const getOverallStatus = (statusForecast: string, statusCV: string, statusSKPG: string) => {
    if (statusForecast === 'Turun') return 'Aman';
    if (statusCV === 'RENTAN' || statusSKPG === 'RENTAN') return 'Rentan';
    if (statusCV === 'WASPADA' || statusSKPG === 'WASPADA' || statusForecast === 'Naik') return 'Waspada';
    return 'Aman';
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
      const shortKey = SHORT_KEY_MAP[item.komoditas];
      const liveVal = livePrices && shortKey ? livePrices[shortKey] : undefined;
      // Gunakan live price jika tersedia dari SAGON, fallback ke harga aktual bulanan DB (Agustus 2026)
      const current = (liveVal && liveVal > 0) ? liveVal : (Number(item.harga_aktual) || 0);
      const month1 = Number(item.forecast_1m) || 0;
      
      const changePct = current > 0 ? ((month1 - current) / current) * 100 : 0;
      let statusForecast = item.status_forecast;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePct > 3) {
        trend = 'up';
        statusForecast = 'Naik';
      } else if (changePct < -3) {
        trend = 'down';
        statusForecast = 'Turun';
      } else {
        trend = 'stable';
        statusForecast = 'Stabil';
      }

      const overallStatus = getOverallStatus(statusForecast, item.status_cv, item.status_skpg);
      const isWarning = overallStatus === 'Rentan' || overallStatus === 'Waspada';

      return {
        id: item.komoditas,
        name: COMMODITY_MAP[item.komoditas] || item.komoditas,
        current,
        month1,
        month3: Number(item.forecast_3m) || 0,
        cv: Number(item.cv) || 0,
        isWarning,
        trend,
        changePct,
        rekomendasi: item.rekomendasi || []
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
          {/* Header OUTSIDE & ABOVE panel box (Mockup 1 Match) */}
          <div className="mb-3">
            <div className="flex items-stretch gap-2.5">
              <div className="w-[3px] bg-emerald-600 rounded-full shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-wide">
                    PERAMALAN HARGA PANGAN
                  </h3>
                  <button
                    onClick={() => setShowForecastInfo(!showForecastInfo)}
                    className="p-1 hover:bg-amber-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                    title="Info Model"
                  >
                    <Lightbulb className="w-4 h-4 fill-amber-100 text-amber-500" />
                  </button>
                </div>
                <div className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-wide">
                  (ML FORECASTING)
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 italic mt-0.5">
                  Proyeksi 1 & 3 bulan ke depan
                </p>
              </div>
            </div>
            {showForecastInfo && (
              <div className="mt-2 ml-3 text-[10px] text-slate-650 bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-md">
                Proyeksi pergerakan harga pangan strategis 1 dan 3 bulan ke depan menggunakan model Machine Learning terintegrasi.
              </div>
            )}
          </div>

          {/* Left Column Card: Forecast Table */}
          <div className="dashboard-card bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200/80 rounded-3xl p-0 flex flex-col shadow-lg overflow-hidden h-[600px] lg:h-[550px] flex-1">
            <div className="overflow-y-auto flex-1 px-1 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 transition-all">
              {loading ? (
                <div className="p-16 flex justify-center items-center text-slate-400 font-bold text-xs h-full">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-600" />
                  Memuat proyeksi...
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                    <tr className="text-[#0B4D3C] font-extrabold border-b border-emerald-100/50 text-[11px] uppercase tracking-wide">
                      <th className="p-2 py-3 bg-emerald-50/50 align-middle whitespace-normal">KOMODITAS</th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right whitespace-normal">
                        <div className="leading-tight">HARGA AKTUAL</div>
                        <div className="text-[9.5px] font-bold text-slate-400 mt-0.5">
                          {hasLivePrices ? (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                              SAGON LIVE
                            </span>
                          ) : (
                            getBaselineMonthStr()
                          )}
                        </div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right whitespace-normal">
                        <div className="leading-tight">PERAMALAN +1 BULAN</div>
                        <div className="text-[9.5px] font-bold text-slate-400 mt-0.5">{getT1MonthStr()}</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-right whitespace-normal">
                        <div className="leading-tight">PERAMALAN +3 BULAN</div>
                        <div className="text-[9.5px] font-bold text-slate-400 mt-0.5">{getT3MonthStr()}</div>
                      </th>
                      <th className="p-2 py-3 bg-emerald-50/50 text-center align-middle whitespace-normal">
                        <div className="leading-tight">ARAH TREN +1 BULAN</div>
                        <div className="text-[9.5px] font-bold text-slate-400 mt-0.5">(L1)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    {forecasts.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-emerald-200/50 transition-colors border-b border-emerald-100/60 ${index % 2 === 0 ? 'bg-emerald-50/70' : 'bg-emerald-100/35'}`}>
                        <td className="p-2 py-2.5 font-bold text-slate-800 flex items-center gap-2.5 text-[11px]">
                          <span className="text-xl leading-none drop-shadow-sm">{getIcon(item.id)}</span>
                          {item.name}
                        </td>
                        <td className="p-2 text-right text-slate-800 font-extrabold text-[11px]">
                          Rp{item.current.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-2 text-right font-bold text-[11px] ${item.month1 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                          Rp{item.month1.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-2 text-right font-black text-xs ${item.month3 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                          Rp{item.month3.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center gap-1 font-bold text-[11px] ${
                            item.trend === 'up' 
                              ? 'text-red-500' 
                              : item.trend === 'down' 
                              ? 'text-emerald-600' 
                              : 'text-amber-500'
                          }`}>
                            {item.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                            {item.trend === 'stable' && <Minus className="w-3.5 h-3.5 shrink-0" />}
                            <span className="font-mono text-[10.5px]">
                              {item.changePct > 0 ? `+${item.changePct.toFixed(1)}%` : `${item.changePct.toFixed(1)}%`}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-3 px-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 text-[10px] font-bold text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Turun</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Stabil</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Naik</div>
                <button
                  onClick={handleDownloadXlsx}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 ml-1"
                  title="Download xlsx"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download xlsx
                </button>
              </div>
              {onSwitchView && (
                <button
                  onClick={() => onSwitchView('validasi_forecast')}
                  className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white text-[9.5px] font-black rounded-lg uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                  title="Validasi Akurasi Peramalan"
                >
                  <span>🎯 Validasi Akurasi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: EWS Header + Card (Capture 1 Fix) */}
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
              <div className="mt-2 ml-3 text-[10px] text-slate-650 bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-md">
                Sistem Peringatan Dini (EWS) mendeteksi potensi fluktuasi harga komoditas strategis menggunakan 3 layer analisis (ML Trend, CV Volatilitas, dan SKPG YoY).
              </div>
            )}
          </div>

          {/* Right Column Card: EWS Panel */}
          <div className="dashboard-card bg-gradient-to-br from-teal-50/40 to-emerald-50/60 border border-emerald-200/80 rounded-3xl p-6 lg:p-7 flex flex-col shadow-lg overflow-hidden h-[600px] lg:h-[550px] flex-1">
          
          <div className="flex-1 flex flex-col min-h-0">

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 pr-2">
              {loading ? (
                <div className="py-24 text-center text-slate-450 font-bold text-xs">
                  Mengevaluasi status kerentanan pangan...
                </div>
              ) : warnings.length > 0 ? (
                <div className="bg-amber-50/70 border border-amber-200/60 p-5 rounded-2xl relative border-r-[6px] border-r-amber-500 shadow-inner min-h-full">
                  <div className="flex items-center justify-between border-b border-amber-200/40 pb-3 mb-5 shrink-0">
                    <div className="flex items-center gap-2.5 text-amber-750 font-black text-[10px] sm:text-[10.5px] uppercase tracking-wider">
                      <div className="p-1.5 bg-amber-200/50 rounded-full text-amber-700 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 fill-amber-600 text-[#fffbeb]" />
                      </div>
                      <span>EWS AKTIF</span>
                    </div>
                    <button
                      onClick={handleDownloadEwsDocx}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] sm:text-[9.5px] font-black text-amber-855 bg-amber-100 hover:bg-amber-250 hover:text-white rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 border border-amber-200/60"
                      title="Download EWS docx"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download docx
                    </button>
                  </div>
                  <ul className="space-y-3">
                    {warnings.map(w => {
                      const isExpanded = !!expandedIds[w.id];
                      return (
                        <li key={w.id} className="bg-white rounded-xl border border-amber-200/40 shadow-sm overflow-hidden animate-in fade-in duration-300">
                          <button
                            onClick={() => toggleExpand(w.id)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-amber-50/25 transition-colors cursor-pointer text-left focus:outline-none group text-xs font-black uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-amber-50 rounded-full border border-amber-100 shrink-0 flex items-center justify-center">
                                <span className="text-2xl leading-none drop-shadow-sm block">{getIcon(w.id)}</span>
                              </div>
                              <span className="text-slate-800 font-extrabold text-xs uppercase tracking-wider">{w.name}</span>
                            </div>
                            <div className="p-1 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200/50 transition-colors shrink-0 flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-amber-100/50 text-slate-700 bg-amber-50/5 leading-relaxed text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                              <span className="text-slate-650">terdeteksi memiliki peningkatan risiko. Proyeksi harga 3 bulan: </span>
                              <strong className="text-amber-705 font-bold">Rp{w.month3.toLocaleString('id-ID')}</strong>{' '}
                              <span className="text-slate-500">(CV: </span>
                              <strong className="text-amber-705 font-bold">{w.cv.toFixed(1)}%</strong>
                              <span className="text-slate-500">).</span>
                              <br />
                              <span className="text-[11px] text-slate-550 mt-2 block italic font-bold">
                                Rekomendasi: {w.rekomendasi.join(', ')}.
                              </span>
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
                    <p className="text-xs text-emerald-700/80 leading-relaxed">Seluruh komoditas strategis diprediksi stabil (CV dan SKPG dalam batas aman) untuk rentang waktu ke depan.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sumber Model - Desktop version (always visible) */}
          <div className="hidden lg:flex mt-5 pt-4 items-start gap-3 shrink-0">
            <div className="shrink-0 mt-0.5 text-emerald-600">
              <Check className="w-4 h-4 font-bold" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed text-justify">
                <strong className="text-emerald-800">Sumber Model:</strong> Model ML V1 (Regresi OLS Bermusim + Custom GBDT + Custom RF) memproses historis time series harga pangan 5 tahun terakhir, pengaruh HBKN, iklim makro (curah hujan), dan volatilitas inflasi secara dinamis untuk peramalan harga pangan strategis Kota Cilegon.
              </p>
            </div>
          </div>

          {/* Sumber Model - Mobile version (accordion) */}
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => setShowMobileSumberModel(!showMobileSumberModel)}
              className="flex items-center gap-2 text-xs font-black text-slate-850 hover:text-slate-900 cursor-pointer focus:outline-none"
            >
              <Square className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
              <span className="uppercase tracking-wider">Sumber Model Peramalan</span>
              {showMobileSumberModel ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
            {showMobileSumberModel && (
              <div className="mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-105 animate-in fade-in duration-200">
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed text-justify">
                  <strong className="text-emerald-800">Sumber Model:</strong> Model ML V1 (Regresi OLS Bermusim + Custom GBDT + Custom RF) memproses historis time series harga pangan 5 tahun terakhir, pengaruh HBKN, iklim makro (curah hujan), dan volatilitas inflasi secara dinamis untuk peramalan harga pangan strategis Kota Cilegon.
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
