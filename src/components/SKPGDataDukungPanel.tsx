"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  UploadCloud,
  Download,
  RefreshCw,
  ShieldAlert,
  CheckCircle,
  Info,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  SKPG_KECAMATANS,
  SKPG_MONTH_NAMES,
  classifyKebencanaan,
} from '@/lib/skpg/scoring';
import { WILAYAH } from '@/lib/wilayah';
import type { KecamatanWeatherSummary } from '@/app/api/skpg/cuaca/route';
import type { KebencanaanRow } from '@/app/api/skpg/kebencanaan/route';

interface SKPGDataDukungPanelProps {
  level: 'kecamatan' | 'kelurahan';
  tahun: number;
  bulan: number;
  kompositSummary: {
    statusKota: string;
    skorKota: number | string;
    statusAkses: string;
    statusGizi: string;
    wilayahPrioritas: string[];
  };
}

// Mapping standar nama Kecamatan (SKPG pakai 'Pulomerak', wilayah.ts pakai 'Pulo Merak')
function getKelurahansBySkpgKec(kec: string): string[] {
  if (kec === 'Pulomerak') return WILAYAH['Pulo Merak'] || [];
  return WILAYAH[kec] || [];
}

function iklimBadgeClass(status: string) {
  if (status === 'AWAS') return 'bg-rose-100 text-rose-800 border-rose-300';
  if (status === 'SIAGA') return 'bg-orange-100 text-orange-800 border-orange-300';
  if (status === 'WASPADA') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300';
}

export default function SKPGDataDukungPanel({
  level,
  tahun,
  bulan,
  kompositSummary,
}: SKPGDataDukungPanelProps) {
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherList, setWeatherList] = useState<KecamatanWeatherSummary[]>([]);
  const [kotaWeather, setKotaWeather] = useState<{
    statusIklim: string;
    potensiIklim: string;
    avgSuhuC: number;
    avgKelembapan: number;
    avgEstCurahHujanMm: number;
    maxAnginKmh: number;
    liveCount: number;
    updatedAt: string;
  } | null>(null);
  const [selectedKecFilter, setSelectedKecFilter] = useState<string>('ALL');

  // State Kebencanaan (Opsional)
  const [bencanaRows, setBencanaRows] = useState<KebencanaanRow[]>([]);
  const [bencanaLoading, setBencanaLoading] = useState(false);
  const [bencanaUploadMsg, setBencanaUploadMsg] = useState<string | null>(null);
  const [bencanaUploadErr, setBencanaUploadErr] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local_only'>('local_only');

  const localStorageKey = `skpg_kebencanaan_${tahun}_${bulan}`;

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch('/api/skpg/cuaca');
      const json = await res.json();
      if (json?.success) {
        setWeatherList(json.kecamatanList || []);
        setKotaWeather(json.kotaSummary || null);
      }
    } catch (err) {
      console.error('[SKPGDataDukung] Gagal memuat cuaca BMKG:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  useEffect(() => {
    if (!tahun || !bulan) return;
    const loadKebencanaan = async () => {
      setBencanaLoading(true);
      try {
        const res = await fetch(`/api/skpg/kebencanaan?tahun=${tahun}&bulan=${bulan}`);
        const json = await res.json();
        if (json?.success && Array.isArray(json.rows) && json.rows.length > 0) {
          setBencanaRows(json.rows);
          setStorageMode(json.storageMode === 'supabase' ? 'supabase' : 'local_only');
          return;
        }
        setStorageMode(json?.storageMode === 'supabase' ? 'supabase' : 'local_only');
      } catch {
        // fallback ke localStorage
      } finally {
        setBencanaLoading(false);
      }

      // Cek fallback localStorage browser
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(localStorageKey) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setBencanaRows(parsed);
            return;
          }
        }
      } catch {
        // ignore parse error
      }
      setBencanaRows([]);
    };

    loadKebencanaan();
  }, [tahun, bulan, localStorageKey]);

  const handleDownloadTemplateBencana = () => {
    const headers = [
      'Tahun',
      'Bulan',
      'Kecamatan',
      'Kelurahan',
      'Banjir',
      'Cuaca Ekstrem',
      'Tanah Longsor',
      'Gelombang Pasang/Abrasi',
      'Kekeringan',
      'Gempa Bumi',
      'Tsunami',
      'Erupsi Gunung Api',
      'Karhutla',
      'Keterangan',
    ];
    const sampleRows =
      level === 'kecamatan'
        ? SKPG_KECAMATANS.map((kec) => [
            tahun || 2026,
            bulan || 3,
            kec,
            '',
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            'Isi jumlah kejadian bencana (0 jika nihil)',
          ])
        : SKPG_KECAMATANS.flatMap((kec) =>
            getKelurahansBySkpgKec(kec).map((kel) => [
              tahun || 2026,
              bulan || 3,
              kec,
              kel,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              '',
            ])
          );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Kebencanaan SKPG');
    XLSX.writeFile(
      wb,
      `template_kebencanaan_skpg_${level}_${tahun || 2026}_${String(bulan || 1).padStart(2, '0')}.xlsx`
    );
  };

  const handleUploadBencana = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBencanaUploadErr(null);
    setBencanaUploadMsg(null);
    setBencanaLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tahun', String(tahun || new Date().getFullYear()));
      formData.append('bulan', String(bulan || new Date().getMonth() + 1));

      const res = await fetch('/api/skpg/kebencanaan', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Gagal memproses file Excel kebencanaan.');
      }

      const uploadedRows: KebencanaanRow[] = json.rows || [];
      setBencanaRows(uploadedRows);
      setStorageMode(json.persistedToSupabase ? 'supabase' : 'local_only');
      setBencanaUploadMsg(json.message || 'Data kebencanaan berhasil diterapkan.');

      if (typeof window !== 'undefined') {
        localStorage.setItem(localStorageKey, JSON.stringify(uploadedRows));
      }
    } catch (err: unknown) {
      setBencanaUploadErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBencanaLoading(false);
      e.target.value = '';
    }
  };

  const handleClearLocalBencana = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(localStorageKey);
    }
    setBencanaRows([]);
    setBencanaUploadMsg('Data kebencanaan lokal pada periode ini telah dikosongkan.');
  };

  // Agregasi kebencanaan sesuai level (kecamatan atau kelurahan)
  const aggregatedBencana = useMemo(() => {
    if (bencanaRows.length === 0) return [];
    if (level === 'kecamatan') {
      const byKec: Record<string, KebencanaanRow> = {};
      for (const r of bencanaRows) {
        if (!byKec[r.kecamatan]) {
          byKec[r.kecamatan] = { ...r, kelurahan: '' };
        } else {
          const t = byKec[r.kecamatan];
          t.banjir += r.banjir;
          t.cuaca_ekstrem += r.cuaca_ekstrem;
          t.tanah_longsor += r.tanah_longsor;
          t.gelombang_pasang_abrasi += r.gelombang_pasang_abrasi;
          t.kekeringan += r.kekeringan;
          t.gempa_bumi += r.gempa_bumi;
          t.tsunami += r.tsunami;
          t.erupsi_gunung_api += r.erupsi_gunung_api;
          t.karhutla += r.karhutla;
          t.total_kejadian += r.total_kejadian;
          t.level_bencana = classifyKebencanaan(t.total_kejadian).level;
          if (r.keterangan && !t.keterangan.includes(r.keterangan)) {
            t.keterangan = t.keterangan ? `${t.keterangan}; ${r.keterangan}` : r.keterangan;
          }
        }
      }
      return Object.values(byKec).sort((a, b) => b.total_kejadian - a.total_kejadian);
    }
    return [...bencanaRows].sort((a, b) => b.total_kejadian - a.total_kejadian);
  }, [bencanaRows, level]);

  const totalKejadianKota = useMemo(
    () => aggregatedBencana.reduce((s, r) => s + r.total_kejadian, 0),
    [aggregatedBencana]
  );
  const kotaBencanaClass = classifyKebencanaan(totalKejadianKota);

  // Jenis bencana dominan
  const dominanBencana = useMemo(() => {
    const totals: Record<string, number> = {
      Banjir: 0,
      'Cuaca Ekstrem': 0,
      'Tanah Longsor': 0,
      'Gelombang Pasang/Abrasi': 0,
      Kekeringan: 0,
      'Gempa Bumi': 0,
      Tsunami: 0,
      'Erupsi Gunung Api': 0,
      Karhutla: 0,
    };
    aggregatedBencana.forEach((r) => {
      totals['Banjir'] += r.banjir;
      totals['Cuaca Ekstrem'] += r.cuaca_ekstrem;
      totals['Tanah Longsor'] += r.tanah_longsor;
      totals['Gelombang Pasang/Abrasi'] += r.gelombang_pasang_abrasi;
      totals['Kekeringan'] += r.kekeringan;
      totals['Gempa Bumi'] += r.gempa_bumi;
      totals['Tsunami'] += r.tsunami;
      totals['Erupsi Gunung Api'] += r.erupsi_gunung_api;
      totals['Karhutla'] += r.karhutla;
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [aggregatedBencana]);

  // Daftar cuaca kelurahan mengacu ke kecamatan induknya
  const kelurahanWeatherRows = useMemo(() => {
    const mapByKec: Record<string, KecamatanWeatherSummary> = {};
    weatherList.forEach((w) => {
      mapByKec[w.kecamatan] = w;
    });
    const rows: Array<{
      kelurahan: string;
      kecamatan: string;
      weather: KecamatanWeatherSummary | undefined;
    }> = [];
    SKPG_KECAMATANS.forEach((kec) => {
      if (selectedKecFilter !== 'ALL' && selectedKecFilter !== kec) return;
      getKelurahansBySkpgKec(kec).forEach((kel) => {
        rows.push({ kelurahan: kel, kecamatan: kec, weather: mapByKec[kec] });
      });
    });
    return rows;
  }, [weatherList, selectedKecFilter]);

  // Kecamatan dengan status iklim Waspada/Siaga/Awas
  const kecIklimAlert = weatherList.filter((w) => w.statusIklim !== 'AMAN');
  const wilayahTerdampakBencana = aggregatedBencana.filter((r) => r.total_kejadian > 0);
  const periodLabel = `${SKPG_MONTH_NAMES[bulan] || ''} ${tahun || ''}`.trim();

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
            <CloudRain className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-wide leading-snug">
              V. Data Dukung Iklim (BMKG), Kebencanaan &amp; Analisis Kualitatif SKPG
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Mengacu pada Juknis SKPG Tahun 2026 (Tabel 2 &amp; Bab 4.3 Poin 5–6) — Tingkat{' '}
              {level === 'kecamatan' ? 'Kecamatan (8 Wilayah)' : 'Kelurahan (43 Wilayah, mengacu cuaca Kecamatan induk)'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchWeather}
          disabled={weatherLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
          Segarkan Cuaca BMKG
        </button>
      </div>

      {/* BAGIAN A: DATA DUKUNG SITUASI IKLIM (BMKG) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-600" />
              A. Data Dukung Situasi Iklim &amp; Cuaca (API Resmi BMKG)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Prakiraan 3 hari per Kecamatan di Kota Cilegon (diekstrapolasi ke estimasi curah hujan bulanan untuk deteksi potensi basah/kering).
            </p>
          </div>
          {kotaWeather && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${iklimBadgeClass(
                  kotaWeather.statusIklim
                )}`}
              >
                IKLIM KOTA: {kotaWeather.statusIklim} ({kotaWeather.potensiIklim})
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Sumber: {kotaWeather.liveCount > 0 ? `BMKG Live (${kotaWeather.liveCount}/8 Kec)` : 'Fallback cuaca_ml'}
              </span>
            </div>
          )}
        </div>

        {/* KPI Ringkas Cuaca Kota */}
        {kotaWeather && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-700 uppercase">
                <Thermometer className="w-3.5 h-3.5" /> Rata-rata Suhu
              </div>
              <div className="text-lg font-black text-slate-800 mt-1">{kotaWeather.avgSuhuC}°C</div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase">
                <Droplets className="w-3.5 h-3.5" /> Kelembapan
              </div>
              <div className="text-lg font-black text-slate-800 mt-1">{kotaWeather.avgKelembapan}%</div>
            </div>
            <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-700 uppercase">
                <CloudRain className="w-3.5 h-3.5" /> Est. CH Bulanan
              </div>
              <div className="text-lg font-black text-slate-800 mt-1">{kotaWeather.avgEstCurahHujanMm} mm</div>
            </div>
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 uppercase">
                <Wind className="w-3.5 h-3.5" /> Angin Maks
              </div>
              <div className="text-lg font-black text-slate-800 mt-1">{kotaWeather.maxAnginKmh} km/j</div>
            </div>
          </div>
        )}

        {/* Tabel Cuaca: 8 Kecamatan atau 43 Kelurahan */}
        {level === 'kecamatan' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Kecamatan</th>
                  <th className="px-3 py-2.5">Cuaca Dominan</th>
                  <th className="px-3 py-2.5 text-center">Suhu (Avg/Maks)</th>
                  <th className="px-3 py-2.5 text-center">Kelembapan</th>
                  <th className="px-3 py-2.5 text-center">Est. CH (mm/bln)</th>
                  <th className="px-3 py-2.5 text-center">Angin Maks</th>
                  <th className="px-3 py-2.5 text-center">Status Iklim SKPG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weatherList.map((w) => (
                  <tr key={w.kecamatan} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {w.kecamatan}
                      <span className="block text-[10px] font-normal text-slate-400">Ref: {w.refKelurahan}</span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{w.cuacaDominan}</td>
                    <td className="px-3 py-2 text-center font-medium text-slate-700">
                      {w.suhuAvgC}°C / {w.suhuMaxC}°C
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-slate-700">{w.kelembapanAvg}%</td>
                    <td className="px-3 py-2 text-center font-bold text-sky-700">{w.estCurahHujanMm} mm</td>
                    <td className="px-3 py-2 text-center font-medium text-slate-700">{w.anginMaxKmh} km/j</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${iklimBadgeClass(
                          w.statusIklim
                        )}`}
                      >
                        {w.statusIklim} ({w.potensiIklim})
                      </span>
                    </td>
                  </tr>
                ))}
                {weatherList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                      {weatherLoading ? 'Memuat prakiraan cuaca BMKG untuk 8 kecamatan...' : 'Data cuaca belum tersedia.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Data cuaca tiap kelurahan mengacu otomatis pada data prakiraan BMKG Kecamatan induknya.
              </span>
              <select
                value={selectedKecFilter}
                onChange={(e) => setSelectedKecFilter(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">Semua Kecamatan (43 Kelurahan)</option>
                {SKPG_KECAMATANS.map((k) => (
                  <option key={k} value={k}>
                    Kecamatan {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2">Kelurahan</th>
                    <th className="px-3 py-2">Kecamatan Induk</th>
                    <th className="px-3 py-2">Cuaca Dominan</th>
                    <th className="px-3 py-2 text-center">Suhu</th>
                    <th className="px-3 py-2 text-center">Est. CH</th>
                    <th className="px-3 py-2 text-center">Status Iklim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kelurahanWeatherRows.map((row) => (
                    <tr key={`${row.kecamatan}-${row.kelurahan}`} className="hover:bg-slate-50/80">
                      <td className="px-3 py-1.5 font-bold text-slate-800">{row.kelurahan}</td>
                      <td className="px-3 py-1.5 text-slate-600">{row.kecamatan}</td>
                      <td className="px-3 py-1.5 text-slate-700">{row.weather?.cuacaDominan || '-'}</td>
                      <td className="px-3 py-1.5 text-center text-slate-700">
                        {row.weather ? `${row.weather.suhuAvgC}°C` : '-'}
                      </td>
                      <td className="px-3 py-1.5 text-center font-semibold text-sky-700">
                        {row.weather ? `${row.weather.estCurahHujanMm} mm` : '-'}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {row.weather ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${iklimBadgeClass(
                              row.weather.statusIklim
                            )}`}
                          >
                            {row.weather.statusIklim}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* BAGIAN B: DATA DUKUNG SITUASI KEBENCANAAN (OPSIONAL) */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                B. Data Dukung Situasi Kebencanaan (BPBD / BNPB)
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Opsional
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unggah data Excel (.xlsx) kejadian 9 jenis bencana utama tingkat Kecamatan &amp; Kelurahan (opsional) sebagai penguat analisis kualitatif SKPG.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplateBencana}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template (.xlsx)
            </button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Kebencanaan (.xlsx) — Opsional
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUploadBencana}
                className="hidden"
              />
            </label>
            {bencanaRows.length > 0 && storageMode === 'local_only' && (
              <button
                onClick={handleClearLocalBencana}
                title="Hapus data kebencanaan lokal periode ini"
                className="inline-flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {bencanaUploadMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{bencanaUploadMsg}</span>
          </div>
        )}
        {bencanaUploadErr && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{bencanaUploadErr}</span>
          </div>
        )}

        {bencanaLoading ? (
          <div className="p-4 text-center text-xs text-slate-500">Memuat data kebencanaan...</div>
        ) : aggregatedBencana.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-700">
                Total Kejadian Bencana ({periodLabel}):{' '}
                <span className="text-slate-900 font-black">{totalKejadianKota} kejadian</span>
              </div>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${kotaBencanaClass.badgeClass}`}
              >
                STATUS KEBENCANAAN: {kotaBencanaClass.level} — {kotaBencanaClass.label}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[260px] overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">{level === 'kecamatan' ? 'Kecamatan' : 'Kelurahan (Kecamatan)'}</th>
                    <th className="px-2 py-2 text-center">Banjir</th>
                    <th className="px-2 py-2 text-center">Cuaca Ekstrem</th>
                    <th className="px-2 py-2 text-center">Longsor</th>
                    <th className="px-2 py-2 text-center">Kekeringan</th>
                    <th className="px-2 py-2 text-center">Lainnya</th>
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center">Kategori Juknis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedBencana.map((r, idx) => {
                    const cls = classifyKebencanaan(r.total_kejadian);
                    const lainnya =
                      r.gelombang_pasang_abrasi +
                      r.gempa_bumi +
                      r.tsunami +
                      r.erupsi_gunung_api +
                      r.karhutla;
                    return (
                      <tr key={`${r.kecamatan}-${r.kelurahan}-${idx}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {level === 'kecamatan'
                            ? r.kecamatan
                            : r.kelurahan
                            ? `${r.kelurahan} (${r.kecamatan})`
                            : `${r.kecamatan} (Agregat)`}
                        </td>
                        <td className="px-2 py-2 text-center">{r.banjir}</td>
                        <td className="px-2 py-2 text-center">{r.cuaca_ekstrem}</td>
                        <td className="px-2 py-2 text-center">{r.tanah_longsor}</td>
                        <td className="px-2 py-2 text-center">{r.kekeringan}</td>
                        <td className="px-2 py-2 text-center">{lainnya}</td>
                        <td className="px-3 py-2 text-center font-black text-slate-900">{r.total_kejadian}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${cls.badgeClass}`}>
                            {cls.level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Belum ada data kebencanaan diunggah untuk periode {periodLabel} (Opsional).</span>{' '}
              Sesuai Juknis SKPG 2026 Tabel 2, kondisi tanpa laporan kejadian bencana diklasifikasikan sebagai{' '}
              <strong className="text-slate-800">PUTIH (Nihil / 0 kejadian)</strong>. Anda dapat mengunggah file Excel (.xlsx) kebencanaan BPBD kapan saja untuk memperkaya analisis kualitatif di bawah ini.
            </div>
          </div>
        )}
      </div>

      {/* BAGIAN C: ANALISIS & INTERPRETASI KUALITATIF TERPADU SKPG */}
      <div className="pt-4 border-t border-slate-100">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-sky-50/80 border border-emerald-200/80 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-emerald-900 uppercase tracking-wider">
              C. Interpretasi Kualitatif Terpadu SKPG (Komposit + Iklim BMKG + Kebencanaan)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
            <p>
              <strong className="text-slate-900">1. Sinergi Indeks Komposit &amp; Kondisi Iklim ({periodLabel}):</strong>{' '}
              Status Komposit SKPG Perkotaan Kota Cilegon berada pada kategori{' '}
              <strong className="text-slate-900">{kompositSummary.statusKota}</strong> (Skor{' '}
              {kompositSummary.skorKota}/6; Keterjangkauan {kompositSummary.statusAkses}, Pemanfaatan{' '}
              {kompositSummary.statusGizi}). Berdasarkan pemantauan prakiraan cuaca resmi BMKG pada 8 kecamatan, situasi iklim indikatif berada pada level{' '}
              <strong className="text-slate-900">
                {kotaWeather ? `${kotaWeather.statusIklim} (${kotaWeather.potensiIklim})` : 'AMAN (NORMAL)'}
              </strong>{' '}
              dengan rata-rata suhu {kotaWeather?.avgSuhuC ?? '-'}°C, kelembapan {kotaWeather?.avgKelembapan ?? '-'}%, dan estimasi curah hujan bulanan {kotaWeather?.avgEstCurahHujanMm ?? '-'} mm.
              {kecIklimAlert.length > 0 ? (
                <>
                  {' '}Perlu perhatian ekstra pada Kecamatan{' '}
                  <strong className="text-slate-900">
                    {kecIklimAlert.map((w) => `${w.kecamatan} (${w.statusIklim})`).join(', ')}
                  </strong>{' '}
                  karena potensi gangguan distribusi pangan ke pasar rakyat serta risiko peningkatan penyakit berbasis lingkungan pada balita.
                </>
              ) : (
                <>
                  {' '}Seluruh 8 kecamatan berada pada kondisi cuaca kondusif sehingga arus distribusi logistik pangan menuju Pasar Kranggot, Pasar Blok F, dan Pasar Baru Merak tidak mengalami hambatan meteorologis berarti.
                </>
              )}
            </p>

            <p>
              <strong className="text-slate-900">2. Evaluasi Risiko Kebencanaan BPBD/BNPB:</strong>{' '}
              {totalKejadianKota > 0 ? (
                <>
                  Tercatat <strong className="text-slate-900">{totalKejadianKota} kejadian bencana</strong> (Status Juknis:{' '}
                  <strong className="text-slate-900">{kotaBencanaClass.level}</strong>) dengan jenis dominan{' '}
                  <strong className="text-slate-900">
                    {dominanBencana
                      .slice(0, 3)
                      .map(([k, v]) => `${k} (${v})`)
                      .join(', ')}
                  </strong>
                  . Wilayah terdampak utama meliputi{' '}
                  <strong className="text-slate-900">
                    {wilayahTerdampakBencana
                      .slice(0, 5)
                      .map((r) => (r.kelurahan ? `${r.kelurahan} (${r.total_kejadian})` : `${r.kecamatan} (${r.total_kejadian})`))
                      .join(', ')}
                  </strong>
                  . Perlu kesiapsiagaan Cadangan Pangan Pemerintah Daerah (CPPD) untuk penyaluran bantuan pangan darurat bila terjadi disrupsi akses pangan rumah tangga terdampak.
                </>
              ) : (
                <>
                  Tidak terdapat laporan kejadian bencana yang tercatat pada periode {periodLabel} (Status Juknis:{' '}
                  <strong className="text-slate-900">PUTIH / Nihil</strong>). Meskipun demikian, tim SKPG daerah tetap perlu berkoordinasi rutin dengan BPBD Kota Cilegon untuk memantau titik rawan genangan dan cuaca ekstrem.
                </>
              )}
            </p>

            <p>
              <strong className="text-slate-900">3. Rekomendasi Tindak Lanjut Kualitatif Lintas-OPD:</strong>{' '}
              {kompositSummary.wilayahPrioritas.length > 0 ? (
                <>
                  Prioritaskan pemantauan terpadu di{' '}
                  <strong className="text-slate-900">
                    {kompositSummary.wilayahPrioritas.slice(0, 6).join(', ')}
                  </strong>{' '}
                  melalui sinergi DKPP (stabilisasi pasokan/GPM &amp; CPPD), Dinas Kesehatan (surveilans penimbangan balita BB/U &amp; PMT lokal), BMKG (pemantauan peringatan dini cuaca ekstrem), serta BPBD (mitigasi risiko logistik saat kejadian bencana).
                </>
              ) : (
                <>
                  Pertahankan stabilitas harga 3 komoditas pokok (beras medium, minyak goreng kemasan, telur ayam ras) dan capaian gizi balita B2SA melalui koordinasi berkala Tim SKPG Kota Cilegon bersama BMKG dan BPBD.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
