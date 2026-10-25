/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, MapPin, Store, Sparkles, Target, Activity, 
  Camera, Bot, Layers, ChevronRight, TrendingUp, TrendingDown,
  ArrowRight, Sparkle, AlertCircle, CheckCircle2, ChevronLeft,
  LineChart, ChevronUp, ChevronDown, Calendar, BarChart3, Truck,
  Info
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MediaCarousel from '@/components/MediaCarousel';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import VisitCounter from '@/components/VisitCounter';
import { supabase } from '@/lib/supabase';
import MobileFsvaKelurahanModal, { FsvaPriorityDef, FsvaKelurahanItem } from './MobileFsvaKelurahanModal';
import { BASELINE_KELURAHAN_DATA } from '@/lib/thematic-indicators';
import { KEL_TO_KEC } from '@/lib/wilayah';

const KameraCerdasView = dynamic(
  () => import('@/components/kamera/KameraCerdasView'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[460px] flex items-center justify-center bg-[#04101f] text-cyan-200 text-xs font-bold gap-2 rounded-2xl">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span>Memuat Peta Arus Pasokan Beras...</span>
      </div>
    ),
  }
);

export interface MobileEwsItem {
  key: string;
  name: string;
  icon: string;
  hargaAktual: number;
  forecast1m: number;
  forecast3m: number;
  cv: number;
  statusForecast: string;
  statusCv: string;
  statusSkpg: string;
  perubahanPct: number;
  growthYoy: number;
  overallStatus: 'Aman' | 'Waspada' | 'Rentan';
  drivers: string[];
  rekomendasi: string[];
}

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
  previousHargaData?: any[];
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
  previousHargaData = [],
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

  // Helper to retrieve previous period / YoY price matching desktop HargaPanel.tsx
  const getPrevPrice = (key: string, fallback: number): number => {
    if (previousHargaData && previousHargaData.length > 0) {
      const values = previousHargaData.map(d => Number(d[key])).filter(v => !isNaN(v) && v > 0);
      if (values.length > 0) {
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
    }
    return fallback;
  };

  // Helper to calculate YoY change and metadata matching desktop HargaPanel.tsx
  const getYoYStats = (curr: number, prev: number) => {
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const isUp = change > 0.05;
    const isZero = Math.abs(change) < 0.05;
    const isWaspada = isUp && change > 5;
    const status = isWaspada ? 'WASPADA' : isUp ? 'NAIK' : isZero ? 'STABIL' : 'AMAN';
    
    return {
      change,
      changeText: `${isUp ? '↑' : isZero ? '' : '↓'} ${Math.abs(change).toFixed(1)}%`,
      isUp,
      isZero,
      isWaspada,
      status,
    };
  };

  // 13 Komoditas Lengkap SAGON (baseline & YoY fallback matching desktop)
  const SAGON_COMMODITY_CONFIG = [
    { key: 'beras', name: 'Beras Medium', icon: '🍚', unit: 'kg', fallback: 14000, prevFallback: 14000 },
    { key: 'bawang_merah', name: 'Bawang Merah', icon: '🧅', unit: 'kg', fallback: 30000, prevFallback: 34000 },
    { key: 'bawang_putih', name: 'Bawang Putih', icon: '🧄', unit: 'kg', fallback: 35333, prevFallback: 38000 },
    { key: 'cabe_merah', name: 'Cabe Merah', icon: '🌶️', unit: 'kg', fallback: 55000, prevFallback: 55000 },
    { key: 'cabe_merah_keriting', name: 'Cabe M. Keriting', icon: '🌶️', unit: 'kg', fallback: 39000, prevFallback: 48000 },
    { key: 'cabe_rawit_merah', name: 'Cabe Rawit Merah', icon: '🌶️', unit: 'kg', fallback: 51667, prevFallback: 50000 },
    { key: 'cabe_rawit_hijau', name: 'Cabe Rawit Hijau', icon: '🌶️', unit: 'kg', fallback: 43333, prevFallback: 42000 },
    { key: 'daging_sapi', name: 'Daging Sapi', icon: '🥩', unit: 'kg', fallback: 140000, prevFallback: 130000 },
    { key: 'daging_ayam', name: 'Daging Ayam Ras', icon: '🍗', unit: 'kg', fallback: 36000, prevFallback: 36000 },
    { key: 'telur', name: 'Telur Ayam Ras', icon: '🥚', unit: 'kg', fallback: 30500, prevFallback: 26500 },
    { key: 'gula_pasir', name: 'Gula Pasir', icon: '🧂', unit: 'kg', fallback: 17000, prevFallback: 17000 },
    { key: 'minyak_goreng_kemasan', name: 'Minyak Goreng', icon: '🧴', unit: 'ltr', fallback: 19800, prevFallback: 18500 },
    { key: 'tepung_terigu', name: 'Tepung Terigu', icon: '🌾', unit: 'kg', fallback: 13500, prevFallback: 12500 },
  ];

  const sagonCommodities = useMemo(() => {
    return SAGON_COMMODITY_CONFIG.map(cfg => {
      const price = getRealHistoricalPrice(cfg.key, cfg.fallback);
      const prevPrice = getPrevPrice(cfg.key, cfg.prevFallback);
      const stats = getYoYStats(price, prevPrice);

      return {
        ...cfg,
        price,
        prevPrice,
        trend: stats.change,
        changeText: stats.changeText,
        status: stats.status,
        isUp: stats.isUp,
        isZero: stats.isZero,
        isWaspada: stats.isWaspada,
      };
    });
  }, [dateIndex, activeDate, effectivePrices, effectiveHistory, previousHargaData]);

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
  const [allEwsItems, setAllEwsItems] = useState<MobileEwsItem[]>([]);
  const [expandedEwsKey, setExpandedEwsKey] = useState<string | null>(null);
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

        // Early Warning System (EWS) 13 Komoditas Data
        const ewsList: MobileEwsItem[] = FORECAST_COMMODITY_ORDER.map(cfg => {
          const row = dbMap.get(cfg.key);
          const aktual = row ? (Number(row.harga_aktual) || cfg.fallbackAktual) : cfg.fallbackAktual;
          const month1 = row ? (Number(row.forecast_1m) || cfg.fallback1m) : cfg.fallback1m;
          const month3 = row ? (Number(row.forecast_3m) || cfg.fallback3m) : cfg.fallback3m;
          const pct = aktual > 0 ? ((month1 - aktual) / aktual) * 100 : (Number(row?.perubahan_pct) || 0);
          const cv = Number(row?.cv) || 1.0;
          const statusForecast = row?.status_forecast || (pct > 3 ? 'Naik' : pct < -3 ? 'Turun' : 'Stabil');
          const statusCv = row?.status_cv || (cv > 15 ? 'RENTAN' : cv > 8 ? 'WASPADA' : 'AMAN');
          const statusSkpg = row?.status_skpg || 'AMAN';
          const growthYoy = Number(row?.growth_yoy) || -3.0;

          let overallStatus: 'Aman' | 'Waspada' | 'Rentan' = 'Aman';
          if (statusForecast === 'Turun') {
            overallStatus = 'Aman';
          } else if (statusCv === 'RENTAN' || statusSkpg === 'RENTAN') {
            overallStatus = 'Rentan';
          } else if (statusCv === 'WASPADA' || statusSkpg === 'WASPADA' || statusForecast === 'Naik') {
            overallStatus = 'Waspada';
          }

          let drivers = row?.drivers;
          if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
            drivers = [
              '1 Tren harga 3 bulan terakhir',
              '2 Cuaca kondusif',
              '3 Stabilitas inflasi makro'
            ];
          }

          let rekomendasi = row?.rekomendasi;
          if (!rekomendasi || !Array.isArray(rekomendasi) || rekomendasi.length === 0) {
            rekomendasi = [
              'monitoring rutin mingguan',
              'jaga kestabilan pasokan'
            ];
          }

          return {
            key: cfg.key,
            name: cfg.name,
            icon: cfg.icon,
            hargaAktual: aktual,
            forecast1m: month1,
            forecast3m: month3,
            cv,
            statusForecast,
            statusCv,
            statusSkpg,
            perubahanPct: Math.round(pct * 10) / 10,
            growthYoy,
            overallStatus,
            drivers,
            rekomendasi,
          };
        });

        setAllEwsItems(ewsList);
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

        const fallbackEws: MobileEwsItem[] = FORECAST_COMMODITY_ORDER.map(cfg => ({
          key: cfg.key,
          name: cfg.name,
          icon: cfg.icon,
          hargaAktual: cfg.fallbackAktual,
          forecast1m: cfg.fallback1m,
          forecast3m: cfg.fallback3m,
          cv: 1.0,
          statusForecast: 'Stabil',
          statusCv: 'AMAN',
          statusSkpg: 'AMAN',
          perubahanPct: -0.6,
          growthYoy: -3.0,
          overallStatus: 'Aman',
          drivers: [
            '1 Tren harga 3 bulan terakhir',
            '2 Cuaca kondusif',
            '3 Stabilitas inflasi makro'
          ],
          rekomendasi: [
            'monitoring rutin mingguan',
            'jaga kestabilan pasokan'
          ]
        }));
        setAllEwsItems(fallbackEws);
      }
    }
    loadAllForecasts();
  }, []);

  // Dynamic forecast months derived from liveDateString or current time
  const forecastMonths = useMemo(() => {
    let d: Date;
    if (liveDateString) {
      d = new Date(liveDateString);
      if (isNaN(d.getTime())) d = new Date();
    } else {
      d = new Date();
    }

    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Baseline (Harga Aktual): 1 bulan sebelum acuan
    const dAktual = new Date(d);
    dAktual.setMonth(dAktual.getMonth() - 1);
    const aktualMonthStr = `${indonesianMonths[dAktual.getMonth()]} ${dAktual.getFullYear()}`;

    // Peramalan +1 Bulan: bulan target proyeksi 1 bulan
    const d1 = new Date(d);
    const t1MonthStr = `${indonesianMonths[d1.getMonth()]} ${d1.getFullYear()}`;

    // Peramalan +3 Bulan: bulan target proyeksi 3 bulan (+2 bulan dari d1)
    const d3 = new Date(d);
    d3.setMonth(d3.getMonth() + 2);
    const t3MonthStr = `${indonesianMonths[d3.getMonth()]} ${d3.getFullYear()}`;

    return {
      aktualMonthStr,
      t1MonthStr,
      t3MonthStr,
    };
  }, [liveDateString]);

  // 8 Fitur Unggulan Tiles (Android Launcher Style) - Tampil di Beranda
  const quickFeatures = [
    {
      id: 'harga_full',
      name: 'Harga Pangan',
      tag: 'SAGON Live',
      icon: <Store className="w-5 h-5 text-white" />,
      gradient: 'from-[#FFA826] to-[#FF9800]',
      accentColor: '#FF9800',
    },
    {
      id: 'forecasting',
      name: 'Forecast EWS',
      tag: 'Prediksi ML',
      icon: <Sparkles className="w-5 h-5 text-white" />,
      gradient: 'from-[#FF5E74] to-[#FF405B]',
      accentColor: '#FF405B',
    },
    {
      id: 'peta_full',
      name: 'Peta FSVA/SKPG',
      tag: 'Spasial GIS',
      icon: <MapPin className="w-5 h-5 text-white" />,
      gradient: 'from-[#0FA4B4] to-[#087F8C]',
      accentColor: '#087F8C',
    },
    {
      id: 'grafik_ikp',
      name: 'IKP & POU',
      tag: 'Tren Indeks',
      icon: <BarChart3 className="w-5 h-5 text-white" />,
      gradient: 'from-[#00A878] to-[#008F67]',
      accentColor: '#008F67',
    },
    {
      id: 'ai_intelligence',
      name: 'RAG Chatbot',
      tag: 'Asisten AI',
      icon: <Bot className="w-5 h-5 text-white" />,
      gradient: 'from-[#6366F1] to-[#4F46E5]',
      accentColor: '#4F46E5',
    },
    {
      id: 'peta_pasokan',
      name: 'Pasokan Beras',
      tag: 'Arus Logistik',
      icon: <Truck className="w-5 h-5 text-white" />,
      gradient: 'from-[#2968FF] to-[#145BFF]',
      accentColor: '#145BFF',
    },
    {
      id: 'analisis_skpg',
      name: 'Analisis SKPG',
      tag: 'Kewaspadaan',
      icon: <Activity className="w-5 h-5 text-white" />,
      gradient: 'from-[#EF4444] to-[#DC2626]',
      accentColor: '#DC2626',
    },
    {
      id: 'radar_kelurahan',
      name: 'Radar Pangan',
      tag: 'Kel vs Kec',
      icon: <Target className="w-5 h-5 text-white" />,
      gradient: 'from-[#0FA4B4] to-[#087F8C]',
      accentColor: '#087F8C',
    },
  ];

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto animate-in fade-in duration-200">
      
      {/* 1. Media & Informasi Carousel Eksisting Desktop (Autoplay & Tertaut Admin) */}
      <div className="w-full rounded-2xl overflow-hidden shadow-xs border border-emerald-100/80">
        <MediaCarousel />
      </div>

      {/* 2. Segmen Panel Harga Pasar Terkini (SAGON) - 13 Komoditas & Navigasi Tanggal Dinamis (Capture 3) */}
      <div className="bg-gradient-to-br from-[#FFF8E5] to-[#FFF0C7] p-3.5 rounded-3xl border border-[#FFE5A3] shadow-[0_4px_20px_rgba(255,229,163,0.25)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF9200] text-white flex items-center justify-center shadow-xs shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-xs uppercase tracking-wider text-[#172B4D]">
                  HARGA PASAR TERKINI (SAGON)
                </h3>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${
                  dateIndex === 4 
                    ? 'bg-[#FFF0F2] text-[#FF405B] border-[#FFCCD5] animate-pulse' 
                    : 'bg-[#EAF6FF] text-[#145BFF] border-[#CCE4FF]'
                }`}>
                  {dateIndex === 4 ? 'LIVE' : 'ARSIP'}
                </span>
              </div>
              <p className="text-[9px] font-semibold text-[#8192AE]">
                Pantauan 13 komoditas pasar harian Cilegon
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('harga_full')}
            className="text-[11px] font-black text-[#FF9200] hover:text-[#E08200] flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF9200]" />
          </button>
        </div>

        {/* Date Navigation Bar with Chevron (Versi Desktop Match) */}
        <div className="flex items-center justify-between bg-white border border-[#FFE5A3]/80 p-1.5 rounded-2xl w-full shadow-2xs">
          <button
            onClick={() => setDateIndex(prev => Math.max(0, prev - 1))}
            disabled={dateIndex === 0}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              dateIndex === 0 
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                : 'bg-[#EAF6FF] hover:bg-[#D8EEFF] text-[#145BFF] shadow-2xs active:scale-95'
            }`}
            title="Tanggal Sebelumnya"
            aria-label="Tanggal Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#172B4D] uppercase tracking-wide truncate">
            <span>📅</span>
            <span className="truncate">{formatIndoDate(dates[dateIndex])}</span>
            {dateIndex === 4 && (
              <span className="text-[8px] bg-[#D2F5EC] text-[#008F67] font-black px-2 py-0.5 rounded-full border border-[#A7EAD7] shrink-0 uppercase">
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
                : 'bg-[#EAF6FF] hover:bg-[#D8EEFF] text-[#145BFF] shadow-2xs active:scale-95 cursor-pointer'
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
            {sagonCommodities.map((c, i) => {
              // 3 Kombinasi Pastel: Biru Muda #EAF6FF, Pink Lembut #FFF0F2, Lavender #F7EEFF
              const pastelThemes = [
                { bg: 'bg-[#EAF6FF]', border: 'border-[#D4E8FC]' },
                { bg: 'bg-[#FFF0F2]', border: 'border-[#FFE0E5]' },
                { bg: 'bg-[#F7EEFF]', border: 'border-[#EEDEFA]' },
              ];
              const theme = pastelThemes[i % pastelThemes.length];

              return (
                <div 
                  key={c.key} 
                  onClick={() => onNavigate('harga_full')}
                  className={`min-w-[136px] p-2.5 rounded-2xl ${theme.bg} ${theme.border} border shadow-2xs snap-start shrink-0 cursor-pointer active:scale-95 hover:shadow-xs transition-all flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{c.icon}</span>
                      <p className="text-[11px] font-black text-[#172B4D] truncate">{c.name}</p>
                    </div>
                    <p className="text-[13px] font-black text-[#172B4D] mt-1">
                      Rp {Math.round(c.price).toLocaleString('id-ID')}
                      <span className="text-[8.5px] font-medium text-[#8192AE]">/{c.unit}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5">
                    <span className="text-[8.5px] font-bold text-[#8192AE]">#{i + 1}</span>
                    {c.status === 'WASPADA' ? (
                      <span className="inline-flex items-center text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> {c.changeText} WASPADA
                      </span>
                    ) : c.status === 'NAIK' ? (
                      <span className="inline-flex items-center text-[8.5px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> {c.changeText} NAIK
                      </span>
                    ) : c.status === 'AMAN' ? (
                      <span className="inline-flex items-center text-[8.5px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> {c.changeText} AMAN
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[8.5px] font-black text-[#008F67] bg-[#D2F5EC] px-2 py-0.5 rounded-md border border-[#A7EAD7]">
                        <Activity className="w-2.5 h-2.5 mr-0.5 text-[#008F67]" /> STABIL
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold text-[#8192AE] px-1 pt-0.5">
            <span>Geser horizontal untuk 13 komoditas ➔</span>
            <span className="text-[#FF9200] font-black">{sagonCommodities.length} Komoditas</span>
          </div>
        </div>
      </div>

      {/* 3. Segmen Panel Peramalan Harga Pangan +1 dan +3 Bulan - 13 Komoditas (Capture 4) */}
      <div className="rounded-3xl border border-[#B8F1E6] bg-gradient-to-b from-[#EAFBF7] to-[#F7FFFD] overflow-hidden shadow-[0_4px_20px_rgba(8,127,140,0.08)]">
        {/* Gradient Header Teal #087F8C -> Turquoise #10C9B0 */}
        <div className="bg-gradient-to-r from-[#087F8C] to-[#10C9B0] text-white p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-sm text-white tracking-tight leading-tight truncate">
                Peramalan Harga Pangan
              </h3>
              <p className="text-[9px] font-bold text-white/90 truncate">
                Model Machine Learning +1 & +3 Bulan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => onNavigate('forecasting')}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-[10px] font-black flex items-center gap-0.5 cursor-pointer shrink-0 active:scale-95 transition-all"
              title="Lihat Detail Peramalan"
            >
              <span>Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Petunjuk Geser Atas/Bawah */}
        <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between text-[9px] font-semibold text-[#7189A8]">
          <span>Geser kartu ke atas/bawah (13 komoditas)</span>
          <span className="text-[#00A98F] font-bold">Swipe ⇅</span>
        </div>

        {/* Multi-Row Vertical Scrollable Reel (Baris Komoditas Muncul Sekaligus) */}
        <div 
          ref={forecastScrollRef}
          className="h-[430px] overflow-y-auto space-y-2.5 px-3 py-1.5 no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
        >
          {allForecastItems.map((item, idx) => {
            const pct1 = item.aktual > 0 ? ((item.month1 - item.aktual) / item.aktual) * 100 : 0;
            const pct3 = item.aktual > 0 ? ((item.month3 - item.aktual) / item.aktual) * 100 : 0;

            return (
              <div 
                key={item.key}
                onClick={() => onNavigate('forecasting')}
                className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#B8F1E6] shadow-xs hover:border-[#00A98F]/50 shrink-0 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
                title={`Buka analisis forecast untuk ${item.name}`}
              >
                {/* Baris Nama Komoditas & Status */}
                <div className="flex items-center justify-between gap-1 pb-2 border-b border-[#B8F1E6]/50">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="text-xs font-black text-[#123B4A] truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-bold text-[#00A98F] font-mono">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Badge Status & Arah Tren +1 Bulan */}
                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border shrink-0 ${
                    item.changePct < -3
                      ? 'bg-[#D9FBE7] text-[#087F55] border-[#B8F1E6]'
                      : item.changePct > 3
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {item.changePct > 3 && <TrendingUp className="w-2.5 h-2.5 shrink-0" />}
                    {item.changePct < -3 && <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
                    {Math.abs(item.changePct) <= 3 && <span className="font-mono text-[9px]">—</span>}
                    <span>
                      {item.changePct > 0 ? `+${item.changePct.toFixed(1)}%` : `${item.changePct.toFixed(1)}%`}
                    </span>
                    <span>•</span>
                    <span>{item.changePct > 3 ? 'Naik' : item.changePct < -3 ? 'Turun' : 'Stabil'}</span>
                  </span>
                </div>

                {/* 3 Kolom Nilai: Aktual, +1 Bulan, +3 Bulan (Dinamis Sesuai Tanggal Acuan) */}
                <div className="grid grid-cols-3 gap-1 pt-2 text-left">
                  {/* 1. HARGA AKTUAL */}
                  <div className="flex flex-col justify-center pr-1 min-w-0">
                    <div className="leading-tight">
                      <div className="text-[8px] font-black text-[#0B4D3C] uppercase tracking-wide truncate">
                        HARGA AKTUAL
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">
                        {forecastMonths.aktualMonthStr}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-[#123B4A] mt-1.5 truncate">
                      Rp{Math.round(item.aktual).toLocaleString('id-ID')}
                    </div>
                    <span className="text-[7.5px] text-[#7189A8] mt-0.5">
                      (Rp/kg)
                    </span>
                  </div>

                  {/* 2. PERAMALAN +1 BULAN */}
                  <div className="flex flex-col justify-center border-l border-[#B8F1E6]/70 pl-2 pr-1 min-w-0">
                    <div className="leading-tight">
                      <div className="text-[8px] font-black text-[#0B4D3C] uppercase tracking-wide truncate">
                        PERAMALAN +1 BULAN
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">
                        {forecastMonths.t1MonthStr}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`text-xs sm:text-sm font-black truncate ${
                        item.month1 > item.aktual ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        Rp{Math.round(item.month1).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <span className="text-[7.5px] text-[#7189A8] mt-0.5">
                      (Rp/kg)
                    </span>
                  </div>

                  {/* 3. PERAMALAN +3 BULAN */}
                  <div className="flex flex-col justify-center border-l border-[#B8F1E6]/70 pl-2 min-w-0">
                    <div className="leading-tight">
                      <div className="text-[8px] font-black text-[#0B4D3C] uppercase tracking-wide truncate">
                        PERAMALAN +3 BULAN
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">
                        {forecastMonths.t3MonthStr}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`text-xs sm:text-sm font-black truncate ${
                        item.month3 > item.aktual ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        Rp{Math.round(item.month3).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <span className="text-[7.5px] text-[#7189A8] mt-0.5">
                      (Rp/kg)
                    </span>
                  </div>
                </div>

                {/* Bar Penjelasan Arah Tren +1 Bulan (L1) */}
                <div className="mt-2.5 pt-2 border-t border-[#B8F1E6]/60 flex items-center justify-between gap-1 text-[8.5px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-black text-[#0B4D3C] uppercase text-[7.5px] tracking-wide shrink-0">
                      Arah Tren +1 Bulan (L1):
                    </span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-mono font-black shrink-0 ${
                      item.changePct > 3
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : item.changePct < -3
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.changePct > 3 && <TrendingUp className="w-2.5 h-2.5 shrink-0" />}
                      {item.changePct < -3 && <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
                      {Math.abs(item.changePct) <= 3 && <span className="font-mono text-[9px]">—</span>}
                      {item.changePct > 0 ? `+${item.changePct.toFixed(1)}%` : `${item.changePct.toFixed(1)}%`}
                    </span>
                  </div>

                  <span className="font-semibold text-slate-500 truncate text-[8px] text-right">
                    {item.changePct > 3
                      ? 'Tren Naik (Waspada Inflasi)'
                      : item.changePct < -3
                      ? 'Tren Turun (Kondusif Pasar)'
                      : 'Stabil (Fluktuasi < 3%)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Indikator Bawah */}
        <div className="flex items-center justify-between px-3.5 py-2 text-[9px] font-bold text-[#087F8C] border-t border-[#B8F1E6]/40">
          <span>13 Komoditas Strategis Cilegon</span>
          <span className="text-slate-400 font-medium">Model Machine Learning</span>
        </div>
      </div>

      {/* 3.5. Panel Early Warning System (EWS) - Tepat di Bawah Peramalan Harga Pangan */}
      <div className="bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] p-3.5 rounded-3xl border border-[#E9E4D5] shadow-sm space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full shrink-0"></div>
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>EARLY WARNING SYSTEM</span>
            </h3>
          </div>
          <button 
            onClick={() => onNavigate('forecasting')}
            className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
            title="Buka Penuh EWS DSS"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Petunjuk Geser & Keterangan 3 Baris Teratas */}
        <div className="px-1 flex items-center justify-between text-[9px] font-bold text-slate-500">
          <span>* 3 komoditas teratas tampil</span>
          <span className="text-emerald-700 font-black flex items-center gap-1">
            Scroll ke bawah ⇅
          </span>
        </div>

        {/* Scrollable Container (Menampilkan 3 Baris Teratas & Scrolable Native ke Bawah) */}
        <div 
          className="max-h-[350px] overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300"
          style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
        >
          {allEwsItems.map((item, idx) => {
            const isExpanded = expandedEwsKey === item.key;
            const statusColor = 
              item.overallStatus === 'Rentan'
                ? { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
                : item.overallStatus === 'Waspada'
                ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
                : { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };

            return (
              <div 
                key={item.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all p-3 space-y-2"
              >
                {/* Header Baris Komoditas: Icon, Nama, Rank, dan Badge Status Keamanan */}
                <div 
                  onClick={() => setExpandedEwsKey(isExpanded ? null : item.key)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800 truncate">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot} animate-pulse`} />
                      <span>{item.overallStatus}</span>
                    </span>
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-transform"
                      aria-label="Toggle details"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* 3 Layer Indikator EWS: L1 (Trend), L2 (CV), L3 (SKPG) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-left">
                  {/* L1 */}
                  <div className="bg-slate-50/80 rounded-xl p-1.5 border border-slate-100 flex flex-col justify-between">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-tight">
                      L1: Proyeksi
                    </span>
                    <span className={`text-[9.5px] font-black mt-0.5 truncate ${
                      item.statusForecast === 'Naik' ? 'text-rose-600' : item.statusForecast === 'Turun' ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {item.statusForecast} ({item.perubahanPct > 0 ? `+${item.perubahanPct.toFixed(1)}%` : `${item.perubahanPct.toFixed(1)}%`})
                    </span>
                  </div>

                  {/* L2 */}
                  <div className="bg-slate-50/80 rounded-xl p-1.5 border border-slate-100 flex flex-col justify-between">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-tight">
                      L2: CV Volatilitas
                    </span>
                    <span className={`text-[9.5px] font-black mt-0.5 truncate ${
                      item.statusCv === 'RENTAN' ? 'text-rose-600' : item.statusCv === 'WASPADA' ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {item.statusCv} ({item.cv.toFixed(1)}%)
                    </span>
                  </div>

                  {/* L3 */}
                  <div className="bg-slate-50/80 rounded-xl p-1.5 border border-slate-100 flex flex-col justify-between">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-tight">
                      L3: YoY SKPG
                    </span>
                    <span className={`text-[9.5px] font-black mt-0.5 truncate ${
                      item.statusSkpg === 'RENTAN' ? 'text-rose-600' : item.statusSkpg === 'WASPADA' ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {item.statusSkpg} ({item.growthYoy > 0 ? `+${item.growthYoy.toFixed(1)}%` : `${item.growthYoy.toFixed(1)}%`})
                    </span>
                  </div>
                </div>

                {/* Bagian Detail Expand: Top Drivers & Rekomendasi */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                    {/* Top Drivers */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[8.5px] font-black text-slate-500 uppercase tracking-wide">
                        <Info className="w-3 h-3 text-emerald-600" />
                        <span>Pendorong Utama (Drivers)</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 space-y-1 text-[9.5px]">
                        {item.drivers.map((drv, dIdx) => (
                          <div key={dIdx} className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-600 text-[8.5px] font-bold flex items-center justify-center shrink-0">
                              {dIdx + 1}
                            </span>
                            <span className="truncate">{drv.replace(/^\d+\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rekomendasi */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[8.5px] font-black text-slate-500 uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Rekomendasi Intervensi</span>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-150 space-y-1 text-[9.5px]">
                        {item.rekomendasi.map((rek, rIdx) => (
                          <div key={rIdx} className="flex items-start gap-1.5 text-emerald-800 font-semibold">
                            <span className="text-emerald-600 font-bold shrink-0">•</span>
                            <span className="leading-tight">{rek}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Indeks Ketahanan Pangan Cilegon 2025 Card */}
      <div 
        className="bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#E6F4EA] p-4 rounded-3xl border border-emerald-300/80 shadow-sm shadow-emerald-900/5 transition-all hover:border-emerald-400"
      >
        {/* Header IKP (Klik Masuk ke Panel Peta FSVA) */}
        <div 
          onClick={() => onNavigate('peta_full')}
          className="flex items-center justify-between pb-3 border-b border-emerald-200/70 cursor-pointer group"
          title="Buka Peta Tematik Spasial FSVA & SKPG 43 Kelurahan"
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

      {/* 5. Sektor / Fitur Unggulan (Capture 1 Reference) */}
      <div className="bg-gradient-to-br from-[#FFF8E8] to-[#FFF2D2] p-3.5 rounded-3xl border border-[#FFE8B5] shadow-[0_4px_20px_rgba(255,232,181,0.25)] space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4.5 bg-[#F28C00] rounded-full shrink-0" />
            <h3 className="font-black text-xs uppercase tracking-wider text-[#172B4D]">
              FITUR UNGGULAN
            </h3>
          </div>
          <button 
            onClick={onOpenCatalog}
            className="text-[11px] font-black text-[#F28C00] hover:text-[#D97C00] flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
          >
            <span>Detail</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#F28C00]" />
          </button>
        </div>

        {/* 8 Android App Launcher Tiles (Grid 4 x 2) */}
        <div className="grid grid-cols-4 gap-2">
          {quickFeatures.map((feat) => (
            <button
              key={feat.id}
              onClick={() => onNavigate(feat.id)}
              className="relative overflow-hidden flex flex-col items-center p-2 rounded-2xl bg-[#FFFFFF] border border-[#F4EBDD] shadow-[0_2px_8px_rgba(244,235,221,0.6)] hover:border-[#FFE8B5] hover:shadow-xs transition-all cursor-pointer active:scale-92 group text-center"
            >
              {/* Aksen pastel transparan pada tiap kartu */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-2xl opacity-40 transition-opacity group-hover:opacity-70"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${feat.accentColor}26 0%, transparent 75%)`
                }}
              />
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform relative z-10`}>
                {feat.icon}
              </div>
              <span className="text-[10px] font-black text-[#172B4D] mt-1.5 leading-tight truncate w-full relative z-10">
                {feat.name}
              </span>
              <span className="text-[8px] font-bold text-[#008F67] leading-none mt-0.5 truncate w-full relative z-10">
                {feat.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 6.6. Panel Peta Arus Pasokan & Distribusi Beras (Capture 2 Reference) */}
      <div className="w-full h-[520px] rounded-3xl overflow-hidden shadow-md border border-slate-800">
        <KameraCerdasView initialTab="arus" />
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
          PANCI • Platform Analisis Pangan Cilegon
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
