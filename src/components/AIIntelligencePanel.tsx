"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  ThumbsUp,
  ThumbsDown,
  ArrowDown,
  Edit3,
  Camera,
  Trash2,
  X,
  Brain,
  ExternalLink,
  BookOpen,
  Database,
  MapPin,
} from 'lucide-react';

import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';
import ChatChart, { ChartConfig } from './ChatChart';
import { HargaPanganChatPanel } from './chat/HargaPanganChatPanel';
import { ForecastChatTable } from './chat/ForecastChatTable';
import { IkpPouChatPanel } from './chat/IkpPouChatPanel';
import { IndikatorKetapangChatPanel } from './chat/IndikatorKetapangChatPanel';
import { EwsChatPanel } from './chat/EwsChatPanel';
import { GkgChatPanel } from './chat/GkgChatPanel';
import { MapTematikChatCard } from './chat/MapTematikChatCard';
import type {
  SagonPanelData,
  ForecastTableData,
  IkpPouPanelData,
  IndikatorKetapangPanelData,
  EwsPanelData,
  GkgPanelData,
} from '@/lib/chatPanels';

// ============================================================
// AIIntelligencePanel
// Panel chat interaktif AI Food Intelligence (PANCI x Algoritma dkpp-info)
// Fitur:
// - Multi-turn Conversational Context Engine (10 putaran memori konteks)
// - 7 Panel Visualisasi Live Tersemat di Chat (SAGON, Forecast ML, IKP/PoU, 7 Indikator, EWS, GKG, Peta Tematik)
// - Rich Markdown Formatting (Tabel rapat, Recharts JSON, Link klikable, Italic, Gambar, Sitasi Sumber)
// - Mode Berpikir Mendalam (Think Mode) & Multimodal Vision & Web Speech API
// ============================================================

const CHAT_SESSION_STORAGE_KEY = 'cilegon_food_intelligence_chat_session';

interface SourceCitation {
  type: 'KNOWLEDGE BASE' | 'LIVE DATABASE' | 'GIS SPATIAL';
  title: string;
  detail?: string;
}

interface ToolCallBadge {
  id: string;
  name: string;
  status: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  type?: string;
  wilayah?: string[];
  referencedDocs?: string[];
  sources?: SourceCitation[];
  toolCalls?: ToolCallBadge[];
  harga_sagon_panel?: SagonPanelData;
  forecast_table?: ForecastTableData;
  ikp_pou_panel?: IkpPouPanelData;
  indikator_ketapang_panel?: IndikatorKetapangPanelData;
  ews_panel?: EwsPanelData;
  gkg_panel?: GkgPanelData;
  mapAction?: MapAction;
  timestamp: Date;
  imageUrl?: string;
}

function loadSessionMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
    }
  } catch (e) {
    console.warn('Failed loading chat session:', e);
  }
  return [];
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
  isFullChat?: boolean;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

const QUICK_PROMPTS = [
  '🔍 Apa tantangan strategis ketahanan pangan di Kota Cilegon dan rekomendasinya?',
  '💰 Tampilkan panel harga pangan strategis hari ini dari 3 pasar tradisional Cilegon',
  '🔮 Tampilkan tabel peramalan harga pangan komoditas strategis Kota Cilegon',
  '📈 Tampilkan grafik tren IKP dan PoU 5 tahun terakhir Kota Cilegon',
  '⚠️ Tampilkan peringatan dini kerentanan pangan dan status Early Warning System (EWS)',
  '🎯 Apa target IKU, Sasaran Strategis, dan Pagu Program Renstra DKPP Cilegon 2025-2030?',
  '👩‍🌾 Tampilkan sebaran dan profil 84 KWT (Kelompok Wanita Tani) se-Kota Cilegon!',
  '🐟 Bagaimana profil perikanan Cilegon, 9 pangkalan nelayan, 58 KUB, dan produksi ikan?',
  '🌾 Berapa luas sawah baku, neraca kemandirian beras, dan kondisi lengas tanah ECMWF?',
];

function formatTime(d: Date): string {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Pembersih ringan di sisi klien (menjamin salinan & tampilan bebas LaTeX/tabel pecah)
function sanitizeClientMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$\\times\$/g, '×')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^\$\n]+)\$/g, '$1')
    .replace(/(?:^|\n)\s*[•\-\*]\s*\n+\s*/g, '\n• ')
    .replace(/(\|[^\n]+\|)\n\s*\n+(?=\|[^\n]+\|)/g, '$1\n')
    .trim();
}

// Inline Markdown Parser (diadopsi dari ChatContainer.tsx dkpp-info: gambar, tautan, kode, tebal, miring)
function parseInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
  return parts.map((part, idx) => {
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const [, alt, src] = imgMatch;
      return (
        <span key={idx} className="inline-block my-2 text-left">
          <img
            src={src}
            alt={alt || 'Visualisasi Data'}
            className="max-h-72 max-w-full rounded-2xl border border-slate-200 shadow-md object-cover"
            loading="lazy"
          />
          {alt && <span className="block text-[11px] text-slate-500 mt-1 italic font-medium">{alt}</span>}
        </span>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith('/')) {
        return (
          <Link
            key={idx}
            href={href}
            className="inline-flex items-center gap-1 font-bold text-emerald-700 underline underline-offset-2 decoration-emerald-500 hover:text-emerald-950 transition-colors"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0 opacity-80" />
          </Link>
        );
      }
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-emerald-700 underline underline-offset-2 decoration-emerald-500 hover:text-emerald-950 transition-colors"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 inline shrink-0 opacity-80" />
        </a>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="bg-slate-100 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {inner.includes('[') && inner.includes('](') ? parseInlineFormatting(inner) : inner}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

function renderMarkdown(rawText: string): React.ReactNode {
  if (!rawText) return null;
  const cleaned = sanitizeClientMarkdown(rawText);
  const lines = cleaned.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Blok Grafik Recharts
    if (trimmed.startsWith('```json:chart') || trimmed.startsWith('```chart') || trimmed.startsWith('```json')) {
      const isChartTag = trimmed.startsWith('```json:chart') || trimmed.startsWith('```chart');
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) i++;

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
              { key: Object.keys(jsonObj.data?.[0] || {}).find((k) => k !== jsonObj.xAxisKey) || 'value', label: 'Nilai' },
            ],
            data: jsonObj.data || [],
            showTrendline: jsonObj.showTrendline ?? true,
          };
        }
      } catch {
        parsedChart = null;
      }

      if (parsedChart && parsedChart.data && parsedChart.data.length > 0) {
        elements.push(<ChatChart key={`chart-${i}`} config={parsedChart} />);
        continue;
      } else {
        elements.push(
          <pre key={`code-${i}`} className="my-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto font-mono custom-scrollbar">
            <code>{rawCode}</code>
          </pre>
        );
        continue;
      }
    }

    // 2. Tabel Markdown
    if (
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCols = tableLines[0].split('|').slice(1, -1).map((c) => c.trim());
        const rowLines = tableLines.slice(2);

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-xs custom-scrollbar">
            <table className="min-w-full text-[12px] text-left border-collapse bg-white">
              <thead className="bg-emerald-800 text-white font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  {headerCols.map((col, ci) => (
                    <th key={ci} className="px-3 py-2 border-b border-emerald-900 whitespace-nowrap">
                      {parseInlineFormatting(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rowLines.map((r, ri) => {
                  const cells = r.split('|').slice(1, -1).map((c) => c.trim());
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/80 hover:bg-emerald-50/50'}>
                      {cells.map((cell, cidx) => (
                        <td key={cidx} className="px-3 py-2 text-slate-800 font-medium whitespace-normal leading-relaxed">
                          {parseInlineFormatting(cell)}
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

    // 3. Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={i} className="text-[12px] font-bold text-slate-800 mt-2.5 mb-1 uppercase tracking-wide">
          {parseInlineFormatting(trimmed.replace(/^####\s*/, ''))}
        </h5>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-[13px] font-extrabold text-emerald-800 mt-3 mb-1 uppercase tracking-wide border-b border-emerald-100 pb-0.5">
          {parseInlineFormatting(trimmed.replace(/^###\s*/, ''))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-[14px] font-black text-slate-900 mt-3.5 mb-1">
          {parseInlineFormatting(trimmed.replace(/^##\s*/, ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-[15px] font-black text-slate-900 mt-3.5 mb-1.5">
          {parseInlineFormatting(trimmed.replace(/^#\s*/, ''))}
        </h2>
      );
      i++;
      continue;
    }

    // 4. Bullet Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 my-1 ml-1 items-start text-[12.5px] sm:text-[13px]">
          <span className="text-emerald-600 font-bold mt-0.5 shrink-0">•</span>
          <span className="text-slate-700 leading-relaxed flex-1">
            {parseInlineFormatting(trimmed.replace(/^[-•*]\s*/, ''))}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 5. Numbered Lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed ml-1 my-1 items-start">
          <span className="font-extrabold text-emerald-700 shrink-0">{numMatch[1]}.</span>
          <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 6. Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-emerald-600 pl-3 py-1.5 my-2 bg-emerald-50/60 rounded-r-lg text-[12px] text-emerald-950 font-medium italic">
          {parseInlineFormatting(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      i++;
      continue;
    }

    // 7. Horizontal Rules
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={i} className="my-2.5 border-slate-200" />);
      i++;
      continue;
    }

    if (trimmed === '') {
      elements.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed mb-1.5 font-normal">
        {parseInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}

export default function AIIntelligencePanel({
  onWilayahHighlight,
  onPinsHighlight,
  onMapAction,
  isFullScreen = false,
  isFullChat = false,
  externalPrompt,
  onClearExternalPrompt,
}: AIIntelligencePanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ [key: number]: 'like' | 'dislike' | null }>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Multimodal Vision state
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollH = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(Math.max(scrollH, 36), 180)}px`;
    }
  }, [inputValue]);

  // Simpan riwayat percakapan ke sessionStorage (tanpa menyimpan payload besar bila tidak perlu)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (messages.length > 0) {
          sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, JSON.stringify(messages));
        } else {
          sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Failed saving chat session to sessionStorage:', e);
      }
    }
  }, [messages]);

  const handleClearSession = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    }
  };

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading, scrollToBottom]);

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
          kecamatan: coord.kec,
        },
      });
    }
    if (onWilayahHighlight) {
      onWilayahHighlight([cleanName]);
    }
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 120);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await fetch('/api/sp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccessMsg('Database Serumpun-Padi berhasil disinkronkan!');
        setTimeout(() => setSyncSuccessMsg(null), 3500);
      }
    } catch {
      setSyncSuccessMsg('Gagal menyinkronkan database.');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    }
    setSyncing(false);
  };

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
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && !selectedImage) return;
    if (loading) return;

    const currentImg = selectedImage;
    const userMsg: Message = {
      role: 'user',
      text: trimmed || 'Analisis foto/kondisi ini terkait pertanian/pangan Kota Cilegon',
      imageUrl: currentImg?.preview,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setLoading(true);
    setPlusMenuOpen(false);

    // Pre-trigger peta instan apabila menyebut nama kelurahan spesifik
    const queryLower = trimmed.toLowerCase();
    for (const [kelName, coord] of Object.entries(KELURAHAN_COORDINATES)) {
      if (queryLower.includes(kelName.toLowerCase())) {
        const isSawah = queryLower.includes('sawah');
        const layers = ['kelurahan'];
        if (isSawah) layers.push('sawah');

        const prePin: MatchedPin = {
          lat: coord.lat,
          lng: coord.lng,
          name: isSawah ? `Sawah Kelurahan ${kelName}` : `Kelurahan ${kelName}`,
          category: isSawah ? 'sawah' : 'wilayah',
          kelurahan: kelName,
          kecamatan: coord.kec,
        };

        if (onMapAction) {
          onMapAction({
            type: 'FLY_TO',
            target: kelName,
            lat: coord.lat,
            lng: coord.lng,
            zoom: isSawah ? 16 : 15.5,
            layersToEnable: layers,
            pin: prePin,
          });
        }
        if (onPinsHighlight) onPinsHighlight([prePin]);
        if (onWilayahHighlight) onWilayahHighlight([kelName]);
        break;
      }
    }

    // Kirim hingga 10 pesan terakhir ke Context Engine di backend (algoritma dkpp-info)
    const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/ai-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed || 'Tolong diagnosis foto tanaman/hama/posyandu ini dan berikan rekomendasi penanganan.',
          history,
          thinkingMode: isThinkingMode,
          imageData: currentImg ? { data: currentImg.base64, mimeType: currentImg.mimeType } : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.text) {
        const parsedMapAction: MapAction | undefined = data.map_action
          ? {
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
            }
          : undefined;

        const modelMsg: Message = {
          role: 'model',
          text: data.text,
          type: data.type || 'text',
          wilayah: data.wilayah_highlight || [],
          referencedDocs: data.referenced_docs || [],
          sources: data.sources || [],
          toolCalls: data.tool_calls || [],
          harga_sagon_panel: data.harga_sagon_panel,
          forecast_table: data.forecast_table,
          ikp_pou_panel: data.ikp_pou_panel,
          indikator_ketapang_panel: data.indikator_ketapang_panel,
          ews_panel: data.ews_panel,
          gkg_panel: data.gkg_panel,
          mapAction: parsedMapAction,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, modelMsg]);

        if (parsedMapAction && onMapAction) {
          onMapAction(parsedMapAction);
        }
        if (data.wilayah_highlight?.length > 0 && onWilayahHighlight) {
          onWilayahHighlight(data.wilayah_highlight);
        }
        if (data.matched_pins && onPinsHighlight) {
          onPinsHighlight(data.matched_pins);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: `⚠️ **Terjadi kesalahan:** ${data.error || 'Respons tidak tersedia. Silakan coba lagi.'}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: '⚠️ **Koneksi gagal.** Periksa koneksi internet Anda dan coba lagi.',
          timestamp: new Date(),
        },
      ]);
    }

    setLoading(false);
  }, [loading, messages, onWilayahHighlight, onPinsHighlight, onMapAction, selectedImage, isThinkingMode]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      sendMessage(externalPrompt.trim());
      onClearExternalPrompt?.();
    }
  }, [externalPrompt, onClearExternalPrompt, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sanitizeClientMarkdown(text)).catch(() => {});
    }
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEditPrompt = (text: string) => {
    setInputValue(text);
    inputRef.current?.focus();
  };

  const toggleFeedback = (idx: number, type: 'like' | 'dislike') => {
    setFeedbackState((prev) => ({
      ...prev,
      [idx]: prev[idx] === type ? null : type,
    }));
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Browser Anda tidak mendukung Web Speech API.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      setIsListening(true);
      recognition.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative ${isFullScreen ? 'h-full' : 'h-[580px]'}`}>

      {/* Top Subtle Status Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 font-extrabold">RAG Chatbot - Food Security Intelligence</span>
          {syncSuccessMsg && (
            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black animate-pulse ml-2">
              {syncSuccessMsg}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {messages.length > 0 && (
            <button
              onClick={handleClearSession}
              className="flex items-center gap-1 text-[9.5px] font-black uppercase text-slate-500 hover:text-rose-700 bg-white border border-slate-200 hover:border-rose-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
              title="Bersihkan riwayat percakapan dalam sesi ini"
            >
              <Trash2 className="w-2.5 h-2.5 text-rose-500" />
              <span>Hapus Sesi</span>
            </button>
          )}
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1 text-[9.5px] font-black uppercase text-slate-500 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
            title="Sinkron Manual Database Serumpun Padi ke Dashboard Ketapang"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden xs:inline">{syncing ? 'Menyinkronkan…' : 'Sinkron DB'}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 overflow-y-auto ${isFullChat ? 'px-2 sm:px-6 md:px-8' : 'px-1.5 sm:px-4'} py-2.5 sm:py-5 space-y-4 sm:space-y-5 custom-scrollbar bg-slate-50/30 relative`}
      >
        <div className={`mx-auto space-y-4 sm:space-y-5 w-full ${isFullChat ? 'max-w-[97%] sm:max-w-[96%]' : 'max-w-3xl'} px-0`}>

          {/* Empty State — Sesuai dkpp-info */}
          {messages.length === 0 && !loading && (
            <div className="max-w-2xl mx-auto min-h-[50vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-300 space-y-4 px-2 py-3">
              <div className="w-16 h-16 sm:w-24 sm:h-24 relative flex items-center justify-center select-none">
                <img
                  src="/ikon-chatDKPP.png"
                  alt="Food Security Intelligence Kota Cilegon"
                  className="w-full h-full object-contain select-none"
                />
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  What’s on the agenda today?
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-md mx-auto">
                  Asisten Cerdas Ketahanan Pangan, Neraca Komoditas, Pertanian, Perikanan & Pemantauan Wilayah Kota Cilegon
                </p>
              </div>

              <div className="w-full pt-2">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                  Jelajahi Panel Interaktif & Analisis Strategis PANCI:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                  {[
                    {
                      icon: '📈',
                      title: 'IKP & PoU 5 Tahun',
                      desc: 'Grafik live Indeks Ketahanan Pangan vs Banten & Nasional',
                      prompt: 'Tampilkan grafik tren IKP dan Prevalensi Ketidakcukupan Pangan (PoU) 5 tahun terakhir Kota Cilegon',
                    },
                    {
                      icon: '💰',
                      title: 'Harga Pangan Live',
                      desc: 'Tabel interaktif SAGON 3 pasar tradisional Cilegon',
                      prompt: 'Tampilkan panel harga pangan strategis hari ini dari 3 pasar tradisional Cilegon',
                    },
                    {
                      icon: '🔮',
                      title: 'Peramalan Harga ML',
                      desc: 'Tabel proyeksi harga 1 & 3 bulan ke depan & EWS',
                      prompt: 'Tampilkan tabel peramalan harga pangan komoditas strategis Kota Cilegon',
                    },
                    {
                      icon: '🔍',
                      title: 'Analisis Tantangan',
                      desc: 'Evaluasi defisit neraca pangan & rekomendasi kebijakan',
                      prompt: 'Apa tantangan strategis ketahanan pangan di Kota Cilegon dan bagaimana rekomendasi kebijakannya?',
                    },
                    {
                      icon: '🎯',
                      title: 'Renstra DKPP 2026',
                      desc: 'Target IKU, Sasaran Strategis & Pagu Program 2025-2030',
                      prompt: 'Apa target IKU, Sasaran Strategis, dan Pagu Program Renstra DKPP Cilegon 2025-2030?',
                    },
                    {
                      icon: '👩‍🌾',
                      title: '84 KWT se-Cilegon',
                      desc: 'Sebaran geospasial & profil Kelompok Wanita Tani 8 kecamatan',
                      prompt: 'Tampilkan sebaran dan profil 84 KWT (Kelompok Wanita Tani) se-Kota Cilegon!',
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="p-2.5 sm:p-3 rounded-xl border border-gray-200/90 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-left transition-all duration-150 group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 group-hover:text-emerald-800">
                        <span className="text-sm">{item.icon}</span>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <p className="text-[10px] sm:text-[10.5px] text-gray-500 group-hover:text-emerald-950 mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
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
                <div className="flex gap-0 sm:gap-3 justify-end mb-3 sm:mb-4 group">
                  <div className="max-w-[92%] sm:max-w-[80%] rounded-2xl sm:rounded-3xl px-3.5 sm:px-5 py-2 sm:py-3 shadow-xs bg-[#A8DCAB] text-emerald-950 font-medium rounded-tr-xs ml-auto">
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-emerald-800/20">
                        <img src={msg.imageUrl} alt="Lampiran Foto" className="max-h-52 w-auto object-cover rounded-xl" />
                      </div>
                    )}
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-2 mt-1 text-[9.5px] text-emerald-900/60 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{formatTime(msg.timestamp)}</span>
                      <button
                        onClick={() => handleEditPrompt(msg.text)}
                        className="hover:text-emerald-950 cursor-pointer flex items-center gap-1"
                        title="Edit prompt"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-0 sm:gap-3 justify-start mb-4 group">
                  <div
                    className="hidden sm:flex w-8 h-8 items-center justify-center shrink-0 mt-0.5 select-none"
                    title="Food Security Intelligence Assistant"
                  >
                    <img
                      src="/ikon-chatDKPP.png"
                      alt="DKPP AI"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="relative group w-full min-w-0 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs bg-white border border-gray-200/80 rounded-tl-xs pr-7 sm:pr-8">
                    {/* Top-Right Copy Icon */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer z-10"
                      title="Salin jawaban ini"
                    >
                      {copiedIndex === idx ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin</span>
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Tool Calls Chips (Adopsi dkpp-info) */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                        {msg.toolCalls.map((tool, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Live Panel: {tool.name.replace(/_/g, ' ')}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Formatted Markdown Narrative */}
                    <div className="prose prose-sm max-w-none text-slate-800">
                      {renderMarkdown(msg.text)}
                    </div>

                    {/* 7 Interactive Inline Panels (Adopsi penuh dkpp-info) */}
                    {msg.harga_sagon_panel && (
                      <HargaPanganChatPanel
                        data={msg.harga_sagon_panel}
                        onAskCommodity={(prompt) => sendMessage(prompt)}
                      />
                    )}

                    {msg.forecast_table && (
                      <ForecastChatTable
                        data={msg.forecast_table}
                        onAskCommodity={(prompt) => sendMessage(prompt)}
                      />
                    )}

                    {msg.ikp_pou_panel && <IkpPouChatPanel data={msg.ikp_pou_panel} />}

                    {msg.indikator_ketapang_panel && (
                      <IndikatorKetapangChatPanel data={msg.indikator_ketapang_panel} />
                    )}

                    {msg.ews_panel && (
                      <EwsChatPanel
                        data={msg.ews_panel}
                        onOpenActionPlan={(item) =>
                          sendMessage(`Rekomendasi strategi intervensi pasar untuk stabilisasi komoditas ${item.name} di Kota Cilegon`)
                        }
                      />
                    )}

                    {msg.gkg_panel && <GkgChatPanel data={msg.gkg_panel} />}

                    {msg.type === 'map_card' && (
                      <MapTematikChatCard
                        onTriggerMapAction={(action) => onMapAction && onMapAction(action)}
                      />
                    )}

                    {/* Interactive Wilayah Highlight Chips */}
                    {msg.wilayah && msg.wilayah.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                          <MapPin className="w-3 h-3 text-emerald-600" /> Sorot Wilayah:
                        </span>
                        {msg.wilayah.slice(0, 8).map((w, wi) => (
                          <button
                            key={wi}
                            type="button"
                            onClick={() => handleWilayahClick(w)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-colors cursor-pointer"
                          >
                            <span>📍 {w}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Source Citations (RAG Knowledge Base & Live DB) */}
                    {((msg.sources && msg.sources.length > 0) || (msg.referencedDocs && msg.referencedDocs.length > 0)) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        {msg.sources && msg.sources.length > 0
                          ? msg.sources.slice(0, 4).map((src, si) => (
                              <span
                                key={si}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-semibold"
                              >
                                {src.type === 'KNOWLEDGE BASE' ? (
                                  <BookOpen className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Database className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                                )}
                                <span className="truncate max-w-[220px]">{src.title}</span>
                              </span>
                            ))
                          : msg.referencedDocs?.slice(0, 3).map((doc, di) => (
                              <span
                                key={di}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-semibold"
                              >
                                <BookOpen className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[220px]">{doc}</span>
                              </span>
                            ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-gray-100 text-gray-400 text-xs">
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-emerald-600 transition-colors p-1 rounded cursor-pointer"
                        title="Salin jawaban bersih"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </button>

                      <button
                        onClick={() => toggleFeedback(idx, 'like')}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          feedbackState[idx] === 'like' ? 'text-emerald-600 bg-emerald-50' : 'hover:text-gray-700'
                        }`}
                        title="Bagus / Akurat"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleFeedback(idx, 'dislike')}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          feedbackState[idx] === 'dislike' ? 'text-rose-600 bg-rose-50' : 'hover:text-gray-700'
                        }`}
                        title="Perlu perbaikan"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-2.5 sm:gap-3 justify-start items-center mb-4">
              <div className="hidden sm:flex w-8 h-8 items-center justify-center shrink-0 select-none">
                <img
                  src="/ikon-chatDKPP.png"
                  alt="DKPP AI"
                  className="w-full h-full object-contain animate-pulse"
                />
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs text-gray-600 shadow-xs">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-[#A8DCAB] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#A8DCAB] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#A8DCAB] animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="font-medium text-slate-600">
                  {isThinkingMode
                    ? 'Mode Berpikir Mendalam sedang menyintesis multi-dokumen & neraca…'
                    : 'Menganalisis konteks percakapan & basis data resmi DKPP…'}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 z-30 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-all cursor-pointer hover:shadow-lg active:scale-95"
          title="Gulir ke paling bawah"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Sticky ChatInput Container */}
      <div className="px-2 sm:px-6 pb-2.5 sm:pb-3 pt-1.5 bg-white border-t border-gray-100 shrink-0 relative z-20">
        {selectedImage && (
          <div className={`${isFullChat ? 'max-w-[97%] sm:max-w-[96%]' : 'max-w-3xl'} mx-auto mb-2 p-1.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-2 shadow-md border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2`}>
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={selectedImage.preview} alt="Upload" className="w-8 h-8 object-cover rounded-lg border border-white/20 shrink-0" />
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

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className={`w-full ${isFullChat ? 'max-w-[97%] sm:max-w-[96%]' : 'max-w-3xl'} mx-auto`}>
          <div className="relative flex flex-col justify-between bg-white border border-slate-200/90 shadow-xs focus-within:border-slate-300 focus-within:shadow-md transition-all duration-200 rounded-2xl sm:rounded-3xl p-2 sm:p-2.5">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan analisis pangan, lanjutan diskusi, atau unggah foto…"
              rows={1}
              disabled={loading}
              className="w-full bg-transparent px-2.5 pt-1 pb-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none min-h-[36px] max-h-36 sm:max-h-48 leading-relaxed font-normal"
            />

            <div className="flex items-center justify-between mt-1 px-1">
              <div className="flex items-center gap-1">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlusMenuOpen((s) => !s)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Pilihan & Pertanyaan Cepat"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>

                  {plusMenuOpen && (
                    <div className="absolute bottom-10 left-0 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="text-[10px] font-black text-slate-400 uppercase px-2 py-1 tracking-wider">Topik Cepat Analisis & Panel Live:</div>
                      <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {QUICK_PROMPTS.map((qp, qpi) => (
                          <button
                            key={qpi}
                            onClick={() => {
                              setInputValue(qp);
                              setPlusMenuOpen(false);
                              inputRef.current?.focus();
                            }}
                            className="w-full text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer truncate flex items-center gap-1.5"
                          >
                            <span className="truncate">{qp}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-500 hover:text-emerald-700 rounded-full hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
                  title="Unggah Foto Daun/Hama/Posyandu (Multimodal Vision)"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsThinkingMode((prev) => !prev)}
                  title="Mode Berpikir Mendalam (Analisis Multi-Dokumen)"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                    isThinkingMode
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Brain className={`w-3.5 h-3.5 ${isThinkingMode ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>Think</span>
                </button>

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? 'Mendengarkan...' : 'Gunakan Suara'}
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                    isListening
                      ? 'text-red-500 bg-red-50 animate-pulse'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => sendMessage(inputValue)}
                  disabled={loading || (!inputValue.trim() && !selectedImage)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all shrink-0 ${
                    (inputValue.trim() || selectedImage) && !loading
                      ? 'bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Kirim Pesan"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-center text-gray-400 mt-1.5 px-2 select-none">
            Food Security Intelligence can make mistakes. Check important info.
          </div>
        </div>
      </div>

    </div>
  );
}
