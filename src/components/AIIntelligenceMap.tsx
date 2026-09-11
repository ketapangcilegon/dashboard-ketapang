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
  MapInvalidator,
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
import { evaluateSawahAgroTelemetry, generateSawahPixelGridFeatures, calculateGeometryAreaM2 } from '@/lib/agro-satellite';
import { SARANA_DISTRIBUSI_LIST, TANAMAN_PANGAN_LIST } from '@/lib/kamera-normatif';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { Layers, ChevronDown, ChevronUp, Sparkles, SlidersHorizontal, Satellite, X, Store, Trees, Camera } from 'lucide-react';

// ============================================================
// AIIntelligenceMap
// UI/UX Peta Spasial GIS Serumpun-Padi × Dashboard Ketapang
// Fitur: Basemap Satelit Esri + OSM Overlay Toggle, GPS Live Tracker,
// Fit Bounds, 407 Petak Sawah, Layer Pins Sektor Pangan,
// Serta DYNAMIC THEMATIC CHOROPLETH (Fase 1: IKP, Penduduk, FSVA, SKPG, Stunting)
// ============================================================

interface AIIntelligenceMapProps {
  activeTab?: 'split' | 'map' | 'chat';
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
    let ctrl: L.Control | null = null;
    try {
      const Ctrl = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create('button', 'sp-map-action-btn sp-layer-toggle-btn leaflet-bar');
          btn.title = 'Tampilkan / Sembunyikan layer jalan & sungai (OSM)';
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
          L.DomEvent.disableClickPropagation(btn);
          L.DomEvent.on(btn, 'click', () => setShowOsm((p) => !p));
          return btn;
        },
      });
      ctrl = new Ctrl({ position: 'topleft' });
      ctrl.addTo(map);
    } catch {}
    return () => {
      if (ctrl) {
        try {
          ctrl.remove();
        } catch {}
      }
    };
  }, [map, setShowOsm]);
  return null;
}

// Custom Panes: Memastikan batas poligon sawah baku (z-index 450) SELALU berada di atas mozaik piksel Sentinel-2 (z-index 350)
function CustomMapPanes() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getPane('sentinelPixelPane')) {
        const p1 = map.createPane('sentinelPixelPane');
        p1.style.zIndex = '350';
      }
      if (!map.getPane('sawahBorderPane')) {
        const p2 = map.createPane('sawahBorderPane');
        p2.style.zIndex = '450';
      }
    } catch {}
  }, [map]);
  return null;
}

// Highlight Manager: FlyTo target wilayah atau Pin GPS saat user berinteraksi dengan AI
function HighlightManager({
  highlightWilayah = [],
  highlightPins = [],
  mapAction = null,
  kelurahanFeatures = [],
  kecamatanFeatures = [],
}: {
  highlightWilayah: string[];
  highlightPins: MatchedPin[];
  mapAction?: MapAction | null;
  kelurahanFeatures?: any[];
  kecamatanFeatures?: any[];
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
    if (highlightWilayah.length > 0) {
      try {
        const matchedKel = (kelurahanFeatures || []).filter(f => {
          const name = f.properties?.name || f.properties?.Name || '';
          return isWilayahMatch(name, highlightWilayah);
        });
        const matchedKec = (kecamatanFeatures || []).filter(f => {
          const name = f.properties?.name || f.properties?.Name || '';
          return isWilayahMatch(name, highlightWilayah);
        });
        const combinedFeatures = [...matchedKel, ...matchedKec];
        
        if (combinedFeatures.length > 0) {
          const geoLayer = L.geoJSON(combinedFeatures as any);
          const b = geoLayer.getBounds();
          if (b && b.isValid()) {
            map.fitBounds(b, { padding: [50, 50], maxZoom: 14.5, animate: true });
          }
        }
      } catch {}
    }
  }, [highlightWilayah, highlightPins, map, mapAction, kelurahanFeatures, kecamatanFeatures]);

  return null;
}

// Komponen Layer Kelurahan dengan Thematic Choropleth & Rich Popups & Reverse Intelligence (Fase 2)
function ThematicKelurahanLayer({
  data,
  thematicMode,
  thematicOpacity,
  indicatorData,
  highlightWilayah = [],
  filterActive = false,
  filteredWilayah = [],
  showKelurahanLabels = true,
  onTriggerChatPrompt,
}: {
  data: any[];
  thematicMode: ThematicMode;
  thematicOpacity: number;
  indicatorData: { fsvaMatang: any[]; skpgMatang: any[]; giziBalita: any[] };
  highlightWilayah?: string[];
  filterActive?: boolean;
  filteredWilayah?: string[];
  showKelurahanLabels?: boolean;
  onTriggerChatPrompt?: (prompt: string) => void;
}) {
  if (!data?.length) return null;

  return (
    <>
      {data.map((f, i) => {
        const rawName = f.properties?.name || f.properties?.Name || '';
        const kelData = resolveKelurahanData(rawName, indicatorData);
        let style: any = getThematicPolygonStyle(rawName, thematicMode, thematicOpacity, indicatorData);

        const isHighlighted = highlightWilayah.length > 0 && isWilayahMatch(rawName, highlightWilayah);
        const isFilterMatch = isWilayahMatch(rawName, filteredWilayah);

        // Jika filter spasial aktif (Fase 2: Natural Language to GIS Querying)
        if (filterActive && filteredWilayah.length > 0) {
          if (isFilterMatch) {
            style = {
              ...style,
              color: '#10b981',
              weight: 3.5,
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
        } else if (isHighlighted) {
          if (thematicMode === 'none') {
            style = { ...HIGHLIGHT_KEL_STYLE };
          } else {
            const th = getThematicPolygonStyle(rawName, thematicMode, Math.min(1, (thematicOpacity || 0.65) + 0.25), indicatorData);
            style = {
              ...th,
              color: '#f59e0b',
              weight: 3.5,
              fillOpacity: Math.min(1, (thematicOpacity || 0.65) + 0.3),
            };
          }
        }


        let metricInfoHtml = '';

        if (thematicMode === 'ikp') {
          const score = kelData.ikpScore !== null && kelData.ikpScore !== undefined ? kelData.ikpScore.toFixed(2) : '-';
          const cat = kelData.ikpScore ? (kelData.ikpScore >= 77.29 ? 'Sangat Tahan' : kelData.ikpScore >= 69.71 ? 'Tahan' : kelData.ikpScore >= 61.83 ? 'Agak Tahan' : kelData.ikpScore >= 53.95 ? 'Agak Rentan' : kelData.ikpScore >= 46.37 ? 'Rentan' : 'Sangat Rentan') : 'Data Belum Tersedia';
          metricInfoHtml = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase;">Indeks Ketahanan Pangan (IKP)</div>
              <div style="font-size:14px;font-weight:900;color:#15803d;margin-top:2px;">${score} <span style="font-size:11px;font-weight:700;">(${cat})</span></div>
            </div>
          `;
        } else if (thematicMode === 'penduduk') {
          const p = kelData.penduduk ? kelData.penduduk.toLocaleString('id-ID') : '-';
          const densityLabel = kelData.penduduk > 18000 ? 'Sangat Padat' : kelData.penduduk > 12500 ? 'Tinggi' : kelData.penduduk >= 7500 ? 'Sedang' : 'Rendah';
          metricInfoHtml = `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase;">Jumlah Penduduk (Dukcapil 2025)</div>
              <div style="font-size:14px;font-weight:900;color:#1d4ed8;margin-top:2px;">${p} Jiwa <span style="font-size:11px;font-weight:700;">(${densityLabel})</span></div>
            </div>
          `;
        } else if (thematicMode === 'fsva') {
          const p = kelData.fsvaPriority ? `Prioritas ${kelData.fsvaPriority}` : '-';
          metricInfoHtml = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#991b1b;text-transform:uppercase;">Prioritas Kerentanan FSVA</div>
              <div style="font-size:13px;font-weight:900;color:#b91c1c;margin-top:2px;">${p}</div>
            </div>
          `;
        } else if (thematicMode === 'skpg') {
          const st = kelData.skpgStatus ? kelData.skpgStatus.toUpperCase() : 'AMAN';
          metricInfoHtml = `
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:6px;margin:5px 0;">
              <div style="font-size:10px;font-weight:800;color:#92400e;text-transform:uppercase;">Status Kerawanan SKPG</div>
              <div style="font-size:13px;font-weight:900;color:#b45309;margin-top:2px;">${st}</div>
            </div>
          `;
        } else if (thematicMode === 'stunting') {
          const stVal = kelData.stuntingPct !== null && kelData.stuntingPct !== undefined ? `${kelData.stuntingPct.toFixed(1)}%` : '-';
          const stLabel = kelData.stuntingPct ? (kelData.stuntingPct > 7.5 ? 'Waspada' : kelData.stuntingPct > 5 ? 'Sedang' : 'Rendah') : 'Normal';
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
            key={`thematic-kel-${rawName}-${thematicMode}-${thematicOpacity}-${filterActive}-${isFilterMatch}-${isHighlighted}`}
            data={f}
            style={style as any}
            onEachFeature={(_feat: any, layer: L.Layer) => {
              const pathLayer = layer as L.Path;
              pathLayer.on({
                mouseover: () => {
                  pathLayer.setStyle({ weight: 3.5, color: '#ffffff' });
                },
                mouseout: () => {
                  pathLayer.setStyle(style as any);
                },
              });

              if (showKelurahanLabels) {
                layer.bindTooltip(
                  `<span class="gis-label-kelurahan">${kelData.nama}</span>`,
                  {
                    permanent: true,
                    direction: 'center',
                    className: 'transparent-gis-label',
                    interactive: false
                  }
                );
              }

              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 2px;min-width:230px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:6px;">
                    <b style="color:#0f172a;font-size:13px;">📍 Kel. ${kelData.nama}</b>
                    <span style="font-size:10px;font-weight:800;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:4px;">Kec. ${kelData.kecamatan}</span>
                  </div>

                  ${metricInfoHtml}

                  <div style="font-size:11.5px;color:#334155;margin-top:6px;display:flex;flex-direction:column;gap:3px;">
                    <div style="display:flex;justify-content:space-between;"><span>🌾 Sawah Baku:</span><b>${((kelData && typeof kelData.luasSawahHa === 'number') ? kelData.luasSawahHa : 0).toFixed(2)} Ha</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>👥 Penduduk:</span><b>${(kelData && kelData.penduduk) ? kelData.penduduk.toLocaleString('id-ID') : '-'} Jiwa</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>📊 Rasio Sawah/Kapita:</span><b>${(kelData && kelData.penduduk && typeof kelData.luasSawahHa === 'number') ? (kelData.luasSawahHa * 10000 / kelData.penduduk).toFixed(1) : 0} m²/jiwa</b></div>
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

// Builder Icon Teardrop Tematik Kamera Cerdas untuk Peta AI Intelligence
function createKameraObservasiIcon(item: ObservasiRecord) {
  const isPasokan = item.mode === 'pasokan_beras';
  let emoji = isPasokan ? '🏪' : '🥔';
  let bgColor = isPasokan ? '#2563eb' : '#16a34a';

  if (isPasokan) {
    const s = SARANA_DISTRIBUSI_LIST.find((x) => x.id === item.kategori);
    if (s) {
      emoji = s.icon;
      bgColor = s.color;
    }
  } else {
    const t = TANAMAN_PANGAN_LIST.find((x) => x.id === item.kategori);
    if (t) {
      emoji = t.icon;
      bgColor = t.color;
    }
  }

  const size = 32;

  return L.divIcon({
    className: 'kamera-cerdas-pin-gis',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:pointer;">
        <!-- Glowing Radar Pulse -->
        <div class="sp-loc-pulse" style="width:44px;height:44px;background:${bgColor}44;top:calc(100% - 16px);left:50%;margin-left:-22px;margin-top:-22px;"></div>
        
        <!-- Transparent Label with Sharp Shadow -->
        <div style="background:transparent;color:#ffffff;font-weight:900;font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-bottom:3px;z-index:10;pointer-events:none;">
          ${item.nama_lokasi || item.kategori_label || (isPasokan ? 'Pemasok Beras' : 'Pangan Lokal')}
        </div>

        <!-- Teardrop Marker Pin -->
        <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgColor};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.45);z-index:5;">
          <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.52)}px">${emoji}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Komponen Layer Pin Hasil Input Data Kamera Cerdas (Pasokan Beras & Pangan Lokal)
function KameraObservasiPins({
  data,
  mode,
  onTriggerChatPrompt,
}: {
  data: ObservasiRecord[];
  mode: 'pasokan_beras' | 'tanaman_pangan';
  onTriggerChatPrompt?: (prompt: string) => void;
}) {
  if (!data?.length) return null;

  return (
    <>
      {data.map((item, idx) => {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

        const isBeras = mode === 'pasokan_beras';
        const btnId = `btn-kamera-brief-${item.id || idx}`;

        return (
          <GeoJSONComp
            key={`kamera-obs-${mode}-${item.id || idx}-${lat}-${lng}`}
            data={
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {},
              } as any
            }
            pointToLayer={(_: any, ll: any) =>
              L.marker(ll, {
                icon: createKameraObservasiIcon(item),
                zIndexOffset: 1600,
              })
            }
            onEachFeature={(_: any, layer: any) => {
              const photoHtml = item.foto_url
                ? `<div style="margin-bottom:8px;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;max-height:130px;background:#0f172a;">
                    <img src="${item.foto_url}" alt="Foto Observasi" style="width:100%;height:120px;object-fit:cover;display:block;" />
                   </div>`
                : '';

              const detailHtml = isBeras
                ? `
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 8px;margin-top:6px;display:flex;flex-direction:column;gap:3px;font-size:11px;">
                    <div style="display:flex;justify-content:space-between;">
                      <span style="color:#475569;">📦 Stok Pasokan:</span>
                      <b style="color:#1d4ed8;">${(item.estimasi_pasokan_kg || 0).toLocaleString('id-ID')} Kg</b>
                    </div>
                    ${item.asal_pasokan ? `<div style="display:flex;justify-content:space-between;"><span style="color:#475569;">🚚 Asal Pasokan:</span><b style="color:#0f172a;">${item.asal_pasokan}</b></div>` : ''}
                    ${item.merek_beras ? `<div style="display:flex;justify-content:space-between;"><span style="color:#475569;">🏷️ Merek:</span><b style="color:#0f172a;">${item.merek_beras}</b></div>` : ''}
                  </div>
                `
                : `
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 8px;margin-top:6px;display:flex;flex-direction:column;gap:3px;font-size:11px;">
                    <div style="display:flex;justify-content:space-between;">
                      <span style="color:#475569;">🌳 Est. Produksi:</span>
                      <b style="color:#15803d;">${(item.estimasi_produksi_kg || 0).toLocaleString('id-ID')} Kg</b>
                    </div>
                    ${item.jumlah_pohon_rumpun ? `<div style="display:flex;justify-content:space-between;"><span style="color:#475569;">🌱 Rumpun/Pohon:</span><b style="color:#0f172a;">${item.jumlah_pohon_rumpun} Pohon</b></div>` : ''}
                    ${item.luas_lahan_m2 ? `<div style="display:flex;justify-content:space-between;"><span style="color:#475569;">📐 Luas Lahan:</span><b style="color:#0f172a;">${item.luas_lahan_m2} m²</b></div>` : ''}
                    ${item.fase_pertumbuhan ? `<div style="display:flex;justify-content:space-between;"><span style="color:#475569;">🌿 Fase:</span><b style="color:#0f172a;">${item.fase_pertumbuhan}</b></div>` : ''}
                  </div>
                `;

              layer.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 2px;min-width:240px;max-width:270px;">
                  ${photoHtml}
                  <div style="border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:5px;">
                      <span style="font-size:14px;">${isBeras ? '🏪' : '🥔'}</span>
                      <b style="color:#0f172a;font-size:13px;line-height:1.2;">${item.nama_lokasi || item.kategori_label || (isBeras ? 'Pemasok Beras' : 'Pangan Lokal')}</b>
                    </div>
                    <p style="margin:2px 0 0 0;font-size:10.5px;color:#64748b;">
                      📍 Kel. ${item.kelurahan || '-'}, Kec. ${item.kecamatan || '-'}
                    </p>
                  </div>

                  ${detailHtml}

                  <div style="margin-top:6px;display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:#64748b;">
                    <span>📅 ${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Realtime'}</span>
                    <span style="color:#16a34a;font-weight:800;background:#dcfce7;border:1px solid #bbf7d0;padding:1px 5px;border-radius:4px;">
                      ✅ Kamera Cerdas
                    </span>
                  </div>

                  <button
                    id="${btnId}"
                    type="button"
                    style="width:100%;margin-top:8px;background:${isBeras ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'linear-gradient(135deg, #059669, #10b981)'};color:#ffffff;border:none;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);"
                  >
                    ⚡ Analisis Titik Ini di AI Chatbot
                  </button>
                </div>
              `);

              layer.on('popupopen', () => {
                const btn = document.getElementById(btnId);
                if (btn) {
                  btn.onclick = () => {
                    const prompt = isBeras
                      ? `Analisis pasokan beras di lokasi ${item.nama_lokasi || item.kategori_label || 'Toko Beras'}, Kelurahan ${item.kelurahan}, Kecamatan ${item.kecamatan} dengan stok ${(item.estimasi_pasokan_kg || 0).toLocaleString('id-ID')} Kg (Asal: ${item.asal_pasokan || 'Lokal'}). Bagaimana kestabilan stok pangan dan rekomendasi distribusinya?`
                      : `Analisis potensi tanaman pangan ${item.kategori_label || 'Pangan Lokal'} di lokasi ${item.nama_lokasi || item.kategori_label}, Kelurahan ${item.kelurahan}, Kecamatan ${item.kecamatan} (${item.jumlah_pohon_rumpun ? item.jumlah_pohon_rumpun + ' pohon' : (item.luas_lahan_m2 ? item.luas_lahan_m2 + ' m²' : '')}, estimasi produksi ${(item.estimasi_produksi_kg || 0).toLocaleString('id-ID')} Kg). Bagaimana kontribusinya terhadap ketahanan pangan dan B2SA?`;
                    onTriggerChatPrompt?.(prompt);
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
  activeTab = 'split',
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
  const [legendExpanded, setLegendExpanded] = useState(true);

  // Label Toggles (Nama Kecamatan & Nama Kelurahan)
  const [showKelurahanLabels, setShowKelurahanLabels] = useState(true);
  const [showKecamatanLabels, setShowKecamatanLabels] = useState(true);

  // Spatial Filter state (Fase 2: Natural Language to GIS Querying)
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [filteredWilayah, setFilteredWilayah] = useState<string[]>([]);
  const [filterLabel, setFilterLabel] = useState<string>('');

  // Sector layer toggles
  const [showSawah, setShowSawah] = useState(true);
  const [showSentinelNdvi, setShowSentinelNdvi] = useState(true);
  const [showSentinelLegend, setShowSentinelLegend] = useState(true);
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

  // Kamera Cerdas Observasi Pins & Layer Toggles
  const [showKameraBeras, setShowKameraBeras] = useState(true);
  const [showKameraPanganLokal, setShowKameraPanganLokal] = useState(true);
  const [kameraObservasiList, setKameraObservasiList] = useState<ObservasiRecord[]>([]);

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
      if (l.includes('kamera_beras') || l.includes('pasokan_beras') || l.includes('beras')) setShowKameraBeras(true);
      if (l.includes('kamera_pangan') || l.includes('pangan_lokal') || l.includes('sukun')) setShowKameraPanganLokal(true);
    }
  }, [mapAction]);

  // Fetch data observasi kamera cerdas dari Supabase (dengan fallback ke sp_cache_data)
  useEffect(() => {
    async function fetchKameraObservasi() {
      try {
        const { data, error } = await supabase
          .from('kamera_cerdas_observasi')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setKameraObservasiList(data);
          return;
        }

        const { data: cacheData } = await supabase
          .from('sp_cache_data')
          .select('data')
          .eq('tabel_sumber', 'kamera_cerdas_observasi')
          .single();

        if (cacheData?.data && Array.isArray(cacheData.data)) {
          setKameraObservasiList(cacheData.data);
        }
      } catch (err) {
        console.warn('Gagal memuat observasi kamera cerdas:', err);
      }
    }

    fetchKameraObservasi();
  }, []);

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

  // Pisahkan observasi Kamera Cerdas: Pasokan Beras & Pangan Lokal
  const kameraBerasList = useMemo(() => {
    return kameraObservasiList.filter(
      (item) =>
        item.mode === 'pasokan_beras' &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        !isNaN(item.latitude) &&
        !isNaN(item.longitude) &&
        item.latitude !== 0 &&
        item.longitude !== 0
    );
  }, [kameraObservasiList]);

  const kameraPanganList = useMemo(() => {
    return kameraObservasiList.filter(
      (item) =>
        item.mode === 'tanaman_pangan' &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        !isNaN(item.latitude) &&
        !isNaN(item.longitude) &&
        item.latitude !== 0 &&
        item.longitude !== 0
    );
  }, [kameraObservasiList]);

  // Gabungkan highlight wilayah dari MapAction target
  const combinedWilayah = useMemo(() => {
    const set = new Set(highlightWilayah || []);
    if (mapAction?.target) {
      set.add(mapAction.target);
    }
    return Array.from(set);
  }, [highlightWilayah, mapAction]);

  // Generate multi-colored 10m Sentinel-2 pixel grid cells inside sawah polygons
  const sentinelGridFeatures = useMemo(() => {
    if (!layers.sawah?.length) return [];
    return generateSawahPixelGridFeatures(layers.sawah);
  }, [layers.sawah]);

  // Dynamic custom pin icon builder for AI highlights
  const createAiPinIcon = (category: string, name: string) => {
    const isBeras = category === 'beras' || category === 'pasokan_beras';
    const isPanganLokal = category === 'pangan_lokal' || category === 'tanaman_pangan';
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

    const bgClass = isBeras ? '#2563eb'
      : isPanganLokal ? '#16a34a'
      : isSawah ? '#15803d'
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

    const iconEmoji = isBeras ? '🏪'
      : isPanganLokal ? '🥔'
      : isSawah ? '🌾'
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
      <style>{`
        .transparent-gis-label,
        .leaflet-tooltip.transparent-gis-label,
        .thematic-kel-label,
        .leaflet-tooltip.thematic-kel-label {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          white-space: nowrap !important;
        }
        .gis-label-kelurahan {
          font-size: 8.5px !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000 !important;
          pointer-events: none !important;
          letter-spacing: 0.2px !important;
        }
        .gis-label-kecamatan {
          font-size: 13px !important;
          font-weight: 900 !important;
          color: #fef08a !important;
          text-shadow: 0 1px 3px rgba(0,0,0,0.98), 0 0 6px rgba(0,0,0,0.95), -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000 !important;
          pointer-events: none !important;
          letter-spacing: 1.2px !important;
          text-transform: uppercase !important;
        }
      `}</style>
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
        <CustomMapPanes />
        <MapRefSetter mapRef={mapRef} />
        <MapZoomTracker setZoom={setMapZoom} />
        <MapInvalidator invalidationKey={activeTab} />
        <MoveZoomControl />
        <FitBoundsControl />
        <LocateMe />
        <LayerToggleControl setShowOsm={setShowOsm} />

        {/* AI Highlight Manager */}
        <HighlightManager
          highlightWilayah={combinedWilayah}
          highlightPins={validAiPins}
          mapAction={mapAction}
          kelurahanFeatures={layers.kelurahan}
          kecamatanFeatures={layers.kecamatan}
        />

        {/* 1. Layer Kecamatan */}
        {showKecamatan && layers.kecamatan?.length > 0 && (
          <KecamatanLayer
            key={`kec-layer-${showKecamatanLabels}-${combinedWilayah.join('-')}`}
            data={layers.kecamatan}
            onEachFeature={(feat: any, l: L.Layer) => {
              const name = feat.properties?.name || feat.properties?.Name || '';
              const isHighlighted = combinedWilayah.length > 0 && isWilayahMatch(name, combinedWilayah);
              if (isHighlighted && typeof (l as L.Path).setStyle === 'function') {
                (l as L.Path).setStyle(HIGHLIGHT_KEC_STYLE);
              }
              if (showKecamatanLabels) {
                l.bindTooltip(
                  `<span class="gis-label-kecamatan">${name.toUpperCase()}</span>`,
                  {
                    permanent: true,
                    direction: 'center',
                    className: 'transparent-gis-label',
                    interactive: false
                  }
                );
              }
              l.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 0">
                  <b style="color:#c0392b;font-size:13px;">🏛️ Kecamatan: ${name}</b>
                </div>
              `);
            }}
          />
        )}

        {/* 2. Layer Kelurahan dengan Dynamic Thematic Choropleth & Reverse Intelligence (Fase 1 & 2) */}
        {showKelurahan && layers.kelurahan?.length > 0 && (
          <ThematicKelurahanLayer
            key={`kel-layer-${showKelurahanLabels}`}
            data={layers.kelurahan}
            thematicMode={thematicMode}
            thematicOpacity={thematicOpacity}
            indicatorData={indicatorData}
            highlightWilayah={combinedWilayah}
            filterActive={filterActive}
            filteredWilayah={filteredWilayah}
            showKelurahanLabels={showKelurahanLabels}
            onTriggerChatPrompt={onTriggerChatPrompt}
          />
        )}

        {/* 3a. Layer Sentinel-2 Multi-Colored 10m Pixel Grid (Sub-Polygon Heterogeneity) */}
        {showSawah && showSentinelNdvi && sentinelGridFeatures.length > 0 && (
          <GeoJSONComp
            key={`sentinel-sub-grid-${sentinelGridFeatures.length}`}
            pane="sentinelPixelPane"
            data={sentinelGridFeatures as any}
            style={(feat: any) => ({
              fillColor: feat?.properties?.fillColor || '#16a34a',
              fillOpacity: 0.85,
              color: feat?.properties?.strokeColor || '#15803d',
              weight: 0.6,
              opacity: 0.8,
              pane: 'sentinelPixelPane',
            })}
            onEachFeature={(feat: any, layer: any) => {
              const sawahName = feat?.properties?.sawahName || 'Petak Sawah';
              const pixelType = feat?.properties?.pixelType || 'Kapasitas Lapang (Optimal)';
              const smVal = feat?.properties?.soilMoistureVal || '0.28 m³/m³';
              const status = feat?.properties?.status || 'Kondisi Prima';
              const interpretasi = feat?.properties?.interpretasi || 'Porositas tanah seimbang, air perakaran ideal untuk pertumbuhan padi.';
              layer.bindTooltip(
                `<div style="font-family:system-ui;font-size:11.5px;padding:6px 9px;background:#0f172a;color:#ffffff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1.5px solid #334155;max-width:270px;">
                  <div style="font-weight:900;color:#34d399;font-size:12px;border-bottom:1px solid #1e293b;padding-bottom:4px;margin-bottom:4px;">
                    🌾 ${sawahName}
                  </div>
                  <div style="font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:#94a3b8;">ECMWF ERA5 (0–28cm):</span>
                    <span style="color:${feat?.properties?.fillColor};font-family:monospace;font-size:12px;font-weight:900;">${smVal}</span>
                  </div>
                  <div style="font-size:10.5px;font-weight:700;color:#f8fafc;margin-top:2px;">
                    Status: <span style="color:${feat?.properties?.fillColor};">${pixelType}</span>
                  </div>
                  <div style="font-size:10px;color:#cbd5e1;margin-top:4px;line-height:1.35;border-top:1px dashed #334155;padding-top:4px;">
                    💡 <b>Arti Ilmiah:</b> ${interpretasi}
                  </div>
                </div>`,
                { sticky: true, direction: 'top', className: 'transparent-gis-label' }
              );
            }}
          />
        )}

        {/* 3b. Garis Batas Poligon Baku Sawah GIS Operator (Selalu di atas piksel sentinel) */}
        {showSawah && layers.sawah?.length > 0 && (
          <SawahLayer
            data={layers.sawah}
            showSawah={showSawah}
            showSentinelNdvi={showSentinelNdvi}
            pane="sawahBorderPane"
            fillOpacity={showSentinelNdvi ? 0 : 0.50}
            onEachFeature={(feat: any, l: L.Layer) => {
              try {
                (l as any).bringToFront?.();
              } catch {}
              const name = feat.properties?.name || feat.properties?.Name || 'Hamparan Sawah Cilegon';
              const rawLuasM2 = feat.properties?.luas_m2 ?? calculateGeometryAreaM2(feat.geometry);
              const rawLuasHa = (rawLuasM2 / 10000).toFixed(2);
              const sid = feat._id || Math.random().toString(36).substring(7);

              // Ambil koordinat titik tengah poligon
              let lat = -6.0271;
              let lng = 106.0712;
              try {
                if (feat.geometry?.type === 'Polygon' && feat.geometry.coordinates?.[0]?.[0]) {
                  lng = feat.geometry.coordinates[0][0][0];
                  lat = feat.geometry.coordinates[0][0][1];
                } else if (feat.geometry?.type === 'MultiPolygon' && feat.geometry.coordinates?.[0]?.[0]?.[0]) {
                  lng = feat.geometry.coordinates[0][0][0][0];
                  lat = feat.geometry.coordinates[0][0][0][1];
                }
              } catch {}

              const telemetry = evaluateSawahAgroTelemetry(name, { lat, lng }, rawLuasM2);
              const { pixelBreakdown } = telemetry;

              l.bindPopup(`
                <div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;padding:4px 0;min-width:280px;max-width:320px;color:#1e293b;">
                  
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:18px;">🌾</span>
                        <b style="color:#0f172a;font-size:14px;line-height:1.2;">${name}</b>
                      </div>
                      <div style="font-size:11px;color:#64748b;margin-top:3px;font-weight:600;">
                        Luas Area: <b style="color:#0f172a;">${rawLuasHa} Ha</b> (${pixelBreakdown.totalPixels10m} Kotak Mikro 10m)
                      </div>
                    </div>
                  </div>

                  <div style="margin-top:10px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px;">
                    <div style="font-size:10.5px;font-weight:900;color:#0284c7;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                      <span>🌱 Telemetri Lengas Tanah (10m)</span>
                      <span style="color:#059669;font-weight:900;background:#dcfce7;padding:2px 6px;border-radius:4px;">ECMWF Reanalisis</span>
                    </div>

                    <div style="width:100%;height:13px;border-radius:6px;overflow:hidden;display:flex;border:1.5px solid #cbd5e1;margin-bottom:8px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.1);">
                      <div style="width:${pixelBreakdown.persenOptimalHijau}%;background:#16a34a;" title="Optimal: ${pixelBreakdown.persenOptimalHijau}% (${pixelBreakdown.luasLebatHa} Ha)"></div>
                      <div style="width:${pixelBreakdown.persenSedangKuning}%;background:#eab308;" title="Sedang: ${pixelBreakdown.persenSedangKuning}% (${pixelBreakdown.luasBaruTanamHa} Ha)"></div>
                      <div style="width:${pixelBreakdown.persenDefisitMerah}%;background:#dc2626;" title="Defisit: ${pixelBreakdown.persenDefisitMerah}% (${pixelBreakdown.luasBeraHa} Ha)"></div>
                      <div style="width:${pixelBreakdown.persenJenuhBiru}%;background:#0284c7;" title="Jenuh: ${pixelBreakdown.persenJenuhBiru}% (${pixelBreakdown.luasAirHa} Ha)"></div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:10.5px;color:#334155;font-weight:700;">
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span style="width:9px;height:9px;background:#16a34a;border-radius:2px;display:inline-block;border:1px solid #15803d;"></span>
                        <span>Optimal: <b>${pixelBreakdown.persenOptimalHijau}%</b> (${pixelBreakdown.luasLebatHa} Ha)</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span style="width:9px;height:9px;background:#eab308;border-radius:2px;display:inline-block;border:1px solid #ca8a04;"></span>
                        <span>Sedang: <b>${pixelBreakdown.persenSedangKuning}%</b> (${pixelBreakdown.luasBaruTanamHa} Ha)</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span style="width:9px;height:9px;background:#dc2626;border-radius:2px;display:inline-block;border:1px solid #b91c1c;"></span>
                        <span>Defisit: <b>${pixelBreakdown.persenDefisitMerah}%</b> (${pixelBreakdown.luasBeraHa} Ha)</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span style="width:9px;height:9px;background:#0284c7;border-radius:2px;display:inline-block;border:1px solid #0369a1;"></span>
                        <span>Jenuh: <b>${pixelBreakdown.persenJenuhBiru}%</b> (${pixelBreakdown.luasAirHa} Ha)</span>
                      </div>
                    </div>
                  </div>

                  <div style="margin-top:8px;background:${telemetry.stressStatus === 'ALARM_KRITIS' ? '#fef2f2' : telemetry.stressStatus === 'WASPADA_RINGAN' ? '#fffbeb' : '#f0fdf4'};border:1.5px solid ${telemetry.statusColor}66;border-radius:10px;padding:8px 9px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                      <span style="font-size:11.5px;font-weight:900;color:${telemetry.statusColor};">${telemetry.statusLabel}</span>
                    </div>
                    <div style="font-size:11px;color:#334155;line-height:1.4;font-weight:600;">
                      Lengas Tanah: <b>${telemetry.avgSoilMoistureRootZone} m³/m³</b> • Evapotranspirasi: <b>${telemetry.evapotranspirationMmDay} mm/hari</b>
                    </div>
                    <div style="font-size:10.5px;color:#64748b;margin-top:4px;font-weight:500;line-height:1.3;">
                      💡 ${telemetry.rekomendasiAksi}
                    </div>
                  </div>

                  <button
                    id="btn-agri-${sid}"
                    type="button"
                    style="width:100%;margin-top:10px;background:linear-gradient(135deg, #047857, #065f46);color:#ffffff;border:none;border-radius:10px;padding:9px 12px;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 3px 6px rgba(0,0,0,0.18);"
                  >
                    <span>🌱</span> Analisis Agronomi Presisi AI
                  </button>
                </div>
              `);

              l.on('popupopen', () => {
                const btn = document.getElementById(`btn-agri-${sid}`);
                if (btn) {
                  btn.onclick = () => {
                    onTriggerChatPrompt?.(`Analisis agrometeorologi dan lengas tanah ECMWF untuk ${name} seluas ${rawLuasHa} Ha: Distribusi ${pixelBreakdown.persenOptimalHijau}% optimal (${pixelBreakdown.luasLebatHa} Ha), ${pixelBreakdown.persenSedangKuning}% sedang (${pixelBreakdown.luasBaruTanamHa} Ha), ${pixelBreakdown.persenDefisitMerah}% defisit, rata-rata kadar air ${telemetry.avgSoilMoistureRootZone} m³/m³ (Status: ${telemetry.stressStatus}). Berikan rekomendasi mitigasi irigasi dan manajemen air tersier.`);
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

        {/* 4b. Layer Pin Kamera Cerdas: Pasokan Beras */}
        {showKameraBeras && kameraBerasList.length > 0 && (
          <KameraObservasiPins
            data={kameraBerasList}
            mode="pasokan_beras"
            onTriggerChatPrompt={onTriggerChatPrompt}
          />
        )}

        {/* 4c. Layer Pin Kamera Cerdas: Pangan Lokal */}
        {showKameraPanganLokal && kameraPanganList.length > 0 && (
          <KameraObservasiPins
            data={kameraPanganList}
            mode="tanaman_pangan"
            onTriggerChatPrompt={onTriggerChatPrompt}
          />
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

      {/* Floating Top-Right Toolbar: Layer Filter */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
        {/* Layer Filter Panel Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLayersPanel((p) => !p);
            }}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl shadow-md hover:bg-white hover:border-slate-300 transition-all text-[11px] font-black tracking-wider cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>LAYER</span>
            {showLayersPanel ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showLayersPanel && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="absolute top-full right-0 mt-2 w-56 sm:w-64 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl p-3 text-[11px] flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto custom-scrollbar z-[600] animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                  Filter Layer GIS
                </span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-extrabold border border-emerald-200">
                  Serumpun Padi
                </span>
              </div>

              {/* Toggle Sawah Baku */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🌾</span> Sawah Baku ({layers.sawah?.length || 407})
                </span>
                <input
                  type="checkbox"
                  checked={showSawah}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setShowSawah(isChecked);
                    if (isChecked && showSentinelNdvi) {
                      setShowSentinelLegend(true);
                    }
                  }}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Sub-Toggle: Mode Telemetri Lengas Tanah & Agroklimat (10m) */}
              {showSawah && (
                <label className="flex items-center justify-between text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 font-black p-1.5 rounded-lg cursor-pointer transition-colors text-[10.5px] ml-2 my-0.5 shadow-xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>🌱</span> Telemetri Lengas Tanah (10m)
                  </span>
                  <input
                    type="checkbox"
                    checked={showSentinelNdvi}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setShowSentinelNdvi(isChecked);
                      if (isChecked) {
                        setShowSentinelLegend(true); // Munculkan kembali box legenda saat dicentang ulang
                      }
                    }}
                    className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer shrink-0 ml-1"
                  />
                </label>
              )}

              {/* Toggle Poktan / KWT */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">👨🌾</span> Poktan & KWT
                </span>
                <input
                  type="checkbox"
                  checked={showPoktan}
                  onChange={(e) => {
                    setShowPoktan(e.target.checked);
                    setShowKWT(e.target.checked);
                    setShowGapoktan(e.target.checked);
                  }}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Toggle Kolam Ikan */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🐟</span> Perikanan Budidaya
                </span>
                <input
                  type="checkbox"
                  checked={showKolam}
                  onChange={(e) => setShowKolam(e.target.checked)}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Toggle Nelayan Tangkap */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">⛵</span> Nelayan Tangkap
                </span>
                <input
                  type="checkbox"
                  checked={showNelayan}
                  onChange={(e) => setShowNelayan(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Toggle Horti & Palawija */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🌶️</span> Horti & Palawija
                </span>
                <input
                  type="checkbox"
                  checked={showHorti && showPalawija}
                  onChange={(e) => {
                    setShowHorti(e.target.checked);
                    setShowPalawija(e.target.checked);
                  }}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Section Header: Hasil Survei Kamera Cerdas */}
              <div className="border-t border-slate-100 pt-2 mt-0.5 flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                  <span>📸</span> Kamera Cerdas
                </span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-black border border-blue-200">
                  {kameraObservasiList.length} Titik
                </span>
              </div>

              {/* Toggle Kamera: Pemasok Beras */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🏪</span> Pemasok Beras ({kameraBerasList.length})
                </span>
                <input
                  type="checkbox"
                  checked={showKameraBeras}
                  onChange={(e) => setShowKameraBeras(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Toggle Kamera: Pangan Lokal */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🥔</span> Pangan Lokal / Sukun ({kameraPanganList.length})
                </span>
                <input
                  type="checkbox"
                  checked={showKameraPanganLokal}
                  onChange={(e) => setShowKameraPanganLokal(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Toggle Batas Wilayah */}
              <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-[13px]">🏛️</span> Batas Administrasi
                </span>
                <input
                  type="checkbox"
                  checked={showKecamatan && showKelurahan}
                  onChange={(e) => {
                    setShowKecamatan(e.target.checked);
                    setShowKelurahan(e.target.checked);
                  }}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0 ml-1"
                />
              </label>

              {/* Sub-toggles: Label Nama Kecamatan & Kelurahan */}
              <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 mt-1">
                <div className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider mb-0.5">
                  Label Teks Peta
                </div>

                {/* Toggle Label Nama Kecamatan (Besar) */}
                <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-white p-1 rounded-md cursor-pointer transition-colors text-[10.5px]">
                  <span className="flex items-center gap-1.5">
                    <span>🏷️</span> Kecamatan
                  </span>
                  <input
                    type="checkbox"
                    checked={showKecamatanLabels}
                    onChange={(e) => setShowKecamatanLabels(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-600 rounded cursor-pointer"
                  />
                </label>

                {/* Toggle Label Nama Kelurahan (Kecil) */}
                <label className="flex items-center justify-between text-slate-700 font-bold hover:bg-white p-1 rounded-md cursor-pointer transition-colors text-[10.5px]">
                  <span className="flex items-center gap-1.5">
                    <span>🏷️</span> Kelurahan
                  </span>
                  <input
                    type="checkbox"
                    checked={showKelurahanLabels}
                    onChange={(e) => setShowKelurahanLabels(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Overlay OSM switch */}
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10.5px] mt-1">
                <span className="font-bold text-slate-600">Overlay Jalan/Sungai</span>
                <button
                  type="button"
                  onClick={() => setShowOsm((p) => !p)}
                  className={`text-[9.5px] font-black px-2 py-0.5 rounded-md transition-colors ${
                    showOsm
                      ? 'bg-emerald-600 text-white shadow-xs'
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

      {/* Floating Lengas Tanah 10m Telemetry Indicator (Bottom-Left) - Transparan 60% */}
      {showSawah && showSentinelNdvi && showSentinelLegend && (
        <div className="absolute bottom-3 left-3 z-[500] bg-slate-950/60 text-white backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl p-3.5 max-w-[320px] animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>🌱</span> Lengas Tanah 10m
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded border border-emerald-500/30">
                ECMWF Realtime
              </span>
              <button
                onClick={() => setShowSentinelLegend(false)}
                className="w-5 h-5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Tutup Legenda Lengas Tanah"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-[10.5px] text-slate-200 mb-2 leading-relaxed">
            Interpretasi kadar lengas tanah perakaran ECMWF ERA5-Land (Kedalaman 0–28 cm):
          </div>

          {/* Color Matrix Legend */}
          <div className="flex flex-col gap-1.5 text-[10.5px] font-bold">
            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-700/40">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#16a34a] shrink-0 border border-white/20" />
              <div className="flex flex-col">
                <span className="text-emerald-400 font-extrabold">0.24 – 0.32 m³/m³ : Optimal</span>
                <span className="text-slate-200 text-[9.5px] font-normal">Kapasitas Lapang (Fotosintesis Prima)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-700/40">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#eab308] shrink-0 border border-white/20" />
              <div className="flex flex-col">
                <span className="text-yellow-400 font-extrabold">0.18 – 0.24 m³/m³ : Sedang</span>
                <span className="text-slate-200 text-[9.5px] font-normal">Mulai Deplesi (Perlu Suplesi Pintu Air)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-700/40">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#dc2626] shrink-0 border border-white/20" />
              <div className="flex flex-col">
                <span className="text-red-400 font-extrabold">&lt; 0.18 m³/m³ : Defisit Kritis</span>
                <span className="text-slate-200 text-[9.5px] font-normal">Titik Layu Permanen (Ancaman Puso/Kering)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-700/40">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#0284c7] shrink-0 border border-white/20" />
              <div className="flex flex-col">
                <span className="text-cyan-400 font-extrabold">&gt; 0.32 m³/m³ : Jenuh Air</span>
                <span className="text-slate-200 text-[9.5px] font-normal">Tergenang (Fase Olah Tanah / Tanam)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telemetri Status Agroklimat di Margin Bawah (Wraptext tanpa latar belakang) */}
      {showSawah && showSentinelNdvi && (
        <div className="absolute bottom-2.5 right-3 z-[450] pointer-events-none text-right select-none">
          <div className="text-[11px] font-black text-emerald-400 tracking-wide leading-[1.15] [text-shadow:0_1px_3px_rgba(0,0,0,0.98),0_0_5px_rgba(0,0,0,0.95),-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
            🌱 TELEMETRI AGROKLIMAT & LENGAS TANAH
          </div>
          <div className="text-[10px] font-bold text-white tracking-normal leading-[1.15] mt-[2px] [text-shadow:0_1px_3px_rgba(0,0,0,0.98),0_0_5px_rgba(0,0,0,0.95),-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
            Model: ECMWF ERA5-Land (Realtime)
          </div>
          <div className="text-[9.5px] font-semibold text-emerald-200 tracking-normal leading-[1.15] mt-[2px] [text-shadow:0_1px_3px_rgba(0,0,0,0.98),0_0_5px_rgba(0,0,0,0.95),-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
            Kedalaman Akar: 0–28 cm • Cilegon
          </div>
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
