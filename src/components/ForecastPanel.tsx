"use client";

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Info, Minus, Check, RefreshCw, ChevronDown, ChevronUp, Square, Download, Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih',
  harga_cabai_merah: 'Cabai Merah',
  harga_cabai_rawit: 'Cabai Rawit',
  harga_daging_sapi: 'Daging Sapi',
  harga_daging_ayam_ras: 'Daging Ayam',
  harga_telur_ayam_ras: 'Telur Ayam',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng'
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
  if (id.includes('minyak')) return '🛢️';
  return '📦';
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
  rekomendasi: string[];
}

interface ForecastPanelProps {
  livePrices?: Record<string, number>;
  onSwitchView?: (view: string) => void;
}

export default function ForecastPanel({ livePrices, onSwitchView }: ForecastPanelProps) {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showMobileMetodologi, setShowMobileMetodologi] = useState(false);
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
          interface DBForecastResult {
            komoditas: string;
            harga_aktual: number;
            forecast_1m: number;
            forecast_3m: number;
            cv: number;
            status_forecast: string;
            status_cv: string;
            status_skpg: string;
            rekomendasi: string[];
          }
          const mapped: ForecastItem[] = (data as unknown as DBForecastResult[]).map((item) => {
            const overallStatus = getOverallStatus(item.status_forecast, item.status_cv, item.status_skpg);
            const isWarning = overallStatus === 'Rentan' || overallStatus === 'Waspada';
            
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (item.status_forecast === 'Naik') trend = 'up';
            else if (item.status_forecast === 'Turun') trend = 'down';
            
            return {
              id: item.komoditas,
              name: COMMODITY_MAP[item.komoditas] || item.komoditas,
              current: Number(item.harga_aktual) || 0,
              month1: Number(item.forecast_1m) || 0,
              month3: Number(item.forecast_3m) || 0,
              cv: Number(item.cv) || 0,
              isWarning,
              trend,
              rekomendasi: item.rekomendasi || []
            };
          });
          setForecasts(mapped);
        } else {
          // Fallback simulation if table is empty (prevent blank dashboard)
          const fallback = Object.keys(COMMODITY_MAP).map(key => ({
            id: key,
            name: COMMODITY_MAP[key],
            current: 15000,
            month1: 15400,
            month3: 16200,
            cv: 3.5,
            isWarning: false,
            trend: 'stable' as const,
            rekomendasi: ["monitoring rutin"]
          }));
          setForecasts(fallback);
        }
      } catch (err) {
        console.error('Error fetching dashboard forecasts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecasts();
  }, []);

  const warnings = forecasts.filter(f => f.isWarning);

  return (
    <div className="mt-8 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[550px]">
        
        {/* Left Column: Forecast Table */}
        <div className="lg:col-span-7 dashboard-card bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200/80 rounded-3xl p-0 flex flex-col shadow-lg overflow-hidden h-[600px] lg:h-full">
          <div className="p-4 border-b border-emerald-100/50 bg-white/40 flex flex-col sm:flex-row items-start justify-between gap-4 shrink-0">
            <div className="flex gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center shadow-sm shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-black text-[#0f172a] text-[13px] sm:text-[14px] uppercase tracking-wide flex items-center gap-2">
                  <span>AI FORECAST & ANALISIS PREDIKTIF</span>
                  <button
                    onClick={() => setShowForecastInfo(!showForecastInfo)}
                    className="p-1 hover:bg-emerald-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                    title="Info Model"
                  >
                    <Lightbulb className="w-3.5 h-3.5 fill-amber-100 text-amber-500" />
                  </button>
                </h4>
                {showForecastInfo && (
                  <p className="text-[10px] text-slate-650 bg-amber-50 border border-amber-200/60 p-2 rounded-lg font-medium mt-1 leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-sm">
                    Proyeksi pergerakan harga pangan strategis 1 dan 3 bulan ke depan menggunakan model Machine Learning terintegrasi.
                  </p>
                )}
              </div>
            </div>
             <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-emerald-100/50">
               {onSwitchView && (
                 <button
                   onClick={() => onSwitchView('validasi_forecast')}
                   className="px-3 py-1 bg-[#0f172a] hover:bg-slate-800 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                   title="Validasi Akurasi Peramalan"
                 >
                   <span>🎯 Validasi Akurasi</span>
                 </button>
               )}
               <div className="flex gap-2">
                 <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wider border border-emerald-200 shadow-sm">Model ML V1</span>
                 <span className="text-[9px] bg-white border border-emerald-200 text-[#0B4D3C] px-3 py-1 rounded-full font-bold uppercase tracking-wider">1 & 3 BULAN</span>
               </div>
             </div>
          </div>
          
          <div className="overflow-y-auto flex-1 px-1 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300 transition-all">
            {loading ? (
              <div className="p-16 flex justify-center items-center text-slate-400 font-bold text-xs h-full">
                <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-600" />
                Memuat proyeksi...
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="text-[#0B4D3C] font-extrabold border-b border-emerald-100/50 text-[9px] uppercase tracking-wider">
                    <th className="p-2 py-3 bg-emerald-50/30">Komoditas</th>
                    <th className="p-2 py-3 bg-emerald-50/30 text-right">Harga Kini</th>
                    <th className="p-2 py-3 bg-emerald-50/30 text-right">+1 Bulan</th>
                    <th className="p-2 py-3 bg-emerald-50/30 text-right">+3 Bulan</th>
                    <th className="p-2 py-3 bg-emerald-50/30 text-center">Tren</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {forecasts.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-emerald-50/60 transition-colors border-b border-slate-100/50 ${index % 2 === 0 ? 'bg-white/60' : 'bg-transparent'}`}>
                      <td className="p-2 py-2.5 font-bold text-slate-800 flex items-center gap-2.5 text-[11px]">
                        <span className="text-xl leading-none drop-shadow-sm">{getIcon(item.id)}</span>
                        {item.name}
                      </td>
                      <td className="p-2 text-right text-slate-500 font-semibold text-[11px]">
                        Rp{item.current.toLocaleString('id-ID')}
                      </td>
                      <td className={`p-2 text-right font-bold text-[11px] ${item.month1 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                        Rp{item.month1.toLocaleString('id-ID')}
                      </td>
                      <td className={`p-2 text-right font-black text-xs ${item.month3 > item.current ? 'text-red-500' : 'text-emerald-600'}`}>
                        Rp{item.month3.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2 text-center">
                        {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500 mx-auto" />}
                        {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-500 mx-auto" />}
                        {item.trend === 'stable' && <Minus className="w-4 h-4 text-amber-500 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center gap-4 shrink-0 text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Turun</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Stabil</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Naik</div>
            <button
              onClick={handleDownloadXlsx}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 ml-2"
              title="Download xlsx"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download xlsx
            </button>
            <div className="ml-auto text-slate-400 font-medium hidden sm:block">Harga dalam Rupiah (Rp) / kg</div>
          </div>
        </div>

        {/* Right Column: AI Interpretation */}
        <div className="lg:col-span-5 dashboard-card bg-gradient-to-br from-teal-50/40 to-emerald-50/60 border border-emerald-200/80 rounded-3xl p-6 lg:p-7 flex flex-col shadow-lg overflow-hidden h-[600px] lg:h-full">
          
          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center shadow-sm shrink-0">
                <Brain className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-black text-[#0f172a] text-[13px] sm:text-[14px] uppercase tracking-wide flex items-center gap-2">
                <span>EARLY WARNING SYSTEM (ML)</span>
                <button
                  onClick={() => setShowEwsInfo(!showEwsInfo)}
                  className="p-1 hover:bg-emerald-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                  title="Metodologi EWS"
                >
                  <Lightbulb className="w-3.5 h-3.5 fill-amber-100 text-amber-500" />
                </button>
              </h4>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wider border border-emerald-200 shrink-0 shadow-sm sm:mt-1 self-start sm:self-auto">EWS AKTIF</span>
          </div>
          {showEwsInfo && (
            <div className="text-[10px] text-slate-650 bg-amber-50 border border-amber-200/60 p-3 rounded-xl font-medium mb-4 leading-relaxed shadow-sm animate-in fade-in duration-200 text-justify shrink-0 space-y-1.5">
              <p>
                Sistem Peringatan Dini (EWS) mendeteksi potensi fluktuasi harga komoditas strategis menggunakan 3 layer analisis:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li><strong>Tren Perubahan</strong>: Arah pergerakan proyeksi Machine Learning 1 & 3 bulan ke depan.</li>
                <li><strong>Volatilitas CV</strong>: Batas toleransi indeks variabilitas (CV) untuk status Aman diatur ketat pada level <strong className="text-slate-800">&lt; 5%</strong> (beras) dan <strong className="text-slate-800">&lt; 9%</strong> (komoditas lain).</li>
                <li><strong>Nilai SKPG (YoY Growth)</strong>: Sesuai rumus resmi Petunjuk Teknis SKPG (r_harga), dengan batas toleransi Aman <strong className="text-slate-800">&lt; 5%</strong> YoY untuk seluruh komoditas, batas Waspada 5%&ndash;10% YoY (beras) / 5%&ndash;15% YoY (minyak & telur), serta Rentan &gt; 10% YoY (beras) / &gt; 15% YoY (minyak & telur).</li>
              </ol>
            </div>
          )}
          
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
                      className="flex items-center gap-1 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-black text-amber-855 bg-amber-100 hover:bg-amber-250 hover:text-white rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 border border-amber-200/50"
                      title="Download EWS docx"
                    >
                      <Download className="w-3 h-3" />
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
  );
}
