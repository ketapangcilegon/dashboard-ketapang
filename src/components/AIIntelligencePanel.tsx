"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, RefreshCw, Sparkles, Copy, Check, Database, ChevronDown } from 'lucide-react';

// ============================================================
// AIIntelligencePanel
// Panel chat interaktif AI Food Intelligence
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

interface AIIntelligencePanelProps {
  onWilayahHighlight?: (wilayah: string[]) => void;
  onPinsHighlight?: (pins: MatchedPin[]) => void;
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
  return lines.map((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-[13px] font-extrabold text-emerald-700 mt-3 mb-1 uppercase tracking-wide border-b border-emerald-100 pb-0.5">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-[14px] font-black text-slate-800 mt-4 mb-1.5 uppercase tracking-wide">
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={idx} className="text-[15px] font-black text-slate-900 mt-4 mb-2">
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={idx} className="flex gap-2 mb-1 ml-2">
          <span className="text-emerald-500 font-bold mt-0.5 shrink-0">•</span>
          <span className="text-[12px] text-slate-700 font-semibold leading-relaxed">
            {parseBold(trimmed.substring(2))}
          </span>
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="flex gap-2 mb-1 ml-2">
          <span className="text-emerald-600 font-extrabold text-[11px] shrink-0 mt-0.5">{numMatch[1]}.</span>
          <span className="text-[12px] text-slate-700 font-semibold leading-relaxed">
            {parseBold(numMatch[2])}
          </span>
        </div>
      );
    }
    if (trimmed === '') return <div key={idx} className="h-1.5" />;
    return (
      <p key={idx} className="text-[12px] text-slate-700 font-semibold leading-relaxed mb-1.5">
        {parseBold(line)}
      </p>
    );
  });
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function AIIntelligencePanel({
  onWilayahHighlight,
  onPinsHighlight,
  isFullScreen = false
}: AIIntelligencePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom setiap ada pesan baru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sync status saat mount
  const loadSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-intelligence');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch { /* ignore */ }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  // Trigger sync manual
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      await loadSyncStatus();
    } catch { /* ignore */ }
    setSyncing(false);
  };

  // Kirim pesan ke AI
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setShowQuickPrompts(false);

    // Build history (tanpa timestamp — hanya role + text)
    const history = messages.map(m => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/ai-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history })
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

        // Trigger highlight peta jika ada wilayah
        if (data.wilayah_highlight?.length > 0 && onWilayahHighlight) {
          onWilayahHighlight(data.wilayah_highlight);
        }

        // Trigger highlight PIN GPS jika ada pin yang cocok
        if (data.matched_pins && onPinsHighlight) {
          onPinsHighlight(data.matched_pins);
        }
      } else {
        const errMsg: Message = {
          role: 'model',
          text: `⚠️ **Terjadi kesalahan:** ${data.error || 'Respons tidak tersedia. Silakan coba lagi.'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch {
      const errMsg: Message = {
        role: 'model',
        text: '⚠️ **Koneksi gagal.** Periksa koneksi internet Anda dan coba lagi.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    }

    setLoading(false);
  }, [loading, messages, onWilayahHighlight, onPinsHighlight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const staleCount = syncStatus?.tables?.filter(t => t.age_minutes > 360).length ?? 0;
  const lastSyncMin = syncStatus?.tables?.length
    ? Math.min(...syncStatus.tables.map(t => t.age_minutes))
    : null;

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${isFullScreen ? 'h-full' : 'h-[560px]'}`}>
      
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-900 to-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-black text-[13px] tracking-wide uppercase">Food Security Intelligence</h3>
            <p className="text-emerald-400/80 text-[10px] font-bold tracking-wider uppercase">
              Serumpun-Padi × Dashboard Ketapang
            </p>
          </div>
        </div>

        {/* Sync status badge */}
        <div className="flex items-center gap-2">
          {!isInitializing && syncStatus && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black tracking-wider uppercase border ${
              staleCount > 0
                ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300'
            }`}>
              <Database className="w-2.5 h-2.5" />
              {staleCount > 0 ? `${staleCount} stale` : lastSyncMin !== null ? `sync ${lastSyncMin}m lalu` : 'tersinkron'}
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Refresh data Serumpun-Padi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
        
        {/* Welcome message */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h4 className="text-slate-800 font-black text-[14px]">Food Security Intelligence</h4>
              <p className="text-slate-500 text-[11px] font-medium mt-1 max-w-[240px]">
                Tanyakan apa saja tentang ketahanan pangan & produksi pertanian Kota Cilegon
              </p>
            </div>

            {/* Quick prompts */}
            {showQuickPrompts && (
              <div className="w-full mt-2">
                <button
                  onClick={() => setShowQuickPrompts(s => !s)}
                  className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 mx-auto"
                >
                  <ChevronDown className="w-3 h-3" />
                  Pertanyaan Cepat
                </button>
                <div className="grid gap-1.5">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative group max-w-[85%] ${msg.role === 'user' ? 'max-w-[70%]' : 'max-w-[90%]'}`}>
              
              {/* AI avatar */}
              {msg.role === 'model' && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                      <div className="prose prose-sm max-w-none">
                        {renderMarkdown(msg.text)}
                      </div>
                      
                      {/* Wilayah highlight badges */}
                      {msg.wilayah && msg.wilayah.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sorotan peta:</span>
                          {msg.wilayah.map((w, wi) => (
                            <span key={wi} className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              📍 {w}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Knowledge base referenced documents badges */}
                      {msg.referencedDocs && msg.referencedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 items-center pt-1.5 border-t border-slate-100">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">📚 Dokumen Rujukan:</span>
                          {msg.referencedDocs.map((doc, di) => (
                            <span key={di} className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md">
                              {doc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 ml-1">
                      <span className="text-[9px] text-slate-400 font-medium">{formatTime(msg.timestamp)}</span>
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                        title="Salin teks"
                      >
                        {copied === idx ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* User message */}
              {msg.role === 'user' && (
                <div>
                  <div className="bg-emerald-700 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                    <p className="text-[12px] font-semibold leading-relaxed">{msg.text}</p>
                  </div>
                  <div className="text-right mt-0.5 mr-1">
                    <span className="text-[9px] text-slate-400 font-medium">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  <span className="text-[11px] text-slate-500 font-semibold animate-pulse">
                    Menganalisis data…
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts toggle saat sudah ada chat */}
      {messages.length > 0 && (
        <div className="px-3 pt-2 pb-0 shrink-0">
          <button
            onClick={() => setShowQuickPrompts(s => !s)}
            className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showQuickPrompts ? 'rotate-180' : ''}`} />
            Pertanyaan cepat
          </button>
          {showQuickPrompts && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 pb-1">
              {QUICK_PROMPTS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-full px-2.5 py-1 transition-all cursor-pointer active:scale-[0.97] truncate max-w-[200px]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 bg-white shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-200 transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan tentang ketahanan pangan Cilegon…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent resize-none outline-none text-[12px] text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-medium leading-relaxed max-h-[100px] disabled:opacity-50"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={loading || !inputValue.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shrink-0"
            title="Kirim (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-slate-400 font-medium mt-1 text-center">
          Enter untuk kirim · Shift+Enter untuk baris baru · Respons AI bersifat indikatif
        </p>
      </div>
    </div>
  );
}
