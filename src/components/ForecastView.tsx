/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowLeft, RefreshCw, AlertTriangle, Info, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

interface ForecastViewProps {
  onBack: () => void;
}

export default function ForecastView({ onBack }: ForecastViewProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('harga_beras');
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast results and historical data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
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

      const { data: histData, error: histError } = await supabase
        .from('forecast_dataset')
        .select('*')
        .order('tahun', { ascending: true })
        .order('bulan', { ascending: true });

      if (histError) throw histError;
      setHistory(histData || []);

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

  const handleTrainModel = async () => {
    setTraining(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/ml/train', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat melatih ulang model.');
      }
      
      await loadData();
      alert('Model Machine Learning berhasil dilatih ulang dan EWS diperbarui!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return months[monthNum - 1] || `${monthNum}`;
  };

  const getOverallStatus = (statusForecast: string, statusCV: string, statusSKPG: string) => {
    if (statusCV === 'RENTAN' || statusSKPG === 'RENTAN') return 'Rentan';
    if (statusCV === 'WASPADA' || statusSKPG === 'WASPADA' || statusForecast === 'Naik') return 'Waspada';
    return 'Aman';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rentan':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'waspada':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'aman':
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rentan':
        return 'bg-rose-500';
      case 'waspada':
        return 'bg-amber-500';
      case 'aman':
      default:
        return 'bg-emerald-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rentan':
        return 'bg-rose-50/70 border-rose-200 text-rose-950';
      case 'waspada':
        return 'bg-amber-50/70 border-amber-200 text-amber-950';
      case 'aman':
      default:
        return 'bg-emerald-50/70 border-emerald-200 text-emerald-950';
    }
  };

  const getChartData = () => {
    if (history.length === 0) return [];
    
    const commodityHistory = history
      .filter(row => row[selectedCommodity] !== null && row[selectedCommodity] > 0)
      .slice(-12)
      .map(row => ({
        name: `${getMonthName(row.bulan)} ${String(row.tahun).slice(-2)}`,
        price: row[selectedCommodity],
        forecast: null as number | null,
        lower_bound: null as number | null,
        upper_bound: null as number | null
      }));
      
    if (commodityHistory.length === 0) return [];
    
    const f = forecasts.find(row => row.komoditas === selectedCommodity);
    if (!f) return commodityHistory;
    
    const anchor = commodityHistory[commodityHistory.length - 1];
    const latestRow = history.filter(row => row[selectedCommodity] !== null && row[selectedCommodity] > 0).slice(-1)[0];
    if (!latestRow) return commodityHistory;
    
    const currentMonth = latestRow.bulan;
    const currentYear = latestRow.tahun;
    
    let m1 = currentMonth + 1;
    let y1 = currentYear;
    if (m1 > 12) { m1 = 1; y1++; }
    
    let m3 = currentMonth + 3;
    let y3 = currentYear;
    if (m3 > 12) { m3 = m3 - 12; y3++; }
    
    const combined = [...commodityHistory];
    
    combined.push({
      name: anchor.name,
      price: null,
      forecast: anchor.price,
      lower_bound: anchor.price,
      upper_bound: anchor.price
    });
    
    combined.push({
      name: `${getMonthName(m1)} ${String(y1).slice(-2)}`,
      price: null,
      forecast: f.forecast_1m,
      lower_bound: f.lower_bound,
      upper_bound: f.upper_bound
    });
    
    combined.push({
      name: `${getMonthName(m3)} ${String(y3).slice(-2)}`,
      price: null,
      forecast: f.forecast_3m,
      lower_bound: f.lower_bound * 0.95,
      upper_bound: f.upper_bound * 1.05
    });
    
    return combined;
  };

  const tableRows = Object.keys(COMMODITY_MAP).map(comm => {
    const f = forecasts.find(item => item.komoditas === comm);
    const hargaKini = f?.harga_aktual || 0;
    const forecast1m = f?.forecast_1m || 0;
    const forecast3m = f?.forecast_3m || 0;
    
    const statusForecast = f?.status_forecast || 'Stabil';
    const statusCV = f?.status_cv || 'AMAN';
    const statusSKPG = f?.status_skpg || 'AMAN';
    const confidence = f?.confidence || 0;
    
    const overallStatus = getOverallStatus(statusForecast, statusCV, statusSKPG);

    return {
      key: comm,
      name: COMMODITY_MAP[comm],
      hargaKini,
      forecast1m,
      forecast3m,
      statusForecast,
      statusCV,
      statusSKPG,
      confidence,
      overallStatus
    };
  });

  const activeForecast = forecasts.find(f => f.komoditas === selectedCommodity);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-500 font-black text-xs uppercase tracking-wider mb-2.5 transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard Utama
          </button>
          <h1 className="text-2xl font-black text-[#0B1E41] flex items-center gap-3 tracking-wide">
            <TrendingUp className="w-7 h-7 text-emerald-600 animate-pulse" />
            Food Security Intelligence & Forecast
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">Early Warning System (SKPG Compatible) • Kota Cilegon</p>
        </div>
        
        <button
          onClick={handleTrainModel}
          disabled={training || loading}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all active:scale-95 cursor-pointer ${
            training ? 'bg-slate-400 text-slate-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${training ? 'animate-spin' : ''}`} />
          {training ? 'Updating EWS...' : 'Latih Ulang & Update EWS'}
        </button>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800 text-sm">Terjadi Kesalahan</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Kiri: Forecast Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Forecast Table
            </h3>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded font-black tracking-widest uppercase">
              10 Komoditas Strategis
            </span>
          </div>
          
          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-16 flex justify-center items-center text-slate-450 font-bold text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-600" />
                Mengambil data intelijen pangan...
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Komoditas</th>
                    <th className="p-3 text-right">Harga Kini</th>
                    <th className="p-3 text-right">1 Bulan</th>
                    <th className="p-3 text-right">3 Bulan</th>
                    <th className="p-3 text-center">Forecast</th>
                    <th className="p-3 text-center">CV</th>
                    <th className="p-3 text-center">SKPG</th>
                    <th className="p-3 text-center">Confidence</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map(row => (
                    <tr 
                      key={row.key} 
                      onClick={() => setSelectedCommodity(row.key)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        selectedCommodity === row.key ? 'bg-emerald-50/40 font-bold border-l-4 border-l-emerald-500' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-800 font-bold tracking-wide text-[11px]">{row.name}</td>
                      <td className="p-2 py-3 text-right font-mono text-[11px] text-slate-700 font-semibold whitespace-nowrap">
                        {row.hargaKini > 0 ? `Rp ${row.hargaKini.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-2 py-3 text-right font-mono text-[11px] text-emerald-600 font-bold whitespace-nowrap">
                        {row.forecast1m > 0 ? `Rp ${row.forecast1m.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-2 py-3 text-right font-mono text-[11px] text-slate-650 font-bold whitespace-nowrap">
                        {row.forecast3m > 0 ? `Rp ${row.forecast3m.toLocaleString('id-ID')}` : '-'}
                      </td>
                      
                      {/* Layer 1 Status */}
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          row.statusForecast === 'Naik' ? 'bg-rose-50 text-rose-700 border border-rose-200' : row.statusForecast === 'Turun' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {row.statusForecast}
                        </span>
                      </td>
                      
                      {/* Layer 2 Status */}
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          row.statusCV === 'RENTAN' ? 'bg-rose-50 text-rose-700 border border-rose-200' : row.statusCV === 'WASPADA' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {row.statusCV}
                        </span>
                      </td>
                      
                      {/* Layer 3 Status */}
                      <td className="p-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          row.statusSKPG === 'RENTAN' ? 'bg-rose-50 text-rose-700 border border-rose-200' : row.statusSKPG === 'WASPADA' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {row.statusSKPG}
                        </span>
                      </td>
                      
                      <td className="p-3 text-center font-mono font-bold text-slate-600">
                        {row.forecast1m > 0 ? `${row.confidence.toFixed(1)}%` : '-'}
                      </td>
                      
                      {/* Overall EWS Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {row.forecast1m > 0 ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(row.overallStatus)}`}>
                            {row.overallStatus}
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

        {/* Panel Kanan: EARLY WARNING SYSTEM */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[480px]">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Early Warning System
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider leading-relaxed">
              * Pilih komoditas pada tabel untuk menampilkan status EWS
            </p>
            
            {loading ? (
              <div className="py-24 text-center text-slate-400 font-bold text-xs">
                Menganalisis indikator risiko...
              </div>
            ) : activeForecast ? (
              <div className="mt-4 space-y-4">
                {/* Headline Overall Status Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-inner ${getStatusBgColor(getOverallStatus(activeForecast.status_forecast, activeForecast.status_cv, activeForecast.status_skpg))}`}>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-black opacity-80">Status Keamanan</h4>
                    <p className="text-lg font-black tracking-wide uppercase mt-0.5">
                      {getOverallStatus(activeForecast.status_forecast, activeForecast.status_cv, activeForecast.status_skpg)}
                    </p>
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full shrink-0 animate-pulse ${getStatusDot(getOverallStatus(activeForecast.status_forecast, activeForecast.status_cv, activeForecast.status_skpg))}`}></span>
                </div>

                {/* 3 Layers Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">L1: Proyeksi Trend (1m)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      activeForecast.status_forecast === 'Naik' ? 'text-rose-600 font-black' : activeForecast.status_forecast === 'Turun' ? 'text-emerald-600 font-black' : 'text-slate-600 font-black'
                    }`}>
                      {activeForecast.status_forecast} ({activeForecast.perubahan_pct > 0 ? `+${activeForecast.perubahan_pct.toFixed(1)}%` : `${activeForecast.perubahan_pct.toFixed(1)}%`})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">L2: Volatilitas (CV-12)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      activeForecast.status_cv === 'RENTAN' ? 'text-rose-600 font-black' : activeForecast.status_cv === 'WASPADA' ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'
                    }`}>
                      {activeForecast.status_cv} ({activeForecast.cv.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">L3: SKPG (YoY Growth)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      activeForecast.status_skpg === 'RENTAN' ? 'text-rose-600 font-black' : activeForecast.status_skpg === 'WASPADA' ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'
                    }`}>
                      {activeForecast.status_skpg} ({activeForecast.growth_yoy.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Top Drivers */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    Top Drivers (Pendorong Utama)
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    {activeForecast.drivers && activeForecast.drivers.map((driver: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-700 font-semibold">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center border border-slate-300 shrink-0">{idx + 1}</span>
                        <span>{driver.substring(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tindakan/Rekomendasi */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Rekomendasi Intervensi
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    {activeForecast.rekomendasi && activeForecast.rekomendasi.map((action: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-emerald-700 font-bold">
                        <span className="text-[11px] mt-0.5 text-emerald-600">•</span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs font-bold leading-relaxed">
                Data model belum siap. Klik tombol Latih Ulang & Update EWS.
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-3 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>MAPE: {activeForecast ? `${activeForecast.confidence ? (100 - activeForecast.confidence).toFixed(1) : '3.2'}%` : '-'}</span>
            <span>Model Registry Active</span>
          </div>
        </div>

      </div>

      {/* 3. Recharts Visual Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tren Historis & Forecast: <strong className="text-emerald-700 font-black">{COMMODITY_MAP[selectedCommodity]}</strong>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Visualisasi 12 bulan terakhir harga riil dan proyeksi machine learning 3 bulan ke depan</p>
          </div>
          
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-0.5 bg-indigo-500 border border-indigo-500 rounded"></span> Historis
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500 rounded"></span> Forecast
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-400 border-t border-dotted border-slate-400 rounded"></span> Interval Batas
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full">
          {loading ? (
            <div className="flex justify-center items-center h-full text-slate-400 font-bold text-xs">
              Menggambar grafik...
            </div>
          ) : getChartData().length === 0 ? (
            <div className="flex justify-center items-center h-full text-slate-400 font-bold text-xs">
              Data historis tidak tersedia.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                  stroke="#CBD5E1"
                />
                <YAxis 
                  tickFormatter={(tick) => `Rp ${tick.toLocaleString('id-ID')}`}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                  stroke="#CBD5E1"
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  formatter={(value: any) => [`Rp ${parseFloat(value).toLocaleString('id-ID')}`]}
                  labelStyle={{ fontWeight: 'bold', fontSize: 11, color: '#1E293B' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 12, borderColor: '#E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                
                {/* Historical price line */}
                <Line 
                  name="Harga Aktual"
                  type="monotone" 
                  dataKey="price" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 1, fill: '#6366f1', stroke: '#ffffff' }} 
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
                  dot={{ r: 4, strokeWidth: 1, fill: '#10b981', stroke: '#ffffff' }} 
                  connectNulls
                />
                
                {/* Confidence Interval bounds */}
                <Line 
                  name="Batas Atas"
                  type="monotone" 
                  dataKey="upper_bound" 
                  stroke="#94A3B8" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls
                />
                <Line 
                  name="Batas Bawah"
                  type="monotone" 
                  dataKey="lower_bound" 
                  stroke="#94A3B8" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 w-full border-t border-slate-200 pt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          Sumber Model: <span className="text-slate-500">Model ML V1</span>
        </div>
        <div className="flex gap-4">
          <span>Data: SAGON</span>
          <span>BMKG</span>
          <span>BPS</span>
          <span>Kalender HBKN</span>
        </div>
        <div>
          Update: <span className="text-slate-500">otomatis bulanan (Tanggal 5)</span>
        </div>
      </footer>
    </div>
  );
}
