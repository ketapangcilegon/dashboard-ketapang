"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  Plus, 
  Mic, 
  MicOff,
  ArrowUp, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  ArrowDown, 
  Edit3,
  Database,
  Camera,
  Trash2,
  X,
  Brain
} from 'lucide-react';

import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';
import ChatChart, { ChartConfig } from './ChatChart';

// ============================================================
// AIIntelligencePanel
// Panel chat interaktif AI Food Intelligence (Sesuai UI/UX dkpp-info)
// Fitur:
// - Kotak input text dinamis (Pill rounded-full / Multiline rounded-2xl, auto-resize)
// - Warna latar chat user: bg-[#A8DCAB] text-emerald-950
// - Batas margin mobile responsive yang ramping (px-1.5 sm:px-4)
// - Ikon resmi ChatDKPP (/ikon-chatDKPP.png)
// - Mode Berpikir (Think Mode Pill) & Voice Input (Web Speech API)
// - Tombol kirim biru bulat (#1A73E8)
// ============================================================

const CHAT_SESSION_STORAGE_KEY = 'cilegon_food_intelligence_chat_session';

interface Message {
  role: 'user' | 'model';
  text: string;
  wilayah?: string[];
  referencedDocs?: string[];
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
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));
    }
  } catch (e) {
    console.warn('Failed loading chat session:', e);
  }
  return [];
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
  '📊 Bagaimana kondisi ketahanan pangan Cilegon saat ini (IKP, FSVA, SKPG, POU)?',
  '🎯 Apa target IKU, Sasaran Strategis, dan Pagu Program Renstra DKPP Cilegon 2026-2030?',
  '👩‍🌾 Tampilkan sebaran dan profil 84 KWT (Kelompok Wanita Tani) se-Kota Cilegon!',
  '💰 Bagaimana kondisi harga pangan harian SAGON dan peramalan EWS inflasi?',
  '📈 Buat grafik produksi padi 5 tahun terakhir beserta trendline',
  '🌾 Berapa luas sawah baku dan kondisi lengas tanah ECMWF di Cilegon?',
  '🐟 Bagaimana data potensi perikanan, sebaran 723 nelayan, dan produksi ikan Cilegon?',
  '⛵ Tampilkan data profil perikanan Cilegon (pangkalan, 58 KUB, koperasi, dan kapal tangkap)',
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

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-[12.5px] text-slate-700 leading-relaxed ml-4 list-disc pl-1 mb-1">
          {parseBold(trimmed.replace(/^[-•*]\s*/, ''))}
        </li>
      );
      i++;
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 text-[12.5px] text-slate-700 leading-relaxed ml-1 mb-1">
          <span className="font-bold text-emerald-700">{numMatch[1]}.</span>
          <span className="flex-1">{parseBold(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-emerald-600 pl-3 py-1 my-2 bg-emerald-50/60 rounded-r-lg text-[12px] text-emerald-950 font-medium italic">
          {parseBold(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      i++;
      continue;
    }

    if (trimmed === '') {
      elements.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-[12.5px] text-slate-700 leading-relaxed mb-2 font-normal">
        {parseBold(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-slate-100 text-emerald-800 px-1 py-0.5 rounded text-[11px] font-mono font-bold">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function AIIntelligencePanel({
  onWilayahHighlight,
  onPinsHighlight,
  onMapAction,
  isFullScreen = false,
  externalPrompt,
  onClearExternalPrompt
}: AIIntelligencePanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ [key: number]: 'like' | 'dislike' | null }>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Multimodal Vision state (Fase 2)
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea seamlessly (seperti ChatInput dkpp-info)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollH = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(Math.max(scrollH, 24), 180)}px`;
    }
  }, [inputValue]);

  // Sinkronisasi riwayat pesan ke browser sessionStorage agar tidak hilang dalam 1 sesi
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
    const payloadMessage = isThinkingMode 
      ? `[MODE BERPIKIR MENDALAM: Uraikan data, metodologi perhitungan komprehensif, dan analisis bertahap]\n${trimmed || 'Tolong diagnosis foto/data ini dan berikan rekomendasi penanganan.'}`
      : trimmed || 'Tolong diagnosis foto tanaman/hama/posyandu ini dan berikan rekomendasi penanganan.';

    try {
      const res = await fetch('/api/ai-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payloadMessage,
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
  }, [loading, messages, onWilayahHighlight, onPinsHighlight, onMapAction, selectedImage, isThinkingMode]);

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

  // Web Speech API Voice Recognition (Sesuai ChatInput dkpp-info)
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Browser Anda tidak mendukung Web Speech API.');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;

      if (!isListening) {
        setIsListening(true);
        recognition.start();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
      } else {
        setIsListening(false);
      }
    } catch {
      setIsListening(false);
    }
  };

  const isMultiline = inputValue.includes('\n') || inputValue.length > 60;

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative ${isFullScreen ? 'h-full' : 'h-[580px]'}`}>
      
      {/* Top Subtle Status Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 font-extrabold">Food Security Intelligence</span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded font-bold">DKPP Cilegon</span>
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
            title="Sinkron & Salin Manual Database Serumpun Padi ke Dashboard Ketapang"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden xs:inline">{syncing ? 'Menyinkronkan…' : 'Sinkron DB'}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Chat Area (Mobile Margins Ramping: px-1.5 sm:px-4, py-2.5 sm:py-6 sesuai dkpp-info) */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-1.5 sm:px-4 py-2.5 sm:py-5 space-y-4 sm:space-y-5 custom-scrollbar bg-slate-50/30 relative"
      >
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 w-full px-0">
          
          {/* Initial / Empty State — Sesuai dkpp-info (Center Greeting + 6 Showcase Cards) */}
          {messages.length === 0 && !loading && (
            <div className="max-w-2xl mx-auto min-h-[50vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-300 space-y-4 px-2 py-3">
              {/* Logo Resmi ChatDKPP */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 relative flex items-center justify-center select-none">
                <img
                  src="/ikon-chatDKPP.png"
                  alt="Food Security Intelligence Kota Cilegon"
                  className="w-full h-full object-contain select-none"
                />
              </div>

              {/* Center Greeting Title */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  What’s on the agenda today?
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-md mx-auto">
                  Asisten Cerdas Ketahanan Pangan, Pertanian, Perikanan & Pemantauan Wilayah Kota Cilegon
                </p>
              </div>

              {/* Feature Showcase Shortcuts Grid */}
              <div className="w-full pt-2">
                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                  Jelajahi Fitur & Analisis Live DKPP:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                  {[
                    {
                      icon: '📈',
                      title: 'IKP & PoU 5 Tahun',
                      desc: 'Tren Indeks Ketahanan Pangan vs Banten & Nasional',
                      prompt: '📊 Bagaimana kondisi ketahanan pangan Cilegon saat ini (IKP, FSVA, SKPG, POU)?',
                    },
                    {
                      icon: '🎯',
                      title: 'Renstra DKPP 2026',
                      desc: 'Target IKU, Sasaran Strategis & Pagu Program 2026-2030',
                      prompt: '🎯 Apa target IKU, Sasaran Strategis, dan Pagu Program Renstra DKPP Cilegon 2026-2030?',
                    },
                    {
                      icon: '👩‍🌾',
                      title: '84 KWT se-Cilegon',
                      desc: 'Sebaran dan profil Kelompok Wanita Tani 8 Kecamatan',
                      prompt: '👩‍🌾 Tampilkan sebaran dan profil 84 KWT (Kelompok Wanita Tani) se-Kota Cilegon!',
                    },
                    {
                      icon: '🐟',
                      title: 'Potensi Perikanan',
                      desc: 'Data 723 Nelayan, 58 KUB, 410 Kapal & Produksi Ikan',
                      prompt: '🐟 Bagaimana data potensi perikanan, sebaran 723 nelayan, dan produksi ikan Cilegon?',
                    },
                    {
                      icon: '💰',
                      title: 'Harga Pangan SAGON',
                      desc: 'Update harian Pasar Kranggot, Blok F, Merak & EWS',
                      prompt: '💰 Bagaimana kondisi harga pangan harian SAGON dan peramalan EWS inflasi?',
                    },
                    {
                      icon: '🌾',
                      title: 'Sawah & Agro-Satelit',
                      desc: '407 Petak Sawah Baku & Lengas Tanah ECMWF',
                      prompt: '🌾 Berapa luas sawah baku dan kondisi lengas tanah ECMWF di Cilegon?',
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
                
                /* USER MESSAGE (Sesuai dkpp-info: bg-[#A8DCAB] text-emerald-950) */
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

                /* ASSISTANT MESSAGE (Sesuai dkpp-info: hidden sm:flex avatar, rounded-2xl card, copy top-right) */
                <div className="flex gap-0 sm:gap-3 justify-start mb-4 group">
                  {/* Assistant Avatar: Ikon Resmi Chat DKPP (Tampil di Desktop sm:flex, disembunyikan di Mobile) */}
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

                  <div className="relative group w-full rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs bg-white border border-gray-200/80 rounded-tl-xs pr-7 sm:pr-8">
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

                    <div className="prose prose-sm max-w-none text-slate-800">
                      {renderMarkdown(msg.text)}
                    </div>

                    {/* Wilayah / Kelurahan Sorotan */}
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

                    {/* Action Bar (Copy, Feedback, Share) */}
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

                    {/* Tawaran Beralih ke Mode Peta GIS jika ada sorotan wilayah */}
                    {msg.wilayah && msg.wilayah.length > 0 && onMapAction && (
                      <div className="mt-3 p-3 sm:p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                        <div className="flex items-start sm:items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <span className="text-sm">🗺️</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-950">
                              Tampilan Peta Geospasial Wilayah Terkait
                            </span>
                            <span className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                              Lihat visualisasi spasial 407 petak sawah, lengas tanah & fasilitas pangan.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleWilayahClick(msg.wilayah![0])}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <span>Buka Peta Wilayah</span>
                          <span className="text-xs font-black">→</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator (Bouncing Dots #A8DCAB Sesuai dkpp-info) */}
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
                <span className="font-medium text-slate-600">Chatbot sedang menganalisis database & menghitung respons…</span>
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

      {/* Sticky ChatInput Container (Sesuai ChatInput dkpp-info) */}
      <div className="px-2 sm:px-6 pb-2.5 sm:pb-3 pt-1.5 bg-white border-t border-gray-100 shrink-0 relative z-20">
        
        {/* Multimodal Image Preview Chip jika ada foto terlampir */}
        {selectedImage && (
          <div className="max-w-3xl mx-auto mb-2 p-1.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-2 shadow-md border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2">
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

        {/* Hidden File Input for Multimodal Vision */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Dynamic ChatInput Box (Pill / Multiline Rounded-2xl sesuai dkpp-info) */}
        <div className="w-full max-w-3xl mx-auto">
          <div
            className={`relative flex items-end bg-white border border-gray-200/90 shadow-xs focus-within:border-gray-300 focus-within:shadow-md transition-all duration-200 ${
              isMultiline
                ? 'rounded-2xl p-2 sm:p-2.5'
                : 'rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5'
            }`}
          >
            {/* Plus / Quick Prompts Button */}
            <div className="relative shrink-0 mb-0.5">
              <button
                type="button"
                onClick={() => setPlusMenuOpen(s => !s)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Pilihan & Pertanyaan Cepat"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>

              {plusMenuOpen && (
                <div className="absolute bottom-10 left-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="text-[10px] font-black text-slate-400 uppercase px-2 py-1 tracking-wider">Topik Cepat Analisis:</div>
                  <div className="space-y-1">
                    {QUICK_PROMPTS.map((qp, qpi) => (
                      <button
                        key={qpi}
                        onClick={() => {
                          setInputValue(qp);
                          setPlusMenuOpen(false);
                          if (inputRef.current) inputRef.current.focus();
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

            {/* Camera / Multimodal Vision Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-emerald-700 rounded-full hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer mb-0.5"
              title="Unggah Foto Daun/Hama/Posyandu (Multimodal Vision)"
            >
              <Camera className="w-4 h-4 text-gray-600" />
            </button>

            {/* Textarea Input (Auto-Resize Seamlessly) */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or upload photo..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none min-h-[24px] max-h-48 leading-relaxed self-center"
            />

            {/* Right Action Tools */}
            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              {/* Think Mode Pill Button (Sesuai dkpp-info) */}
              <button
                type="button"
                onClick={() => setIsThinkingMode(prev => !prev)}
                title="Mode Berpikir Mendalam"
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isThinkingMode
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-gray-500" />
                <span>Think</span>
              </button>

              {/* Voice Input (Web Speech API) */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Mendengarkan...' : 'Gunakan Suara'}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  isListening
                    ? 'text-red-500 bg-red-50 animate-pulse'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-gray-600" />}
              </button>

              {/* Send Button — Blue Rounded Circle (#1A73E8 Sesuai dkpp-info) */}
              <button
                type="button"
                onClick={() => sendMessage(inputValue)}
                disabled={loading || (!inputValue.trim() && !selectedImage)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shrink-0 ${
                  (inputValue.trim() || selectedImage) && !loading
                    ? 'bg-[#1A73E8] hover:bg-blue-600 text-white shadow-xs cursor-pointer active:scale-95'
                    : 'bg-[#1A73E8]/85 text-white opacity-80 cursor-default'
                }`}
                title="Kirim Pesan"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>

          {/* Centered Disclaimer below input (Sesuai dkpp-info) */}
          <div className="text-[11px] text-center text-gray-400 mt-1.5 px-2 select-none">
            Food Security Intelligence can make mistakes. Check important info.
          </div>
        </div>
      </div>

    </div>
  );
}
