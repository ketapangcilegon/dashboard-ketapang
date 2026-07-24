"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Award, Calendar, CheckCircle2, TrendingUp, RefreshCw, AlertCircle, BarChart3, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Map commodity raw name to display name
const COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras Medium',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih',
  harga_cabai_merah: 'Cabai Merah',
  harga_cabai_rawit: 'Cabai Rawit',
  harga_daging_sapi: 'Daging Sapi',
  harga_daging_ayam_ras: 'Daging Ayam',
  harga_telur_ayam_ras: 'Telur Ayam Ras',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng'
};

interface ValidasiForecastViewProps {
  onBack: () => void;
}

interface HistoryRow {
  komoditas: string;
  bulan: string;
  harga_aktual: number;
  forecast_1m: number;
  forecast_3m: number;
}

interface AccuracyEvaluation {
  komoditas: string;
  namaKomoditas: string;
  bulanTarget: string; // YYYY-MM-01
  hargaAktual: number;
  
  // 1-month evaluation
  pred1m: number | null;
  err1m: number | null;
  acc1m: number | null;
  
  // 3-month evaluation
  pred3m: number | null;
  err3m: number | null;
  acc3m: number | null;
}

export default function ValidasiForecastView({ onBack }: ValidasiForecastViewProps) {
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [evaluations, setEvaluations] = useState<AccuracyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedCommodity, setSelectedCommodity] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Subtraction helper to find previous months
  const subtractMonths = (dateStr: string, months: number): string => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    
    let targetMonth = month - months;
    let targetYear = year;
    
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const monthPad = String(targetMonth).padStart(2, '0');
    return `${targetYear}-${monthPad}-01`;
  };

  const formatMonthIndo = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[monthIdx]} ${year}`;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch historical forecast snapshots
        const { data, error: fetchErr } = await supabase
          .from('forecast_history')
          .select('*')
          .order('bulan', { ascending: true })
          .order('komoditas', { ascending: true });
          
        if (fetchErr) throw fetchErr;
        
        const rawHistory: HistoryRow[] = (data || []).map(row => ({
          komoditas: row.komoditas,
          bulan: row.bulan,
          harga_aktual: Number(row.harga_aktual),
          forecast_1m: Number(row.forecast_1m),
          forecast_3m: Number(row.forecast_3m)
        }));
        
        setHistoryData(rawHistory);
        
        // Process accuracy evaluations
        const evals: AccuracyEvaluation[] = [];
        
        // For matching, create a map lookup: "komoditas_bulan" -> row
        const lookup = new Map<string, HistoryRow>();
        rawHistory.forEach(row => {
          lookup.set(`${row.komoditas}_${row.bulan}`, row);
        });
        
        rawHistory.forEach(row => {
          const dateStr = row.bulan;
          const komoditas = row.komoditas;
          const currentActual = row.harga_aktual;
          
          if (currentActual <= 0) return; // Skip months with invalid actual price
          
          // 1. Evaluate 1-Month prediction made 1 month ago for this target month
          const targetPrev1 = subtractMonths(dateStr, 1);
          const row1m = lookup.get(`${komoditas}_${targetPrev1}`);
          let pred1m: number | null = null;
          let err1m: number | null = null;
          let acc1m: number | null = null;
          
          if (row1m) {
            pred1m = row1m.forecast_1m;
            err1m = Math.abs(currentActual - pred1m);
            const mape1 = (err1m / currentActual) * 100;
            acc1m = Math.max(0, 100 - mape1);
          }
          
          // 2. Evaluate 3-Month prediction made 3 months ago for this target month
          const targetPrev3 = subtractMonths(dateStr, 3);
          const row3m = lookup.get(`${komoditas}_${targetPrev3}`);
          let pred3m: number | null = null;
          let err3m: number | null = null;
          let acc3m: number | null = null;
          
          if (row3m) {
            pred3m = row3m.forecast_3m;
            err3m = Math.abs(currentActual - pred3m);
            const mape3 = (err3m / currentActual) * 100;
            acc3m = Math.max(0, 100 - mape3);
          }
          
          // Add to evaluation list if we have at least one prediction evaluated
          if (row1m || row3m) {
            evals.push({
              komoditas,
              namaKomoditas: COMMODITY_MAP[komoditas] || komoditas,
              bulanTarget: dateStr,
              hargaAktual: currentActual,
              pred1m,
              err1m,
              acc1m,
              pred3m,
              err3m,
              acc3m
            });
          }
        });
        
        // Sort newest first
        evals.sort((a, b) => b.bulanTarget.localeCompare(a.bulanTarget));
        setEvaluations(evals);
        
      } catch (err: any) {
        console.error('Error fetching/processing forecast history:', err);
        setError(err.message || 'Gagal memuat log akurasi peramalan');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  // Filter logic
  const filteredEvaluations = evaluations.filter(ev => {
    const matchComm = selectedCommodity === 'ALL' || ev.komoditas === selectedCommodity;
    const matchYear = selectedYear === 'ALL' || ev.bulanTarget.startsWith(selectedYear);
    return matchComm && matchYear;
  });

  // Calculate statistics for the filtered dataset
  const valid1m = filteredEvaluations.filter(ev => ev.acc1m !== null);
  const avgAcc1m = valid1m.length > 0 
    ? valid1m.reduce((sum, ev) => sum + (ev.acc1m || 0), 0) / valid1m.length 
    : 0;
    
  const valid3m = filteredEvaluations.filter(ev => ev.acc3m !== null);
  const avgAcc3m = valid3m.length > 0 
    ? valid3m.reduce((sum, ev) => sum + (ev.acc3m || 0), 0) / valid3m.length 
    : 0;

  // Extract unique years for filtering
  const years = Array.from(new Set(evaluations.map(ev => ev.bulanTarget.split('-')[0]))).sort();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
          Kembali ke Forecast
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black tracking-wider uppercase border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Modul Eviden Validasi Terbuka
        </div>
      </div>

      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase border-b-4 border-emerald-500 inline-block pb-2">
          LOG AKURASI & VALIDASI PERAMALAN (BACKTESTING)
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
          Halaman ini mendokumentasikan keakuratan nyata model peramalan Machine Learning dengan membandingkan nilai prediksi 1 bulan dan 3 bulan lalu terhadap harga pasar aktual dari SAGON.
        </p>
      </div>

      {loading ? (
        <div className="dashboard-card bg-white p-16 flex flex-col justify-center items-center text-slate-400 font-bold text-xs shadow-md border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
          Memproses data log histori peramalan...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm uppercase">Gagal Memproses Data</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary metrics card grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="dashboard-card bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Akurasi Rata-rata 1 Bulan</span>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">{avgAcc1m > 0 ? `${avgAcc1m.toFixed(2)}%` : 'N/A'}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">MAPE: {avgAcc1m > 0 ? `${(100 - avgAcc1m).toFixed(2)}%` : 'N/A'} (1 bulan ke depan)</p>
            </div>

            <div className="dashboard-card bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Akurasi Rata-rata 3 Bulan</span>
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">{avgAcc3m > 0 ? `${avgAcc3m.toFixed(2)}%` : 'N/A'}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">MAPE: {avgAcc3m > 0 ? `${(100 - avgAcc3m).toFixed(2)}%` : 'N/A'} (3 bulan ke depan)</p>
            </div>

            <div className="dashboard-card bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Total Sampel Evaluasi</span>
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-800">{filteredEvaluations.length}</span>
                <span className="text-xs text-slate-500 font-bold ml-1.5">sampel</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">Evaluasi lintas komoditas & waktu</p>
            </div>

            <div className="dashboard-card bg-gradient-to-br from-amber-50 to-amber-100/30 border border-amber-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Metodologi Validasi</span>
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="mt-3">
                <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Backtesting Historis</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5">Membandingkan F(T-n) terhadap A(T) riil</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider shrink-0">
              <Filter className="w-4 h-4 text-emerald-500" />
              Filter Data:
            </div>
            
            {/* Commodity Select */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Komoditas:</label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Semua Komoditas</option>
                {Object.entries(COMMODITY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Tahun Target:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Semua Tahun</option>
                {years.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Accuracy Table */}
          <div className="dashboard-card bg-white p-0 rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-3.5 py-4">Bulan Target</th>
                    <th className="p-3.5 py-4">Komoditas</th>
                    <th className="p-3.5 py-4 text-right">Harga Aktual (Riil)</th>
                    <th className="p-3.5 py-4 text-right">Prediksi 1m Lalu</th>
                    <th className="p-3.5 py-4 text-center">Akurasi 1m</th>
                    <th className="p-3.5 py-4 text-right">Prediksi 3m Lalu</th>
                    <th className="p-3.5 py-4 text-center">Akurasi 3m</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                  {filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-bold text-xs bg-slate-50/20">
                        Tidak ada log akurasi yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluations.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 py-4 font-bold text-slate-800">
                          {formatMonthIndo(ev.bulanTarget)}
                        </td>
                        <td className="p-3.5 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {ev.namaKomoditas}
                          </span>
                        </td>
                        <td className="p-3.5 py-4 text-right font-black text-slate-900">
                          Rp {ev.hargaAktual.toLocaleString('id-ID')}
                        </td>
                        
                        {/* 1 Month Evaluation */}
                        <td className="p-3.5 py-4 text-right text-slate-600">
                          {ev.pred1m !== null ? `Rp ${ev.pred1m.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3.5 py-4 text-center">
                          {ev.acc1m !== null ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              ev.acc1m >= 95 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              ev.acc1m >= 90 ? 'bg-amber-100 text-amber-850 border border-amber-200' :
                              'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {ev.acc1m.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 3 Month Evaluation */}
                        <td className="p-3.5 py-4 text-right text-slate-600">
                          {ev.pred3m !== null ? `Rp ${ev.pred3m.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3.5 py-4 text-center">
                          {ev.acc3m !== null ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              ev.acc3m >= 95 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              ev.acc3m >= 90 ? 'bg-amber-100 text-amber-850 border border-amber-200' :
                              'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {ev.acc3m.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
