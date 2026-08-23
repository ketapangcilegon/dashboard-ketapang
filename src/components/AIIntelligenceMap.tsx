"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Marker, Popup } from 'react-leaflet';
import { MatchedPin } from './AIIntelligencePanel';

// ============================================================
// AIIntelligenceMap
// Peta Leaflet ringan khusus untuk AI Intelligence View
// Mendukung highlight wilayah & pin lokasi GPS presisi
// ============================================================

interface AIIntelligenceMapProps {
  highlightWilayah?: string[];
  highlightPins?: MatchedPin[];
}

function normalizeName(name: string): string {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isWilayahMatch(featureName: string, targets: string[]): boolean {
  const fn = normalizeName(featureName);
  return targets.some(t => {
    const tn = normalizeName(t);
    return fn === tn || fn.includes(tn) || tn.includes(fn);
  });
}

// Style constants
const DEFAULT_STYLE: L.PathOptions = {
  color: '#10b981',
  weight: 1.5,
  fillColor: '#d1fae5',
  fillOpacity: 0.25,
  dashArray: '4,3'
};

const KEL_STYLE: L.PathOptions = {
  color: '#f59e0b',
  weight: 1,
  fillColor: 'transparent',
  fillOpacity: 0,
  dashArray: '3,3'
};

const HIGHLIGHT_STYLE: L.PathOptions = {
  color: '#f59e0b',
  weight: 4,
  fillColor: '#fef3c7',
  fillOpacity: 0.75,
  dashArray: ''
};

const HIGHLIGHT_KEL_STYLE: L.PathOptions = {
  color: '#f59e0b',
  weight: 2.5,
  fillColor: '#fef08a',
  fillOpacity: 0.7,
  dashArray: ''
};

// ─── MapInit: set view + fix Leaflet icon + auto-invalidate size ───
function MapInit() {
  const map = useMap();
  useEffect(() => {
    map.setView([-6.002, 106.003], 12);
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Invalidate size immediately and after short delays to ensure complete tile rendering
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

// ─── HighlightManager: re-style layers + fit bounds ─────────
function HighlightManager({
  highlightWilayah,
  highlightPins = [],
  kecLayerRef,
  kelLayerRef
}: {
  highlightWilayah: string[];
  highlightPins?: MatchedPin[];
  kecLayerRef: React.RefObject<L.GeoJSON[]>;
  kelLayerRef: React.RefObject<L.GeoJSON[]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!kecLayerRef.current && !kelLayerRef.current) return;

    const highlightedBounds: L.LatLngBounds[] = [];

    // Re-style kecamatan layers
    if (kecLayerRef.current) {
      kecLayerRef.current.forEach(geoLayer => {
        if (!geoLayer) return;
        geoLayer.eachLayer(sub => {
          const path = sub as L.Path & { feature?: GeoJSON.Feature };
          if (!path.feature) return;
          const name = path.feature.properties?.name || path.feature.properties?.Name || '';
          const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(name, highlightWilayah);
          path.setStyle(isHighlighted ? HIGHLIGHT_STYLE : DEFAULT_STYLE);

          if (isHighlighted) {
            try {
              // L.Polygon/Polyline memiliki getBounds, L.Path tidak
              const poly = sub as L.Polygon;
              if (typeof poly.getBounds === 'function') {
                const b = poly.getBounds();
                if (b && b.isValid()) highlightedBounds.push(b);
              }
            } catch { /* skip */ }
          }
        });
      });
    }

    // Re-style kelurahan layers
    if (kelLayerRef.current) {
      kelLayerRef.current.forEach(geoLayer => {
        if (!geoLayer) return;
        geoLayer.eachLayer(sub => {
          const path = sub as L.Path & { feature?: GeoJSON.Feature };
          if (!path.feature) return;
          const name = path.feature.properties?.name || path.feature.properties?.Name || '';
          const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(name, highlightWilayah);
          path.setStyle(isHighlighted ? HIGHLIGHT_KEL_STYLE : KEL_STYLE);
        });
      });
    }

    // 1. Jika ada PIN GPS yang spesifik, fokus langsung ke titik PIN tersebut
    if (highlightPins.length > 0) {
      if (highlightPins.length === 1) {
        map.flyTo([highlightPins[0].lat, highlightPins[0].lng], 15, { animate: true, duration: 1 });
      } else {
        const pinBounds = L.latLngBounds(highlightPins.map(p => [p.lat, p.lng]));
        if (pinBounds.isValid()) {
          map.fitBounds(pinBounds, { padding: [60, 60], maxZoom: 15, animate: true });
        }
      }
      return;
    }

    // 2. Fit bounds ke semua wilayah poligon yang di-highlight
    if (highlightedBounds.length > 0 && highlightWilayah.length > 0) {
      try {
        const combined = highlightedBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds([]));
        if (combined.isValid()) {
          map.fitBounds(combined, { padding: [50, 50], maxZoom: 14, animate: true });
        }
      } catch { /* skip fitBounds error */ }
    } else if (highlightWilayah.length === 0 && highlightPins.length === 0) {
      // Reset zoom ke default saat highlight dihapus
      map.setView([-6.002, 106.003], 12, { animate: true });
    }
  }, [highlightWilayah, highlightPins, map, kecLayerRef, kelLayerRef]);

  return null;
}

// ─── Main Component ──────────────────────────────────────────
export default function AIIntelligenceMap({ 
  highlightWilayah = [],
  highlightPins = []
}: AIIntelligenceMapProps) {
  const { layers, loading, loadFromURL } = useKMZLoader();

  // Refs untuk menyimpan referensi Leaflet GeoJSON instances
  const kecLayerRef = useRef<L.GeoJSON[]>([]);
  const kelLayerRef = useRef<L.GeoJSON[]>([]);

  useEffect(() => {
    loadFromURL();
  }, [loadFromURL]);

  // Reset refs saat layers berubah
  useEffect(() => {
    kecLayerRef.current = [];
    kelLayerRef.current = [];
  }, [layers]);

  // Custom Icon helper untuk GPS Pin Markers
  const createPinIcon = (category: string, name: string) => {
    const isNelayan = category === 'nelayan';
    const isKolam = category === 'kolam';
    const bgClass = isNelayan ? 'bg-blue-600' : isKolam ? 'bg-cyan-600' : 'bg-emerald-600';
    const iconEmoji = isNelayan ? '⚓' : isKolam ? '🐟' : '🌱';

    return L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="background-color:${isNelayan ? '#2563eb' : isKolam ? '#0891b2' : '#059669'};color:white;font-weight:900;font-size:11px;padding:4px 8px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:2px solid white;display:flex;align-items:center;gap:4px;white-space:nowrap;animation:bounce 1s infinite alternate;">
            <span>${iconEmoji}</span>
            <span>${name}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${isNelayan ? '#2563eb' : isKolam ? '#0891b2' : '#059669'};"></div>
        </div>
      `,
      iconSize: [120, 40],
      iconAnchor: [60, 38]
    });
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[-6.002, 106.003]}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <MapInit />
        <HighlightManager
          highlightWilayah={highlightWilayah}
          highlightPins={highlightPins}
          kecLayerRef={kecLayerRef}
          kelLayerRef={kelLayerRef}
        />

        {/* Basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© OpenStreetMap © CARTO'
        />

        {/* GPS Pin Markers */}
        {highlightPins.map((pin, pidx) => (
          <Marker
            key={`pin-${pidx}-${pin.lat}-${pin.lng}`}
            position={[pin.lat, pin.lng]}
            icon={createPinIcon(pin.category, pin.name)}
          >
            <Popup autoPan={false}>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px', padding: '4px' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', fontSize: '13px' }}>
                  📌 {pin.name}
                </p>
                <p style={{ margin: '0 0 2px 0', color: '#475569' }}>
                  🏛️ Kelurahan: <strong>{pin.kelurahan}</strong>, Kec: <strong>{pin.kecamatan}</strong>
                </p>
                <p style={{ margin: '0', color: '#2563eb', fontWeight: 700, fontSize: '11px' }}>
                  🌐 Lat: {pin.lat.toFixed(6)}, Lng: {pin.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Layer Kecamatan */}
        {layers.kecamatan.map((f, i) => (
          <GeoJSON
            key={`ai-kec-${i}`}
            data={f as GeoJSON.Feature}
            style={DEFAULT_STYLE}
            ref={(ref) => {
              if (ref && kecLayerRef.current) {
                kecLayerRef.current[i] = ref;
              }
            }}
            onEachFeature={(feat, layer) => {
              const name = feat.properties?.name || feat.properties?.Name || '';
              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;font-weight:700;padding:4px 0">
                  🏛️ Kecamatan: <strong>${name}</strong>
                </div>
              `);
            }}
          />
        ))}

        {/* Layer Kelurahan */}
        {layers.kelurahan.map((f, i) => (
          <GeoJSON
            key={`ai-kel-${i}`}
            data={f as GeoJSON.Feature}
            style={KEL_STYLE}
            ref={(ref) => {
              if (ref && kelLayerRef.current) {
                kelLayerRef.current[i] = ref;
              }
            }}
            onEachFeature={(feat, layer) => {
              const name = feat.properties?.name || feat.properties?.Name || '';
              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;font-weight:700;padding:4px 0">
                  📍 Kelurahan: <strong>${name}</strong>
                </div>
              `);
            }}
          />
        ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[999] pointer-events-none">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Memuat layer peta…
          </div>
        </div>
      )}

      {/* Highlight legend */}
      {highlightWilayah.length > 0 && (
        <div className="absolute bottom-8 right-3 z-[500] bg-white/95 backdrop-blur-sm border border-amber-200 rounded-xl px-3 py-2.5 shadow-md">
          <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider mb-1.5">📍 Sorotan AI</p>
          {highlightWilayah.map(w => (
            <div key={w} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 mb-0.5">
              <div className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-400 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
