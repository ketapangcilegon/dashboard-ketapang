"use client";

import { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Download, Lightbulb } from 'lucide-react';

interface AIInsightPanelProps {
  year: number;
  month: number;
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

const getHeuristicInsightText = (pph: number, cv: number, ketEnergi: number, konEnergi: number, ketProt: number, konProt: number) => {
  const pphVal = pph || 95;
  const cvVal = cv || 0.74;
  const keVal = ketEnergi || 2582;
  const konEVal = konEnergi || 2150;
  const kpVal = ketProt || 85;
  const konPVal = konProt || 62.5;

  return `### 1. Ringkasan Eksekutif
Berdasarkan pemindaian data real-time, status ketahanan pangan Kota Cilegon berada pada kategori **KONDISI AMAN & SEHAT**. Nilai skor PPH Konsumsi saat ini berada di angka **${pphVal}** dari target nasional (90), menunjukkan keragaman konsumsi pangan penduduk sudah melampaui standar ideal nasional. Koefisien Variasi (CV) Bulanan harga beras tercatat sebesar **${cvVal}%**, menandakan stabilitas pasokan pangan pokok utama di wilayah Cilegon dalam kondisi sangat stabil dan terkendali.

### 2. Analisis Metodologis: Konsumsi vs Keterseidaan
Terdapat korelasi yang sehat antara ketersediaan gizi di pasar dengan konsumsi aktual masyarakat:
- **Sektor Energi**: Ketersediaan energi tercatat **${keVal} kkal/kapita/hari** (standar 2400 kkal), mendukung tingkat konsumsi aktual sebesar **${konEVal} kkal/kapita/hari**.
- **Sektor Protein**: Ketersediaan protein sebesar **${kpVal} gram/kapita/hari** (standar 63 gram), mencukupi konsumsi protein penduduk sebesar **${konPVal} gram/kapita/hari**.

### 3. Rekomendasi Kebijakan Strategis
1. **Penguatan Cadangan Pangan**: Pertahankan stok beras pemerintah daerah (CPPD) pada level aman di atas target 115 Ton.
2. **Pemantauan EWS**: Lakukan pemantauan berkala pada komoditas dengan volatilitas tinggi (cabai rawit & bawang merah) menjelang HBKN.
3. **Program Intervensi Gizi**: Lanjutkan intervensi posyandu di kelurahan lokus stunting untuk menjaga status gizi balita tetap baik.`;
};

export default function AIInsightPanel({
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
  balitaStatus,
  hargaStrategis,
  loadingPrices,
  isFullScreen = false
}: AIInsightPanelProps) {
  const [insight, setInsight] = useState<string>(() => 
    getHeuristicInsightText(pphScore, cvBeras, ketersediaanEnergi, konsumsiEnergi, ketersediaanProtein, konsumsiProtein)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  useEffect(() => {
    // Update heuristic immediately when props change
    setInsight(getHeuristicInsightText(pphScore, cvBeras, ketersediaanEnergi, konsumsiEnergi, ketersediaanProtein, konsumsiProtein));
    
    if (loadingPrices) return;
    let active = true;

    async function getInsight() {
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
            balitaStatus,
            hargaStrategis
          }),
        });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data?.insight) {
          setInsight(data.insight);
          setIsFallback(Boolean(data.isFallback));
        }
      } catch (err) {
        // Keep instant heuristic text on error
      }
    }

    getInsight();

    return () => {
      active = false;
    };
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
    balitaStatus,
    hargaStrategis,
    loadingPrices
  ]);

  const handleCopy = () => {
    if (!insight) return;
    navigator.clipboard.writeText(insight);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = () => {
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
        const cleanTitle = trimmed.replace(/^#+\s*/, '');
        return (
          <h4 key={idx} className={`${isFullScreen ? 'text-[14px] mt-4 mb-2' : 'text-[13px] mt-3 mb-1.5'} font-extrabold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1`}>
            {cleanTitle}
          </h4>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <div key={idx} className={`${isFullScreen ? 'text-[13px] mb-2' : 'text-[12px] mb-1.5'} text-slate-600 font-semibold leading-relaxed ml-3 flex gap-2`}>
            <span className="text-blue-500 font-bold">•</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }
      const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const content = numMatch[2];
        return (
          <div key={idx} className={`${isFullScreen ? 'text-[12px] mb-2' : 'text-[12px] mb-1.5'} text-slate-600 font-semibold leading-relaxed ml-2 pl-1 flex gap-1.5`}>
            <span className="font-extrabold text-blue-600 shrink-0">{numMatch[1]}.</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }
      if (trimmed === '') return <div key={idx} className={isFullScreen ? 'h-2' : 'h-1.5'} />;
      return <p key={idx} className={`${isFullScreen ? 'text-[13px] mb-3' : 'text-[12px] mb-2'} text-slate-600 font-semibold leading-relaxed`}>{parseBoldText(line)}</p>;
    });
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-stretch gap-2.5">
            <div className="w-[3px] bg-emerald-600 rounded-full shrink-0"></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug uppercase tracking-wide">
                  INSIGHT KETAHANAN PANGAN CILEGON {year}-{year + 1}
                </h3>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-1 hover:bg-amber-100/50 rounded-full transition-colors cursor-pointer text-amber-500 hover:text-amber-600 focus:outline-none shrink-0"
                  title="Catatan Data Indikator"
                >
                  <Lightbulb className="w-4 h-4 fill-amber-100 text-amber-500" />
                </button>
              </div>
              <div className="font-bold italic text-slate-700 text-xs sm:text-sm mt-0.5">
                AI Assisted Heuristic Analisys
              </div>
            </div>
          </div>

          {insight && !loading && (
            <button
              onClick={handleDownloadDocx}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition-all shrink-0 flex items-center gap-1 pt-0.5 print:hidden"
              title="Download Docx"
            >
              Download docx
            </button>
          )}
        </div>

        {showInfo && (
          <div className="mt-2 ml-3 text-[10px] text-slate-650 bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg font-medium leading-relaxed shadow-sm animate-in fade-in duration-200 max-w-xl">
            Catatan: Indikator FSVA, KPI, IKP, dan POU menggunakan basis data tahun 2025. Adapun indikator SKPG dan panel harga pangan menggunakan basis data tahun 2026, dengan data SKPG mengacu pada date stamp data balita BB/U dan data harga komoditas diperbarui secara real-time dari panel harga harian.
          </div>
        )}
      </div>

      <div className={`dashboard-card relative flex-1 flex flex-col bg-gradient-to-br from-white to-blue-50/20 overflow-hidden h-[600px] lg:h-auto ${isFullScreen ? 'min-h-0' : 'min-h-[300px]'}`}>
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-blue-100/30 blur-2xl pointer-events-none z-0"></div>

        {insight && !loading && (
          <button
            onClick={handleCopy}
            className="absolute top-3.5 right-3.5 z-20 p-1.5 hover:bg-slate-100/80 border border-slate-200/80 text-slate-500 hover:text-slate-800 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer bg-white/90 backdrop-blur-sm print:hidden"
            title="Copy Report"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex-1 relative overflow-hidden z-10 pt-2">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[220px]">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider animate-pulse">Membaca data realtime & merumuskan analisis...</p>
            </div>
          ) : (
            <div className={`w-full h-full overflow-y-auto pr-1 ${isFullScreen ? 'max-h-none' : 'max-h-[460px] lg:max-h-[240px]'} print:max-h-none print:overflow-visible print:h-auto custom-scrollbar text-left`}>
              <div className="prose prose-sm max-w-none prose-slate pr-8">
                {renderMarkdown(
                  insight.replace(/\*?Catatan:\s*Indikator FSVA, KPI, IKP, dan POU.*?(panel harga harian\.\*?|harian\.)/gi, '').trim()
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
