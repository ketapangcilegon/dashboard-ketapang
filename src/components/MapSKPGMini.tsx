/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { Loader2 } from 'lucide-react';

// Dynamically import Leaflet components to bypass SSR errors
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

interface MapSKPGMiniProps {
  level: 'kecamatan' | 'kelurahan';
  dataStatus: Record<string, 'aman' | 'waspada' | 'rentan'>;
  height?: string;
}

export default function MapSKPGMini({ level, dataStatus, height = '240px' }: MapSKPGMiniProps) {
  const { layers, loadFromURL, loading } = useKMZLoader();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
  }, [loadFromURL]);

  if (!mounted || loading) {
    return (
      <div 
        style={{ height }} 
        className="w-full bg-slate-55 flex flex-col items-center justify-center rounded-xl border border-slate-100/80 shadow-sm"
      >
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-1.5" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Memuat Peta Spasial...</p>
      </div>
    );
  }

  const activeFeatures = level === 'kecamatan' ? layers.kecamatan : layers.kelurahan;

  // Cilegon center coordinates and zoom settings
  const center: [number, number] = [-6.015, 106.012];
  const zoom = level === 'kecamatan' ? 11.2 : 11.2;

  const styleFeature = (feature: any) => {
    const name = String(feature.properties?.name || feature.properties?.Name || '').trim();
    
    // Normalize string for dictionary lookup
    // e.g. mapping LEBAK GEDE -> Lebakgede
    let lookupKey = name;
    if (level === 'kelurahan') {
      const kelNormMap: Record<string, string> = {
        'LEBAK GEDE': 'Lebakgede',
        'TEGALRATU': 'Tegal Ratu',
        'BANJARNEGARA': 'Banjar Negara',
        'TAMANBARU': 'Taman Baru',
        'LEBAKDENOK': 'Lebak Denok',
        'PANGGUNGRAWI': 'Panggung Rawi',
        'KARANG ASEM': 'Karang Asem'
      };
      const upper = name.toUpperCase();
      lookupKey = kelNormMap[upper] || name;
    }

    const status = dataStatus[lookupKey] || 'aman';

    const colors = {
      aman: { fill: '#10B981', border: '#059669' },
      waspada: { fill: '#F59E0B', border: '#D97706' },
      rentan: { fill: '#EF4444', border: '#DC2626' }
    };

    const c = colors[status] || colors.aman;

    return {
      color: c.border,
      weight: 1.5,
      fillColor: c.fill,
      fillOpacity: 0.65
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const name = feature.properties?.name || feature.properties?.Name || '';
    layer.bindTooltip(`<div class="px-2 py-1 text-[10px] font-black text-slate-800 uppercase tracking-wide bg-white rounded shadow-sm">${name}</div>`, {
      sticky: true,
      direction: 'top'
    });
  };

  return (
    <div style={{ height }} className="w-full relative rounded-xl overflow-hidden border border-slate-150 shadow-inner z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        dragging={true}
        style={{ width: '100%', height: '100%', background: '#F8FAFC' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {activeFeatures && activeFeatures.length > 0 && (
          <GeoJSON
            key={`${level}-${activeFeatures.length}-${Object.keys(dataStatus).length}`}
            data={activeFeatures as any}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
