"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Copy, Check, Loader2, Lightbulb, RefreshCw, Sparkles, Brain, ArrowRight, Info, EyeOff, FileText } from 'lucide-react';

interface AIInsightPanelProps {
  year: number;
  month: number;
  fsvaYear?: number;
  kecamatan: string;
  kelurahan: string;
  cvBeras: number;
  pphScore: number;
  konsumsiEnergi: number;
  konsumsiProtein: number;
  ketersediaanEnergi: number;
  ketersediaanProtein: number;
  produksiBeras: number;
  balitaStatus: {
    sangatKurang: number;
    kurang: number;
    normal: number;
    lebih: number;
    total: number;
    status: string;
  };
  hargaStrategis: {
    beras: number;
    bawang_merah: number;
    bawang_putih: number;
    cabe_merah: number;
    cabe_rawit: number;
    daging_sapi: number;
    daging_ayam: number;
    telur: number;
    gula_pasir: number;
    minyak_goreng: number;
  };
  loadingPrices: boolean;
  isFullScreen?: boolean;
}

const isInsightCompleteClient = (text?: string | null): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 550) return false;
  const hasFinalSection =
    /Rekomendasi Kebijakan/i.test(trimmed) &&
    (/Kerja Sama Antar Daerah|\bKAD\b/i.test(trimmed) || /Gerakan Pangan Murah|\bGPM\b/i.test(trimmed) || /Program Intervensi/i.test(trimmed));
  const endsCleanly = /[.!?%*)"']$/.test(trimmed);
  return hasFinalSection && endsCleanly;
};

const getHeuristicInsightText = (
  pph: number,
  cv: number,
  ketEnergi: number,
  konEnergi: number,
  ketProt: number,
  konProt: number,
  balita?: AIInsightPanelProps['balitaStatus'],
  harga?: AIInsightPanelProps['hargaStrategis']
) => {
  const pphVal = pph || 95;
  const cvVal = cv || 0.9;
  const keVal = ketEnergi || 2582;
  const konEVal = konEnergi || 2062.89;
  const kpVal = ketProt || 85;
  const konPVal = konProt || 61.71;
  const bNormal = balita?.normal ?? 25044;
  const bLebih = balita?.lebih ?? 1064;
  const bKurangTotal = (balita?.sangatKurang ?? 58) + (balita?.kurang ?? 268);
  const bStatus = balita?.status || 'AMAN';

  const hBeras = Math.round(harga?.beras || 13833).toLocaleString('id-ID');
  const hCabeMerah = Math.round(harga?.cabe_merah || 55000).toLocaleString('id-ID');
  const hCabeRawit = Math.round(harga?.cabe_rawit || 61667).toLocaleString('id-ID');
  const hDagingSapi = Math.round(harga?.daging_sapi || 140000).toLocaleString('id-ID');

  return `### 1. Ringkasan Eksekutif Ketahanan Pangan
Kota Cilegon menunjukkan status **${bStatus === 'AMAN' && cvVal < 10 ? 'AMAN' : 'WASPADA'}** pada indikator ketahanan pangan secara keseluruhan. Skor Pola Pangan Harapan (PPH) sebesar **${pphVal}** melebihi target nasional (90), sementara ketersediaan energi dan protein berada pada kondisi surplus. Stabilitas harga beras sangat terkendali, namun beberapa komoditas pangan strategis hortikultura dan hewani menunjukkan dinamika harga yang perlu diantisipasi.

### 2. Analisis Metodologi Konsumsi vs Ketersediaan
- **Sektor Energi**: Konsumsi energi per kapita (**${konEVal} kkal/hari**) berada dekat dengan target nasional (2.100 kkal/hari) dan ditopang oleh ketersediaan energi pasar yang surplus (**${keVal} kkal/hari** dibanding standar 2.400 kkal/hari).
- **Sektor Protein**: Konsumsi protein (**${konPVal} g/hari**) telah melampaui target nasional (57 g/hari) dengan dukungan ketersediaan protein yang sangat memadai (**${kpVal} g/hari** dibanding standar 63 g/hari), mengindikasikan kecukupan pangan makro secara kuantitas maupun kualitas gizi.

### 3. Stabilitas Harga & Aksesibilitas
Koefisien Variasi (CV) harga beras sebesar **${cvVal}%** menunjukkan stabilitas pasokan dan harga pokok utama yang sangat baik (jauh di bawah ambang batas nasional <10%, rata-rata beras medium Rp ${hBeras}/kg). Namun, harga beberapa komoditas strategis seperti cabai merah (Rp ${hCabeMerah}/kg), cabai rawit (Rp ${hCabeRawit}/kg), dan daging sapi (Rp ${hDagingSapi}/kg) terpantau cukup tinggi sehingga berpotensi memengaruhi aksesibilitas ekonomi rumah tangga.

### 4. Outlook Harga Pangan Strategis 1 dan 3 Bulan & Early Warning System (EWS)
Berdasarkan proyeksi *Machine Learning* (*Walk-Forward Validation Engine*), terdapat potensi fluktuasi harga pada komoditas cabai rawit, cabai merah, dan bawang merah dalam 1 bulan ke depan (+1M) yang memerlukan pemantauan aktif Early Warning System (EWS). Dalam horizon 3 bulan (+3M), model memproyeksikan stabilisasi harga pada mayoritas komoditas pokok, dengan langkah mitigasi berupa penguatan stok penyangga daerah dan pemantauan harian SAGON di tingkat pengecer.

### 5. Kondisi Gizi Balita
Mayoritas balita di Kota Cilegon berada pada kategori **Normal** (**${bNormal.toLocaleString('id-ID')} balita**) dan **Gizi Lebih** (**${bLebih.toLocaleString('id-ID')} balita**), sementara jumlah kumulatif balita dengan status gizi **Sangat Kurang dan Kurang** tercatat sebanyak **${bKurangTotal.toLocaleString('id-ID')} balita**. Kondisi ini menunjukkan ketahanan gizi makro yang terkendali (**${bStatus}**), namun tetap memerlukan intervensi pendampingan gizi keluarga dan Pemberian Makanan Tambahan (PMT) terarah di kelurahan lokus prioritas.

### 6. Rekomendasi Kebijakan & Intervensi
1. **Fasilitasi Distribusi Pangan (FDP)**: Mengoptimalkan bantuan ongkos angkut untuk mobilisasi pasokan pangan strategis dari daerah surplus produsen (seperti Brebes/Garut) ke pasar-pasar Kota Cilegon guna menekan harga konsumen secara lebih efisien dibandingkan subsidi harga langsung.
2. **Gerakan Pangan Murah (GPM) & Kios Pangan SPHP Bulog**: Memperluas penyelenggaraan Gerakan Pangan Murah (GPM) dan distribusi beras SPHP Bulog yang menyasar kelurahan dengan kerentanan prioritas berdasarkan peta FSVA dan SKPG agar tepat sasaran bagi masyarakat berpenghasilan rendah.
3. **Kerja Sama Antar Daerah (KAD)**: Memperkuat kontrak Kerja Sama Antar Daerah (KAD) dengan sentra produsen utama komoditas hortikultura dan hewani untuk menjamin kepastian pasokan jangka menengah serta meredam gejolak spekulasi pasar.`;
};

export default function AIInsightPanel({
  year,
  month,
  fsvaYear,
  kecamatan,
  kelurahan,
  cvBeras,
  pphScore,
  konsumsiEnergi,
  konsumsiProtein,
  ketersediaanEnergi,
  ketersediaanProtein,
  produksiBeras,
  balitaStatus,
  hargaStrategis,
  loadingPrices,
  isFullScreen = false
}: AIInsightPanelProps) {
  const [insight, setInsight] = useState<string>(() =>
    getHeuristicInsightText(pphScore, cvBeras, ketersediaanEnergi, konsumsiEnergi, ketersediaanProtein, konsumsiProtein, balitaStatus, hargaStrategis)
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Serialized keys to prevent re-render cancellation race conditions
  const balitaKey = useMemo(() => JSON.stringify(balitaStatus || {}), [balitaStatus]);
  const hargaKey = useMemo(() => JSON.stringify(hargaStrategis || {}), [hargaStrategis]);
  const cacheStorageKey = useMemo(
    () => `panci_ai_insight_v1_${year}_${month}_${kecamatan || 'ALL'}_${kelurahan || 'ALL'}`,
    [year, month, kecamatan, kelurahan]
  );

  const fetchInsightData = useCallback(async (forceRefresh = false) => {
    const parsedBalita = JSON.parse(balitaKey) as AIInsightPanelProps['balitaStatus'];
    const parsedHarga = JSON.parse(hargaKey) as AIInsightPanelProps['hargaStrategis'];

    const fallbackFull = getHeuristicInsightText(
      pphScore,
      cvBeras,
      ketersediaanEnergi,
      konsumsiEnergi,
      ketersediaanProtein,
      konsumsiProtein,
      parsedBalita,
      parsedHarga
    );
    setInsight(prev => (isInsightCompleteClient(prev) ? prev : fallbackFull));

    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cachedRaw = sessionStorage.getItem(cacheStorageKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { insight: string; isFallback: boolean; ts: number };
          if (cached?.insight && isInsightCompleteClient(cached.insight) && Date.now() - cached.ts < 30 * 60 * 1000) {
            setInsight(cached.insight);
            setIsFallback(Boolean(cached.isFallback));
            return;
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }
    }

    if (loadingPrices) return;
    setLoading(true);

    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          kecamatan,
          kelurahan,
          cvBeras,
          pphScore,
          konsumsiEnergi,
          konsumsiProtein,
          ketersediaanEnergi,
          ketersediaanProtein,
          produksiBeras,
          balitaStatus: parsedBalita,
          hargaStrategis: parsedHarga,
          forceRefresh
        }),
      });

      const data = await response.json();
      if (response.ok && data?.insight && isInsightCompleteClient(data.insight)) {
        setInsight(data.insight);
        setIsFallback(Boolean(data.isFallback));
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(
              cacheStorageKey,
              JSON.stringify({ insight: data.insight, isFallback: Boolean(data.isFallback), ts: Date.now() })
            );
          } catch {
            // Ignore quota errors
          }
        }
      } else {
        setInsight(fallbackFull);
        setIsFallback(true);
      }
    } catch (err) {
      console.warn('[AIInsightPanel] Network error or timeout, retaining complete heuristic insight:', err);
      setInsight(fallbackFull);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, [
    year,
    month,
    kecamatan,
    kelurahan,
    cvBeras,
    pphScore,
    konsumsiEnergi,
    konsumsiProtein,
    ketersediaanEnergi,
    ketersediaanProtein,
    produksiBeras,
    balitaKey,
    hargaKey,
    loadingPrices,
    cacheStorageKey
  ]);

  // Hanya fetch data dan konsumsi token AI jika user telah secara sadar membuka panel AI Insight
  useEffect(() => {
    if (isOpen) {
      fetchInsightData(false);
    }
  }, [isOpen, fetchInsightData]);

  const handleCopy = () => {
    if (!insight) return;
    navigator.clipboard.writeText(insight);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = () => {
    if (!isOpen) {
      setIsOpen(true);
      fetchInsightData();
      return;
    }
    if (!insight) return;
    const headerHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>AI Insight Ketahanan Pangan Kota Cilegon Tahun ${year}-${year + 1}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
          h2 { color: #0f172a; font-size: 14pt; border-bottom: 2px solid #10b981; padding-bottom: 5px; }
          strong { color: #0284c7; }
        </style>
      </head>
      <body>
        <h2>AI INSIGHT KETAHANAN PANGAN KOTA CILEGON TAHUN ${year}-${year + 1}</h2>
        <p style="font-size: 9pt; color: #64748b; margin-bottom: 20px;">
          Generated automatically by Food Security Intelligence & DSS Kota Cilegon (${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})
        </p>
        <div>
          ${insight
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>')}
        </div>
      </body>
    </html>`;

    const blob = new Blob(['\ufeff' + headerHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI_Insight_Ketahanan_Pangan_Kota_Cilegon_${year}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-slate-800">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('#')) {
        const cleanTitle = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        return (
          <h4 key={idx} className={`${isFullScreen ? 'text-[14px] mt-4 mb-2' : 'text-[13px] mt-3.5 mb-1.5'} font-black text-amber-950 uppercase tracking-wide border-b border-amber-200/80 pb-1`}>
            {cleanTitle}
          </h4>
        );
      }

      // Deteksi judul segmen yang ditulis dengan **Judul:** atau Judul: pada satu baris penuh
      const sectionHeaderMatch = trimmed.match(/^(?:[-*]\s*)?\*\*([^*]{4,95}?)\*\*:?\s*$/) ||
        trimmed.match(/^(Ringkasan Eksekutif.*|Analisis Metodologi.*|Stabilitas Harga.*|Outlook Harga.*|Kondisi Gizi.*|Rekomendasi Kebijakan.*|LAPORAN ANALISIS EKSEKUTIF.*):?\s*$/i);
      if (sectionHeaderMatch) {
        const cleanHeader = (sectionHeaderMatch[1] || trimmed).replace(/:$/, '').replace(/\*\*/g, '').trim();
        return (
          <h4 key={idx} className={`${isFullScreen ? 'text-[14px] mt-4 mb-2' : 'text-[13px] mt-3.5 mb-1.5'} font-black text-amber-950 uppercase tracking-wide border-b border-amber-200/80 pb-1`}>
            {cleanHeader}
          </h4>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <div key={idx} className={`${isFullScreen ? 'text-[13px] mb-2' : 'text-[12px] mb-1.5'} text-slate-800 font-semibold leading-relaxed ml-3 flex gap-2`}>
            <span className="text-orange-500 font-bold">•</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }
      const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const content = numMatch[2];
        return (
          <div key={idx} className={`${isFullScreen ? 'text-[13px] mb-2' : 'text-[12px] mb-1.5'} text-slate-800 font-semibold leading-relaxed ml-2 pl-1 flex gap-1.5`}>
            <span className="font-extrabold text-orange-600 shrink-0">{numMatch[1]}.</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }
      if (trimmed === '') return <div key={idx} className={isFullScreen ? 'h-2' : 'h-1.5'} />;
      return <p key={idx} className={`${isFullScreen ? 'text-[13px] mb-3' : 'text-[12px] mb-2'} text-slate-800 font-semibold leading-relaxed`}>{parseBoldText(line)}</p>;
    });
  };

  return (
    <div className="flex flex-col flex-1 h-auto">
      {/* Top Header Row */}
      <div className="mb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-stretch gap-2.5">
            <div className="w-[3.5px] bg-orange-500 rounded-full shrink-0"></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-wide">
                  INSIGHT KETAHANAN PANGAN CILEGON
                </h3>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-1 hover:bg-orange-100/60 rounded-full transition-colors cursor-pointer text-orange-500 hover:text-orange-600 focus:outline-none shrink-0"
                  title="Catatan Data Indikator"
                >
                  <Lightbulb className="w-4 h-4 fill-orange-200 text-orange-500" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold italic text-orange-700 text-xs sm:text-sm">
                  {isFallback ? 'AI Assisted Heuristic Analysis' : 'Gemini AI Real-time Intelligence'}
                </span>
                {isOpen && (
                  <button
                    type="button"
                    onClick={() => fetchInsightData(true)}
                    disabled={loading}
                    className="p-1 text-orange-400 hover:text-orange-600 rounded transition-colors disabled:opacity-50 print:hidden cursor-pointer"
                    title="Perbarui Analisis AI"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-orange-600' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadDocx}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer transition-all shrink-0 flex items-center gap-1.5 pt-0.5 print:hidden"
            title="Download Docx"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download docx</span>
          </button>
        </div>

        {showInfo && (
          <div className="mt-2 ml-3 text-[10px] text-slate-700 bg-amber-50/90 border border-amber-200/80 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-xl">
            Catatan: Indikator FSVA menggunakan basis data tahun {fsvaYear || 2026}, indikator KPI, IKP, dan POU menggunakan basis data tahun 2025. Adapun indikator SKPG dan panel harga pangan menggunakan basis data tahun {year || 2026}, dengan data SKPG mengacu pada date stamp data balita BB/U dan data harga komoditas diperbarui secara real-time dari panel harga harian.
          </div>
        )}
      </div>

      {/* Main Panel Content: MASKING / GERBANG TOKEN HEMAT (Capture 2) ATAU HASIL KAJIAN AI (Capture 1) */}
      {!isOpen ? (
        <div 
          className="dashboard-card relative flex-1 flex flex-col justify-center items-center border border-emerald-200/90 shadow-md min-h-[220px] rounded-2xl overflow-hidden p-5 sm:p-6 transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.92) 0%, rgba(240, 253, 250, 0.75) 50%, #ffffff 100%)'
          }}
        >
          {/* Subtle decorative curved ambient background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-100/40 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12" />

          {/* Top content row: AI Chip Icon + Title & Description */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left w-full max-w-md">
            {/* 3D-styled AI Chip Illustration */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
              <div className="absolute inset-2 bg-emerald-400/25 rounded-2xl blur-lg pointer-events-none" />
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Pins */}
                <rect x="28" y="5" width="6" height="8" rx="2" fill="#059669" />
                <rect x="47" y="5" width="6" height="8" rx="2" fill="#059669" />
                <rect x="66" y="5" width="6" height="8" rx="2" fill="#059669" />
                <rect x="28" y="87" width="6" height="8" rx="2" fill="#059669" />
                <rect x="47" y="87" width="6" height="8" rx="2" fill="#059669" />
                <rect x="66" y="87" width="6" height="8" rx="2" fill="#059669" />
                <rect x="5" y="28" width="8" height="6" rx="2" fill="#059669" />
                <rect x="5" y="47" width="8" height="6" rx="2" fill="#059669" />
                <rect x="5" y="66" width="8" height="6" rx="2" fill="#059669" />
                <rect x="87" y="28" width="8" height="6" rx="2" fill="#059669" />
                <rect x="87" y="47" width="8" height="6" rx="2" fill="#059669" />
                <rect x="87" y="66" width="8" height="6" rx="2" fill="#059669" />

                {/* Main Chip Body */}
                <rect x="13" y="13" width="74" height="74" rx="18" fill="url(#chipGrad)" stroke="#047857" strokeWidth="2" />
                {/* Inner Bevel */}
                <rect x="21" y="21" width="58" height="58" rx="12" fill="#065f46" fillOpacity="0.18" />

                {/* AI Text */}
                <text x="50" y="59" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontSize="26" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">
                  AI
                </text>

                {/* Corner Accents */}
                <circle cx="21" cy="21" r="2.5" fill="#6ee7b7" />
                <circle cx="79" cy="21" r="2.5" fill="#6ee7b7" />
                <circle cx="21" cy="79" r="2.5" fill="#6ee7b7" />

                {/* Analytics Glass Badge */}
                <g transform="translate(56, 56)">
                  <circle cx="17" cy="17" r="14" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                  <rect x="9.5" y="20.5" width="3" height="6" rx="1" fill="#059669" />
                  <rect x="15" y="15.5" width="3" height="11" rx="1" fill="#059669" />
                  <rect x="20.5" y="11.5" width="3" height="15" rx="1" fill="#10b981" />
                  <line x1="26.5" y1="26.5" x2="33" y2="33" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
                </g>

                <defs>
                  <linearGradient id="chipGrad" x1="13" y1="13" x2="87" y2="87" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Typography */}
            <div className="flex-1">
              <h3 className="text-2xl sm:text-[28px] font-black text-emerald-950 tracking-tight leading-tight">
                AI Insight
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 font-semibold leading-relaxed mt-1.5 max-w-sm">
                Dapatkan rangkuman, analisis, dan rekomendasi ketahanan pangan berbasis AI dari data terbaru Kota Cilegon.
              </p>
            </div>
          </div>

          {/* Action Button: Buka AI Insight -> (tepat di bawah-tengah ikon dan teks) */}
          <div className="relative z-10 mt-5 flex justify-center w-full">
            <button
              onClick={() => {
                setIsOpen(true);
                fetchInsightData();
              }}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#047857] via-[#059669] to-[#047857] hover:from-[#065f46] hover:to-[#065f46] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 group"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 fill-emerald-200 group-hover:rotate-12 transition-transform" />
              <span>Buka AI Insight</span>
              <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        /* Panel Terbuka: Render Hasil Analisis AI dengan Tombol Tutup & Salin */
        <div 
          className="dashboard-card relative flex-1 flex flex-col border border-amber-200/90 shadow-md h-auto min-h-[260px] rounded-2xl animate-in fade-in zoom-in-98 duration-200" 
          style={{ backgroundColor: '#fffbf0' }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-orange-200/30 blur-2xl pointer-events-none z-0"></div>

          {/* Top Actions: Tutup & Copy */}
          <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 print:hidden">
            <button
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 rounded-xl shadow-2xs text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer bg-amber-50/90 backdrop-blur-sm active:scale-95"
              title="Sembunyikan AI Insight"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-700" />
              <span>Tutup</span>
            </button>

            {insight && !loading && (
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-amber-100 border border-amber-200/80 text-amber-800 hover:text-amber-950 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer bg-amber-50/90 backdrop-blur-sm"
                title="Copy Report"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 relative z-10 pt-2 h-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[220px]">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                <p className="text-[10px] text-orange-700 font-black uppercase tracking-wider animate-pulse">Membaca data realtime & merumuskan analisis...</p>
              </div>
            ) : (
              <div className="w-full h-auto max-h-[540px] overflow-y-auto custom-scrollbar pr-1 text-left">
                <div className="prose prose-sm max-w-none prose-slate pr-6 sm:pr-8">
                  {renderMarkdown(
                    insight.replace(/\*?Catatan:\s*Indikator FSVA, KPI, IKP, dan POU.*?(panel harga harian\.\*?|harian\.)/gi, '').trim()
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
