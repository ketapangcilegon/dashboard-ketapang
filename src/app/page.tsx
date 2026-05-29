"use client";

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import CVGauge from '@/components/CVGauge';
import PPHGauge from '@/components/PPHGauge';
import NBMGauge from '@/components/NBMGauge';
import ProteinGauge from '@/components/ProteinGauge';
import EnergiGauge from '@/components/EnergiGauge';
import KerawananPanel from '@/components/KerawananPanel';
import BalitaDoughnut from '@/components/BalitaDoughnut';
import ProduksiLokalChart from '@/components/ProduksiLokalChart';
import HargaPanel from '@/components/HargaPanel';
import PoUTrendChart from '@/components/PoUTrendChart';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MapUnified = dynamic(() => import('@/components/MapUnified'), { 
  loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded text-slate-400 flex items-center justify-center text-xs">Memuat Peta...</div>, 
  ssr: false 
});

export default function DashboardPage() {
  // Filter States
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('ALL');
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(2); // Default to February as per YoY data

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [hargaData, setHargaData] = useState<any[]>([]);
  const [previousHargaData, setPreviousHargaData] = useState<any[]>([]);
  const [ketersediaanData, setKetersediaanData] = useState<any[]>([]);
  const [giziData, setGiziData] = useState<any[]>([]);
  const [intervensiData, setIntervensiData] = useState<any[]>([]);
  const [balitaDataRaw, setBalitaDataRaw] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const dateStr = `${selectedYear}-${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}-15`;
        
        // 1. Fetch Harga Pangan (Current Period)
        let hargaQuery = supabase.from('harga_pangan').select('*');
        if (selectedKecamatan !== 'ALL') {
          hargaQuery = hargaQuery.eq('kecamatan', selectedKecamatan);
        }
        if (selectedKelurahan !== 'ALL') {
          hargaQuery = hargaQuery.eq('kelurahan', selectedKelurahan);
        }
        const { data: currentHarga } = await hargaQuery.eq('tanggal', dateStr);
        setHargaData(currentHarga || []);

        // 1.1 Fetch Harga Pangan (Previous Year for YoY comparison)
        const prevYear = selectedYear - 1;
        const prevDateStr = `${prevYear}-${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}-15`;
        let prevHargaQuery = supabase.from('harga_pangan').select('*').eq('tanggal', prevDateStr);
        if (selectedKecamatan !== 'ALL') {
          prevHargaQuery = prevHargaQuery.eq('kecamatan', selectedKecamatan);
        }
        if (selectedKelurahan !== 'ALL') {
          prevHargaQuery = prevHargaQuery.eq('kelurahan', selectedKelurahan);
        }
        const { data: prevHarga } = await prevHargaQuery;
        setPreviousHargaData(prevHarga || []);

        // 2. Fetch Ketersediaan Pangan (Unfiltered by year to get full 5-year series!)
        const { data: ketersediaan } = await supabase
          .from('ketersediaan_pangan')
          .select('*');
        setKetersediaanData(ketersediaan || []);

        // 3. Fetch Gizi Masyarakat (Year-based)
        let giziQuery = supabase.from('gizi_masyarakat').select('*').eq('tahun', selectedYear);
        if (selectedKecamatan !== 'ALL') {
          giziQuery = giziQuery.eq('kecamatan', selectedKecamatan);
        }
        if (selectedKelurahan !== 'ALL') {
          giziQuery = giziQuery.eq('kelurahan', selectedKelurahan);
        }
        const { data: gizi } = await giziQuery;
        setGiziData(gizi || []);

        // 4. Fetch Intervensi Pangan
        let intQuery = supabase.from('intervensi_pangan').select('*').eq('tahun', selectedYear).eq('bulan', selectedMonth);
        if (selectedKecamatan !== 'ALL') {
          intQuery = intQuery.eq('kecamatan', selectedKecamatan);
        }
        if (selectedKelurahan !== 'ALL') {
          intQuery = intQuery.eq('kelurahan', selectedKelurahan);
        }
        const { data: intervensi } = await intQuery;
        setIntervensiData(intervensi || []);

        // 5. Fetch Balita Gizi
        let balitaQuery = supabase.from('balita_gizi').select('*').eq('tahun', selectedYear).eq('bulan', selectedMonth);
        if (selectedKecamatan !== 'ALL') {
          balitaQuery = balitaQuery.eq('kecamatan', selectedKecamatan);
        }
        const { data: balita } = await balitaQuery;
        setBalitaDataRaw(balita || []);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedKecamatan, selectedKelurahan, selectedYear, selectedMonth]);

  // Dynamic Balita computed calculations
  const getBalitaData = () => {
    if (!balitaDataRaw || balitaDataRaw.length === 0) {
      return { sangatKurang: 232, kurang: 946, normal: 25044, lebih: 1064, total: 27286, status: 'AMAN' };
    }
    const sangatKurang = balitaDataRaw.reduce((s, x) => s + (x.sangat_kurang || 0), 0);
    const kurang = balitaDataRaw.reduce((s, x) => s + (x.kurang || 0), 0);
    const normal = balitaDataRaw.reduce((s, x) => s + (x.normal || 0), 0);
    const lebih = balitaDataRaw.reduce((s, x) => s + (x.lebih || 0), 0);
    const total = sangatKurang + kurang + normal + lebih;
    return {
      sangatKurang,
      kurang,
      normal,
      lebih,
      total,
      status: balitaDataRaw[0]?.status || 'AMAN'
    };
  };

  // Derived indicator averages for BenchmarkPanel
  const getBenchmarkData = () => {
    const avgPPH = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.skor_pph || 0), 0) / giziData.length : 88.1;
    const avgEnergi = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_energi_kkal || 0), 0) / giziData.length : 2163;
    const avgProtein = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_protein_gram || 0), 0) / giziData.length : 63.4;
    const avgCV = hargaData.length > 0 ? hargaData.reduce((s, x) => s + (x.cv_harga || 0), 0) / hargaData.length : 3.65;
    
    return {
      1: parseFloat(avgPPH.toFixed(1)),
      2: parseFloat(((avgEnergi / 2100 + avgProtein / 57) * 50).toFixed(2)),
      3: parseFloat(avgEnergi.toFixed(1)),
      4: parseFloat(avgProtein.toFixed(1)),
      5: 121,
      6: 2582,
      7: 85,
      8: 132.7,
      9: parseFloat(avgCV.toFixed(2)),
      10: 100,
      11: 85.9,
      12: 78,
      13: 67
    };
  };

  // Pre-calculate values for top row speedometers
  const currentMonthKetersediaan = ketersediaanData.filter(x => x.tahun === selectedYear).find(x => x.bulan === selectedMonth) 
    || ketersediaanData.filter(x => x.tahun === selectedYear)[ketersediaanData.filter(x => x.tahun === selectedYear).length - 1];
  
  const nbmValue = currentMonthKetersediaan ? currentMonthKetersediaan.skor_nbm : 94.2;

  const avgPPH = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.skor_pph || 0), 0) / giziData.length 
    : 88.1;

  const avgEnergi = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.konsumsi_energi_kkal || 0), 0) / giziData.length 
    : 2163;

  const avgProtein = giziData.length > 0 
    ? giziData.reduce((s, x) => s + (x.konsumsi_protein_gram || 0), 0) / giziData.length 
    : 63.4;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 shrink-0 bg-[var(--color-sidebar)] text-white shadow-xl z-20">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent z-0 opacity-70 pointer-events-none"></div>

        <Navbar 
          selectedKecamatan={selectedKecamatan}
          setSelectedKecamatan={setSelectedKecamatan}
          selectedKelurahan={selectedKelurahan}
          setSelectedKelurahan={setSelectedKelurahan}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px]">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 font-semibold text-sm">Menghubungkan ke Supabase & Memuat Data Riil...</p>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-6">
              
              {/* TOP ROW: 8 KPI Panels (Responsive Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                <CVGauge hargaData={hargaData} />
                <PPHGauge value={avgPPH} />
                <NBMGauge value={nbmValue} />
                <ProteinGauge value={avgProtein} />
                <EnergiGauge value={avgEnergi} />
                <KerawananPanel intervensiData={intervensiData} selectedKecamatan={selectedKecamatan} />
                <BalitaDoughnut balitaData={getBalitaData()} />
                <ProduksiLokalChart ketersediaanData={ketersediaanData} selectedYear={selectedYear} selectedMonth={selectedMonth} />
              </div>

              {/* MIDDLE ROW: 2 Column Layout (Harga Panel & Wide Map) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Harga Panel (Span 4) */}
                <div className="lg:col-span-4 flex flex-col">
                  <div className="dashboard-card flex-1 min-h-[420px] flex flex-col">
                    <HargaPanel hargaData={hargaData} previousHargaData={previousHargaData} />
                  </div>
                </div>

                {/* Column 2: Wide Map (Span 8) */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="dashboard-card flex-1 min-h-[420px] flex flex-col">
                    <div className="mb-2">
                      <h3 className="font-extrabold text-slate-800 text-sm leading-none">PETA TEMATIK KETAHANAN PANGAN</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Sistem Informasi Geospasial Ketahanan dan Kerawanan Pangan Kota Cilegon</p>
                    </div>
                    <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 min-h-[350px]">
                      <MapUnified 
                        selectedKecamatan={selectedKecamatan}
                        selectedKelurahan={selectedKelurahan}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: PoU Trend & Benchmark Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Prevalence of Undernourishment Graph (Span 4) */}
                <div className="lg:col-span-4 flex flex-col">
                  <PoUTrendChart giziData={giziData} selectedYear={selectedYear} />
                </div>

                {/* Benchmark Panel (Span 8) */}
                <div className="lg:col-span-8 flex flex-col">
                  <BenchmarkPanel currentData={getBenchmarkData()} />
                </div>
              </div>
              
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
