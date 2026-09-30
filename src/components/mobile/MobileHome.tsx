/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, MapPin, Store, Sparkles, Target, Activity, 
  Camera, Bot, Layers, ChevronRight, TrendingUp, TrendingDown,
  ArrowRight, Sparkle, AlertCircle, CheckCircle2, ChevronLeft,
  LineChart
} from 'lucide-react';
import MediaCarousel from '@/components/MediaCarousel';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import VisitCounter from '@/components/VisitCounter';
import { supabase } from '@/lib/supabase';
import MobileFsvaKelurahanModal, { FsvaPriorityDef, FsvaKelurahanItem } from './MobileFsvaKelurahanModal';
import { BASELINE_KELURAHAN_DATA } from '@/lib/thematic-indicators';
import { KEL_TO_KEC } from '@/lib/wilayah';

interface MobileForecastItem {
  key: string;
  name: string;
  icon: string;
  aktual: number;
  month1: number;
  month3: number;
  trend: 'up' | 'down' | 'stable';
  changePct: number;
  status: string;
}

interface MobileHomeProps {
  onNavigate: (view: string) => void;
  onOpenCatalog: () => void;
  livePrices?: Record<string, number> | null;
  liveDate?: string | null;
  overallScore?: number;
  balitaStatus?: string;
  ikpData?: any[];
  fsvaMatangData?: any[];
  benchmarkCurrentData?: Record<number, number>;
  benchmarkList?: any[];
}

export default function MobileHome({
  onNavigate,
  onOpenCatalog,
  livePrices,
  liveDate,
  overallScore = 82.4,
  balitaStatus = 'AMAN',
  ikpData = [],
  fsvaMatangData = [],
  benchmarkCurrentData,
  benchmarkList = [],
}: MobileHomeProps) {

  // Latest IKP Score calculated dynamically from Supabase ikpData
  const latestIkpScore = useMemo(() => {
    if (ikpData && ikpData.length > 0) {
      const row2025 = ikpData.find(x => x.tahun === 2025);
      if (row2025 && row2025.ikp_cilegon) return parseFloat(row2025.ikp_cilegon);
      const last = ikpData[ikpData.length - 1];
      if (last && last.ikp_cilegon) return parseFloat(last.ikp_cilegon);
    }
    return overallScore || 76.15;
  }, [ikpData, overallScore]);

  // Dynamic FSVA 2025 Priority Breakdown (Only priorities with count > 0)
  const fsvaPriorityCards = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    if (fsvaMatangData && fsvaMatangData.length > 0) {
      fsvaMatangData.forEach((row: any) => {
        let p = row.prioritas ? Number(row.prioritas) : 0;
        if (!p || p < 1 || p > 6) {
          const ikp = parseFloat(row.ikp || '0');
          if (ikp < 46.37) p = 1;
          else if (ikp < 53.95) p = 2;
          else if (ikp < 61.83) p = 3;
          else if (ikp < 69.71) p = 4;
          else if (ikp < 77.29) p = 5;
          else p = 6;
        }
        counts[p] = (counts[p] || 0) + 1;
      });
    } else {
      // Official 2025 FSVA 43 Kelurahan calculation from public/fsva_interaktif_2024_2025.xlsx
      counts[1] = 0;
      counts[2] = 10;
      counts[3] = 3;
      counts[4] = 13;
      counts[5] = 5;
      counts[6] = 12;
    }

    // FSVA standard definitions directly matched to Capture 5 legend & FSVA_LEGEND
    const priorityDefs = [
      { p: 6, code: 'P6', title: 'Sangat Tahan', color: '#3b703b', bg: '#f0fdf4', border: '#bbf7d0', textCol: '#166534' },
      { p: 5, code: 'P5', title: 'Tahan', color: '#94c945', bg: '#f7fee7', border: '#d9f99d', textCol: '#3f6212' },
      { p: 4, code: 'P4', title: 'Agak Tahan', color: '#c9e077', bg: '#fefce8', border: '#fef08a', textCol: '#713f12' },
      { p: 3, code: 'P3', title: 'Agak Rentan', color: '#f4a1a7', bg: '#fff1f2', border: '#fecdd3', textCol: '#9f1239' },
      { p: 2, code: 'P2', title: 'Rentan', color: '#e85961', bg: '#fff1f2', border: '#fda4af', textCol: '#881337' },
      { p: 1, code: 'P1', title: 'Sangat Rentan', color: '#6e1f1f', bg: '#fef2f2', border: '#fca5a5', textCol: '#450a0a' },
    ];

    // Filter ONLY priorities that have kelurahans (count > 0)
    return priorityDefs
      .map(def => ({ ...def, count: counts[def.p] || 0 }))
      .filter(def => def.count > 0);
  }, [fsvaMatangData]);

  // Selected FSVA Priority for Detail Modal Table
  const [selectedPriority, setSelectedPriority] = useState<FsvaPriorityDef | null>(null);

  // All 43 Kelurahans mapped with FSVA Priority and IKP
  const allFsvaKelurahans = useMemo<FsvaKelurahanItem[]>(() => {
    if (fsvaMatangData && fsvaMatangData.length > 0) {
      return fsvaMatangData.map((row: any) => {
        const nama = row.nama_kelurahan || row.kelurahan || '';
        const kecamatan = row.nama_kecamatan || row.kecamatan || KEL_TO_KEC[nama] || '-';
        const ikp = parseFloat(row.ikp || row.ikp_score || row.skor_ikp || '0');
        let p = row.prioritas ? Number(row.prioritas) : 0;
        if (!p || p < 1 || p > 6) {
          if (ikp < 46.37) p = 1;
          else if (ikp < 53.95) p = 2;
          else if (ikp < 61.83) p = 3;
          else if (ikp < 69.71) p = 4;
          else if (ikp < 77.29) p = 5;
          else p = 6;
        }
        return {
          nama,
          kecamatan,
          ikp,
          prioritas: p
        };
      });
    }

    // Fallback to official 2025 FSVA 43 Kelurahan dataset
    return Object.values(BASELINE_KELURAHAN_DATA).map(item => ({
      nama: item.nama,
      kecamatan: item.kecamatan,
      ikp: item.ikpScore || 0,
      prioritas: item.fsvaPriority || 5
    }));
  }, [fsvaMatangData]);

  // Filter kelurahans for selected priority
  const activePriorityKelurahans = useMemo(() => {
    if (!selectedPriority) return [];
    return allFsvaKelurahans.filter(k => k.prioritas === selectedPriority.p);
  }, [selectedPriority, allFsvaKelurahans]);

  // 4 Komoditas Harga Terkini (SAGON)
  const commodities = [
    { key: 'beras_medium', name: 'Beras Medium', price: livePrices?.['beras_medium'] || 14500, unit: 'kg', trend: 0 },
    { key: 'cabai_rawit_merah', name: 'Cabai Rawit', price: livePrices?.['cabai_rawit_merah'] || livePrices?.['cabai_rawit'] || 48000, unit: 'kg', trend: 2.1 },
    { key: 'bawang_merah', name: 'Bawang Merah', price: livePrices?.['bawang_merah'] || 32667, unit: 'kg', trend: -1.5 },
    { key: 'telur_ayam', name: 'Telur Ayam', price: livePrices?.['telur_ayam'] || livePrices?.['telur'] || 28500, unit: 'kg', trend: 0.5 },
  ];

  // 2 Komoditas Peramalan Harga Pangan (+1 dan +3 Bulan) - Telur Ayam Ras & Cabai Merah Keriting (Capture 1)
  const [forecastItems, setForecastItems] = useState<MobileForecastItem[]>([
    {
      key: 'harga_telur_ayam_ras',
      name: 'Telur Ayam Ras',
      icon: '🥚',
      aktual: 25899,
      month1: 26894,
      month3: 27276,
      trend: 'up',
      changePct: 3.8,
      status: 'Naik',
    },
    {
      key: 'harga_cabai_merah_keriting',
      name: 'Cabai Merah Keriting',
      icon: '🌶️',
      aktual: 39855,
      month1: 42465,
      month3: 42465,
      trend: 'up',
      changePct: 6.6,
      status: 'Naik',
    },
  ]);

  useEffect(() => {
    async function loadForecasts() {
      try {
        const { data, error } = await supabase
          .from('forecast_result')
          .select('*')
          .in('komoditas', ['harga_telur_ayam_ras', 'harga_cabai_merah_keriting', 'harga_cabai_merah']);
        
        if (!error && data && data.length > 0) {
          const nameMap: Record<string, { name: string; icon: string }> = {
            harga_telur_ayam_ras: { name: 'Telur Ayam Ras', icon: '🥚' },
            harga_cabai_merah_keriting: { name: 'Cabai Merah Keriting', icon: '🌶️' },
            harga_cabai_merah: { name: 'Cabai Merah Keriting', icon: '🌶️' },
          };
          const mapped = data.map((d: any) => {
            const meta = nameMap[d.komoditas] || { name: 'Komoditas', icon: '📦' };
            const pct = Number(d.perubahan_pct) || 0;
            return {
              key: d.komoditas,
              name: meta.name,
              icon: meta.icon,
              aktual: Number(d.harga_aktual) || 0,
              month1: Number(d.forecast_1m) || 0,
              month3: Number(d.forecast_3m) || 0,
              trend: (pct > 3 ? 'up' : pct < -3 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
              changePct: pct,
              status: d.status_forecast || (pct > 3 ? 'Naik' : pct < -3 ? 'Turun' : 'Stabil'),
            };
          });
          const telur = mapped.find(x => x.key === 'harga_telur_ayam_ras');
          const cabai = mapped.find(x => x.key === 'harga_cabai_merah_keriting') || mapped.find(x => x.key === 'harga_cabai_merah');
          if (telur && cabai) {
            setForecastItems([telur, cabai]);
          } else if (telur) {
            setForecastItems(prev => [telur, prev[1]]);
          } else if (cabai) {
            setForecastItems(prev => [prev[0], cabai]);
          }
        }
      } catch (err) {
        // use default state
      }
    }
    loadForecasts();
  }, []);

  // 8 Fitur Unggulan Tiles (Android Launcher Style)
  const quickFeatures = [
    {
      id: 'peta_full',
      name: 'Peta Tematik',
      tag: 'Spasial GIS',
      icon: <MapPin className="w-5 h-5 text-white" />,
      gradient: 'from-[#007A48] via-[#059669] to-[#10B981]',
    },
    {
      id: 'harga_full',
      name: 'Harga Pasar',
      tag: 'SAGON Live',
      icon: <Store className="w-5 h-5 text-white" />,
      gradient: 'from-[#D97706] via-[#F59E0B] to-[#F97316]',
    },
    {
      id: 'forecasting',
      name: 'Forecast EWS',
      tag: 'Prediksi ML',
      icon: <Sparkles className="w-5 h-5 text-white" />,
      gradient: 'from-[#1D4ED8] via-[#2563EB] to-[#06B6D4]',
    },
    {
      id: 'radar_kelurahan',
      name: 'Radar Pangan',
      tag: 'Kel vs Kec',
      icon: <Target className="w-5 h-5 text-white" />,
      gradient: 'from-[#0F766E] via-[#0D9488] to-[#14B8A6]',
    },
    {
      id: 'analisis_skpg',
      name: 'SKPG Bulanan',
      tag: 'Kewaspadaan',
      icon: <Activity className="w-5 h-5 text-white" />,
      gradient: 'from-[#4338CA] via-[#6366F1] to-[#8B5CF6]',
    },
    {
      id: 'kamera_cerdas',
      name: 'Kamera Cerdas',
      tag: 'IoT Telemetri',
      icon: <Camera className="w-5 h-5 text-white" />,
      gradient: 'from-[#334155] via-[#475569] to-[#64748B]',
    },
    {
      id: 'ai_intelligence',
      name: 'AI Insight',
      tag: 'Chat Intelijen',
      icon: <Bot className="w-5 h-5 text-white" />,
      gradient: 'from-[#047857] via-[#10B981] to-[#34D399]',
    },
    {
      id: 'ketersediaan',
      name: 'Aspek FSVA',
      tag: '3 Pilar Gizi',
      icon: <Layers className="w-5 h-5 text-white" />,
      gradient: 'from-[#044D2E] via-[#006038] to-[#059669]',
    },
  ];

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto animate-in fade-in duration-200">
      
      {/* 1. Media & Informasi Carousel Eksisting Desktop (Autoplay & Tertaut Admin) */}
      <div className="w-full rounded-2xl overflow-hidden shadow-xs border border-emerald-100/80">
        <MediaCarousel />
      </div>

      {/* 2. Segmen Panel Harga Pasar Terkini (SAGON) - 4 Komoditas */}
      <div className="bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 p-3.5 rounded-3xl border border-emerald-200/80 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                  HARGA PASAR TERKINI (SAGON)
                </h3>
                <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-[9px] font-semibold text-emerald-700/80">Pantauan komoditas pasar harian Cilegon</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('harga_full')}
            className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Snap Scroll 4 Commodity Prices */}
        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar snap-x">
          {commodities.map((c, i) => (
            <div 
              key={i} 
              onClick={() => onNavigate('harga_full')}
              className="min-w-[130px] p-3 rounded-2xl bg-white/95 border border-emerald-100/90 shadow-2xs snap-start shrink-0 cursor-pointer active:scale-95 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] font-extrabold text-slate-600 truncate">{c.name}</p>
                <p className="text-sm font-black text-emerald-950 mt-1">
                  Rp {c.price.toLocaleString('id-ID')}
                  <span className="text-[9px] font-medium text-slate-400">/{c.unit}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {c.trend > 0 ? (
                  <span className="inline-flex items-center text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +{c.trend}%
                  </span>
                ) : c.trend < 0 ? (
                  <span className="inline-flex items-center text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> {c.trend}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    Stabil
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Segmen Panel Peramalan Harga Pangan +1 dan +3 Bulan - 2 Komoditas (Capture 1: Telur Ayam Ras & Cabai Merah Keriting, Pintasan Pertahankan) */}
      <div className="bg-gradient-to-br from-[#064E3B] via-[#043E30] to-[#022C22] text-white p-3.5 rounded-3xl border border-emerald-500/40 shadow-lg shadow-emerald-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs text-white tracking-tight leading-tight">
                Peramalan Harga Pangan +1 dan +3 Bulan
              </h3>
              <p className="text-[9px] font-bold text-emerald-200/80">Model Machine Learning Time-Series & EWS</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('forecasting')}
            className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-[10px] font-black flex items-center gap-0.5 cursor-pointer shrink-0 active:scale-95 transition-all"
            title="Lihat Detail Peramalan"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2 Komoditas Forecast Cards in 2-Column Grid (Capture 1) */}
        <div className="grid grid-cols-2 gap-2">
          {forecastItems.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => onNavigate('forecasting')}
              className="p-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/60 transition-all cursor-pointer flex flex-col justify-between"
              title={`Buka analisis forecast untuk ${item.name}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black text-white truncate flex items-center gap-1">
                    <span>{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                    item.trend === 'up' 
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40' 
                      : item.trend === 'down' 
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' 
                      : 'bg-slate-700/60 text-slate-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-200/70 font-medium">Aktual:</span>
                    <span className="font-extrabold text-slate-100">Rp {item.aktual.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-cyan-300 font-bold">+1 Bulan:</span>
                    <span className="font-black text-cyan-200">Rp {item.month1.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-teal-300 font-bold">+3 Bulan:</span>
                    <span className="font-black text-teal-200">Rp {item.month3.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pintasan untuk lihat lebih lengkap (Capture 1 - Pertahankan) */}
        <button
          onClick={() => onNavigate('forecasting')}
          className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[10px] font-black flex items-center justify-between transition-all cursor-pointer active:scale-98"
        >
          <span>Lihat Peramalan & Early Warning System Selengkapnya</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
        </button>
      </div>

      {/* 4. Indeks Ketahanan Pangan Cilegon 2025 Card */}
      <div 
        className="bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#E6F4EA] p-4 rounded-3xl border border-emerald-300/80 shadow-sm shadow-emerald-900/5 transition-all hover:border-emerald-400"
      >
        {/* Header IKP (Indeks Ketahanan Pangan Cilegon 2025, klik masuk grafik IKP) */}
        <div 
          onClick={() => onNavigate('grafik_ikp')}
          className="flex items-center justify-between pb-3 border-b border-emerald-200/70 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-emerald-950">
                Indeks Ketahanan Pangan Cilegon 2025
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.2 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                  {latestIkpScore >= 70 ? 'Tahan Pangan' : 'Waspada'}
                </span>
                <span className="text-[11px] font-black text-emerald-900">
                  Skor IKP FSVA: <strong className="text-emerald-700">{latestIkpScore.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</strong> / 100
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Kotak Hasil FSVA 2025 per Prioritas (Prioritas X [Title], bawahnya X kelurahan, klik buka tabel rincian kelurahan) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3">
          {fsvaPriorityCards.map((item) => (
            <div 
              key={item.p}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPriority(item);
              }}
              className="rounded-2xl p-2.5 flex flex-col justify-between transition-all shadow-xs border cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 group"
              style={{ backgroundColor: item.bg, borderColor: item.border }}
              title={`Klik untuk melihat daftar kelurahan Prioritas ${item.p} (${item.title})`}
            >
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] font-black uppercase tracking-tight leading-tight" style={{ color: item.textCol }}>
                  Prioritas {item.p} {item.title}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-900">
                  {item.count} kelurahan
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Sektor / Fitur Unggulan (Launcher 8 Tiles) */}
      <div className="bg-gradient-to-br from-white via-emerald-50/40 to-[#ECFDF5]/60 p-3.5 rounded-3xl border border-emerald-200/80 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
              Sektor & Fitur Unggulan
            </h3>
          </div>
          <button 
            onClick={onOpenCatalog}
            className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
          >
            <span>Lihat semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 8 Android App Launcher Tiles (Grid 4 x 2) */}
        <div className="grid grid-cols-4 gap-2">
          {quickFeatures.map((feat) => (
            <button
              key={feat.id}
              onClick={() => onNavigate(feat.id)}
              className="flex flex-col items-center p-2 rounded-2xl bg-white/95 border border-emerald-100 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer active:scale-92 group text-center"
            >
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                {feat.icon}
              </div>
              <span className="text-[10px] font-extrabold text-slate-800 mt-1.5 leading-tight truncate w-full">
                {feat.name}
              </span>
              <span className="text-[8px] font-bold text-emerald-700 leading-none mt-0.5 truncate w-full">
                {feat.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Banner Pintasan Peta GIS */}
      <div 
        onClick={() => onNavigate('peta_full')}
        className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#022C22] via-[#064E3B] to-[#043E30] text-white border border-emerald-600/40 shadow-md shadow-emerald-950/20 cursor-pointer hover:border-emerald-400 transition-all active:scale-98"
      >
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-xs text-white">Peta Spasial Ketahanan Pangan</h4>
              <p className="text-[10px] text-emerald-200/90 font-medium">
                Sebaran wilayah, kerentanan FSVA & SKPG 43 Kelurahan
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Thematic Map Preview Thumbnail Banner */}
        <div className="mx-3.5 mb-3.5 relative h-24 rounded-2xl overflow-hidden bg-slate-900 border border-emerald-500/30">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-85"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80')` 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-transparent flex items-center p-4">
            <div className="space-y-1 text-white">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider shadow-xs">
                GIS Interaktif
              </span>
              <p className="text-xs font-black drop-shadow-sm">
                8 Kecamatan • 43 Kelurahan
              </p>
              <p className="text-[10px] text-emerald-200 font-medium">
                Sentuh untuk membuka peta interaktif penuh
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Panel Capaian Indikator Ketahanan Pangan Cilegon & Nasional 5 Tahun Terakhir (Capture 2 & Mobile First) */}
      <div className="w-full">
        <BenchmarkPanel 
          currentData={benchmarkCurrentData} 
          dbBenchmarkList={benchmarkList} 
          defaultOpen={false} 
          mobileFirst={true} 
        />
      </div>

      {/* 8. Segmen Jumlah Pengunjung & Identitas Platform */}
      <div className="pt-2 pb-4 flex flex-col items-center justify-center space-y-1.5 text-center">
        <VisitCounter className="bg-white/95 border border-emerald-200/90 text-slate-600 shadow-2xs hover:border-emerald-300" />
        <p className="text-[10px] text-slate-400 font-semibold tracking-tight">
          PANCI • Platform Analisis Pangan Cilegon • DKPP Kota Cilegon
        </p>
      </div>

      {/* 9. Modal Tabel Rincian Kelurahan per Prioritas FSVA (Urut Skor IKP) */}
      <MobileFsvaKelurahanModal
        isOpen={!!selectedPriority}
        onClose={() => setSelectedPriority(null)}
        priorityDef={selectedPriority}
        items={activePriorityKelurahans}
        onNavigateToMap={() => onNavigate('peta_full')}
      />

    </div>
  );
}
