"use client";

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import CVGauge from '@/components/CVGauge';
import PPHGauge from '@/components/PPHGauge';
import KetersediaanProteinGauge from '@/components/KetersediaanProteinGauge';
import KetersediaanEnergiGauge from '@/components/KetersediaanEnergiGauge';
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
  const [pouData, setPouData] = useState<any[]>([]);

  // New Data States for the annual indicators
  const [cvBerasList, setCvBerasList] = useState<any[]>([]);
  const [pphList, setPphList] = useState<any[]>([]);
  const [konsumsiEnergiList, setKonsumsiEnergiList] = useState<any[]>([]);
  const [konsumsiProteinList, setKonsumsiProteinList] = useState<any[]>([]);
  const [ketersediaanEnergiList, setKetersediaanEnergiList] = useState<any[]>([]);
  const [ketersediaanProteinList, setKetersediaanProteinList] = useState<any[]>([]);
  const [produksiBerasList, setProduksiBerasList] = useState<any[]>([]);

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

        // 6. Fetch POU Lintas Tahun
        try {
          const { data: pou } = await supabase.from('pou_data').select('*').order('tahun', { ascending: true });
          setPouData(pou || []);
        } catch (pouErr) {
          console.warn('Table pou_data might not exist yet:', pouErr);
        }

        // 6.1 Fetch CV Beras
        try {
          const { data } = await supabase.from('cv_beras_data').select('*').order('tahun', { ascending: true });
          setCvBerasList(data || []);
        } catch (e) {
          console.warn('cv_beras_data failed:', e);
        }

        // 6.2 Fetch PPH
        try {
          const { data } = await supabase.from('pph_data').select('*').order('tahun', { ascending: true });
          setPphList(data || []);
        } catch (e) {
          console.warn('pph_data failed:', e);
        }

        // 6.3 Fetch Konsumsi Energi
        try {
          const { data } = await supabase.from('konsumsi_energi_data').select('*').order('tahun', { ascending: true });
          setKonsumsiEnergiList(data || []);
        } catch (e) {
          console.warn('konsumsi_energi_data failed:', e);
        }

        // 6.4 Fetch Konsumsi Protein
        try {
          const { data } = await supabase.from('konsumsi_protein_data').select('*').order('tahun', { ascending: true });
          setKonsumsiProteinList(data || []);
        } catch (e) {
          console.warn('konsumsi_protein_data failed:', e);
        }

        // 6.5 Fetch Ketersediaan Energi
        try {
          const { data } = await supabase.from('ketersediaan_energi_data').select('*').order('tahun', { ascending: true });
          setKetersediaanEnergiList(data || []);
        } catch (e) {
          console.warn('ketersediaan_energi_data failed:', e);
        }

        // 6.6 Fetch Ketersediaan Protein
        try {
          const { data } = await supabase.from('ketersediaan_protein_data').select('*').order('tahun', { ascending: true });
          setKetersediaanProteinList(data || []);
        } catch (e) {
          console.warn('ketersediaan_protein_data failed:', e);
        }

        // 6.7 Fetch Produksi Beras Lokal
        try {
          const { data } = await supabase.from('produksi_beras_data').select('*').order('tahun', { ascending: true });
          setProduksiBerasList(data || []);
        } catch (e) {
          console.warn('produksi_beras_data failed:', e);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedKecamatan, selectedKelurahan, selectedYear, selectedMonth]);

  // Getter functions with dynamic database value retrieval and smart default fallbacks
  const getCVValue = () => {
    const entry = cvBerasList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 3.65, 2022: 1.45, 2023: 5.21, 2024: 3.65, 2025: 3.65 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 3.65;
  };

  const getPPHValue = () => {
    const entry = pphList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 88.3, 2022: 85.5, 2023: 89.8, 2024: 90.9, 2025: 90.9 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 90.9;
  };

  const getKonsumsiEnergiValue = () => {
    const entry = konsumsiEnergiList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 1811, 2022: 1970, 2023: 2272, 2024: 2021, 2025: 2021 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 2021;
  };

  const getKonsumsiProteinValue = () => {
    const entry = konsumsiProteinList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 67, 2022: 65, 2023: 71, 2024: 59, 2025: 59 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 59;
  };

  const getKetersediaanEnergiValue = () => {
    const entry = ketersediaanEnergiList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 2525, 2022: 2529, 2023: 2582, 2024: 2582, 2025: 2582 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 2582;
  };

  const getKetersediaanProteinValue = () => {
    const entry = ketersediaanProteinList.find(x => x.tahun === selectedYear);
    if (entry) return parseFloat(entry.cilegon);
    const fallbacks: Record<number, number> = { 2021: 92, 2022: 81, 2023: 85, 2024: 85, 2025: 85 };
    return fallbacks[selectedYear] !== undefined ? fallbacks[selectedYear] : 85;
  };

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
    const pphVal = getPPHValue();
    const cEnergiVal = getKonsumsiEnergiValue();
    const cProteinVal = getKonsumsiProteinValue();
    const tEnergiVal = getKetersediaanEnergiValue();
    const tProteinVal = getKetersediaanProteinValue();
    const cvVal = getCVValue();

    return {
      1: pphVal,
      2: parseFloat(((cEnergiVal / 2100 + cProteinVal / 57) * 50).toFixed(2)),
      3: cEnergiVal,
      4: cProteinVal,
      5: parseFloat(((tEnergiVal / 2400 + tProteinVal / 63) * 50).toFixed(2)),
      6: tEnergiVal,
      7: tProteinVal,
      8: 132.7,
      9: cvVal,
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
              
              {/* TOP ROW: 9 KPI Panels (Responsive Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-4">
                <CVGauge value={getCVValue()} />
                <PPHGauge value={getPPHValue()} />
                <ProteinGauge value={getKonsumsiProteinValue()} />
                <EnergiGauge value={getKonsumsiEnergiValue()} />
                <KetersediaanProteinGauge value={getKetersediaanProteinValue()} />
                <KetersediaanEnergiGauge value={getKetersediaanEnergiValue()} />
                <KerawananPanel intervensiData={intervensiData} selectedKecamatan={selectedKecamatan} />
                <BalitaDoughnut balitaData={getBalitaData()} />
                <ProduksiLokalChart produksiBerasData={produksiBerasList} selectedYear={selectedYear} selectedMonth={selectedMonth} />
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

              {/* BOTTOM ROW 1: Prevalence of Undernourishment Graph (Full Width) */}
              <div className="w-full">
                <PoUTrendChart pouData={pouData} selectedYear={selectedYear} />
              </div>

              {/* BOTTOM ROW 2: Benchmark Panel (Full Width, directly below PoU) */}
              <div className="w-full">
                <BenchmarkPanel currentData={getBenchmarkData()} />
              </div>
              
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
