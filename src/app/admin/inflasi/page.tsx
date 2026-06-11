/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, Server, AlertTriangle, ArrowLeft, Cpu, TrendingUp, LineChart, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function InflationAdmin() {
  const [inflationData, setInflationData] = useState<any[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch both inflation data and ML metrics history
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch inflation data
      const { data: infRows, error: infErr } = await supabase
        .from('inflasi_ml')
        .select('*')
        .order('tahun', { ascending: false })
        .order('bulan', { ascending: false });

      if (infErr) throw infErr;
      setInflationData(infRows || []);

      // 2. Fetch ML metrics history
      const { data: metricRows, error: metricErr } = await supabase
        .from('ml_metrics')
        .select('*')
        .order('trained_at', { ascending: false })
        .limit(10); // Show last 10 retraining sessions

      if (metricErr && !metricErr.message.includes('does not exist')) {
        throw metricErr;
      }
      setMetricsHistory(metricRows || []);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data dari Supabase. Pastikan tabel inflasi_ml dan ml_metrics sudah dibuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger main ETL pipeline (synchronizes food price, weather and inflation data)
  const handleSyncData = async () => {
    setSyncing(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/etl-ml', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat sinkronisasi ETL.');
      }
      
      // Reload table data
      await fetchData();
      alert(`Sinkronisasi ETL Berhasil!\nUpdate Cuaca: ${json.weatherUpdated}\nUpdate Inflasi: ${json.inflationUpdated}`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Trigger model retraining
  const handleRetrainModel = async () => {
    setRetraining(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/ml/retrain', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat melatih ulang model.');
      }
      
      // Reload metrics and database log
      await fetchData();
      alert(`Retraining model ML sukses!\nMAE Baru: ${json.metrics.mae}\nRMSE Baru: ${json.metrics.rmse}\nMAPE Baru: ${json.metrics.mape}%`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetraining(false);
    }
  };

  // Export current inflation dataset to CSV
  const handleExportCSV = () => {
    if (inflationData.length === 0) return;
    
    const headers = ['tahun', 'bulan', 'ihk', 'inflasi_mtm', 'inflasi_yoy'];
    const csvContent = [
      headers.join(','),
      ...inflationData.map(row => 
        headers.map(header => {
          const val = row[header];
          return val === null || val === undefined ? '' : val;
        }).join(',')
      )
    ].join('\n');
    
    const filename = 'inflasi_cilegon_bps.csv';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format Indonesian month name
  const getMonthName = (monthNum: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNum - 1] || `Bulan ${monthNum}`;
  };

  // Extract latest metrics for display cards
  const latestMetric = metricsHistory.length > 0 ? metricsHistory[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <Link href="/admin/ml-dataset" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Ke Admin ML Dataset
            </Link>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-indigo-600" />
              Admin: Inflasi BPS & Retraining ML
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Pengelolaan Data Inflasi Bulanan BPS Kota Cilegon & Evaluasi Retraining Model</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncData}
              disabled={syncing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-95 ${syncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
              id="sync-btn"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan Data BPS'}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={inflationData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              id="export-csv-btn"
            >
              <Download className="w-4 h-4" />
              Ekspor CSV
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-800">Gagal Memproses</h3>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
              {error.includes('public.inflasi_ml') && (
                <div className="mt-2 text-xs font-medium text-slate-600">
                  <p className="mb-2 font-bold text-rose-800">Skema tabel `inflasi_ml` atau `ml_metrics` belum ditemukan.</p>
                  <p>Silakan jalankan script SQL migrasi `migrate_inflasi.sql` di Supabase SQL Editor terlebih dahulu.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Retraining Dashboard Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main ML Metric Cards */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    Model Forecast Ketapang - Metrik Performa Aktif
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Metrik dievaluasi berdasarkan view terintegrasi `forecast_dataset`</p>
                </div>
                
                <button
                  onClick={handleRetrainModel}
                  disabled={retraining || loading || inflationData.length < 50}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white shadow transition-all active:scale-95 ${
                    retraining || loading || inflationData.length < 50
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md'
                  }`}
                  id="retrain-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
                  {retraining ? 'Retraining...' : 'Latih Ulang Model'}
                </button>
              </div>

              {inflationData.length < 50 && !loading && (
                <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Data latihan di database belum mencukupi (minimal 50 bulan untuk retraining). Lakukan sinkronisasi atau seeding data terlebih dahulu.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* MAE Card */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mean Absolute Error (MAE)</p>
                  <div className="mt-2">
                    <p className="text-2xl font-black text-slate-800">
                      {latestMetric ? `Rp ${parseFloat(latestMetric.mae).toLocaleString('id-ID')}` : '-'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Rata-rata deviasi rupiah</p>
                  </div>
                </div>

                {/* RMSE Card */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Root Mean Squared Error (RMSE)</p>
                  <div className="mt-2">
                    <p className="text-2xl font-black text-slate-800">
                      {latestMetric ? `Rp ${parseFloat(latestMetric.rmse).toLocaleString('id-ID')}` : '-'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Penalti error ekstrim</p>
                  </div>
                </div>

                {/* MAPE Card */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mean Absolute Percentage Error (MAPE)</p>
                  <div className="mt-2">
                    <p className="text-2xl font-black text-emerald-600">
                      {latestMetric ? `${latestMetric.mape}%` : '-'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Deviasi persentase relatif</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Data latih saat ini: <strong className="text-slate-700">{latestMetric?.data_rows || 0} bulan</strong>
              </span>
              <span className="font-medium">
                Terakhir retraining: <strong className="text-slate-700">{latestMetric?.trained_at ? new Date(latestMetric.trained_at).toLocaleString('id-ID') : 'Belum pernah'}</strong>
              </span>
            </div>
          </div>

          {/* Retraining History Logs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <LineChart className="w-5 h-5 text-indigo-500" />
              Riwayat Retraining Model
            </h3>
            
            <div className="space-y-3.5 overflow-y-auto max-h-[170px] pr-1">
              {metricsHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">
                  Belum ada riwayat training model.
                </div>
              ) : (
                metricsHistory.map((metric, idx) => (
                  <div key={metric.id || idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 hover:bg-slate-100/50 transition-colors">
                    <div>
                      <p className="text-xs font-black text-slate-700">Model #{metric.id || metricsHistory.length - idx}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(metric.trained_at).toLocaleDateString('id-ID')} {new Date(metric.trained_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-600">MAPE: {metric.mape}%</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Rows: {metric.data_rows}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Inflation Data Preview Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-5 h-5 text-indigo-500" />
                Data Inflasi Cilegon BPS (Tabel: <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono">inflasi_ml</code>)
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Berisi data IHK dasar 2018 (2022-2023) dan IHK dasar 2022 (2024-2026)</p>
            </div>
            
            <div className="text-xs font-bold text-slate-500 bg-slate-200/60 px-3 py-1.5 rounded-xl border border-slate-200/80">
              Total Record: {inflationData.length} Bulan
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[500px]">
            {loading ? (
              <div className="p-16 flex justify-center items-center text-slate-400 font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-500" />
                Memuat dataset inflasi...
              </div>
            ) : inflationData.length === 0 ? (
              <div className="p-16 flex flex-col justify-center items-center text-slate-400 font-bold text-center gap-2">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <span>
                  Data kosong. Silakan jalankan seeder atau klik <strong>Sinkronkan Data BPS</strong>.
                </span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                  <tr>
                    <th className="p-3.5 font-bold text-slate-600 border-b border-slate-200">Tahun</th>
                    <th className="p-3.5 font-bold text-slate-600 border-b border-slate-200">Bulan</th>
                    <th className="p-3.5 font-bold text-slate-600 border-b border-slate-200 text-right">IHK (Indeks Harga Konsumen)</th>
                    <th className="p-3.5 font-bold text-slate-600 border-b border-slate-200 text-right">Inflasi m-to-m (%)</th>
                    <th className="p-3.5 font-bold text-slate-600 border-b border-slate-200 text-right">Inflasi y-on-y (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inflationData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {row.tahun}
                      </td>
                      <td className="p-3.5 font-bold text-slate-700">
                        {getMonthName(row.bulan)}
                      </td>
                      <td className="p-3.5 text-slate-600 text-right font-mono">
                        {row.ihk !== null ? parseFloat(row.ihk).toFixed(3) : '-'}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold ${row.inflasi_mtm < 0 ? 'text-rose-600' : row.inflasi_mtm > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {row.inflasi_mtm !== null ? (row.inflasi_mtm > 0 ? `+${parseFloat(row.inflasi_mtm).toFixed(3)}%` : `${parseFloat(row.inflasi_mtm).toFixed(3)}%`) : '-'}
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold ${row.inflasi_yoy < 0 ? 'text-rose-600' : row.inflasi_yoy > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {row.inflasi_yoy !== null ? (row.inflasi_yoy > 0 ? `+${parseFloat(row.inflasi_yoy).toFixed(3)}%` : `${parseFloat(row.inflasi_yoy).toFixed(3)}%`) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
