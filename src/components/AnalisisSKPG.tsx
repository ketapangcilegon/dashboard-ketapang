"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Brain, BarChart3, TrendingUp, Package, Utensils, Calendar, MapPin, Loader2, CheckCircle, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Standard Kecamatan
const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'] as const;

// Market mapping rules
// Pasar Kranggot (Market 1) -> Jombang, Purwakarta, Ciwandan, Cilegon
// Pasar Kavling Blok F (Market 2) -> Cibeber, Cilegon
// Pasar Baru Merak (Market 3) -> Pulomerak, Gerogol
// Citangkil -> gets a balanced blend matching Capture 1

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
  Citangkil:  { beras: 13371, minyak: 21419, telur: 30133 }, // Balanced Average
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

export default function AnalisisSKPG() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(3); // March (to match Capture 1 baseline)
  const [loading, setLoading] = useState(false);

  // Dynamic state computed from database
  const [pricesCur, setPricesCur] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(BASELINE_PRICES_2026);
  const [pricesPrev, setPricesPrev] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(
    Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {})
  );
  
  const [nutrition, setNutrition] = useState<Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }>>(BASELINE_NUTRITION);

  const [availablePeriods, setAvailablePeriods] = useState<{ tahun: number; bulan: number }[]>([]);

  // Fetch available periods on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data } = await supabase
          .from('gizi_balita')
          .select('tahun, bulan')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false });

        const uniquePeriods: { tahun: number; bulan: number }[] = [];
        
        // Always include March 2026 baseline
        uniquePeriods.push({ tahun: 2026, bulan: 3 });

        if (data) {
          data.forEach(item => {
            if (!uniquePeriods.some(p => p.tahun === item.tahun && p.bulan === item.bulan)) {
              uniquePeriods.push({ tahun: item.tahun, bulan: item.bulan });
            }
          });
        }
        
        // Sort periods
        uniquePeriods.sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
        setAvailablePeriods(uniquePeriods);
      } catch (err) {
        console.error('Error fetching stunting periods:', err);
        setAvailablePeriods([{ tahun: 2026, bulan: 3 }, { tahun: 2026, bulan: 1 }]);
      }
    };
    fetchPeriods();
  }, []);

  const isPeriodAvailable = availablePeriods.some(p => p.tahun === selectedYear && p.bulan === selectedMonth);

  // Fetch prices and stunting dynamically if user changes date
  useEffect(() => {
    if (selectedYear === 2026 && selectedMonth === 3) {
      // Use exact high-fidelity Capture 1 baseline
      setPricesCur(BASELINE_PRICES_2026);
      setPricesPrev(Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {}));
      setNutrition(BASELINE_NUTRITION);
      return;
    }

    const fetchDynamicData = async () => {
      setLoading(true);
      try {
        // 1. Fetch live monthly market prices from SAGON API
        const sagonRes = await fetch(`/api/sagon-bulanan?month=${selectedMonth}&year=${selectedYear}`);
        const sagonJson = await sagonRes.json();

        if (sagonJson && sagonJson.success) {
          setPricesCur(sagonJson.pricesCur);
          setPricesPrev(sagonJson.pricesPrev);
        } else {
          console.warn('[AnalisisSKPG] Failed to fetch dynamic Sagon prices, using baseline fallbacks.');
          setPricesCur(BASELINE_PRICES_2026);
          setPricesPrev(Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {}));
        }

        // 2. Fetch live stunting from gizi_balita table
        const { data: giziRows } = await supabase
          .from('gizi_balita')
          .select('*')
          .eq('tahun', selectedYear)
          .eq('bulan', selectedMonth);

        // Fallback to January 2026 if empty
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
          KECAMATANS.forEach(k => {
            kecNutr[k] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };
          });

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
      } catch (err) {
        console.error('Error fetching dynamic SKPG analysis data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, [selectedYear, selectedMonth]);

  // Price Calculations (Keterjangkauan)
  const getKeterjangkauanRow = (kec: string) => {
    const cur = pricesCur[kec] || { beras: 13500, minyak: 21000, telur: 30000 };
    const prev = pricesPrev[kec] || BASELINE_PRICES_2025;

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
      status
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

    const underweightTotal = totalSangatKurang + totalKurang;
    const valueStunting = totalBalita > 0 ? parseFloat((underweightTotal / totalBalita * 100).toFixed(1)) : 0;
    const bobotStunting = valueStunting > 15 ? 1 : valueStunting >= 10 ? 2 : 3;
    const statusStunting = bobotStunting === 3 ? 'AMAN' : bobotStunting === 2 ? 'WASPADA' : 'RENTAN';

    return {
      beras: { cur: avgCurBeras, prev: avgPrevBeras, r: rBeras, bobot: bobotBeras },
      minyak: { cur: avgCurMinyak, prev: avgPrevMinyak, r: rMinyak, bobot: bobotMinyak },
      telur: { cur: avgCurTelur, prev: avgPrevTelur, r: rTelur, bobot: bobotTelur },
      totalBobotAkses,
      indexAkses,
      statusAkses,

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

  const labelCur = `${MONTH_NAMES_INDO[selectedMonth]?.toUpperCase()} ${selectedYear}`;
  const labelPrev = `${MONTH_NAMES_INDO[selectedMonth]?.toUpperCase()} ${selectedYear - 1}`;

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
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-1.5 bg-white py-1 px-3 rounded-lg shadow-sm">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer border-none"
            >
              {[2025, 2026].map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>
        </div>
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
            </h3>
            
            <div className="overflow-x-auto select-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-800 text-white text-[9px] font-black uppercase tracking-wider text-center border-b border-emerald-900">
                    <th className="py-3 px-3 text-left border-r border-emerald-900 rounded-tl-lg" rowSpan={2}>No</th>
                    <th className="py-3 px-3 text-left border-r border-emerald-900" rowSpan={2}>Kecamatan</th>
                    <th className="py-2 px-2 border-r border-emerald-900" colSpan={2}>Beras Medium (Rp/kg)</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-orange-850" colSpan={2}>Minyak Kemasan (Rp/Lt)</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-blue-850" colSpan={2}>Telur Ayam Ras (Rp/kg)</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-yellow-600" colSpan={2}>Beras</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-yellow-600" colSpan={2}>Minyak Goreng</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-yellow-600" colSpan={2}>Telur Ayam</th>
                    <th className="py-2 px-3 bg-amber-600 rounded-tr-lg" colSpan={3}>Akses Pangan (Keterjangkauan)</th>
                  </tr>
                  <tr className="bg-emerald-700/80 text-white text-[8px] font-black uppercase text-center border-b border-emerald-900">
                    {/* Beras */}
                    <th className="py-2 px-2 border-r border-emerald-900 text-emerald-200/90 font-black">{labelPrev}</th>
                    <th className="py-2 px-2 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Minyak */}
                    <th className="py-2 px-2 border-r border-emerald-900 text-emerald-200/90 font-black">{labelPrev}</th>
                    <th className="py-2 px-2 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Telur */}
                    <th className="py-2 px-2 border-r border-emerald-900 text-emerald-200/90 font-black">{labelPrev}</th>
                    <th className="py-2 px-2 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Bobot Beras */}
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Bobot Minyak */}
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Bobot Telur */}
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Diff %</th>
                    <th className="py-2 px-1 border-r border-emerald-900 bg-yellow-500/80 text-slate-900">Skor</th>
                    {/* Keterjangkauan */}
                    <th className="py-2 px-2 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Bobot</th>
                    <th className="py-2 px-2 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Status</th>
                    <th className="py-2 px-2 bg-amber-500/80 text-slate-900">Indeks</th>
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
                        <td className="py-2 px-2 border-r border-slate-100 text-slate-400">{row.prev.beras.toLocaleString('id-ID')}</td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">{row.cur.beras.toLocaleString('id-ID')}</td>
                        {/* Minyak prices */}
                        <td className="py-2 px-2 border-r border-slate-100 text-slate-400">{row.prev.minyak.toLocaleString('id-ID')}</td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">{row.cur.minyak.toLocaleString('id-ID')}</td>
                        {/* Telur prices */}
                        <td className="py-2 px-2 border-r border-slate-100 text-slate-400">{row.prev.telur.toLocaleString('id-ID')}</td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">{row.cur.telur.toLocaleString('id-ID')}</td>
                        {/* Beras values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.rBeras > 5 ? 'text-amber-600' : 'text-slate-600'}`}>{row.rBeras}%</td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotBeras}</td>
                        {/* Minyak values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.rMinyak > 15 ? 'text-rose-600' : row.rMinyak > 5 ? 'text-amber-600' : 'text-slate-600'}`}>{row.rMinyak}%</td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotMinyak}</td>
                        {/* Telur values */}
                        <td className={`py-2 px-1 border-r border-slate-100 font-extrabold ${row.rTelur > 15 ? 'text-rose-600' : row.rTelur > 5 ? 'text-amber-600' : 'text-slate-600'}`}>{row.rTelur}%</td>
                        <td className="py-2 px-1 border-r border-slate-100 font-black">{row.bobotTelur}</td>
                        {/* Keterjangkauan index */}
                        <td className="py-2 px-2 border-r border-slate-100 font-black text-slate-900 bg-amber-50/30">{row.totalBobot}</td>
                        <td className="py-2 px-2 border-r border-slate-100 font-black bg-amber-50/30">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                            row.status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                            row.status === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className={`py-2 px-2 font-black bg-amber-50/30 ${
                          row.index === 3 ? 'text-emerald-600' :
                          row.index === 2 ? 'text-amber-500' :
                          'text-rose-600'
                        }`}>{row.index}</td>
                      </tr>
                    );
                  })}
                  {/* Kota Cilegon Average */}
                  <tr className="bg-slate-50/90 text-center font-black border-t-2 border-slate-200">
                    <td className="py-3 px-3 border-r border-slate-100" colSpan={2}>KOTA CILEGON</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-400">{kotaCilegon.beras.prev.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">{kotaCilegon.beras.cur.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-400">{kotaCilegon.minyak.prev.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">{kotaCilegon.minyak.cur.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-400">{kotaCilegon.telur.prev.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-800">{kotaCilegon.telur.cur.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-1 border-r border-slate-100 text-amber-600">{kotaCilegon.beras.r}%</td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.beras.bobot}</td>
                    <td className="py-3 px-1 border-r border-slate-100 text-rose-600">{kotaCilegon.minyak.r}%</td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.minyak.bobot}</td>
                    <td className="py-3 px-1 border-r border-slate-100 text-slate-600">{kotaCilegon.telur.r}%</td>
                    <td className="py-3 px-1 border-r border-slate-100">{kotaCilegon.telur.bobot}</td>
                    <td className="py-3 px-2 border-r border-slate-100 text-slate-900 bg-amber-100/40">{kotaCilegon.totalBobotAkses}</td>
                    <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                        kotaCilegon.statusAkses === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                        kotaCilegon.statusAkses === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {kotaCilegon.statusAkses}
                      </span>
                    </td>
                    <td className={`py-3 px-2 bg-amber-100/40 ${
                      kotaCilegon.indexAkses === 3 ? 'text-emerald-600' :
                      kotaCilegon.indexAkses === 2 ? 'text-amber-500' :
                      'text-rose-600'
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

              {/* 4. Composite Matrix Map & Policies */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Table 3: Combined Composite Matrix Map (Span 7) */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="dashboard-card flex-1">
                    <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <Package className="w-4.5 h-4.5 text-[#10B981]" />
                      III. Indeks Komposit Ketahanan Pangan Bulanan
                    </h3>

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

                            const combinedScore = akses.index + nutr.bobot; // IA + IP
                            const status = combinedScore === 6 ? 'AMAN' : combinedScore >= 4 ? 'WASPADA' : 'RENTAN';
                            const finalIndex = combinedScore === 6 ? 3 : combinedScore >= 4 ? 2 : 1;

                            return (
                              <tr key={kec} className="hover:bg-slate-50/80 transition-all">
                                <td className="py-2.5 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kec}</td>
                                <td className={`py-2.5 px-2 border-r border-slate-100 font-bold bg-emerald-50/20 ${
                                  akses.index === 3 ? 'text-emerald-600' : akses.index === 2 ? 'text-amber-500' : 'text-rose-600'
                                }`}>{akses.index}</td>
                                <td className={`py-2.5 px-2 border-r border-slate-100 font-bold bg-blue-50/20 ${
                                  nutr.bobot === 3 ? 'text-emerald-600' : nutr.bobot === 2 ? 'text-amber-500' : 'text-rose-600'
                                }`}>{nutr.bobot}</td>
                                
                                <td className="py-2.5 px-2 border-r border-slate-100 font-black text-slate-800 bg-amber-50/30">{combinedScore}</td>
                                <td className="py-2.5 px-2 border-r border-slate-100 font-black bg-amber-50/30">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                    status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                                    status === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                                    'bg-rose-100 text-rose-800 animate-pulse'
                                  }`}>
                                    {status}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-2 font-black bg-amber-50/30 ${
                                  finalIndex === 3 ? 'text-emerald-600' :
                                  finalIndex === 2 ? 'text-amber-500' :
                                  'text-rose-600'
                                }`}>{finalIndex}</td>
                              </tr>
                            );
                          })}
                          {/* Kota Cilegon Average */}
                          <tr className="bg-slate-50/90 text-center font-black border-t-2 border-slate-200">
                            <td className="py-3 px-3 border-r border-slate-100 text-left">KOTA CILEGON</td>
                            <td className={`py-3 px-2 border-r border-slate-100 ${
                              kotaCilegon.indexAkses === 3 ? 'text-emerald-600' : kotaCilegon.indexAkses === 2 ? 'text-amber-500' : 'text-rose-600'
                            }`}>{kotaCilegon.indexAkses}</td>
                            <td className={`py-3 px-2 border-r border-slate-100 ${
                              kotaCilegon.nutrition.bobot === 3 ? 'text-emerald-600' : kotaCilegon.nutrition.bobot === 2 ? 'text-amber-500' : 'text-rose-600'
                            }`}>{kotaCilegon.nutrition.bobot}</td>
                            
                            <td className="py-3 px-2 border-r border-slate-100 text-slate-800 bg-amber-100/40">
                              {kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot}
                            </td>
                            <td className="py-3 px-2 border-r border-slate-100 bg-amber-100/40">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {(kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'AMAN' : 'WASPADA'}
                              </span>
                            </td>
                            <td className={`py-3 px-2 bg-amber-100/40 font-black ${
                              (kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 'text-emerald-600' : 'text-amber-500'
                            }`}>
                              {(kotaCilegon.indexAkses + kotaCilegon.nutrition.bobot) === 6 ? 3 : 2}
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
                Aspek Akses Pangan (Harga Komoditas) untuk bulan <span className="text-emerald-600 font-black">{MONTH_NAMES_INDO[selectedMonth]} {selectedYear}</span> selalu terupdate secara real-time dari SAGON. Namun, analisis komposit SKPG memerlukan data status gizi balita yang harus diunggah secara manual oleh Admin Kota.
              </p>
              
              <div className="w-full border-t border-slate-200/60 pt-6 mt-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                  Pilihan Data Analisis SKPG yang Tersedia Yaitu:
                </h4>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {availablePeriods.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedMonth(p.bulan);
                        setSelectedYear(p.tahun);
                      }}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition-all border border-emerald-200/50 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 hover:scale-105"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {MONTH_NAMES_INDO[p.bulan]} {p.tahun}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
