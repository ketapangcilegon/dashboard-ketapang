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
import AIInsightPanel from '@/components/AIInsightPanel';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Lifted SAGON Live Price States
  const [livePrices, setLivePrices] = useState<any>(null);
  const [liveDate, setLiveDate] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLiveHarga() {
      try {
        const res = await fetch('/api/harga-sagon');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.prices) {
            setLivePrices(data.prices);
            setLiveDate(data.tanggal);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live prices from SAGON API:', err);
      } finally {
        setLoadingLive(false);
      }
    }
    fetchLiveHarga();
  }, []);

  // Carousel Slider States for Top row
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) setVisibleCount(6);      // xl
      else if (w >= 1024) setVisibleCount(4); // lg
      else if (w >= 768) setVisibleCount(3);  // md
      else if (w >= 640) setVisibleCount(2);  // sm
      else setVisibleCount(1);                // mobile
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPanels = 9;
  const maxSliderIndex = Math.max(0, totalPanels - visibleCount);

  useEffect(() => {
    setSliderIndex(prev => Math.min(prev, maxSliderIndex));
  }, [maxSliderIndex]);

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
      <div className="hidden lg:block w-64 shrink-0 bg-[var(--color-sidebar)] text-white shadow-xl z-20 print:hidden">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent z-0 opacity-70 pointer-events-none"></div>

        <div className="print:hidden">
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
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px]">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 font-semibold text-sm">Menghubungkan ke Supabase & Memuat Data Riil...</p>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-6">
              
              {/* TOP ROW: 9 KPI Panels (Premium React Sliding Carousel) */}
              <div className="relative w-full flex items-center group px-10 print:px-0">
                {/* Left Arrow Button */}
                {sliderIndex > 0 && (
                  <button
                    onClick={() => setSliderIndex(prev => Math.max(0, prev - 1))}
                    className="absolute left-0 bg-white/90 hover:bg-white border border-slate-200 text-slate-800 rounded-full p-2 h-10 w-10 flex items-center justify-center cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-95 hover:scale-110 z-20 print:hidden"
                    title="Sebelumnya"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-700" />
                  </button>
                )}

                {/* Carousel Viewport */}
                <div className="w-full overflow-hidden py-1 print:overflow-visible">
                  <div 
                    className="flex transition-transform duration-500 ease-in-out print:grid print:grid-cols-5 print:gap-2 print:!transform-none print:w-full print:h-auto"
                    style={{ 
                      transform: `translateX(-${sliderIndex * (100 / visibleCount)}%)` 
                    }}
                  >
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <CVGauge value={getCVValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <PPHGauge value={getPPHValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <ProteinGauge value={getKonsumsiProteinValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <EnergiGauge value={getKonsumsiEnergiValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <KetersediaanProteinGauge value={getKetersediaanProteinValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <KetersediaanEnergiGauge value={getKetersediaanEnergiValue()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <KerawananPanel intervensiData={intervensiData} selectedKecamatan={selectedKecamatan} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <BalitaDoughnut balitaData={getBalitaData()} />
                    </div>
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[235px] print:w-full print:px-1 print:h-[235px]">
                      <ProduksiLokalChart produksiBerasData={produksiBerasList} selectedYear={selectedYear} selectedMonth={selectedMonth} />
                    </div>
                  </div>
                </div>

                {/* Right Arrow Button */}
                {sliderIndex < maxSliderIndex && (
                  <button
                    onClick={() => setSliderIndex(prev => Math.min(maxSliderIndex, prev + 1))}
                    className="absolute right-0 bg-white/90 hover:bg-white border border-slate-200 text-slate-800 rounded-full p-2 h-10 w-10 flex items-center justify-center cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-95 hover:scale-110 z-20 print:hidden"
                    title="Berikutnya"
                  >
                    <ChevronRight className="w-6 h-6 text-slate-700" />
                  </button>
                )}
              </div>

              {/* MIDDLE ROW: 2 Column Layout (Harga Panel & Wide Map) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4 print:mt-6">
                {/* Column 1: Harga Panel (Span 4) */}
                <div className="lg:col-span-4 flex flex-col print:col-span-5">
                  <div className="dashboard-card flex-1 min-h-[420px] flex flex-col print:h-[380px] print:min-h-0">
                    <HargaPanel 
                      hargaData={hargaData} 
                      previousHargaData={previousHargaData} 
                      livePrices={livePrices}
                      liveDate={liveDate}
                      loadingLive={loadingLive}
                    />
                  </div>
                </div>

                {/* Column 2: Wide Map (Span 8) */}
                <div className="lg:col-span-8 flex flex-col print:col-span-7">
                  <div className="dashboard-card flex-1 min-h-[420px] flex flex-col print:h-[380px] print:min-h-0">
                    <div className="mb-2">
                      <h3 className="font-extrabold text-slate-800 text-sm leading-none">PETA TEMATIK KETAHANAN PANGAN</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Sistem Informasi Geospasial Ketahanan dan Kerawanan Pangan Kota Cilegon</p>
                    </div>
                    <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 min-h-[350px] print:h-[280px] print:min-h-0">
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

              {/* BOTTOM ROW 1: PoU (1/4 Width) & AI Insight Panel (3/4 Width) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4 print:mt-6">
                {/* PoU Chart - Span 3 */}
                <div className="lg:col-span-3 flex flex-col print:col-span-12 print:break-before-page">
                  <PoUTrendChart pouData={pouData} selectedYear={selectedYear} />
                </div>

                {/* AI Insight Panel - Span 9 */}
                <div className="lg:col-span-9 flex flex-col print:col-span-12 print:mt-6">
                  <AIInsightPanel 
                    year={selectedYear}
                    month={selectedMonth}
                    kecamatan={selectedKecamatan}
                    kelurahan={selectedKelurahan}
                    cvBeras={getCVValue()}
                    pphScore={getPPHValue()}
                    konsumsiEnergi={getKonsumsiEnergiValue()}
                    konsumsiProtein={getKonsumsiProteinValue()}
                    ketersediaanEnergi={getKetersediaanEnergiValue()}
                    ketersediaanProtein={getKetersediaanProteinValue()}
                    produksiBeras={
                      produksiBerasList.find(x => x.tahun === selectedYear)
                        ? Math.round(produksiBerasList.find(x => x.tahun === selectedYear).produksi_beras)
                        : (selectedYear === 2021 ? 7390 : selectedYear === 2022 ? 7209 : selectedYear === 2023 ? 6230 : selectedYear === 2024 ? 6614 : 8708)
                    }
                    balitaStatus={getBalitaData()}
                    hargaStrategis={{
                      beras: livePrices ? livePrices.beras : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.beras || 0), 0) / hargaData.length) : 13500),
                      minyak: livePrices ? livePrices.minyak_goreng : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.minyak_goreng || 0), 0) / hargaData.length) : 21000),
                      telur: livePrices ? livePrices.telur : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.telur || 0), 0) / hargaData.length) : 30400),
                      gula: livePrices ? livePrices.gula_pasir : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.gula_pasir || 0), 0) / hargaData.length) : 16000),
                      cabai: livePrices ? livePrices.cabe_merah : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.cabe_merah || 0), 0) / hargaData.length) : 45000),
                    }}
                    loadingPrices={loadingLive}
                  />
                </div>
              </div>

              {/* BOTTOM ROW 2: Benchmark Panel (Full Width, directly below) */}
              <div className="w-full print:hidden">
                <BenchmarkPanel currentData={getBenchmarkData()} />
              </div>
              
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Set page margins & size */
          @page {
            size: A4 portrait;
            margin: 15mm 10mm 15mm 10mm;
          }

          /* Force backgrounds and gradients */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset layouts for full print page flow */
          html, body, #__next, .flex.h-screen {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: #F8FAFC !important;
          }

          /* Main viewport overrides */
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          .custom-scrollbar {
            overflow: visible !important;
          }

          /* Custom page break utility */
          .print\\:break-before-page {
            break-before: page !important;
            page-break-before: always !important;
            margin-top: 15mm !important;
          }

          /* General card prints */
          .dashboard-card {
            box-shadow: none !important;
            border: 1px solid #E2E8F0 !important;
            background: #FFFFFF !important;
          }
        }
      `}} />
    </div>
  );
}
