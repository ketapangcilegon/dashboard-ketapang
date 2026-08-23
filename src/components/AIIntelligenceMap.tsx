"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// AIIntelligenceMap
// Peta Leaflet ringan khusus untuk AI Intelligence View
// Mendukung highlight wilayah berdasarkan respons AI
// ============================================================

interface AIIntelligenceMapProps {
  highlightWilayah?: string[];
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

// ─── MapInit: set view + fix Leaflet icon ───────────────────
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
  }, [map]);
  return null;
}

// ─── HighlightManager: re-style layers + fit bounds ─────────
function HighlightManager({
  highlightWilayah,
  kecLayerRef,
  kelLayerRef
}: {
  highlightWilayah: string[];
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

    // Fit bounds ke semua wilayah yang di-highlight
    if (highlightedBounds.length > 0 && highlightWilayah.length > 0) {
      try {
        const combined = highlightedBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds([]));
        if (combined.isValid()) {
          map.fitBounds(combined, { padding: [50, 50], maxZoom: 14, animate: true });
        }
      } catch { /* skip fitBounds error */ }
    } else if (highlightWilayah.length === 0) {
      // Reset zoom ke default saat highlight dihapus
      map.setView([-6.002, 106.003], 12, { animate: true });
    }
  }, [highlightWilayah, map, kecLayerRef, kelLayerRef]);

  return null;
}

// ─── Main Component ──────────────────────────────────────────
export default function AIIntelligenceMap({ highlightWilayah = [] }: AIIntelligenceMapProps) {
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
          kecLayerRef={kecLayerRef}
          kelLayerRef={kelLayerRef}
        />

        {/* Basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© OpenStreetMap © CARTO'
        />

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
