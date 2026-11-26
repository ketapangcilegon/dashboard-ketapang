"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  TrendingUp,
  Info,
  BarChart3,
  Layers,
  Utensils,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  Line,
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import {
  SKPG_KECAMATANS,
  SKPG_MONTH_NAMES,
  SKPG_MONTH_SHORT,
  scoreKeterjangkauan,
  scorePemanfaatan,
  scoreKompositPerkotaan,
  normalizeKecamatanName,
} from '@/lib/skpg/scoring';
import { WILAYAH } from '@/lib/wilayah';

interface HargaRow {
  tahun: number;
  bulan: number;
  kecamatan: string;
  beras: number;
  minyak: number;
  telur: number;
}

interface GiziKecRow {
  tahun: number;
  bulan: number;
  kecamatan: string;
  bb_sangat_kurang: number;
  bb_kurang: number;
  bb_normal: number;
  bb_lebih: number;
  total_balita: number;
}

interface GiziKelRow {
  tahun: number;
  bulan: number;
  kecamatan: string;
  kelurahan: string;
  bb_sangat_kurang: number;
  bb_kurang: number;
  bb_normal: number;
  bb_lebih: number;
  total_balita: number;
}

type SubMenuTab = 'komposit' | 'keterjangkauan' | 'pemanfaatan';
type LevelMode = 'kecamatan' | 'kelurahan';

const ALL_KEL_LIST: Array<{ kelurahan: string; kecamatan: string }> = SKPG_KECAMATANS.flatMap((kec) => {
  const kels = kec === 'Pulomerak' ? WILAYAH['Pulo Merak'] || [] : WILAYAH[kec] || [];
  return kels.map((kel) => ({ kelurahan: kel, kecamatan: kec }));
});

function cellColorClass(status: string) {
  if (status === 'AMAN') return 'bg-emerald-500 text-white';
  if (status === 'WASPADA') return 'bg-amber-400 text-slate-900';
  if (status === 'RENTAN') return 'bg-rose-500 text-white';
  return 'bg-slate-100 text-slate-400';
}

export default function KalenderSKPG() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [levelMode, setLevelMode] = useState<LevelMode>('kecamatan');
  const [activeTab, setActiveTab] = useState<SubMenuTab>('komposit');

  const [hargaRows, setHargaRows] = useState<HargaRow[]>([]);
  const [giziKecRows, setGiziKecRows] = useState<GiziKecRow[]>([]);
  const [giziKelRows, setGiziKelRows] = useState<GiziKelRow[]>([]);

  useEffect(() => {
    const fetchAllSkpgData = async () => {
      setLoading(true);
      try {
        const [hargaRes, giziKecRes, giziKelRes] = await Promise.all([
          supabase
            .from('harga_komoditas_skpg')
            .select('tahun, bulan, kecamatan, beras, minyak, telur')
            .order('tahun', { ascending: true })
            .order('bulan', { ascending: true }),
          supabase
            .from('gizi_balita_skpg')
            .select('tahun, bulan, kecamatan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_balita')
            .order('tahun', { ascending: true })
            .order('bulan', { ascending: true }),
          supabase
            .from('gizi_balita_skpg_kelurahan')
            .select('tahun, bulan, kecamatan, kelurahan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_balita')
            .order('tahun', { ascending: true })
            .order('bulan', { ascending: true }),
        ]);

        const hData = (hargaRes.data || []) as HargaRow[];
        const gkData = (giziKecRes.data || []) as GiziKecRow[];
        const gKelData = (giziKelRes.data || []) as GiziKelRow[];

        setHargaRows(hData);
        setGiziKecRows(gkData);
        setGiziKelRows(gKelData);

        const yearSet = new Set<number>();
        hData.forEach((r) => yearSet.add(r.tahun));
        gkData.forEach((r) => yearSet.add(r.tahun));
        gKelData.forEach((r) => {
          if (r.total_balita > 0) yearSet.add(r.tahun);
        });

        const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
        if (sortedYears.length > 0) {
          setAvailableYears(sortedYears);
          setSelectedYear(sortedYears[0]);
        }
      } catch (err) {
        console.error('[KalenderSKPG] Error loading Supabase SKPG data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSkpgData();
  }, []);

  // Index harga per `${tahun}-${bulan}-${kecamatan}`
  const hargaMap = useMemo(() => {
    const map: Record<string, { beras: number; minyak: number; telur: number }> = {};
    hargaRows.forEach((r) => {
      const kec = normalizeKecamatanName(r.kecamatan);
      if (!kec) return;
      map[`${r.tahun}-${r.bulan}-${kec}`] = {
        beras: Number(r.beras) || 0,
        minyak: Number(r.minyak) || 0,
        telur: Number(r.telur) || 0,
      };
    });
    return map;
  }, [hargaRows]);

  // Index gizi kecamatan per `${tahun}-${bulan}-${kecamatan}`
  // Menggabungkan gizi_balita_skpg dan agregasi dari gizi_balita_skpg_kelurahan jika kecamatan belum ada
  const giziKecMap = useMemo(() => {
    const map: Record<string, { sk: number; kr: number; nm: number; lb: number; tot: number }> = {};

    // 1. Isi dulu dari agregasi kelurahan
    giziKelRows.forEach((r) => {
      if (!r.total_balita || r.total_balita <= 0) return;
      const kec = normalizeKecamatanName(r.kecamatan);
      if (!kec) return;
      const key = `${r.tahun}-${r.bulan}-${kec}`;
      if (!map[key]) map[key] = { sk: 0, kr: 0, nm: 0, lb: 0, tot: 0 };
      map[key].sk += Number(r.bb_sangat_kurang) || 0;
      map[key].kr += Number(r.bb_kurang) || 0;
      map[key].nm += Number(r.bb_normal) || 0;
      map[key].lb += Number(r.bb_lebih) || 0;
      map[key].tot += Number(r.total_balita) || 0;
    });

    // 2. Prioritaskan baris resmi gizi_balita_skpg bila total_balita > 0
    giziKecRows.forEach((r) => {
      if (!r.total_balita || r.total_balita <= 0) return;
      const kec = normalizeKecamatanName(r.kecamatan);
      if (!kec) return;
      const key = `${r.tahun}-${r.bulan}-${kec}`;
      map[key] = {
        sk: Number(r.bb_sangat_kurang) || 0,
        kr: Number(r.bb_kurang) || 0,
        nm: Number(r.bb_normal) || 0,
        lb: Number(r.bb_lebih) || 0,
        tot: Number(r.total_balita) || 0,
      };
    });

    return map;
  }, [giziKecRows, giziKelRows]);

  // Index gizi kelurahan per `${tahun}-${bulan}-${kelurahanLower}`
  const giziKelMap = useMemo(() => {
    const map: Record<string, { sk: number; kr: number; nm: number; lb: number; tot: number }> = {};
    giziKelRows.forEach((r) => {
      if (!r.total_balita || r.total_balita <= 0) return;
      const key = `${r.tahun}-${r.bulan}-${r.kelurahan.trim().toLowerCase()}`;
      map[key] = {
        sk: Number(r.bb_sangat_kurang) || 0,
        kr: Number(r.bb_kurang) || 0,
        nm: Number(r.bb_normal) || 0,
        lb: Number(r.bb_lebih) || 0,
        tot: Number(r.total_balita) || 0,
      };
    });
    return map;
  }, [giziKelRows]);

  // Bangun matriks 12 bulan untuk setiap wilayah (Kecamatan / Kelurahan) pada selectedYear
  const calendarData = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const units =
      levelMode === 'kecamatan'
        ? SKPG_KECAMATANS.map((k) => ({ id: k, nama: k, kecamatan: k }))
        : ALL_KEL_LIST.map((k) => ({ id: `${k.kecamatan}-${k.kelurahan}`, nama: k.kelurahan, kecamatan: k.kecamatan }));

    const rows = units.map((u) => {
      const cells = months.map((m) => {
        const curPrice = hargaMap[`${selectedYear}-${m}-${u.kecamatan}`] || { beras: 0, minyak: 0, telur: 0 };
        const prevPrice = hargaMap[`${selectedYear - 1}-${m}-${u.kecamatan}`] || { beras: 0, minyak: 0, telur: 0 };
        const akses = scoreKeterjangkauan(curPrice, prevPrice);

        const giziRec =
          levelMode === 'kecamatan'
            ? giziKecMap[`${selectedYear}-${m}-${u.kecamatan}`]
            : giziKelMap[`${selectedYear}-${m}-${u.nama.toLowerCase()}`];
        const pemanfaatan = scorePemanfaatan(giziRec?.sk || 0, giziRec?.kr || 0, giziRec?.tot || 0);

        const komposit = scoreKompositPerkotaan(
          akses.available ? akses.index : 0,
          pemanfaatan.available ? pemanfaatan.index : 0
        );

        return {
          bulan: m,
          akses,
          pemanfaatan,
          komposit,
          curPrice,
          prevPrice,
          giziRec,
        };
      });

      const waspadaCount = cells.filter((c) => {
        const st =
          activeTab === 'komposit'
            ? c.komposit.status
            : activeTab === 'keterjangkauan'
            ? c.akses.status
            : c.pemanfaatan.status;
        return st === 'WASPADA';
      }).length;

      const rentanCount = cells.filter((c) => {
        const st =
          activeTab === 'komposit'
            ? c.komposit.status
            : activeTab === 'keterjangkauan'
            ? c.akses.status
            : c.pemanfaatan.status;
        return st === 'RENTAN';
      }).length;

      return { ...u, cells, waspadaCount, rentanCount };
    });

    // Baris agregat Kota Cilegon per bulan (1..12)
    // Harga Kota Cilegon dihitung dari rata-rata 3 pasar acuan (Kranggot/Ciwandan, Blok F/Cibeber, Merak/Pulomerak)
    const MARKET_REPS = ['Ciwandan', 'Cibeber', 'Pulomerak'] as const;
    const kotaByMonth = months.map((m) => {
      let sumCurB = 0, sumPrevB = 0, sumCurM = 0, sumPrevM = 0, sumCurT = 0, sumPrevT = 0, cntP = 0;
      let sumSk = 0, sumKr = 0, sumNm = 0, sumLb = 0, sumTot = 0;

      MARKET_REPS.forEach((kec) => {
        const cp = hargaMap[`${selectedYear}-${m}-${kec}`];
        const pp = hargaMap[`${selectedYear - 1}-${m}-${kec}`];
        if (cp && pp && cp.beras > 0 && pp.beras > 0) {
          sumCurB += cp.beras;
          sumPrevB += pp.beras;
          sumCurM += cp.minyak;
          sumPrevM += pp.minyak;
          sumCurT += cp.telur;
          sumPrevT += pp.telur;
          cntP++;
        }
      });

      SKPG_KECAMATANS.forEach((kec) => {
        const g = giziKecMap[`${selectedYear}-${m}-${kec}`];
        if (g && g.tot > 0) {
          sumSk += g.sk;
          sumKr += g.kr;
          sumNm += g.nm;
          sumLb += g.lb;
          sumTot += g.tot;
        }
      });

      const avgCur =
        cntP > 0
          ? {
              beras: Math.round(sumCurB / cntP),
              minyak: Math.round(sumCurM / cntP),
              telur: Math.round(sumCurT / cntP),
            }
          : { beras: 0, minyak: 0, telur: 0 };
      const avgPrev =
        cntP > 0
          ? {
              beras: Math.round(sumPrevB / cntP),
              minyak: Math.round(sumPrevM / cntP),
              telur: Math.round(sumPrevT / cntP),
            }
          : { beras: 0, minyak: 0, telur: 0 };

      const akses = scoreKeterjangkauan(avgCur, avgPrev);
      const pemanfaatan = scorePemanfaatan(sumSk, sumKr, sumTot);
      const komposit = scoreKompositPerkotaan(
        akses.available ? akses.index : 0,
        pemanfaatan.available ? pemanfaatan.index : 0
      );

      // Hitung distribusi wilayah Aman/Waspada/Rentan bulan ini
      let aman = 0, waspada = 0, rentan = 0;
      rows.forEach((r) => {
        const cell = r.cells[m - 1];
        const st =
          activeTab === 'komposit'
            ? cell.komposit.status
            : activeTab === 'keterjangkauan'
            ? cell.akses.status
            : cell.pemanfaatan.status;
        if (st === 'AMAN') aman++;
        else if (st === 'WASPADA') waspada++;
        else if (st === 'RENTAN') rentan++;
      });

      return {
        bulan: m,
        bulanNama: SKPG_MONTH_SHORT[m],
        bulanFull: SKPG_MONTH_NAMES[m],
        avgCur,
        avgPrev,
        akses,
        pemanfaatan,
        komposit,
        sumSk,
        sumKr,
        sumNm,
        sumLb,
        sumTot,
        aman,
        waspada,
        rentan,
      };
    });

    return { rows, kotaByMonth };
  }, [selectedYear, levelMode, activeTab, hargaMap, giziKecMap, giziKelMap]);

  // Statistik KPI & Interpretasi Otomatis
  const summaryStats = useMemo(() => {
    const activeMonths = calendarData.kotaByMonth.filter((m) =>
      activeTab === 'komposit'
        ? m.komposit.available
        : activeTab === 'keterjangkauan'
        ? m.akses.available
        : m.pemanfaatan.available
    );

    const totalRentanCells = calendarData.rows.reduce((s, r) => s + r.rentanCount, 0);
    const totalWaspadaCells = calendarData.rows.reduce((s, r) => s + r.waspadaCount, 0);

    const avgKomposit =
      activeMonths.length > 0 && activeTab === 'komposit'
        ? (
            activeMonths.reduce((s, m) => s + m.komposit.skor, 0) / activeMonths.length
          ).toFixed(2)
        : activeMonths.length > 0 && activeTab === 'keterjangkauan'
        ? (
            activeMonths.reduce((s, m) => s + m.akses.index, 0) / activeMonths.length
          ).toFixed(2)
        : activeMonths.length > 0
        ? (
            activeMonths.reduce((s, m) => s + m.pemanfaatan.index, 0) / activeMonths.length
          ).toFixed(2)
        : '-';

    const topWatchUnits = [...calendarData.rows]
      .filter((r) => r.rentanCount > 0 || r.waspadaCount > 0)
      .sort((a, b) => b.rentanCount - a.rentanCount || b.waspadaCount - a.waspadaCount)
      .slice(0, 5);

    const criticalMonths = [...activeMonths]
      .filter((m) => m.rentan > 0 || m.waspada > 0)
      .sort((a, b) => b.rentan - a.rentan || b.waspada - a.waspada)
      .slice(0, 3);

    // Deteksi komoditas pemicu tekanan harga sepanjang tahun
    const aksesMonths = calendarData.kotaByMonth.filter((m) => m.akses.available);
    const berasAlertMonths = aksesMonths.filter((m) => m.akses.bobotBeras < 3).length;
    const minyakAlertMonths = aksesMonths.filter((m) => m.akses.bobotMinyak < 3).length;
    const telurAlertMonths = aksesMonths.filter((m) => m.akses.bobotTelur < 3).length;

    return {
      monthsTracked: activeMonths.length,
      totalRentanCells,
      totalWaspadaCells,
      avgScore: avgKomposit,
      topWatchUnits,
      criticalMonths,
      berasAlertMonths,
      minyakAlertMonths,
      telurAlertMonths,
    };
  }, [calendarData, activeTab]);

  // Data grafik sesuai sub-menu
  const chartData = useMemo(() => {
    return calendarData.kotaByMonth.map((m) => ({
      bulan: m.bulanNama,
      Aman: m.aman,
      Waspada: m.waspada,
      Rentan: m.rentan,
      beras: m.avgCur.beras || null,
      minyak: m.avgCur.minyak || null,
      telur: m.avgCur.telur || null,
      rBeras: m.akses.available ? m.akses.rBeras : null,
      rMinyak: m.akses.available ? m.akses.rMinyak : null,
      rTelur: m.akses.available ? m.akses.rTelur : null,
      prevalensi: m.pemanfaatan.available ? m.pemanfaatan.prevalensi : null,
      totalBalita: m.sumTot || null,
    }));
  }, [calendarData]);

  const handleExportExcel = () => {
    const tabLabel =
      activeTab === 'komposit'
        ? 'Komposit_Perkotaan'
        : activeTab === 'keterjangkauan'
        ? 'Keterjangkauan_Pangan'
        : 'Pemanfaatan_Pangan';

    const headers = [
      levelMode === 'kecamatan' ? 'Kecamatan' : 'Kelurahan',
      ...(levelMode === 'kelurahan' ? ['Kecamatan Induk'] : []),
      ...SKPG_MONTH_SHORT.slice(1),
      'Bln Waspada',
      'Bln Rentan',
    ];

    const body = calendarData.rows.map((r) => [
      r.nama,
      ...(levelMode === 'kelurahan' ? [r.kecamatan] : []),
      ...r.cells.map((c) => {
        if (activeTab === 'komposit') return c.komposit.available ? `${c.komposit.skor} (${c.komposit.status})` : '-';
        if (activeTab === 'keterjangkauan') return c.akses.available ? `${c.akses.index} (${c.akses.status})` : '-';
        return c.pemanfaatan.available ? `${c.pemanfaatan.index} (${c.pemanfaatan.status})` : '-';
      }),
      r.waspadaCount,
      r.rentanCount,
    ]);

    const kotaRow = [
      'KOTA CILEGON',
      ...(levelMode === 'kelurahan' ? ['-'] : []),
      ...calendarData.kotaByMonth.map((m) => {
        if (activeTab === 'komposit') return m.komposit.available ? `${m.komposit.skor} (${m.komposit.status})` : '-';
        if (activeTab === 'keterjangkauan') return m.akses.available ? `${m.akses.index} (${m.akses.status})` : '-';
        return m.pemanfaatan.available ? `${m.pemanfaatan.index} (${m.pemanfaatan.status})` : '-';
      }),
      '',
      '',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body, kotaRow]);
    XLSX.utils.book_append_sheet(wb, ws, 'Kalender SKPG');
    XLSX.writeFile(wb, `Kalender_SKPG_${tabLabel}_${levelMode}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#047857] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              Juknis SKPG Tahun 2026 — Bab 4.5 Penyajian
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Kalender SKPG Kota Cilegon (Januari–Desember {selectedYear})
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Instrumen isyarat dini bulanan otomatis berbasis database SKPG untuk memantau dinamika skor Komposit, Keterjangkauan Pangan, dan Pemanfaatan Pangan sepanjang tahun.
            </p>
          </div>

          {/* Kontrol Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl bg-white text-slate-800 text-xs font-black shadow-sm cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl bg-white/15 p-1 border border-white/20">
              <button
                onClick={() => setLevelMode('kecamatan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  levelMode === 'kecamatan' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                Kecamatan (8)
              </button>
              <button
                onClick={() => setLevelMode('kelurahan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  levelMode === 'kelurahan' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                Kelurahan (43)
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Excel
            </button>
          </div>
        </div>
      </div>

      {/* Catatan Resmi Juknis Wilayah Perkotaan */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-900 leading-relaxed">
          <strong>Ketentuan Wilayah Perkotaan (Juknis SKPG 2026, Tabel 7 hal. 27):</strong> Daerah perkotaan seperti Kota Cilegon{' '}
          <strong>tidak menganalisis Aspek Ketersediaan Pangan</strong>. Indeks Komposit SKPG Perkotaan dihitung dari{' '}
          <strong>Indeks Keterjangkauan (IA: 1–3) + Indeks Pemanfaatan (IP: 1–3)</strong> dengan klasifikasi:{' '}
          <span className="font-bold text-rose-700">Skor 2–3 = Rentan (Merah)</span>,{' '}
          <span className="font-bold text-amber-700">Skor 4–5 = Waspada (Kuning)</span>, dan{' '}
          <span className="font-bold text-emerald-700">Skor 6 = Aman (Hijau)</span>.
        </p>
      </div>

      {/* Sub-Menu Tabs sesuai Juknis SKPG 2026 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('komposit')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            activeTab === 'komposit'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Komposit Perkotaan (IA + IP)
        </button>
        <button
          onClick={() => setActiveTab('keterjangkauan')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            activeTab === 'keterjangkauan'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Aspek Keterjangkauan Pangan (IA)
        </button>
        <button
          onClick={() => setActiveTab('pemanfaatan')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            activeTab === 'pemanfaatan'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Utensils className="w-4 h-4" />
          Aspek Pemanfaatan Pangan (IP)
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-14 border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Menyusun Kalender SKPG otomatis dari database Supabase...</p>
        </div>
      ) : (
        <>
          {/* KPI Ringkasan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bulan Terdata ({selectedYear})</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{summaryStats.monthsTracked} / 12</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Periode bulanan otomatis Supabase</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Rata-rata {activeTab === 'komposit' ? 'Skor Komposit' : 'Indeks Aspek'}
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {summaryStats.avgScore}
                <span className="text-xs font-bold text-slate-400">
                  /{activeTab === 'komposit' ? '6' : '3'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Agregat Kota Cilegon</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-sm">
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Frekuensi Status Waspada</div>
              <div className="text-2xl font-black text-amber-700 mt-1">{summaryStats.totalWaspadaCells}</div>
              <div className="text-[11px] text-amber-800/80 mt-0.5">Wilayah-bulan berstatus Waspada</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/40 shadow-sm">
              <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Frekuensi Status Rentan</div>
              <div className="text-2xl font-black text-rose-700 mt-1">{summaryStats.totalRentanCells}</div>
              <div className="text-[11px] text-rose-800/80 mt-0.5">Wilayah-bulan berstatus Rentan</div>
            </div>
          </div>

          {/* 1. MATRIKS KALENDER SKPG (JAN–DES) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wide">
                  Matriks Kalender SKPG {selectedYear} —{' '}
                  {activeTab === 'komposit'
                    ? 'Skor Komposit Perkotaan'
                    : activeTab === 'keterjangkauan'
                    ? 'Indeks Keterjangkauan Pangan'
                    : 'Indeks Pemanfaatan Pangan'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Arahkan kursor pada tiap sel bulan untuk melihat rincian indikator.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 text-white">
                  {activeTab === 'komposit' ? '6: AMAN' : '3: AMAN'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-slate-900">
                  {activeTab === 'komposit' ? '4–5: WASPADA' : '2: WASPADA'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500 text-white">
                  {activeTab === 'komposit' ? '2–3: RENTAN' : '1: RENTAN'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  -: N/A
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-slate-800 text-white font-black uppercase text-[10px] sticky top-0 z-20">
                  <tr>
                    <th className="px-3 py-2.5 text-left sticky left-0 bg-slate-800 z-30 min-w-[140px]">
                      {levelMode === 'kecamatan' ? 'Kecamatan' : 'Kelurahan'}
                    </th>
                    {SKPG_MONTH_SHORT.slice(1).map((m) => (
                      <th key={m} className="px-2 py-2.5 min-w-[46px]">
                        {m}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 bg-slate-700 min-w-[54px]">Wasp.</th>
                    <th className="px-2 py-2.5 bg-slate-700 min-w-[54px]">Rent.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calendarData.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-left font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200 z-10">
                        <div>{r.nama}</div>
                        {levelMode === 'kelurahan' && (
                          <div className="text-[10px] font-medium text-slate-400">Kec. {r.kecamatan}</div>
                        )}
                      </td>
                      {r.cells.map((c) => {
                        const val =
                          activeTab === 'komposit'
                            ? c.komposit.available
                              ? String(c.komposit.skor)
                              : '-'
                            : activeTab === 'keterjangkauan'
                            ? c.akses.available
                              ? String(c.akses.index)
                              : '-'
                            : c.pemanfaatan.available
                            ? String(c.pemanfaatan.index)
                            : '-';
                        const st =
                          activeTab === 'komposit'
                            ? c.komposit.status
                            : activeTab === 'keterjangkauan'
                            ? c.akses.status
                            : c.pemanfaatan.status;

                        const tip =
                          activeTab === 'komposit'
                            ? `${r.nama} (${SKPG_MONTH_NAMES[c.bulan]} ${selectedYear}): Komposit ${val} (${st}) | IA=${c.akses.available ? c.akses.index : '-'}, IP=${c.pemanfaatan.available ? c.pemanfaatan.index : '-'}`
                            : activeTab === 'keterjangkauan'
                            ? `${r.nama} (${SKPG_MONTH_NAMES[c.bulan]} ${selectedYear}): IA=${val} (${st}) | Beras ${c.akses.rBeras}%, Minyak ${c.akses.rMinyak}%, Telur ${c.akses.rTelur}%`
                            : `${r.nama} (${SKPG_MONTH_NAMES[c.bulan]} ${selectedYear}): IP=${val} (${st}) | Underweight ${c.pemanfaatan.prevalensi}% (${c.pemanfaatan.underweightTotal}/${c.giziRec?.tot || 0})`;

                        return (
                          <td key={c.bulan} className="p-1 border-r border-slate-100" title={tip}>
                            <div
                              className={`w-full py-1.5 rounded-md font-black text-[11px] ${cellColorClass(st)}`}
                            >
                              {val}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 font-black text-amber-700 bg-amber-50/40">{r.waspadaCount}</td>
                      <td className="px-2 py-2 font-black text-rose-700 bg-rose-50/40">{r.rentanCount}</td>
                    </tr>
                  ))}

                  {/* Baris Agregat Kota Cilegon */}
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 text-left text-slate-900 sticky left-0 bg-slate-100 border-r border-slate-300 z-10">
                      KOTA CILEGON
                    </td>
                    {calendarData.kotaByMonth.map((m) => {
                      const val =
                        activeTab === 'komposit'
                          ? m.komposit.available
                            ? String(m.komposit.skor)
                            : '-'
                          : activeTab === 'keterjangkauan'
                          ? m.akses.available
                            ? String(m.akses.index)
                            : '-'
                          : m.pemanfaatan.available
                          ? String(m.pemanfaatan.index)
                          : '-';
                      const st =
                        activeTab === 'komposit'
                          ? m.komposit.status
                          : activeTab === 'keterjangkauan'
                          ? m.akses.status
                          : m.pemanfaatan.status;
                      return (
                        <td key={m.bulan} className="p-1 border-r border-slate-200">
                          <div className={`w-full py-1.5 rounded-md font-black text-[11px] ${cellColorClass(st)}`}>
                            {val}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-amber-800">{summaryStats.totalWaspadaCells}</td>
                    <td className="px-2 py-2 text-rose-800">{summaryStats.totalRentanCells}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. GRAFIK TREN BULANAN JAN–DES SESUAI SUB-MENU JUKNIS */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wide">
                {activeTab === 'komposit'
                  ? `Grafik Distribusi Status Komposit Bulanan (${selectedYear})`
                  : activeTab === 'keterjangkauan'
                  ? `Grafik Tren Harga Konsumen & Perubahan YoY Bulanan (${selectedYear})`
                  : `Grafik Tren Prevalensi Balita Underweight (BB/U) Bulanan (${selectedYear})`}
              </h2>
            </div>

            {activeTab === 'komposit' && (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 15, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Bar dataKey="Aman" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Waspada" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Rentan" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'keterjangkauan' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="h-[290px] border border-slate-100 rounded-2xl p-3">
                  <div className="text-[11px] font-black text-slate-600 uppercase mb-2">
                    Tren Harga Rata-rata Kota (Rp/kg atau Rp/L)
                  </div>
                  <ResponsiveContainer width="100%" height="88%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}rb`} />
                      <Tooltip formatter={(v: unknown) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      <Line type="monotone" dataKey="beras" name="Beras Medium" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="minyak" name="Minyak Kemasan" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="telur" name="Telur Ayam Ras" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[290px] border border-slate-100 rounded-2xl p-3">
                  <div className="text-[11px] font-black text-slate-600 uppercase mb-2">
                    Persentase Perubahan Harga YoY (%) — Acuan Cut-Off Juknis
                  </div>
                  <ResponsiveContainer width="100%" height="88%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: unknown) => `${v}%`} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      <Line type="monotone" dataKey="rBeras" name="YoY Beras (%)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="rMinyak" name="YoY Minyak (%)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="rTelur" name="YoY Telur (%)" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'pemanfaatan' && (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 15, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}rb`} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Bar yAxisId="right" dataKey="totalBalita" name="Total Balita Ditimbang" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="prevalensi" name="Prevalensi Underweight (%)" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 3. INTERPRETASI OTOMATIS & REKOMENDASI KALENDER SKPG (Tabel 12 & 13 Juknis) */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              {summaryStats.totalRentanCells > 0 ? (
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              ) : summaryStats.totalWaspadaCells > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
              <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wide">
                Interpretasi Otomatis &amp; Rekomendasi Tindak Lanjut Kalender SKPG ({selectedYear})
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                  Ringkasan Dinamika Tahunan
                </div>
                <p>
                  Sepanjang tahun <strong className="text-slate-900">{selectedYear}</strong>, terdapat{' '}
                  <strong className="text-slate-900">{summaryStats.monthsTracked} bulan</strong> terdata pada sub-menu{' '}
                  <strong className="text-slate-900">
                    {activeTab === 'komposit'
                      ? 'Komposit Perkotaan'
                      : activeTab === 'keterjangkauan'
                      ? 'Keterjangkauan Pangan'
                      : 'Pemanfaatan Pangan'}
                  </strong>{' '}
                  di tingkat <strong className="text-slate-900">{levelMode === 'kecamatan' ? '8 Kecamatan' : '43 Kelurahan'}</strong> dengan rata-rata skor Kota Cilegon sebesar{' '}
                  <strong className="text-emerald-800">
                    {summaryStats.avgScore}/{activeTab === 'komposit' ? '6' : '3'}
                  </strong>.
                </p>
                {summaryStats.criticalMonths.length > 0 ? (
                  <p>
                    Bulan dengan tekanan kewaspadaan tertinggi tercatat pada{' '}
                    <strong className="text-slate-900">
                      {summaryStats.criticalMonths
                        .map((m) => `${m.bulanFull} (${m.rentan} Rentan, ${m.waspada} Waspada)`)
                        .join('; ')}
                    </strong>.
                  </p>
                ) : (
                  <p>
                    Tidak ditemukan wilayah berstatus Waspada atau Rentan pada bulan-bulan yang telah terdata di tahun {selectedYear}.
                  </p>
                )}
                {summaryStats.topWatchUnits.length > 0 && (
                  <p>
                    Wilayah yang paling sering muncul dalam status Waspada/Rentan:{' '}
                    <strong className="text-slate-900">
                      {summaryStats.topWatchUnits
                        .map((u) => `${u.nama} (${u.rentanCount}R/${u.waspadaCount}W)`)
                        .join(', ')}
                    </strong>.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="font-black text-emerald-900 uppercase text-[11px] tracking-wider">
                  Rekomendasi Perencanaan &amp; Intervensi (Tabel 12 &amp; 13 Juknis)
                </div>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong>Pengendalian Harga &amp; Akses Pangan:</strong>{' '}
                    {summaryStats.minyakAlertMonths + summaryStats.berasAlertMonths + summaryStats.telurAlertMonths > 0 ? (
                      <>
                        Tekanan kenaikan harga YoY terdeteksi pada Minyak Goreng Kemasan ({summaryStats.minyakAlertMonths} bln), Beras Medium ({summaryStats.berasAlertMonths} bln), dan Telur Ayam Ras ({summaryStats.telurAlertMonths} bln). Jadwalkan Gerakan Pangan Murah (GPM) dan operasi pasar menjelang bulan-bulan puncak tersebut.
                      </>
                    ) : (
                      <>
                        Harga 3 komoditas acuan SKPG relatif terkendali sepanjang periode terdata; lanjutkan pemantauan harian SAGON di Pasar Kranggot, Blok F, dan Merak.
                      </>
                    )}
                  </li>
                  <li>
                    <strong>Penguatan Gizi Balita (Pemanfaatan):</strong> Pertahankan pola konsumsi B2SA, penimbangan rutin bulanan BB/U di Posyandu bersama Dinas Kesehatan, serta siapkan PMT pemulihan lokal khusus wilayah dengan tren underweight di atas 10%.
                  </li>
                  <li>
                    <strong>Perencanaan Anggaran &amp; Sinergi Data Dukung:</strong> Gunakan pola bulan rawan pada Kalender SKPG ini sebagai dasar penjadwalan anggaran GPM/CPPD tahun berikutnya serta koordinasi peringatan dini iklim dengan BMKG dan kebencanaan dengan BPBD.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
