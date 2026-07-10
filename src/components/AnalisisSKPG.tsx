"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Brain, BarChart3, TrendingUp, Package, Utensils, Calendar, MapPin, Loader2, CheckCircle, AlertTriangle, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MapSKPGMini from './MapSKPGMini';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

// Standard Kecamatan
const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'] as const;

// Market mapping rules
// Pasar Kranggot (Market 1) -> Ciwandan, Citangkil, Purwakarta, Jombang
// Pasar Kavling Blok F (Market 2) -> Cibeber, Cilegon
// Pasar Baru Merak (Market 3) -> Pulomerak, Gerogol

// Exact prices from Capture 1 for March 2026 / 2025 baseline
const BASELINE_PRICES_2025 = {
  beras: 13200,
  minyak: 18000,
  telur: 29500
};

const BASELINE_PRICES_2026: Record<string, { beras: number; minyak: number; telur: number }> = {
  Cibeber:    { beras: 13500, minyak: 22000, telur: 30033 }, // Blok F
  Cilegon:    { beras: 13500, minyak: 22000, telur: 30033 }, // Blok F
  Pulomerak:  { beras: 14000, minyak: 21032, telur: 31967 }, // Merak
  Ciwandan:   { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
  Jombang:    { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
  Gerogol:    { beras: 14000, minyak: 21032, telur: 31967 }, // Merak
  Purwakarta: { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
  Citangkil:  { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
};

// Exact balita nutrition figures from Capture 5 for March 2026 baseline
const BASELINE_NUTRITION: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {
  Cibeber:    { sangatKurang: 47, kurang: 132, normal: 3731, lebih: 102, total: 4012 },
  Cilegon:    { sangatKurang: 21, kurang: 80,  normal: 2969, lebih: 173, total: 3243 },
  Pulomerak:  { sangatKurang: 32, kurang: 123, normal: 2795, lebih: 123, total: 3073 },
  Ciwandan:   { sangatKurang: 34, kurang: 56,  normal: 3498, lebih: 72,  total: 3660 },
  Jombang:    { sangatKurang: 20, kurang: 114, normal: 3285, lebih: 145, total: 3564 },
  Gerogol:    { sangatKurang: 35, kurang: 123, normal: 2284, lebih: 107, total: 2549 },
  Purwakarta: { sangatKurang: 16, kurang: 133, normal: 1645, lebih: 104, total: 1898 },
  Citangkil:  { sangatKurang: 27, kurang: 185, normal: 4837, lebih: 238, total: 5287 },
};

// Kelurahan mapping for database queries
const WILAYAH_KELURAHAN: Record<string, string[]> = {
  'Cibeber':    ['Cibeber', 'Kedaleman', 'Bulakan', 'Cikerai', 'Karang Asem', 'Kalitimbang'],
  'Cilegon':    ['Bagendung', 'Ciwedus', 'Bendungan', 'Ketileng', 'Ciwaduk'],
  'Pulomerak':  ['Tamansari', 'Lebakgede', 'Mekarsari', 'Suralaya'],
  'Ciwandan':   ['Banjar Negara', 'Tegal Ratu', 'Kubangsari', 'Gunung Sugih', 'Kepuh', 'Randakari'],
  'Jombang':    ['Sukmajaya', 'Jombang Wetan', 'Masigit', 'Panggung Rawi', 'Gedong Dalem'],
  'Gerogol':    ['Kotasari', 'Gerogol', 'Rawa Arum', 'Gerem'],
  'Purwakarta': ['Ramanuju', 'Kotabumi', 'Kebon Dalem', 'Purwakarta', 'Tegal Bunder', 'Pabean'],
  'Citangkil':  ['Warnasari', 'Deringo', 'Kebonsari', 'Taman Baru', 'Lebak Denok', 'Samangraya', 'Citangkil'],
};

const MONTH_NAMES_INDO = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface AnalisisSKPGProps {
  onSwitchView?: (view: string) => void;
}

export default function AnalisisSKPG({ onSwitchView = () => {} }: AnalisisSKPGProps) {
  const [selectedYear, setSelectedYear] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic state computed from database
  const [pricesCur, setPricesCur] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(BASELINE_PRICES_2026);
  const [pricesPrev, setPricesPrev] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(
    Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {})
  );
  
  const [nutrition, setNutrition] = useState<Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }>>(BASELINE_NUTRITION);

  const [availablePeriods, setAvailablePeriods] = useState<{ tahun: number; bulan: number }[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  const fetchAiInsight = async (year: number, month: number, totals: any) => {
    setLoadingAi(true);
    setAiInsight('');
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          kecamatan: 'ALL',
          kelurahan: 'ALL',
          cvBeras: totals.beras.r,
          konsumsiEnergi: 2021,
          konsumsiProtein: 59,
          ketersediaanEnergi: 2450,
          ketersediaanProtein: 65,
          pphScore: 90.9,
          produksiBeras: 8708,
          balitaStatus: {
            sangatKurang: totals.nutrition.sangatKurang,
            kurang: totals.nutrition.kurang,
            normal: totals.nutrition.normal,
            lebih: totals.nutrition.lebih,
            total: totals.nutrition.totalBalita,
            status: totals.nutrition.status
          },
          hargaStrategis: {
            beras: totals.beras.cur,
            minyak: totals.minyak.cur,
            telur: totals.telur.cur,
            gula: 16500,
            cabai: 45000
          }
        })
      });
      const json = await res.json();
      if (json && json.success) {
        setAiInsight(json.insight);
      } else {
        setAiInsight('Gagal memuat evaluasi AI.');
      }
    } catch (err) {
      console.error('Error fetching AI insight:', err);
      setAiInsight('Koneksi terputus. Gagal memanggil Gemini.');
    } finally {
      setLoadingAi(false);
    }
  };

   // Fetch available periods on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        // Fetch periods from gizi_balita_skpg (2024-2025 SKPG monthly data)
        const { data: skpgData } = await supabase
          .from('gizi_balita_skpg')
          .select('tahun, bulan, total_balita')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false });

        // Also fetch from gizi_balita_skpg_kelurahan (2026+ kelurahan data)
        const { data: giziData } = await supabase
          .from('gizi_balita_skpg_kelurahan')
          .select('tahun, bulan, total_balita')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false });

        const uniquePeriods: { tahun: number; bulan: number }[] = [];
        const completePeriods: { tahun: number; bulan: number }[] = [];
        
        // Always include March 2026 baseline
        uniquePeriods.push({ tahun: 2026, bulan: 3 });
        completePeriods.push({ tahun: 2026, bulan: 3 });

        const addPeriod = (item: { tahun: number; bulan: number; total_balita?: number }) => {
          if (!uniquePeriods.some(p => p.tahun === item.tahun && p.bulan === item.bulan)) {
            uniquePeriods.push({ tahun: item.tahun, bulan: item.bulan });
          }
          // Only add to completePeriods if gizi data exists (total_balita > 0)
          if (item.total_balita && item.total_balita > 0) {
            if (!completePeriods.some(p => p.tahun === item.tahun && p.bulan === item.bulan)) {
              completePeriods.push({ tahun: item.tahun, bulan: item.bulan });
            }
          }
        };

        if (giziData) giziData.forEach(addPeriod);
        if (skpgData) skpgData.forEach(addPeriod);
        
        // Sort periods newest first
        uniquePeriods.sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
        completePeriods.sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
        setAvailablePeriods(uniquePeriods);

        // Auto-select latest COMPLETE period (with gizi data) on first load
        if (!initialLoaded && completePeriods.length > 0) {
          setSelectedYear(completePeriods[0].tahun);
          setSelectedMonth(completePeriods[0].bulan);
          setInitialLoaded(true);
        } else if (!initialLoaded && uniquePeriods.length > 0) {
          setSelectedYear(uniquePeriods[0].tahun);
          setSelectedMonth(uniquePeriods[0].bulan);
          setInitialLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching stunting periods:', err);
        const fallback = [{ tahun: 2026, bulan: 3 }, { tahun: 2025, bulan: 1 }];
        setAvailablePeriods(fallback);
        if (!initialLoaded) {
          setSelectedYear(fallback[0].tahun);
          setSelectedMonth(fallback[0].bulan);
          setInitialLoaded(true);
        }
      }
    };
    fetchPeriods();
  }, [initialLoaded]);

  const isPeriodAvailable = availablePeriods.some(p => p.tahun === selectedYear && p.bulan === selectedMonth);

  // Fetch prices and stunting dynamically if user changes date
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed (Jan = 1)
    const currentDate = now.getDate();
    const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;

    const isCurFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    // If strictly in the future, do not fetch anything, return N/A prices
    if (isCurFuture) {
      const emptyPrices: Record<string, { beras: number; minyak: number; telur: number }> = {};
      KECAMATANS.forEach(k => {
        emptyPrices[k] = { beras: 0, minyak: 0, telur: 0 };
      });
      setPricesCur(emptyPrices);
      setPricesPrev(emptyPrices);
      setNutrition(BASELINE_NUTRITION);
      return;
    }

    if (selectedYear === 2026 && selectedMonth === 3) {
      // Use exact high-fidelity Capture 1 baseline
      setPricesCur(BASELINE_PRICES_2026);
      setPricesPrev(Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {}));
      setNutrition(BASELINE_NUTRITION);
      return;
    }

    const fetchDynamicData = async () => {
      setLoading(true);

      let fetchMonth = selectedMonth;
      let fetchYear = selectedYear;

      // Rule: If requested month is current real month and we haven't reached the end of it,
      // fetch maximum previous month's data
      if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
        fetchMonth = selectedMonth - 1;
        if (fetchMonth === 0) {
          fetchMonth = 12;
          fetchYear = selectedYear - 1;
        }
      }

      try {
        // 1. Fetch live monthly market prices from SAGON API
        const sagonRes = await fetch(`/api/sagon-bulanan?month=${fetchMonth}&year=${fetchYear}`);
        const sagonJson = await sagonRes.json();

        if (sagonJson && sagonJson.success) {
          setPricesCur(sagonJson.pricesCur);
          setPricesPrev(sagonJson.pricesPrev);
        } else {
          console.warn('[AnalisisSKPG] Failed to fetch dynamic Sagon prices, using baseline fallbacks.');
          setPricesCur(BASELINE_PRICES_2026);
          setPricesPrev(Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {}));
        }

        // 2. Fetch nutrition (gizi balita)
        // For 2024 & 2025: read from gizi_balita_skpg (kecamatan-level SKPG monthly data)
        // For 2026+: read from gizi_balita (kelurahan-level aggregated data)
        if (fetchYear <= 2025) {
          // --- SKPG kecamatan-level table ---
          const { data: skpgGiziRows } = await supabase
            .from('gizi_balita_skpg')
            .select('kecamatan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_balita')
            .eq('tahun', fetchYear)
            .eq('bulan', fetchMonth);

          if (skpgGiziRows && skpgGiziRows.length > 0) {
            const kecNutr: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {};
            KECAMATANS.forEach(k => { kecNutr[k] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 }; });

            skpgGiziRows.forEach(r => {
              if (kecNutr[r.kecamatan] !== undefined) {
                kecNutr[r.kecamatan] = {
                  sangatKurang: r.bb_sangat_kurang || 0,
                  kurang:       r.bb_kurang || 0,
                  normal:       r.bb_normal || 0,
                  lebih:        r.bb_lebih || 0,
                  total:        r.total_balita || 0,
                };
              }
            });
            setNutrition(kecNutr);
          } else {
            setNutrition(BASELINE_NUTRITION);
          }
        } else {
          // --- 2026+: gizi_balita table (kelurahan-level) ---
          const { data: giziRows } = await supabase
            .from('gizi_balita')
            .select('*')
            .eq('tahun', fetchYear)
            .eq('bulan', fetchMonth);

          let activeGizi = giziRows;
          if (!activeGizi || activeGizi.length === 0) {
            const { data: fb } = await supabase
              .from('gizi_balita')
              .select('*')
              .eq('tahun', 2026)
              .eq('bulan', 1);
            activeGizi = fb;
          }

          if (activeGizi && activeGizi.length > 0) {
            const kecNutr: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {};
            KECAMATANS.forEach(k => { kecNutr[k] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 }; });

            activeGizi.forEach(r => {
              let foundKec = KECAMATANS.find(k => 
                (WILAYAH_KELURAHAN[k] || []).some(kel => kel.toLowerCase() === r.nama_kelurahan.toLowerCase())
              );
              if (foundKec) {
                const sk = r.gizi_sangat_kurang || 0;
                const kr = r.gizi_kurang || 0;
                const nm = r.gizi_normal || 0;
                const lb = r.gizi_berlebih || 0;
                kecNutr[foundKec].sangatKurang += sk;
                kecNutr[foundKec].kurang += kr;
                kecNutr[foundKec].normal += nm;
                kecNutr[foundKec].lebih += lb;
                kecNutr[foundKec].total += (sk + kr + nm + lb);
              }
            });
            setNutrition(kecNutr);
          } else {
            setNutrition(BASELINE_NUTRITION);
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic SKPG analysis data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, [selectedYear, selectedMonth]);

  // Trigger AI insight generation automatically on date or data changes
  useEffect(() => {
    if (loading || !isPeriodAvailable) return;
    const totals = getKotaCilegonAverages();
    fetchAiInsight(selectedYear, selectedMonth, totals);
  }, [selectedYear, selectedMonth, loading, isPeriodAvailable]);

  // Price Calculations (Keterjangkauan)
  const getKeterjangkauanRow = (kec: string) => {
    const cur = pricesCur[kec] || { beras: 0, minyak: 0, telur: 0 };
    const prev = pricesPrev[kec] || { beras: 0, minyak: 0, telur: 0 };

    const pricesAvailable = cur.beras > 0 && cur.minyak > 0 && cur.telur > 0 &&
                            prev.beras > 0 && prev.minyak > 0 && prev.telur > 0;

    if (!pricesAvailable) {
      return {
        cur,
        prev,
        rBeras: 0,
        rMinyak: 0,
        rTelur: 0,
        bobotBeras: '-' as any,
        bobotMinyak: '-' as any,
        bobotTelur: '-' as any,
        totalBobot: '-' as any,
        index: '-' as any,
        status: 'BELUM TERSEDIA',
        available: false
      };
    }

    // Price diff percentage (r)
    const rBeras = parseFloat(((cur.beras - prev.beras) / prev.beras * 100).toFixed(1));
    const rMinyak = parseFloat(((cur.minyak - prev.minyak) / prev.minyak * 100).toFixed(1));
    const rTelur = parseFloat(((cur.telur - prev.telur) / prev.telur * 100).toFixed(1));

    // Scoring Beras (r > 10% = 1, 5-10% = 2, r < 5% = 3)
    const bobotBeras = rBeras > 10 ? 1 : rBeras >= 5 ? 2 : 3;

    // Scoring Minyak & Telur (r > 15% = 1, 5-15% = 2, r < 5% = 3)
    const bobotMinyak = rMinyak > 15 ? 1 : rMinyak >= 5 ? 2 : 3;
    const bobotTelur = rTelur > 15 ? 1 : rTelur >= 5 ? 2 : 3;

    const totalBobot = bobotBeras + bobotMinyak + bobotTelur;

    // Index & Status (3-5 = Rentan, 6-7 = Waspada, 8-9 = Aman)
    const index = totalBobot >= 8 ? 3 : totalBobot >= 6 ? 2 : 1;
    const status = index === 3 ? 'AMAN' : index === 2 ? 'WASPADA' : 'RENTAN';

    return {
      cur,
      prev,
      rBeras,
      rMinyak,
      rTelur,
      bobotBeras,
      bobotMinyak,
      bobotTelur,
      totalBobot,
      index,
      status,
      available: true
    };
  };

  // Nutrition Calculations (Pemanfaatan)
  const getPemanfaatanRow = (kec: string) => {
    const nutr = nutrition[kec] || { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 100 };
    const underweightTotal = nutr.sangatKurang + nutr.kurang;
    const value = nutr.total > 0 ? parseFloat((underweightTotal / nutr.total * 100).toFixed(1)) : 0;

    // Cut-off (r > 15% = 1 / Rentan, 10-15% = 2 / Waspada, r < 10% = 3 / Aman)
    const bobot = value > 15 ? 1 : value >= 10 ? 2 : 3;
    const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

    return {
      nutr,
      underweightTotal,
      value,
      bobot,
      status
    };
  };

  // Combined Averages for KOTA CILEGON
  const getKotaCilegonAverages = () => {
    let sumPrevBeras = 0, sumCurBeras = 0;
    let sumPrevMinyak = 0, sumCurMinyak = 0;
    let sumPrevTelur = 0, sumCurTelur = 0;

    let totalSangatKurang = 0, totalKurang = 0, totalNormal = 0, totalLebih = 0, totalBalita = 0;

    KECAMATANS.forEach(kec => {
      const cur = pricesCur[kec] || { beras: 0, minyak: 0, telur: 0 };
      const prev = pricesPrev[kec] || { beras: 0, minyak: 0, telur: 0 };
      const nutr = nutrition[kec] || { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };

      sumCurBeras += cur.beras;
      sumPrevBeras += prev.beras;
      sumCurMinyak += cur.minyak;
      sumPrevMinyak += prev.minyak;
      sumCurTelur += cur.telur;
      sumPrevTelur += prev.telur;

      totalSangatKurang += nutr.sangatKurang;
      totalKurang += nutr.kurang;
      totalNormal += nutr.normal;
      totalLebih += nutr.lebih;
      totalBalita += nutr.total;
    });

    const num = KECAMATANS.length;
    const avgCurBeras = Math.round(sumCurBeras / num);
    const avgPrevBeras = Math.round(sumPrevBeras / num);
    const avgCurMinyak = Math.round(sumCurMinyak / num);
    const avgPrevMinyak = Math.round(sumPrevMinyak / num);
    const avgCurTelur = Math.round(sumCurTelur / num);
    const avgPrevTelur = Math.round(sumPrevTelur / num);

    const pricesAvailable = avgCurBeras > 0 && avgCurMinyak > 0 && avgCurTelur > 0 &&
                            avgPrevBeras > 0 && avgPrevMinyak > 0 && avgPrevTelur > 0;

    const underweightTotal = totalSangatKurang + totalKurang;
    const valueStunting = totalBalita > 0 ? parseFloat((underweightTotal / totalBalita * 100).toFixed(1)) : 0;
    const bobotStunting = valueStunting > 15 ? 1 : valueStunting >= 10 ? 2 : 3;
    const statusStunting = bobotStunting === 3 ? 'AMAN' : bobotStunting === 2 ? 'WASPADA' : 'RENTAN';

    if (!pricesAvailable) {
      return {
        beras: { cur: 0, prev: 0, r: 0, bobot: '-' as any },
        minyak: { cur: 0, prev: 0, r: 0, bobot: '-' as any },
        telur: { cur: 0, prev: 0, r: 0, bobot: '-' as any },
        totalBobotAkses: '-',
        indexAkses: '-' as any,
        statusAkses: 'BELUM TERSEDIA',
        availableAkses: false,

        nutrition: {
          sangatKurang: totalSangatKurang,
          kurang: totalKurang,
          normal: totalNormal,
          lebih: totalLebih,
          underweightTotal,
          totalBalita,
          value: valueStunting,
          bobot: bobotStunting,
          status: statusStunting
        }
      };
    }

    // price differentials
    const rBeras = parseFloat(((avgCurBeras - avgPrevBeras) / avgPrevBeras * 100).toFixed(1));
    const rMinyak = parseFloat(((avgCurMinyak - avgPrevMinyak) / avgPrevMinyak * 100).toFixed(1));
    const rTelur = parseFloat(((avgCurTelur - avgPrevTelur) / avgPrevTelur * 100).toFixed(1));

    const bobotBeras = rBeras > 10 ? 1 : rBeras >= 5 ? 2 : 3;
    const bobotMinyak = rMinyak > 15 ? 1 : rMinyak >= 5 ? 2 : 3;
    const bobotTelur = rTelur > 15 ? 1 : rTelur >= 5 ? 2 : 3;
    const totalBobotAkses = bobotBeras + bobotMinyak + bobotTelur;
    const indexAkses = totalBobotAkses >= 8 ? 3 : totalBobotAkses >= 6 ? 2 : 1;
    const statusAkses = indexAkses === 3 ? 'AMAN' : indexAkses === 2 ? 'WASPADA' : 'RENTAN';

    return {
      beras: { cur: avgCurBeras, prev: avgPrevBeras, r: rBeras, bobot: bobotBeras },
      minyak: { cur: avgCurMinyak, prev: avgPrevMinyak, r: rMinyak, bobot: bobotMinyak },
      telur: { cur: avgCurTelur, prev: avgPrevTelur, r: rTelur, bobot: bobotTelur },
      totalBobotAkses,
      indexAkses,
      statusAkses,
      availableAkses: true,

      nutrition: {
        sangatKurang: totalSangatKurang,
        kurang: totalKurang,
        normal: totalNormal,
        lebih: totalLebih,
        underweightTotal,
        totalBalita,
        value: valueStunting,
        bobot: bobotStunting,
        status: statusStunting
      }
    };
  };

  const kotaCilegon = getKotaCilegonAverages();

  const getAksesStatusMap = () => {
    const map: Record<string, 'aman' | 'waspada' | 'rentan'> = {};
    KECAMATANS.forEach(kec => {
      const row = getKeterjangkauanRow(kec);
      map[kec] = (row.status || 'AMAN').toLowerCase() as 'aman' | 'waspada' | 'rentan';
    });
    return map;
  };

  const getAksesChartData = () => {
    return [
      { name: 'Beras Medium', 'Bulan Berjalan': kotaCilegon.beras.cur, '1 Tahun Sebelumnya': kotaCilegon.beras.prev },
      { name: 'Minyak Kemasan', 'Bulan Berjalan': kotaCilegon.minyak.cur, '1 Tahun Sebelumnya': kotaCilegon.minyak.prev },
      { name: 'Telur Ayam', 'Bulan Berjalan': kotaCilegon.telur.cur, '1 Tahun Sebelumnya': kotaCilegon.telur.prev }
    ];
  };

  const getGiziStatusMap = () => {
    const map: Record<string, 'aman' | 'waspada' | 'rentan'> = {};
    KECAMATANS.forEach(kec => {
      const row = getPemanfaatanRow(kec);
      map[kec] = (row.status || 'AMAN').toLowerCase() as 'aman' | 'waspada' | 'rentan';
    });
    return map;
  };

  const getGiziPieData = () => {
    const normalVal = kotaCilegon.nutrition.totalBalita > 0 
      ? Math.round((kotaCilegon.nutrition.normal / kotaCilegon.nutrition.totalBalita) * 100) 
      : 90;
    const kurangVal = kotaCilegon.nutrition.totalBalita > 0 
      ? Math.round((kotaCilegon.nutrition.kurang / kotaCilegon.nutrition.totalBalita) * 100) 
      : 5;
    const sangatKurangVal = kotaCilegon.nutrition.totalBalita > 0 
      ? Math.round((kotaCilegon.nutrition.sangatKurang / kotaCilegon.nutrition.totalBalita) * 100) 
      : 1;
    const lebihVal = kotaCilegon.nutrition.totalBalita > 0 
      ? Math.round((kotaCilegon.nutrition.lebih / kotaCilegon.nutrition.totalBalita) * 100) 
      : 4;

    return [
      { name: 'Normal', value: kotaCilegon.nutrition.normal, percent: normalVal, color: '#10B981' },
      { name: 'Kurang', value: kotaCilegon.nutrition.kurang, percent: kurangVal, color: '#F59E0B' },
      { name: 'Sangat Kurang', value: kotaCilegon.nutrition.sangatKurang, percent: sangatKurangVal, color: '#EF4444' },
      { name: 'Lebih', value: kotaCilegon.nutrition.lebih, percent: lebihVal, color: '#3B82F6' }
    ];
  };

  const getKompositStatusMap = () => {
    const map: Record<string, 'aman' | 'waspada' | 'rentan'> = {};
    KECAMATANS.forEach(kec => {
      const akses = getKeterjangkauanRow(kec);
      const nutr = getPemanfaatanRow(kec);
      const score = akses.available ? (akses.index + nutr.bobot) : 0;
      const index = score === 6 ? 3 : score >= 4 ? 2 : 1;
      const status = index === 3 ? 'aman' : index === 2 ? 'waspada' : 'rentan';
      map[kec] = status;
    });
    return map;
  };

  const getKompositChartData = () => {
    return KECAMATANS.map(kec => {
      const akses = getKeterjangkauanRow(kec);
      const nutr = getPemanfaatanRow(kec);
      const score = akses.available ? (akses.index + nutr.bobot) : 0;
      return { name: kec, 'Skor Komposit': score };
    });
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed (Jan = 1)
  const currentDate = now.getDate();
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;

  let displayMonth = selectedMonth;
  let displayYear = selectedYear;

  // Rule: If requested month is current real month and we haven't reached the end of it,
  // display prices maximum from previous month
  if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
    displayMonth = selectedMonth - 1;
    if (displayMonth === 0) {
      displayMonth = 12;
      displayYear = selectedYear - 1;
    }
  }

  const labelCur = `${MONTH_NAMES_INDO[displayMonth]?.toUpperCase()} ${displayYear}`;
  const labelPrev = `${MONTH_NAMES_INDO[displayMonth]?.toUpperCase()} ${displayYear - 1}`;

  // Show loading state while auto-detecting latest period from DB
  if (selectedMonth === 0 || selectedYear === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 min-h-[200px]">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Memuat periode terbaru dari database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Filters */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B1E41] tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
            Analisis Komposit SKPG Bulanan
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">
            Kota Cilegon • Sistem Kewaspadaan Pangan & Gizi
          </p>
        </div>

        {/* Date Selector Toggles */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-2 shrink-0 border border-slate-200/50">
          <div className="flex items-center gap-1.5 bg-white py-1 px-3 rounded-lg shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer border-none"
            >
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => {
                const monthVal = i + 1;
                const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && monthVal > currentMonth);
                return (
                  <option key={monthVal} value={monthVal} disabled={isFutureMonth}>
                    {m}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="flex items-center gap-1.5 bg-white py-1 px-3 rounded-lg shadow-sm">
            <select
              value={selectedYear}
              onChange={(e) => {
                const nextYear = parseInt(e.target.value);
                setSelectedYear(nextYear);
                if (nextYear === currentYear && selectedMonth > currentMonth) {
                  setSelectedMonth(currentMonth);
                }
              }}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer border-none"
            >
              {[2024, 2025, 2026].map(y => {
                const isFutureYear = y > currentYear;
                return (
                  <option key={y} value={y} disabled={isFutureYear}>
                    Tahun {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Sub-Menu Navigation: SKPG Tingkat Kecamatan vs SKPG Tingkat Kelurahan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onSwitchView('analisis_skpg')}
          className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 text-left transition-all shadow-sm flex items-center justify-between group cursor-pointer"
        >
          <div>
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">SKPG Tingkat Kecamatan</h3>
            <p className="text-xs text-emerald-700/80 font-bold mt-1">Menampilkan analisis ketahanan pangan bulanan agregasi 8 Kecamatan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">Kec</div>
        </button>

        <button
          onClick={() => onSwitchView('analisis_skpg_kelurahan')}
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-350 text-left transition-all shadow-sm flex items-center justify-between group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider group-hover:text-emerald-700">SKPG Tingkat Kelurahan</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Menampilkan analisis ketahanan pangan bulanan agregasi 43 Kelurahan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">Kel</div>
        </button>
      </div>

      {loading ? (
        <div className="w-full min-h-[400px] bg-white rounded-2xl flex flex-col items-center justify-center border border-slate-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-bold">Menganalisis Data dan Menghitung Bobot Komposit...</p>
        </div>
      ) : (
        <>
          {/* 2. Aspek Akses Pangan (Keterjangkauan) */}
          <div className="dashboard-card overflow-hidden">
            <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
              I. Aspek Akses Pangan (Keterjangkauan)
              {selectedMonth === currentMonth && selectedYear === currentYear && isBeforeLastDay && (
                <span className="ml-3 text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black tracking-normal normal-case animate-pulse">
                  Menampilkan data {MONTH_NAMES_INDO[displayMonth]} {displayYear} (bulan berjalan belum berakhir)
                </span>
              )}
            </h3>

            {/* Visual 3-Panel Grid (Akses) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100/65">
              {/* Kolom 1: Peta (Span 4) */}
              <div className="lg:col-span-4 flex flex-col justify-between">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Peta Indikator Akses Pangan</h4>
                <MapSKPGMini level="kecamatan" dataStatus={getAksesStatusMap()} height="230px" />
              </div>
              
              {/* Kolom 2: Grafik (Span 5) */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Grafik Perbandingan Harga Pangan Strategis YoY</h4>
                <div className="h-[230px] w-full bg-white rounded-xl border border-slate-150 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getAksesChartData()} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                      <XAxis type="number" stroke="#94A3B8" fontSize={9} />
                      <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={9} width={90} />
                      <Tooltip formatter={(value) => value ? `Rp ${Number(value).toLocaleString('id-ID')}` : ''} contentStyle={{ fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px' }} />
                      <Bar dataKey="1 Tahun Sebelumnya" fill="#F97316" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Bulan Berjalan" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Kolom 3: Interpretasi (Span 3) */}
              <div className="lg:col-span-3 flex flex-col justify-between">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left font-black uppercase">Interpretasi Akses Pangan</h4>
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-center">
                  <div className="space-y-3.5 text-xs text-slate-650 font-bold">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-600">Beras Medium:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{
                        backgroundColor: kotaCilegon.beras.bobot === 3 ? '#6ABD45' : kotaCilegon.beras.bobot === 2 ? '#F7EC13' : '#ED1E24',
                        color: kotaCilegon.beras.bobot === 2 ? '#1E293B' : '#FFFFFF'
                      }}>
                        {kotaCilegon.beras.r}% ({kotaCilegon.beras.bobot === 3 ? 'AMAN' : kotaCilegon.beras.bobot === 2 ? 'WASPADA' : 'RENTAN'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-600">Minyak Goreng:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{
                        backgroundColor: kotaCilegon.minyak.bobot === 3 ? '#6ABD45' : kotaCilegon.minyak.bobot === 2 ? '#F7EC13' : '#ED1E24',
                        color: kotaCilegon.minyak.bobot === 2 ? '#1E293B' : '#FFFFFF'
                      }}>
                        {kotaCilegon.minyak.r}% ({kotaCilegon.minyak.bobot === 3 ? 'AMAN' : kotaCilegon.minyak.bobot === 2 ? 'WASPADA' : 'RENTAN'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-600">Telur Ayam:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{
                        backgroundColor: kotaCilegon.telur.bobot === 3 ? '#6ABD45' : kotaCilegon.telur.bobot === 2 ? '#F7EC13' : '#ED1E24',
                        color: kotaCilegon.telur.bobot === 2 ? '#1E293B' : '#FFFFFF'
                      }}>
                        {kotaCilegon.telur.r}% ({kotaCilegon.telur.bobot === 3 ? 'AMAN' : kotaCilegon.telur.bobot === 2 ? 'WASPADA' : 'RENTAN'})
                      </span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 block mb-1">STATUS AKSES PANGAN KOTA:</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black inline-block tracking-wider" style={{
                        backgroundColor: kotaCilegon.statusAkses === 'AMAN' ? '#6ABD45' : kotaCilegon.statusAkses === 'WASPADA' ? '#F7EC13' : '#ED1E24',
                        color: kotaCilegon.statusAkses === 'WASPADA' ? '#1E293B' : '#FFFFFF'
                      }}>
                        {kotaCilegon.statusAkses}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto select-none">
              <table className="w-full text-left border-collapse table-auto lg:table-fixed">
                <thead>
                  <tr className="bg-emerald-800 text-white text-[8px] md:text-[8.5px] font-black uppercase tracking-wider text-center border-b border-emerald-900">
                    <th className="py-2.5 px-1 text-left border-r border-emerald-900 rounded-tl-lg w-[3%]" rowSpan={2}>No</th>
                    <th className="py-2.5 px-2 text-left border-r border-emerald-900 w-[11%]" rowSpan={2}>Kecamatan</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 w-[14%]" colSpan={2}>Beras Medium (Rp/kg)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-orange-850 w-[14%]" colSpan={2}>Minyak Kemasan (Rp/Lt)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-blue-850 w-[14%]" colSpan={2}>Telur Ayam Ras (Rp/kg)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[10%]" colSpan={2}>Beras</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[10%]" colSpan={2}>Minyak Goreng</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[10%]" colSpan={2}>Telur Ayam</th>
                    <th className="py-1.5 px-2 bg-amber-600 rounded-tr-lg w-[14%]" colSpan={3}>Akses Pangan (Keterjangkauan)</th>
                  </tr>
                  <tr className="bg-emerald-700/80 text-white text-[7px] md:text-[7.5px] font-black uppercase text-center border-b border-emerald-900">
                    {/* Beras Prices */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 text-orange-300 font-black">{labelPrev}</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Minyak Prices */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 text-orange-300 font-black">{labelPrev}</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Telur Prices */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 text-orange-300 font-black">{labelPrev}</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Bobot Beras */}
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Bobot Minyak */}
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Bobot Telur */}
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-1.5 px-0.5 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Keterjangkauan Combined */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Bobot</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Status</th>
                    <th className="py-1.5 px-1 bg-amber-500/80 text-slate-900">Indeks</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-semibold text-slate-700 divide-y divide-slate-100">
                  {KECAMATANS.map((kec, i) => {
                    const row = getKeterjangkauanRow(kec);
                    return (
                      <tr key={kec} className="hover:bg-slate-50/80 transition-all text-center">
                        <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kec}</td>
                        {/* Beras prices */}
                        <td className="py-2 px-2 border-r border-slate-100 text-orange-500 font-bold">
                          {row.prev.beras > 0 ? row.prev.beras.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">
                          {row.cur.beras > 0 ? row.cur.beras.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        {/* Minyak prices */}
                        <td className="py-2 px-2 border-r border-slate-100 text-orange-500 font-bold">
                          {row.prev.minyak > 0 ? row.prev.minyak.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">
                          {row.cur.minyak > 0 ? row.cur.minyak.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        {/* Telur prices */}
                        <td className="py-2 px-2 border-r border-slate-100 text-orange-500 font-bold">
                          {row.prev.telur > 0 ? row.prev.telur.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">
                          {row.cur.telur > 0 ? row.cur.telur.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        {/* Beras values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.available && row.rBeras > 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {row.available ? `${row.rBeras}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotBeras}</td>
                        {/* Minyak values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.available && row.rMinyak > 15 ? 'text-rose-600' : row.available && row.rMinyak > 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {row.available ? `${row.rMinyak}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotMinyak}</td>
                        {/* Telur values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.available && row.rTelur > 15 ? 'text-rose-600' : row.available && row.rTelur > 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {row.available ? `${row.rTelur}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotTelur}</td>
                        {/* Keterjangkauan index */}
                        <td className="py-2 px-2 border-r border-slate-100 font-black text-slate-900 bg-amber-50/30">{row.totalBobot}</td>
                        <td className="py-2 px-2 border-r border-slate-100 font-black bg-amber-50/30">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                            row.status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                            row.status === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                            row.status === 'BELUM TERSEDIA' ? 'bg-slate-100 text-slate-500' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className={`py-2 px-2 font-black bg-amber-50/30 ${
                          row.index === 3 ? 'text-emerald-600' :
                          row.index === 2 ? 'text-amber-500' :
                          row.index === 1 ? 'text-rose-600' : 'text-slate-400'
                        }`}>{row.index}</td>
                      </tr>
                    );
                  })}
                  {/* Kota Cilegon Average */}
                  <tr className="bg-slate-50/90 text-center font-black border-t-2 border-slate-200">
                    <td className="py-3 px-3 border-r border-slate-100" colSpan={2}>KOTA CILEGON</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-orange-500 font-bold">
                      {kotaCilegon.beras.prev > 0 ? kotaCilegon.beras.prev.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">
                      {kotaCilegon.beras.cur > 0 ? kotaCilegon.beras.cur.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-2 border-r border-slate-100 text-orange-500 font-bold">
                      {kotaCilegon.minyak.prev > 0 ? kotaCilegon.minyak.prev.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">
                      {kotaCilegon.minyak.cur > 0 ? kotaCilegon.minyak.cur.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-2 border-r border-slate-100 text-orange-500 font-bold">
                      {kotaCilegon.telur.prev > 0 ? kotaCilegon.telur.prev.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">
                      {kotaCilegon.telur.cur > 0 ? kotaCilegon.telur.cur.toLocaleString('id-ID') : 'N/A'}
                    </td>
                    <td className="py-3 px-1 border-r border-slate-100 text-amber-600">
                      {kotaCilegon.availableAkses ? `${kotaCilegon.beras.r}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.beras.bobot}</td>
                    <td className="py-3 px-1 border-r border-slate-100 text-rose-600">
                      {kotaCilegon.availableAkses ? `${kotaCilegon.minyak.r}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.minyak.bobot}</td>
                    <td className="py-3 px-1 border-r border-slate-100 text-slate-600">
                      {kotaCilegon.availableAkses ? `${kotaCilegon.telur.r}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.telur.bobot}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-900 bg-amber-100/40">{kotaCilegon.totalBobotAkses}</td>
                    <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                        kotaCilegon.statusAkses === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                        kotaCilegon.statusAkses === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                        kotaCilegon.statusAkses === 'BELUM TERSEDIA' ? 'bg-slate-100 text-slate-500' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {kotaCilegon.statusAkses}
                      </span>
                    </td>
                    <td className={`py-3 px-2 bg-amber-100/40 font-black ${
                      kotaCilegon.indexAkses === 3 ? 'text-emerald-600' :
                      kotaCilegon.indexAkses === 2 ? 'text-amber-500' :
                      kotaCilegon.indexAkses === 1 ? 'text-rose-600' : 'text-slate-400'
                    }`}>{kotaCilegon.indexAkses}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2, Table 3 and Recommendations: only rendered if isPeriodAvailable is true */}
          {isPeriodAvailable ? (
            <>
              {/* 3. Aspek Pemanfaatan Pangan (Gizi) */}
              <div className="dashboard-card overflow-hidden">
                <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Utensils className="w-4.5 h-4.5 text-emerald-600" />
                  II. Aspek Pemanfaatan Pangan (Nutrition/Gizi Balita)
                </h3>

                {/* Visual 3-Panel Grid (Gizi) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100/65">
                  {/* Kolom 1: Peta (Span 4) */}
                  <div className="lg:col-span-4 flex flex-col justify-between">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Peta Indikator Pemanfaatan Pangan</h4>
                    <MapSKPGMini level="kecamatan" dataStatus={getGiziStatusMap()} height="230px" />
                  </div>
                  
                  {/* Kolom 2: Grafik (Span 5) */}
                  <div className="lg:col-span-5 flex flex-col justify-between">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Grafik Distribusi Status Gizi Balita (BB/U)</h4>
                    <div className="h-[230px] w-full bg-white rounded-xl border border-slate-150 p-2 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getGiziPieData()}
                            cx="50%"
                            cy="45%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {getGiziPieData().map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                           <Tooltip formatter={(value) => value ? `${Number(value).toLocaleString('id-ID')} balita` : ''} contentStyle={{ fontSize: '10px' }} />
                          <Legend wrapperStyle={{ fontSize: '9px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Kolom 3: Interpretasi (Span 3) */}
                  <div className="lg:col-span-3 flex flex-col justify-between">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left font-black uppercase">Interpretasi Pemanfaatan Pangan</h4>
                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-center">
                      <div className="space-y-3.5 text-xs text-slate-650 font-bold">
                        {(() => {
                          const pie = getGiziPieData();
                          return (
                            <>
                              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-600">BB Normal:</span>
                                <span className="text-[#6ABD45] font-extrabold">{pie[0].percent}%</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-600">BB Kurang & Sgt Kurang:</span>
                                <span className="text-amber-600 font-extrabold">{(pie[1].percent + pie[2].percent)}%</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-600">BB Berlebih:</span>
                                <span className="text-blue-600 font-extrabold">{pie[3].percent}%</span>
                              </div>
                              <div className="pt-2">
                                <span className="text-[10px] text-slate-400 block mb-1">STATUS PEMANFAATAN KOTA:</span>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-black inline-block tracking-wider" style={{
                                  backgroundColor: kotaCilegon.nutrition.status === 'AMAN' ? '#6ABD45' : kotaCilegon.nutrition.status === 'WASPADA' ? '#F7EC13' : '#ED1E24',
                                  color: kotaCilegon.nutrition.status === 'WASPADA' ? '#1E293B' : '#FFFFFF'
                                }}>
                                  {kotaCilegon.nutrition.status}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto select-none">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-emerald-800 text-white text-[9px] font-black uppercase tracking-wider text-center border-b border-emerald-900">
                        <th className="py-3 px-3 text-left border-r border-emerald-900 rounded-tl-lg" rowSpan={2}>No</th>
                        <th className="py-3 px-3 text-left border-r border-emerald-900" rowSpan={2}>Kecamatan</th>
                        <th className="py-2 px-2 border-r border-emerald-900" colSpan={4}>Status Gizi Balita (BB/U)</th>
                        <th className="py-2 px-2 border-r border-emerald-900 bg-emerald-900/40" rowSpan={2}>BB Sangat Kurang + BB Kurang</th>
                        <th className="py-2 px-2 border-r border-emerald-900 bg-emerald-900/40" rowSpan={2}>Total Balita (BB/U)</th>
                        <th className="py-2 px-3 bg-amber-600 rounded-tr-lg" colSpan={3}>Pemanfaatan Pangan (Hasil SKPG)</th>
                      </tr>
                      <tr className="bg-emerald-700/80 text-white text-[8px] font-black uppercase text-center border-b border-emerald-900">
                        <th className="py-2 px-2 border-r border-emerald-900">Sangat Kurang</th>
                        <th className="py-2 px-2 border-r border-emerald-900">Kurang</th>
                        <th className="py-2 px-2 border-r border-emerald-900">Normal</th>
                        <th className="py-2 px-2 border-r border-emerald-900">BB Lebih</th>
                        <th className="py-2 px-2 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Value (%)</th>
                        <th className="py-2 px-2 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Bobot</th>
                        <th className="py-2 px-2 bg-amber-500/80 text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-semibold text-slate-700 divide-y divide-slate-100">
                      {KECAMATANS.map((kec, i) => {
                        const row = getPemanfaatanRow(kec);
                        return (
                          <tr key={kec} className="hover:bg-slate-50/80 transition-all text-center">
                            <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-slate-400">{i + 1}</td>
                            <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kec}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-bold text-rose-600">{row.nutr.sangatKurang}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-bold text-amber-500">{row.nutr.kurang}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-slate-600">{row.nutr.normal}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-slate-400">{row.nutr.lebih}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-black text-[#0B1E41] bg-slate-50/50">{row.underweightTotal}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-black text-slate-500 bg-slate-50/50">{row.nutr.total}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-black bg-amber-50/30 text-slate-900">{row.value}%</td>
                            <td className={`py-2 px-2 border-r border-slate-100 font-black bg-amber-50/30 ${
                              row.bobot === 3 ? 'text-emerald-600' : 'text-amber-500'
                            }`}>{row.bobot}</td>
                            <td className="py-2 px-2 bg-amber-50/30">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                row.status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Kota Cilegon Average */}
                      <tr className="bg-slate-50/90 text-center font-black border-t-2 border-slate-200">
                        <td className="py-3 px-3 border-r border-slate-100" colSpan={2}>KOTA CILEGON</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-rose-600">{kotaCilegon.nutrition.sangatKurang}</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-amber-500">{kotaCilegon.nutrition.kurang}</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-slate-600">{kotaCilegon.nutrition.normal}</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-slate-400">{kotaCilegon.nutrition.lebih}</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-slate-900 bg-slate-100/50">{kotaCilegon.nutrition.underweightTotal}</td>
                        <td className="py-3 px-2 border-r border-slate-100 text-slate-500 bg-slate-100/50">{kotaCilegon.nutrition.totalBalita}</td>
                        <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40 text-slate-900">{kotaCilegon.nutrition.value}%</td>
                        <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40 text-emerald-600">{kotaCilegon.nutrition.bobot}</td>
                        <td className="py-3 px-2 bg-amber-100/40">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider bg-emerald-100 text-emerald-800`}>
                            {kotaCilegon.nutrition.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section III heading - positioned directly above composite map */}
              <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-4 flex items-center gap-2.5 mt-2">
                <Package className="w-4.5 h-4.5 text-[#10B981]" />
                III. Indeks Komposit Ketahanan Pangan Bulanan
              </h3>

              {/* Visual 3-Panel Grid (Komposit) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100/65">
                {/* Kolom 1: Peta (Span 4) */}
                <div className="lg:col-span-4 flex flex-col justify-between">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Peta Indikator Komposit SKPG</h4>
                  <MapSKPGMini level="kecamatan" dataStatus={getKompositStatusMap()} height="240px" />
                </div>
                
                {/* Kolom 2: Grafik (Span 4) */}
                <div className="lg:col-span-4 flex flex-col justify-between">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left">Perbandingan Skor Komposit Antar Kecamatan</h4>
                  <div className="h-[240px] w-full bg-white rounded-xl border border-slate-150 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getKompositChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} domain={[0, 6]} tickCount={7} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="Skor Komposit" fill="#10B981" radius={[4, 4, 0, 0]}>
                          {getKompositChartData().map((entry, idx) => {
                            const colors = ['#EF4444', '#F59E0B', '#10B981']; // Rentan, Waspada, Aman
                            const idxCol = entry['Skor Komposit'] === 6 ? 2 : entry['Skor Komposit'] >= 4 ? 1 : 0;
                            return <Cell key={`cell-${idx}`} fill={colors[idxCol]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Kolom 3: Status Komposit (Span 4) */}
                <div className="lg:col-span-4 flex flex-col justify-between">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2 text-center lg:text-left font-black uppercase">Status Komposit Kota</h4>
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-center">
                    {(() => {
                      const score = kotaCilegon.availableAkses ? (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) : 0;
                      const status = score === 6 ? 'AMAN' : score >= 4 ? 'WASPADA' : 'RENTAN';
                      return (
                        <div className="space-y-3.5 text-xs text-slate-650 font-bold">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-600">IA (Index Akses) Kota:</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{
                              backgroundColor: kotaCilegon.indexAkses === 3 ? '#6ABD45' : kotaCilegon.indexAkses === 2 ? '#F7EC13' : '#ED1E24',
                              color: kotaCilegon.indexAkses === 2 ? '#1E293B' : '#FFFFFF'
                            }}>
                              {kotaCilegon.indexAkses} ({kotaCilegon.statusAkses})
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-600">IP (Index Pemanfaatan) Kota:</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white" style={{
                              backgroundColor: kotaCilegon.nutrition.bobot === 3 ? '#6ABD45' : kotaCilegon.nutrition.bobot === 2 ? '#F7EC13' : '#ED1E24',
                              color: kotaCilegon.nutrition.bobot === 2 ? '#1E293B' : '#FFFFFF'
                            }}>
                              {kotaCilegon.nutrition.bobot} ({kotaCilegon.nutrition.status})
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <span className="text-slate-600">Skor Komposit (IA + IP):</span>
                            <span className="text-slate-800 font-extrabold text-sm">{score}</span>
                          </div>
                          <div className="pt-2">
                            <span className="text-[10px] text-slate-400 block mb-1">STATUS KOMPOSIT KOTA:</span>
                            <span className="px-3.5 py-1.5 rounded-lg text-sm font-black inline-block tracking-wider" style={{
                              backgroundColor: status === 'AMAN' ? '#6ABD45' : status === 'WASPADA' ? '#F7EC13' : '#ED1E24',
                              color: status === 'WASPADA' ? '#1E293B' : '#FFFFFF'
                            }}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 4. Composite Matrix Map & Policies */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Table 3: Combined Composite Matrix Map (Span 7) */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="dashboard-card flex-1">


                    <div className="overflow-x-auto select-none">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider text-center border-b border-slate-900">
                            <th className="py-3 px-3 text-left border-r border-slate-900 rounded-tl-lg">Kecamatan</th>
                            <th className="py-3 px-2 border-r border-slate-900 bg-emerald-900/30">IA (Index Akses)</th>
                            <th className="py-3 px-2 border-r border-slate-900 bg-blue-900/30">IP (Index Pemanfaatan)</th>
                            <th className="py-3 px-2 border-r border-slate-900 bg-amber-900/35">Skor Komposit (IA + IP)</th>
                            <th className="py-3 px-2 border-r border-slate-900 bg-amber-900/35">Keterangan</th>
                            <th className="py-3 px-3 bg-amber-750 rounded-tr-lg">Indeks</th>
                          </tr>
                        </thead>
                        <tbody className="text-[10px] font-semibold text-slate-700 divide-y divide-slate-100 text-center">
                          {KECAMATANS.map(kec => {
                            const akses = getKeterjangkauanRow(kec);
                            const nutr = getPemanfaatanRow(kec);

                            const pricesAvailable = akses.available;
                            const combinedScore = pricesAvailable ? (akses.index + nutr.bobot) : '-';
                            const status = pricesAvailable ? (combinedScore === 6 ? 'AMAN' : combinedScore >= 4 ? 'WASPADA' : 'RENTAN') : 'BELUM TERSEDIA';
                            const finalIndex = pricesAvailable ? (combinedScore === 6 ? 3 : combinedScore >= 4 ? 2 : 1) : '-';

                            return (
                              <tr key={kec} className="hover:bg-slate-50/80 transition-all">
                                <td className="py-2.5 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kec}</td>
                                <td className={`py-2.5 px-2 border-r border-slate-100 font-bold bg-emerald-50/20 ${
                                  akses.index === 3 ? 'text-emerald-600' : akses.index === 2 ? 'text-amber-500' : akses.index === 1 ? 'text-rose-600' : 'text-slate-400'
                                }`}>{akses.index}</td>
                                <td className={`py-2.5 px-2 border-r border-slate-100 font-bold bg-blue-50/20 ${
                                  nutr.bobot === 3 ? 'text-emerald-600' : nutr.bobot === 2 ? 'text-amber-500' : 'text-rose-600'
                                }`}>{nutr.bobot}</td>
                                
                                <td className="py-2.5 px-2 border-r border-slate-100 font-black text-slate-800 bg-amber-50/30">{combinedScore}</td>
                                <td className="py-2.5 px-2 border-r border-slate-100 font-black bg-amber-50/30">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                    status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                                    status === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                                    status === 'BELUM TERSEDIA' ? 'bg-slate-100 text-slate-500' :
                                    'bg-rose-100 text-rose-800 animate-pulse'
                                  }`}>
                                    {status}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-2 font-black bg-amber-50/30 ${
                                  finalIndex === 3 ? 'text-emerald-600' :
                                  finalIndex === 2 ? 'text-amber-500' :
                                  finalIndex === 1 ? 'text-rose-600' : 'text-slate-400'
                                }`}>{finalIndex}</td>
                              </tr>
                            );
                          })}
                          {/* Kota Cilegon Average */}
                          <tr className="bg-slate-50/90 text-center font-black border-t-2 border-slate-200">
                            <td className="py-3 px-3 border-r border-slate-100 text-left">KOTA CILEGON</td>
                            <td className={`py-3 px-2 border-r border-slate-100 ${
                              kotaCilegon.indexAkses === 3 ? 'text-emerald-600' : kotaCilegon.indexAkses === 2 ? 'text-amber-500' : kotaCilegon.indexAkses === 1 ? 'text-rose-600' : 'text-slate-400'
                            }`}>{kotaCilegon.indexAkses}</td>
                            <td className={`py-3 px-2 border-r border-slate-100 ${
                              kotaCilegon.nutrition.bobot === 3 ? 'text-emerald-600' : kotaCilegon.nutrition.bobot === 2 ? 'text-amber-500' : 'text-rose-600'
                            }`}>{kotaCilegon.nutrition.bobot}</td>
                            
                            <td className="py-3 px-2 border-r border-slate-100 text-slate-800 bg-amber-100/40">
                              {kotaCilegon.availableAkses ? (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) : '-'}
                            </td>
                            <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                !kotaCilegon.availableAkses ? 'bg-slate-100 text-slate-500' :
                                (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {!kotaCilegon.availableAkses ? 'BELUM TERSEDIA' : (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'AMAN' : 'WASPADA'}
                              </span>
                            </td>
                            <td className={`py-3 px-2 bg-amber-100/40 font-black ${
                              !kotaCilegon.availableAkses ? 'text-slate-400' :
                              (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'text-emerald-600' : 'text-amber-500'
                            }`}>
                              {!kotaCilegon.availableAkses ? '-' : (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 3 : 2}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Component 4: GovTech Policy Recommendations (Span 5) */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="dashboard-card bg-gradient-to-br from-white to-emerald-50/15 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <Brain className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                        IV. Rekomendasi Kebijakan & Tindak Lanjut
                      </h3>

                      <div className="space-y-4 text-[11px] leading-relaxed text-slate-600 font-semibold">
                        <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-xl">
                          <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                            Status Aspek Pemanfaatan (Gizi): AMAN
                          </h4>
                          <p>
                            Seluruh kecamatan di Kota Cilegon mencatatkan prevalensi balita underweight di bawah 10% (Rata-rata kota: **{kotaCilegon.nutrition.value}%**). Rekomendasi: Pertahankan program Posyandu aktif, lanjutkan penyuluhan gizi seimbang bagi ibu hamil dan menyusui untuk menjaga status stunting yang sangat baik ini.
                          </p>
                        </div>

                        <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-xl">
                          <h4 className="font-black text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 animate-bounce" />
                            Peringatan Aspek Akses (Harga): WASPADA
                          </h4>
                          <p>
                            Rata-rata kota berada pada status **WASPADA** (Bobot Akses: **{kotaCilegon.totalBobotAkses}**), didorong oleh kenaikan harga minyak goreng yang signifikan (**+{kotaCilegon.minyak.r}%** dibanding tahun lalu).
                          </p>
                          <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-700">
                            <li><strong>Kecamatan Pulomerak, Ciwandan, Jombang, Gerogol, Purwakarta</strong> berada pada status <strong>RENTAN (Bobot 1)</strong> untuk akses pangan.</li>
                            <li><strong>Kecamatan Cibeber, Cilegon, Citangkil</strong> berada pada status <strong>WASPADA</strong>.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="font-black text-[#0B1E41] text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        Alternatif Solusi & Kebijakan Intervensi SKPG:
                      </h4>
                      <div className="space-y-2.5">
                        <div className="flex gap-2 text-[10px] text-slate-700 font-bold bg-white p-2.5 rounded-lg shadow-sm border border-slate-100">
                          <span className="text-rose-500">•</span>
                          <span><strong>Operasi Pasar & GPM</strong>: Luncurkan Gerakan Pangan Murah (GPM) khusus minyak goreng kemasan dan beras medium di kecamatan berstatus Rentan (Pulomerak, Ciwandan, Jombang, Gerogol, Purwakarta).</span>
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-700 font-bold bg-white p-2.5 rounded-lg shadow-sm border border-slate-100">
                          <span className="text-emerald-500">•</span>
                          <span><strong>Pengawasan Stok Distributor</strong>: Dinas Perdagangan (Disperindag) Kota Cilegon harus berkolaborasi dengan Bulog untuk memverifikasi rantai pasok minyak kemasan guna meredam lonjakan inflasi pangan.</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-slate-150 shadow-sm flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-6 transition-all animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 mb-4 animate-bounce">
                <ShieldAlert className="w-8 h-8 shrink-0" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                Data Balita BB/U (Status Gizi) Belum Tersedia
              </h3>
              <p className="text-xs text-slate-500 font-bold max-w-lg mb-4">
                Aspek Akses Pangan (Harga Komoditas) untuk bulan <span className="text-emerald-600 font-black">{MONTH_NAMES_INDO[displayMonth]} {displayYear}</span> selalu terupdate secara real-time dari SAGON. Namun, analisis komposit SKPG memerlukan data status gizi balita yang harus diunggah secara manual oleh Admin Kota.
              </p>
              
              <div className="w-full border-t border-slate-200/60 pt-6 mt-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 text-center">
                  Pilihan Data Analisis SKPG yang Tersedia Yaitu:
                </h4>
                {(() => {
                  const mid = Math.ceil(availablePeriods.length / 2);
                  const col1 = availablePeriods.slice(0, mid);
                  const col2 = availablePeriods.slice(mid);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-xl mx-auto text-left">
                      {/* Kolom 1 (Terbaru -> Tengah) */}
                      <div className="flex flex-col gap-2">
                        {col1.map((p, idx) => (
                          <button
                            key={`col1-${idx}`}
                            onClick={() => {
                              setSelectedMonth(p.bulan);
                              setSelectedYear(p.tahun);
                            }}
                            className="w-full px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition-all border border-emerald-200/50 shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] hover:translate-x-1"
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span>{MONTH_NAMES_INDO[p.bulan]} {p.tahun}</span>
                          </button>
                        ))}
                      </div>

                      {/* Kolom 2 (Tengah -> Terlama) */}
                      <div className="flex flex-col gap-2">
                        {col2.map((p, idx) => (
                          <button
                            key={`col2-${idx}`}
                            onClick={() => {
                              setSelectedMonth(p.bulan);
                              setSelectedYear(p.tahun);
                            }}
                            className="w-full px-4 py-2.5 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800/90 font-extrabold text-xs rounded-xl transition-all border border-emerald-200/30 shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] hover:translate-x-1"
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-600/80" />
                            <span>{MONTH_NAMES_INDO[p.bulan]} {p.tahun}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
