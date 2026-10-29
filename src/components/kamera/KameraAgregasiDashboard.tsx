"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST, TANAMAN_PANGAN_LIST } from '@/lib/kamera-normatif';
import { Store, Trees, PieChart, BarChart3, TrendingUp, MapPin, Truck, AlertCircle, ArrowUpRight, Users, Mail, Edit3, Calculator } from 'lucide-react';
import { getEnumerator, jenisSumber } from '@/lib/arusPasokan';
import {
  hitungKalibrasi,
  hitungEstimasiTahunan,
  ringkasEstimasi,
  formatTonTahun,
  LABEL_SUMBER
} from '@/lib/estimasi-pasokan';
import KameraEstimasiTahunanTable, { type PatchPasokan } from './KameraEstimasiTahunanTable';

interface KameraAgregasiDashboardProps {
  observasiList: ObservasiRecord[];
  focusSection?: 'rantai_pasok' | 'agregasi' | null;
  onEdit?: (record: ObservasiRecord) => void;
  /** Governance: hanya Admin atau user pendata yang boleh mengedit */
  canEdit?: (record: ObservasiRecord) => boolean;
  /** Simpan cepat frekuensi & jumlah pasokan langsung dari daftar toko */
  onQuickSave?: (record: ObservasiRecord, patch: PatchPasokan) => Promise<void>;
}

export default function KameraAgregasiDashboard({
  observasiList = [],
  focusSection = null,
  onEdit,
  canEdit,
  onQuickSave
}: KameraAgregasiDashboardProps) {
  const [selectedKec, setSelectedKec] = useState<string>('semua');

  useEffect(() => {
    if (focusSection === 'rantai_pasok') {
      const el = document.getElementById('rantai-pasok-section');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
    }
  }, [focusSection]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (selectedKec === 'semua') return observasiList;
    return observasiList.filter(d => d.kecamatan === selectedKec);
  }, [observasiList, selectedKec]);

  // Kalibrasi perputaran stok (median P_manual / S_AI per kategori) dari seluruh data
  const kalibrasi = useMemo(() => hitungKalibrasi(observasiList), [observasiList]);

  // Ringkasan pasokan tahunan (anti hitung ganda: total kota hanya dari luar Cilegon)
  const ringkasanTahunan = useMemo(
    () => ringkasEstimasi(filteredData, kalibrasi),
    [filteredData, kalibrasi]
  );

  // Statistik Utama
  const stats = useMemo(() => {
    const pasokanRecords = filteredData.filter(d => d.mode === 'pasokan_beras');
    const tanamanRecords = filteredData.filter(d => d.mode === 'tanaman_pangan');

    // Pasokan Beras
    const totalPasokanKg = pasokanRecords.reduce((acc, r) => acc + (Number(r.estimasi_pasokan_kg) || 0), 0);
    const totalPasokanTon = Number((totalPasokanKg / 1000).toFixed(2));
    const totalPasokanTahunanTon = Number(ringkasanTahunan.totalKotaTon.toFixed(1));
    
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
      totalPasokanTahunanTon,
      persenLokal,
      persenLuar,
      totalTanamanSpot: tanamanRecords.length,
      totalProduksiTon,
      totalPohon,
      totalLuasHa
    };
  }, [filteredData, ringkasanTahunan]);

  // Daftar kontribusi terbaru (nama + Gmail enumerator) mengikuti filter wilayah
  const kontribusiTerbaru = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0))
      .slice(0, 50);
  }, [filteredData]);

  // Papan kontributor: jumlah submit & total estimasi pasokan per enumerator
  const kontributor = useMemo(() => {
    const map = new Map<string, { nama: string; email: string; jumlah: number; pasokanKg: number; terakhir: number }>();
    filteredData.forEach((r) => {
      const en = getEnumerator(r);
      const key = (en.email || en.nama).toLowerCase();
      const cur = map.get(key) || { ...en, jumlah: 0, pasokanKg: 0, terakhir: 0 };
      cur.jumlah += 1;
      if (r.mode === 'pasokan_beras') cur.pasokanKg += Number(r.estimasi_pasokan_kg) || 0;
      cur.terakhir = Math.max(cur.terakhir, Date.parse(r.created_at || '') || 0);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 8);
  }, [filteredData]);

  // Agregasi per Kecamatan
  const rekapKecamatan = useMemo(() => {
    return Object.keys(WILAYAH).map(kec => {
      const listKec = observasiList.filter(d => d.kecamatan === kec);
      const pasokanKec = listKec.filter(d => d.mode === 'pasokan_beras');
      const tanamanKec = listKec.filter(d => d.mode === 'tanaman_pangan');

      const pasokanKg = pasokanKec.reduce((acc, r) => acc + (Number(r.estimasi_pasokan_kg) || 0), 0);
      const pasokanTahunanTon = pasokanKec.reduce(
        (acc, r) => acc + hitungEstimasiTahunan(r, kalibrasi).tahunanTon,
        0
      );
      const produksiKg = tanamanKec.reduce((acc, r) => acc + (Number(r.estimasi_produksi_kg) || 0), 0);

      return {
        kecamatan: kec,
        jumlahSarana: pasokanKec.length,
        estimasiPasokanTon: Number((pasokanKg / 1000).toFixed(2)),
        estimasiPasokanTahunanTon: Number(pasokanTahunanTon.toFixed(1)),
        jumlahTanamanTitik: tanamanKec.length,
        estimasiProduksiTon: Number((produksiKg / 1000).toFixed(2))
      };
    });
  }, [observasiList, kalibrasi]);

  return (
    <div className="w-full h-full bg-[#F5FAF2] text-slate-800 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
      
      {/* Header Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-100">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
            <span>Agregasi Data Lapangan Kamera Cerdas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi spasial sarana distribusi beras dan potensi produksi tanaman pangan
          </p>
        </div>

        {/* Filter Kecamatan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">Filter Wilayah:</span>
          <select
            value={selectedKec}
            onChange={(e) => setSelectedKec(e.target.value)}
            className="bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
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
        <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sarana Distribusi Beras</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalSarana} <span className="text-xs font-normal text-slate-500">Titik Toko/Agen</span></div>
          <p className="text-[10px] text-sky-700 mt-1 font-medium">Toko beras, warung, minimarket, pasar</p>
        </div>

        {/* Card 2: Estimasi Pasokan Beras (Stok & Arus Tahunan) */}
        <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pasokan Beras / Tahun</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {stats.totalPasokanTahunanTon.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">Ton/Thn</span>
          </div>
          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
            Stok sesaat (AI): {stats.totalPasokanTon} Ton • Manual: {ringkasanTahunan.jumlahManual} / AI: {ringkasanTahunan.jumlahAi} toko
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px]">
            <span className="text-emerald-700 font-bold">Lokal: {stats.persenLokal}%</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-700 font-bold">Luar Cilegon: {stats.persenLuar}%</span>
          </div>
        </div>

        {/* Card 3: Titik Tanaman Pangan */}
        <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanaman Pangan Terdata</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Trees className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalTanamanSpot} <span className="text-xs font-normal text-slate-500">Titik / {stats.totalPohon} Pohon</span></div>
          <p className="text-[10px] text-emerald-700 mt-1 font-medium">Total Luas Lahan: ~{stats.totalLuasHa} Ha</p>
        </div>

        {/* Card 4: Estimasi Produksi Normatif */}
        <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Potensi Produksi Normatif</span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-violet-700">{stats.totalProduksiTon} <span className="text-xs font-normal text-slate-500">Ton Karbohidrat</span></div>
          <p className="text-[10px] text-violet-700 mt-1 font-medium">Sukun, singkong, ubi, padi, jagung</p>
        </div>
      </div>

      {/* Rantai Pasok Analysis Banner (Capture 2 Match) */}
      <div 
        id="rantai-pasok-section"
        className={`bg-gradient-to-r from-sky-50 via-white to-emerald-50 border rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
          focusSection === 'rantai_pasok'
            ? 'border-blue-400 ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/20'
            : 'border-emerald-100'
        }`}
      >
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-sky-700" />
          <span>Analisis Rantai Pasok & Ketergantungan Pangan Kota Cilegon</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Berdasarkan observasi lapangan kamera cerdas di <b className="text-slate-900">{selectedKec === 'semua' ? 'seluruh Kota Cilegon' : `Kecamatan ${selectedKec}`}</b>, estimasi pasokan beras tercatat sebesar <b className="text-amber-700">{stats.totalPasokanTon} Ton</b>, dengan komposisi pasokan <b className="text-emerald-700">{stats.persenLokal}% berasal dari lokal Cilegon</b> dan <b className="text-rose-700">{stats.persenLuar}% disuplai dari luar daerah</b> (Kab. Serang, Pandeglang, Lebak, Karawang & Jawa Tengah).
        </p>

        <div className="w-full bg-emerald-50 h-3.5 rounded-full overflow-hidden flex border border-emerald-200">
          <div style={{ width: `${stats.persenLokal}%` }} className="bg-emerald-500 h-full flex items-center justify-center text-[8px] font-black text-white" title="Lokal Cilegon">
            {stats.persenLokal > 15 ? `${stats.persenLokal}% Lokal` : ''}
          </div>
          <div style={{ width: `${stats.persenLuar}%` }} className="bg-rose-500 h-full flex items-center justify-center text-[8px] font-black text-white" title="Luar Daerah">
            {stats.persenLuar > 15 ? `${stats.persenLuar}% Luar Cilegon` : ''}
          </div>
        </div>

        {/* 100% Luar Cilegon Pill (Capture 2 Match) */}
        <div className="mt-3.5 flex justify-center">
          <div className="w-full text-center py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white font-black text-xs tracking-wider shadow-md uppercase">
            {stats.persenLuar}% Luar Cilegon
          </div>
        </div>
      </div>

      {/* Tabel Agregasi per Kecamatan */}
      <div className="bg-white/80 border border-emerald-100 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-700" />
          <span>Tabel Rekapitulasi per Kecamatan (Kota Cilegon)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-emerald-100 text-slate-500 text-[11px]">
                <th className="py-2.5 px-3 font-bold">Kecamatan</th>
                <th className="py-2.5 px-3 font-bold text-center">Sarana Beras</th>
                <th className="py-2.5 px-3 font-bold text-right">Stok Sesaat (AI)</th>
                <th className="py-2.5 px-3 font-bold text-right">Estimasi Pasokan / Tahun</th>
                <th className="py-2.5 px-3 font-bold text-center">Spot Tanaman</th>
                <th className="py-2.5 px-3 font-bold text-right">Estimasi Produksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 font-medium">
              {rekapKecamatan.map((row) => (
                <tr key={row.kecamatan} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{row.kecamatan}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-sky-700 font-bold">{row.jumlahSarana} Toko</td>
                  <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{row.estimasiPasokanTon} Ton</td>
                  <td className="py-2.5 px-3 text-right text-indigo-700 font-black">{row.estimasiPasokanTahunanTon.toLocaleString('id-ID')} T/Thn</td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{row.jumlahTanamanTitik} Titik</td>
                  <td className="py-2.5 px-3 text-right text-violet-700 font-bold">{row.estimasiProduksiTon} Ton</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daftar Toko & Input Cepat Frekuensi × Jumlah Pasokan Beras per Tahun */}
      <div className="bg-white/90 border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Daftar Toko &amp; Estimasi Pasokan Beras per Tahun</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Isi frekuensi &amp; jumlah kiriman langsung pada baris toko untuk memperbarui estimasi tahunan. Jika belum diisi, sistem memakai stok AI × koefisien perputaran awal.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              Total Luar Cilegon: {ringkasanTahunan.totalKotaTon.toLocaleString('id-ID', { maximumFractionDigits: 1 })} T/Thn
            </span>
            {ringkasanTahunan.lokalTon > 0 && (
              <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200" title="Tidak dijumlahkan ke total kota agar tidak hitung ganda">
                Sirkulasi Lokal: {ringkasanTahunan.lokalTon.toLocaleString('id-ID', { maximumFractionDigits: 1 })} T/Thn
              </span>
            )}
          </div>
        </div>

        <KameraEstimasiTahunanTable
          records={filteredData}
          kalibrasi={kalibrasi}
          canEdit={canEdit}
          onQuickSave={onQuickSave}
        />
      </div>

      {/* Daftar Kontribusi Enumerator (Crowdsourcing) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-700" />
            <span>Daftar Data Crowdsourcing &amp; Enumerator</span>
            <span className="ml-auto text-[10px] font-bold text-slate-500">{kontribusiTerbaru.length} terbaru</span>
          </h3>

          {kontribusiTerbaru.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data kiriman enumerator untuk wilayah ini.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50 text-slate-500 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3 font-bold">Waktu</th>
                    <th className="py-2 px-3 font-bold">Enumerator (Nama &amp; Gmail)</th>
                    <th className="py-2 px-3 font-bold">Data</th>
                    <th className="py-2 px-3 font-bold">Lokasi</th>
                    <th className="py-2 px-3 font-bold text-right">Estimasi</th>
                    <th className="py-2 px-3 font-bold text-right">Pasokan/Thn</th>
                    <th className="py-2 px-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {kontribusiTerbaru.map((r, i) => {
                    const en = getEnumerator(r);
                    const sumber = jenisSumber(r);
                    const estimasiKg = r.mode === 'pasokan_beras' ? Number(r.estimasi_pasokan_kg) || 0 : Number(r.estimasi_produksi_kg) || 0;
                    return (
                      <tr key={r.id || `kontribusi-${i}`} className="hover:bg-emerald-50/60 transition-colors align-top">
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {r.created_at ? new Date(r.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 leading-tight">{en.nama}</div>
                          <div className="text-[10px] text-slate-500 break-all">{en.email || 'Gmail tidak tercatat'}</div>
                          <span className={`inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                            sumber === 'petugas'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : sumber === 'enumerator'
                              ? 'bg-sky-100 text-sky-700 border-sky-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {sumber === 'petugas' ? 'PETUGAS DKPP' : sumber === 'enumerator' ? 'ENUMERATOR' : 'LAINNYA'}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`font-bold ${r.mode === 'pasokan_beras' ? 'text-sky-700' : 'text-emerald-700'}`}>
                            {r.mode === 'pasokan_beras' ? 'Pasokan Beras' : 'Tanaman Pangan'}
                          </span>
                          <div className="text-[10px] text-slate-500">{r.kategori_label || r.kategori}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <div className="font-semibold leading-tight">{r.nama_lokasi || r.kategori_label || 'Titik Observasi'}</div>
                          <div className="text-[10px] text-slate-500">{r.kelurahan}, {r.kecamatan}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-700 whitespace-nowrap">
                          {estimasiKg > 0 ? `${(estimasiKg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                          {r.mode === 'pasokan_beras' ? (() => {
                            const est = hitungEstimasiTahunan(r, kalibrasi);
                            return est.tahunanTon > 0 ? (
                              <div>
                                <div>{formatTonTahun(est.tahunanTon)}</div>
                                <div className="text-[9px] text-slate-500 font-medium">{LABEL_SUMBER[est.sumber]}</div>
                              </div>
                            ) : '-';
                          })() : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {onEdit && (!canEdit || canEdit(r)) ? (
                            <button
                              type="button"
                              onClick={() => onEdit(r)}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg mx-auto transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400" title="Hanya Admin atau pendata yang dapat mengedit">🔒</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Kontributor Teratas</span>
          </h3>
          {kontributor.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-medium">Belum ada kontributor.</div>
          ) : (
            <ol className="space-y-2">
              {kontributor.map((k, idx) => (
                <li key={k.email || k.nama} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{k.nama}</div>
                    <div className="text-[10px] text-slate-500 truncate">{k.email || 'Gmail tidak tercatat'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-emerald-700">{k.jumlah} foto</div>
                    <div className="text-[10px] text-amber-700 font-bold">{(k.pasokanKg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Info Footnote */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
        <span>Seluruh data bersumber dari observasi lapangan terverifikasi. Nilai produksi dan pasokan merupakan estimasi normatif berbasis model visual AI & standar DKPP Kota Cilegon.</span>
      </div>

    </div>
  );
}
