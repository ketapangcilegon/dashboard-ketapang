"use client";

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Map, MessageSquare, Info, RefreshCw, MapPin } from 'lucide-react';
import AIIntelligencePanel, { MatchedPin } from './AIIntelligencePanel';

// ============================================================
// AIIntelligenceView
// Full-view split layout: 60% peta GIS kiri | 40% chat kanan
// ============================================================

// Dynamic import peta agar tidak SSR
const AIIntelligenceMap = dynamic(
  () => import('./AIIntelligenceMap'),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Map className="w-8 h-8 animate-pulse" />
        <span className="text-xs font-bold">Memuat peta…</span>
      </div>
    </div>
  )}
);

export default function AIIntelligenceView() {
  const [highlightWilayah, setHighlightWilayah] = useState<string[]>([]);
  const [highlightPins, setHighlightPins] = useState<MatchedPin[]>([]);
  const [activeTab, setActiveTab] = useState<'split' | 'map' | 'chat'>('split');

  const handleWilayahHighlight = useCallback((wilayah: string[]) => {
    setHighlightWilayah(wilayah);
  }, []);

  const handlePinsHighlight = useCallback((pins: MatchedPin[]) => {
    setHighlightPins(pins);
  }, []);

  const clearHighlight = () => {
    setHighlightWilayah([]);
    setHighlightPins([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[620px] max-h-[950px]">
      
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-stretch gap-3">
          <div className="w-1 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800 text-lg uppercase tracking-wide leading-snug">
                AI Food Intelligence
              </h2>
              <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                BETA
              </span>
            </div>
            <p className="text-slate-500 font-semibold text-xs mt-0.5">
              Analisis spasial ketahanan pangan berbasis GIS × AI — Kota Cilegon
            </p>
          </div>
        </div>

        {/* Layout tabs (desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { key: 'split', label: 'Split', icon: <span className="text-[10px]">⊞</span> },
            { key: 'map', label: 'Peta', icon: <Map className="w-3 h-3" /> },
            { key: 'chat', label: 'Chat', icon: <MessageSquare className="w-3 h-3" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Highlight info bar */}
      {(highlightWilayah.length > 0 || highlightPins.length > 0) && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-800 shrink-0 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="text-amber-500 font-black">📍</span>
          <span>
            {highlightPins.length > 0 && (
              <span className="mr-2">
                Pin Lokasi GPS: {highlightPins.map(p => <strong key={p.name} className="font-black text-blue-800">📌 {p.name} ({p.lat.toFixed(5)}, {p.lng.toFixed(5)})</strong>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [] as React.ReactNode[])}
              </span>
            )}
            {highlightWilayah.length > 0 && (
              <span>
                Wilayah: {highlightWilayah.map(w => <strong key={w} className="font-black">{w}</strong>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [] as React.ReactNode[])}
              </span>
            )}
          </span>
          <button
            onClick={clearHighlight}
            className="ml-auto text-amber-600 hover:text-amber-800 font-black cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 relative">
        
        {/* Desktop: Split / Map only / Chat only */}
        <div className="hidden md:flex h-full gap-4 items-stretch">
          
          {/* Peta (Ketinggian tetap & stabil) */}
          {(activeTab === 'split' || activeTab === 'map') && (
            <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 h-full ${
              activeTab === 'split' ? 'w-[60%]' : 'w-full'
            }`}>
              {/* Layer info overlay */}
              <div className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">AI GIS Intelligence</span>
              </div>

              <AIIntelligenceMap 
                highlightWilayah={highlightWilayah} 
                highlightPins={highlightPins}
              />

              {/* Info hint */}
              <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
                <Info className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500">
                  {highlightPins.length > 0
                    ? `${highlightPins.length} Pin Titik GPS aktif`
                    : highlightWilayah.length > 0
                      ? `${highlightWilayah.length} wilayah disorot oleh AI`
                      : 'Tanyakan sesuatu kepada AI untuk menyorot wilayah / titik GPS'}
                </span>
              </div>
            </div>
          )}

          {/* Panel chat (Tinggi responsif mengikuti layar & scroll mandiri) */}
          {(activeTab === 'split' || activeTab === 'chat') && (
            <div className={`h-full min-h-0 flex flex-col ${activeTab === 'split' ? 'flex-1 min-w-0' : 'w-full'}`}>
              <AIIntelligencePanel
                onWilayahHighlight={handleWilayahHighlight}
                onPinsHighlight={handlePinsHighlight}
                isFullScreen={true}
              />
            </div>
          )}
        </div>

        {/* Mobile: Stack vertikal — peta di atas, chat di bawah */}
        <div className="flex md:hidden flex-col h-full gap-3">
          <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative shrink-0">
            <div className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">AI GIS Intelligence</span>
            </div>
            <AIIntelligenceMap highlightWilayah={highlightWilayah} />
          </div>
          <div className="flex-1 min-h-0">
            <AIIntelligencePanel
              onWilayahHighlight={handleWilayahHighlight}
              isFullScreen={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
