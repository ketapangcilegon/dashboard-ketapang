"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

const GeoJSONComp: any = GeoJSON;

import 'leaflet/dist/leaflet.css';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';
import { MatchedPin, MapAction } from './AIIntelligencePanel';
import {
  MapRefSetter,
  MoveZoomControl,
  FitBoundsControl,
  MapZoomTracker,
} from './gis/MapHelpers';
import LocateMe from './gis/LocateMe';
import {
  KecamatanLayer,
  KelurahanLayer,
  SawahLayer,
  PoktanDBPins,
  KolamDBPins,
  NelayanDBPins,
  HortiDBPins,
  PalawijaDBPins,
  WarningDBPins,
} from './gis/MapLayers';
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, MapPin } from 'lucide-react';

// ============================================================
// AIIntelligenceMap
// UI/UX Peta Spasial GIS Serumpun-Padi × Dashboard Ketapang
// Fitur: Basemap Satelit Esri + OSM Overlay Toggle, GPS Live Tracker,
// Fit Bounds, 407 Petak Sawah, Layer Pins Sektor Pangan, dan AI FlyTo Highlight
// ============================================================

interface AIIntelligenceMapProps {
  highlightWilayah?: string[];
  highlightPins?: MatchedPin[];
  mapAction?: MapAction | null;
}

function normalizeName(name: string): string {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isWilayahMatch(featureName: string, targets: string[]): boolean {
  const fn = normalizeName(featureName);
  return targets.some((t) => {
    const tn = normalizeName(t);
    return fn === tn || fn.includes(tn) || tn.includes(fn);
  });
}

// Style boundary constants (Batas administrasi hanya garis, tanpa mengisi warna penuh)
const KEC_DEFAULT_STYLE: L.PathOptions = {
  color: '#c0392b',
  weight: 2.5,
  fillColor: 'transparent',
  fillOpacity: 0,
  dashArray: '8,4',
};

const KEL_DEFAULT_STYLE: L.PathOptions = {
  color: '#f59e0b',
  weight: 1.5,
  fillColor: 'transparent',
  fillOpacity: 0,
  dashArray: '4,3',
};

const HIGHLIGHT_KEC_STYLE: L.PathOptions = {
  color: '#e11d48',
  weight: 3.5,
  fillColor: '#fecdd3',
  fillOpacity: 0.45,
  dashArray: '',
};

const HIGHLIGHT_KEL_STYLE: L.PathOptions = {
  color: '#d97706',
  weight: 3.5,
  fillColor: '#fde68a',
  fillOpacity: 0.45,
  dashArray: '',
};

// Layer Toggle Control di Top-Left (OSM Roads & Rivers overlay toggle)
function LayerToggleControl({ setShowOsm }: { setShowOsm: React.Dispatch<React.SetStateAction<boolean>> }) {
  const map = useMap();
  useEffect(() => {
    const Ctrl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'sp-map-action-btn sp-layer-toggle-btn leaflet-bar');
        btn.title = 'Tampilkan / Sembunyikan layer jalan & sungai (OSM)';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', () => setShowOsm((p) => !p));
        return btn;
      },
    });
    const ctrl = new Ctrl({ position: 'topleft' });
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
    };
  }, [map, setShowOsm]);
  return null;
}

// Highlight Manager: FlyTo target wilayah atau Pin GPS saat user berinteraksi dengan AI
function HighlightManager({
  highlightWilayah = [],
  highlightPins = [],
  mapAction = null,
  kecLayerRef,
  kelLayerRef,
}: {
  highlightWilayah: string[];
  highlightPins: MatchedPin[];
  mapAction?: MapAction | null;
  kecLayerRef: React.RefObject<L.GeoJSON[]>;
  kelLayerRef: React.RefObject<L.GeoJSON[]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 0. Prioritas Aksi Langsung dari MapAction (Chatbot Realtime Response)
    if (mapAction) {
      if (mapAction.type === 'RESET') {
        try {
          map.flyTo([-6.01, 106.02], 12.5, { animate: true, duration: 1.2 });
        } catch {}
        return;
      }
      if (typeof mapAction.lat === 'number' && typeof mapAction.lng === 'number') {
        try {
          map.flyTo([mapAction.lat, mapAction.lng], mapAction.zoom || 16, { animate: true, duration: 1.5 });
        } catch {}
        return;
      }
    }

    const validPins = (highlightPins || []).filter(
      (p) => p && typeof p.lat === 'number' && !isNaN(p.lat) && typeof p.lng === 'number' && !isNaN(p.lng)
    );

    const highlightedBounds: L.LatLngBounds[] = [];

    // Re-style kecamatan layers
    if (kecLayerRef.current) {
      kecLayerRef.current.forEach((geoLayer) => {
        if (!geoLayer) return;
        geoLayer.eachLayer((sub) => {
          const path = sub as L.Path & { feature?: GeoJSON.Feature };
          if (!path.feature) return;
          const name = path.feature.properties?.name || path.feature.properties?.Name || '';
          const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(name, highlightWilayah);
          path.setStyle(isHighlighted ? HIGHLIGHT_KEC_STYLE : KEC_DEFAULT_STYLE);
          if (isHighlighted) {
            try {
              const poly = sub as L.Polygon;
              if (typeof poly.getBounds === 'function') {
                const b = poly.getBounds();
                if (b && b.isValid()) highlightedBounds.push(b);
              }
            } catch {
              /* skip */
            }
          }
        });
      });
    }

    // Re-style kelurahan layers
    if (kelLayerRef.current) {
      kelLayerRef.current.forEach((geoLayer) => {
        if (!geoLayer) return;
        geoLayer.eachLayer((sub) => {
          const path = sub as L.Path & { feature?: GeoJSON.Feature };
          if (!path.feature) return;
          const name = path.feature.properties?.name || path.feature.properties?.Name || '';
          const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(name, highlightWilayah);
          path.setStyle(isHighlighted ? HIGHLIGHT_KEL_STYLE : KEL_DEFAULT_STYLE);
          if (isHighlighted) {
            try {
              const poly = sub as L.Polygon;
              if (typeof poly.getBounds === 'function') {
                const b = poly.getBounds();
                if (b && b.isValid()) highlightedBounds.push(b);
              }
            } catch {
              /* skip */
            }
          }
        });
      });
    }

    // 1. Jika ada PIN GPS yang spesifik dari AI, fokus langsung ke titik PIN tersebut
    if (validPins.length > 0) {
      try {
        if (validPins.length === 1) {
          map.flyTo([validPins[0].lat, validPins[0].lng], 16, { animate: true, duration: 1.2 });
        } else {
          const pinBounds = L.latLngBounds(validPins.map((p) => [p.lat, p.lng]));
          if (pinBounds.isValid()) {
            map.fitBounds(pinBounds, { padding: [60, 60], maxZoom: 16, animate: true });
          }
        }
      } catch {
        /* skip */
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
      } catch {
        /* skip */
      }
    }
  }, [highlightWilayah, highlightPins, map, kecLayerRef, kelLayerRef]);

  return null;
}

export default function AIIntelligenceMap({
  highlightWilayah = [],
  highlightPins = [],
  mapAction = null,
}: AIIntelligenceMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { layers, loading: kmzLoading, loadFromURL } = useKMZLoader();

  // Basemap & Layer visibility state (UI/UX Serumpun Padi)
  const [showOsm, setShowOsm] = useState(false);
  const [mapZoom, setMapZoom] = useState(12.5);
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // Sector layer toggles
  const [showSawah, setShowSawah] = useState(true);
  const [showPoktan, setShowPoktan] = useState(true);
  const [showKWT, setShowKWT] = useState(true);
  const [showGapoktan, setShowGapoktan] = useState(true);
  const [showKolam, setShowKolam] = useState(true);
  const [showNelayan, setShowNelayan] = useState(true);
  const [showHorti, setShowHorti] = useState(true);
  const [showPalawija, setShowPalawija] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);
  const [showKelurahan, setShowKelurahan] = useState(true);

  // Realtime Smart Layer Activation dari Chatbot AI Prompt
  useEffect(() => {
    if (!mapAction?.layersToEnable) return;
    const l = mapAction.layersToEnable;
    if (l.includes('sawah')) setShowSawah(true);
    if (l.includes('nelayan')) setShowNelayan(true);
    if (l.includes('kolam')) setShowKolam(true);
    if (l.includes('poktan')) setShowPoktan(true);
    if (l.includes('kwt')) setShowKWT(true);
    if (l.includes('ternak')) setShowPoktan(true);
    if (l.includes('horti')) setShowHorti(true);
    if (l.includes('palawija')) setShowPalawija(true);
    if (l.includes('kelurahan')) setShowKelurahan(true);
    if (l.includes('kecamatan')) setShowKecamatan(true);
  }, [mapAction]);

  // Database pin data fetched from sp_cache_data
  const [dbData, setDbData] = useState<{
    poktan: any[];
    kolam: any[];
    nelayan: any[];
    horti: any[];
    palawija: any[];
    warning: any[];
  }>({
    poktan: [],
    kolam: [],
    nelayan: [],
    horti: [],
    palawija: [],
    warning: [],
  });

  const kecLayerRef = useRef<L.GeoJSON[]>([]);
  const kelLayerRef = useRef<L.GeoJSON[]>([]);

  // Load KMZ (Supabase Storage kmz-files / fallback)
  useEffect(() => {
    loadFromURL();
  }, [loadFromURL]);

  // Fetch Serumpun Padi database pins from sp_cache_data
  useEffect(() => {
    async function fetchCachePins() {
      try {
        const { data, error } = await supabase
          .from('sp_cache_data')
          .select('tabel_sumber, data');

        if (error || !data) return;

        const res: typeof dbData = {
          poktan: [],
          kolam: [],
          nelayan: [],
          horti: [],
          palawija: [],
          warning: [],
        };

        for (const row of data) {
          const d = row.data as any;
          if (!d) continue;

          if (row.tabel_sumber === 'poktan_kwt') {
            res.poktan = Array.isArray(d.list_poktan) ? d.list_poktan : (Array.isArray(d) ? d : []);
          } else if (row.tabel_sumber === 'kolam_budidaya') {
            res.kolam = Array.isArray(d.list_kolam) ? d.list_kolam : (Array.isArray(d) ? d : []);
          } else if (row.tabel_sumber === 'nelayan_tangkap') {
            res.nelayan = Array.isArray(d.list_nelayan) ? d.list_nelayan : (Array.isArray(d) ? d : []);
          } else if (row.tabel_sumber === 'komoditas_hortikultura') {
            res.horti = Array.isArray(d.sample_records) ? d.sample_records : (Array.isArray(d) ? d : []);
          } else if (row.tabel_sumber === 'komoditas_palawija') {
            res.palawija = Array.isArray(d.sample_records) ? d.sample_records : (Array.isArray(d) ? d : []);
          } else if (row.tabel_sumber === 'warning_opt') {
            res.warning = Array.isArray(d.sample_records) ? d.sample_records : (Array.isArray(d) ? d : []);
          }
        }

        setDbData(res);
      } catch (err) {
        console.error('Gagal mengambil pin DB Serumpun Padi:', err);
      }
    }

    fetchCachePins();
  }, []);

  // Filter valid AI Matched Pins & gabungkan pin dari MapAction jika ada
  const validAiPins = useMemo(() => {
    const all = [...(highlightPins || [])];
    if (mapAction?.pin && typeof mapAction.pin.lat === 'number' && typeof mapAction.pin.lng === 'number') {
      if (!all.some(p => p.name === mapAction.pin?.name && Math.abs(p.lat - mapAction.pin.lat) < 0.001)) {
        all.unshift(mapAction.pin);
      }
    }
    return all.filter(
      (p) => p && typeof p.lat === 'number' && !isNaN(p.lat) && typeof p.lng === 'number' && !isNaN(p.lng)
    );
  }, [highlightPins, mapAction]);

  // Gabungkan highlight wilayah dari MapAction target
  const combinedWilayah = useMemo(() => {
    const set = new Set(highlightWilayah || []);
    if (mapAction?.target) {
      set.add(mapAction.target);
    }
    return Array.from(set);
  }, [highlightWilayah, mapAction]);

  // Dynamic custom pin icon builder for AI highlights (Thematic Serumpun Padi style)
  const createAiPinIcon = (category: string, name: string) => {
    const isSawah = category === 'sawah';
    const isWilayah = category === 'wilayah';
    const isNelayan = category === 'nelayan';
    const isKolam = category === 'kolam';
    const isTernak = category === 'ternak';
    const isKwt = category === 'kwt';
    const isPoktan = category === 'poktan';
    const isHorti = category === 'horti';
    const isPalawija = category === 'palawija';
    const isWarning = category === 'warning';

    const bgClass = isSawah ? '#15803d'
      : isNelayan ? '#2ec4b6'
      : isKolam ? '#0096c7'
      : isTernak ? '#d97706'
      : isKwt ? '#b5003a'
      : isPoktan ? '#2d6a4f'
      : isHorti ? '#52b788'
      : isPalawija ? '#74c69d'
      : isWarning ? '#e63946'
      : isWilayah ? '#e11d48'
      : '#16a34a';

    const iconEmoji = isSawah ? '🌾'
      : isNelayan ? '⛵'
      : isKolam ? '🐟'
      : isTernak ? '🐄'
      : isKwt ? '👩🌾'
      : isPoktan ? '👨🌾'
      : isHorti ? '🌶️'
      : isPalawija ? '🌿'
      : isWarning ? '⚠️'
      : isWilayah ? '📍'
      : '🌱';

    const size = 30;

    return L.divIcon({
      className: 'custom-ai-thematic-pin',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:pointer;">
          <!-- Glowing Animated Radar Pulse -->
          <div class="sp-loc-pulse" style="width:44px;height:44px;background:${bgClass}44;top:calc(100% - 15px);left:50%;margin-left:-22px;margin-top:-22px;"></div>
          
          <!-- Transparent Floating Label with Sharp White Text and Dark Glow Shadow -->
          <div style="background:transparent;color:#ffffff;font-weight:900;font-size:11.5px;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-bottom:3px;z-index:10;pointer-events:none;letter-spacing:0.2px;">
            ${name || 'Lokasi'}
          </div>

          <!-- Serumpun Padi Teardrop Marker Pin -->
          <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgClass};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.45);z-index:5;">
            <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.52)}px">${iconEmoji}</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <MapContainer
        center={[-6.01, 106.02]}
        zoom={12.5}
        style={{ height: '100%', width: '100%' }}
        preferCanvas={true}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Basemap Satelit Esri (Default Serumpun Padi) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='<span style="background:#fff;border:1.5px solid #e0e0e0;border-radius:5px;padding:2px 9px 2px 6px;font-weight:800;color:#c45200;font-size:11px;display:inline-flex;align-items:center;gap:5px;vertical-align:middle">🐺 RidwanS</span> Tiles &copy; Esri'
        />

        {/* Overlay Jalan & Sungai OSM (Toggleable) */}
        {showOsm && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            opacity={0.65}
          />
        )}

        {/* Serumpun Padi Top-Left Controls & Helpers */}
        <MapRefSetter mapRef={mapRef} />
        <MapZoomTracker setZoom={setMapZoom} />
        <MoveZoomControl />
        <FitBoundsControl />
        <LocateMe />
        <LayerToggleControl setShowOsm={setShowOsm} />

        {/* AI Highlight Manager */}
        <HighlightManager
          highlightWilayah={combinedWilayah}
          highlightPins={validAiPins}
          mapAction={mapAction}
          kecLayerRef={kecLayerRef}
          kelLayerRef={kelLayerRef}
        />

        {/* 1. Layer Kecamatan */}
        {showKecamatan && layers.kecamatan?.length > 0 && (
          <KecamatanLayer data={layers.kecamatan} />
        )}

        {/* 2. Layer Kelurahan */}
        {showKelurahan && layers.kelurahan?.length > 0 && (
          <KelurahanLayer data={layers.kelurahan} />
        )}

        {/* 3. Layer Sawah Baku (407 Petak) */}
        {showSawah && layers.sawah?.length > 0 && (
          <SawahLayer data={layers.sawah} showSawah={showSawah} fillOpacity={0.50} />
        )}

        {/* 4. Layer Pin Database Sektor Serumpun Padi */}
        {showPoktan && dbData.poktan?.length > 0 && (
          <PoktanDBPins
            data={dbData.poktan}
            showPoktan={showPoktan}
            showKWT={showKWT}
            showGapoktan={showGapoktan}
          />
        )}

        {showKolam && dbData.kolam?.length > 0 && (
          <KolamDBPins data={dbData.kolam} show={showKolam} />
        )}

        {showNelayan && dbData.nelayan?.length > 0 && (
          <NelayanDBPins data={dbData.nelayan} show={showNelayan} />
        )}

        {showHorti && dbData.horti?.length > 0 && (
          <HortiDBPins data={dbData.horti} show={showHorti} />
        )}

        {showPalawija && dbData.palawija?.length > 0 && (
          <PalawijaDBPins data={dbData.palawija} show={showPalawija} />
        )}

        {showWarning && dbData.warning?.length > 0 && (
          <WarningDBPins data={dbData.warning} show={showWarning} />
        )}

        {/* 5. Active AI Matched Pins (Glow Highlight) */}
        {validAiPins.map((pin, pidx) => (
          <GeoJSONComp
            key={`ai-matched-pin-${pidx}-${pin.lat}-${pin.lng}`}
            data={
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
                properties: {},
              } as any
            }
            pointToLayer={(_: any, ll: any) =>
              L.marker(ll, {
                icon: createAiPinIcon(pin.category, pin.name),
                zIndexOffset: 2000,
              })
            }
            onEachFeature={(_: any, layer: any) => {
              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px;min-width:180px;">
                  <h4 style="margin:0 0 6px 0;color:#0f172a;font-weight:900;font-size:13px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
                    📌 ${pin.name}
                  </h4>
                  <p style="margin:0 0 3px 0;color:#475569;font-size:11.5px;">
                    🏛️ Kelurahan: <b>${pin.kelurahan || '-'}</b>, Kec: <b>${pin.kecamatan || '-'}</b>
                  </p>
                  <p style="margin:0;color:#2563eb;font-weight:700;font-size:11px;">
                    🌐 Koordinat: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}
                  </p>
                </div>
              `);
            }}
          />
        ))}
      </MapContainer>

      {/* Floating Layer Filter Panel (Slick Glassmorphism UI) */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col items-end">
        <button
          onClick={() => setShowLayersPanel((p) => !p)}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl shadow-md hover:bg-white hover:border-slate-300 transition-all text-xs font-black tracking-wide cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>LAYER PETA</span>
          {showLayersPanel ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {showLayersPanel && (
          <div className="mt-2 w-64 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3 text-xs flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                Filter Layer GIS
              </span>
              <span className="text-[9.5px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Serumpun Padi
              </span>
            </div>

            {/* Toggle Sawah Baku */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>🌾</span> Sawah Baku ({layers.sawah?.length || 407} Petak)
              </span>
              <input
                type="checkbox"
                checked={showSawah}
                onChange={(e) => setShowSawah(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Toggle Poktan / KWT */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>👨🌾</span> Poktan & KWT
              </span>
              <input
                type="checkbox"
                checked={showPoktan}
                onChange={(e) => {
                  setShowPoktan(e.target.checked);
                  setShowKWT(e.target.checked);
                  setShowGapoktan(e.target.checked);
                }}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Toggle Kolam Ikan */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>🐟</span> Perikanan Budidaya
              </span>
              <input
                type="checkbox"
                checked={showKolam}
                onChange={(e) => setShowKolam(e.target.checked)}
                className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
              />
            </label>

            {/* Toggle Nelayan Tangkap */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>⛵</span> Nelayan Tangkap
              </span>
              <input
                type="checkbox"
                checked={showNelayan}
                onChange={(e) => setShowNelayan(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
              />
            </label>

            {/* Toggle Horti & Palawija */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>🌶️</span> Hortikultura & Palawija
              </span>
              <input
                type="checkbox"
                checked={showHorti && showPalawija}
                onChange={(e) => {
                  setShowHorti(e.target.checked);
                  setShowPalawija(e.target.checked);
                }}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Toggle Batas Wilayah */}
            <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors">
              <span className="flex items-center gap-2">
                <span>🏛️</span> Batas Administrasi
              </span>
              <input
                type="checkbox"
                checked={showKecamatan && showKelurahan}
                onChange={(e) => {
                  setShowKecamatan(e.target.checked);
                  setShowKelurahan(e.target.checked);
                }}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>

            {/* Overlay OSM switch */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Overlay Jalan & Sungai</span>
              <button
                type="button"
                onClick={() => setShowOsm((p) => !p)}
                className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-colors ${
                  showOsm
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {showOsm ? 'AKTIF' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {kmzLoading && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[999] pointer-events-none">
          <div className="bg-white/95 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-slate-700 text-xs font-bold border border-slate-200">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data spasial KMZ & GIS Serumpun Padi…</span>
          </div>
        </div>
      )}
    </div>
  );
}
