/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, ArrowLeft, RefreshCw, AlertTriangle, Info, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih',
  harga_cabai_merah: 'Cabai Merah',
  harga_cabai_rawit: 'Cabai Rawit',
  harga_daging_sapi: 'Daging Sapi',
  harga_daging_ayam_ras: 'Daging Ayam Ras',
  harga_telur_ayam_ras: 'Telur Ayam Ras',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng'
};

export default function ForecastPage() {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('harga_beras');
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [latestActuals, setLatestActuals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast results and historical data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch latest forecasts from database
      const { data: fcData, error: fcError } = await supabase
        .from('forecast_result')
        .select('*');
        
      if (fcError) {
        if (fcError.message.includes('does not exist')) {
          throw new Error('Tabel forecast_result belum dibuat di database. Silakan jalankan migrasi migrate_forecast_result.sql terlebih dahulu.');
        }
        throw fcError;
      }
      setForecasts(fcData || []);

      // 2. Fetch history from forecast_dataset
      const { data: histData, error: histError } = await supabase
        .from('forecast_dataset')
        .select('*')
        .order('tahun', { ascending: true })
        .order('bulan', { ascending: true });

      if (histError) throw histError;
      
      const allHistory = histData || [];
      setHistory(allHistory);

      // 3. Find the latest actual prices for each commodity
      const actuals: Record<string, number> = {};
      if (allHistory.length > 0) {
        Object.keys(COMMODITY_MAP).forEach(comm => {
          let idx = allHistory.length - 1;
          while (idx >= 0 && (allHistory[idx][comm] === null || allHistory[idx][comm] <= 0)) {
            idx--;
          }
          if (idx >= 0) {
            actuals[comm] = allHistory[idx][comm];
          }
        });
      }
      setLatestActuals(actuals);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data peramalan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trigger training pipeline
  const handleTrainModel = async () => {
    setTraining(true);
    setError(null);
    try {
      const res = await fetch('/api/ml/train', { method: 'POST' });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat melatih ulang model.');
      }
      
      await loadData();
      alert('Model Machine Learning berhasil dilatih ulang dan prediksi diperbarui!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  };

  // Helper to format Indonesian month names
  const getMonthName = (monthNum: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return months[monthNum - 1] || `${monthNum}`;
  };

  // Build chart dataset for the selected commodity
  const getChartData = () => {
    if (history.length === 0) return [];
    
    // Get last 12 months of actual history
    const commodityHistory = history
      .filter(row => row[selectedCommodity] !== null && row[selectedCommodity] > 0)
      .slice(-12)
      .map(row => ({
        name: `${getMonthName(row.bulan)} ${String(row.tahun).slice(-2)}`,
        price: row[selectedCommodity],
        forecast: null,
        lower_bound: null,
        upper_bound: null
      }));
      
    // Find forecast rows for the selected commodity
    const commodityForecasts = forecasts.filter(f => f.komoditas === selectedCommodity);
    const f1 = commodityForecasts.find(f => f.periode === '1_bulan');
    const f3 = commodityForecasts.find(f => f.periode === '3_bulan');
    
    if (commodityHistory.length === 0) return [];
    
    // The anchor for the forecast line is the last actual price
    const anchor = commodityHistory[commodityHistory.length - 1];
    
    const forecastPoints: any[] = [];
    
    if (f1) {
      const dateParts = f1.tanggal_prediksi.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      
      forecastPoints.push({
        name: `${getMonthName(month)} ${String(year).slice(-2)}`,
        price: null,
        forecast: f1.prediksi_harga,
        lower_bound: f1.lower_bound,
        upper_bound: f1.upper_bound
      });
    }
    
    if (f3) {
      const dateParts = f3.tanggal_prediksi.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      
      forecastPoints.push({
        name: `${getMonthName(month)} ${String(year).slice(-2)}`,
        price: null,
        forecast: f3.prediksi_harga,
        lower_bound: f3.lower_bound,
        upper_bound: f3.upper_bound
      });
    }

    // Combine actual history with forecast line points
    const combined = [...commodityHistory];
    
    // Insert anchor prediction point (matching the last actual point) to make the lines connect smoothly
    if (forecastPoints.length > 0) {
      combined.push({
        name: anchor.name,
        price: null,
        forecast: anchor.price,
        lower_bound: anchor.price,
        upper_bound: anchor.price
      });
      combined.push(...forecastPoints);
    }
    
    return combined;
  };

  // Get active forecast details for interpretation panel
  const getActiveForecastDetails = () => {
    const commodityForecasts = forecasts.filter(f => f.komoditas === selectedCommodity);
    const f1 = commodityForecasts.find(f => f.periode === '1_bulan');
    return f1 || null;
  };

  const activeForecast = getActiveForecastDetails();

  // Format table rows
  const tableRows = Object.keys(COMMODITY_MAP).map(comm => {
    const currentPrice = latestActuals[comm] || 0;
    const commForecasts = forecasts.filter(f => f.komoditas === comm);
    const f1 = commForecasts.find(f => f.periode === '1_bulan');
    const f3 = commForecasts.find(f => f.periode === '3_bulan');
    
    const pred1 = f1?.prediksi_harga || 0;
    const pred3 = f3?.prediksi_harga || 0;
    
    const changePercent = currentPrice > 0 && pred1 > 0 
      ? ((pred1 - currentPrice) / currentPrice) * 100 
      : 0;
      
    // Determine status (naik, stabil, turun)
    let statusText = 'Stabil';
    let statusIcon = '🟡';
    if (changePercent > 1.5) {
      statusText = 'Naik';
      statusIcon = '🔴';
    } else if (changePercent < -1.5) {
      statusText = 'Turun';
      statusIcon = '🟢';
    }

    return {
      key: comm,
      name: COMMODITY_MAP[comm],
      current: currentPrice,
      pred1,
      pred3,
      changePercent,
      confidence: f1?.akurasi || 0,
      statusText,
      statusIcon
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
            </Link>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-indigo-600" />
              Forecasting Harga Pangan
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Peramalan Harga Strategis Kota Cilegon Menggunakan Multimodel Machine Learning</p>
          </div>
          
          <button
            onClick={handleTrainModel}
            disabled={training || loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-95 ${
              training ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
            }`}
            id="train-btn"
          >
            <RefreshCw className={`w-4 h-4 ${training ? 'animate-spin' : ''}`} />
            {training ? 'Melatih Ulang Model...' : 'Latih Ulang Model'}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-800">Terjadi Kesalahan</h3>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {forecasts.length === 0 && !loading && !error && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800">Data Prediksi Kosong</h4>
                <p className="text-xs text-amber-700 mt-1">Model peramalan belum pernah dijalankan. Silakan klik tombol **Latih Ulang Model** untuk melatih model pertama kali dan menghasilkan prediksi.</p>
              </div>
            </div>
            <button
              onClick={handleTrainModel}
              disabled={training}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Latih Model Sekarang
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. Forecast Table Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Daftar Proyeksi Harga Pangan Strategis
              </h3>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                Cilegon City
              </span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="p-16 flex justify-center items-center text-slate-400 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-500" />
                  Memuat data proyeksi...
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 shadow-sm border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 font-bold text-slate-600">Komoditas</th>
                      <th className="p-3.5 font-bold text-slate-600 text-right">Harga Saat Ini</th>
                      <th className="p-3.5 font-bold text-slate-600 text-right">Prediksi 1 Bulan</th>
                      <th className="p-3.5 font-bold text-slate-600 text-right">Prediksi 3 Bulan</th>
                      <th className="p-3.5 font-bold text-slate-600 text-right">Perubahan %</th>
                      <th className="p-3.5 font-bold text-slate-600 text-center">Confidence</th>
                      <th className="p-3.5 font-bold text-slate-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map(row => (
                      <tr 
                        key={row.key} 
                        onClick={() => setSelectedCommodity(row.key)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          selectedCommodity === row.key ? 'bg-indigo-50/40 font-bold border-l-4 border-l-indigo-600' : ''
                        }`}
                      >
                        <td className="p-3.5 text-slate-900 font-medium">{row.name}</td>
                        <td className="p-3.5 text-right font-mono">
                          {row.current > 0 ? `Rp ${row.current.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-mono text-indigo-600">
                          {row.pred1 > 0 ? `Rp ${row.pred1.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-600">
                          {row.pred3 > 0 ? `Rp ${row.pred3.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className={`p-3.5 text-right font-mono ${
                          row.changePercent > 1.5 ? 'text-rose-600' : row.changePercent < -1.5 ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {row.pred1 > 0 ? (row.changePercent > 0 ? `+${row.changePercent.toFixed(1)}%` : `${row.changePercent.toFixed(1)}%`) : '-'}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          {row.pred1 > 0 ? `${row.confidence.toFixed(1)}%` : '-'}
                        </td>
                        <td className="p-3.5 text-center text-xs whitespace-nowrap">
                          {row.pred1 > 0 ? (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              row.statusText === 'Naik' ? 'bg-rose-100 text-rose-800' : row.statusText === 'Turun' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.statusIcon} {row.statusText}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-1">
            
            {/* 2. Explainability Panel Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Mengapa Model Memberi Prediksi Ini?
                </h3>
                
                {loading ? (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs">
                    Menganalisis...
                  </div>
                ) : activeForecast ? (
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {activeForecast.narasi}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3 h-3 text-slate-400" />
                        3 Faktor Utama Kontributor:
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {activeForecast.faktor_utama.map((factor: string, idx: number) => (
                          <li 
                            key={idx}
                            className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 text-slate-700 font-medium hover:bg-slate-100/50 transition-colors"
                          >
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold leading-relaxed">
                    Tidak ada interpretasi model aktif. <br/>Klik Latih Ulang Model untuk melatih model.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Model MAPE: {activeForecast ? `${activeForecast.mape.toFixed(1)}%` : '-'}
                </span>
                <span>
                  Target: 1 & 3 Bulan Ke Depan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Trend Historical + Forecast Chart Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Tren Historis & Forecast: <strong className="text-indigo-600 font-black">{COMMODITY_MAP[selectedCommodity]}</strong>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Menampilkan 12 bulan harga historis (garis solid) dan proyeksi ke depan (garis putus-putus)</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-0.5 bg-indigo-600 border-2 border-indigo-600 rounded"></span> Historis
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-0.5 bg-emerald-500 border-t-2 border-dashed border-emerald-500 rounded"></span> Forecast
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-300 border-t-2 border-dotted border-slate-400 rounded"></span> Interval Batas
              </span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            {loading ? (
              <div className="flex justify-center items-center h-full text-slate-400 font-bold">
                Membuat grafik...
              </div>
            ) : getChartData().length === 0 ? (
              <div className="flex justify-center items-center h-full text-slate-400 font-bold text-center">
                Data historis tidak mencukupi atau prediksi kosong.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tickFormatter={(tick) => `Rp ${tick.toLocaleString('id-ID')}`}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    stroke="#cbd5e1"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`Rp ${parseFloat(value).toLocaleString('id-ID')}`]}
                    labelStyle={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}
                    contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  
                  {/* Historical price line */}
                  <Line 
                    name="Harga Aktual"
                    type="monotone" 
                    dataKey="price" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 1 }} 
                    activeDot={{ r: 6 }} 
                    connectNulls
                  />
                  
                  {/* Forecasted price line */}
                  <Line 
                    name="Harga Forecast"
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    strokeDasharray="6 4"
                    dot={{ r: 4, strokeWidth: 1 }} 
                    connectNulls
                  />
                  
                  {/* Confidence Interval upper and lower bounds */}
                  <Line 
                    name="Batas Atas"
                    type="monotone" 
                    dataKey="upper_bound" 
                    stroke="#94a3b8" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                  <Line 
                    name="Batas Bawah"
                    type="monotone" 
                    dataKey="lower_bound" 
                    stroke="#94a3b8" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
