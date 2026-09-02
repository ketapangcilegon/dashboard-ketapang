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
  Database
} from 'lucide-react';

import { KELURAHAN_COORDINATES } from '@/lib/kamera-normatif';

// ============================================================
// AIIntelligencePanel
// Panel chat interaktif AI Food Intelligence (ChatGPT UI/UX Style)
// ============================================================

interface Message {
  role: 'user' | 'model';
  text: string;
  wilayah?: string[];
  referencedDocs?: string[];
  timestamp: Date;
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
  type: 'FLY_TO' | 'RESET' | 'HIGHLIGHT';
  target?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  layersToEnable?: string[];
  pin?: MatchedPin;
}

interface AIIntelligencePanelProps {
  onWilayahHighlight?: (wilayah: string[]) => void;
  onPinsHighlight?: (pins: MatchedPin[]) => void;
  onMapAction?: (action: MapAction) => void;
  isFullScreen?: boolean;
}

const QUICK_PROMPTS = [
  'Kecamatan mana yang paling rentan jika terjadi El Niño?',
  'Berapa total luas sawah siap panen sekarang?',
  'Bagaimana kondisi kolam budidaya dan nelayan di Cilegon?',
  'Berikan ringkasan ketahanan pangan Cilegon saat ini.',
  'Kelompok tani mana yang paling aktif?',
  'Simulasi: jika pasokan beras dari luar terhenti 30 hari, apa dampaknya?',
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

export default function AIIntelligencePanel({
  onWilayahHighlight,
  onPinsHighlight,
  onMapAction,
  isFullScreen = false
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

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const trimmed = text.trim();
    const userMsg: Message = { role: 'user', text: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
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
        body: JSON.stringify({ message: trimmed, history })
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
            pin: data.map_action.pin
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
          <Database className="w-3 h-3 text-emerald-600" />
          <span>Serumpun-Padi GIS × Dashboard Ketapang</span>
          {syncSuccessMsg && (
            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black animate-pulse">
              {syncSuccessMsg}
            </span>
          )}
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-1 text-[9.5px] font-black uppercase text-slate-500 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
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
          <div key={idx} className="w-full max-w-3xl mx-auto">
            {msg.role === 'user' ? (
              
              /* USER MESSAGE */
              <div className="flex flex-col items-end mb-3 group">
                <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-xs max-w-[85%] md:max-w-[75%] font-medium text-[12.5px] leading-relaxed">
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

              /* MODEL MESSAGE (ChatGPT response style with action bar) */
              <div className="flex items-start gap-2.5 mb-4 group">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-3 h-3" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 md:p-4 shadow-xs space-y-1.5">
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
                  </div>

                  {/* ChatGPT Action Buttons Bar */}
                  <div className="flex items-center gap-1 mt-1 ml-1 text-slate-400">
                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      title="Salin jawaban"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 text-[9px]">Tersalin</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
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
          <div className="w-full max-w-3xl mx-auto flex items-start gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span className="text-[11.5px] font-bold text-slate-600 animate-pulse">
                Sedang menganalisis data Serumpun-Padi & GIS Cilegon…
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
        
        {/* Expanded Mode */}
        {isExpanded ? (
          <div className="w-full bg-white border border-slate-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-100 rounded-xl transition-all duration-200 shadow-xs flex flex-col h-36">
            <div className="flex items-center justify-between px-2.5 pt-1.5">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                Prompt Editor
              </span>
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
                placeholder="Tanyakan tentang ketahanan pangan Cilegon…"
                rows={3}
                disabled={loading}
                className="w-full flex-1 bg-transparent resize-none outline-none text-[12.5px] text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal leading-relaxed custom-scrollbar disabled:opacity-50 overflow-y-auto"
              />
            </div>

            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-0.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPlusMenuOpen(s => !s)}
                className="w-6 h-6 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="Pilihan / Pertanyaan Cepat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

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
                  disabled={loading || !inputValue.trim()}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                    inputValue.trim() && !loading
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

            {/* Input Textarea (Single Row Auto-Expanding) */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan tentang ketahanan pangan Cilegon…"
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
                disabled={loading || !inputValue.trim()}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                  inputValue.trim() && !loading
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
          Enter untuk kirim · Shift+Enter baris baru · Serumpun-Padi GIS AI Cilegon
        </p>
      </div>
    </div>
  );
}
