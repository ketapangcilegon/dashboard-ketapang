"use client";

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Map, MessageSquare, Layers } from 'lucide-react';
import AIIntelligencePanel, { MatchedPin, MapAction } from './AIIntelligencePanel';
import ErrorBoundary from './ErrorBoundary';

// ============================================================
// AIIntelligenceView
// Full-view split layout: 60% peta GIS kiri | 40% chat kanan
// Dilengkapi Single-Tree Rendering, Memory-Leak Prevention, & ErrorBoundary
// ============================================================

// Dynamic import peta agar tidak SSR
const AIIntelligenceMap = dynamic(
  () => import('./AIIntelligenceMap'),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-slate-100/80 rounded-2xl">
        <div className="flex flex-col items-center gap-2.5 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-600">Memuat Peta Spasial GIS…</span>
        </div>
      </div>
    )
  }
);

export default function AIIntelligenceView() {
  const [highlightWilayah, setHighlightWilayah] = useState<string[]>([]);
  const [highlightPins, setHighlightPins] = useState<MatchedPin[]>([]);
  const [mapAction, setMapAction] = useState<MapAction | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'map' | 'chat'>('split');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const checkScreen = () => {
        const desktop = window.innerWidth >= 768;
        setIsDesktop(desktop);
        if (!desktop && activeTab === 'split') {
          setActiveTab('chat');
        }
      };
      checkScreen();
      window.addEventListener('resize', checkScreen);
      return () => window.removeEventListener('resize', checkScreen);
    }
  }, [activeTab]);

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

  return (
    <ErrorBoundary fallbackTitle="Kendala Memuat Food Security Intelligence">
      <div className="flex flex-col md:h-[calc(100dvh-7.5rem)] md:min-h-[540px] min-h-0 w-full">
        
        {/* Page Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
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
            </div>
          </div>

          {/* Desktop Layout Tabs Toggle */}
          {isDesktop && (
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-sm">
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
          )}
        </div>

        {/* Main Content Area - Single Render Tree */}
        <div className="flex-1 min-h-0 relative">
          
          {isDesktop ? (
            /* Desktop View */
            <div className="flex h-full gap-4 items-stretch">
              
              {/* Peta GIS */}
              {(activeTab === 'split' || activeTab === 'map') && (
                <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 h-full ${
                  activeTab === 'split' ? 'w-[58%] lg:w-[60%]' : 'w-full'
                }`}>
                  <ErrorBoundary fallbackTitle="Kendala Memuat Peta GIS">
                    <AIIntelligenceMap 
                      highlightWilayah={highlightWilayah} 
                      highlightPins={highlightPins}
                      mapAction={mapAction}
                      onTriggerChatPrompt={handleTriggerChatPrompt}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {/* Panel Chat AI */}
              {(activeTab === 'split' || activeTab === 'chat') && (
                <div className={`h-full min-h-0 flex flex-col ${activeTab === 'split' ? 'flex-1 min-w-0' : 'w-full'}`}>
                  <ErrorBoundary fallbackTitle="Kendala Memuat Chat AI">
                    <AIIntelligencePanel
                      onWilayahHighlight={handleWilayahHighlight}
                      onPinsHighlight={handlePinsHighlight}
                      onMapAction={handleMapAction}
                      externalPrompt={pendingPrompt}
                      onClearExternalPrompt={handleClearPendingPrompt}
                      isFullScreen={true}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          ) : (
            /* Mobile View (Single Mounted Component, No Duplicate DOM / Leaflet instances) */
            <div className="flex flex-col gap-3 w-full pb-6">
              {/* Mobile Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black text-center uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'chat' || activeTab === 'split' 
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-200 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💬 Chat AI
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black text-center uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'map' 
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-200 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🗺️ Peta GIS
                </button>
              </div>

              {/* Mobile Tab Content */}
              {(activeTab === 'chat' || activeTab === 'split') && (
                <div className="h-[70vh] min-h-[460px] max-h-[720px] w-full shrink-0">
                  <ErrorBoundary fallbackTitle="Kendala Memuat Chat AI">
                    <AIIntelligencePanel
                      onWilayahHighlight={handleWilayahHighlight}
                      onPinsHighlight={handlePinsHighlight}
                      onMapAction={handleMapAction}
                      externalPrompt={pendingPrompt}
                      onClearExternalPrompt={handleClearPendingPrompt}
                      isFullScreen={true}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="h-[70vh] min-h-[460px] max-h-[720px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative shrink-0 w-full">
                  <ErrorBoundary fallbackTitle="Kendala Memuat Peta GIS">
                    <AIIntelligenceMap 
                      highlightWilayah={highlightWilayah} 
                      highlightPins={highlightPins}
                      mapAction={mapAction}
                      onTriggerChatPrompt={handleTriggerChatPrompt}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
