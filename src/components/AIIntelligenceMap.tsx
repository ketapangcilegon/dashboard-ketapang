"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GeoJSONComp: any = GeoJSON;

import 'leaflet/dist/leaflet.css';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';
import { MatchedPin, MapAction } from './AIIntelligencePanel';
import {
  ThematicMode,
  getThematicPolygonStyle,
  getThematicLegendConfig,
  resolveKelurahanData,
  THEMATIC_COLORS,
} from '@/lib/thematic-indicators';
import {
  MapRefSetter,
  MoveZoomControl,
  FitBoundsControl,
  MapZoomTracker,
} from './gis/MapHelpers';
import LocateMe from './gis/LocateMe';
import {
  KecamatanLayer,
  SawahLayer,
  PoktanDBPins,
  KolamDBPins,
  NelayanDBPins,
  HortiDBPins,
  PalawijaDBPins,
  WarningDBPins,
} from './gis/MapLayers';
import { Layers, ChevronDown, ChevronUp, Sparkles, SlidersHorizontal } from 'lucide-react';

// ============================================================
// AIIntelligenceMap
// UI/UX Peta Spasial GIS Serumpun-Padi × Dashboard Ketapang
// Fitur: Basemap Satelit Esri + OSM Overlay Toggle, GPS Live Tracker,
// Fit Bounds, 407 Petak Sawah, Layer Pins Sektor Pangan,
// Serta DYNAMIC THEMATIC CHOROPLETH (Fase 1: IKP, Penduduk, FSVA, SKPG, Stunting)
// ============================================================

interface AIIntelligenceMapProps {
  highlightWilayah?: string[];
  highlightPins?: MatchedPin[];
  mapAction?: MapAction | null;
  onTriggerChatPrompt?: (prompt: string) => void;
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

// Style boundary constants
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
  thematicMode = 'none',
  thematicOpacity = 0.65,
  indicatorData,
  kecLayerRef,
  kelLayerRef,
  filterActive = false,
  filteredWilayah = [],
}: {
  highlightWilayah: string[];
  highlightPins: MatchedPin[];
  mapAction?: MapAction | null;
  thematicMode?: ThematicMode;
  thematicOpacity?: number;
  indicatorData?: { fsvaMatang: any[]; skpgMatang: any[]; giziBalita: any[] };
  kecLayerRef: React.RefObject<L.GeoJSON[]>;
  kelLayerRef: React.MutableRefObject<L.GeoJSON[]>;
  filterActive?: boolean;
  filteredWilayah?: string[];
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
            } catch {}
          }
        });
      });
    }

    // Re-style kelurahan layers dengan integrasi Thematic Mode Choropleth & Spatial Filter Dimming (Fase 2)
    if (kelLayerRef.current) {
      kelLayerRef.current.forEach((geoLayer) => {
        if (!geoLayer) return;
        geoLayer.eachLayer((sub) => {
          const path = sub as L.Path & { feature?: GeoJSON.Feature };
          if (!path.feature) return;
          const name = path.feature.properties?.name || path.feature.properties?.Name || '';

          // Jika ada filter spasial aktif (Fase 2: Natural Language to GIS Querying)
          if (filterActive && filteredWilayah.length > 0) {
            const isMatch = isWilayahMatch(name, filteredWilayah);
            if (isMatch) {
              if (thematicMode === 'none') {
                path.setStyle({
                  color: '#10b981',
                  weight: 3.5,
                  fillColor: '#10b981',
                  fillOpacity: 0.35,
                  dashArray: undefined
                });
              } else {
                const th = getThematicPolygonStyle(name, thematicMode, Math.min(1, (thematicOpacity || 0.65) + 0.25), indicatorData);
                path.setStyle({
                  ...th,
                  color: '#10b981',
                  weight: 3.5,
                  fillOpacity: Math.min(1, (thematicOpacity || 0.65) + 0.3),
                  dashArray: undefined
                });
              }
              try {
                const poly = sub as L.Polygon;
                if (typeof poly.getBounds === 'function') {
                  const b = poly.getBounds();
                  if (b && b.isValid()) highlightedBounds.push(b);
                }
              } catch {}
            } else {
              // Dimmed / Semi-transparan untuk kelurahan yang tidak memenuhi kriteria filter
              path.setStyle({
                color: '#cbd5e1',
                weight: 1,
                fillColor: '#94a3b8',
                fillOpacity: 0.05,
                dashArray: '3,5',
              });
            }
            return;
          }

          const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(name, highlightWilayah);

          if (isHighlighted) {
            if (thematicMode === 'none') {
              path.setStyle(HIGHLIGHT_KEL_STYLE);
            } else {
              const th = getThematicPolygonStyle(name, thematicMode, Math.min(1, (thematicOpacity || 0.65) + 0.25), indicatorData);
              path.setStyle({
                ...th,
                color: '#f59e0b',
                weight: 3.5,
                fillOpacity: Math.min(1, (thematicOpacity || 0.65) + 0.3),
              });
            }
            try {
              const poly = sub as L.Polygon;
              if (typeof poly.getBounds === 'function') {
                const b = poly.getBounds();
                if (b && b.isValid()) highlightedBounds.push(b);
              }
            } catch {}
          } else {
            if (thematicMode === 'none') {
              path.setStyle(KEL_DEFAULT_STYLE);
            } else {
              path.setStyle(getThematicPolygonStyle(name, thematicMode, thematicOpacity || 0.65, indicatorData));
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
      } catch {}
      return;
    }

    // 2. Fit bounds ke semua wilayah poligon yang di-highlight
    if (highlightedBounds.length > 0 && highlightWilayah.length > 0) {
      try {
        const combined = highlightedBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds([]));
        if (combined.isValid()) {
          map.fitBounds(combined, { padding: [50, 50], maxZoom: 14, animate: true });
        }
      } catch {}
    }
  }, [highlightWilayah, highlightPins, map, mapAction, thematicMode, thematicOpacity, indicatorData, kecLayerRef, kelLayerRef]);

  return null;
}

// Komponen Layer Kelurahan dengan Thematic Choropleth & Rich Popups & Reverse Intelligence (Fase 2)
function ThematicKelurahanLayer({
  data,
  thematicMode,
  thematicOpacity,
  indicatorData,
  kelLayerRef,
  filterActive = false,
  filteredWilayah = [],
  onTriggerChatPrompt,
}: {
  data: any[];
  thematicMode: ThematicMode;
  thematicOpacity: number;
  indicatorData: { fsvaMatang: any[]; skpgMatang: any[]; giziBalita: any[] };
  kelLayerRef: React.MutableRefObject<L.GeoJSON[]>;
  filterActive?: boolean;
  filteredWilayah?: string[];
  onTriggerChatPrompt?: (prompt: string) => void;
}) {
  if (!data?.length) return null;

  return (
    <>
      {data.map((f, i) => {
        const rawName = f.properties?.name || f.properties?.Name || '';
        const kelData = resolveKelurahanData(rawName, indicatorData);
        let style = getThematicPolygonStyle(rawName, thematicMode, thematicOpacity, indicatorData);

        // Jika filter spasial aktif (Fase 2: Natural Language to GIS Querying)
        const isFilterMatch = isWilayahMatch(rawName, filteredWilayah);
        if (filterActive && filteredWilayah.length > 0) {
          if (isFilterMatch) {
            style = {
              ...style,
              color: '#10b981',
              weight: 3,
              fillOpacity: Math.min(1, thematicOpacity + 0.25),
            };
          } else {
            style = {
              color: '#cbd5e1',
              weight: 1,
              fillColor: '#94a3b8',
              fillOpacity: 0.05,
              dashArray: '3,5',
            };
          }
        }

        let metricInfoHtml = '';
        let metricBadgeText = '';

        if (thematicMode === 'ikp') {
          const score = kelData.ikpScore !== null && kelData.ikpScore !== undefined ? kelData.ikpScore.toFixed(2) : '-';
          const cat = kelData.ikpScore ? (kelData.ikpScore >= 77.29 ? 'Sangat Tahan' : kelData.ikpScore >= 69.71 ? 'Tahan' : kelData.ikpScore >= 61.83 ? 'Agak Tahan' : kelData.ikpScore >= 53.95 ? 'Agak Rentan' : kelData.ikpScore >= 46.37 ? 'Rentan' : 'Sangat Rentan') : 'Data Belum Tersedia';
          metricBadgeText = ` | IKP: ${score}`;
          metricInfoHtml = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase;">Indeks Ketahanan Pangan (IKP)</div>
              <div style="font-size:14px;font-weight:900;color:#15803d;margin-top:2px;">${score} <span style="font-size:11px;font-weight:700;">(${cat})</span></div>
            </div>
          `;
        } else if (thematicMode === 'penduduk') {
          const p = kelData.penduduk ? kelData.penduduk.toLocaleString('id-ID') : '-';
          const densityLabel = kelData.penduduk > 18000 ? 'Sangat Padat' : kelData.penduduk > 12500 ? 'Tinggi' : kelData.penduduk >= 7500 ? 'Sedang' : 'Rendah';
          metricBadgeText = ` | ${p} Jiwa`;
          metricInfoHtml = `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase;">Jumlah Penduduk (Dukcapil 2025)</div>
              <div style="font-size:14px;font-weight:900;color:#1d4ed8;margin-top:2px;">${p} Jiwa <span style="font-size:11px;font-weight:700;">(${densityLabel})</span></div>
            </div>
          `;
        } else if (thematicMode === 'fsva') {
          const p = kelData.fsvaPriority ? `Prioritas ${kelData.fsvaPriority}` : '-';
          metricBadgeText = ` | FSVA: ${p}`;
          metricInfoHtml = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#991b1b;text-transform:uppercase;">Prioritas Kerentanan FSVA</div>
              <div style="font-size:13px;font-weight:900;color:#b91c1c;margin-top:2px;">${p}</div>
            </div>
          `;
        } else if (thematicMode === 'skpg') {
          const st = kelData.skpgStatus ? kelData.skpgStatus.toUpperCase() : 'AMAN';
          metricBadgeText = ` | SKPG: ${st}`;
          metricInfoHtml = `
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#92400e;text-transform:uppercase;">Status Kerawanan SKPG</div>
              <div style="font-size:13px;font-weight:900;color:#b45309;margin-top:2px;">${st}</div>
            </div>
          `;
        } else if (thematicMode === 'stunting') {
          const stVal = kelData.stuntingPct !== null && kelData.stuntingPct !== undefined ? `${kelData.stuntingPct.toFixed(1)}%` : '-';
          const stLabel = kelData.stuntingPct ? (kelData.stuntingPct > 7.5 ? 'Waspada' : kelData.stuntingPct > 5 ? 'Sedang' : 'Rendah') : 'Normal';
          metricBadgeText = ` | Stunting: ${stVal}`;
          metricInfoHtml = `
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#6b21a8;text-transform:uppercase;">Prevalensi Stunting Balita (Posyandu)</div>
              <div style="font-size:13px;font-weight:900;color:#7e22ce;margin-top:2px;">${stVal} <span style="font-size:11px;font-weight:700;">(${stLabel})</span></div>
            </div>
          `;
        }

        const btnBriefId = `btn-brief-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`;

        return (
          <GeoJSONComp
            key={`thematic-kel-${rawName}-${thematicMode}-${thematicOpacity}-${filterActive}-${isFilterMatch}`}
            data={f}
            style={style as any}
            onEachFeature={(_feat: any, layer: L.Layer) => {
              if (kelLayerRef.current && !kelLayerRef.current.includes(layer as any)) {
                kelLayerRef.current.push(layer as any);
              }

              const pathLayer = layer as L.Path;
              pathLayer.on({
                mouseover: () => {
                  pathLayer.setStyle({ weight: 3, color: '#ffffff' });
                },
                mouseout: () => {
                  pathLayer.setStyle(style as any);
                },
              });

              layer.bindTooltip(
                `<span style="font-weight:800;font-size:11px;color:#ffffff;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;pointer-events:none;">${kelData.nama}${metricBadgeText}</span>`,
                { permanent: thematicMode !== 'none', direction: 'center', className: 'thematic-kel-label', interactive: false }
              );

              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 2px;min-width:230px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:6px;">
                    <b style="color:#0f172a;font-size:13px;">📍 Kel. ${kelData.nama}</b>
                    <span style="font-size:10px;font-weight:800;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:4px;">Kec. ${kelData.kecamatan}</span>
                  </div>

                  ${metricInfoHtml}

                  <div style="font-size:11.5px;color:#334155;margin-top:6px;display:flex;flex-direction:column;gap:3px;">
                    <div style="display:flex;justify-content:space-between;"><span>🌾 Sawah Baku:</span><b>${kelData.luasSawahHa.toFixed(2)} Ha</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>👥 Penduduk:</span><b>${kelData.penduduk ? kelData.penduduk.toLocaleString('id-ID') : '-'} Jiwa</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>📊 Rasio Sawah/Kapita:</span><b>${kelData.penduduk ? (kelData.luasSawahHa * 10000 / kelData.penduduk).toFixed(1) : 0} m²/jiwa</b></div>
                  </div>

                  <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #e2e8f0;display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                      ${kelData.isPlaceholder
                        ? `<span style="font-size:9px;color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:2px 5px;border-radius:4px;font-weight:800;">ℹ️ Placeholder (Siap Input Admin)</span>`
                        : `<span style="font-size:9px;color:#15803d;background:#dcfce7;border:1px solid #bbf7d0;padding:2px 5px;border-radius:4px;font-weight:800;">✅ Data Terverifikasi</span>`
                      }
                    </div>

                    <!-- Tombol Reverse Intelligence: Click-to-Brief -->
                    <button
                      id="${btnBriefId}"
                      type="button"
                      style="width:100%;margin-top:3px;background:linear-gradient(135deg, #065f46, #047857);color:#ffffff;border:none;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);"
                    >
                      ⚡ Briefing Analitis 360° AI
                    </button>
                  </div>
                </div>
              `);

              layer.on('popupopen', () => {
                const btn = document.getElementById(btnBriefId);
                if (btn) {
                  btn.onclick = () => {
                    onTriggerChatPrompt?.(`Berikan Briefing Analitis 360° lengkap untuk Kelurahan ${kelData.nama}, Kecamatan ${kelData.kecamatan}`);
                  };
                }
              });
            }}
          />
        );
      })}
    </>
  );
}

export default function AIIntelligenceMap({
  highlightWilayah = [],
  highlightPins = [],
  mapAction = null,
  onTriggerChatPrompt,
}: AIIntelligenceMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { layers, loading: kmzLoading, loadFromURL } = useKMZLoader();

  // Basemap & Layer visibility state
  const [showOsm, setShowOsm] = useState(false);
  const [mapZoom, setMapZoom] = useState(12.5);
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // Thematic Choropleth Mode & Dynamic Legend (Fase 1)
  const [thematicMode, setThematicMode] = useState<ThematicMode>('none');
  const [thematicOpacity, setThematicOpacity] = useState<number>(0.65);
  const [showThematicMenu, setShowThematicMenu] = useState(false);
  const [legendExpanded, setLegendExpanded] = useState(true);

  // Spatial Filter state (Fase 2: Natural Language to GIS Querying)
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [filteredWilayah, setFilteredWilayah] = useState<string[]>([]);
  const [filterLabel, setFilterLabel] = useState<string>('');

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

  // Supabase indicator data state
  const [indicatorData, setIndicatorData] = useState<{
    fsvaMatang: any[];
    skpgMatang: any[];
    giziBalita: any[];
  }>({
    fsvaMatang: [],
    skpgMatang: [],
    giziBalita: [],
  });

  // Fetch real data from Supabase for indicators
  useEffect(() => {
    async function fetchIndicatorData() {
      try {
        const [fsvaRes, skpgRes, giziRes] = await Promise.all([
          supabase.from('fsva_matang').select('*'),
          supabase.from('skpg_matang').select('*'),
          supabase.from('gizi_balita_skpg_kelurahan').select('*').limit(100),
        ]);

        setIndicatorData({
          fsvaMatang: fsvaRes.data || [],
          skpgMatang: skpgRes.data || [],
          giziBalita: giziRes.data || [],
        });
      } catch (err) {
        console.warn('Fallback ke baseline 43 kelurahan Cilegon:', err);
      }
    }
    fetchIndicatorData();
  }, []);

  // Realtime Smart Layer & Thematic Activation dari Chatbot AI Prompt
  useEffect(() => {
    if (!mapAction) return;
    if (mapAction.thematicMode) {
      setThematicMode(mapAction.thematicMode);
      setShowKelurahan(true);
    }
    if (mapAction.type === 'FILTER' || mapAction.filterActive) {
      setFilterActive(true);
      setFilteredWilayah(mapAction.filteredWilayah || []);
      setFilterLabel(mapAction.filterLabel || 'Filter Kriteria Spasial');
      setShowKelurahan(true);
    } else if (mapAction.type === 'RESET') {
      setFilterActive(false);
      setFilteredWilayah([]);
      setFilterLabel('');
    }
    if (mapAction.layersToEnable) {
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
    }
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

  // Dynamic custom pin icon builder for AI highlights
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
          <div class="sp-loc-pulse" style="width:44px;height:44px;background:${bgClass}44;top:calc(100% - 15px);left:50%;margin-left:-22px;margin-top:-22px;"></div>
          
          <div style="background:transparent;color:#ffffff;font-weight:900;font-size:11.5px;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-bottom:3px;z-index:10;pointer-events:none;letter-spacing:0.2px;">
            ${name || 'Lokasi'}
          </div>

          <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgClass};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.45);z-index:5;">
            <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.52)}px">${iconEmoji}</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  const legendConfig = useMemo(() => getThematicLegendConfig(thematicMode), [thematicMode]);

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
        {/* Basemap Satelit Esri */}
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

        {/* Floating Spatial Filter Status Pill (Fase 2: Natural Language to GIS Querying) */}
        {filterActive && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xl border border-emerald-500/50 text-[11px] font-black animate-in fade-in slide-in-from-top-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-[400px]">
              Filter Spasial AI: <span className="text-emerald-300 font-bold">{filterLabel}</span> ({filteredWilayah.length} Kelurahan)
            </span>
            <button
              onClick={() => {
                setFilterActive(false);
                setFilteredWilayah([]);
                setFilterLabel('');
              }}
              className="ml-1 bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all shrink-0"
              title="Reset Filter Spasial"
            >
              ✕ Reset
            </button>
          </div>
        )}

        {/* Controls & Helpers */}
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
          thematicMode={thematicMode}
          thematicOpacity={thematicOpacity}
          indicatorData={indicatorData}
          kecLayerRef={kecLayerRef}
          kelLayerRef={kelLayerRef}
          filterActive={filterActive}
          filteredWilayah={filteredWilayah}
        />

        {/* 1. Layer Kecamatan */}
        {showKecamatan && layers.kecamatan?.length > 0 && (
          <KecamatanLayer data={layers.kecamatan} />
        )}

        {/* 2. Layer Kelurahan dengan Dynamic Thematic Choropleth & Reverse Intelligence (Fase 1 & 2) */}
        {showKelurahan && layers.kelurahan?.length > 0 && (
          <ThematicKelurahanLayer
            data={layers.kelurahan}
            thematicMode={thematicMode}
            thematicOpacity={thematicOpacity}
            indicatorData={indicatorData}
            kelLayerRef={kelLayerRef}
            filterActive={filterActive}
            filteredWilayah={filteredWilayah}
            onTriggerChatPrompt={onTriggerChatPrompt}
          />
        )}

        {/* 3. Layer Sawah Baku (407 Petak) dengan Agri-Advisory GPS (Fase 2) */}
        {showSawah && layers.sawah?.length > 0 && (
          <SawahLayer
            data={layers.sawah}
            showSawah={showSawah}
            fillOpacity={0.50}
            onEachFeature={(feat: any, l: L.Layer) => {
              const name = feat.properties?.name || feat.properties?.Name || 'Petak Sawah Baku Cilegon';
              const rawLuas = feat.properties?.luas_m2 ? (feat.properties.luas_m2 / 10000).toFixed(2) : '0.85';
              const sid = feat._id || Math.random().toString(36).substring(7);

              l.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 0;min-width:215px;">
                  <div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid #e2e8f0;padding-bottom:5px;">
                    <span style="font-size:18px;">🌾</span>
                    <div>
                      <b style="color:#166534;font-size:13px;">${name}</b>
                      <div style="font-size:10px;color:#64748b;">Estimasi Luas: ~${rawLuas} Ha</div>
                    </div>
                  </div>
                  <div style="margin-top:6px;font-size:11px;color:#334155;display:flex;flex-direction:column;gap:3px;">
                    <div><b>Status Lahan:</b> Lahan Pertanian Pangan Abadi (LP2B)</div>
                    <div><b>Lokasi:</b> Sentra Produksi Kota Cilegon</div>
                  </div>
                  <button
                    id="btn-agri-${sid}"
                    type="button"
                    style="width:100%;margin-top:8px;background:linear-gradient(135deg, #047857, #065f46);color:#ffffff;border:none;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);"
                  >
                    🌱 Konsultasi Agronomi Presisi AI
                  </button>
                </div>
              `);

              l.on('popupopen', () => {
                const btn = document.getElementById(`btn-agri-${sid}`);
                if (btn) {
                  btn.onclick = () => {
                    onTriggerChatPrompt?.(`Konsultasi agronomi presisi untuk ${name} seluas ${rawLuas} Ha: rekomendasi varietas benih padi adaptif kekeringan/salinitas, jadwal pola tanam optimal, dan dosis pupuk subsidi berimbang.`);
                  };
                }
              });
            }}
          />
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

      {/* Floating Top-Right Toolbars: Thematic Choropleth Selector & Layer Filter */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
        
        {/* Thematic Mode Selector (Fase 1) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThematicMenu((p) => !p);
              setShowLayersPanel(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-md border text-xs font-black tracking-wide transition-all cursor-pointer ${
              thematicMode !== 'none'
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-emerald-700/30'
                : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300'
            }`}
            title="Pilih Indikator Tematik Poligon Kelurahan"
          >
            <Sparkles className={`w-3.5 h-3.5 ${thematicMode !== 'none' ? 'text-amber-300 animate-pulse' : 'text-emerald-600'}`} />
            <span>
              {thematicMode === 'none' && 'TEMA: NETRAL'}
              {thematicMode === 'ikp' && 'TEMA: IKP'}
              {thematicMode === 'penduduk' && 'TEMA: PENDUDUK'}
              {thematicMode === 'fsva' && 'TEMA: FSVA'}
              {thematicMode === 'skpg' && 'TEMA: SKPG'}
              {thematicMode === 'stunting' && 'TEMA: STUNTING'}
            </span>
            {showThematicMenu ? <ChevronUp className="w-3.5 h-3.5 opacity-70" /> : <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
          </button>

          {showThematicMenu && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-2.5 text-xs flex flex-col gap-1 z-[600] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>PILIH INDIKATOR TEMATIK</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">FASE 1</span>
              </div>

              {[
                { id: 'none', label: '🌟 Netral / Garis Batas', desc: 'Transparan fokus citra satelit & petak sawah' },
                { id: 'ikp', label: '🌾 Indeks Ketahanan Pangan', desc: '6 kategori ketahanan standar Bapanas' },
                { id: 'penduduk', label: '👥 Kepadatan Penduduk', desc: 'Total 480.378 jiwa se-Kota Cilegon' },
                { id: 'fsva', label: '🗺️ Prioritas Kerentanan FSVA', desc: 'Prioritas 1 s/d 6 kerentanan pangan' },
                { id: 'skpg', label: '📊 Status Kewaspadaan SKPG', desc: 'Aman (<10%), Waspada, dan Rentan' },
                { id: 'stunting', label: '👶 Prevalensi Stunting Balita', desc: 'Persentase kasus gizi balita posyandu' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setThematicMode(opt.id as ThematicMode);
                    setShowThematicMenu(false);
                    if (opt.id !== 'none') {
                      setShowKelurahan(true);
                    }
                  }}
                  className={`flex flex-col items-start px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    thematicMode === opt.id
                      ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200'
                      : 'text-slate-700 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="text-[11.5px]">{opt.label}</span>
                  <span className="text-[9.5px] font-medium text-slate-400 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layer Filter Panel Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLayersPanel((p) => !p);
              setShowThematicMenu(false);
            }}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl shadow-md hover:bg-white hover:border-slate-300 transition-all text-xs font-black tracking-wide cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>LAYER</span>
            {showLayersPanel ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showLayersPanel && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3 text-xs flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto custom-scrollbar z-[600] animate-in fade-in slide-in-from-top-2 duration-150">
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
      </div>

      {/* Floating Adaptive Thematic Legend (Bottom-Right Panel) */}
      {legendConfig && (
        <div className="absolute bottom-3 right-3 z-[500] max-w-[270px] w-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3 text-xs flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-3">
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-800 text-[11px] leading-tight flex items-center gap-1">
                <span>🎨</span> {legendConfig.title}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                {legendConfig.subtitle}
              </span>
            </div>
            <button
              onClick={() => setLegendExpanded((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
              title={legendExpanded ? 'Sembunyikan Legenda' : 'Tampilkan Legenda'}
            >
              {legendExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {legendExpanded && (
            <>
              <div className="flex flex-col gap-1.5 py-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {legendConfig.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0 border"
                        style={{
                          backgroundColor: item.color,
                          borderColor: item.borderColor || item.color,
                          opacity: thematicOpacity,
                        }}
                      />
                      <span className="font-bold text-slate-700 truncate">{item.label}</span>
                    </div>
                    {item.subLabel && (
                      <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Opacity Slider Control */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <SlidersHorizontal className="w-2.5 h-2.5 text-slate-400" />
                    Transparansi Poligon
                  </span>
                  <span className="text-emerald-700 font-black">{Math.round(thematicOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={thematicOpacity}
                  onChange={(e) => setThematicOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </>
          )}
        </div>
      )}

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
