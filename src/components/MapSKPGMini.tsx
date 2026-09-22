/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { Loader2, Camera, Check, ChevronDown, Plus, Minus, RotateCcw } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { useMap } from 'react-leaflet';

// Dynamically import Leaflet components to bypass SSR errors
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

interface MapSKPGMiniProps {
  level: 'kecamatan' | 'kelurahan';
  dataStatus: Record<string, 'aman' | 'waspada' | 'rentan'>;
  height?: string;
  mapTitle?: string;
  periodLabel?: string;
}

// Inner component for custom interactive zoom controls
function MapZoomControls({ defaultCenter, defaultZoom }: { defaultCenter: [number, number]; defaultZoom: number }) {
  const map = useMap();

  return (
    <div className="map-download-control absolute top-2 left-2 z-[400] flex flex-col gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.zoomIn(0.5);
        }}
        className="w-6 h-6 bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-md border border-slate-250 backdrop-blur-xs flex items-center justify-center shadow-sm transition-all active:scale-90 cursor-pointer"
        title="Perbesar (Zoom In)"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.zoomOut(0.5);
        }}
        className="w-6 h-6 bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-md border border-slate-250 backdrop-blur-xs flex items-center justify-center shadow-sm transition-all active:scale-90 cursor-pointer"
        title="Perkecil (Zoom Out)"
      >
        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.setView(defaultCenter, defaultZoom);
        }}
        className="w-6 h-6 bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-md border border-slate-250 backdrop-blur-xs flex items-center justify-center shadow-sm transition-all active:scale-90 cursor-pointer"
        title="Reset Posisi Awal"
      >
        <RotateCcw className="w-3 h-3 stroke-[2]" />
      </button>
    </div>
  );
}

export default function MapSKPGMini({
  level,
  dataStatus,
  height = '240px',
  mapTitle = 'Peta SKPG',
  periodLabel = ''
}: MapSKPGMiniProps) {
  const { layers, loadFromURL, loading } = useKMZLoader();
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
  }, [loadFromURL]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!mounted || loading) {
    return (
      <div 
        style={{ height }} 
        className="w-full bg-slate-50/70 flex flex-col items-center justify-center rounded-xl border border-slate-100/80 shadow-sm"
      >
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-1.5" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Memuat Peta Spasial...</p>
      </div>
    );
  }

  const activeFeatures = level === 'kecamatan' ? layers.kecamatan : layers.kelurahan;

  // Zoomed out by ~20% (from original 10.5 down to 9.85 with zoomSnap 0.05) and optimized center
  const center: [number, number] = [-6.012, 106.026];
  const zoom = 9.85;

  const styleFeature = (feature: any) => {
    const name = String(feature.properties?.name || feature.properties?.Name || '').trim();
    
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
      aman: { fill: '#6ABD45', border: '#408027' },
      waspada: { fill: '#F7EC13', border: '#B8AF07' },
      rentan: { fill: '#ED1E24', border: '#9E0E13' }
    };

    const c = colors[status] || colors.aman;

    return {
      color: c.border,
      weight: 1.6,
      fillColor: c.fill,
      fillOpacity: 0.70
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const rawName = feature.properties?.name || feature.properties?.Name || '';
    const name = String(rawName).trim();
    if (name) {
      layer.bindTooltip(`<span class="skpg-label-text">${name}</span>`, {
        permanent: true,
        direction: 'center',
        className: 'skpg-polygon-label',
        interactive: false
      });
    }
  };

  const handleDownload = async (format: 'png' | 'jpeg') => {
    if (!mapContainerRef.current || downloading) return;
    setDownloading(true);
    setShowMenu(false);

    try {
      const node = mapContainerRef.current;
      const cleanTitle = (mapTitle || 'peta-skpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      const cleanPeriod = (periodLabel || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      const filename = `${cleanTitle}${cleanPeriod ? `-${cleanPeriod}` : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`;

      const options = {
        cacheBust: true,
        pixelRatio: 2, // High resolution export
        filter: (child: HTMLElement) => {
          // Exclude the floating UI controls from the screenshot
          if (child.classList && child.classList.contains('map-download-control')) {
            return false;
          }
          return true;
        }
      };

      const dataUrl = format === 'jpeg' 
        ? await toJpeg(node, { ...options, quality: 0.95, backgroundColor: '#FFFFFF' }) 
        : await toPng(node, options);

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export map image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div 
      ref={mapContainerRef}
      style={{ height }} 
      className="w-full relative rounded-xl overflow-hidden border border-slate-200/90 shadow-xs z-0 group bg-slate-50"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        zoomSnap={0.05}
        zoomDelta={0.25}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        style={{ width: '100%', height: '100%', background: '#F8FAFC' }}
      >
        <TileLayer
          url="https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
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
        
        {/* Floating Zoom In, Zoom Out, and Reset Controls (Top-Left) */}
        <MapZoomControls defaultCenter={center} defaultZoom={zoom} />
      </MapContainer>

      {/* Floating Download Button on Bottom-Right */}
      <div ref={menuRef} className="map-download-control absolute bottom-2 right-2 z-[400]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            disabled={downloading}
            title="Unduh Peta (PNG/JPG)"
            className="flex items-center gap-1 px-2.5 py-1 bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 text-[10px] font-extrabold rounded-lg shadow-md border border-slate-250 backdrop-blur-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Memproses...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Tersimpan</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Peta</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
              </>
            )}
          </button>

          {/* Format Popup Menu */}
          {showMenu && !downloading && (
            <div className="absolute right-0 bottom-full mb-1.5 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-slate-700 text-[10px] font-bold z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2.5 py-1 border-b border-slate-100 text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                Pilih Format
              </div>
              <button
                type="button"
                onClick={() => handleDownload('png')}
                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Format PNG</span>
                <span className="text-[8px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black">HD</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('jpeg')}
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Format JPG</span>
                <span className="text-[8px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-black">Std</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
