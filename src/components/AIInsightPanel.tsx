"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Loader2, Download } from 'lucide-react';

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
    minyak: number;
    telur: number;
    gula: number;
    cabai: number;
  };
  loadingPrices: boolean;
  isFullScreen?: boolean;
}

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
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  useEffect(() => {
    if (loadingPrices) {
      setLoading(true);
      return;
    }
    let active = true;

    async function getInsight() {
      setLoading(true);
      try {
        const response = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
          })
        });

        if (!response.ok) {
          throw new Error('Gagal memuat AI Insight.');
        }

        const data = await response.json();
        if (active && data.success) {
          setInsight(data.insight);
          setIsFallback(!!data.isFallback);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
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
    balitaStatus.total,
    balitaStatus.status,
    hargaStrategis.beras,
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
    
    // Clean and format markdown to basic HTML for Word compatibility
    const formattedHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>AI Insight Ketahanan Pangan Kota Cilegon Tahun ${year}</title>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
          h2 { font-size: 16pt; color: #0b1e41; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; margin-top: 20px; }
          h3 { font-size: 13pt; color: #1d4ed8; margin-top: 15px; }
          h4 { font-size: 11pt; color: #3b82f6; margin-top: 12px; }
          p { margin-bottom: 10px; text-align: justify; }
          li { margin-left: 20px; margin-bottom: 5px; }
          strong { color: #0b1e41; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>AI INSIGHT KETAHANAN PANGAN KOTA CILEGON TAHUN ${year}</h2>
        <p style="font-size: 9pt; color: #64748b; margin-top: -10px; margin-bottom: 20px;">
          Dibuat secara otomatis oleh AI GovTech pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div>
          ${insight
            .split('\n')
            .map(line => {
              if (line.startsWith('### ')) {
                return `<h3>${line.substring(4).replace(/\*\*/g, '')}</h3>`;
              }
              if (line.startsWith('#### ')) {
                return `<h4>${line.substring(5).replace(/\*\*/g, '')}</h4>`;
              }
              if (line.trim().startsWith('- ')) {
                return `<li>${line.trim().substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`;
              }
              const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                return `<p><strong>${numMatch[1]}.</strong> ${numMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
              }
              if (line.trim() === '') return '<br/>';
              return `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
            })
            .join('\n')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + formattedHtml], { type: 'application/msword' });
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
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-[#0B1E41]">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      // Header 3: ### **title**
      if (line.startsWith('### ')) {
        const content = line.substring(4).replace(/\*\*/g, '');
        return (
          <h3 key={idx} className={`${isFullScreen ? 'text-sm mt-5 mb-3' : 'text-xs mt-4 mb-2'} font-black text-blue-950 uppercase tracking-wider first:mt-0 border-b border-slate-100 pb-1 flex items-center gap-1.5`}>
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            {content}
          </h3>
        );
      }
      // Header 4: #### **title**
      if (line.startsWith('#### ')) {
        const content = line.substring(5).replace(/\*\*/g, '');
        return <h4 key={idx} className={`${isFullScreen ? 'text-xs' : 'text-[11px]'} font-extrabold text-blue-700 mt-3 mb-1`}>{content}</h4>;
      }
      // Bullet item: - **bold**: text
      if (line.trim().startsWith('- ')) {
        const content = line.trim().substring(2);
        return (
          <li key={idx} className={`${isFullScreen ? 'text-xs mb-2' : 'text-[11px] mb-1.5'} text-slate-600 font-semibold leading-relaxed ml-4 list-disc pl-1`}>
            {parseBoldText(content)}
          </li>
        );
      }
      // Numbered item: 1. **bold**: text
      const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const content = numMatch[2];
        return (
          <div key={idx} className={`${isFullScreen ? 'text-xs mb-2' : 'text-[11px] mb-1.5'} text-slate-600 font-semibold leading-relaxed ml-2 pl-1 flex gap-1.5`}>
            <span className="font-extrabold text-blue-600 shrink-0">{numMatch[1]}.</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }
      // Standard paragraph
      if (line.trim() === '') return <div key={idx} className={isFullScreen ? 'h-2' : 'h-1.5'} />;
      return <p key={idx} className={`${isFullScreen ? 'text-[13px] mb-3' : 'text-[11px] mb-2'} text-slate-600 font-semibold leading-relaxed`}>{parseBoldText(line)}</p>;
    });
  };

  return (
    <div className={`dashboard-card relative flex-1 flex flex-col bg-gradient-to-br from-white to-blue-50/20 overflow-hidden ${isFullScreen ? 'min-h-0' : 'min-h-[300px]'}`}>
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-blue-100/30 blur-2xl pointer-events-none z-0"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm leading-none uppercase tracking-wide">AI Insight Ketahanan Pangan Kota Cilegon Tahun {year}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
              Kota Cilegon &bull; Model {isFallback ? 'Heuristic Analysis' : 'Gemini Active'}
            </p>
          </div>
        </div>

        {/* Actions Button Group */}
        {insight && !loading && (
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleDownloadDocx}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 hover:border-emerald-300 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
              title="Download Docx"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download docx
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-slate-100 border border-slate-200/60 text-slate-500 hover:text-slate-800 rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer bg-white"
              title="Copy Report"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden z-10">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center min-h-[220px]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider animate-pulse">Membaca data realtime & merumuskan analisis...</p>
          </div>
        ) : (
          <div className={`w-full h-full overflow-y-auto pr-1 ${isFullScreen ? 'max-h-none' : 'max-h-[240px]'} print:max-h-none print:overflow-visible print:h-auto custom-scrollbar text-left`}>
            <div className="prose prose-sm max-w-none prose-slate">
              {renderMarkdown(
                insight.replace(/\*?Catatan:\s*Indikator FSVA, KPI, IKP, dan POU.*?(panel harga harian\.\*?|harian\.)/gi, '').trim()
              )}
            </div>
          </div>
        )}
      </div>

      {/* Static Footer Note */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 z-10 text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed text-justify">
        Catatan: Indikator FSVA, KPI, IKP, dan POU menggunakan basis data tahun 2025. Adapun indikator SKPG dan panel harga pangan menggunakan basis data tahun 2026, dengan data SKPG mengacu pada date stamp data balita BB/U dan data harga komoditas diperbarui secara real-time dari panel harga harian.
      </div>
    </div>
  );
}
