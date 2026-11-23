/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { Loader2, Camera, Check, ChevronDown, Plus, Minus, RotateCcw, Lightbulb, X, Download } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { normalizeKelurahanName } from '@/lib/wilayah';

// Dynamically import Leaflet components to bypass SSR errors
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

interface MapSKPGMiniProps {
  level: 'kecamatan' | 'kelurahan';
  dataStatus: Record<string, 'aman' | 'waspada' | 'rentan'>;
  height?: string;
  mapTitle?: string;
  periodLabel?: string;
}

// Exact centroid coordinates for all 8 Kecamatan in Kota Cilegon (fine-tuned for clean spacing)
const KECAMATAN_CENTROIDS: { name: string; coord: [number, number] }[] = [
  { name: 'PULOMERAK', coord: [-5.922, 106.012] },
  { name: 'GEROGOL', coord: [-5.975, 106.028] },
  { name: 'PURWAKARTA', coord: [-5.996, 106.050] },
  { name: 'CITANGKIL', coord: [-6.022, 106.002] },
  { name: 'CILEGON', coord: [-6.022, 106.042] },
  { name: 'JOMBANG', coord: [-6.006, 106.074] },
  { name: 'CIBEBER', coord: [-6.052, 106.072] },
  { name: 'CIWANDAN', coord: [-6.045, 105.968] }
];

// Helper to calculate centroid of polygon
function getFeatureCentroid(feature: any): [number, number] | null {
  try {
    const geom = feature.geometry;
    if (!geom) return null;
    let coords: number[][] = [];
    if (geom.type === 'Polygon') {
      coords = geom.coordinates[0];
    } else if (geom.type === 'MultiPolygon') {
      coords = geom.coordinates[0][0];
    }
    if (!coords || coords.length === 0) return null;
    let sumLng = 0, sumLat = 0;
    coords.forEach((c: number[]) => {
      if (c && c.length >= 2) {
        sumLng += c[0];
        sumLat += c[1];
      }
    });
    return [sumLat / coords.length, sumLng / coords.length];
  } catch {
    return null;
  }
}

// Exact Enlarge Icon matching Capture 1 & Capture 2 (rounded square with top-right diagonal arrow)
function EnlargeMapIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
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

// Synchronizes enlarged map size & calculates proportional zoom so framing matches the small map at higher resolution
function EnlargedMapAutoSync({
  center,
  baseZoom,
  origWidth,
  onComputedZoom,
}: {
  center: [number, number];
  baseZoom: number;
  origWidth: number;
  onComputedZoom?: (z: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const syncView = () => {
      try {
        map.invalidateSize();
        const container = map.getContainer();
        const newW = container?.clientWidth || origWidth;
        const scale = Math.max(1, newW / Math.max(180, origWidth));
        const targetZoom = Number((baseZoom + Math.log2(scale)).toFixed(2));
        map.setView(center, targetZoom, { animate: false });
        if (onComputedZoom) onComputedZoom(targetZoom);
      } catch {}
    };

    const t1 = setTimeout(syncView, 60);
    const t2 = setTimeout(syncView, 220);
    window.addEventListener('resize', syncView);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', syncView);
    };
  }, [map, center, baseZoom, origWidth, onComputedZoom]);

  return null;
}

export default function MapSKPGMini({
  level,
  dataStatus,
  height = '240px',
  mapTitle = 'Peta SKPG',
  periodLabel = ''
}: MapSKPGMiniProps) {
  // Singleton in-memory KMZ loader (0 extra Supabase / Vercel egress)
  const { layers, loadFromURL, loading } = useKMZLoader();
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEnlargedMenu, setShowEnlargedMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Enlarge modal states
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [enlargeMetrics, setEnlargeMetrics] = useState<{ origW: number; origH: number; aspectRatio: number }>({
    origW: 340,
    origH: 230,
    aspectRatio: 340 / 230,
  });
  const [enlargedDefaultZoom, setEnlargedDefaultZoom] = useState<number>(10.85);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const enlargedMapContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const enlargedMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
  }, [loadFromURL]);

  // Lock body scroll when enlarged modal is open
  useEffect(() => {
    if (!isEnlarged) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEnlarged(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isEnlarged]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (enlargedMenuRef.current && !enlargedMenuRef.current.contains(e.target as Node)) {
        setShowEnlargedMenu(false);
      }
    };
    if (showMenu || showEnlargedMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showEnlargedMenu]);

  // Create memoized label markers for mini map and enlarged map (small labels so they never cover polygons)
  const buildLabelMarkers = useCallback(
    (enlargedMode: boolean) => {
      if (typeof window === 'undefined') return [];

      if (level === 'kecamatan') {
        const modClass = enlargedMode ? 'skpg-marker-label--kec-enlarged' : 'skpg-marker-label--kec-mini';
        return KECAMATAN_CENTROIDS.map(k => {
          const icon = L.divIcon({
            className: 'skpg-marker-label-container',
            html: `<div class="skpg-marker-label ${modClass}">${k.name}</div>`,
            iconSize: [80, 18],
            iconAnchor: [40, 9]
          });
          return { name: k.name, coord: k.coord, icon };
        });
      } else {
        if (!layers.kelurahan || layers.kelurahan.length === 0) return [];
        const modClass = enlargedMode ? 'skpg-marker-label--kel-enlarged' : 'skpg-marker-label--kel-mini';
        return layers.kelurahan
          .map(f => {
            const name = String(f.properties?.name || f.properties?.Name || '').trim();
            const coord = getFeatureCentroid(f);
            if (!coord || !name) return null;
            const icon = L.divIcon({
              className: 'skpg-marker-label-container',
              html: `<div class="skpg-marker-label ${modClass}">${name}</div>`,
              iconSize: [68, 14],
              iconAnchor: [34, 7]
            });
            return { name, coord, icon };
          })
          .filter(Boolean) as { name: string; coord: [number, number]; icon: any }[];
      }
    },
    [level, layers.kelurahan]
  );

  const miniLabelMarkers = useMemo(() => buildLabelMarkers(false), [buildLabelMarkers]);
  const enlargedLabelMarkers = useMemo(
    () => (isEnlarged ? buildLabelMarkers(true) : []),
    [isEnlarged, buildLabelMarkers]
  );

  const handleOpenEnlarge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const origW = rect.width > 50 ? rect.width : 340;
      const origH = rect.height > 50 ? rect.height : 230;
      const aspectRatio = Number((origW / origH).toFixed(4));
      setEnlargeMetrics({ origW, origH, aspectRatio });
    }
    setIsEnlarged(true);
  };

  if (!mounted || loading) {
    return (
      <div 
        style={{ height }} 
        className="w-full bg-slate-100 flex flex-col items-center justify-center rounded-xl border border-slate-200 shadow-sm"
      >
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-1.5" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Memuat Peta Spasial...</p>
      </div>
    );
  }

  const activeFeatures = level === 'kecamatan' ? layers.kecamatan : layers.kelurahan;

  // Base coordinates & zoom for mini map
  const center: [number, number] = [-6.012, 106.026];
  const zoom = 9.85;

  const styleFeature = (feature: any) => {
    const name = String(feature.properties?.name || feature.properties?.Name || '').trim();
    
    let lookupKey = name;
    if (level === 'kelurahan') {
      const canon = normalizeKelurahanName(name);
      lookupKey = dataStatus[canon] ? canon : name;
    }

    const status = dataStatus[lookupKey] || dataStatus[name.toUpperCase()] || 'aman';

    const colors = {
      aman: { fill: '#6ABD45', border: '#2D6618' },
      waspada: { fill: '#F7EC13', border: '#8F8800' },
      rentan: { fill: '#ED1E24', border: '#82070B' }
    };

    const c = colors[status] || colors.aman;

    return {
      color: c.border,
      weight: isEnlarged ? 2.1 : 1.8,
      fillColor: c.fill,
      fillOpacity: 0.72
    };
  };

  const handleDownload = async (format: 'png' | 'jpeg', targetNode?: HTMLDivElement | null) => {
    const node = targetNode || (isEnlarged ? enlargedMapContainerRef.current : mapContainerRef.current);
    if (!node || downloading) return;
    setDownloading(true);
    setShowMenu(false);
    setShowEnlargedMenu(false);

    try {
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
        cacheBust: false, // Zero redundant tile re-fetch
        pixelRatio: 2, // High resolution export
        filter: (child: HTMLElement) => {
          if (child.classList && child.classList.contains('map-download-control')) {
            return false;
          }
          return true;
        }
      };

      const dataUrl = format === 'jpeg' 
        ? await toJpeg(node, { ...options, quality: 0.95, backgroundColor: '#AAD3DF' }) 
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
    <>
      <div 
        ref={mapContainerRef}
        style={{ height }} 
        className="w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs z-0 group bg-[#AAD3DF]"
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
          style={{ width: '100%', height: '100%', background: '#AAD3DF' }}
        >
          {/* Basemap showing clear land, topography, and blue sea (Selat Sunda & Teluk Banten) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Polygons with status colors */}
          {activeFeatures && activeFeatures.length > 0 && (
            <GeoJSON
              key={`mini-${level}-${activeFeatures.length}-${Object.keys(dataStatus).length}`}
              data={activeFeatures as any}
              style={styleFeature}
            />
          )}

          {/* Guaranteed Precision Centered Labels for all 8 Kecamatan / 43 Kelurahan */}
          {miniLabelMarkers.map(lm => (
            <Marker
              key={lm.name}
              position={lm.coord}
              icon={lm.icon}
              interactive={false}
            />
          ))}
          
          {/* Floating Zoom In, Zoom Out, and Reset Controls (Top-Left) */}
          <MapZoomControls defaultCenter={center} defaultZoom={zoom} />
        </MapContainer>

        {/* Floating Enlarge Button on Top-Right (Capture 1 & Capture 2 Icon) */}
        <div className="map-download-control absolute top-2 right-2 z-[400]">
          <button
            type="button"
            onClick={handleOpenEnlarge}
            title={`Perbesar ${mapTitle}`}
            aria-label={`Perbesar ${mapTitle}`}
            className="w-7 h-7 bg-white/90 hover:bg-white text-slate-800 hover:text-emerald-700 rounded-lg border border-slate-300/90 backdrop-blur-xs flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-90 cursor-pointer"
          >
            <EnlargeMapIcon className="w-4 h-4" />
          </button>
        </div>

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
                  onClick={() => handleDownload('png', mapContainerRef.current)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Format PNG</span>
                  <span className="text-[8px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black">HD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('jpeg', mapContainerRef.current)}
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

      {/* ===================================================================== */}
      {/* MODAL ENLARGED PETA SKPG (Pembungkus Gaya Versioning Capture 3)       */}
      {/* On-demand mount: 0 ekstra query ke Supabase / Vercel saat tidak dibuka */}
      {/* ===================================================================== */}
      {isEnlarged && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsEnlarged(false)}
        >
          {/* Pembungkus Kotak Kuning/Amber Gaya Versioning (Capture 3) */}
          <div
            className="w-full max-w-3xl bg-gradient-to-br from-amber-50 via-yellow-50/95 to-emerald-50 border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-200"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Kotak Kuning */}
            <div className="bg-gradient-to-r from-amber-100/90 via-yellow-100 to-amber-50 border-b border-amber-300/80 px-4 py-3 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-sm">
                  <Lightbulb className="w-4.5 h-4.5 fill-amber-950 text-amber-950" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-tight truncate">
                    {mapTitle}
                  </h3>
                  <p className="text-[10px] text-amber-900 font-bold truncate">
                    Tingkat {level === 'kecamatan' ? 'Kecamatan (8 Wilayah)' : 'Kelurahan (43 Wilayah)'}
                    {periodLabel ? (
                      <>
                        {' • '}Periode: <span className="font-mono text-emerald-800">{periodLabel}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                aria-label="Tutup Peta"
                title="Tutup"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Sub-bar Legenda Status & Info */}
            <div className="px-4 py-2 bg-amber-100/60 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-900 text-[9px] font-mono shrink-0 shadow-2xs">
                  SKPG Spasial HD
                </span>
                <div className="flex items-center gap-2 text-[9.5px] font-extrabold text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#6ABD45] border border-[#2D6618]" />
                    Aman
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#F7EC13] border border-[#8F8800]" />
                    Waspada
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#ED1E24] border border-[#82070B]" />
                    Rentan
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-900/80 hidden sm:inline">
                Rasio Aspek Identik ({enlargeMetrics.aspectRatio.toFixed(2)} : 1)
              </span>
            </div>

            {/* Body: Enlarged Map Container Matching Exact Aspect Ratio of Original Mini Map */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto flex items-center justify-center bg-white/60">
              <div
                ref={enlargedMapContainerRef}
                style={{
                  aspectRatio: `${enlargeMetrics.aspectRatio}`,
                  width: '100%',
                  maxHeight: '64vh',
                }}
                className="relative rounded-2xl overflow-hidden border-2 border-amber-300/90 shadow-lg bg-[#AAD3DF] mx-auto"
              >
                <MapContainer
                  center={center}
                  zoom={enlargedDefaultZoom}
                  zoomSnap={0.05}
                  zoomDelta={0.25}
                  zoomControl={false}
                  scrollWheelZoom={true}
                  doubleClickZoom={true}
                  touchZoom={true}
                  dragging={true}
                  style={{ width: '100%', height: '100%', background: '#AAD3DF' }}
                >
                  <EnlargedMapAutoSync
                    center={center}
                    baseZoom={zoom}
                    origWidth={enlargeMetrics.origW}
                    onComputedZoom={setEnlargedDefaultZoom}
                  />

                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />

                  {activeFeatures && activeFeatures.length > 0 && (
                    <GeoJSON
                      key={`enlarged-${level}-${activeFeatures.length}-${Object.keys(dataStatus).length}`}
                      data={activeFeatures as any}
                      style={styleFeature}
                    />
                  )}

                  {enlargedLabelMarkers.map(lm => (
                    <Marker
                      key={`enl-${lm.name}`}
                      position={lm.coord}
                      icon={lm.icon}
                      interactive={false}
                    />
                  ))}

                  <MapZoomControls defaultCenter={center} defaultZoom={enlargedDefaultZoom} />
                </MapContainer>
              </div>
            </div>

            {/* Footer Kotak Info: Tombol Unduh Peta & Tombol Tutup (Capture 3 Style) */}
            <div className="bg-amber-100/70 border-t border-amber-200/90 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
              <div ref={enlargedMenuRef} className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload('png', enlargedMapContainerRef.current)}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10.5px] transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  title="Unduh Peta Resolusi Tinggi (PNG)"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PNG (HD)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('jpeg', enlargedMapContainerRef.current)}
                  disabled={downloading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 font-black text-[10.5px] transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Unduh Peta Format JPG"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-700" />
                  <span>JPG</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="px-4 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[10.5px] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
