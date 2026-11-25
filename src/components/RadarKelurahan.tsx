/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { WILAYAH, ALL_KEC, ALL_KEL, KEL_TO_KEC, isKelurahanMatch } from '@/lib/wilayah';
import CustomSelect, { CustomSelectOption } from '@/components/CustomSelect';
import { 
  ShieldCheck, AlertCircle, Layers, Sliders, ArrowRightLeft, 
  Sparkles, CheckCircle2, TrendingUp, Calendar, FileSpreadsheet, Loader2,
  Lock, Building2, AlertTriangle, RefreshCw, BarChart3, HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import fsvaForm2Raw from '@/lib/fsva-form2-official-data.json';
import { normalizeValue } from '@/lib/fsva/normalization';
import { WEIGHTS } from '@/lib/fsva/constants';

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

// Function to lookup & dynamically calculate official FSVA 11-indicator data per year & kelurahan
function getForm2FSVAData(dbRows: any[]): Record<string, KelurahanData> {
  const result: Record<string, KelurahanData> = {};
  const clampScore = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  Object.entries(WILAYAH).forEach(([kec, kels]) => {
    kels.forEach((kel) => {
      // Find matching item in DB rows for the selected year
      const dbMatch = (dbRows || []).find((d) =>
        isKelurahanMatch(d.nama_kelurahan || d.kelurahan, kel)
      );

      // Kelurahan-specific Form 2.1 & 2.3 baseline (43 unique kelurahan profiles)
      const jsonMatch: Record<string, any> = Object.values(fsvaForm2Data).find((item: any) =>
        isKelurahanMatch(item.kelurahan, kel)
      ) || {};

      // Merge per-field so null columns in DB (e.g., 2026 IKP-only upload) never overwrite kelurahan baseline with static constants
      const raw_ncpr = Number(dbMatch?.ncpr ?? dbMatch?.raw_ncpr ?? jsonMatch.raw_ncpr ?? 6.0);
      const raw_energy = Number(dbMatch?.energy ?? dbMatch?.raw_energy ?? jsonMatch.raw_energy ?? 97.5);
      const raw_animal_protein = Number(dbMatch?.animal_protein ?? dbMatch?.raw_animal_protein ?? jsonMatch.raw_animal_protein ?? 75.0);
      const raw_food_reserves = Number(dbMatch?.food_reserves ?? dbMatch?.raw_food_reserves ?? jsonMatch.raw_food_reserves ?? 0.28);
      const raw_poverty = Number(dbMatch?.poverty ?? dbMatch?.rasio_miskin ?? dbMatch?.raw_poverty ?? jsonMatch.raw_poverty ?? 10.5);
      const raw_price_cv = Number(dbMatch?.price_cv ?? dbMatch?.raw_price_cv ?? jsonMatch.raw_price_cv ?? 4.2);
      const raw_pou = Number(dbMatch?.pou ?? dbMatch?.raw_pou ?? jsonMatch.raw_pou ?? 2.3);
      const raw_female_school = Number(dbMatch?.female_school ?? dbMatch?.raw_female_school ?? jsonMatch.raw_female_school ?? 9.2);
      const raw_no_water = Number(dbMatch?.no_water ?? dbMatch?.rasio_air ?? dbMatch?.raw_no_water ?? jsonMatch.raw_no_water ?? 2.3);
      const raw_pph = Number(dbMatch?.pph ?? dbMatch?.raw_pph ?? jsonMatch.raw_pph ?? 92.5);
      const raw_stunting = Number(dbMatch?.stunting ?? dbMatch?.raw_stunting ?? jsonMatch.raw_stunting ?? 4.4);

      const hasFullDbIndicators = dbMatch != null && (
        dbMatch.ncpr != null || dbMatch.poverty != null || dbMatch.stunting != null || dbMatch.idx_ketersediaan != null
      );

      // Compute individual normalized 0-100 scores dynamically from raw indicators when DB has raw columns, or from kelurahan baseline
      let score_ncpr = dbMatch?.score_ncpr ?? dbMatch?.score_lahan ?? (dbMatch?.ncpr != null ? clampScore(normalizeValue('ncpr', raw_ncpr) * 100) : (jsonMatch.score_ncpr ?? 40));
      let score_energy = dbMatch?.score_energy ?? dbMatch?.score_sarana ?? (dbMatch?.energy != null ? clampScore(normalizeValue('energy', raw_energy) * 100) : (jsonMatch.score_energy ?? 68));
      let score_animal_protein = dbMatch?.score_animal_protein ?? (dbMatch?.animal_protein != null ? clampScore(normalizeValue('protein', raw_animal_protein) * 100) : (jsonMatch.score_animal_protein ?? 52));
      let score_food_reserves = dbMatch?.score_food_reserves ?? (dbMatch?.food_reserves != null ? clampScore(normalizeValue('cadangan', raw_food_reserves) * 100) : (jsonMatch.score_food_reserves ?? 8));
      let score_poverty = dbMatch?.score_poverty ?? dbMatch?.score_miskin ?? (dbMatch?.poverty != null ? clampScore(normalizeValue('poverty', raw_poverty) * 100) : (jsonMatch.score_poverty ?? 73));
      let score_price_cv = dbMatch?.score_price_cv ?? dbMatch?.score_jalan ?? (dbMatch?.price_cv != null ? clampScore(normalizeValue('cv_harga', raw_price_cv) * 100) : (jsonMatch.score_price_cv ?? 88));
      let score_pou = dbMatch?.score_pou ?? (dbMatch?.pou != null ? clampScore(normalizeValue('pou', raw_pou) * 100) : (jsonMatch.score_pou ?? 97));
      let score_female_school = dbMatch?.score_female_school ?? (dbMatch?.female_school != null ? clampScore(normalizeValue('sekolah', raw_female_school) * 100) : (jsonMatch.score_female_school ?? 75));
      let score_no_water = dbMatch?.score_no_water ?? dbMatch?.score_air ?? (dbMatch?.no_water != null ? clampScore(normalizeValue('air', raw_no_water) * 100) : (jsonMatch.score_no_water ?? 98));
      let score_pph = dbMatch?.score_pph ?? (dbMatch?.pph != null ? clampScore(normalizeValue('pph', raw_pph) * 100) : (jsonMatch.score_pph ?? 88));
      let score_stunting = dbMatch?.score_stunting ?? dbMatch?.score_tenkes ?? (dbMatch?.stunting != null ? clampScore(normalizeValue('stunting', raw_stunting) * 100) : (jsonMatch.score_stunting ?? 94));

      const baseIkp = Number(jsonMatch.ikp ?? 72.26);
      const targetIkp = dbMatch?.ikp != null ? Number(dbMatch.ikp) : baseIkp;

      // If DB row only provides updated composite IKP (e.g., FSVA 2026 batch upload), scale kelurahan's indicator & pillar scores proportionally to its 2026 IKP
      const scaleRatio = (!hasFullDbIndicators && dbMatch?.ikp != null && baseIkp > 0)
        ? targetIkp / baseIkp
        : 1;

      if (scaleRatio !== 1) {
        score_ncpr = clampScore(score_ncpr * scaleRatio);
        score_energy = clampScore(score_energy * scaleRatio);
        score_animal_protein = clampScore(score_animal_protein * scaleRatio);
        score_food_reserves = clampScore(score_food_reserves * scaleRatio);
        score_poverty = clampScore(score_poverty * scaleRatio);
        score_price_cv = clampScore(score_price_cv * scaleRatio);
        score_pou = clampScore(score_pou * scaleRatio);
        score_female_school = clampScore(score_female_school * scaleRatio);
        score_no_water = clampScore(score_no_water * scaleRatio);
        score_pph = clampScore(score_pph * scaleRatio);
        score_stunting = clampScore(score_stunting * scaleRatio);
      }

      const wKet = WEIGHTS.ncpr + WEIGHTS.energy + WEIGHTS.protein + WEIGHTS.cadangan;
      const wAks = WEIGHTS.poverty + WEIGHTS.cv_harga + WEIGHTS.pou;
      const wPem = WEIGHTS.sekolah + WEIGHTS.air + WEIGHTS.pph + WEIGHTS.stunting;

      const calcKet = clampScore((score_ncpr * WEIGHTS.ncpr + score_energy * WEIGHTS.energy + score_animal_protein * WEIGHTS.protein + score_food_reserves * WEIGHTS.cadangan) / wKet);
      const calcAks = clampScore((score_poverty * WEIGHTS.poverty + score_price_cv * WEIGHTS.cv_harga + score_pou * WEIGHTS.pou) / wAks);
      const calcPem = clampScore((score_female_school * WEIGHTS.sekolah + score_no_water * WEIGHTS.air + score_pph * WEIGHTS.pph + score_stunting * WEIGHTS.stunting) / wPem);

      const idx_ketersediaan = dbMatch?.idx_ketersediaan != null
        ? Number(dbMatch.idx_ketersediaan)
        : (scaleRatio !== 1 && jsonMatch.idx_ketersediaan != null ? clampScore(Number(jsonMatch.idx_ketersediaan) * scaleRatio) : (jsonMatch.idx_ketersediaan ?? calcKet));
      const idx_akses = dbMatch?.idx_akses != null
        ? Number(dbMatch.idx_akses)
        : (scaleRatio !== 1 && jsonMatch.idx_akses != null ? clampScore(Number(jsonMatch.idx_akses) * scaleRatio) : (jsonMatch.idx_akses ?? calcAks));
      const idx_pemanfaatan = dbMatch?.idx_pemanfaatan != null
        ? Number(dbMatch.idx_pemanfaatan)
        : (scaleRatio !== 1 && jsonMatch.idx_pemanfaatan != null ? clampScore(Number(jsonMatch.idx_pemanfaatan) * scaleRatio) : (jsonMatch.idx_pemanfaatan ?? calcPem));

      const inverseRatio = scaleRatio > 0 ? 1 / scaleRatio : 1;

      result[kel] = {
        nama: kel,
        kecamatan: kec,
        raw_ncpr: +(raw_ncpr * (scaleRatio !== 1 ? inverseRatio : 1)).toFixed(2),
        raw_energy: +(raw_energy * (scaleRatio !== 1 ? scaleRatio : 1)).toFixed(1),
        raw_animal_protein: +(raw_animal_protein * (scaleRatio !== 1 ? scaleRatio : 1)).toFixed(1),
        raw_food_reserves: +(raw_food_reserves * (scaleRatio !== 1 ? scaleRatio : 1)).toFixed(2),
        raw_poverty: +(raw_poverty * (scaleRatio !== 1 ? inverseRatio : 1)).toFixed(1),
        raw_price_cv: +raw_price_cv.toFixed(1),
        raw_pou: +(raw_pou * (scaleRatio !== 1 ? inverseRatio : 1)).toFixed(2),
        raw_female_school: +raw_female_school.toFixed(1),
        raw_no_water: +(raw_no_water * (scaleRatio !== 1 ? inverseRatio : 1)).toFixed(2),
        raw_pph: +Math.min(100, raw_pph * (scaleRatio !== 1 ? scaleRatio : 1)).toFixed(1),
        raw_stunting: +(raw_stunting * (scaleRatio !== 1 ? inverseRatio : 1)).toFixed(2),
        score_ncpr,
        score_energy,
        score_animal_protein,
        score_food_reserves,
        score_poverty,
        score_price_cv,
        score_pou,
        score_female_school,
        score_no_water,
        score_pph,
        score_stunting,
        idx_ketersediaan,
        idx_akses,
        idx_pemanfaatan,
        ikp: +targetIkp.toFixed(2),
        rank: dbMatch?.rank != null ? Number(dbMatch.rank) : 0,
      };
    });
  });

  // Compute dynamic rank (1 = highest IKP, 43 = lowest IKP) whenever DB rank is null
  const sortedByIkp = Object.values(result).sort((a, b) => b.ikp - a.ikp);
  sortedByIkp.forEach((item, idx) => {
    if (!item.rank || item.rank <= 0) {
      result[item.nama].rank = idx + 1;
    }
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

// Compute Average Kecamatan Benchmark from active dataset
function getKecamatanAverageData(dataset: Record<string, KelurahanData>, kecName: string): KelurahanData {
  const all = Object.values(dataset);
  const kecKels = all.filter(
    (k) => k.kecamatan.trim().toLowerCase() === kecName.trim().toLowerCase()
  );
  const count = kecKels.length || 1;

  const sum = kecKels.reduce((acc, curr) => ({
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
    nama: `Kecamatan ${kecName}`,
    kecamatan: kecName,
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
  
  const [mode, setMode] = useState<'benchmark' | 'kecamatan'>('benchmark');
  
  // Kecamatan wilayah asal kelurahan
  const parentKec = useMemo(() => KEL_TO_KEC[selectedKel] || selectedKec, [selectedKel, selectedKec]);
  const [compareKec, setCompareKec] = useState<string>('Citangkil');

  // Strict enforcement: sinkronkan compareKec selalu ke wilayah asal kelurahan terpilih
  useEffect(() => {
    setCompareKec(parentKec);
  }, [parentKec]);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2025, 2026]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbRows, setDbRows] = useState<any[]>([]);

  // Fetch available years in fsva_matang dynamically
  useEffect(() => {
    async function fetchYears() {
      try {
        const { data, error } = await supabase
          .from('fsva_matang')
          .select('periode')
          .order('periode', { ascending: true });
        if (!error && data) {
          const years = Array.from(new Set(data.map(r => r.periode))).filter(Boolean).sort((a, b) => a - b);
          if (years.length > 0) {
            setAvailableYears(years);
            setSelectedYear(years[years.length - 1]);
          }
        }
      } catch (e) {
        console.warn('Failed to load FSVA periods for Radar:', e);
      }
    }
    fetchYears();
  }, []);

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
  const kecAvg = useMemo(() => getKecamatanAverageData(currentDataset, parentKec), [currentDataset, parentKec]);

  // Validasi ketat: apakah kecamatan pembanding berbeda dengan wilayah asal kelurahan
  const isKecMismatch = mode === 'kecamatan' && compareKec.trim().toLowerCase() !== parentKec.trim().toLowerCase();

  // Update selectedKel when Kecamatan changes
  const handleKecChange = (kec: string) => {
    setSelectedKec(kec);
    const kels = WILAYAH[kec] || [];
    if (kels.length > 0) {
      setSelectedKel(kels[0]);
    }
    setCompareKec(kec);
  };

  const handleKelChange = (kel: string) => {
    setSelectedKel(kel);
    const pKec = KEL_TO_KEC[kel] || selectedKec;
    setCompareKec(pKec);
  };

  // Opsi kecamatan pembanding: ATUR KETAT hanya kecamatan wilayah asal yang aktif, selain itu DISABLE
  const compareKecOptions: CustomSelectOption[] = useMemo(() => {
    return ALL_KEC.map((kec) => {
      const isMatch = kec.trim().toLowerCase() === parentKec.trim().toLowerCase();
      return {
        value: kec,
        label: isMatch
          ? `Kecamatan ${kec} (Wilayah Induk)`
          : `Kecamatan ${kec} (Beda Wilayah)`,
        disabled: !isMatch,
      };
    });
  }, [parentKec]);

  // Get active kelurahan data & benchmark data
  const dataA = currentDataset[selectedKel] || currentDataset['Deringo'];
  const dataB = mode === 'kecamatan' ? kecAvg : cityAvg;

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

  const ikpDelta = +(dataA.ikp - dataB.ikp).toFixed(2);

  const getDynamicPolicyAction = (indicatorKey: string, kelName: string, kecName?: string) => {
    const wilayahLabel = kecName ? `Kelurahan ${kelName} (Kecamatan ${kecName})` : `Kelurahan ${kelName}`;
    switch (indicatorKey) {
      case 'ncpr':
        return `Akselerasi fasilitasi pasokan pangan pokok dan kerja sama antar daerah (KAD) untuk menjamin stabilitas ketersediaan pangan di ${wilayahLabel}.`;
      case 'no_water':
        return `Percepatan pembangunan sarana air bersih dan sanitasi di ${wilayahLabel} bekerjasama dengan Dinas PUPR / Perkim.`;
      case 'poverty':
        return `Prioritas penyaluran bantuan pangan cadangan pemerintah dan bansos tepat sasaran bagi masyarakat desil 1 & 2 di ${wilayahLabel}.`;
      case 'stunting':
        return `Penguatan intervensi gizi spesifik PMT lokal Posyandu di ${wilayahLabel} untuk balita di bawah standar stunting.`;
      case 'price_cv':
        return `Penyelenggaraan Gerakan Pangan Murah (GPM) berkala untuk menjaga stabilitas harga pangan pokok di ${wilayahLabel}.`;
      default:
        return `Peningkatan sinergitas lintas sektor di ${wilayahLabel} guna meningkatkan skor pemenuhan 11 indikator FSVA.`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg border border-slate-700 shadow-xl text-xs space-y-1.5 min-w-[220px]">
          <p className="font-extrabold text-emerald-400 border-b border-slate-700 pb-1">{dataItem.subject}</p>
          <div className="flex justify-between items-center gap-4 text-slate-200">
            <span>Kel. {dataA.nama}:</span>
            <span className="font-bold text-white tabular-nums">
              {dataItem.valA} {dataItem.unit} <span className="text-[10px] text-emerald-400 font-normal">({dataItem.scoreA}/100)</span>
            </span>
          </div>
          {!isKecMismatch ? (
            <div className="flex justify-between items-center gap-4 text-slate-400">
              <span>{mode === 'kecamatan' ? `Kec. ${parentKec}` : dataB.nama}:</span>
              <span className="font-bold text-amber-300 tabular-nums">
                {dataItem.valB} {dataItem.unit} <span className="text-[10px] text-amber-400 font-normal">({dataItem.scoreB}/100)</span>
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-rose-400 italic border-t border-slate-700/80 pt-1">
              Perbandingan dinonaktifkan (beda kecamatan)
            </div>
          )}
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
            <p className="text-emerald-100/90 text-xs mt-1">
              {mode === 'kecamatan'
                ? `Komparasi ketat Kelurahan ${dataA.nama} terhadap agregat Kecamatan ${parentKec}`
                : `Profil mandiri Kelurahan ${dataA.nama} dibandingkan rata-rata Kota Cilegon`}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/25 p-3.5 rounded-xl border border-emerald-400/30 shrink-0 shadow-inner">
            <div className="text-right">
              <p className="text-[10px] text-emerald-200 font-black tracking-wider">Skor Kel. {dataA.nama}</p>
              <p className="text-2xl font-black text-emerald-300 tabular-nums">
                {overallScoreA}<span className="text-xs font-normal text-emerald-200/80">/100</span>
              </p>
            </div>
            <div className="h-8 w-px bg-emerald-400/30" />
            <div className="text-left">
              <p className="text-[10px] text-amber-200 font-black tracking-wider">
                {mode === 'kecamatan' ? `Kec. ${parentKec}` : 'Kota Cilegon'}
              </p>
              <p className="text-2xl font-black text-amber-300 tabular-nums">
                {Math.round(dataB.ikp)}
                <span className="text-xs font-normal text-amber-200/80">/100</span>
              </p>
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
              onClick={() => setMode('kecamatan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'kecamatan'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Kelurahan vs Kecamatan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Kecamatan Dropdown */}
          <CustomSelect
            label="Pilih Kecamatan"
            value={selectedKec}
            onChange={(val) => handleKecChange(String(val))}
            options={ALL_KEC.map(kec => ({ value: kec, label: `Kecamatan ${kec}` }))}
            variant="emerald"
            icon={<Building2 className="w-3.5 h-3.5 text-emerald-600" />}
          />

          {/* Kelurahan A Dropdown */}
          <CustomSelect
            label={mode === 'kecamatan' ? 'Kelurahan Utama (A)' : 'Pilih Kelurahan'}
            value={selectedKel}
            onChange={(val) => handleKelChange(String(val))}
            options={(WILAYAH[selectedKec] || []).map(kel => ({ value: kel, label: `Kelurahan ${kel}` }))}
            variant="emerald"
          />

          {/* Kecamatan Pembanding (B) or Kota Benchmark */}
          {mode === 'kecamatan' ? (
            <div>
              <CustomSelect
                label="Kecamatan Pembanding (B)"
                value={compareKec}
                onChange={(val) => setCompareKec(String(val))}
                options={compareKecOptions}
                variant="amber"
                icon={<Building2 className="w-3.5 h-3.5 text-amber-600" />}
              />
              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Ketat: Hanya Wilayah Induk ({parentKec})</span>
              </div>
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
              <div className="mt-1 text-[10px] text-slate-400 font-medium">
                Benchmark agregat seluruh 43 kelurahan
              </div>
            </div>
          )}

          {/* Tahun FSVA Selector */}
          <CustomSelect
            label="Tahun Data FSVA"
            value={selectedYear}
            onChange={(val) => setSelectedYear(Number(val))}
            options={availableYears.map(yr => ({
              value: yr,
              label: `Tahun ${yr}`
            }))}
            variant="emerald"
            searchable={false}
            icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
          />

        </div>

        {/* Warning Banner if cross-district mismatch occurs */}
        {isKecMismatch && (
          <div className="mt-3 bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-extrabold text-rose-800">Perbandingan Lintas Kecamatan Dinonaktifkan</p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Kelurahan <strong>{dataA.nama}</strong> berada di wilayah <strong>Kecamatan {parentKec}</strong>. Sesuai aturan ketat, kelurahan hanya dapat dibandingkan dengan profil kecamatannya sendiri.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompareKec(parentKec)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset ke Kec. {parentKec}
            </button>
          </div>
        )}
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
                  <Radar name={`Kel. ${dataA.nama}`} dataKey="scoreA" stroke="#10B981" fill="#10B981" fillOpacity={0.4} strokeWidth={2} />
                  {!isKecMismatch && (
                    <Radar 
                      name={mode === 'kecamatan' ? `Kec. ${parentKec}` : 'Rata-rata Kota'} 
                      dataKey="scoreB" 
                      stroke="#F59E0B" 
                      fill="#F59E0B" 
                      fillOpacity={0.2} 
                      strokeDasharray="3 3" 
                      strokeWidth={2} 
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span>Rincian Indikator Ketersediaan ({selectedYear}):</span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Kel vs {mode === 'kecamatan' ? 'Kec' : 'Kota'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 1.1 NCPR: <span className="font-bold text-slate-800">{dataA.raw_ncpr}</span> <span className="text-slate-400 font-medium">({dataB.raw_ncpr})</span></div>
              <div>• 1.2 Energi: <span className="font-bold text-slate-800">{dataA.raw_energy}%</span> <span className="text-slate-400 font-medium">({dataB.raw_energy}%)</span></div>
              <div>• 1.3 Protein Hewani: <span className="font-bold text-slate-800">{dataA.raw_animal_protein}%</span> <span className="text-slate-400 font-medium">({dataB.raw_animal_protein}%)</span></div>
              <div>• 1.4 Cadangan: <span className="font-bold text-slate-800">{dataA.raw_food_reserves}</span> <span className="text-slate-400 font-medium">({dataB.raw_food_reserves})</span></div>
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
                  <Radar name={`Kel. ${dataA.nama}`} dataKey="scoreA" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} strokeWidth={2} />
                  {!isKecMismatch && (
                    <Radar 
                      name={mode === 'kecamatan' ? `Kec. ${parentKec}` : 'Rata-rata Kota'} 
                      dataKey="scoreB" 
                      stroke="#F59E0B" 
                      fill="#F59E0B" 
                      fillOpacity={0.2} 
                      strokeDasharray="3 3" 
                      strokeWidth={2} 
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span>Rincian Indikator Keterjangkauan ({selectedYear}):</span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Kel vs {mode === 'kecamatan' ? 'Kec' : 'Kota'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 2.1 Miskin: <span className="font-bold text-slate-800">{dataA.raw_poverty}%</span> <span className="text-slate-400 font-medium">({dataB.raw_poverty}%)</span></div>
              <div>• 2.2 CV Harga: <span className="font-bold text-slate-800">{dataA.raw_price_cv}%</span> <span className="text-slate-400 font-medium">({dataB.raw_price_cv}%)</span></div>
              <div>• 2.3 PoU Energi: <span className="font-bold text-slate-800">{dataA.raw_pou}%</span> <span className="text-slate-400 font-medium">({dataB.raw_pou}%)</span></div>
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
                  <Radar name={`Kel. ${dataA.nama}`} dataKey="scoreA" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} strokeWidth={2} />
                  {!isKecMismatch && (
                    <Radar 
                      name={mode === 'kecamatan' ? `Kec. ${parentKec}` : 'Rata-rata Kota'} 
                      dataKey="scoreB" 
                      stroke="#F59E0B" 
                      fill="#F59E0B" 
                      fillOpacity={0.2} 
                      strokeDasharray="3 3" 
                      strokeWidth={2} 
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span>Rincian Indikator Pemanfaatan ({selectedYear}):</span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Kel vs {mode === 'kecamatan' ? 'Kec' : 'Kota'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div>• 3.1 Sekolah Pr: <span className="font-bold text-slate-800">{dataA.raw_female_school} thn</span> <span className="text-slate-400 font-medium">({dataB.raw_female_school} thn)</span></div>
              <div>• 3.2 Tanpa Air: <span className="font-bold text-slate-800">{dataA.raw_no_water}%</span> <span className="text-slate-400 font-medium">({dataB.raw_no_water}%)</span></div>
              <div>• 3.3 Skor PPH: <span className="font-bold text-slate-800">{dataA.raw_pph}</span> <span className="text-slate-400 font-medium">({dataB.raw_pph})</span></div>
              <div>• 3.4 Stunting: <span className="font-bold text-slate-800">{dataA.raw_stunting}%</span> <span className="text-slate-400 font-medium">({dataB.raw_stunting}%)</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* Pastel Gold Evaluasi Card */}
      <div className="bg-gradient-to-br from-[#FEF9C3] via-[#FEF3C7] to-[#FDE68A] p-6 rounded-2xl border border-amber-300/80 shadow-md text-amber-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-amber-300/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="font-black text-sm uppercase tracking-wider text-amber-900">
              {mode === 'kecamatan' 
                ? `EVALUASI KOMPARASI: KELURAHAN ${dataA.nama.toUpperCase()} VS KECAMATAN ${parentKec.toUpperCase()} (${selectedYear})`
                : `ANALISIS DAN INTERPRETASI GRAFIK RADAR: KELURAHAN ${dataA.nama.toUpperCase()} (FSVA ${selectedYear})`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full border border-amber-300">
              Peringkat IKP: #{dataA.rank} / 43 Kelurahan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-800 leading-relaxed">
          
          {/* Card 1: Komparasi / Keunggulan */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-emerald-950 font-black">
                {mode === 'kecamatan' ? 'Komparasi Wilayah Induk' : 'Keunggulan Utama (Strong Points)'}
              </span>
            </div>
            {mode === 'kecamatan' ? (
              <p className="text-slate-700 font-medium">
                Skor IKP Kelurahan {dataA.nama} (<strong className="text-slate-900 font-bold">{dataA.ikp}</strong>) tercatat{' '}
                <strong className={ikpDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {ikpDelta >= 0 ? `+${ikpDelta} poin di atas` : `${Math.abs(ikpDelta)} poin di bawah`}
                </strong>{' '}
                rata-rata Kecamatan {parentKec} ({dataB.ikp}). Skor pilar terkuat berada pada{' '}
                <strong className="text-slate-900 font-black">
                  {scoreAvailA >= scoreAccessA && scoreAvailA >= scoreUtilA ? 'Ketersediaan' : (scoreAccessA >= scoreUtilA ? 'Keterjangkauan' : 'Pemanfaatan')}
                </strong> ({Math.max(scoreAvailA, scoreAccessA, scoreUtilA)}/100).
              </p>
            ) : (
              <p className="text-slate-700 font-medium">
                Kelurahan {dataA.nama} memiliki skor pilar tertinggi pada <strong className="text-slate-900 font-black">
                  {scoreAvailA >= scoreAccessA && scoreAvailA >= scoreUtilA ? 'Ketersediaan Pangan' : (scoreAccessA >= scoreUtilA ? 'Keterjangkauan Pangan' : 'Pemanfaatan Pangan')}
                </strong> (Skor: {Math.max(scoreAvailA, scoreAccessA, scoreUtilA)}/100).
              </p>
            )}
          </div>

          {/* Card 2: Titik Rentan */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-rose-700 font-extrabold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="text-rose-950 font-black">Titik Rentan (Vulnerability Points)</span>
            </div>
            <p className="text-slate-700 font-medium">
              Indikator dengan skor terendah saat ini adalah <strong className="text-slate-900 font-black">
                {lowestIndicatorA.subject}
              </strong> dengan skor <span className="font-bold text-rose-700">({lowestIndicatorA.scoreA}/100)</span>.
              {mode === 'kecamatan' && (
                <span className="block mt-1 text-[11px] text-slate-600">
                  Rata-rata Kecamatan {parentKec}: <span className="font-bold text-slate-800">{lowestIndicatorA.scoreB}/100</span>
                </span>
              )}
            </p>
          </div>

          {/* Card 3: Rekomendasi Kebijakan */}
          <div className="space-y-2 bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold">
              <TrendingUp className="w-4 h-4 shrink-0 text-amber-700" />
              <span className="text-amber-950 font-black">Rekomendasi Kebijakan (Policy Action)</span>
            </div>
            <p className="text-slate-700 font-medium">
              {getDynamicPolicyAction(lowestIndicatorA.key, dataA.nama, mode === 'kecamatan' ? parentKec : undefined)}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
