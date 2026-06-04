"use client";

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, Server, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MLDatasetAdmin() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDataset = async () => {
    setLoading(true);
    try {
      const { data: rows, error: fetchErr } = await supabase
        .from('harga_pangan_ml')
        .select('*')
        .order('tahun', { ascending: false })
        .order('bulan', { ascending: false });

      if (fetchErr) throw fetchErr;
      setData(rows || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data dari Supabase. Pastikan tabel harga_pangan_ml sudah dibuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
    
    // Attempt to load last sync time from localStorage
    const savedTime = localStorage.getItem('ml_last_sync');
    if (savedTime) setLastSync(savedTime);
  }, []);

  const handleRefreshDataset = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/etl-ml', { method: 'POST' });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Terjadi kesalahan saat mengeksekusi pipeline ETL');
      }
      
      const now = new Date().toLocaleString('id-ID');
      setLastSync(now);
      localStorage.setItem('ml_last_sync', now);
      
      // Reload table data
      await fetchDataset();
      alert(`Sinkronisasi berhasil! Total data: ${json.totalRows} bulan`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    
    // Get all unique keys from data
    const headers = Array.from(new Set(data.flatMap(Object.keys)));
    // Put id, tahun, bulan first if they exist
    const orderedHeaders = ['id', 'tahun', 'bulan', ...headers.filter(h => !['id', 'tahun', 'bulan', 'created_at'].includes(h))];
    
    const csvContent = [
      orderedHeaders.join(','),
      ...data.map(row => 
        orderedHeaders.map(header => {
          const val = row[header];
          return val === null || val === undefined ? '' : val;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ml_dataset_harga_pangan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get columns to display in table (exclude id and created_at to save space)
  const columns = data.length > 0 
    ? Array.from(new Set(data.flatMap(Object.keys))).filter(c => c !== 'id' && c !== 'created_at').sort()
    : [];
    
  // Force tahun and bulan to front
  const displayCols = ['tahun', 'bulan', ...columns.filter(c => c !== 'tahun' && c !== 'bulan')];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
            </Link>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Database className="w-7 h-7 text-emerald-500" />
              Admin: Machine Learning Dataset
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Pipeline ETL Ekstraksi Harga Pangan SAGON (Format WIDE)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshDataset}
              disabled={syncing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-95 ${syncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'}`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Memproses ETL...' : 'Refresh Dataset (Scrape SAGON)'}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={data.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-rose-800">Terjadi Kesalahan</h3>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
              {error.includes('does not exist') && (
                <p className="text-xs font-mono bg-rose-100 p-2 rounded mt-2 text-rose-900">
                  Jalankan SQL: CREATE TABLE harga_pangan_ml (id BIGSERIAL PRIMARY KEY, tahun INT, bulan INT, harga_beras INT, ... UNIQUE(tahun, bulan));
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-1">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Server className="w-5 h-5 text-blue-500" />
              Status Sinkronisasi
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Record (Bulan)</p>
                <p className="text-3xl font-black text-slate-800">{data.length} <span className="text-sm font-medium text-slate-500">baris</span></p>
                {data.length < 60 && !loading && (
                  <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Target: 60 bulan (2022-2026)
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Update Terakhir</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-bold text-slate-700">{lastSync || 'Belum ada data sinkronisasi lokal'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 md:col-span-2 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Preview Data Tabel: <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">harga_pangan_ml</code></h3>
            </div>
            
            <div className="overflow-x-auto flex-1 max-h-[500px]">
              {loading ? (
                <div className="p-10 flex justify-center items-center h-full text-slate-400 font-bold">
                  Memuat data...
                </div>
              ) : data.length === 0 ? (
                <div className="p-10 flex justify-center items-center h-full text-slate-400 font-bold text-center">
                  Data kosong. <br/>Klik Refresh Dataset untuk menarik data dari SAGON.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                    <tr>
                      {displayCols.map(col => (
                        <th key={col} className="p-3 font-bold text-slate-600 border-b border-slate-200">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                        {displayCols.map(col => (
                          <td key={col} className={`p-3 ${['tahun', 'bulan'].includes(col) ? 'font-bold bg-slate-50/50' : 'text-slate-600'}`}>
                            {row[col] === null ? '-' : row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
