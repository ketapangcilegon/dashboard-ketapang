/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, MapPin, Store, Sparkles, Target, Activity, 
  Camera, Bot, Layers, ChevronRight, TrendingUp, TrendingDown,
  ArrowRight, Sparkle, AlertCircle, CheckCircle2, ChevronLeft,
  LineChart, ChevronUp, ChevronDown, Calendar, BarChart3, Truck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MediaCarousel from '@/components/MediaCarousel';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import VisitCounter from '@/components/VisitCounter';
import { supabase } from '@/lib/supabase';
import MobileFsvaKelurahanModal, { FsvaPriorityDef, FsvaKelurahanItem } from './MobileFsvaKelurahanModal';
import { BASELINE_KELURAHAN_DATA } from '@/lib/thematic-indicators';
import { KEL_TO_KEC } from '@/lib/wilayah';

const AIIntelligenceMap = dynamic(
  () => import('@/components/AIIntelligenceMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3 min-h-[300px]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Memuat Peta Food Security Intelligence...</span>
      </div>
    ),
  }
);

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
  liveHistory?: Record<string, Record<string, number>> | null;
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
  liveHistory,
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

  // Local state if livePrices or liveHistory not provided
  const [localLivePrices, setLocalLivePrices] = useState<Record<string, number> | null>(null);
  const [localLiveDate, setLocalLiveDate] = useState<string | null>(null);
  const [localLiveHistory, setLocalLiveHistory] = useState<Record<string, Record<string, number>> | null>(null);

  useEffect(() => {
    if (livePrices && liveHistory) return;
    async function fetchSagonLive() {
      try {
        const res = await fetch('/api/harga-sagon');
        if (res.ok) {
          const d = await res.json();
          if (d.success) {
            if (d.prices) setLocalLivePrices(d.prices);
            if (d.tanggal) setLocalLiveDate(d.tanggal);
            if (d.history) setLocalLiveHistory(d.history);
          }
        }
      } catch (err) {
        console.warn('[MobileHome] Failed to load SAGON prices:', err);
      }
    }
    fetchSagonLive();
  }, [livePrices, liveHistory]);

  const effectivePrices = livePrices || localLivePrices;
  const effectiveDate = liveDate || localLiveDate;
  const effectiveHistory = liveHistory || localLiveHistory;

  // Date Navigation State for SAGON (5 Days)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const liveDateString = effectiveDate || todayStr;

  const subtractDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() - days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return dateStr;
    }
  };

  const dates = useMemo(() => [
    subtractDays(liveDateString, 4),
    subtractDays(liveDateString, 3),
    subtractDays(liveDateString, 2),
    subtractDays(liveDateString, 1),
    liveDateString
  ], [liveDateString]);

  const [dateIndex, setDateIndex] = useState(4); // Default to latest (index 4)

  // Format YYYY-MM-DD to Indonesian format
  const formatIndoDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  };

  const activeDate = dates[dateIndex];

  // Retrieve real historical price from Supabase archive without artificial formulas
  const getRealHistoricalPrice = (key: string, fallbackCur: number): number => {
    // 1. If currently on latest/live tab (index 4) and effectivePrices has value
    if (dateIndex === 4 && effectivePrices && effectivePrices[key] !== undefined && effectivePrices[key] > 0) {
      return effectivePrices[key];
    }
    // 2. If history is available from Supabase archive for this specific date
    if (effectiveHistory) {
      if (effectiveHistory[activeDate] && effectiveHistory[activeDate][key] !== undefined && effectiveHistory[activeDate][key] > 0) {
        return effectiveHistory[activeDate][key];
      }
      const availableDates = Object.keys(effectiveHistory)
        .filter(d => d <= activeDate)
        .sort()
        .reverse();
      if (availableDates.length > 0) {
        const closestDate = availableDates[0];
        if (effectiveHistory[closestDate] && effectiveHistory[closestDate][key] !== undefined && effectiveHistory[closestDate][key] > 0) {
          return effectiveHistory[closestDate][key];
        }
      }
    }
    // 3. Fallback to live prices or baseline
    if (effectivePrices && effectivePrices[key] !== undefined && effectivePrices[key] > 0) {
      return effectivePrices[key];
    }
    return fallbackCur;
  };

  const getPreviousDayPrice = (key: string, fallback: number): number => {
    if (dateIndex === 0) return getRealHistoricalPrice(key, fallback);
    const prevDate = dates[dateIndex - 1];
    if (effectiveHistory && effectiveHistory[prevDate] && effectiveHistory[prevDate][key] !== undefined && effectiveHistory[prevDate][key] > 0) {
      return effectiveHistory[prevDate][key];
    }
    return fallback;
  };

  // 13 Komoditas Lengkap SAGON
  const SAGON_COMMODITY_CONFIG = [
    { key: 'beras', name: 'Beras Medium', icon: '🍚', unit: 'kg', fallback: 13833 },
    { key: 'bawang_merah', name: 'Bawang Merah', icon: '🧅', unit: 'kg', fallback: 30000 },
    { key: 'bawang_putih', name: 'Bawang Putih', icon: '🧄', unit: 'kg', fallback: 35333 },
    { key: 'cabe_merah', name: 'Cabe Merah', icon: '🌶️', unit: 'kg', fallback: 37500 },
    { key: 'cabe_merah_keriting', name: 'Cabe M. Keriting', icon: '🌶️', unit: 'kg', fallback: 39000 },
    { key: 'cabe_rawit_merah', name: 'Cabe Rawit Merah', icon: '🌶️', unit: 'kg', fallback: 51667 },
    { key: 'cabe_rawit_hijau', name: 'Cabe Rawit Hijau', icon: '🌶️', unit: 'kg', fallback: 43333 },
    { key: 'daging_sapi', name: 'Daging Sapi', icon: '🥩', unit: 'kg', fallback: 140000 },
    { key: 'daging_ayam', name: 'Daging Ayam Ras', icon: '🍗', unit: 'kg', fallback: 40667 },
    { key: 'telur', name: 'Telur Ayam Ras', icon: '🥚', unit: 'kg', fallback: 25667 },
    { key: 'gula_pasir', name: 'Gula Pasir', icon: '🧂', unit: 'kg', fallback: 19000 },
    { key: 'minyak_goreng_kemasan', name: 'Minyak Goreng', icon: '🧴', unit: 'ltr', fallback: 19800 },
    { key: 'tepung_terigu', name: 'Tepung Terigu', icon: '🌾', unit: 'kg', fallback: 13500 },
  ];

  const sagonCommodities = useMemo(() => {
    return SAGON_COMMODITY_CONFIG.map(cfg => {
      const price = getRealHistoricalPrice(cfg.key, cfg.fallback);
      const prevPrice = getPreviousDayPrice(cfg.key, cfg.fallback);
      const diff = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      const trend = Math.round(diff * 10) / 10;
      return {
        ...cfg,
        price,
        trend,
      };
    });
  }, [dateIndex, activeDate, effectivePrices, effectiveHistory]);

  // Dynamic Indonesian Month Names for Forecast (Aktual, +1 Bulan, +3 Bulan)
  const getIndonesianMonthName = (monthIndex: number): string => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[(monthIndex + 12) % 12];
  };

  const baselineMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${getIndonesianMonthName(d.getMonth())} ${d.getFullYear()}`;
  }, []);

  const month1Str = useMemo(() => {
    const d = new Date();
    return `${getIndonesianMonthName(d.getMonth())} ${d.getFullYear()}`;
  }, []);

  const month3Str = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return `${getIndonesianMonthName(d.getMonth())} ${d.getFullYear()}`;
  }, []);

  // 13 Komoditas Lengkap Peramalan Harga Pangan
  const FORECAST_COMMODITY_ORDER = [
    { key: 'harga_beras', name: 'Beras Medium', icon: '🌾', fallbackAktual: 14500, fallback1m: 14850, fallback3m: 15100 },
    { key: 'harga_bawang_merah', name: 'Bawang Merah', icon: '🧅', fallbackAktual: 30000, fallback1m: 32000, fallback3m: 33500 },
    { key: 'harga_bawang_putih', name: 'Bawang Putih Bonggol', icon: '🧄', fallbackAktual: 35333, fallback1m: 36200, fallback3m: 37000 },
    { key: 'harga_cabai_merah', name: 'Cabai Merah Besar', icon: '🌶️', fallbackAktual: 37500, fallback1m: 39000, fallback3m: 41000 },
    { key: 'harga_cabai_merah_keriting', name: 'Cabai Merah Keriting', icon: '🌶️', fallbackAktual: 39855, fallback1m: 42465, fallback3m: 42465 },
    { key: 'harga_cabai_rawit_merah', name: 'Cabai Rawit Merah', icon: '🌶️', fallbackAktual: 51667, fallback1m: 54000, fallback3m: 56000 },
    { key: 'harga_cabai_rawit_hijau', name: 'Cabai Rawit Hijau', icon: '🌶️', fallbackAktual: 43333, fallback1m: 45000, fallback3m: 46500 },
    { key: 'harga_daging_sapi', name: 'Daging Sapi Murni', icon: '🥩', fallbackAktual: 140000, fallback1m: 142000, fallback3m: 145000 },
    { key: 'harga_daging_ayam_ras', name: 'Daging Ayam Ras', icon: '🍗', fallbackAktual: 40667, fallback1m: 41800, fallback3m: 42500 },
    { key: 'harga_telur_ayam_ras', name: 'Telur Ayam Ras', icon: '🥚', fallbackAktual: 25899, fallback1m: 26894, fallback3m: 27276 },
    { key: 'harga_gula_pasir', name: 'Gula Pasir', icon: '🧂', fallbackAktual: 19000, fallback1m: 19500, fallback3m: 19800 },
    { key: 'harga_minyak_goreng', name: 'Minyak Goreng Kemasan', icon: '🧴', fallbackAktual: 19800, fallback1m: 20200, fallback3m: 20600 },
    { key: 'harga_tepung_terigu', name: 'Tepung Terigu Kemasan', icon: '🌾', fallbackAktual: 13500, fallback1m: 13800, fallback3m: 14100 },
  ];

  const [allForecastItems, setAllForecastItems] = useState<MobileForecastItem[]>([]);
  const [activeForecastIndex, setActiveForecastIndex] = useState(0);
  const forecastScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAllForecasts() {
      try {
        const { data, error } = await supabase
          .from('forecast_result')
          .select('*');
        
        const dbMap = new Map<string, any>();
        if (!error && data && data.length > 0) {
          data.forEach((d: any) => {
            dbMap.set(d.komoditas, d);
          });
        }

        const items: MobileForecastItem[] = FORECAST_COMMODITY_ORDER.map(cfg => {
          const row = dbMap.get(cfg.key);
          const aktual = row ? (Number(row.harga_aktual) || cfg.fallbackAktual) : cfg.fallbackAktual;
          const month1 = row ? (Number(row.forecast_1m) || cfg.fallback1m) : cfg.fallback1m;
          const month3 = row ? (Number(row.forecast_3m) || cfg.fallback3m) : cfg.fallback3m;
          const pct = aktual > 0 ? ((month1 - aktual) / aktual) * 100 : (Number(row?.perubahan_pct) || 0);
          const trend = (pct > 2 ? 'up' : pct < -2 ? 'down' : 'stable') as 'up' | 'down' | 'stable';
          const status = row?.status_forecast || (pct > 2 ? 'Naik' : pct < -2 ? 'Turun' : 'Stabil');

          return {
            key: cfg.key,
            name: cfg.name,
            icon: cfg.icon,
            aktual,
            month1,
            month3,
            trend,
            changePct: Math.round(pct * 10) / 10,
            status,
          };
        });

        setAllForecastItems(items);
      } catch (err) {
        console.warn('[MobileHome] Using fallback forecasts:', err);
        const fallbackItems: MobileForecastItem[] = FORECAST_COMMODITY_ORDER.map(cfg => ({
          key: cfg.key,
          name: cfg.name,
          icon: cfg.icon,
          aktual: cfg.fallbackAktual,
          month1: cfg.fallback1m,
          month3: cfg.fallback3m,
          trend: 'up',
          changePct: 2.5,
          status: 'Naik',
        }));
        setAllForecastItems(fallbackItems);
      }
    }
    loadAllForecasts();
  }, []);

  const handleForecastScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const itemHeight = 120; // exact height of each commodity card row with spacing
    const index = Math.round(el.scrollTop / itemHeight);
    if (index >= 0 && index < allForecastItems.length && index !== activeForecastIndex) {
      setActiveForecastIndex(index);
    }
  };

  const scrollToForecast = (targetIndex: number) => {
    if (forecastScrollRef.current) {
      const idx = Math.max(0, Math.min(allForecastItems.length - 1, targetIndex));
      const itemHeight = 120;
      forecastScrollRef.current.scrollTo({
        top: idx * itemHeight,
        behavior: 'smooth'
      });
      setActiveForecastIndex(idx);
    }
  };

  // 8 Fitur Unggulan Tiles (Android Launcher Style)
  const quickFeatures = [
    {
      id: 'agregasi_kamera',
      name: 'Agregasi Data',
      tag: 'Kamera Cerdas',
      icon: <BarChart3 className="w-5 h-5 text-white" />,
      gradient: 'from-[#007A48] via-[#059669] to-[#10B981]',
    },
    {
      id: 'rantai_pasok',
      name: 'Rantai Pasok',
      tag: 'Logistik Beras',
      icon: <Truck className="w-5 h-5 text-white" />,
      gradient: 'from-[#1D4ED8] via-[#2563EB] to-[#0284C7]',
    },
    {
      id: 'peta_full',
      name: 'Peta Tematik',
      tag: 'Spasial GIS',
      icon: <MapPin className="w-5 h-5 text-white" />,
      gradient: 'from-[#0F766E] via-[#0D9488] to-[#14B8A6]',
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
      gradient: 'from-[#7C3AED] via-[#8B5CF6] to-[#A855F7]',
    },
    {
      id: 'radar_kelurahan',
      name: 'Radar Pangan',
      tag: 'Kel vs Kec',
      icon: <Target className="w-5 h-5 text-white" />,
      gradient: 'from-[#4338CA] via-[#6366F1] to-[#8B5CF6]',
    },
    {
      id: 'analisis_skpg',
      name: 'SKPG Bulanan',
      tag: 'Kewaspadaan',
      icon: <Activity className="w-5 h-5 text-white" />,
      gradient: 'from-[#B91C1C] via-[#DC2626] to-[#F87171]',
    },
    {
      id: 'kamera_cerdas',
      name: 'Kamera Cerdas',
      tag: 'IoT Telemetri',
      icon: <Camera className="w-5 h-5 text-white" />,
      gradient: 'from-[#334155] via-[#475569] to-[#64748B]',
    },
  ];

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto animate-in fade-in duration-200">
      
      {/* 1. Media & Informasi Carousel Eksisting Desktop (Autoplay & Tertaut Admin) */}
      <div className="w-full rounded-2xl overflow-hidden shadow-xs border border-emerald-100/80">
        <MediaCarousel />
      </div>

      {/* 2. Segmen Panel Harga Pasar Terkini (SAGON) - 13 Komoditas & Navigasi Tanggal Dinamis */}
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
                <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${
                  dateIndex === 4 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {dateIndex === 4 ? 'LIVE' : 'ARSIP'}
                </span>
              </div>
              <p className="text-[9px] font-semibold text-emerald-700/80">
                Pantauan 13 komoditas pasar harian Cilegon
              </p>
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

        {/* Date Navigation Bar with Chevron (Versi Desktop Match) */}
        <div className="flex items-center justify-between bg-white border border-emerald-100 p-1.5 rounded-2xl w-full shadow-2xs">
          <button
            onClick={() => setDateIndex(prev => Math.max(0, prev - 1))}
            disabled={dateIndex === 0}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              dateIndex === 0 
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95'
            }`}
            title="Tanggal Sebelumnya"
            aria-label="Tanggal Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wide truncate">
            <span>📅</span>
            <span className="truncate">{formatIndoDate(dates[dateIndex])}</span>
            {dateIndex === 4 && (
              <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                Hari Ini
              </span>
            )}
          </div>

          <button
            onClick={() => setDateIndex(prev => Math.min(dates.length - 1, prev + 1))}
            disabled={dateIndex === dates.length - 1}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              dateIndex === dates.length - 1
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95 cursor-pointer'
            }`}
            title="Tanggal Berikutnya"
            aria-label="Tanggal Berikutnya"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Horizontal Snap Scroll 13 Komoditas Lengkap */}
        <div className="relative">
          <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar snap-x scroll-smooth">
            {sagonCommodities.map((c, i) => (
              <div 
                key={c.key} 
                onClick={() => onNavigate('harga_full')}
                className="min-w-[136px] p-2.5 rounded-2xl bg-white/95 border border-emerald-100/90 shadow-2xs snap-start shrink-0 cursor-pointer active:scale-95 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{c.icon}</span>
                    <p className="text-[11px] font-black text-slate-700 truncate">{c.name}</p>
                  </div>
                  <p className="text-[13px] font-black text-emerald-950 mt-1">
                    Rp {Math.round(c.price).toLocaleString('id-ID')}
                    <span className="text-[8.5px] font-medium text-slate-400">/{c.unit}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/80">
                  <span className="text-[8.5px] font-bold text-slate-400">#{i + 1}</span>
                  {c.trend > 0 ? (
                    <span className="inline-flex items-center text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +{c.trend}%
                    </span>
                  ) : c.trend < 0 ? (
                    <span className="inline-flex items-center text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> {c.trend}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[8.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      Stabil
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1 pt-0.5">
            <span>Geser horizontal untuk 13 komoditas ➔</span>
            <span className="text-emerald-700 font-extrabold">{sagonCommodities.length} Komoditas</span>
          </div>
        </div>
      </div>

      {/* 3. Segmen Panel Peramalan Harga Pangan +1 dan +3 Bulan - 13 Komoditas (Tampil 1 Baris dengan Geser Atas/Bawah) */}
      <div className="bg-gradient-to-br from-[#064E3B] via-[#043E30] to-[#022C22] text-white p-3.5 rounded-3xl border border-emerald-500/40 shadow-lg shadow-emerald-950/20 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs text-white tracking-tight leading-tight truncate">
                Peramalan Harga Pangan
              </h3>
              <p className="text-[9px] font-bold text-emerald-200/80 truncate">
                Model Machine Learning +1 & +3 Bulan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Counter & Up/Down Switcher */}
            <div className="flex items-center bg-emerald-900/80 border border-emerald-500/40 rounded-xl px-1.5 py-0.5 text-[9px] font-black text-emerald-200 gap-1">
              <span className="text-emerald-300 font-mono">
                {activeForecastIndex + 1}/{allForecastItems.length || 13}
              </span>
              <div className="flex flex-col gap-0.2">
                <button
                  type="button"
                  onClick={() => scrollToForecast(activeForecastIndex - 1)}
                  disabled={activeForecastIndex === 0}
                  className="hover:text-white disabled:opacity-30 cursor-pointer p-0.2 active:scale-90"
                  title="Komoditas Sebelumnya (Ke Atas)"
                  aria-label="Komoditas Sebelumnya"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToForecast(activeForecastIndex + 1)}
                  disabled={activeForecastIndex === (allForecastItems.length - 1)}
                  className="hover:text-white disabled:opacity-30 cursor-pointer p-0.2 active:scale-90"
                  title="Komoditas Berikutnya (Ke Bawah)"
                  aria-label="Komoditas Berikutnya"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('forecasting')}
              className="px-2 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-[10px] font-black flex items-center gap-0.5 cursor-pointer shrink-0 active:scale-95 transition-all"
              title="Lihat Detail Peramalan"
            >
              <span>Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Petunjuk Geser Atas/Bawah */}
        <div className="flex items-center justify-between text-[8.5px] font-semibold text-emerald-300/80 px-1">
          <span>Geser kartu ke atas/bawah (13 komoditas)</span>
          <span className="text-emerald-200 font-bold">Swipe ↑↓</span>
        </div>

        {/* Multi-Row Vertical Scrollable Reel (Ketinggian 2x Lipat dengan Jarak Antar Kartu Komoditas) */}
        <div 
          ref={forecastScrollRef}
          onScroll={handleForecastScroll}
          className="h-[240px] overflow-y-auto space-y-3 no-scrollbar scroll-smooth rounded-2xl border border-emerald-500/30 bg-emerald-950/70 p-2.5"
        >
          {allForecastItems.map((item, idx) => (
            <div 
              key={item.key}
              onClick={() => onNavigate('forecasting')}
              className="p-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900/80 border border-emerald-500/30 shadow-xs shrink-0 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
              title={`Buka analisis forecast untuk ${item.name}`}
            >
              {/* Baris Nama Komoditas & Status */}
              <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-emerald-500/20">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="text-xs font-black text-white truncate">
                    {item.name}
                  </span>
                  <span className="text-[8.5px] font-bold text-emerald-400/80 font-mono">
                    #{idx + 1}
                  </span>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border ${
                  item.trend === 'up' 
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/40' 
                    : item.trend === 'down' 
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40' 
                    : 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                }`}>
                  {item.trend === 'up' && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                  {item.trend === 'down' && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                  <span>{item.changePct > 0 ? `+${item.changePct.toFixed(1)}%` : `${item.changePct.toFixed(1)}%`}</span>
                  <span>•</span>
                  <span>{item.status}</span>
                </span>
              </div>

              {/* 3 Kolom Nilai: Aktual, +1 Bulan, +3 Bulan dengan Bulan Dinamis */}
              <div className="grid grid-cols-3 gap-1.5 pt-1.5 text-center">
                {/* 1. Aktual */}
                <div className="p-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/20 flex flex-col justify-center">
                  <span className="text-[9.5px] font-bold text-emerald-200/80 leading-tight">
                    Aktual
                  </span>
                  <span className="text-[7.5px] font-semibold text-slate-300 leading-tight">
                    {baselineMonthStr}
                  </span>
                  <span className="text-[11px] font-black text-white mt-0.5">
                    Rp {Math.round(item.aktual).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* 2. +1 Bulan */}
                <div className="p-1.5 rounded-xl bg-emerald-950/60 border border-cyan-500/30 flex flex-col justify-center">
                  <span className="text-[9.5px] font-bold text-cyan-200 leading-tight">
                    +1 Bulan
                  </span>
                  <span className="text-[7.5px] font-semibold text-cyan-300/80 leading-tight">
                    {month1Str}
                  </span>
                  <span className="text-[11px] font-black text-cyan-200 mt-0.5">
                    Rp {Math.round(item.month1).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* 3. +3 Bulan */}
                <div className="p-1.5 rounded-xl bg-emerald-950/60 border border-teal-500/30 flex flex-col justify-center">
                  <span className="text-[9.5px] font-bold text-teal-200 leading-tight">
                    +3 Bulan
                  </span>
                  <span className="text-[7.5px] font-semibold text-teal-300/80 leading-tight">
                    {month3Str}
                  </span>
                  <span className="text-[11px] font-black text-teal-200 mt-0.5">
                    Rp {Math.round(item.month3).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pintasan untuk lihat lebih lengkap */}
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

      {/* 6.5. Panel Peta Food Security Intelligence (Capture 3) */}
      <div className="bg-gradient-to-br from-white via-emerald-50/30 to-[#ECFDF5]/50 p-3.5 rounded-3xl border border-emerald-200/80 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full shrink-0"></div>
            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
              FOOD SECURITY INTELLIGENCE
            </h3>
          </div>
          <button 
            onClick={() => onNavigate('ai_intelligence')}
            className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
          >
            <span>Buka Penuh</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GIS Interactive Leaflet Map Container */}
        <div className="w-full h-[380px] rounded-2xl overflow-hidden border border-emerald-200/90 shadow-xs relative z-0 isolate bg-slate-900">
          <AIIntelligenceMap activeTab="map" />
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
