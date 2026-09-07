"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Mic, 
  ArrowUp, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  RotateCcw, 
  ArrowDown, 
  Edit3,
  Database,
  Camera,
  FileText,
  Printer,
  X
} from 'lucide-react';

import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';
import ChatChart, { ChartConfig } from './ChatChart';

// ============================================================
// AIIntelligencePanel
// Panel chat interaktif AI Food Intelligence (ChatGPT UI/UX Style)
// Didukung Fase 2: Multimodal Vision, Executive PDF Generator,
// Reverse Intelligence Trigger, & Spatial Filter MapAction + Recharts Visualization
// ============================================================

interface Message {
  role: 'user' | 'model';
  text: string;
  wilayah?: string[];
  referencedDocs?: string[];
  timestamp: Date;
  imageUrl?: string;
}

interface SyncStatus {
  sp_cache_tables: number;
  tables: { tabel: string; age_minutes: number }[];
}

export interface MatchedPin {
  lat: number;
  lng: number;
  name: string;
  category: string;
  kelurahan: string;
  kecamatan: string;
}

export interface MapAction {
  type: 'FLY_TO' | 'RESET' | 'HIGHLIGHT' | 'FILTER';
  target?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  layersToEnable?: string[];
  pin?: MatchedPin;
  thematicMode?: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting';
  filteredWilayah?: string[];
  filterActive?: boolean;
  filterLabel?: string;
}

interface AIIntelligencePanelProps {
  onWilayahHighlight?: (wilayah: string[]) => void;
  onPinsHighlight?: (pins: MatchedPin[]) => void;
  onMapAction?: (action: MapAction) => void;
  isFullScreen?: boolean;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

const QUICK_PROMPTS = [
  '📈 Buat grafik produksi padi 5 tahun terakhir beserta trendline',
  '📊 Grafik tren produksi ubi kayu/singkong Cilegon',
  '🗺️ Tampilkan peta tematik IKP seluruh kelurahan',
  '🌾 Berapa total luas sawah siap panen sekarang?',
  '🐟 Bagaimana kondisi kolam budidaya dan nelayan di Cilegon?',
  '👨‍🌾 Di kelurahan mana yang paling banyak terdapat peternak?'
];

function formatTime(d: Date): string {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Deteksi Blok Visualisasi Grafik (```json:chart atau ```chart atau ```json dengan struktur chart)
    if (trimmed.startsWith('```json:chart') || trimmed.startsWith('```chart') || trimmed.startsWith('```json')) {
      const isChartTag = trimmed.startsWith('```json:chart') || trimmed.startsWith('```chart');
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }

      const rawCode = codeLines.join('\n').trim();
      let parsedChart: ChartConfig | null = null;
      try {
        const jsonObj = JSON.parse(rawCode);
        if (jsonObj && (jsonObj.data || jsonObj.type || jsonObj.xAxisKey || isChartTag)) {
          parsedChart = {
            type: jsonObj.type || 'line',
            title: jsonObj.title || 'Visualisasi Data',
            description: jsonObj.description || '',
            xAxisKey: jsonObj.xAxisKey || Object.keys(jsonObj.data?.[0] || {})[0] || 'label',
            series: jsonObj.series || [
              { key: Object.keys(jsonObj.data?.[0] || {}).find(k => k !== jsonObj.xAxisKey) || 'value', label: 'Nilai' }
            ],
            data: jsonObj.data || [],
            showTrendline: jsonObj.showTrendline ?? true
          };
        }
      } catch {
        parsedChart = null;
      }

      if (parsedChart && parsedChart.data && parsedChart.data.length > 0) {
        elements.push(
          <ChatChart key={`chart-${i}`} config={parsedChart} />
        );
        continue;
      } else {
        // Fallback jika blok kode biasa
        elements.push(
          <pre key={`code-${i}`} className="my-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto font-mono custom-scrollbar">
            <code>{rawCode}</code>
          </pre>
        );
        continue;
      }
    }

    // Deteksi tabel Markdown (| Kolom 1 | Kolom 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCols = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const rowLines = tableLines.slice(2);

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-xs custom-scrollbar">
            <table className="min-w-full text-[12px] text-left border-collapse bg-white">
              <thead className="bg-emerald-800 text-white font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  {headerCols.map((col, ci) => (
                    <th key={ci} className="px-3 py-2 border-b border-emerald-900 whitespace-nowrap">
                      {parseBold(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rowLines.map((r, ri) => {
                  const cells = r.split('|').slice(1, -1).map(c => c.trim());
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/80 hover:bg-emerald-50/50'}>
                      {cells.map((cell, cidx) => (
                        <td key={cidx} className="px-3 py-2 text-slate-800 font-medium whitespace-normal">
                          {parseBold(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-[13px] font-extrabold text-emerald-800 mt-3 mb-1 uppercase tracking-wide border-b border-emerald-100 pb-0.5">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-[14px] font-black text-slate-800 mt-3.5 mb-1 uppercase tracking-wide">
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-[15px] font-black text-slate-900 mt-3.5 mb-1.5">
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 mb-1 ml-2 items-start">
          <span className="text-emerald-600 font-bold mt-0.5 shrink-0">•</span>
          <span className="text-[12.5px] text-slate-700 font-medium leading-relaxed">
            {parseBold(trimmed.substring(2))}
          </span>
        </div>
      );
      i++;
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 mb-1 ml-2 items-start">
          <span className="text-emerald-700 font-extrabold text-[12px] shrink-0 mt-0.5">{numMatch[1]}.</span>
          <span className="text-[12.5px] text-slate-700 font-medium leading-relaxed">
            {parseBold(numMatch[2])}
          </span>
        </div>
      );
      i++;
      continue;
    }
    if (trimmed === '') {
      elements.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-[12.5px] text-slate-700 font-medium leading-relaxed mb-1.5">
        {parseBold(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Komponen Modal Pratinjau Cetak Nota Dinas Eksekutif (Fase 2)
function ExecutivePrintModal({
  doc,
  onClose,
}: {
  doc: { title: string; content: string; date: string; docNo: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-8 relative max-h-[92vh] flex flex-col border border-slate-200">
        {/* Actions Bar Top */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="text-sm font-black text-slate-800">Pratinjau Nota Dinas Eksekutif</h3>
              <p className="text-[11px] text-slate-500">Format resmi Dinas Ketahanan Pangan dan Pertanian Kota Cilegon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[12px] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div id="executive-doc-print-area" className="flex-1 overflow-y-auto py-5 px-3 sm:px-6 print:p-0 font-serif text-slate-900 custom-scrollbar">
          {/* Kop Dinas Resmi */}
          <div className="text-center pb-3 border-b-4 border-double border-slate-900">
            <h2 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-900">
              PEMERINTAH KOTA CILEGON
            </h2>
            <h1 className="text-lg sm:text-xl font-black tracking-wide uppercase text-slate-900 mt-0.5">
              DINAS KETAHANAN PANGAN DAN PERTANIAN
            </h1>
            <p className="text-[11px] font-sans text-slate-600 mt-1">
              Jl. KH. Wasyid No. 12, Kel. Jombang Wetan, Kec. Jombang, Kota Cilegon, Banten 42411
            </p>
            <p className="text-[10.5px] font-sans text-slate-500">
              Laman: ketapang.cilegon.go.id | Pos-el: dkp@cilegon.go.id | Telp. (0254) 391234
            </p>
          </div>

          {/* Metadata Nota Dinas */}
          <div className="my-5 text-[12px] font-sans">
            <div className="text-center font-bold text-[14px] uppercase tracking-wider underline mb-4 text-slate-900">
              NOTA DINAS INTELIJEN KETAHANAN PANGAN
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] border border-slate-300 p-3 rounded-lg bg-slate-50/50 mb-4">
              <div>
                <div><b>Nomor:</b> {doc.docNo}</div>
                <div><b>Sifat:</b> PENTING / SEGERA</div>
                <div><b>Lampiran:</b> 1 (Satu) Berkas Analisis GIS Terpadu</div>
              </div>
              <div>
                <div><b>Tanggal:</b> {doc.date}</div>
                <div><b>Kepada Yth:</b> Walikota Cilegon</div>
                <div><b>Perihal:</b> {doc.title}</div>
              </div>
            </div>
          </div>

          {/* Isi Laporan */}
          <div className="font-sans text-[12.5px] leading-relaxed text-slate-800 space-y-3">
            {renderMarkdown(doc.content)}
          </div>

          {/* Kolom Pengesahan Pimpinan */}
          <div className="mt-8 pt-4 flex justify-end font-sans text-[12px] break-inside-avoid">
            <div className="text-center w-64">
              <div>Cilegon, {doc.date}</div>
              <div className="font-bold mt-1">Kepala Dinas Ketahanan Pangan dan Pertanian</div>
              <div className="font-bold">Kota Cilegon</div>
              <div className="h-16 flex items-center justify-center text-slate-300 italic text-[11px]">
                (Ruang Tanda Tangan & Cap Dinas)
              </div>
              <div className="font-black text-slate-900 underline">Drs. H. M. Ridwan, M.Si</div>
              <div className="text-slate-600 text-[11px]">Pembina Utama Muda (IV/c)</div>
              <div className="text-slate-600 text-[11px]">NIP. 19740512 199803 1 004</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIIntelligencePanel({
  onWilayahHighlight,
  onPinsHighlight,
  onMapAction,
  isFullScreen = false,
  externalPrompt,
  onClearExternalPrompt
}: AIIntelligencePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ [key: number]: 'like' | 'dislike' | null }>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Multimodal Vision state (Fase 2)
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Executive PDF Generator state (Fase 2)
  const [executiveDoc, setExecutiveDoc] = useState<{ title: string; content: string; date: string; docNo: string } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom saat pesan baru bertambah
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading, scrollToBottom]);

  // Handle klik chip sorotan wilayah untuk interaksi langsung ke peta
  const handleWilayahClick = (wilayahName: string) => {
    const cleanName = wilayahName.replace(/^Kelurahan\s+|^Kecamatan\s+/i, '').trim();
    const coord = KELURAHAN_COORDINATES[cleanName];
    if (coord && onMapAction) {
      onMapAction({
        type: 'FLY_TO',
        target: cleanName,
        lat: coord.lat,
        lng: coord.lng,
        zoom: 16,
        layersToEnable: ['kelurahan', 'sawah'],
        pin: {
          lat: coord.lat,
          lng: coord.lng,
          name: `Kelurahan ${cleanName}`,
          category: 'wilayah',
          kelurahan: cleanName,
          kecamatan: coord.kec
        }
      });
    }
    if (onWilayahHighlight) {
      onWilayahHighlight([cleanName]);
    }
  };

  // Monitor scroll position
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  // Status sync data Serumpun Padi
  const loadSync = useCallback(async () => {
    try {
      const res = await fetch('/api/sp-sync');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadSync();
  }, [loadSync]);

  // Trigger manual sync & copy database
  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await fetch('/api/sp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccessMsg('Database Serumpun-Padi berhasil disinkronkan & disalin!');
        await loadSync();
        setTimeout(() => setSyncSuccessMsg(null), 3500);
      }
    } catch {
      setSyncSuccessMsg('Gagal menyinkronkan database.');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    }
    setSyncing(false);
  };

  // Effect untuk mengeksekusi external prompt dari aksi klik peta (Reverse Intelligence & Agri-Advisory)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      sendMessage(externalPrompt.trim());
      onClearExternalPrompt?.();
    }
  }, [externalPrompt, onClearExternalPrompt]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas gambar maksimal 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64Data = res.split(',')[1];
      setSelectedImage({
        file,
        preview: URL.createObjectURL(file),
        base64: base64Data,
        mimeType: file.type || 'image/jpeg'
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePrintExecutive = (msgText: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now.getMonth()];
    const docNo = `500.1.1/ND-INTEL/${monthRoman}/${now.getFullYear()}`;
    setExecutiveDoc({
      title: 'LAPORAN INTELIJEN KETAHANAN PANGAN & SPASIAL',
      content: msgText,
      date: dateStr,
      docNo
    });
  };

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && !selectedImage) return;
    if (loading) return;

    const currentImg = selectedImage;
    const userMsg: Message = {
      role: 'user',
      text: trimmed || 'Analisis foto/kondisi ini terkait pertanian/pangan Kota Cilegon',
      imageUrl: currentImg?.preview,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setLoading(true);
    setPlusMenuOpen(false);

    // ─── INSTANT REAL-TIME MAP REACTION (Client Pre-trigger) ───
    const queryLower = trimmed.toLowerCase();
    for (const [kelName, coord] of Object.entries(KELURAHAN_COORDINATES)) {
      if (queryLower.includes(kelName.toLowerCase())) {
        const isSawah = queryLower.includes('sawah');
        const layers = ['kelurahan'];
        if (isSawah) layers.push('sawah');
        if (queryLower.includes('nelayan') || queryLower.includes('pangkalan')) layers.push('nelayan');
        if (queryLower.includes('kolam') || queryLower.includes('budidaya')) layers.push('kolam');

        const prePin: MatchedPin = {
          lat: coord.lat,
          lng: coord.lng,
          name: isSawah ? `Sawah Kelurahan ${kelName}` : `Kelurahan ${kelName}`,
          category: isSawah ? 'sawah' : 'wilayah',
          kelurahan: kelName,
          kecamatan: coord.kec
        };

        if (onMapAction) {
          onMapAction({
            type: 'FLY_TO',
            target: kelName,
            lat: coord.lat,
            lng: coord.lng,
            zoom: isSawah ? 16 : 15.5,
            layersToEnable: layers,
            pin: prePin
          });
        }
        if (onPinsHighlight) onPinsHighlight([prePin]);
        if (onWilayahHighlight) onWilayahHighlight([kelName]);
        break;
      }
    }

    const history = messages.map(m => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/ai-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed || 'Tolong diagnosis foto tanaman/hama/posyandu ini dan berikan rekomendasi penanganan.',
          history,
          imageData: currentImg ? { data: currentImg.base64, mimeType: currentImg.mimeType } : undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.text) {
        const modelMsg: Message = {
          role: 'model',
          text: data.text,
          wilayah: data.wilayah_highlight || [],
          referencedDocs: data.referenced_docs || [],
          timestamp: new Date()
        };
        setMessages(prev => [...prev, modelMsg]);

        if (data.map_action && onMapAction) {
          onMapAction({
            type: data.map_action.type,
            target: data.map_action.target,
            lat: data.map_action.lat,
            lng: data.map_action.lng,
            zoom: data.map_action.zoom,
            layersToEnable: data.map_action.layers_to_enable,
            pin: data.map_action.pin,
            thematicMode: data.map_action.thematic_mode || data.map_action.thematicMode,
            filteredWilayah: data.map_action.filtered_wilayah,
            filterActive: data.map_action.filter_active,
            filterLabel: data.map_action.filter_label,
          });
        }
        if (data.wilayah_highlight?.length > 0 && onWilayahHighlight) {
          onWilayahHighlight(data.wilayah_highlight);
        }
        if (data.matched_pins && onPinsHighlight) {
          onPinsHighlight(data.matched_pins);
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: `⚠️ **Terjadi kesalahan:** ${data.error || 'Respons tidak tersedia. Silakan coba lagi.'}`,
            timestamp: new Date()
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: '⚠️ **Koneksi gagal.** Periksa koneksi internet Anda dan coba lagi.',
          timestamp: new Date()
        }
      ]);
    }

    setLoading(false);
  }, [loading, messages, onWilayahHighlight, onPinsHighlight, onMapAction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRegenerate = (msgIndex: number) => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sendMessage(messages[i].text);
        break;
      }
    }
  };

  const handleEditPrompt = (text: string) => {
    setInputValue(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleFeedback = (idx: number, type: 'like' | 'dislike') => {
    setFeedbackState(prev => ({
      ...prev,
      [idx]: prev[idx] === type ? null : type
    }));
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.webkitSpeechRecognition && !win.SpeechRecognition) {
      alert('Fitur input suara belum didukung di browser ini.');
      return;
    }
    setIsListening(!isListening);
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative ${isFullScreen ? 'h-full' : 'h-[580px]'}`}>
      
      {/* Top Subtle Sync Status Bar */}
      <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5 font-bold">
          {syncSuccessMsg && (
            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black animate-pulse">
              {syncSuccessMsg}
            </span>
          )}
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-1 text-[9.5px] font-black uppercase text-slate-500 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-50 ml-auto"
          title="Sinkron & Salin Manual Database Serumpun Padi ke Dashboard Ketapang"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
          {syncing ? 'Menyinkronkan…' : 'Sinkron Database'}
        </button>
      </div>

      {/* Scrollable Chat Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-5 py-3 space-y-4 custom-scrollbar bg-slate-50/30 relative"
      >
        
        {/* Initial / Empty State — ChatGPT Style Quick Prompts (Mockup 1) */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col justify-center min-h-[340px] py-2">
            <div className="w-full max-w-xl mx-auto space-y-2.5">
              
              <div className="flex items-center justify-center gap-1.5 text-slate-400 font-extrabold text-[10.5px] uppercase tracking-wider mb-1">
                <ChevronDown className="w-3 h-3" />
                <span>PERTANYAAN CEPAT</span>
              </div>

              {/* List Pertanyaan Cepat (Pills Card Sesuai Mockup 1) */}
              <div className="space-y-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-full px-4 py-2.5 text-slate-700 hover:text-emerald-950 font-bold text-xs shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] flex items-center justify-between group"
                  >
                    <span className="line-clamp-1">{prompt}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-emerald-600 text-xs font-black transition-opacity ml-2 shrink-0">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg, idx) => (
          <div key={idx} className="w-full">
            {msg.role === 'user' ? (
              
              /* USER MESSAGE */
              <div className="flex flex-col items-end mb-3 group">
                <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-xs max-w-[85%] md:max-w-[75%] font-medium text-[12.5px] leading-relaxed">
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                      <img src={msg.imageUrl} alt="Lampiran Foto" className="max-h-52 w-auto object-cover rounded-lg" />
                    </div>
                  )}
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 mt-0.5 mr-1 text-[9.5px] text-slate-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{formatTime(msg.timestamp)}</span>
                  <button 
                    onClick={() => handleEditPrompt(msg.text)}
                    className="hover:text-slate-700 cursor-pointer flex items-center gap-1"
                    title="Edit prompt"
                  >
                    <Edit3 className="w-2.5 h-2.5" /> Edit
                  </button>
                </div>
              </div>

            ) : (

              /* MODEL MESSAGE (Full width without left avatar column) */
              <div className="mb-4 group w-full">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 md:p-4 shadow-xs space-y-1.5 w-full">
                  <div className="prose prose-sm max-w-none text-slate-800">
                    {renderMarkdown(msg.text)}
                  </div>

                  {/* Wilayah highlight tags */}
                  {msg.wilayah && msg.wilayah.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1 items-center">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                        📍 Sorotan:
                      </span>
                      {msg.wilayah.map((w, wi) => (
                        <button 
                          key={wi} 
                          onClick={() => handleWilayahClick(w)}
                          className="text-[9.5px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shadow-2xs"
                          title={`Klik untuk mengarahkan peta ke ${w}`}
                        >
                          <span>📍</span>
                          <span>{w}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Referenced Docs tags */}
                  {msg.referencedDocs && msg.referencedDocs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 items-center pt-1.5 border-t border-slate-100">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                        📚 Dokumen:
                      </span>
                      {msg.referencedDocs.map((doc, di) => (
                        <span 
                          key={di} 
                          className="text-[9.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200/70 px-1.5 py-0.5 rounded-md"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar (Copy, Share, Feedback, Regenerate, PDF Export) */}
                  <div className="flex items-center gap-1 pt-2 border-t border-slate-100 text-slate-400 text-xs flex-wrap">
                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center gap-1 text-[10.5px] font-medium"
                      title="Salin jawaban"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => toggleFeedback(idx, 'like')}
                      className={`p-1 hover:bg-slate-200/60 rounded transition-all cursor-pointer ${
                        feedbackState[idx] === 'like' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Bagus / Akurat"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => toggleFeedback(idx, 'dislike')}
                      className={`p-1 hover:bg-slate-200/60 rounded transition-all cursor-pointer ${
                        feedbackState[idx] === 'dislike' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Perlu perbaikan"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      title="Bagikan jawaban"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleRegenerate(idx)}
                      className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      title="Regenerasi respons"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>

                    {/* One-Click Executive PDF Generator (Fase 2) */}
                    <button
                      onClick={() => handlePrintExecutive(msg.text)}
                      className="p-1 hover:bg-emerald-50 rounded text-slate-600 hover:text-emerald-700 transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] font-bold ml-1.5 border border-slate-200 hover:border-emerald-300 px-2.5 py-0.5 shadow-2xs bg-white"
                      title="Cetak Nota Dinas Resmi / Simpan PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>📄 Cetak Nota Dinas / PDF</span>
                    </button>

                    <span className="text-[9.5px] text-slate-400 font-semibold ml-2">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="w-full mb-4">
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs flex items-center gap-2 w-fit">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span className="text-[11.5px] font-bold text-slate-600 animate-pulse">
                Sedang menganalisis data spasial & menghitung respons…
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 z-30 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-all cursor-pointer hover:shadow-lg active:scale-95"
          title="Gulir ke paling bawah"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Permanently Anchored Input Box Area (Reduced Height by 50% as in Capture 2) */}
      <div className="p-2 md:p-2.5 bg-white border-t border-slate-200 shrink-0 relative z-20">
        
        {/* Multimodal Image Preview Card (Fase 2) */}
        {selectedImage && (
          <div className="mb-2 p-1.5 bg-slate-900/90 text-white rounded-xl flex items-center justify-between gap-2 shadow-md border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={selectedImage.preview} alt="Upload" className="w-9 h-9 object-cover rounded-lg border border-white/20 shrink-0" />
              <div className="text-[11px] truncate">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>📷 Foto Siap Dianalisis AI</span>
                  <span className="text-[9px] bg-emerald-800 text-emerald-200 px-1 rounded font-black">Vision</span>
                </div>
                <div className="text-[9.5px] text-slate-300 truncate max-w-[200px]">{selectedImage.file.name}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer transition-colors"
              title="Batalkan foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input for Multimodal Vision */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Expanded Mode */}
        {isExpanded ? (
          <div className="w-full bg-white border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 rounded-xl transition-all duration-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-2.5 pt-1.5 pb-0.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode Input Penuh</span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Perkecil input (Collapse)"
              >
                <Minimize2 className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>
            
            <div className="flex-1 px-2.5 py-1 overflow-hidden flex flex-col">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan atau upload foto daun padi/hama/posyandu…"
                rows={3}
                disabled={loading}
                className="w-full flex-1 bg-transparent resize-none outline-none text-[12.5px] text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal leading-relaxed custom-scrollbar disabled:opacity-50 overflow-y-auto"
              />
            </div>

            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-0.5 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPlusMenuOpen(s => !s)}
                  className="w-6 h-6 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                  title="Pilihan / Pertanyaan Cepat"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* Upload Foto / Vision Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-6 h-6 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer"
                  title="Unggah Foto Daun/Hama/Posyandu (Multimodal Vision)"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Input suara (Mic)"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => sendMessage(inputValue)}
                  disabled={loading || (!inputValue.trim() && !selectedImage)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                    (inputValue.trim() || selectedImage) && !loading
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Kirim (Enter)"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (

          /* Normal Mode (Sleek Compact Single Row ~50% Height) */
          <div className="w-full bg-white border border-slate-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-100 rounded-xl transition-all duration-200 shadow-xs flex items-center px-2 py-1 gap-1.5">
            
            {/* Plus Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPlusMenuOpen(s => !s)}
                className="w-6 h-6 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="Pilihan / Pertanyaan Cepat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {plusMenuOpen && (
                <div className="absolute bottom-8 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="text-[9.5px] font-black text-slate-400 uppercase px-2 py-1">Pilih Cepat Topik:</div>
                  {QUICK_PROMPTS.slice(0, 4).map((qp, qpi) => (
                    <button
                      key={qpi}
                      onClick={() => {
                        setInputValue(qp);
                        setPlusMenuOpen(false);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="w-full text-left text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 px-2 py-1 rounded-md transition-colors cursor-pointer truncate"
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Foto / Vision Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-6 h-6 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Unggah Foto Daun/Hama/Posyandu (Multimodal Vision)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Input Textarea (Single Row Auto-Expanding) */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan atau upload foto hama/pertanian…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent resize-none outline-none text-[12.5px] text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal leading-normal custom-scrollbar max-h-16 py-0.5 disabled:opacity-50"
            />

            {/* Right Tools: Mic, Expand Diagonal, Send */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Input suara (Mic)"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="Perluas input (Expand)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => sendMessage(inputValue)}
                disabled={loading || (!inputValue.trim() && !selectedImage)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                  (inputValue.trim() || selectedImage) && !loading
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Kirim (Enter)"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Subtext */}
        <p className="text-[9.5px] text-slate-400 font-medium mt-1 text-center">
          Enter kirim · Shift+Enter baris baru · Multimodal Vision & GIS AI Cilegon
        </p>
      </div>

      {/* Executive Print Modal (Fase 2) */}
      {executiveDoc && (
        <ExecutivePrintModal
          doc={executiveDoc}
          onClose={() => setExecutiveDoc(null)}
        />
      )}
    </div>
  );
}
