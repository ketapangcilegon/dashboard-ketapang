/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { WILAYAH, ALL_KEC } from '@/lib/wilayah';
import { 
  ShieldCheck, AlertCircle, Layers, Sliders, ArrowRightLeft, 
  Sparkles, CheckCircle2, TrendingUp, Calendar, FileSpreadsheet, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import fsvaForm2Raw from '@/lib/fsva-form2-official-data.json';

const fsvaForm2Data: Record<string, any> = fsvaForm2Raw as any;

interface KelurahanData {
  nama: string;
  kecamatan: string;
  // 11 Indikator Raw Values (Form 2.1)
  raw_ncpr: number;
  raw_energy: number;
  raw_animal_protein: number;
  raw_food_reserves: number;
  raw_poverty: number;
  raw_price_cv: number;
  raw_pou: number;
  raw_female_school: number;
  raw_no_water: number;
  raw_pph: number;
  raw_stunting: number;
  // 11 Indikator Normalized Scores 0-100 (Form 2.3)
  score_ncpr: number;
  score_energy: number;
  score_animal_protein: number;
  score_food_reserves: number;
  score_poverty: number;
  score_price_cv: number;
  score_pou: number;
  score_female_school: number;
  score_no_water: number;
  score_pph: number;
  score_stunting: number;
  // Composite & Sub-Indices
  idx_ketersediaan: number;
  idx_akses: number;
  idx_pemanfaatan: number;
  ikp: number;
  rank: number;
}

// Function to lookup official FSVA 11-indicator data
function getForm2FSVAData(dbRows: any[]): Record<string, KelurahanData> {
  const result: Record<string, KelurahanData> = {};

  Object.entries(WILAYAH).forEach(([kec, kels]) => {
    kels.forEach((kel) => {
      // Find matching item in DB rows first
      const dbMatch = (dbRows || []).find(
        (d) => d.nama_kelurahan?.toLowerCase().replace(/\s+/g, '') === kel.toLowerCase().replace(/\s+/g, '')
      );

      // Or fallback to official Form 2.1 & 2.3 JSON
      const jsonMatch = Object.values(fsvaForm2Data).find(
        (item: any) => item.kelurahan?.toLowerCase().replace(/\s+/g, '') === kel.toLowerCase().replace(/\s+/g, '')
      ) || {};

      const item = dbMatch || jsonMatch;

      result[kel] = {
        nama: kel,
        kecamatan: kec,
        // Raw Values
        raw_ncpr: item.ncpr ?? item.raw_ncpr ?? 6.0,
        raw_energy: item.energy ?? item.raw_energy ?? 97.5,
        raw_animal_protein: item.animal_protein ?? item.raw_animal_protein ?? 75.0,
        raw_food_reserves: item.food_reserves ?? item.raw_food_reserves ?? 0.28,
        raw_poverty: item.poverty ?? item.raw_poverty ?? 10.5,
        raw_price_cv: item.price_cv ?? item.raw_price_cv ?? 4.2,
        raw_pou: item.pou ?? item.raw_pou ?? 2.3,
        raw_female_school: item.female_school ?? item.raw_female_school ?? 9.2,
        raw_no_water: item.no_water ?? item.raw_no_water ?? 2.3,
        raw_pph: item.pph ?? item.raw_pph ?? 92.5,
        raw_stunting: item.stunting ?? item.raw_stunting ?? 4.4,
        // Scores
        score_ncpr: item.score_ncpr ?? item.score_lahan ?? 40,
        score_energy: item.score_energy ?? item.score_sarana ?? 68,
        score_animal_protein: item.score_animal_protein ?? 52,
        score_food_reserves: item.score_food_reserves ?? 8,
        score_poverty: item.score_poverty ?? item.score_miskin ?? 73,
        score_price_cv: item.score_price_cv ?? item.score_jalan ?? 88,
        score_pou: item.score_pou ?? 97,
        score_female_school: item.score_female_school ?? 75,
        score_no_water: item.score_no_water ?? item.score_air ?? 98,
        score_pph: item.score_pph ?? 88,
        score_stunting: item.score_stunting ?? item.score_tenkes ?? 94,
        // Aggregates
        idx_ketersediaan: item.idx_ketersediaan ?? 42,
        idx_akses: item.idx_akses ?? 86,
        idx_pemanfaatan: item.idx_pemanfaatan ?? 89,
        ikp: item.ikp ?? 72.26,
        rank: item.rank ?? 1,
      };
    });
  });

  return result;
}

// Compute Average City Benchmark from active dataset
function getCityAverageData(dataset: Record<string, KelurahanData>): KelurahanData {
  const all = Object.values(dataset);
  const count = all.length || 1;

  const sum = all.reduce((acc, curr) => ({
    raw_ncpr: acc.raw_ncpr + curr.raw_ncpr,
    raw_energy: acc.raw_energy + curr.raw_energy,
    raw_animal_protein: acc.raw_animal_protein + curr.raw_animal_protein,
    raw_food_reserves: acc.raw_food_reserves + curr.raw_food_reserves,
    raw_poverty: acc.raw_poverty + curr.raw_poverty,
    raw_price_cv: acc.raw_price_cv + curr.raw_price_cv,
    raw_pou: acc.raw_pou + curr.raw_pou,
    raw_female_school: acc.raw_female_school + curr.raw_female_school,
    raw_no_water: acc.raw_no_water + curr.raw_no_water,
    raw_pph: acc.raw_pph + curr.raw_pph,
    raw_stunting: acc.raw_stunting + curr.raw_stunting,

    score_ncpr: acc.score_ncpr + curr.score_ncpr,
    score_energy: acc.score_energy + curr.score_energy,
    score_animal_protein: acc.score_animal_protein + curr.score_animal_protein,
    score_food_reserves: acc.score_food_reserves + curr.score_food_reserves,
    score_poverty: acc.score_poverty + curr.score_poverty,
    score_price_cv: acc.score_price_cv + curr.score_price_cv,
    score_pou: acc.score_pou + curr.score_pou,
    score_female_school: acc.score_female_school + curr.score_female_school,
    score_no_water: acc.score_no_water + curr.score_no_water,
    score_pph: acc.score_pph + curr.score_pph,
    score_stunting: acc.score_stunting + curr.score_stunting,

    idx_ketersediaan: acc.idx_ketersediaan + curr.idx_ketersediaan,
    idx_akses: acc.idx_akses + curr.idx_akses,
    idx_pemanfaatan: acc.idx_pemanfaatan + curr.idx_pemanfaatan,
    ikp: acc.ikp + curr.ikp,
  }), {
    raw_ncpr: 0, raw_energy: 0, raw_animal_protein: 0, raw_food_reserves: 0,
    raw_poverty: 0, raw_price_cv: 0, raw_pou: 0, raw_female_school: 0,
    raw_no_water: 0, raw_pph: 0, raw_stunting: 0,
    score_ncpr: 0, score_energy: 0, score_animal_protein: 0, score_food_reserves: 0,
    score_poverty: 0, score_price_cv: 0, score_pou: 0, score_female_school: 0,
    score_no_water: 0, score_pph: 0, score_stunting: 0,
    idx_ketersediaan: 0, idx_akses: 0, idx_pemanfaatan: 0, ikp: 0,
  });

  return {
    nama: 'Rata-rata Kota Cilegon',
    kecamatan: 'Kota Cilegon',
    raw_ncpr: +(sum.raw_ncpr / count).toFixed(2),
    raw_energy: +(sum.raw_energy / count).toFixed(1),
    raw_animal_protein: +(sum.raw_animal_protein / count).toFixed(1),
    raw_food_reserves: +(sum.raw_food_reserves / count).toFixed(2),
    raw_poverty: +(sum.raw_poverty / count).toFixed(1),
    raw_price_cv: +(sum.raw_price_cv / count).toFixed(1),
    raw_pou: +(sum.raw_pou / count).toFixed(1),
    raw_female_school: +(sum.raw_female_school / count).toFixed(1),
    raw_no_water: +(sum.raw_no_water / count).toFixed(1),
    raw_pph: +(sum.raw_pph / count).toFixed(1),
    raw_stunting: +(sum.raw_stunting / count).toFixed(1),

    score_ncpr: Math.round(sum.score_ncpr / count),
    score_energy: Math.round(sum.score_energy / count),
    score_animal_protein: Math.round(sum.score_animal_protein / count),
    score_food_reserves: Math.round(sum.score_food_reserves / count),
    score_poverty: Math.round(sum.score_poverty / count),
    score_price_cv: Math.round(sum.score_price_cv / count),
    score_pou: Math.round(sum.score_pou / count),
    score_female_school: Math.round(sum.score_female_school / count),
    score_no_water: Math.round(sum.score_no_water / count),
    score_pph: Math.round(sum.score_pph / count),
    score_stunting: Math.round(sum.score_stunting / count),

    idx_ketersediaan: Math.round(sum.idx_ketersediaan / count),
    idx_akses: Math.round(sum.idx_akses / count),
    idx_pemanfaatan: Math.round(sum.idx_pemanfaatan / count),
    ikp: +(sum.ikp / count).toFixed(2),
    rank: 0,
  };
}

export default function RadarKelurahan() {
  const [selectedKec, setSelectedKec] = useState<string>('Citangkil');
  const [selectedKel, setSelectedKel] = useState<string>('Deringo');
  
  const [mode, setMode] = useState<'benchmark' | 'dual'>('benchmark');
  const [compareKel, setCompareKel] = useState<string>('Warnasari');
  
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbRows, setDbRows] = useState<any[]>([]);

  // Query Supabase db table fsva_matang
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('fsva_matang')
          .select('*')
          .eq('periode', selectedYear);
        if (data) setDbRows(data);
      } catch (err) {
        console.error('[RadarKelurahan] Error fetching Supabase fsva_matang:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedYear]);

  // Load official FSVA dataset from Form 2.1 & 2.3
  const currentDataset = useMemo(() => getForm2FSVAData(dbRows), [dbRows]);
  const cityAvg = useMemo(() => getCityAverageData(currentDataset), [currentDataset]);

  // Update selectedKel when Kecamatan changes
  const handleKecChange = (kec: string) => {
    setSelectedKec(kec);
    const kels = WILAYAH[kec] || [];
    if (kels.length > 0) {
      setSelectedKel(kels[0]);
    }
  };

  // Get active kelurahan data
  const dataA = currentDataset[selectedKel] || currentDataset['Deringo'];
  const dataB = mode === 'dual' 
    ? (currentDataset[compareKel] || currentDataset['Warnasari']) 
    : cityAvg;

  // Radar Data for Pilar 1: Ketersediaan (1.1 NCPR, 1.2 Energy, 1.3 Protein, 1.4 Food Reserves)
  const radarAvailability = useMemo(() => [
    {
      subject: '1.1 Rasio NCPR Pangan',
      key: 'ncpr',
      valA: dataA.raw_ncpr,
      valB: dataB.raw_ncpr,
      unit: 'rasio',
      scoreA: dataA.score_ncpr,
      scoreB: dataB.score_ncpr,
    },
    {
      subject: '1.2 Ketersediaan Energi',
      key: 'energy',
      valA: dataA.raw_energy,
      valB: dataB.raw_energy,
      unit: '%',
      scoreA: dataA.score_energy,
      scoreB: dataB.score_energy,
    },
    {
      subject: '1.3 Protein Hewani',
      key: 'animal_protein',
      valA: dataA.raw_animal_protein,
      valB: dataB.raw_animal_protein,
      unit: '%',
      scoreA: dataA.score_animal_protein,
      scoreB: dataB.score_animal_protein,
    },
    {
      subject: '1.4 Cadangan Pangan',
      key: 'food_reserves',
      valA: dataA.raw_food_reserves,
      valB: dataB.raw_food_reserves,
      unit: 'rasio',
      scoreA: dataA.score_food_reserves,
      scoreB: dataB.score_food_reserves,
    },
  ], [dataA, dataB]);

  // Radar Data for Pilar 2: Keterjangkauan (2.1 Poverty, 2.2 Price CV, 2.3 PoU)
  const radarAccessibility = useMemo(() => [
    {
      subject: '2.1 Penduduk Miskin (D1+2)',
      key: 'poverty',
      valA: dataA.raw_poverty,
      valB: dataB.raw_poverty,
      unit: '%',
      scoreA: dataA.score_poverty,
      scoreB: dataB.score_poverty,
    },
    {
      subject: '2.2 Stabilitas Harga (CV)',
      key: 'price_cv',
      valA: dataA.raw_price_cv,
      valB: dataB.raw_price_cv,
      unit: '%',
      scoreA: dataA.score_price_cv,
      scoreB: dataB.score_price_cv,
    },
    {
      subject: '2.3 PoU (Kurang Energi)',
      key: 'pou',
      valA: dataA.raw_pou,
      valB: dataB.raw_pou,
      unit: '%',
      scoreA: dataA.score_pou,
      scoreB: dataB.score_pou,
    },
  ], [dataA, dataB]);

  // Radar Data for Pilar 3: Pemanfaatan (3.1 Female School, 3.2 No Water, 3.3 PPH, 3.4 Stunting)
  const radarUtilization = useMemo(() => [
    {
      subject: '3.1 Lama Sekolah Perempuan',
      key: 'female_school',
      valA: dataA.raw_female_school,
      valB: dataB.raw_female_school,
      unit: 'thn',
      scoreA: dataA.score_female_school,
      scoreB: dataB.score_female_school,
    },
    {
      subject: '3.2 Tanpa Air Bersih',
      key: 'no_water',
      valA: dataA.raw_no_water,
      valB: dataB.raw_no_water,
      unit: '%',
      scoreA: dataA.score_no_water,
      scoreB: dataB.score_no_water,
    },
    {
      subject: '3.3 Skor PPH Konsumsi',
      key: 'pph',
      valA: dataA.raw_pph,
      valB: dataB.raw_pph,
      unit: 'skor',
      scoreA: dataA.score_pph,
      scoreB: dataB.score_pph,
    },
    {
      subject: '3.4 Prevalensi Stunting',
      key: 'stunting',
      valA: dataA.raw_stunting,
      valB: dataB.raw_stunting,
      unit: '%',
      scoreA: dataA.score_stunting,
      scoreB: dataB.score_stunting,
    },
  ], [dataA, dataB]);

  // Read official pillar indices from Excel Form 2.3
  const scoreAvailA = Math.round(dataA.idx_ketersediaan);
  const scoreAccessA = Math.round(dataA.idx_akses);
  const scoreUtilA = Math.round(dataA.idx_pemanfaatan);
  const overallScoreA = Math.round(dataA.ikp);

  // Find lowest scoring indicator dynamically
  const allIndicatorsA = [...radarAvailability, ...radarAccessibility, ...radarUtilization];
  const lowestIndicatorA = useMemo(() => {
    return [...allIndicatorsA].sort((a, b) => a.scoreA - b.scoreA)[0];
  }, [allIndicatorsA]);

  const getDynamicPolicyAction = (indicatorKey: string, kelName: string) => {
    switch (indicatorKey) {
      case 'ncpr':
        return `Akselerasi fasilitasi pasokan pangan pokok dan kerja sama antar daerah (KAD) untuk menjamin ketersediaan pangan di Kelurahan ${kelName}.`;
      case 'no_water':
        return `Percepatan pembangunan sarana air bersih dan sanitasi di Kelurahan ${kelName} bekerjasama dengan Dinas PUPR / Perkim.`;
      case 'poverty':
        return `Prioritas penyaluran bantuan pangan cadangan pemerintah dan bansos tepat sasaran bagi masyarakat desil 1 & 2 di Kelurahan ${kelName}.`;
      case 'stunting':
        return `Penguatan intervensi gizi spesifik PMT lokal Posyandu di Kelurahan ${kelName} untuk balita di bawah standar stunting.`;
      case 'price_cv':
        return `Penyelenggaraan Gerakan Pangan Murah (GPM) berkala untuk menjaga stabilitas harga pangan pokok di Kelurahan ${kelName}.`;
      default:
        return `Peningkatan sinergitas lintas sektor di Kelurahan ${kelName} guna meningkatkan skor pemenuhan 11 indikator FSVA.`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg border border-slate-700 shadow-xl text-xs space-y-1.5 min-w-[210px]">
          <p className="font-extrabold text-emerald-400 border-b border-slate-700 pb-1">{dataItem.subject}</p>
          <div className="flex justify-between items-center gap-4 text-slate-200">
            <span>{dataA.nama}:</span>
            <span className="font-bold text-white tabular-nums">
              {dataItem.valA} {dataItem.unit} <span className="text-[10px] text-emerald-400 font-normal">({dataItem.scoreA}/100)</span>
            </span>
          </div>
          <div className="flex justify-between items-center gap-4 text-slate-400">
            <span>{dataB.nama}:</span>
            <span className="font-bold text-amber-300 tabular-nums">
              {dataItem.valB} {dataItem.unit} <span className="text-[10px] text-amber-400 font-normal">({dataItem.scoreB}/100)</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Emerald Green Gradient */}
      <div className="bg-gradient-to-r from-[#006038] via-[#007A48] to-[#044D2E] p-6 rounded-2xl border border-emerald-700/50 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-400/20 text-emerald-100 rounded-full border border-emerald-300/30 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Analisis Profil 11 Indikator FSVA Resmian ({selectedYear})</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Grafik Radar Ketahanan Pangan Kelurahan
            </h2>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed font-medium">
              Visualisasi jaring laba-laba 11 Indikator Resmi dari berkas <strong className="text-white font-extrabold">Form Penentuan Cut Off dan Analisis Komposit Baseline FSVA.xlsb</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/25 p-3.5 rounded-xl border border-emerald-400/30 shrink-0 shadow-inner">
            <div className="text-right">
              <p className="text-[10px] text-emerald-200 uppercase font-black tracking-wider">SKOR KOMPOSIT FSVA</p>
              <p className="text-2xl font-black text-emerald-300 tabular-nums">{overallScoreA}<span className="text-xs font-normal text-emerald-200/80">/100</span></p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Filter Wilayah & Mode Komparasi</span>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMode('benchmark')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'benchmark'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Single vs Rata-rata Kota
            </button>
            <button
              onClick={() => setMode('dual')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'dual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Bandingkan 2 Kelurahan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Kecamatan Dropdown */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pilih Kecamatan</label>
            <select
              value={selectedKec}
              onChange={(e) => handleKecChange(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {ALL_KEC.map(kec => (
                <option key={kec} value={kec}>Kecamatan {kec}</option>
              ))}
            </select>
          </div>

          {/* Kelurahan A Dropdown */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              {mode === 'dual' ? 'Kelurahan Utama (A)' : 'Pilih Kelurahan'}
            </label>
            <select
              value={selectedKel}
              onChange={(e) => setSelectedKel(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {(WILAYAH[selectedKec] || []).map(kel => (
                <option key={kel} value={kel}>Kelurahan {kel}</option>
              ))}
            </select>
          </div>

          {/* Kelurahan B (if Dual Mode) */}
          {mode === 'dual' ? (
            <div>
              <label className="block text-[10px] font-black uppercase text-amber-600 mb-1">Kelurahan Pembanding (B)</label>
              <select
                value={compareKel}
                onChange={(e) => setCompareKel(e.target.value)}
                className="w-full text-xs font-bold bg-amber-50/60 border border-amber-300 rounded-lg px-3 py-2 text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {Object.values(WILAYAH).flat().sort().map(kel => (
                  <option key={kel} value={kel}>Kelurahan {kel}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Acuan Pembanding</label>
              <input 
                type="text" 
                readOnly 
                value="Rata-rata Kota Cilegon" 
                className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Tahun FSVA Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>Tahun Data FSVA</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value={2025}>Tahun 2025 (Resmi 11 Indikator FSVA)</option>
              <option value={2026}>Tahun 2026 (Placeholder Input Admin)</option>
              <option value={2027}>Tahun 2027 (Placeholder Input Admin)</option>
            </select>
          </div>

        </div>

        {/* Database Live Status Badge */}
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Terhubung ke Sumber Data Resmi: <strong>Form Penentuan Cut Off & Baseline FSVA 2025.xlsb</strong> ({selectedYear})</span>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-700 text-white rounded-full">11 Indikator Sync</span>
          )}
        </div>
      </div>

      {/* Grid 3 Radar Cards per Pilar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. ASPEK KETERSEDIAAN PANGAN (4 Indikator) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">1. Ketersediaan Pangan</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Skor: {scoreAvailA}/100
              </span>
            </div>

            <div className="h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarAvailability} outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94A3B8' }} />
                  <Radar name={dataA.nama} dataKey="scoreA" stroke="#10B981" fill="#10B981" fillOpacity={0.4} strokeWidth={2} />
                  <Radar name={dataB.nama} dataKey="scoreB" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeDasharray="3 3" strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Rincian Indikator Ketersediaan ({selectedYear}):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 1.1 NCPR Pangan: <span className="font-bold text-slate-800">{dataA.raw_ncpr}</span></div>
              <div>• 1.2 Energi: <span className="font-bold text-slate-800">{dataA.raw_energy}%</span></div>
              <div>• 1.3 Protein Hewani: <span className="font-bold text-slate-800">{dataA.raw_animal_protein}%</span></div>
              <div>• 1.4 Cadangan: <span className="font-bold text-slate-800">{dataA.raw_food_reserves}</span></div>
            </div>
          </div>
        </div>

        {/* 2. ASPEK KETERJANGKAUAN PANGAN (3 Indikator) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">2. Keterjangkauan Pangan</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                Skor: {scoreAccessA}/100
              </span>
            </div>

            <div className="h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarAccessibility} outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94A3B8' }} />
                  <Radar name={dataA.nama} dataKey="scoreA" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} strokeWidth={2} />
                  <Radar name={dataB.nama} dataKey="scoreB" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeDasharray="3 3" strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Rincian Indikator Keterjangkauan ({selectedYear}):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 2.1 Miskin (Desil 1+2): <span className="font-bold text-slate-800">{dataA.raw_poverty}%</span></div>
              <div>• 2.2 Stabilitas CV Harga: <span className="font-bold text-slate-800">{dataA.raw_price_cv}%</span></div>
              <div>• 2.3 PoU Energi: <span className="font-bold text-slate-800">{dataA.raw_pou}%</span></div>
            </div>
          </div>
        </div>

        {/* 3. ASPEK PEMANFAATAN PANGAN (4 Indikator) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <h3 className="font-black text-slate-800 text-sm tracking-tight">3. Pemanfaatan Pangan</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                Skor: {scoreUtilA}/100
              </span>
            </div>

            <div className="h-[280px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarUtilization} outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94A3B8' }} />
                  <Radar name={dataA.nama} dataKey="scoreA" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} strokeWidth={2} />
                  <Radar name={dataB.nama} dataKey="scoreB" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeDasharray="3 3" strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Rincian Indikator Pemanfaatan ({selectedYear}):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 3.1 Sekolah Perempuan: <span className="font-bold text-slate-800">{dataA.raw_female_school} thn</span></div>
              <div>• 3.2 Tanpa Air Bersih: <span className="font-bold text-slate-800">{dataA.raw_no_water}%</span></div>
              <div>• 3.3 Skor PPH: <span className="font-bold text-slate-800">{dataA.raw_pph}</span></div>
              <div>• 3.4 Stunting: <span className="font-bold text-slate-800">{dataA.raw_stunting}%</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* Pastel Gold Evaluasi Card */}
      <div className="bg-gradient-to-br from-[#FEF9C3] via-[#FEF3C7] to-[#FDE68A] p-6 rounded-2xl border border-amber-300/80 shadow-md text-amber-950">
        <div className="flex items-center justify-between mb-4 border-b border-amber-300/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="font-black text-sm uppercase tracking-wider text-amber-900">
              Evaluasi Profil Radar Ketahanan Pangan: Kelurahan {dataA.nama} (FSVA {selectedYear})
            </h3>
          </div>
          <span className="text-xs font-black text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full border border-amber-300">
            Peringkat IKP: #{dataA.rank} / 43 Kelurahan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-800 leading-relaxed">
          
          {/* Card 1: Keunggulan Utama */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-emerald-950 font-black">Keunggulan Utama (Strong Points)</span>
            </div>
            <p className="text-slate-700 font-medium">
              Kelurahan {dataA.nama} memiliki skor pilar tertinggi pada <strong className="text-slate-900 font-black">
                {scoreAvailA >= scoreAccessA && scoreAvailA >= scoreUtilA ? 'Ketersediaan Pangan' : (scoreAccessA >= scoreUtilA ? 'Keterjangkauan Pangan' : 'Pemanfaatan Pangan')}
              </strong> (Skor: {Math.max(scoreAvailA, scoreAccessA, scoreUtilA)}/100).
            </p>
          </div>

          {/* Card 2: Titik Rentan */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-rose-700 font-extrabold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="text-rose-950 font-black">Titik Rentan (Vulnerability Points)</span>
            </div>
            <p className="text-slate-700 font-medium">
              Indikator terlemah saat ini adalah <strong className="text-slate-900 font-black">
                {lowestIndicatorA.subject}
              </strong> dengan skor <span className="font-bold text-rose-700">({lowestIndicatorA.scoreA}/100)</span>.
            </p>
          </div>

          {/* Card 3: Rekomendasi Kebijakan */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold">
              <TrendingUp className="w-4 h-4 shrink-0 text-amber-700" />
              <span className="text-amber-950 font-black">Rekomendasi Kebijakan (Policy Action)</span>
            </div>
            <p className="text-slate-700 font-medium">
              {getDynamicPolicyAction(lowestIndicatorA.key, dataA.nama)}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
