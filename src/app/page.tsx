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
import { supabase } from '@/lib/supabase';
import { WILAYAH } from '@/lib/wilayah';
import { BENCHMARKS } from '@/lib/benchmark';
import MediaCarousel from '@/components/MediaCarousel';
import dynamic from 'next/dynamic';

// Lazy-load heavier panels and view modules to optimize mobile bundle load time
const KerawananPanel = dynamic(() => import('@/components/KerawananPanel'), { ssr: false });
const BalitaDoughnut = dynamic(() => import('@/components/BalitaDoughnut'), { ssr: false });
const ProduksiLokalChart = dynamic(() => import('@/components/ProduksiLokalChart'), { ssr: false });
const HargaPanel = dynamic(() => import('@/components/HargaPanel'), { ssr: false });
const ForecastPanel = dynamic(() => import('@/components/ForecastPanel'), { ssr: false });
const PoUTrendChart = dynamic(() => import('@/components/PoUTrendChart'), { ssr: false });
const IKPTrendChart = dynamic(() => import('@/components/IKPTrendChart'), { ssr: false });
const BenchmarkPanel = dynamic(() => import('@/components/BenchmarkPanel'), { ssr: false });
const AIInsightPanel = dynamic(() => import('@/components/AIInsightPanel'), { ssr: false });
const AnalisisSKPG = dynamic(() => import('@/components/AnalisisSKPG'), { ssr: false });
const AnalisisSKPGKelurahan = dynamic(() => import('@/components/AnalisisSKPGKelurahan'), { ssr: false });
const TentangAplikasi = dynamic(() => import('@/components/TentangAplikasi'), { ssr: false });
const ForecastView = dynamic(() => import('@/components/ForecastView'), { ssr: false });
const ValidasiForecastView = dynamic(() => import('@/components/ValidasiForecastView'), { ssr: false });
const VisitCounter = dynamic(() => import('@/components/VisitCounter'), { ssr: false });
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft, Brain, BarChart3, TrendingUp, Package, Utensils, Leaf, FileText, Info } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, LabelList } from 'recharts';

interface MiniBenchmarkChartProps {
  indicatorNo: number;
  currentValue: number;
  unit: string;
  nationalStandard: number | string | null;
  colorTheme?: 'emerald' | 'blue' | 'purple';
}

function MiniBenchmarkChart({ indicatorNo, currentValue, unit, nationalStandard, colorTheme = 'emerald' }: MiniBenchmarkChartProps) {
  const indicator = BENCHMARKS.find(x => x.no === indicatorNo);
  if (!indicator) return null;

  const data = [
    { year: '2021', value: indicator.history['2021'] },
    { year: '2022', value: indicator.history['2022'] },
    { year: '2023', value: indicator.history['2023'] },
    { year: '2024', value: indicator.history['2024'] },
    { year: '2025', value: currentValue }
  ];

  const colors = {
    emerald: {
      stroke: '#10B981',
      fill: 'url(#gradient-emerald)',
      dot: '#10B981'
    },
    blue: {
      stroke: '#3B82F6',
      fill: 'url(#gradient-blue)',
      dot: '#3B82F6'
    },
    purple: {
      stroke: '#8B5CF6',
      fill: 'url(#gradient-purple)',
      dot: '#8B5CF6'
    }
  };

  const activeColor = colors[colorTheme];
  const numericStandard = typeof nationalStandard === 'number' ? nationalStandard : null;

  return (
    <div className="w-full h-[180px] relative">
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="gradient-emerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
          </linearGradient>
          <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
          </linearGradient>
          <linearGradient id="gradient-purple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="year" 
            stroke="#94A3B8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94A3B8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            domain={['auto', 'auto']}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg border border-slate-800 shadow-xl text-[10px] font-semibold">
                    <p className="text-slate-400">Tahun {payload[0].payload.year}</p>
                    <p className="text-emerald-400 mt-0.5">{payload[0].value} {unit}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            fill={activeColor.fill} 
            stroke="none" 
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={activeColor.stroke} 
            strokeWidth={2.5} 
            dot={{ r: 4, fill: activeColor.dot, strokeWidth: 1.5, stroke: '#fff' }} 
            activeDot={{ r: 6 }} 
          >
            <LabelList dataKey="value" position="top" style={{ fontSize: '8px', fill: activeColor.stroke, fontWeight: 'bold' }} offset={8} />
          </Line>
          {numericStandard && (
            <ReferenceLine 
              y={numericStandard} 
              stroke="#EF4444" 
              strokeDasharray="4 4" 
              label={{ 
                value: indicatorNo === 8 ? `Target RPJMD: ${numericStandard}` : `Standar: ${numericStandard}`, 
                position: 'top', 
                fill: '#EF4444', 
                fontSize: 9,
                fontWeight: 'bold'
              }} 
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function getSubViewInsights(view: string, values: any) {
  if (view === 'ketersediaan') {
    return {
      energi: [
        `Penyediaan energi pangan Kota Cilegon saat ini berada pada **${values.ketersediaanEnergi} kkal/kapita/hari**, melampaui standar kecukupan nasional (2400 kkal).`,
        `Stok pangan didukung oleh kelancaran distribusi logistik melalui Pelabuhan Merak dan kerja sama antar daerah (KAD) dengan wilayah produsen utama.`,
        `Rekomendasi: Optimalisasi rantai pasok komoditas pokok dan pengawasan pergudangan untuk menjaga stabilitas ketersediaan energi sepanjang tahun.`
      ],
      protein: [
        `Ketersediaan protein hewani dan nabati tercatat sebesar **${values.ketersediaanProtein} gram/kapita/hari**, di atas standar minimal nasional sebesar 63 gram.`,
        `Pasokan protein didominasi dari sektor perikanan tangkap Selat Sunda dan distribusi daging serta telur ayam ras yang stabil.`,
        `Rekomendasi: Dorong diversifikasi konsumsi protein lokal non-beras melalui kampanye pangan B2SA (Beragam, Bergizi Seimbang, dan Aman).`
      ],
      cppd: [
        `Cadangan Pangan Pemerintah Daerah (CPPD) Kota Cilegon saat ini mencapai **${values.cppd} Ton**, melebihi Target RPJMD (115 Ton).`,
        `Cadangan ini disimpan secara aman di gudang Bulog dan siap dimobilisasi untuk penanganan darurat bencana serta intervensi kerawanan pangan.`,
        `Rekomendasi: Pemeliharaan kualitas fisik beras cadangan secara berkala guna meminimalkan penyusutan kadar nutrisi.`
      ]
    };
  }
  
  if (view === 'keterjangkauan') {
    return [
      `Koefisien Variasi (CV) harga beras tercatat sebesar **${values.cvBeras}%**, menunjukkan stabilitas harga yang sangat baik (di bawah ambang batas nasional 10%).`,
      `Intervensi pasar berkala, seperti Gerakan Pangan Murah (GPM) dan penyaluran bantuan pangan, terbukti efektif menekan lonjakan harga beras di tingkat pengecer.`,
      `Rekomendasi: Lanjutkan pemantauan harga harian secara real-time melalui integrasi aplikasi SAGON untuk deteksi dini anomali harga komoditas strategis.`
    ];
  }
  
  if (view === 'pemanfaatan') {
    const prevalensi = values.balitaTotal > 0 ? ((values.balitaKurang / values.balitaTotal) * 100).toFixed(2) : '3.47';
    return {
      balita: [
        `Tingkat prevalensi balita gizi kurang di wilayah sasaran tercatat sebesar **${prevalensi}%**, dengan kategori status ketahanan **${values.balitaStatus}**.`,
        `Pemerintah Kota Cilegon secara intensif melaksanakan program Pemberian Makanan Tambahan (PMT) berbahan pangan lokal di posyandu kelurahan prioritas.`,
        `Rekomendasi: Sinergitas program intervensi spesifik stunting lintas sektor guna menekan angka gizi kurang hingga batas minimal.`
      ],
      energi: [
        `Rata-rata konsumsi energi masyarakat berada pada level **${values.konsumsiEnergi} kkal/kapita/hari**, mendekati target kecukupan 2100 kkal.`,
        `Pola konsumsi masih didominasi oleh karbohidrat padi-padian, memerlukan akselerasi konsumsi sayuran dan umbi-umbian.`,
        `Rekomendasi: Sosialisasi pola pangan sehat B2SA untuk mengurangi ketergantungan konsumsi beras.`
      ],
      protein: [
        `Konsumsi protein masyarakat tercatat sebesar **${values.konsumsiProtein} gram/kapita/hari**, melampaui standar kecukupan nasional sebesar 57 gram.`,
        `Meningkatnya daya beli dan kesadaran gizi mendorong konsumsi protein hewani (ikan, telur, dan daging unggas) di perkotaan.`,
        `Rekomendasi: Program promosi konsumsi pangan kaya protein hewani bagi ibu hamil dan balita untuk pencegahan stunting.`
      ]
    };
  }
  
  return null;
}

const MapUnified = dynamic(() => import('@/components/MapUnified'), { 
  loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded text-slate-400 flex items-center justify-center text-xs">Memuat Peta...</div>, 
  ssr: false 
});

const loadingTips = [
  "Menyelaraskan harga pangan real-time dari pasar tradisional...",
  "Mengevaluasi indeks kerentanan pangan (FSVA) tingkat kelurahan...",
  "Mengalkulasi parameter peramalan harga berbasis Machine Learning...",
  "Menghitung ketersediaan energi dan protein konsumsi Kota Cilegon...",
  "Menganalisis peta kerawanan pangan spasial Kota Cilegon...",
  "Mengolah data gizi balita dari posyandu kelurahan..."
];

export default function DashboardPage() {
  // Navigation State
  const [currentView, setCurrentViewRaw] = useState<string>('beranda');
  
  const setCurrentView = (newView: string) => {
    setCurrentViewRaw(newView);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newView === 'beranda') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', newView);
      }
      const currentUrlParam = new URLSearchParams(window.location.search).get('view') || 'beranda';
      if (currentUrlParam !== newView) {
        window.history.pushState({ view: newView }, '', url.pathname + url.search);
      }
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

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
  const [intervensiData, setIntervensiData] = useState<any[]>([]);
  const [balitaDataRaw, setBalitaDataRaw] = useState<any[]>([]);
  const [fsvaMatangData, setFsvaMatangData] = useState<any[]>([]);
  const [skpgMatangData, setSkpgMatangData] = useState<any[]>([]);
  const [pouData, setPouData] = useState<any[]>([]);
  const [ikpData, setIkpData] = useState<any[]>([]);

  // New Data States for the annual indicators
  const [cvBerasList, setCvBerasList] = useState<any[]>([]);
  const [cvBerasBulananList, setCvBerasBulananList] = useState<any[]>([]);
  const [pphList, setPphList] = useState<any[]>([]);
  const [konsumsiEnergiList, setKonsumsiEnergiList] = useState<any[]>([]);
  const [konsumsiProteinList, setKonsumsiProteinList] = useState<any[]>([]);
  const [ketersediaanEnergiList, setKetersediaanEnergiList] = useState<any[]>([]);
  const [ketersediaanProteinList, setKetersediaanProteinList] = useState<any[]>([]);
  const [produksiBerasList, setProduksiBerasList] = useState<any[]>([]);
  const [benchmarkList, setBenchmarkList] = useState<any[]>([]);

  // Latest Year/Month states for KPIs
  const [cvLatestYear, setCvLatestYear] = useState<number>(2025);
  const [pphLatestYear, setPphLatestYear] = useState<number>(2025);
  const [kProteinLatestYear, setKonsumsiProteinLatestYear] = useState<number>(2025);
  const [kEnergiLatestYear, setKEnergiLatestYear] = useState<number>(2025);
  const [tProteinLatestYear, setTProteinLatestYear] = useState<number>(2025);
  const [tEnergiLatestYear, setTEnergiLatestYear] = useState<number>(2025);
  const [produksiLatestYear, setProduksiLatestYear] = useState<number>(2025);
  const [intervensiLatestYear, setIntervensiLatestYear] = useState<number>(2025);

  const [balitaLatestData, setBalitaLatestData] = useState<any[]>([]);
  const [balitaLatestYear, setBalitaLatestYear] = useState<number>(2026);
  const [balitaLatestMonth, setBalitaLatestMonth] = useState<number>(6);

  // Lifted SAGON Live Price States
  const [livePrices, setLivePrices] = useState<any>(null);
  const [liveDate, setLiveDate] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState<boolean>(true);

  const [activeTipIdx, setActiveTipIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setActiveTipIdx(prev => (prev + 1) % loadingTips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') || 'beranda';
        setCurrentViewRaw(viewParam);
      };

      // Initial check
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam) {
        setCurrentViewRaw(viewParam);
      }

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  // Carousel Slider States for Top row
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Touch Swipe States and Handlers for Mobile swipe capability
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50; // minimum 50px swipe
    
    if (distance > minSwipeDistance) {
      // Swipe left -> Next
      setSliderIndex(prev => Math.min(maxSliderIndex, prev + 1));
    } else if (distance < -minSwipeDistance) {
      // Swipe right -> Prev
      setSliderIndex(prev => Math.max(0, prev - 1));
    }
  };

  const [activeMobileIndex, setActiveMobileIndex] = useState<number>(0);

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const children = Array.from(container.children) as HTMLElement[];
    
    let closestIndex = 0;
    let minDiff = Infinity;
    const containerCenter = scrollLeft + containerWidth / 2;
    
    children.forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const diff = Math.abs(containerCenter - childCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    
    if (closestIndex !== activeMobileIndex) {
      setActiveMobileIndex(closestIndex);
    }
  };


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
        // Find latest month/year for BB/U status balita (which has total_balita > 0)
        let latestYearBalita = 2026;
        let latestMonthBalita = 6;
        try {
          const { data: latestBalitaPeriod } = await supabase
            .from('gizi_balita_skpg_kelurahan')
            .select('tahun, bulan')
            .gt('total_balita', 0)
            .order('tahun', { ascending: false })
            .order('bulan', { ascending: false })
            .limit(1);
          if (latestBalitaPeriod && latestBalitaPeriod.length > 0) {
            latestYearBalita = latestBalitaPeriod[0].tahun;
            latestMonthBalita = latestBalitaPeriod[0].bulan;
          }
        } catch (e) {
          console.warn('Failed to query latest balita period from gizi_balita_skpg_kelurahan:', e);
        }

        setBalitaLatestYear(latestYearBalita);
        setBalitaLatestMonth(latestMonthBalita);

        let latestIntYear = 2025;
        try {
          const { data: intYears } = await supabase.from('intervensi_kelurahan').select('tahun');
          if (intYears && intYears.length > 0) {
            latestIntYear = Math.max(...intYears.map((x: any) => x.tahun));
          }
        } catch (e) {
          console.warn('Failed to query intervensi years:', e);
        }
        setIntervensiLatestYear(latestIntYear);

        // 1. Fetch Harga Pangan dynamically from Sagon API (no DB dependency)
        let fetchMonth = selectedMonth;
        let fetchYear = selectedYear;

        // Fallback for current incomplete month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        const isBeforeLastDay = currentDay < lastDayOfMonth;

        if (selectedYear === currentYear && selectedMonth === currentMonth && isBeforeLastDay) {
          fetchMonth = selectedMonth - 1;
          if (fetchMonth === 0) {
            fetchMonth = 12;
            fetchYear = selectedYear - 1;
          }
        }

        // Define all promises to run in parallel
        const sagonPromise = (async () => {
          try {
            const sagonRes = await fetch(`/api/sagon-bulanan?month=${fetchMonth}&year=${fetchYear}`);
            if (sagonRes.ok) {
              const sagonJson = await sagonRes.json();
              return sagonJson;
            }
          } catch (err) {
            console.error('[Homepage] Failed to fetch sagon prices:', err);
          }
          return null;
        })();

        const ketersediaanPromise = (async () => {
          try {
            const { data } = await supabase.from('ketersediaan_pangan').select('*');
            return data || [];
          } catch (e) {
            console.warn('ketersediaan_pangan failed:', e);
            return [];
          }
        })();

        const intervensiPromise = (async () => {
          try {
            let intQuery = supabase.from('intervensi_kelurahan').select('*').eq('tahun', selectedYear).eq('bulan', selectedMonth);
            if (selectedKelurahan !== 'ALL') {
              intQuery = intQuery.eq('nama_kelurahan', selectedKelurahan);
            } else if (selectedKecamatan !== 'ALL') {
              intQuery = intQuery.eq('nama_kecamatan', selectedKecamatan.toUpperCase());
            }
            const { data: intervensi, error: intError } = await intQuery;

            if (!intError && intervensi && intervensi.length > 0) {
              return intervensi;
            } else {
              // Fallback 1: January of the selected year
              let fbQuery1 = supabase.from('intervensi_kelurahan').select('*').eq('tahun', selectedYear).eq('bulan', 1);
              if (selectedKelurahan !== 'ALL') {
                fbQuery1 = fbQuery1.eq('nama_kelurahan', selectedKelurahan);
              } else if (selectedKecamatan !== 'ALL') {
                fbQuery1 = fbQuery1.eq('nama_kecamatan', selectedKecamatan.toUpperCase());
              }
              const { data: fb1 } = await fbQuery1;

              if (fb1 && fb1.length > 0) {
                return fb1;
              } else {
                // Fallback 2: Year 2026 Month 1 (January)
                let fbQuery2 = supabase.from('intervensi_kelurahan').select('*').eq('tahun', 2026).eq('bulan', 1);
                if (selectedKelurahan !== 'ALL') {
                  fbQuery2 = fbQuery2.eq('nama_kelurahan', selectedKelurahan);
                } else if (selectedKecamatan !== 'ALL') {
                  fbQuery2 = fbQuery2.eq('nama_kecamatan', selectedKecamatan.toUpperCase());
                }
                const { data: fb2 } = await fbQuery2;
                return fb2 || [];
              }
            }
          } catch (e) {
            console.warn('intervensi fetch failed:', e);
            return [];
          }
        })();

        const fsvaPromise = (async () => {
          try {
            // Get latest FSVA year from database
            const { data: latestFsva } = await supabase
              .from('fsva_matang')
              .select('periode')
              .order('periode', { ascending: false })
              .limit(1);
            const latestFsvaYear = latestFsva && latestFsva.length > 0 ? latestFsva[0].periode : 2025;

            const { data: fsvaM, error } = await supabase.from('fsva_matang').select('*').eq('periode', latestFsvaYear);
            if (!error && fsvaM && fsvaM.length > 0) {
              return fsvaM;
            } else {
              return [];
            }
          } catch (e) {
            console.warn('fsva_matang query failed in page.tsx:', e);
            return [];
          }
        })();

        const skpgPromise = (async () => {
          try {
            // Fetch YTD average prevalences for the active year
            const averages: Record<string, number> = {};
            try {
              const { data: ytdRows } = await supabase
                .from('gizi_balita_skpg_kelurahan')
                .select('*')
                .eq('tahun', Number(selectedYear));
              
              if (ytdRows && ytdRows.length > 0) {
                const groups: Record<string, { sum: number; count: number }> = {};
                ytdRows.forEach(r => {
                  const total = (r.bb_sangat_kurang || 0) + (r.bb_kurang || 0) + (r.bb_normal || 0) + (r.bb_lebih || 0);
                  if (total > 0) {
                    const prev = ((r.bb_sangat_kurang || 0) + (r.bb_kurang || 0)) / total * 100;
                    if (!groups[r.kelurahan]) {
                      groups[r.kelurahan] = { sum: 0, count: 0 };
                    }
                    groups[r.kelurahan].sum += prev;
                    groups[r.kelurahan].count += 1;
                  }
                });
                Object.keys(groups).forEach(kel => {
                  averages[kel] = groups[kel].sum / groups[kel].count;
                });
              }
            } catch (eytd) {
              console.warn('Failed to calculate YTD averages in page.tsx:', eytd);
            }

            const { data: skpgRows, error } = await supabase
              .from('gizi_balita_skpg_kelurahan')
              .select('*')
              .eq('tahun', Number(selectedYear))
              .eq('bulan', Number(selectedMonth));
              
            if (!error && skpgRows && skpgRows.length > 0) {
              return skpgRows.map(r => ({
                nama_kelurahan: r.kelurahan,
                gizi_sangat_kurang: r.bb_sangat_kurang,
                gizi_kurang: r.bb_kurang,
                gizi_normal: r.bb_normal,
                gizi_berlebih: r.bb_lebih,
                periode: r.tahun,
                bulan: r.bulan,
                prevalensiRataRata: averages[r.kelurahan]
              }));
            } else {
              // Fallback to skpg_matang table
              const { data: skpgM, error: errFallback } = await supabase
                .from('skpg_matang')
                .select('*')
                .eq('periode', Number(selectedYear))
                .eq('bulan', Number(selectedMonth));
              if (!errFallback && skpgM && skpgM.length > 0) {
                return skpgM;
              }

              const { data: skpgMFallback } = await supabase
                .from('skpg_matang')
                .select('*')
                .eq('periode', Number(selectedYear));
              return skpgMFallback || [];
            }
          } catch (e) {
            console.warn('skpg fetch failed in page.tsx:', e);
            return [];
          }
        })();

        const balitaPromise = (async () => {
          try {
            let balitaQuery = supabase.from('gizi_balita').select('*').eq('tahun', selectedYear).eq('bulan', selectedMonth);
            
            if (selectedKelurahan !== 'ALL') {
              balitaQuery = balitaQuery.eq('nama_kelurahan', selectedKelurahan);
            } else if (selectedKecamatan !== 'ALL') {
              const kels = WILAYAH[selectedKecamatan] || [];
              if (kels.length > 0) {
                balitaQuery = balitaQuery.in('nama_kelurahan', kels);
              }
            }
            
            const { data, error } = await balitaQuery;
            let balita = data;
            
            if ((!balita || balita.length === 0) && !error) {
              let fbQuery = supabase.from('gizi_balita').select('*').eq('tahun', selectedYear).eq('bulan', 1);
              if (selectedKelurahan !== 'ALL') {
                fbQuery = fbQuery.eq('nama_kelurahan', selectedKelurahan);
              } else if (selectedKecamatan !== 'ALL') {
                const kels = WILAYAH[selectedKecamatan] || [];
                if (kels.length > 0) {
                  fbQuery = fbQuery.in('nama_kelurahan', kels);
                }
              }
              const { data: fb } = await fbQuery;
              balita = fb;
            }

            if (!error && balita && balita.length > 0) {
              return balita;
            }
          } catch (e) {
            console.warn('gizi_balita fetch failed, falling back to balita_gizi:', e);
          }

          // Fallback to old balita_gizi kecamatan table
          try {
            let balitaQuery = supabase.from('balita_gizi').select('*').eq('tahun', selectedYear).eq('bulan', selectedMonth);
            if (selectedKecamatan !== 'ALL') {
              balitaQuery = balitaQuery.eq('kecamatan', selectedKecamatan);
            }
            const { data: balita } = await balitaQuery;
            return balita || [];
          } catch (e) {
            console.warn('balita_gizi fallback fetch failed:', e);
            return [];
          }
        })();

        const pouPromise = (async () => {
          try {
            const { data } = await supabase.from('pou_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('pou_data failed:', e);
            return [];
          }
        })();

        const ikpPromise = (async () => {
          try {
            const { data } = await supabase.from('ikp_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('ikp_data failed:', e);
            return [];
          }
        })();

        const cvBerasPromise = (async () => {
          try {
            const { data } = await supabase.from('cv_beras_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('cv_beras_data failed:', e);
            return [];
          }
        })();

        const cvBerasBulananPromise = (async () => {
          try {
            const { data } = await supabase.from('cv_beras_bulanan').select('*').order('tahun', { ascending: true }).order('bulan', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('cv_beras_bulanan failed:', e);
            return [];
          }
        })();

        const pphPromise = (async () => {
          try {
            const { data } = await supabase.from('pph_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('pph_data failed:', e);
            return [];
          }
        })();

        const konsumsiEnergiPromise = (async () => {
          try {
            const { data } = await supabase.from('konsumsi_energi_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('konsumsi_energi_data failed:', e);
            return [];
          }
        })();

        const konsumsiProteinPromise = (async () => {
          try {
            const { data } = await supabase.from('konsumsi_protein_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('konsumsi_protein_data failed:', e);
            return [];
          }
        })();

        const ketersediaanEnergiPromise = (async () => {
          try {
            const { data } = await supabase.from('ketersediaan_energi_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('ketersediaan_energi_data failed:', e);
            return [];
          }
        })();

        const ketersediaanProteinPromise = (async () => {
          try {
            const { data } = await supabase.from('ketersediaan_protein_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('ketersediaan_protein_data failed:', e);
            return [];
          }
        })();

        const produksiBerasPromise = (async () => {
          try {
            const { data } = await supabase.from('produksi_beras_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('produksi_beras_data failed:', e);
            return [];
          }
        })();

        const benchmarkPromise = (async () => {
          try {
            const { data } = await supabase.from('benchmark_data').select('*').order('tahun', { ascending: true });
            return data || [];
          } catch (e) {
            console.warn('benchmark_data failed:', e);
            return [];
          }
        })();

        const balitaLatestPromise = (async () => {
          try {
            const { data } = await supabase
              .from('gizi_balita_skpg_kelurahan')
              .select('*')
              .eq('tahun', latestYearBalita)
              .eq('bulan', latestMonthBalita);
            return data || [];
          } catch (e) {
            console.warn('gizi_balita_skpg_kelurahan latest fetch failed:', e);
            return [];
          }
        })();

        // Resolve all concurrently
        const [
          sagonJson,
          ketersediaanResult,
          intervensiResult,
          fsvaResult,
          skpgResult,
          balitaResult,
          pouResult,
          ikpResult,
          cvBerasResult,
          pphResult,
          konsumsiEnergiResult,
          konsumsiProteinResult,
          ketersediaanEnergiResult,
          ketersediaanProteinResult,
          produksiBerasResult,
          benchmarkResult,
          balitaLatestResult,
          cvBerasBulananResult
        ] = await Promise.all([
          sagonPromise,
          ketersediaanPromise,
          intervensiPromise,
          fsvaPromise,
          skpgPromise,
          balitaPromise,
          pouPromise,
          ikpPromise,
          cvBerasPromise,
          pphPromise,
          konsumsiEnergiPromise,
          konsumsiProteinPromise,
          ketersediaanEnergiPromise,
          ketersediaanProteinPromise,
          produksiBerasPromise,
          benchmarkPromise,
          balitaLatestPromise,
          cvBerasBulananPromise
        ]);

        // Process sagon price formatting
        if (sagonJson && sagonJson.success) {
          const pricesCur = sagonJson.pricesCur || {};
          const pricesPrev = sagonJson.pricesPrev || {};

          const normKec = (k: string) => k.toLowerCase().replace(/\s+/g, '');
          const filteredKecsCur = Object.keys(pricesCur).filter(
            kec => selectedKecamatan === 'ALL' || normKec(kec) === normKec(selectedKecamatan)
          );
          const filteredKecsPrev = Object.keys(pricesPrev).filter(
            kec => selectedKecamatan === 'ALL' || normKec(kec) === normKec(selectedKecamatan)
          );

          const formattedHarga = filteredKecsCur.map(kec => ({
            kecamatan: kec,
            kelurahan: kec,
            beras: pricesCur[kec].beras,
            minyak_goreng: pricesCur[kec].minyak,
            telur: pricesCur[kec].telur,
            daging_ayam: 36000,
            gula_pasir: 17000,
            cabe_merah: 55000
          }));

          const formattedHargaPrev = filteredKecsPrev.map(kec => ({
            kecamatan: kec,
            kelurahan: kec,
            beras: pricesPrev[kec].beras,
            minyak_goreng: pricesPrev[kec].minyak,
            telur: pricesPrev[kec].telur,
            daging_ayam: 36000,
            gula_pasir: 17000,
            cabe_merah: 55000
          }));

          setHargaData(formattedHarga);
          setPreviousHargaData(formattedHargaPrev);
        } else {
          setHargaData([]);
          setPreviousHargaData([]);
        }

        // Set state for other variables
        setKetersediaanData(ketersediaanResult);
        setIntervensiData(intervensiResult);
        setFsvaMatangData(fsvaResult);
        setSkpgMatangData(skpgResult);
        setBalitaDataRaw(balitaResult);
        setPouData(pouResult);
        setIkpData(ikpResult);
        setCvBerasList(cvBerasResult);
        setCvBerasBulananList(cvBerasBulananResult || []);
        setPphList(pphResult);
        setKonsumsiEnergiList(konsumsiEnergiResult);
        setKonsumsiProteinList(konsumsiProteinResult);
        setKetersediaanEnergiList(ketersediaanEnergiResult);
        setKetersediaanProteinList(ketersediaanProteinResult);
        setProduksiBerasList(produksiBerasResult);
        setBenchmarkList(benchmarkResult);

        // Extract latest years for target indicator titles dynamically
        setCvLatestYear(cvBerasResult.length > 0 ? Math.max(...cvBerasResult.map((x: any) => x.tahun)) : 2025);
        setPphLatestYear(pphResult.length > 0 ? Math.max(...pphResult.map((x: any) => x.tahun)) : 2025);
        setKonsumsiProteinLatestYear(konsumsiProteinResult.length > 0 ? Math.max(...konsumsiProteinResult.map((x: any) => x.tahun)) : 2025);
        setKEnergiLatestYear(konsumsiEnergiResult.length > 0 ? Math.max(...konsumsiEnergiResult.map((x: any) => x.tahun)) : 2025);
        setTProteinLatestYear(ketersediaanProteinResult.length > 0 ? Math.max(...ketersediaanProteinResult.map((x: any) => x.tahun)) : 2025);
        setTEnergiLatestYear(ketersediaanEnergiResult.length > 0 ? Math.max(...ketersediaanEnergiResult.map((x: any) => x.tahun)) : 2025);
        setProduksiLatestYear(produksiBerasResult.length > 0 ? Math.max(...produksiBerasResult.map((x: any) => x.tahun)) : 2025);
        
        setBalitaLatestData(balitaLatestResult);

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
    let entry = cvBerasList.find(x => x.tahun === selectedYear);
    if (!entry) entry = cvBerasList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 3.65;
  };

  const getCVBulananValue = () => {
    let entry = cvBerasBulananList.find(x => x.tahun === 2026 && x.bulan === 6);
    if (entry) return parseFloat(entry.cilegon);
    return 2.08;
  };

  const getPPHValue = () => {
    let entry = pphList.find(x => x.tahun === selectedYear);
    if (!entry) entry = pphList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 90.9;
  };

  const getKonsumsiEnergiValue = () => {
    let entry = konsumsiEnergiList.find(x => x.tahun === selectedYear);
    if (!entry) entry = konsumsiEnergiList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 2021;
  };

  const getKonsumsiProteinValue = () => {
    let entry = konsumsiProteinList.find(x => x.tahun === selectedYear);
    if (!entry) entry = konsumsiProteinList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 59;
  };

  const getKetersediaanEnergiValue = () => {
    let entry = ketersediaanEnergiList.find(x => x.tahun === selectedYear);
    if (!entry) entry = ketersediaanEnergiList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 2582;
  };

  const getKetersediaanProteinValue = () => {
    let entry = ketersediaanProteinList.find(x => x.tahun === selectedYear);
    if (!entry) entry = ketersediaanProteinList.find(x => x.tahun === 2025);
    if (entry) return parseFloat(entry.cilegon);
    return 85;
  };


  // Dynamic Balita computed calculations
  const getBalitaData = () => {
    if (!balitaDataRaw || balitaDataRaw.length === 0) {
      return { sangatKurang: 232, kurang: 946, normal: 25044, lebih: 1064, total: 27286, status: 'AMAN' };
    }
    const sangatKurang = balitaDataRaw.reduce((s, x) => s + (x.gizi_sangat_kurang !== undefined ? x.gizi_sangat_kurang : (x.sangat_kurang || 0)), 0);
    const kurang = balitaDataRaw.reduce((s, x) => s + (x.gizi_kurang !== undefined ? x.gizi_kurang : (x.kurang || 0)), 0);
    const normal = balitaDataRaw.reduce((s, x) => s + (x.gizi_normal !== undefined ? x.gizi_normal : (x.normal || 0)), 0);
    const lebih = balitaDataRaw.reduce((s, x) => s + (x.gizi_berlebih !== undefined ? x.gizi_berlebih : (x.lebih || 0)), 0);
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

  const getBalitaLatestComputed = () => {
    if (!balitaLatestData || balitaLatestData.length === 0) {
      return { sangatKurang: 232, kurang: 946, normal: 25044, lebih: 1064, total: 27286, status: 'AMAN', tahun: balitaLatestYear, bulan: balitaLatestMonth };
    }
    const sangatKurang = balitaLatestData.reduce((s, x) => s + (x.bb_sangat_kurang || 0), 0);
    const kurang = balitaLatestData.reduce((s, x) => s + (x.bb_kurang || 0), 0);
    const normal = balitaLatestData.reduce((s, x) => s + (x.bb_normal || 0), 0);
    const lebih = balitaLatestData.reduce((s, x) => s + (x.bb_lebih || 0), 0);
    const total = sangatKurang + kurang + normal + lebih;
    const totalKurang = sangatKurang + kurang;
    const pct = total > 0 ? (totalKurang / total) * 100 : 0;
    const status = pct > 15 ? 'RENTAN' : (pct >= 10 ? 'WASPADA' : 'AMAN');
    return {
      sangatKurang,
      kurang,
      normal,
      lebih,
      total,
      status,
      tahun: balitaLatestYear,
      bulan: balitaLatestMonth
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
      8: 174,
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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans relative">
      {/* Mobile Sidebar sliding drawer */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        {/* Drawer Content */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-64 max-w-[280px] bg-gradient-to-b from-[#2d6a4f] via-[#1b4332] to-[#081c15] shadow-2xl transition-transform duration-300 ease-out transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Close button inside mobile sidebar drawer */}
          <div className="absolute right-4 top-6 z-50">
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
              aria-label="Close Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Sidebar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            isMobile={true} 
            onCloseMobile={() => setIsMobileSidebarOpen(false)} 
          />
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <div className={`hidden lg:block shrink-0 bg-gradient-to-b from-[#2d6a4f] via-[#1b4332] to-[#081c15] text-white shadow-xl z-20 print:hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        
        {/* Eye-catching Professional Green Gradient Header Wrapper (Mockup Match) */}
        <div className="bg-gradient-to-r from-[#03593b] via-[#047857] to-[#10b981] text-white print:hidden pb-1 shadow-md relative z-10 border-b border-emerald-800/10">
          <Navbar 
            selectedKecamatan={selectedKecamatan}
            setSelectedKecamatan={setSelectedKecamatan}
            selectedKelurahan={selectedKelurahan}
            setSelectedKelurahan={setSelectedKelurahan}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px] px-4">
              <style>{`
                @keyframes loadingBar {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>
              <div className="w-full max-w-md bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] backdrop-blur-md border border-[#E9E4D5] rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
                {/* Modern Pulse / Humanist animated icon */}
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                  <Leaf className="w-8 h-8 text-emerald-600" />
                </div>

                <h3 className="text-slate-800 font-bold text-lg mb-1 tracking-tight">Memuat Data</h3>
                <p className="text-slate-400 text-xs mb-6 font-medium">Sistem Intelijen Ketahanan Pangan Kota Cilegon</p>

                {/* Premium Gradient Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4 relative border border-slate-200/50">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500"
                    style={{
                      width: '100%',
                      backgroundSize: '200% 200%',
                      animation: 'loadingBar 2s ease infinite'
                    }}
                  />
                </div>

                {/* Rotating Educational Tips / Status */}
                <div className="h-10 flex items-center justify-center">
                  <p className="text-emerald-700 text-sm font-medium transition-all duration-500 ease-in-out">
                    {loadingTips[activeTipIdx]}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-6">
              
              {currentView === 'beranda' && (
                <>
                  {/* INFORMASI & DOKUMENTASI (Hero Media Carousel) */}
                  <MediaCarousel />

                  {/* Title Header for KPI Carousel */}
                  <div className="flex items-center gap-2 px-1 print:px-0 mb-3">
                    <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      KEY PERFORMANCE INDICATOR (KPI) KETAHANAN PANGAN CILEGON 2025
                    </h2>
                  </div>
                  
                  {/* 1. Desktop KPI Carousel (lg:flex, print:flex, hidden on mobile) */}
                  <div className="hidden lg:flex print:flex relative w-full items-center group px-10 print:px-0">
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
                    <div 
                      className="w-full overflow-hidden py-1 print:overflow-visible select-none cursor-grab active:cursor-grabbing"
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      <div 
                        className="flex transition-transform duration-500 ease-in-out print:grid print:grid-cols-10 print:gap-2 print:!transform-none print:w-full print:h-auto"
                        style={{ 
                          transform: `translateX(-${sliderIndex * (100 / visibleCount)}%)` 
                        }}
                      >
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <CVGauge value={getCVBulananValue()} year="Juni 2026" isBulanan={true} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <CVGauge value={getCVValue()} year={cvLatestYear} isBulanan={false} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <PPHGauge value={getPPHValue()} year={pphLatestYear} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <ProteinGauge value={getKonsumsiProteinValue()} year={kProteinLatestYear} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <EnergiGauge value={getKonsumsiEnergiValue()} year={kEnergiLatestYear} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <KetersediaanProteinGauge value={getKetersediaanProteinValue()} year={tProteinLatestYear} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-2 print:px-1 print:h-[270px]">
                          <KetersediaanEnergiGauge value={getKetersediaanEnergiValue()} year={tEnergiLatestYear} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-3 print:px-1 print:h-[270px]">
                          <BalitaDoughnut balitaData={getBalitaLatestComputed()} />
                        </div>
                        <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 shrink-0 px-2 h-[260px] print:w-full print:col-span-3 print:px-1 print:h-[270px]">
                          <ProduksiLokalChart produksiBerasData={produksiBerasList} selectedYear={selectedYear} selectedMonth={selectedMonth} year={produksiLatestYear} />
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

                  {/* 2. Mobile/Android KPI Carousel (lg:hidden, block on mobile) */}
                  <div className="block lg:hidden w-full relative print:hidden">
                    {/* The snap scroll container */}
                    <div 
                      onScroll={handleMobileScroll}
                      className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth w-full px-[15vw] py-4 gap-4 no-scrollbar animate-in fade-in duration-300"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {/* Card 1 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 0 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <CVGauge value={getCVBulananValue()} year="Juni 2026" isBulanan={true} />
                      </div>
                      
                      {/* Card 2 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 1 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <CVGauge value={getCVValue()} year={cvLatestYear} isBulanan={false} />
                      </div>
                      
                      {/* Card 3 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 2 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <PPHGauge value={getPPHValue()} year={pphLatestYear} />
                      </div>
                      
                      {/* Card 4 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 3 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <ProteinGauge value={getKonsumsiProteinValue()} year={kProteinLatestYear} />
                      </div>
                      
                      {/* Card 5 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 4 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <EnergiGauge value={getKonsumsiEnergiValue()} year={kEnergiLatestYear} />
                      </div>
                      
                      {/* Card 6 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 5 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <KetersediaanProteinGauge value={getKetersediaanProteinValue()} year={tProteinLatestYear} />
                      </div>
                      
                      {/* Card 7 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 6 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <KetersediaanEnergiGauge value={getKetersediaanEnergiValue()} year={tEnergiLatestYear} />
                      </div>
                      
                      {/* Card 8 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 7 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <BalitaDoughnut balitaData={getBalitaLatestComputed()} />
                      </div>
                      
                      {/* Card 9 */}
                      <div className={`w-[70vw] shrink-0 snap-center transition-all duration-300 ease-out transform ${activeMobileIndex === 8 ? 'scale-100 opacity-100 z-10' : 'scale-85 opacity-60'} h-[260px]`}>
                        <ProduksiLokalChart produksiBerasData={produksiBerasList} selectedYear={selectedYear} selectedMonth={selectedMonth} year={produksiLatestYear} />
                      </div>
                    </div>

                    {/* Dynamic Dot Indicators */}
                    <div className="flex justify-center gap-1.5 mt-2">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <span 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all duration-300 ${activeMobileIndex === idx ? 'w-4 bg-emerald-600' : 'w-1.5 bg-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Section: Early Warning System */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4 print:mt-6">
                      {/* Column 1: Harga Panel (Span 4) */}
                      <div id="panel-harga" className="lg:col-span-4 flex flex-col print:col-span-5 scroll-mt-20">
                        <div className="mb-2.5 flex flex-col justify-end min-h-[38px]">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0"></div>
                            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-none uppercase tracking-wide">
                              PANEL HARGA PANGAN STRATEGIS
                            </h3>
                          </div>
                        </div>

                        <div className="dashboard-card border border-[#E9E4D5] bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] flex-1 min-h-[420px] flex flex-col print:h-[380px] print:min-h-0">
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
                      <div id="panel-peta" className="lg:col-span-8 flex flex-col print:col-span-7 scroll-mt-20">
                        {/* Header OUTSIDE & ABOVE panel box (on white background) */}
                        <div className="mb-2.5 flex flex-col justify-end min-h-[38px]">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0"></div>
                            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-none uppercase tracking-wide">
                              PETA TEMATIK FSVA & SKPG
                            </h3>
                          </div>
                        </div>

                        <div className="dashboard-card border border-[#E9E4D5] bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] h-[600px] lg:h-full lg:flex-1 flex flex-col print:h-[380px] print:min-h-0">
                          <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[250px] lg:min-h-[350px] print:h-[280px] print:min-h-0">
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
                  </div>
                  
                   {/* Section: AI Forecast */}
                   <div id="panel-forecast" className="space-y-3 scroll-mt-20">
                      <ForecastPanel livePrices={livePrices} onSwitchView={setCurrentView} />
                   </div>

                  {/* BOTTOM ROW 1: IKP & PoU (1/2 Width Each) */}
                  <div className="space-y-3 mt-6">
                    {/* Header OUTSIDE & ABOVE panel box (on white background) */}
                    <div className="mb-2.5 flex flex-col justify-end min-h-[38px]">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 sm:h-5 bg-emerald-600 rounded-full shrink-0"></div>
                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-none uppercase tracking-wide">
                          IKP & POU KOTA CILEGON 5 TAHUN TERAKHIR
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4">
                      {/* IKP Chart - Span 6 */}
                      <div className="lg:col-span-6 flex flex-col print:col-span-6">
                        <IKPTrendChart ikpData={ikpData} selectedYear={selectedYear} />
                      </div>

                      {/* PoU Chart - Span 6 */}
                      <div className="lg:col-span-6 flex flex-col print:col-span-6 print:break-before-page">
                        <PoUTrendChart pouData={pouData} selectedYear={selectedYear} />
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ROW 2: AI Insight Panel (Full Width) */}
                  <div id="panel-insight" className="w-full mt-6 h-[600px] lg:h-auto print:mt-6 print:break-before-page flex flex-col scroll-mt-20">
                    <AIInsightPanel 
                      year={selectedYear}
                      month={selectedMonth}
                      kecamatan={selectedKecamatan}
                      kelurahan={selectedKelurahan}
                      cvBeras={getCVBulananValue()}
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
                        bawang_merah: livePrices ? (livePrices.bawang_merah ?? 40000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.bawang_merah || 0), 0) / hargaData.length) : 40000),
                        bawang_putih: livePrices ? (livePrices.bawang_putih ?? 40000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.bawang_putih || 0), 0) / hargaData.length) : 40000),
                        cabe_merah: livePrices ? livePrices.cabe_merah : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.cabe_merah || 0), 0) / hargaData.length) : 37500),
                        cabe_rawit: livePrices ? (livePrices.cabe_rawit ?? 50000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.cabe_rawit || 0), 0) / hargaData.length) : 50000),
                        daging_sapi: livePrices ? (livePrices.daging_sapi ?? 150000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.daging_sapi || 0), 0) / hargaData.length) : 150000),
                        daging_ayam: livePrices ? livePrices.daging_ayam : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.daging_ayam || 0), 0) / hargaData.length) : 35000),
                        telur: livePrices ? livePrices.telur : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.telur || 0), 0) / hargaData.length) : 24000),
                        gula_pasir: livePrices ? livePrices.gula_pasir : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.gula_pasir || 0), 0) / hargaData.length) : 16000),
                        minyak_goreng: livePrices ? livePrices.minyak_goreng : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.minyak_goreng || 0), 0) / hargaData.length) : 21000),
                      }}
                      loadingPrices={loadingLive}
                    />
                  </div>

                   {/* Section: Benchmark */}
                   <div className="space-y-3 mt-6 print:hidden">
                     {/* Mobile Header Outside Box */}
                     <div className="sm:hidden mb-2.5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-5 bg-emerald-600 rounded-full shrink-0"></div>
                         <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide leading-snug">
                           CAPAIAN INDIKATOR KETAHANAN PANGAN CILEGON & NASIONAL DALAM 5 TAHUN TERAKHIR
                         </h3>
                       </div>
                     </div>
                     <div className="w-full">
                       <BenchmarkPanel currentData={getBenchmarkData()} dbBenchmarkList={benchmarkList} />
                     </div>
                   </div>

                </>
              )}

              {currentView === 'harga_full' && (
                <div className="space-y-6">
                  <button
                    onClick={() => setCurrentView('beranda')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                    Kembali ke Beranda
                  </button>
                  
                  <div className="dashboard-card border border-[#E9E4D5] bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] min-h-[550px] flex flex-col p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-emerald-600 rounded-full shrink-0"></div>
                        <h2 className="font-extrabold text-slate-800 text-base sm:text-lg uppercase tracking-wide">
                          PANEL HARGA PANGAN STRATEGIS
                        </h2>
                      </div>
                    </div>
                    <HargaPanel 
                      hargaData={hargaData} 
                      previousHargaData={previousHargaData} 
                      livePrices={livePrices}
                      liveDate={liveDate}
                      loadingLive={loadingLive}
                    />
                  </div>
                </div>
              )}

              {currentView === 'peta_full' && (
                <div className="space-y-4 flex flex-col h-[88vh]">
                  <div>
                    <button
                      onClick={() => setCurrentView('beranda')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                      Kembali ke Beranda
                    </button>
                  </div>
                  
                  <div className="dashboard-card border border-[#E9E4D5] bg-gradient-to-br from-[#FCFAF2] via-[#F7F4EB] to-[#EFEAD8] flex-1 flex flex-col p-4 sm:p-6 min-h-0">
                    <div className="mb-3 flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-emerald-600 rounded-full shrink-0"></div>
                        <h2 className="font-extrabold text-slate-800 text-base sm:text-lg uppercase tracking-wide">
                          PETA TEMATIK FSVA & SKPG
                        </h2>
                      </div>
                    </div>

                    <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[500px]">
                      <MapUnified 
                        selectedKecamatan={selectedKecamatan}
                        selectedKelurahan={selectedKelurahan}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'insight' && (
                <div className="flex flex-col h-[85vh] space-y-4">
                  <div>
                    <button
                      onClick={() => setCurrentView('beranda')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                      Kembali ke Beranda
                    </button>
                  </div>
                  <div className="flex flex-col flex-1 pb-10">
                    <AIInsightPanel 
                      year={selectedYear}
                      month={selectedMonth}
                      kecamatan={selectedKecamatan}
                      kelurahan={selectedKelurahan}
                      cvBeras={getCVBulananValue()}
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
                        bawang_merah: livePrices ? (livePrices.bawang_merah ?? 40000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.bawang_merah || 0), 0) / hargaData.length) : 40000),
                        bawang_putih: livePrices ? (livePrices.bawang_putih ?? 40000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.bawang_putih || 0), 0) / hargaData.length) : 40000),
                        cabe_merah: livePrices ? livePrices.cabe_merah : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.cabe_merah || 0), 0) / hargaData.length) : 37500),
                        cabe_rawit: livePrices ? (livePrices.cabe_rawit ?? 50000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.cabe_rawit || 0), 0) / hargaData.length) : 50000),
                        daging_sapi: livePrices ? (livePrices.daging_sapi ?? 150000) : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.daging_sapi || 0), 0) / hargaData.length) : 150000),
                        daging_ayam: livePrices ? livePrices.daging_ayam : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.daging_ayam || 0), 0) / hargaData.length) : 35000),
                        telur: livePrices ? livePrices.telur : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.telur || 0), 0) / hargaData.length) : 24000),
                        gula_pasir: livePrices ? livePrices.gula_pasir : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.gula_pasir || 0), 0) / hargaData.length) : 16000),
                        minyak_goreng: livePrices ? livePrices.minyak_goreng : (hargaData.length > 0 ? (hargaData.reduce((sum, x) => sum + (x.minyak_goreng || 0), 0) / hargaData.length) : 21000),
                      }}
                      loadingPrices={loadingLive}
                      isFullScreen={true}
                    />
                  </div>
                </div>
              )}

              {currentView === 'ketersediaan' && (() => {
                const values = {
                  ketersediaanEnergi: getKetersediaanEnergiValue(),
                  ketersediaanProtein: getKetersediaanProteinValue(),
                  cppd: 174
                };
                const insights = getSubViewInsights('ketersediaan', values) as { energi: string[]; protein: string[]; cppd: string[] };
                
                return (
                  <div className="space-y-6">
                    <button
                      onClick={() => setCurrentView('beranda')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                      Kembali ke Beranda
                    </button>
                    
                    <div className="space-y-6">
                      {/* Row 1: Ketersediaan Energi (Chart Left, AI Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Chart */}
                        <div className="dashboard-card">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-600" />
                            Tingkat Ketersediaan Energi (kkal/kapita/hari)
                          </h3>
                          <MiniBenchmarkChart 
                            indicatorNo={6} 
                            currentValue={values.ketersediaanEnergi} 
                            unit="kkal" 
                            nationalStandard={2400} 
                            colorTheme="emerald"
                          />
                        </div>
                        {/* Right Card: AI Insights */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-emerald-50/10">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-emerald-600" />
                            AI Insight Ketersediaan Energi
                          </h3>
                          <ul className="space-y-3">
                            {insights?.energi.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Row 2: Ketersediaan Protein (Chart Left, AI Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Chart */}
                        <div className="dashboard-card">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            Tingkat Ketersediaan Protein (gram/kapita/hari)
                          </h3>
                          <MiniBenchmarkChart 
                            indicatorNo={7} 
                            currentValue={values.ketersediaanProtein} 
                            unit="gram" 
                            nationalStandard={63} 
                            colorTheme="blue"
                          />
                        </div>
                        {/* Right Card: AI Insights */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50/10">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            AI Insight Ketersediaan Protein
                          </h3>
                          <ul className="space-y-3">
                            {insights?.protein.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-blue-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Row 3: Cadangan Pangan (Chart Left, AI Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Chart */}
                        <div className="dashboard-card">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            Jumlah Cadangan Pangan Pemerintah Daerah (Ton)
                          </h3>
                          <MiniBenchmarkChart 
                            indicatorNo={8} 
                            currentValue={values.cppd} 
                            unit="Ton" 
                            nationalStandard={115} 
                            colorTheme="purple"
                          />
                        </div>
                        {/* Right Card: AI Insights */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-purple-50/10">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            AI Insight Cadangan Pangan
                          </h3>
                          <ul className="space-y-3">
                            {insights?.cppd.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {currentView === 'keterjangkauan' && (() => {
                const cvVal = getCVValue();
                const insights = getSubViewInsights('keterjangkauan', { cvBeras: cvVal }) as string[];
                
                return (
                  <div className="space-y-6">
                    <button
                      onClick={() => setCurrentView('beranda')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                      Kembali ke Beranda
                    </button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Column 1: Harga Panel (Span 7) */}
                      <div className="lg:col-span-7 flex flex-col">
                        <div className="dashboard-card flex-1 min-h-[420px] flex flex-col">
                          <HargaPanel 
                            hargaData={hargaData} 
                            previousHargaData={previousHargaData} 
                            livePrices={livePrices}
                            liveDate={liveDate}
                            loadingLive={loadingLive}
                          />
                        </div>
                      </div>
                      
                      {/* Column 2: CV Gauge and Insights (Span 5) */}
                      <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="dashboard-card flex items-center justify-center min-h-[220px]">
                          <div className="w-full max-w-[280px]">
                            <CVGauge value={cvVal} isBulanan={false} />
                          </div>
                        </div>
                        
                        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50/15 flex-1">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                            AI Insight Stabilitas Harga Beras
                          </h3>
                          <ul className="space-y-3">
                            {insights?.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-blue-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {currentView === 'pemanfaatan' && (() => {
                const balitaInfo = getBalitaData();
                const values = {
                  balitaKurang: balitaInfo.kurang,
                  balitaTotal: balitaInfo.total,
                  balitaStatus: balitaInfo.status,
                  konsumsiEnergi: getKonsumsiEnergiValue(),
                  konsumsiProtein: getKonsumsiProteinValue()
                };
                const insights = getSubViewInsights('pemanfaatan', values) as { balita: string[]; energi: string[]; protein: string[] };
                
                return (
                  <div className="space-y-6">
                    <button
                      onClick={() => setCurrentView('beranda')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                      Kembali ke Beranda
                    </button>
                    
                    <div className="space-y-6">
                      {/* Row 1: Nutrition & Balita Gizi */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Doughnut Chart */}
                        <div className="dashboard-card flex items-center justify-center min-h-[300px]">
                          <div className="w-full max-w-[340px]">
                            <BalitaDoughnut balitaData={balitaInfo} />
                          </div>
                        </div>
                        
                        {/* Right Card: AI Nutrition Analysis */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-purple-50/15">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            AI Insight Status Gizi Balita
                          </h3>
                          <ul className="space-y-3">
                            {insights?.balita.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Row 2: Konsumsi Energi */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Chart */}
                        <div className="dashboard-card">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-600" />
                            Tingkat Konsumsi Energi (kkal/kapita/hari)
                          </h3>
                          <MiniBenchmarkChart 
                            indicatorNo={3} 
                            currentValue={values.konsumsiEnergi} 
                            unit="kkal" 
                            nationalStandard={2100} 
                            colorTheme="emerald"
                          />
                        </div>
                        {/* Right Card: AI Insights */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-emerald-50/10">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-emerald-600" />
                            AI Insight Konsumsi Energi
                          </h3>
                          <ul className="space-y-3">
                            {insights?.energi.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Row 3: Konsumsi Protein */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Card: Chart */}
                        <div className="dashboard-card">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            Tingkat Konsumsi Protein (gram/kapita/hari)
                          </h3>
                          <MiniBenchmarkChart 
                            indicatorNo={4} 
                            currentValue={values.konsumsiProtein} 
                            unit="gram" 
                            nationalStandard={57} 
                            colorTheme="blue"
                          />
                        </div>
                        {/* Right Card: AI Insights */}
                        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50/10">
                          <h3 className="font-extrabold text-slate-800 text-xs leading-none uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            AI Insight Konsumsi Protein
                          </h3>
                          <ul className="space-y-3">
                            {insights?.protein.map((bullet, idx) => (
                              <li key={idx} className="text-[11px] text-slate-600 font-semibold leading-relaxed flex gap-2">
                                <span className="text-blue-500 font-bold">•</span>
                                <span>{bullet.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-[#0B1E41]">{part}</strong> : part)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {currentView === 'analisis_skpg' && (
                <AnalisisSKPG onSwitchView={(view: string) => setCurrentView(view)} />
              )}

              {currentView === 'analisis_skpg_kelurahan' && (
                <AnalisisSKPGKelurahan onSwitchView={(view: string) => setCurrentView(view)} />
              )}

              {currentView === 'forecasting' && (
                <ForecastView onBack={() => setCurrentView('beranda')} livePrices={livePrices} />
              )}

              {currentView === 'validasi_forecast' && (
                <ValidasiForecastView onBack={() => setCurrentView('beranda')} />
              )}

              {currentView === 'sumber_data' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setCurrentView('beranda')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                    Kembali ke Beranda
                  </button>
                  
                  <div className="dashboard-card p-6 bg-white shadow-sm border border-slate-200">
                    <h3 className="font-extrabold text-[#0B1E41] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      Sumber Data dan Referensi
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed font-semibold">
                      Seluruh data dan informasi yang disajikan dalam web app ini berasal dari sumber resmi pemerintah serta hasil pengolahan data oleh pengelola aplikasi. Data digunakan untuk mendukung analisis, pemantauan, dan pengambilan keputusan di bidang ketahanan pangan dan gizi.
                    </p>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-4">
                      <table className="w-full text-left border-collapse table-fixed text-[11px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white text-[9px] font-black uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-[6%] text-center border-r border-slate-600">No</th>
                            <th className="py-2.5 px-3 w-[24%] border-r border-slate-600">Indikator / Metodologi</th>
                            <th className="py-2.5 px-3 w-[25%] border-r border-slate-600">Sumber Data & Instansi</th>
                            <th className="py-2.5 px-3 w-[45%]">Keterangan / Referensi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-600">
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">1</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Harga Pangan Strategis</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Sistem Aplikasi Harga Pangan Kota Cilegon (SAGON)</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data harga pangan harian hasil pengolahan dan visualisasi data harga pangan strategis dari sistem SAGON. <br/>
                              <a href="https://sagon.cilegon.go.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[10px] inline-flex items-center gap-0.5 mt-1">sagon.cilegon.go.id</a>
                            </td>
                          </tr>
                          <tr className="bg-[#E6F4EA]/25 hover:bg-[#E6F4EA]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">2</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Pola Pangan Harapan (PPH) Konsumsi</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Survei Sosial Ekonomi Nasional (SUSENAS)</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">Badan Pusat Statistik (BPS)</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Nilai PPH konsumsi dihitung berdasarkan data konsumsi rumah tangga SUSENAS yang diolah menggunakan metodologi Pola Pangan Harapan sesuai pedoman pemerintah.
                            </td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">3</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Ketersediaan Energi & Protein</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Neraca Bahan Makanan (NBM)</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data tingkat ketersediaan energi dan protein per kapita sebagai indikator ketersediaan pangan wilayah.
                            </td>
                          </tr>
                          <tr className="bg-[#E6F4EA]/25 hover:bg-[#E6F4EA]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">4</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Status Gizi Balita (BB/U)</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Rekapitulasi Status Gizi Balita</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">Dinas Kesehatan Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data pemantauan pertumbuhan dan status gizi balita berdasarkan indikator Berat Badan menurut Umur (BB/U).
                            </td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">5</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Produksi Beras</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Laporan Realisasi Statistik Pertanian</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data kompilasi realisasi produksi tanaman pangan (Gabah Kering Giling) yang dilaporkan secara periodik.
                            </td>
                          </tr>
                          <tr className="bg-[#E6F4EA]/25 hover:bg-[#E6F4EA]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">6</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Peta FSVA dan SKPG</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Food Security and Vulnerability Atlas (FSVA) & SKPG</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data spasial dan analisis kerentanan pangan untuk mengidentifikasi wilayah prioritas penanganan kerawanan pangan di Cilegon.
                            </td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">7</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Analisis Prioritas (Borda Count)</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Borda Count Method (Metodologi SPK)</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">Pengelola Aplikasi</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Metode pengambilan keputusan multikriteria untuk melakukan pemeringkatan prioritas kelurahan berdasarkan gabungan data IKP dan SKPG. <br/>
                              <a href="https://en.wikipedia.org/wiki/Borda_count" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[10px] inline-flex items-center gap-0.5 mt-1">Wikipedia Reference</a>
                            </td>
                          </tr>
                          <tr className="bg-[#E6F4EA]/25 hover:bg-[#E6F4EA]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">8</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Indeks Ketahanan Pangan (IKP)</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Badan Pangan Nasional Republik Indonesia</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Indeks komposit tahunan pengukur kondisi ketahanan pangan wilayah aspek ketersediaan, keterjangkauan, dan pemanfaatan. <br/>
                              <a href="https://data.badanpangan.go.id/statisticpublications/pm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[10px] inline-flex items-center gap-0.5 mt-1">badanpangan.go.id</a>
                            </td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">9</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Prevalence of Undernourishment (PoU)</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">BPS & Badan Pangan Nasional</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Persentase penduduk dengan konsumsi energi di bawah kebutuhan minimum untuk hidup sehat dan aktif. <br/>
                              <a href="https://www.bps.go.id/id/statistics-table/2/MTQ3MyMy/prevalence-of-undernourishment.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[10px] inline-flex items-center gap-0.5 mt-1">BPS Reference</a>
                            </td>
                          </tr>
                          <tr className="bg-[#E6F4EA]/25 hover:bg-[#E6F4EA]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">10</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Cadangan Pangan Pemda (CPPD)</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Bidang Ketahanan Pangan</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data stok cadangan pangan pemerintah daerah untuk mendukung stabilisasi pasokan dan tanggap bencana darurat.
                            </td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-black border-r border-slate-200 text-slate-400">11</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">Pengawasan Pangan Segar</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-700">Bidang Ketahanan Pangan</span><br/>
                              <span className="text-[10px] text-slate-400 font-semibold">DKPP Kota Cilegon</span>
                            </td>
                            <td className="py-2.5 px-3 leading-relaxed">
                              Data pengawasan keamanan pangan segar asal tumbuhan (PSAT) se-Kota Cilegon secara berkala.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10.5px] text-emerald-950 leading-relaxed font-bold shadow-sm mb-4">
                      ⚠️ Penggunaan data dalam web app ini tetap mengacu pada prinsip Satu Data Indonesia serta tidak menggantikan publikasi resmi yang diterbitkan oleh instansi sumber data.
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="font-extrabold text-[#0B1E41] text-[10px] uppercase tracking-wide mb-1.5">Referensi Utama</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-500 font-semibold list-disc pl-4 leading-normal">
                        <li>Badan Pusat Statistik (BPS) – SUSENAS dan Statistik Ketahanan Pangan.</li>
                        <li>Badan Pangan Nasional Republik Indonesia – Indeks Ketahanan Pangan (IKP).</li>
                        <li>DKPP Kota Cilegon – Neraca Bahan Makanan (NBM), Statistik Pertanian, FSVA, SKPG, CPPD, dan Pengawasan Pangan Segar.</li>
                        <li>Dinas Kesehatan Kota Cilegon – Rekapitulasi Status Gizi Balita.</li>
                        <li>Sistem Aplikasi Harga Pangan Kota Cilegon (SAGON).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'credit' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setCurrentView('beranda')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
                    Kembali ke Beranda
                  </button>
                  
                  <div className="dashboard-card p-6 bg-white shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="font-extrabold text-[#0B1E41] text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Info className="w-5 h-5 text-emerald-600" />
                      Credit Title
                    </h3>
                    <div className="text-[11px] text-slate-650 leading-relaxed font-semibold space-y-4 text-justify max-w-3xl">
                      <p>
                        Web app ini dikembangkan dan dikelola secara mandiri oleh seorang Analis Ketahanan Pangan pada Dinas Ketahanan Pangan dan Pertanian Kota Cilegon sebagai bentuk inisiatif untuk mendukung pemanfaatan data spasial dan informasi ketahanan pangan.
                      </p>
                      <p>
                        Saat ini, web app ini belum merupakan aplikasi resmi dan tidak mewakili kebijakan, sikap, maupun keputusan institusi atau organisasi mana pun. Seluruh konten dan pengembangannya dilakukan secara independen sebagai sarana pendukung analisis dan pengambilan keputusan.
                      </p>
                      <p>
                        Web app ini ditujukan untuk membantu para pengambil kebijakan, pemangku kepentingan, akademisi, serta pihak terkait lainnya dalam memperoleh informasi yang lebih cepat, akurat, dan mudah diakses guna mendukung upaya peningkatan ketahanan pangan dan penanganan kerawanan pangan di Kota Cilegon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'tentang' && (
                <TentangAplikasi onBack={() => setCurrentView('beranda')} />
              )}
              
            </div>
          )}

          {/* Footer with copyright and visit counter */}
          <footer className="mt-12 pt-6 pb-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden text-slate-500 text-xs shrink-0 justify-end">
            <VisitCounter path="/" />
          </footer>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Set page margins & size */
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 15mm 10mm;
          }

          /* Force backgrounds and gradients */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset layouts for full print page flow */
          html, body, #__next, .flex.h-screen, .flex.h-screen > div {
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

          /* AI Insight container overrides for print to expand text fully */
          .print-card-grow,
          .print-card-grow .dashboard-card,
          .print-card-grow .dashboard-card > div,
          .print-card-grow .dashboard-card .overflow-hidden {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            display: block !important;
          }

          .dashboard-card h3 {
            font-size: 11px !important;
            letter-spacing: -0.015em !important;
          }

          .dashboard-card p {
            font-size: 8px !important;
            letter-spacing: -0.01em !important;
          }

          /* Harga Panel table text styling */
          .dashboard-card table th {
            font-size: 8px !important;
            white-space: nowrap !important;
            letter-spacing: -0.03em !important;
          }

          .dashboard-card table td {
            font-size: 9px !important;
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            white-space: nowrap !important;
            letter-spacing: -0.025em !important;
          }

          .dashboard-card table td span {
            font-size: 8px !important;
            letter-spacing: -0.02em !important;
          }
        }
      `}} />
    </div>
  );
}
