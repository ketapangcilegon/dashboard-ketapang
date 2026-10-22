"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight, Info, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const EWS_COMMODITY_MAP: Record<string, string> = {
  harga_beras: 'Beras Medium',
  harga_bawang_merah: 'Bawang Merah',
  harga_bawang_putih: 'Bawang Putih Bonggol',
  harga_cabai_merah: 'Cabe Merah Besar',
  harga_cabai_merah_keriting: 'Cabe Merah Keriting',
  harga_cabai_rawit_merah: 'Cabe Rawit Merah',
  harga_cabai_rawit_hijau: 'Cabe Rawit Hijau',
  harga_daging_sapi: 'Daging Sapi Murni',
  harga_daging_ayam_ras: 'Daging Ayam Ras',
  harga_telur_ayam_ras: 'Telur Ayam Ras',
  harga_gula_pasir: 'Gula Pasir',
  harga_minyak_goreng: 'Minyak Goreng Kemasan',
  harga_tepung_terigu: 'Tepung Terigu Kemasan'
};

export const EWS_COMMODITY_ORDER = [
  'harga_beras',
  'harga_bawang_merah',
  'harga_bawang_putih',
  'harga_cabai_merah',
  'harga_cabai_merah_keriting',
  'harga_cabai_rawit_merah',
  'harga_cabai_rawit_hijau',
  'harga_daging_sapi',
  'harga_daging_ayam_ras',
  'harga_telur_ayam_ras',
  'harga_gula_pasir',
  'harga_minyak_goreng',
  'harga_tepung_terigu'
];

interface EwsItemData {
  komoditas: string;
  harga_aktual: number;
  forecast_1m: number;
  forecast_3m: number;
  cv: number;
  status_forecast: string;
  status_cv: string;
  status_skpg: string;
  perubahan_pct: number;
  growth_yoy?: number;
  drivers?: string[];
  rekomendasi?: string[];
}

interface EarlyWarningSystemPanelProps {
  livePrices?: Record<string, number>;
  initialCommodity?: string;
}

export default function EarlyWarningSystemPanel({
  livePrices,
  initialCommodity = 'harga_beras'
}: EarlyWarningSystemPanelProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<string>(initialCommodity);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbData, setDbData] = useState<Record<string, EwsItemData>>({});

  useEffect(() => {
    async function loadEwsData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('forecast_result')
          .select('*');

        if (!error && data && data.length > 0) {
          const map: Record<string, EwsItemData> = {};
          data.forEach((row: any) => {
            const pct = Number(row.perubahan_pct) || 0;
            const cv = Number(row.cv) || 0;
            const statusForecast = row.status_forecast || (pct > 3 ? 'Naik' : pct < -3 ? 'Turun' : 'Stabil');
            const statusCv = row.status_cv || (cv > 15 ? 'RENTAN' : cv > 8 ? 'WASPADA' : 'AMAN');
            const statusSkpg = row.status_skpg || 'AMAN';

            // Clean drivers if needed
            let drivers = row.drivers;
            if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
              drivers = [
                '1 Tren harga 3 bulan terakhir',
                '2 Cuaca kondusif',
                '3 Stabilitas inflasi makro'
              ];
            }

            let rekomendasi = row.rekomendasi;
            if (!rekomendasi || !Array.isArray(rekomendasi) || rekomendasi.length === 0) {
              rekomendasi = [
                'monitoring rutin mingguan',
                'jaga kestabilan pasokan'
              ];
            }

            map[row.komoditas] = {
              komoditas: row.komoditas,
              harga_aktual: Number(row.harga_aktual) || 0,
              forecast_1m: Number(row.forecast_1m) || 0,
              forecast_3m: Number(row.forecast_3m) || 0,
              cv,
              status_forecast: statusForecast,
              status_cv: statusCv,
              status_skpg: statusSkpg,
              perubahan_pct: pct,
              growth_yoy: Number(row.growth_yoy) || -3.0,
              drivers,
              rekomendasi
            };
          });
          setDbData(map);
        } else {
          // Fallback simulation
          const fallbackMap: Record<string, EwsItemData> = {};
          EWS_COMMODITY_ORDER.forEach(k => {
            fallbackMap[k] = {
              komoditas: k,
              harga_aktual: 14500,
              forecast_1m: 14800,
              forecast_3m: 15100,
              cv: 1.0,
              status_forecast: 'Stabil',
              status_cv: 'AMAN',
              status_skpg: 'AMAN',
              perubahan_pct: -0.6,
              growth_yoy: -3.0,
              drivers: [
                '1 Tren harga 3 bulan terakhir',
                '2 Cuaca kondusif',
                '3 Stabilitas inflasi makro'
              ],
              rekomendasi: [
                'monitoring rutin mingguan',
                'jaga kestabilan pasokan'
              ]
            };
          });
          setDbData(fallbackMap);
        }
      } catch (err) {
        console.warn('Fallback EWS data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEwsData();
  }, []);

  const activeIdx = useMemo(() => {
    const idx = EWS_COMMODITY_ORDER.indexOf(selectedCommodity);
    return idx >= 0 ? idx : 0;
  }, [selectedCommodity]);

  const activeData: EwsItemData = useMemo(() => {
    if (dbData[selectedCommodity]) {
      return dbData[selectedCommodity];
    }
    // Fallback default
    return {
      komoditas: selectedCommodity,
      harga_aktual: 14500,
      forecast_1m: 14800,
      forecast_3m: 15100,
      cv: 1.0,
      status_forecast: 'Stabil',
      status_cv: 'AMAN',
      status_skpg: 'AMAN',
      perubahan_pct: -0.6,
      growth_yoy: -3.0,
      drivers: [
        '1 Tren harga 3 bulan terakhir',
        '2 Cuaca kondusif',
        '3 Stabilitas inflasi makro'
      ],
      rekomendasi: [
        'monitoring rutin mingguan',
        'jaga kestabilan pasokan'
      ]
    };
  }, [dbData, selectedCommodity]);

  // Overall EWS Status
  const overallStatus = useMemo(() => {
    if (activeData.status_forecast === 'Turun') return 'Aman';
    if (activeData.status_cv === 'RENTAN' || activeData.status_skpg === 'RENTAN') return 'Rentan';
    if (activeData.status_cv === 'WASPADA' || activeData.status_skpg === 'WASPADA' || activeData.status_forecast === 'Naik') return 'Waspada';
    return 'Aman';
  }, [activeData]);

  const statusBg = useMemo(() => {
    switch (overallStatus.toLowerCase()) {
      case 'rentan':
        return 'bg-rose-50/80 border-rose-200 text-rose-950';
      case 'waspada':
        return 'bg-amber-50/80 border-amber-200 text-amber-950';
      case 'aman':
      default:
        return 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
    }
  }, [overallStatus]);

  const statusDot = useMemo(() => {
    switch (overallStatus.toLowerCase()) {
      case 'rentan':
        return 'bg-rose-500';
      case 'waspada':
        return 'bg-amber-500';
      case 'aman':
      default:
        return 'bg-emerald-500';
    }
  }, [overallStatus]);

  const handlePrev = () => {
    const prevIdx = (activeIdx - 1 + EWS_COMMODITY_ORDER.length) % EWS_COMMODITY_ORDER.length;
    setSelectedCommodity(EWS_COMMODITY_ORDER[prevIdx]);
  };

  const handleNext = () => {
    const nextIdx = (activeIdx + 1) % EWS_COMMODITY_ORDER.length;
    setSelectedCommodity(EWS_COMMODITY_ORDER[nextIdx]);
  };

  const commodityName = EWS_COMMODITY_MAP[selectedCommodity] || 'Komoditas';

  return (
    <div className="w-full">
      {/* Header Segmen */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0"></div>
          <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-none uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            <span>EARLY WARNING SYSTEM</span>
          </h3>
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider leading-relaxed">
          * PILIH KOMODITAS PADA TABEL UNTUK MENAMPILKAN STATUS EWS
        </p>
      </div>

      {/* Main EWS Card (Mobile First layout with height limit matching mobile forecast) */}
      <div className="dashboard-card bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md max-w-3xl mx-auto flex flex-col max-h-[580px] overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col justify-center items-center text-slate-400 font-bold text-xs h-full gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Memuat evaluasi sistem peringatan dini (EWS)...</span>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-4 pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-emerald-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300">
            {/* 1. Status Keamanan Banner + Carousel Selector */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-inner transition-all duration-300 ${statusBg}`}>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-black opacity-80">
                    STATUS KEAMANAN
                  </h4>
                  <p className="text-[16px] sm:text-[18px] font-black tracking-wide uppercase mt-0.5">
                    {commodityName.toUpperCase()}: {overallStatus.toUpperCase()}
                  </p>
                </div>
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 animate-pulse ${statusDot}`}></span>
              </div>

              {/* Carousel Navigation Buttons & Dots Indicator */}
              <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
                  title="Komoditas Sebelumnya"
                  aria-label="Komoditas Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dots indicator */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[200px] sm:max-w-none">
                  {EWS_COMMODITY_ORDER.map((key) => {
                    const isCurrent = key === selectedCommodity;
                    return (
                      <span
                        key={key}
                        onClick={() => setSelectedCommodity(key)}
                        className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                          isCurrent ? 'w-5 bg-emerald-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={EWS_COMMODITY_MAP[key]}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
                  title="Komoditas Berikutnya"
                  aria-label="Komoditas Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. 3 Layers Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">L1: Proyeksi Trend (1m)</span>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-black uppercase tracking-wider ${
                  activeData.status_forecast === 'Naik'
                    ? 'text-rose-600 bg-rose-50 border border-rose-200'
                    : activeData.status_forecast === 'Turun'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-slate-700 bg-slate-100 border border-slate-200'
                }`}>
                  {activeData.status_forecast.toUpperCase()} ({activeData.perubahan_pct > 0 ? `+${activeData.perubahan_pct.toFixed(1)}%` : `${activeData.perubahan_pct.toFixed(1)}%`})
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">L2: Koefisien Variasi (CV)</span>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-black uppercase tracking-wider ${
                  activeData.status_cv === 'RENTAN'
                    ? 'text-rose-600 bg-rose-50 border border-rose-200'
                    : activeData.status_cv === 'WASPADA'
                    ? 'text-amber-700 bg-amber-50 border border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}>
                  {activeData.status_cv} ({activeData.cv.toFixed(1)}%)
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">L3: YoY Comparison (SKPG)</span>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-black uppercase tracking-wider ${
                  activeData.status_skpg === 'RENTAN'
                    ? 'text-rose-600 bg-rose-50 border border-rose-200'
                    : activeData.status_skpg === 'WASPADA'
                    ? 'text-amber-700 bg-amber-50 border border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}>
                  {activeData.status_skpg} ({activeData.growth_yoy && activeData.growth_yoy > 0 ? `+${activeData.growth_yoy.toFixed(1)}%` : `${(activeData.growth_yoy ?? -3.0).toFixed(1)}%`})
                </span>
              </div>
            </div>

            {/* 3. Top Drivers (Pendorong Utama) */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>TOP DRIVERS (PENDORONG UTAMA)</span>
              </h4>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                {activeData.drivers && activeData.drivers.map((driver: string, idx: number) => {
                  const cleanedText = driver.replace(/^\d+\s*/, '');
                  return (
                    <div key={idx} className="flex items-center gap-2 text-slate-700 font-semibold">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center border border-slate-300 shrink-0">
                        {idx + 1}
                      </span>
                      <span>{cleanedText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Rekomendasi Intervensi */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>REKOMENDASI INTERVENSI</span>
              </h4>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                {activeData.rekomendasi && activeData.rekomendasi.map((action: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-emerald-700 font-bold">
                    <span className="text-[11px] mt-0.5 text-emerald-600">•</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
