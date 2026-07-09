/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, Calendar, TrendingUp, AlertTriangle, ShieldAlert, Loader2, Utensils
} from 'lucide-react';

const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'] as const;

const KELURAHANS = [
  // Cibeber
  { nama: 'Cibeber', kecamatan: 'Cibeber' },
  { nama: 'Kedaleman', kecamatan: 'Cibeber' },
  { nama: 'Bulakan', kecamatan: 'Cibeber' },
  { nama: 'Cikerai', kecamatan: 'Cibeber' },
  { nama: 'Karang Asem', kecamatan: 'Cibeber' },
  { nama: 'Kalitimbang', kecamatan: 'Cibeber' },
  // Cilegon
  { nama: 'Bagendung', kecamatan: 'Cilegon' },
  { nama: 'Ciwedus', kecamatan: 'Cilegon' },
  { nama: 'Bendungan', kecamatan: 'Cilegon' },
  { nama: 'Ketileng', kecamatan: 'Cilegon' },
  { nama: 'Ciwaduk', kecamatan: 'Cilegon' },
  // Pulomerak
  { nama: 'Tamansari', kecamatan: 'Pulomerak' },
  { nama: 'Lebakgede', kecamatan: 'Pulomerak' },
  { nama: 'Mekarsari', kecamatan: 'Pulomerak' },
  { nama: 'Suralaya', kecamatan: 'Pulomerak' },
  // Ciwandan
  { nama: 'Banjar Negara', kecamatan: 'Ciwandan' },
  { nama: 'Tegal Ratu', kecamatan: 'Ciwandan' },
  { nama: 'Kubangsari', kecamatan: 'Ciwandan' },
  { nama: 'Gunung Sugih', kecamatan: 'Ciwandan' },
  { nama: 'Kepuh', kecamatan: 'Ciwandan' },
  { nama: 'Randakari', kecamatan: 'Ciwandan' },
  // Jombang
  { nama: 'Sukmajaya', kecamatan: 'Jombang' },
  { nama: 'Jombang Wetan', kecamatan: 'Jombang' },
  { nama: 'Masigit', kecamatan: 'Jombang' },
  { nama: 'Panggung Rawi', kecamatan: 'Jombang' },
  { nama: 'Gedong Dalem', kecamatan: 'Jombang' },
  // Gerogol
  { nama: 'Kotasari', kecamatan: 'Gerogol' },
  { nama: 'Gerogol', kecamatan: 'Gerogol' },
  { nama: 'Rawa Arum', kecamatan: 'Gerogol' },
  { nama: 'Gerem', kecamatan: 'Gerogol' },
  // Purwakarta
  { nama: 'Ramanuju', kecamatan: 'Purwakarta' },
  { nama: 'Kotabumi', kecamatan: 'Purwakarta' },
  { nama: 'Kebon Dalem', kecamatan: 'Purwakarta' },
  { nama: 'Purwakarta', kecamatan: 'Purwakarta' },
  { nama: 'Tegal Bunder', kecamatan: 'Purwakarta' },
  { nama: 'Pabean', kecamatan: 'Purwakarta' },
  // Citangkil
  { nama: 'Warnasari', kecamatan: 'Citangkil' },
  { nama: 'Deringo', kecamatan: 'Citangkil' },
  { nama: 'Kebonsari', kecamatan: 'Citangkil' },
  { nama: 'Taman Baru', kecamatan: 'Citangkil' },
  { nama: 'Lebak Denok', kecamatan: 'Citangkil' },
  { nama: 'Samangraya', kecamatan: 'Citangkil' },
  { nama: 'Citangkil', kecamatan: 'Citangkil' }
];

const BASELINE_PRICES_2026: Record<string, { beras: number; minyak: number; telur: number }> = {
  Cibeber:    { beras: 13500, minyak: 22000, telur: 30033 },
  Cilegon:    { beras: 13500, minyak: 22000, telur: 30033 },
  Pulomerak:  { beras: 14000, minyak: 21032, telur: 31967 },
  Gerogol:    { beras: 14000, minyak: 21032, telur: 31967 },
  Ciwandan:   { beras: 14000, minyak: 21032, telur: 31967 },
  Jombang:    { beras: 14000, minyak: 21032, telur: 31967 },
  Purwakarta: { beras: 14000, minyak: 21032, telur: 31967 },
  Citangkil:  { beras: 13833, minyak: 21355, telur: 31322 }
};

const BASELINE_PRICES_2025 = { beras: 13200, minyak: 18000, telur: 29500 };

const BASELINE_NUTRITION: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {};
KELURAHANS.forEach(kel => {
  BASELINE_NUTRITION[kel.nama] = { sangatKurang: 5, kurang: 15, normal: 350, lebih: 10, total: 380 };
});

const MONTH_NAMES_INDO = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface AnalisisSKPGKelurahanProps {
  onSwitchView?: (view: string) => void;
}

export default function AnalisisSKPGKelurahan({ onSwitchView = () => {} }: AnalisisSKPGKelurahanProps) {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [loading, setLoading] = useState(false);

  const [pricesCur, setPricesCur] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(BASELINE_PRICES_2026);
  const [pricesPrev, setPricesPrev] = useState<Record<string, { beras: number; minyak: number; telur: number }>>(
    Object.keys(BASELINE_PRICES_2026).reduce((acc, k) => ({ ...acc, [k]: BASELINE_PRICES_2025 }), {})
  );
  
  const [nutrition, setNutrition] = useState<Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }>>(BASELINE_NUTRITION);
  const [availablePeriods, setAvailablePeriods] = useState<{ tahun: number; bulan: number }[]>([]);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data: skpgData } = await supabase
          .from('gizi_balita_skpg_kelurahan')
          .select('tahun, bulan')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false });

        const uniquePeriods: { tahun: number; bulan: number }[] = [];
        
        // Always include January 2026
        uniquePeriods.push({ tahun: 2026, bulan: 1 });

        const addPeriod = (item: { tahun: number; bulan: number }) => {
          if (!uniquePeriods.some(p => p.tahun === item.tahun && p.bulan === item.bulan)) {
            uniquePeriods.push({ tahun: item.tahun, bulan: item.bulan });
          }
        };

        if (skpgData) skpgData.forEach(addPeriod);
        uniquePeriods.sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
        setAvailablePeriods(uniquePeriods);
      } catch (err) {
        console.error('Error fetching Kelurahan stunting periods:', err);
        setAvailablePeriods([{ tahun: 2025, bulan: 1 }]);
      }
    };
    fetchPeriods();
  }, []);

  const isPeriodAvailable = availablePeriods.some(p => p.tahun === selectedYear && p.bulan === selectedMonth);

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;
    const isCurFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    if (isCurFuture) {
      const emptyPrices: Record<string, { beras: number; minyak: number; telur: number }> = {};
      KECAMATANS.forEach(k => { emptyPrices[k] = { beras: 0, minyak: 0, telur: 0 }; });
      setPricesCur(emptyPrices);
      setPricesPrev(emptyPrices);
      setNutrition(BASELINE_NUTRITION);
      return;
    }

    const fetchDynamicData = async () => {
      setLoading(true);
      let fetchMonth = selectedMonth;
      let fetchYear = selectedYear;

      if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
        fetchMonth = selectedMonth - 1;
        if (fetchMonth === 0) {
          fetchMonth = 12;
          fetchYear = selectedYear - 1;
        }
      }

      try {
        // 1. Fetch live monthly market prices from SAGON API (Kecamatan-level)
        const sagonRes = await fetch(`/api/sagon-bulanan?month=${fetchMonth}&year=${fetchYear}`);
        const sagonJson = await sagonRes.json();

        if (sagonJson && sagonJson.success) {
          setPricesCur(sagonJson.pricesCur);
          setPricesPrev(sagonJson.pricesPrev);
        }

        // 2. Fetch stunting from gizi_balita_skpg_kelurahan
        const { data: giziRows } = await supabase
          .from('gizi_balita_skpg_kelurahan')
          .select('kelurahan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_balita')
          .eq('tahun', fetchYear)
          .eq('bulan', fetchMonth);

        if (giziRows && giziRows.length > 0) {
          const kelNutr: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {};
          KELURAHANS.forEach(kel => {
            kelNutr[kel.nama] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };
          });

          giziRows.forEach(r => {
            if (kelNutr[r.kelurahan] !== undefined) {
              kelNutr[r.kelurahan] = {
                sangatKurang: r.bb_sangat_kurang || 0,
                kurang:       r.bb_kurang || 0,
                normal:       r.bb_normal || 0,
                lebih:        r.bb_lebih || 0,
                total:        r.total_balita || 0
              };
            }
          });
          setNutrition(kelNutr);
        } else {
          // If no data, render zeros
          const emptyNutr: Record<string, { sangatKurang: number; kurang: number; normal: number; lebih: number; total: number }> = {};
          KELURAHANS.forEach(kel => {
            emptyNutr[kel.nama] = { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };
          });
          setNutrition(emptyNutr);
        }
      } catch (err) {
        console.error('Error fetching Kelurahan SKPG data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDynamicData();
  }, [selectedMonth, selectedYear]);

  // Compute individual sub-district rows (Keterjangkauan)
  const getKeterjangkauanRow = (kelNama: string, kecInduk: string) => {
    // Price data mapped to its parent kecamatan
    const cur = pricesCur[kecInduk] || { beras: 0, minyak: 0, telur: 0 };
    const prev = pricesPrev[kecInduk] || { beras: 0, minyak: 0, telur: 0 };

    const available = cur.beras > 0 && cur.minyak > 0 && cur.telur > 0 &&
                      prev.beras > 0 && prev.minyak > 0 && prev.telur > 0;

    const rBeras = available ? parseFloat(((cur.beras - prev.beras) / prev.beras * 100).toFixed(1)) : 0;
    const rMinyak = available ? parseFloat(((cur.minyak - prev.minyak) / prev.minyak * 100).toFixed(1)) : 0;
    const rTelur = available ? parseFloat(((cur.telur - prev.telur) / prev.telur * 100).toFixed(1)) : 0;

    const bobotBeras = rBeras > 10 ? 1 : rBeras >= 5 ? 2 : 3;
    const bobotMinyak = rMinyak > 15 ? 1 : rMinyak >= 5 ? 2 : 3;
    const bobotTelur = rTelur > 15 ? 1 : rTelur >= 5 ? 2 : 3;

    const totalBobot = bobotBeras + bobotMinyak + bobotTelur;
    const index = totalBobot >= 8 ? 3 : totalBobot >= 6 ? 2 : 1;
    const status = index === 3 ? 'AMAN' : index === 2 ? 'WASPADA' : 'RENTAN';

    return {
      cur, prev, rBeras, rMinyak, rTelur, bobotBeras, bobotMinyak, bobotTelur, totalBobot, index, status, available
    };
  };

  // Compute individual sub-district rows (Pemanfaatan)
  const getPemanfaatanRow = (kelNama: string) => {
    const nutr = nutrition[kelNama] || { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };
    const underweightTotal = nutr.sangatKurang + nutr.kurang;
    const value = nutr.total > 0 ? parseFloat((underweightTotal / nutr.total * 100).toFixed(1)) : 0;

    const bobot = value > 15 ? 1 : value >= 10 ? 2 : 3;
    const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

    return { nutr, underweightTotal, value, bobot, status };
  };

  // Total averages for Kota Cilegon
  const getKotaCilegonTotals = () => {
    let sumCurBeras = 0, sumPrevBeras = 0;
    let sumCurMinyak = 0, sumPrevMinyak = 0;
    let sumCurTelur = 0, sumPrevTelur = 0;

    let totalSangatKurang = 0, totalKurang = 0, totalNormal = 0, totalLebih = 0, totalBalita = 0;

    KELURAHANS.forEach(kel => {
      const cur = pricesCur[kel.kecamatan] || { beras: 0, minyak: 0, telur: 0 };
      const prev = pricesPrev[kel.kecamatan] || { beras: 0, minyak: 0, telur: 0 };
      const nutr = nutrition[kel.nama] || { sangatKurang: 0, kurang: 0, normal: 0, lebih: 0, total: 0 };

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

    const num = KELURAHANS.length;
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
      availableAkses: pricesAvailable,
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

  const kotaCilegon = getKotaCilegonTotals();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const isBeforeLastDay = currentDate < lastDayOfCurrentMonth;

  let displayMonth = selectedMonth;
  let displayYear = selectedYear;

  if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
    displayMonth = selectedMonth - 1;
    if (displayMonth === 0) {
      displayMonth = 12;
      displayYear = selectedYear - 1;
    }
  }

  const labelCur = `${MONTH_NAMES_INDO[displayMonth]?.toUpperCase()} ${displayYear}`;
  const labelPrev = `${MONTH_NAMES_INDO[displayMonth]?.toUpperCase()} ${displayYear - 1}`;

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
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-350 text-left transition-all shadow-sm flex items-center justify-between group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider group-hover:text-emerald-700">SKPG Tingkat Kecamatan</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Menampilkan analisis ketahanan pangan bulanan agregasi 8 Kecamatan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">Kec</div>
        </button>

        <button
          onClick={() => onSwitchView('analisis_skpg_kelurahan')}
          className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 text-left transition-all shadow-sm flex items-center justify-between group cursor-pointer"
        >
          <div>
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">SKPG Tingkat Kelurahan</h3>
            <p className="text-xs text-emerald-700/80 font-bold mt-1">Menampilkan analisis ketahanan pangan bulanan agregasi 43 Kelurahan</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">Kel</div>
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
              I. Aspek Akses Pangan (Keterjangkauan) - Tingkat Kelurahan
            </h3>
            
            <div className="overflow-x-auto select-none max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-emerald-800 text-white text-[8px] md:text-[8.5px] font-black uppercase tracking-wider text-center border-b border-emerald-900">
                    <th className="py-2.5 px-1 text-left border-r border-emerald-900 rounded-tl-lg w-[3%]" rowSpan={2}>No</th>
                    <th className="py-2.5 px-2 text-left border-r border-emerald-900 w-[12%]" rowSpan={2}>Kelurahan</th>
                    <th className="py-2.5 px-2 text-left border-r border-emerald-900 w-[10%]" rowSpan={2}>Kecamatan</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 w-[13%]" colSpan={2}>Beras Medium (Rp/kg)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-orange-850 w-[13%]" colSpan={2}>Minyak Kemasan (Rp/Lt)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-blue-850 w-[13%]" colSpan={2}>Telur Ayam Ras (Rp/kg)</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[8%]" colSpan={2}>Beras</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[8%]" colSpan={2}>Minyak Goreng</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-yellow-600 w-[8%]" colSpan={2}>Telur Ayam</th>
                    <th className="py-1.5 px-2 bg-amber-600 rounded-tr-lg w-[12%]" colSpan={3}>Akses Pangan</th>
                  </tr>
                  <tr className="bg-emerald-700/80 text-white text-[7px] md:text-[7.5px] font-black uppercase text-center border-b border-emerald-900">
                    {/* Beras */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 text-orange-300 font-black">{labelPrev}</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Minyak */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 text-orange-300 font-black">{labelPrev}</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 font-black">{labelCur}</th>
                    {/* Telur */}
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
                    {/* Combined */}
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-50/80 text-slate-950">Bobot</th>
                    <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-50/80 text-slate-950">Status</th>
                    <th className="py-1.5 px-1 bg-amber-50/80 text-slate-950">Indeks</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-semibold text-slate-700 divide-y divide-slate-100">
                  {KELURAHANS.map((kel, i) => {
                    const row = getKeterjangkauanRow(kel.nama, kel.kecamatan);
                    return (
                      <tr key={kel.nama} className="hover:bg-slate-50/80 transition-all text-center">
                        <td className="py-2 px-2 border-r border-slate-100 text-left font-black text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kel.nama}</td>
                        <td className="py-2 px-3 border-r border-slate-100 text-left text-slate-500">{kel.kecamatan}</td>
                        {/* Beras */}
                        <td className="py-2 px-2 border-r border-slate-100 text-orange-500 font-bold">
                          {row.prev.beras > 0 ? row.prev.beras.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">
                          {row.cur.beras > 0 ? row.cur.beras.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        {/* Minyak */}
                        <td className="py-2 px-2 border-r border-slate-100 text-orange-500 font-bold">
                          {row.prev.minyak > 0 ? row.prev.minyak.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 font-bold text-slate-800">
                          {row.cur.minyak > 0 ? row.cur.minyak.toLocaleString('id-ID') : 'N/A'}
                        </td>
                        {/* Telur */}
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
                        {/* Combined Index */}
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
                          row.index === 1 ? 'text-rose-600' : 'text-slate-400'
                        }`}>{row.index}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Aspek Pemanfaatan Pangan (Gizi) */}
          {isPeriodAvailable ? (
            <>
              <div className="dashboard-card overflow-hidden">
                <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Utensils className="w-4.5 h-4.5 text-emerald-600" />
                  II. Aspek Pemanfaatan Pangan (Nutrition/Gizi Balita) - Tingkat Kelurahan
                </h3>
                
                <div className="overflow-x-auto select-none max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-emerald-800 text-white text-[8px] md:text-[8.5px] font-black uppercase tracking-wider text-center border-b border-emerald-900">
                        <th className="py-2.5 px-1 text-left border-r border-emerald-900 rounded-tl-lg w-[3%]" rowSpan={2}>No</th>
                        <th className="py-2.5 px-2 text-left border-r border-emerald-900 w-[12%]" rowSpan={2}>Kelurahan</th>
                        <th className="py-2.5 px-2 text-left border-r border-emerald-900 w-[10%]" rowSpan={2}>Kecamatan</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 w-[35%]" colSpan={4}>Status Gizi Balita (BB/U)</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 w-[10%]" rowSpan={2}>BB Sangat Kurang + BB Kurang</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 w-[10%]" rowSpan={2}>Total Balita (BB/U)</th>
                        <th className="py-1.5 px-2 bg-amber-600 rounded-tr-lg w-[20%]" colSpan={3}>Pemanfaatan Pangan (Hasil SKPG)</th>
                      </tr>
                      <tr className="bg-emerald-700/80 text-white text-[7px] md:text-[7.5px] font-black uppercase text-center border-b border-emerald-900">
                        <th className="py-1.5 px-1 border-r border-emerald-900 font-black">Sangat Kurang</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 font-black">Kurang</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 font-black">Normal</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 font-black">BB Lebih</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Value (%)</th>
                        <th className="py-1.5 px-1 border-r border-emerald-900 bg-amber-500/80 text-slate-900">Bobot</th>
                        <th className="py-1.5 px-1 bg-amber-500/80 text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-semibold text-slate-700 divide-y divide-slate-100">
                      {KELURAHANS.map((kel, i) => {
                        const row = getPemanfaatanRow(kel.nama);
                        return (
                          <tr key={kel.nama} className="hover:bg-slate-50/80 transition-all text-center">
                            <td className="py-2 px-2 border-r border-slate-100 text-left font-black text-slate-400">{i + 1}</td>
                            <td className="py-2 px-3 border-r border-slate-100 text-left font-black text-[#0B1E41]">{kel.nama}</td>
                            <td className="py-2 px-3 border-r border-slate-100 text-left text-slate-500">{kel.kecamatan}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-rose-600 font-bold">{row.nutr.sangatKurang}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-amber-500 font-bold">{row.nutr.kurang}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-slate-600">{row.nutr.normal}</td>
                            <td className="py-2 px-2 border-r border-slate-100 text-slate-400">{row.nutr.lebih}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-black text-slate-900 bg-slate-50/50">{row.underweightTotal}</td>
                            <td className="py-2 px-2 border-r border-slate-100 font-black text-slate-500 bg-slate-50/50">{row.nutr.total}</td>
                            <td className="py-2 px-2 border-r border-slate-100 bg-amber-50/30 font-black text-slate-900">{row.value}%</td>
                            <td className="py-2 px-2 border-r border-slate-100 bg-amber-50/30 font-black text-emerald-600">{row.bobot}</td>
                            <td className="py-2 px-2 bg-amber-50/30">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black inline-block tracking-wider ${
                                row.status === 'AMAN' ? 'bg-emerald-100 text-emerald-800' :
                                row.status === 'WASPADA' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Peta / Hasil Ringkasan Komposit Kelurahan */}
              <div className="dashboard-card p-6 bg-white shadow-sm border border-slate-200">
                <h3 className="font-extrabold text-[#0B1E41] text-xs leading-none uppercase tracking-widest mb-5 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <ShieldAlert className="w-4.5 h-4.5 text-emerald-600" />
                  III. Ringkasan Evaluasi Komposit SKPG - Kota Cilegon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bobot Score Board */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Total Balita Kota Cilegon</h4>
                      <p className="text-2xl font-black text-[#0B1E41]">{kotaCilegon.nutrition.totalBalita.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Rata-rata Prevalensi Gizi Kurang</h4>
                      <p className="text-2xl font-black text-emerald-600">{kotaCilegon.nutrition.value}%</p>
                    </div>
                  </div>

                  {/* Recommendation Alerts */}
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-xl">
                      <h4 className="font-black text-emerald-800 uppercase tracking-wider mb-2">Aspek Pemanfaatan (Gizi): AMAN</h4>
                      <p className="text-slate-700 text-xs">Seluruh 43 kelurahan di Kota Cilegon mencatatkan prevalensi balita underweight rata-rata **{kotaCilegon.nutrition.value}%**.</p>
                    </div>
                    <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-xl">
                      <h4 className="font-black text-amber-800 uppercase tracking-wider mb-2">Aspek Akses (Harga): WASPADA</h4>
                      <p className="text-slate-700 text-xs">Didorong oleh kenaikan harga minyak goreng yang signifikan dibanding tahun sebelumnya.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-slate-150 shadow-sm flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-6">
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 mb-4 animate-bounce">
                <ShieldAlert className="w-8 h-8 shrink-0" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Data Balita BB/U (Status Gizi) Belum Tersedia</h3>
              <p className="text-xs text-slate-500 font-bold max-w-lg mb-4">
                Analisis komposit SKPG memerlukan data status gizi balita tingkat kelurahan untuk bulan <span className="text-emerald-600 font-black">{MONTH_NAMES_INDO[displayMonth]} {displayYear}</span>. Silakan pilih periode yang tersedia di bawah ini.
              </p>
              
              <div className="w-full border-t border-slate-200/60 pt-6 mt-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 text-center">Pilihan Data Analisis SKPG Kelurahan Yang Tersedia:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-xl mx-auto text-left">
                  <div className="flex flex-col gap-2">
                    {availablePeriods.slice(0, Math.ceil(availablePeriods.length / 2)).map((p, idx) => (
                      <button
                        key={`col1-${idx}`}
                        onClick={() => { setSelectedMonth(p.bulan); setSelectedYear(p.tahun); }}
                        className="w-full px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition-all border border-emerald-200/50 shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{MONTH_NAMES_INDO[p.bulan]} {p.tahun}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {availablePeriods.slice(Math.ceil(availablePeriods.length / 2)).map((p, idx) => (
                      <button
                        key={`col2-${idx}`}
                        onClick={() => { setSelectedMonth(p.bulan); setSelectedYear(p.tahun); }}
                        className="w-full px-4 py-2.5 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800/90 font-extrabold text-xs rounded-xl transition-all border border-emerald-200/30 shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-600/80" />
                        <span>{MONTH_NAMES_INDO[p.bulan]} {p.tahun}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
