"use client";

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Map, MessageSquare, Info, RefreshCw, MapPin, Grid, Layers } from 'lucide-react';
import AIIntelligencePanel, { MatchedPin, MapAction } from './AIIntelligencePanel';

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
  const [mapAction, setMapAction] = useState<MapAction | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'map' | 'chat'>('split');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const handleWilayahHighlight = useCallback((wilayah: string[]) => {
    setHighlightWilayah(wilayah);
  }, []);

  const handlePinsHighlight = useCallback((pins: MatchedPin[]) => {
    setHighlightPins(pins);
  }, []);

  const handleMapAction = useCallback((action: MapAction) => {
    setMapAction(action);
  }, []);

  // Handler Reverse Intelligence & Agri-Advisory dari klik peta
  const handleTriggerChatPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setActiveTab('chat');
    }
  }, []);

  const handleClearPendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const clearHighlight = () => {
    setHighlightWilayah([]);
    setHighlightPins([]);
    setMapAction(null);
  };

  return (
    <div className="flex flex-col md:h-[calc(100dvh-7.5rem)] md:min-h-[540px] min-h-0 w-full">
      
      {/* Page Header (Matching Mockup 1) */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-stretch gap-3">
          <div className="w-1 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-slate-800 text-sm sm:text-base uppercase tracking-wide leading-snug">
                FOOD SECURITY INTELLIGENCE
              </h2>
              <span className="text-[8.5px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                BETA
              </span>
            </div>
            <p className="text-slate-500 font-medium text-[11px] sm:text-xs mt-0.5">
              Analisis spasial ketahanan pangan berbasis GIS × AI — Kota Cilegon
            </p>
          </div>
        </div>

        {/* Layout Tabs Toggle (desktop - Sesuai Mockup 1) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-sm">
          {[
            { key: 'split', label: 'SPLIT', icon: <span className="text-[11px] font-bold">⊞</span> },
            { key: 'map', label: 'PETA', icon: <Layers className="w-3 h-3" /> },
            { key: 'chat', label: 'CHAT', icon: <MessageSquare className="w-3 h-3" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>


      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative">
        
        {/* Desktop Split View: Map Left | Chat Right */}
        <div className="hidden md:flex h-full gap-4 items-stretch">
          
          {/* Peta GIS (Ketinggian tetap & stabil permanen) */}
          {(activeTab === 'split' || activeTab === 'map') && (
            <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 h-full ${
              activeTab === 'split' ? 'w-[58%] lg:w-[60%]' : 'w-full'
            }`}>
              <AIIntelligenceMap 
                highlightWilayah={highlightWilayah} 
                highlightPins={highlightPins}
                mapAction={mapAction}
                onTriggerChatPrompt={handleTriggerChatPrompt}
              />

              {/* Info hint Bottom-Left Sesuai Mockup 1 */}
              <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
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

          {/* Panel Chat AI (ChatGPT UI/UX Style - Permanen di Kanan) */}
          {(activeTab === 'split' || activeTab === 'chat') && (
            <div className={`h-full min-h-0 flex flex-col ${activeTab === 'split' ? 'flex-1 min-w-0' : 'w-full'}`}>
              <AIIntelligencePanel
                onWilayahHighlight={handleWilayahHighlight}
                onPinsHighlight={handlePinsHighlight}
                onMapAction={handleMapAction}
                externalPrompt={pendingPrompt}
                onClearExternalPrompt={handleClearPendingPrompt}
                isFullScreen={true}
              />
            </div>
          )}
        </div>

        {/* Mobile View: Stack Vertikal Teratur */}
        <div className="flex md:hidden flex-col gap-4 w-full pb-6">
          {/* Mobile Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-black text-center uppercase tracking-wider transition-all ${
                activeTab === 'chat' || activeTab === 'split' ? 'bg-white text-emerald-800 shadow-sm border border-slate-200' : 'text-slate-500'
              }`}
            >
              💬 Chat AI
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-black text-center uppercase tracking-wider transition-all ${
                activeTab === 'map' ? 'bg-white text-emerald-800 shadow-sm border border-slate-200' : 'text-slate-500'
              }`}
            >
              🗺️ Peta GIS
            </button>
          </div>

          {/* Mobile Content Display */}
          {(activeTab === 'chat' || activeTab === 'split') && (
            <div className="h-[68vh] min-h-[460px] max-h-[700px] w-full shrink-0">
              <AIIntelligencePanel
                onWilayahHighlight={handleWilayahHighlight}
                onPinsHighlight={handlePinsHighlight}
                onMapAction={handleMapAction}
                externalPrompt={pendingPrompt}
                onClearExternalPrompt={handleClearPendingPrompt}
                isFullScreen={true}
              />
            </div>
          )}

          {(activeTab === 'map' || activeTab === 'split') && (
            <div className="h-[320px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative shrink-0 w-full">
              <AIIntelligenceMap 
                highlightWilayah={highlightWilayah} 
                highlightPins={highlightPins}
                mapAction={mapAction}
                onTriggerChatPrompt={handleTriggerChatPrompt}
              />
              <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 bg-white/85 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <Info className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-500">
                  {highlightPins.length > 0
                    ? `${highlightPins.length} Pin Titik GPS`
                    : highlightWilayah.length > 0
                      ? `${highlightWilayah.length} wilayah aktif`
                      : 'Peta Spasial AI'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
