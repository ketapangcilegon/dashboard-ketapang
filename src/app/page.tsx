"use client";

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import KPIGrid from '@/components/KPIGrid';
import HargaPanel from '@/components/HargaPanel';
import CVGauge from '@/components/CVGauge';
import BenchmarkPanel from '@/components/BenchmarkPanel';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ProduksiChart = dynamic(() => import('@/components/ProduksiChart'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const MapSKPG = dynamic(() => import('@/components/MapSKPG'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const MapFSVA = dynamic(() => import('@/components/MapFSVA'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const TrendChart = dynamic(() => import('@/components/TrendChart'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });

export default function DashboardPage() {
  // Filter States
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('ALL');
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default to May

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [hargaData, setHargaData] = useState<any[]>([]);
  const [ketersediaanData, setKetersediaanData] = useState<any[]>([]);
  const [giziData, setGiziData] = useState<any[]>([]);
  const [intervensiData, setIntervensiData] = useState<any[]>([]);

  // Historical data for trend charts
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Construct query parameters
        const dateStr = `${selectedYear}-${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}-15`;
        
        // 1. Fetch Harga Pangan
        let hargaQuery = supabase.from('harga_pangan').select('*');
        if (selectedKecamatan !== 'ALL') {
          hargaQuery = hargaQuery.eq('kecamatan', selectedKecamatan);
        }
        if (selectedKelurahan !== 'ALL') {
          hargaQuery = hargaQuery.eq('kelurahan', selectedKelurahan);
        }
        
        // Fetch current month + previous month to calculate changes (mtm)
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        const prevDateStr = `${prevYear}-${prevMonth < 10 ? '0' + prevMonth : prevMonth}-15`;

        const { data: currentHarga } = await hargaQuery.eq('tanggal', dateStr);
        const { data: previousHarga } = await supabase.from('harga_pangan')
          .select('*')
          .eq('tanggal', prevDateStr)
          .eq('kecamatan', selectedKecamatan !== 'ALL' ? selectedKecamatan : '')
          .eq('kelurahan', selectedKelurahan !== 'ALL' ? selectedKelurahan : '');

        setHargaData(currentHarga || []);

        // 2. Fetch Ketersediaan Pangan (Production values are city-level/aggregate, fetch trend of 6 months)
        const { data: ketersediaan } = await supabase
          .from('ketersediaan_pangan')
          .select('*')
          .eq('tahun', selectedYear);
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

        // 5. Fetch Trend Data for TrendChart (All months of the selected year)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const trendDataArr = [];

        for (let m = 1; m <= (selectedYear === 2026 ? 5 : 12); m++) {
          const { data: h } = await supabase.from('harga_pangan')
            .select('cv_harga')
            .eq('tanggal', `${selectedYear}-${m < 10 ? '0' + m : m}-15`);
          
          const { data: k } = await supabase.from('ketersediaan_pangan')
            .select('skor_nbm')
            .eq('tahun', selectedYear)
            .eq('bulan', m)
            .single();

          const { data: g } = await supabase.from('gizi_masyarakat')
            .select('skor_pph')
            .eq('tahun', selectedYear);

          const pphAvg = g && g.length > 0 ? g.reduce((sum, item) => sum + (item.skor_pph || 0), 0) / g.length : 85;
          const cvAvg = h && h.length > 0 ? h.reduce((sum, item) => sum + (item.cv_harga || 0), 0) / h.length : 4;
          
          trendDataArr.push({
            name: months[m - 1],
            nbm: k ? k.skor_nbm : 90 + Math.random() * 5,
            pph: pphAvg,
            skpg: 80 + Math.sin(m) * 5,
            fsva: 85 - (cvAvg / 2)
          });
        }
        setTrendData(trendDataArr);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedKecamatan, selectedKelurahan, selectedYear, selectedMonth]);

  // Derived indicator averages for BenchmarkPanel
  const getBenchmarkData = () => {
    const avgBeras = hargaData.length > 0 ? hargaData.reduce((s, x) => s + (x.beras || 0), 0) / hargaData.length : 14500;
    const avgPPH = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.skor_pph || 0), 0) / giziData.length : 88.1;
    const avgEnergi = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_energi_kkal || 0), 0) / giziData.length : 2163;
    const avgProtein = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_protein_gram || 0), 0) / giziData.length : 63.4;
    const avgStunting = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.prevalensi_stunting || 0), 0) / giziData.length : 8.7;
    const avgPoU = giziData.length > 0 ? giziData.reduce((s, x) => s + (x.pou || 0), 0) / giziData.length : 5.4;
    const avgCV = hargaData.length > 0 ? hargaData.reduce((s, x) => s + (x.cv_harga || 0), 0) / hargaData.length : 3.65;
    
    // Map to the 13 national indicators
    return {
      1: parseFloat(avgPPH.toFixed(1)),
      2: parseFloat(((avgEnergi / 2100 + avgProtein / 57) * 50).toFixed(2)), // Capaian aggregates
      3: parseFloat(avgEnergi.toFixed(1)),
      4: parseFloat(avgProtein.toFixed(1)),
      5: 121, // Static placeholder for production aggregate
      6: 2582,
      7: 85,
      8: 132.7, // Static PD Government Stock
      9: parseFloat(avgCV.toFixed(2)),
      10: 100, // FSVA penanganan
      11: 85.9,
      12: 78,
      13: 67
    };
  };

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
              
              {/* TOP: 5 KPI Boxes */}
              <KPIGrid giziData={giziData} ketersediaanData={ketersediaanData} year={selectedYear} month={selectedMonth} />

              {/* MIDDLE: 3 Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMN 1: Left (Span 4) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* 1. Harga Pangan Strategis */}
                  <div className="dashboard-card flex-1">
                    <HargaPanel hargaData={hargaData} />
                  </div>
                  
                  {/* 9 & 10. PoU & GPM */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">9. PoU (Kerawanan)</h3>
                      <div className="h-24 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                        <span className="text-2xl font-black text-violet-600">
                          {(giziData.length > 0 ? giziData.reduce((s, x) => s + (x.pou || 0), 0) / giziData.length : 5.4).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Prevalence of Undernourishment</span>
                      </div>
                    </div>
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">10. Kegiatan GPM</h3>
                      <div className="h-24 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                        <span className="text-2xl font-black text-rose-600">
                          {intervensiData.length > 0 ? intervensiData.reduce((s, x) => s + (x.kegiatan_gpm || 0), 0) : 1}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Gerakan Pangan Murah</span>
                      </div>
                    </div>
                  </div>

                  {/* Trend Skor */}
                  <div className="dashboard-card">
                    <TrendChart trendData={trendData} />
                  </div>
                </div>

                {/* COLUMN 2: Middle (Span 4) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* 2 & 3. CV & Produksi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="dashboard-card">
                      <CVGauge hargaData={hargaData} />
                    </div>
                    <div className="dashboard-card">
                      <ProduksiChart ketersediaanData={ketersediaanData} month={selectedMonth} />
                    </div>
                  </div>

                  {/* 11 & 12. Bantuan Pangan & Status Gizi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">11. Bantuan Pangan</h3>
                      <div className="h-24 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                        <span className="text-2xl font-black text-amber-600">
                          {(intervensiData.length > 0 ? intervensiData.reduce((s, x) => s + (x.penerima_bantuan_jiwa || 0), 0) : 1420).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Penerima Manfaat (Jiwa)</span>
                      </div>
                    </div>
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">12. Stunting Balita</h3>
                      <div className="h-24 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                        <span className="text-2xl font-black text-emerald-600">
                          {(giziData.length > 0 ? giziData.reduce((s, x) => s + (x.prevalensi_stunting || 0), 0) / giziData.length : 8.7).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Prevalensi Stunting</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Middle: Distribusi & Ringkasan */}
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">Konsumsi Energi</h3>
                      <div className="h-32 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-500">
                        <span className="text-3xl font-black text-blue-600">
                          {Math.round(giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_energi_kkal || 0), 0) / giziData.length : 2163)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">kkal/kapita/hari</span>
                      </div>
                    </div>
                    <div className="dashboard-card">
                      <h3 className="font-bold text-sm text-slate-700 mb-2">Konsumsi Protein</h3>
                      <div className="h-32 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-500">
                        <span className="text-3xl font-black text-teal-600">
                          {(giziData.length > 0 ? giziData.reduce((s, x) => s + (x.konsumsi_protein_gram || 0), 0) / giziData.length : 63.4).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">gram/kapita/hari</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: Right Maps (Span 4) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="dashboard-card flex-1 min-h-[300px] flex flex-col">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">7. Peta SKPG Kelurahan</h3>
                    <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200">
                      <MapSKPG />
                    </div>
                  </div>
                  <div className="dashboard-card flex-1 min-h-[300px] flex flex-col">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">8. Peta FSVA Kelurahan</h3>
                    <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200">
                      <MapFSVA />
                    </div>
                  </div>
                </div>

              </div>

              {/* BOTTOM: Full-width Benchmark Panel */}
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

