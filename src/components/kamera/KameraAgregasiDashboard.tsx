"use client";

import React, { useMemo, useState } from 'react';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST, TANAMAN_PANGAN_LIST } from '@/lib/kamera-normatif';
import { Store, Trees, PieChart, BarChart3, TrendingUp, MapPin, Truck, AlertCircle, ArrowUpRight } from 'lucide-react';

interface KameraAgregasiDashboardProps {
  observasiList: ObservasiRecord[];
}

export default function KameraAgregasiDashboard({
  observasiList = []
}: KameraAgregasiDashboardProps) {
  const [selectedKec, setSelectedKec] = useState<string>('semua');

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (selectedKec === 'semua') return observasiList;
    return observasiList.filter(d => d.kecamatan === selectedKec);
  }, [observasiList, selectedKec]);

  // Statistik Utama
  const stats = useMemo(() => {
    const pasokanRecords = filteredData.filter(d => d.mode === 'pasokan_beras');
    const tanamanRecords = filteredData.filter(d => d.mode === 'tanaman_pangan');

    // Pasokan Beras
    const totalPasokanKg = pasokanRecords.reduce((acc, r) => acc + (Number(r.estimasi_pasokan_kg) || 0), 0);
    const totalPasokanTon = Number((totalPasokanKg / 1000).toFixed(2));
    
    let pasokanLokalKg = 0;
    let pasokanLuarKg = 0;
    pasokanRecords.forEach(r => {
      const kg = Number(r.estimasi_pasokan_kg) || 0;
      if (r.asal_pasokan?.includes('Cilegon')) {
        pasokanLokalKg += kg;
      } else {
        pasokanLuarKg += kg;
      }
    });

    const persenLokal = totalPasokanKg > 0 ? Math.round((pasokanLokalKg / totalPasokanKg) * 100) : 0;
    const persenLuar = totalPasokanKg > 0 ? 100 - persenLokal : 0;

    // Tanaman Pangan
    const totalProduksiKg = tanamanRecords.reduce((acc, r) => acc + (Number(r.estimasi_produksi_kg) || 0), 0);
    const totalProduksiTon = Number((totalProduksiKg / 1000).toFixed(2));
    const totalPohon = tanamanRecords.reduce((acc, r) => acc + (Number(r.jumlah_pohon_rumpun) || 0), 0);
    const totalLuasM2 = tanamanRecords.reduce((acc, r) => acc + (Number(r.luas_lahan_m2) || 0), 0);
    const totalLuasHa = Number((totalLuasM2 / 10000).toFixed(3));

    return {
      totalSarana: pasokanRecords.length,
      totalPasokanTon,
      persenLokal,
      persenLuar,
      totalTanamanSpot: tanamanRecords.length,
      totalProduksiTon,
      totalPohon,
      totalLuasHa
    };
  }, [filteredData]);

  // Agregasi per Kecamatan
  const rekapKecamatan = useMemo(() => {
    return Object.keys(WILAYAH).map(kec => {
      const listKec = observasiList.filter(d => d.kecamatan === kec);
      const pasokanKec = listKec.filter(d => d.mode === 'pasokan_beras');
      const tanamanKec = listKec.filter(d => d.mode === 'tanaman_pangan');

      const pasokanKg = pasokanKec.reduce((acc, r) => acc + (Number(r.estimasi_pasokan_kg) || 0), 0);
      const produksiKg = tanamanKec.reduce((acc, r) => acc + (Number(r.estimasi_produksi_kg) || 0), 0);

      return {
        kecamatan: kec,
        jumlahSarana: pasokanKec.length,
        estimasiPasokanTon: Number((pasokanKg / 1000).toFixed(2)),
        jumlahTanamanTitik: tanamanKec.length,
        estimasiProduksiTon: Number((produksiKg / 1000).toFixed(2))
      };
    });
  }, [observasiList]);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
      
      {/* Header Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Agregasi Data Lapangan Kamera Cerdas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rekapitulasi spasial sarana distribusi beras dan potensi produksi tanaman pangan
          </p>
        </div>

        {/* Filter Kecamatan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Filter Wilayah:</span>
          <select
            value={selectedKec}
            onChange={(e) => setSelectedKec(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="semua">Seluruh Kota Cilegon</option>
            {Object.keys(WILAYAH).map(kec => (
              <option key={kec} value={kec}>Kecamatan {kec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sarana Distribusi */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sarana Distribusi Beras</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalSarana} <span className="text-xs font-normal text-slate-400">Titik Toko/Agen</span></div>
          <p className="text-[10px] text-blue-400 mt-1 font-medium">Toko beras, warung, minimarket, pasar</p>
        </div>

        {/* Card 2: Estimasi Pasokan Beras */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Pasokan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.totalPasokanTon} <span className="text-xs font-normal text-slate-400">Ton</span></div>
          <div className="flex items-center gap-2 mt-1 text-[10px]">
            <span className="text-emerald-400 font-bold">Lokal: {stats.persenLokal}%</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-bold">Luar Cilegon: {stats.persenLuar}%</span>
          </div>
        </div>

        {/* Card 3: Titik Tanaman Pangan */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tanaman Pangan Terdata</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Trees className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalTanamanSpot} <span className="text-xs font-normal text-slate-400">Titik / {stats.totalPohon} Pohon</span></div>
          <p className="text-[10px] text-emerald-400 mt-1 font-medium">Total Luas Lahan: ~{stats.totalLuasHa} Ha</p>
        </div>

        {/* Card 4: Estimasi Produksi Normatif */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Potensi Produksi Normatif</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400">{stats.totalProduksiTon} <span className="text-xs font-normal text-slate-400">Ton Karbohidrat</span></div>
          <p className="text-[10px] text-purple-300 mt-1 font-medium">Sukun, singkong, ubi, padi, jagung</p>
        </div>
      </div>

      {/* Rantai Pasok Analysis Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-emerald-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-blue-400" />
          <span>Analisis Rantai Pasok & Ketergantungan Pangan Kota Cilegon</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Berdasarkan observasi lapangan kamera cerdas di <b className="text-white">{selectedKec === 'semua' ? 'seluruh Kota Cilegon' : `Kecamatan ${selectedKec}`}</b>, estimasi pasokan beras tercatat sebesar <b className="text-amber-400">{stats.totalPasokanTon} Ton</b>, dengan komposisi pasokan <b className="text-emerald-400">{stats.persenLokal}% berasal dari lokal Cilegon</b> dan <b className="text-rose-400">{stats.persenLuar}% disuplai dari luar daerah</b> (Kab. Serang, Pandeglang, Lebak, Karawang & Jawa Tengah).
        </p>

        <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden flex border border-slate-700">
          <div style={{ width: `${stats.persenLokal}%` }} className="bg-emerald-500 h-full flex items-center justify-center text-[8px] font-black text-white" title="Lokal Cilegon">
            {stats.persenLokal > 15 ? `${stats.persenLokal}% Lokal` : ''}
          </div>
          <div style={{ width: `${stats.persenLuar}%` }} className="bg-rose-500 h-full flex items-center justify-center text-[8px] font-black text-white" title="Luar Daerah">
            {stats.persenLuar > 15 ? `${stats.persenLuar}% Luar Cilegon` : ''}
          </div>
        </div>
      </div>

      {/* Tabel Agregasi per Kecamatan */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Tabel Rekapitulasi per Kecamatan (Kota Cilegon)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3 font-bold">Kecamatan</th>
                <th className="py-2.5 px-3 font-bold text-center">Sarana Beras</th>
                <th className="py-2.5 px-3 font-bold text-right">Estimasi Pasokan</th>
                <th className="py-2.5 px-3 font-bold text-center">Spot Tanaman</th>
                <th className="py-2.5 px-3 font-bold text-right">Estimasi Produksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {rekapKecamatan.map((row) => (
                <tr key={row.kecamatan} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{row.kecamatan}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-blue-400 font-bold">{row.jumlahSarana} Toko</td>
                  <td className="py-2.5 px-3 text-right text-amber-300 font-bold">{row.estimasiPasokanTon} Ton</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{row.jumlahTanamanTitik} Titik</td>
                  <td className="py-2.5 px-3 text-right text-purple-400 font-bold">{row.estimasiProduksiTon} Ton</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footnote */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-4 h-4 shrink-0 text-slate-400" />
        <span>Seluruh data bersumber dari observasi lapangan terverifikasi. Nilai produksi dan pasokan merupakan estimasi normatif berbasis model visual AI & standar DKPP Kota Cilegon.</span>
      </div>

    </div>
  );
}
