'use client';

import React, { useState } from 'react';
import { Layers, Check, Compass } from 'lucide-react';
import type { MapAction } from '@/components/AIIntelligencePanel';

interface MapTematikChatCardProps {
  onTriggerMapAction?: (action: MapAction) => void;
  defaultActiveLayer?: string;
}

export const MapTematikChatCard: React.FC<MapTematikChatCardProps> = ({
  onTriggerMapAction,
  defaultActiveLayer = 'fsva',
}) => {
  const [activeLayer, setActiveLayer] = useState<string>(defaultActiveLayer);

  const layers: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    badge: string;
    thematicMode: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting';
  }> = [
    {
      id: 'fsva',
      name: 'FSVA 2026 (Komposit Kerentanan Pangan)',
      description: 'Peta indikator ketahanan & kerentanan pangan 43 kelurahan se-Kota Cilegon',
      color: '#ef4444',
      badge: 'Prioritas 1-6',
      thematicMode: 'fsva',
    },
    {
      id: 'skpg',
      name: 'SKPG 2026 (Kewaspadaan Pangan & Gizi)',
      description: 'Pemantauan bulanan ketersediaan, akses, dan pemanfaatan pangan',
      color: '#f59e0b',
      badge: 'Bulanan',
      thematicMode: 'skpg',
    },
    {
      id: 'ikp',
      name: 'Skor IKP Kelurahan (Ketahanan Pangan)',
      description: 'Sebaran nilai Indeks Ketahanan Pangan komposit tingkat kelurahan',
      color: '#10b981',
      badge: 'Indeks Komposit',
      thematicMode: 'ikp',
    },
    {
      id: 'stunting',
      name: 'Surveilans Gizi & Stunting Posyandu',
      description: 'Pemantauan prevalensi status gizi balita tingkat kelurahan',
      color: '#8b5cf6',
      badge: 'Antropometri',
      thematicMode: 'stunting',
    },
  ];

  const handleSelectLayer = (
    layerId: string,
    thematicMode: 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting'
  ) => {
    setActiveLayer(layerId);
    if (onTriggerMapAction) {
      onTriggerMapAction({
        type: 'HIGHLIGHT',
        lat: -6.01,
        lng: 106.02,
        zoom: 12.5,
        thematicMode,
        layersToEnable: ['kelurahan'],
      });
    }
  };

  return (
    <div className="my-3 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-md shadow-emerald-500/5 overflow-hidden">
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-xs">
          <Compass className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Peta Tematik Spasial GIS Kota Cilegon</h4>
          <p className="text-xs text-slate-500 mt-0.5">Klik layer di bawah untuk langsung mengaktifkan peta choropleth GIS</p>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
          <Layers className="w-3 h-3 text-emerald-600" />
          Pilih Layer Peta Tematik
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {layers.map((l) => {
            const isSelected = activeLayer === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelectLayer(l.id, l.thematicMode)}
                className={`p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500/30'
                    : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="text-xs font-bold text-slate-800">{l.name}</span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{l.description}</p>
                <div className="mt-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {l.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapTematikChatCard;
