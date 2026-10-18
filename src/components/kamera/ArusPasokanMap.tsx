"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Layer, PickingInfo } from '@deck.gl/core';
import {
  Activity, ChevronDown, ChevronUp, Compass, Eye, EyeOff, Filter, Info, Loader2, Mail,
  RefreshCw, RotateCcw, Store, Truck, X, AlertTriangle, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST } from '@/lib/kamera-normatif';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import {
  ASAL_NODES, CILEGON_HUB, FILTER_AWAL, bangunArus, formatTon, getEnumerator, jenisSumber,
  klasifikasiAsal, lebarBusur, titikBusur,
  type ArusFilter, type ArusFlow, type FilterArah, type FilterPeriode, type FilterSumber
} from '@/lib/arusPasokan';

// ------------------------------------------------------------------
// Konstanta visual
// ------------------------------------------------------------------
type RGBA = [number, number, number, number];
type RGB = [number, number, number];

const C_MASUK: RGB = [34, 227, 255]; // cyan neon — pasokan masuk (tervalidasi petugas)
const C_NETRAL: RGB = [150, 172, 192]; // abu kebiruan — belum tervalidasi
const C_SARANA: RGB = [255, 196, 64];
const C_HUB: RGB = [190, 255, 246];

const STYLE_DARK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [
    { id: 'latar', type: 'background', paint: { 'background-color': '#061325' } },
    { id: 'carto', type: 'raster', source: 'carto' },
  ],
};

const STYLE_SATELLITE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri, Maxar',
    },
    label: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri',
    },
  },
  layers: [
    { id: 'latar', type: 'background', paint: { 'background-color': '#04101f' } },
    { id: 'esri', type: 'raster', source: 'esri' },
    { id: 'label', type: 'raster', source: 'label' },
  ],
};

// ------------------------------------------------------------------
// Utilitas
// ------------------------------------------------------------------
const normKec = (s: string) => s.toLowerCase().replace(/^kecamatan\s+/, '').replace(/\s+/g, ' ').trim();
const pos3 = (p: [number, number]): [number, number, number] => [p[0], p[1], 0];

function pusatBbox(features: any[]): [number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c: any) => {
    if (typeof c?.[0] === 'number') {
      if (c[0] < minX) minX = c[0];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[1] > maxY) maxY = c[1];
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  features.forEach((f) => walk(f?.geometry?.coordinates));
  return Number.isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

function waktu(iso?: string): string {
  if (!iso) return 'Belum tersedia';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Belum tersedia' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface SaranaPoint { key: string; rec: ObservasiRecord; pos: [number, number] }

interface Ctx {
  flows: ArusFlow[];
  maxKg: number;
  hub: [number, number];
  sarana: SaranaPoint[];
  kecGeo: any | null;
  kecKg: Record<string, number>;
  kecKey: string;
  tampil: { sarana: boolean; label: boolean; anim: boolean; tigaD: boolean };
  flowTerpilih?: string;
  saranaTerpilih?: string;
}

// ------------------------------------------------------------------
// Pembangun layer deck.gl (murni; dipanggil ulang untuk animasi)
// ------------------------------------------------------------------
function buatLayers(c: Ctx, t: number): Layer[] {
  const L: Layer[] = [];
  const warna = (f: ArusFlow): RGB => (f.tervalidasi ? C_MASUK : C_NETRAL);
  const napas = c.tampil.anim ? 0.5 + 0.5 * Math.sin(t * 1.7) : 0.5; // 0..1

  // 1) Batas kecamatan Cilegon (KMZ) — ekstrusi 3D opsional berdasarkan estimasi pasokan
  if (c.kecGeo) {
    L.push(new GeoJsonLayer({
      id: 'kec',
      data: c.kecGeo,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: c.tampil.tigaD,
      getFillColor: (f: any): RGBA => ((c.kecKg[normKec(f?.properties?.name || '')] || 0) > 0 ? [24, 206, 170, 96] : [18, 120, 150, 56]),
      getLineColor: [110, 255, 230, 215],
      getLineWidth: 1.6,
      lineWidthUnits: 'pixels',
      getElevation: (f: any) => 250 + Math.min(3800, Math.sqrt(c.kecKg[normKec(f?.properties?.name || '')] || 0) * 55),
      material: { ambient: 0.55, diffuse: 0.65, shininess: 28 },
      autoHighlight: true,
      highlightColor: [255, 255, 255, 70],
      updateTriggers: { getFillColor: [c.kecKey], getElevation: [c.kecKey, c.tampil.tigaD] },
      transitions: { getElevation: 500 },
    }));
  }

  // 2) Titik sarana distribusi
  if (c.tampil.sarana && c.sarana.length) {
    L.push(new ScatterplotLayer<SaranaPoint>({
      id: 'sarana-glow',
      data: c.sarana,
      getPosition: (d) => pos3(d.pos),
      getRadius: 15,
      radiusUnits: 'pixels',
      getFillColor: [...C_SARANA, 160] as RGBA,
    }));
    L.push(new ScatterplotLayer<SaranaPoint>({
      id: 'sarana-core',
      data: c.sarana,
      pickable: true,
      getPosition: (d) => pos3(d.pos),
      getRadius: (d) => (d.key === c.saranaTerpilih ? 8 : 5),
      radiusUnits: 'pixels',
      getFillColor: [...C_SARANA, 255] as RGBA,
      getLineColor: [255, 255, 255, 230] as RGBA,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.2,
      updateTriggers: { getRadius: [c.saranaTerpilih] },
    }));
  }

  // 3) Busur arus pasokan — tiga lapis (halo luar, halo tengah, inti) + blending aditif = efek neon
  if (c.flows.length) {
    const arcBase = {
      data: c.flows,
      getSourcePosition: (d: ArusFlow) => pos3(d.sumber),
      getTargetPosition: (d: ArusFlow) => pos3(d.target),
      getHeight: (d: ArusFlow) => d.heightFactor,
      numSegments: 72,
      widthUnits: 'pixels' as const,
    };
    const sel = (d: ArusFlow) => (d.id === c.flowTerpilih ? 1.35 : 1);
    L.push(new ArcLayer<ArusFlow>({
      ...arcBase,
      id: 'arc-halo-luar',
      pickable: true,
      getWidth: (d) => lebarBusur(d.volumeKg, c.maxKg) * 5.5 * sel(d),
      getSourceColor: (d) => [...warna(d), 6] as RGBA,
      getTargetColor: (d) => [...warna(d), 40] as RGBA,
      opacity: 0.75 + 0.25 * napas,
      updateTriggers: { getWidth: [c.maxKg, c.flowTerpilih] },
    }));
    L.push(new ArcLayer<ArusFlow>({
      ...arcBase,
      id: 'arc-halo-tengah',
      getWidth: (d) => lebarBusur(d.volumeKg, c.maxKg) * 2.6 * sel(d),
      getSourceColor: (d) => [...warna(d), 70] as RGBA,
      getTargetColor: (d) => [...warna(d), 180] as RGBA,
      opacity: 0.8 + 0.2 * napas,
      updateTriggers: { getWidth: [c.maxKg, c.flowTerpilih] },
    }));
    L.push(new ArcLayer<ArusFlow>({
      ...arcBase,
      id: 'arc-inti',
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 110],
      getWidth: (d) => lebarBusur(d.volumeKg, c.maxKg) * 0.62 * sel(d),
      widthMinPixels: 1.5,
      getSourceColor: (d) => [...warna(d), 120] as RGBA,
      getTargetColor: (d) => [235, 255, 255, 255] as RGBA,
      updateTriggers: { getWidth: [c.maxKg, c.flowTerpilih] },
    }));

    // Denyut cahaya yang bergerak tepat di sepanjang busur (geometri identik dengan ArcLayer)
    if (c.tampil.anim) {
      interface Denyut { p: [number, number, number]; r: number; a: number }
      const dots: Denyut[] = [];
      c.flows.forEach((f, i) => {
        for (let k = 0; k < 3; k++) {
          const head = (((t * 0.11 + i * 0.173 + k / 3) % 1) + 1) % 1;
          for (let j = 0; j < 5; j++) {
            const tt = head - j * 0.014;
            if (tt <= 0) continue;
            dots.push({ p: titikBusur(f.sumber, f.target, tt, f.heightFactor), r: Math.max(1.4, 4.4 - j * 0.7), a: Math.round(255 * (1 - j / 5)) });
          }
        }
      });
      L.push(new ScatterplotLayer<Denyut>({
        id: 'denyut',
        data: dots,
        getPosition: (d) => d.p,
        getRadius: (d) => d.r,
        radiusUnits: 'pixels',
        getFillColor: (d) => [225, 255, 255, d.a] as RGBA,
      }));
    }

    // Simpul asal
    L.push(new ScatterplotLayer<ArusFlow>({
      id: 'asal-glow',
      data: c.flows,
      getPosition: (d) => pos3(d.sumber),
      getRadius: (d) => 11 + 9 * Math.sqrt(d.volumeKg / (c.maxKg || 1)),
      radiusUnits: 'pixels',
      getFillColor: (d) => [...warna(d), 140] as RGBA,
    }));
    L.push(new ScatterplotLayer<ArusFlow>({
      id: 'asal-inti',
      data: c.flows,
      pickable: true,
      getPosition: (d) => pos3(d.sumber),
      getRadius: (d) => 4 + 4 * Math.sqrt(d.volumeKg / (c.maxKg || 1)),
      radiusUnits: 'pixels',
      getFillColor: (d) => [...warna(d), 255] as RGBA,
      stroked: true,
      getLineColor: [255, 255, 255, 235] as RGBA,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.4,
    }));
  }

  // 4) Hub Kota Cilegon (marker khusus + cincin yang membesar)
  const cincin = [0, 1, 2].map((k) => ({ phase: c.tampil.anim ? (((t * 0.32 + k / 3) % 1) + 1) % 1 : 0.35 + k * 0.2 }));
  L.push(new ScatterplotLayer<{ phase: number }>({
    id: 'hub-cincin',
    data: cincin,
    getPosition: () => pos3(c.hub),
    getRadius: (d) => 14 + 38 * d.phase,
    radiusUnits: 'pixels',
    filled: false,
    stroked: true,
    getLineColor: (d) => [...C_HUB, Math.round(210 * (1 - d.phase))] as RGBA,
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    updateTriggers: { getRadius: [t], getLineColor: [t] },
  }));
  L.push(new ScatterplotLayer<{ k: number }>({
    id: 'hub-glow',
    data: [{ k: 0 }],
    getPosition: () => pos3(c.hub),
    getRadius: 22,
    radiusUnits: 'pixels',
    getFillColor: [...C_HUB, 130] as RGBA,
  }));
  L.push(new ScatterplotLayer<{ k: number }>({
    id: 'hub-inti',
    data: [{ k: 0 }],
    getPosition: () => pos3(c.hub),
    getRadius: 8,
    radiusUnits: 'pixels',
    getFillColor: [255, 255, 255, 255] as RGBA,
    stroked: true,
    getLineColor: [...C_MASUK, 255] as RGBA,
    getLineWidth: 3,
    lineWidthUnits: 'pixels',
  }));

  // 5) Label
  if (c.tampil.label) {
    interface Label { p: [number, number, number]; text: string; size: number; off: [number, number]; col: RGBA }
    const labels: Label[] = [
      { p: pos3(c.hub), text: 'KOTA CILEGON', size: 14, off: [0, -26], col: [255, 255, 255, 255] },
      ...c.flows.map((f): Label => ({
        p: pos3(f.sumber),
        text: `${f.asal.label} - ${formatTon(f.volumeKg)}`,
        size: 12,
        off: [0, -20],
        col: [...warna(f), 255] as RGBA,
      })),
    ];
    L.push(new TextLayer<Label>({
      id: 'label',
      data: labels,
      getPosition: (d) => d.p,
      getText: (d) => d.text,
      getSize: (d) => d.size,
      getColor: (d) => d.col,
      getPixelOffset: (d) => d.off,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 800,
      fontSettings: { sdf: true },
      outlineWidth: 4,
      outlineColor: [4, 16, 31, 240],
      characterSet: 'auto',
      billboard: true,
    }));
  }

  return L;
}

// ------------------------------------------------------------------
// Komponen UI
// ------------------------------------------------------------------
type Terpilih =
  | { tipe: 'flow'; id: string }
  | { tipe: 'sarana'; key: string }
  | { tipe: 'kecamatan'; nama: string }
  | null;

interface ArusPasokanMapProps {
  observasiList: ObservasiRecord[];
  loaded?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const glass = 'bg-[#071a2e]/80 backdrop-blur-xl border border-cyan-300/15 shadow-[0_10px_40px_rgba(0,0,0,0.45)]';
const selectCls = 'w-full bg-[#0c2640] border border-cyan-300/20 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-cyan-50 focus:outline-none focus:border-cyan-300';

export default function ArusPasokanMap({ observasiList = [], loaded = true, error = null, onRefresh }: ArusPasokanMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const fitKeyRef = useRef<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter & tampilan
  const [filter, setFilter] = useState<ArusFilter>(FILTER_AWAL);
  const [basemapMode, setBasemapMode] = useState<'dark' | 'satellite'>('dark');
  const [tampilSarana, setTampilSarana] = useState(true);
  const [tampilLabel, setTampilLabel] = useState(true);
  const [tampilAnim, setTampilAnim] = useState(true);
  const [tampilTigaD, setTampilTigaD] = useState(true);
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const [kpiTerbuka, setKpiTerbuka] = useState(true);
  const [legendaTerbuka, setLegendaTerbuka] = useState(true);
  const [terpilih, setTerpilih] = useState<Terpilih>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; teks: string } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(basemapMode === 'dark' ? STYLE_DARK : STYLE_SATELLITE);
  }, [basemapMode]);

  // Default responsif: panel dilipat di layar kecil; animasi mati bila perangkat lemah / reduce-motion
  useEffect(() => {
    const kecil = window.matchMedia('(max-width: 640px)').matches;
    if (kecil) {
      setKpiTerbuka(false);
      setLegendaTerbuka(false);
    }
    const hemat = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency || 4) <= 2;
    if (hemat) setTampilAnim(false);
  }, []);

  // Batas wilayah dari KMZ Supabase (hook yang sama dengan peta GIS lain)
  const { layers: kmz, loading: kmzLoading, error: kmzError, loadFromURL } = useKMZLoader();
  useEffect(() => {
    loadFromURL();
  }, [loadFromURL]);

  const kecGeo = useMemo(() => (kmz.kecamatan.length ? { type: 'FeatureCollection', features: kmz.kecamatan } : null), [kmz.kecamatan]);
  const hub = useMemo<[number, number]>(() => (kmz.kecamatan.length ? pusatBbox(kmz.kecamatan) || CILEGON_HUB : CILEGON_HUB), [kmz.kecamatan]);

  // Agregasi arus dari data Kamera Cerdas (sumber sama dengan panel Agregasi)
  const hasil = useMemo(() => bangunArus(observasiList, filter, hub), [observasiList, filter, hub]);
  const semuaPasokan = useMemo(() => observasiList.filter((r) => r.mode === 'pasokan_beras').length, [observasiList]);
  const maxKg = useMemo(() => hasil.flows.reduce((m, f) => Math.max(m, f.volumeKg), 0), [hasil.flows]);

  const sarana = useMemo<SaranaPoint[]>(
    () =>
      hasil.records
        .map((rec, i) => ({ key: rec.id || `s-${i}`, rec, pos: [Number(rec.longitude), Number(rec.latitude)] as [number, number] }))
        .filter((s) => Number.isFinite(s.pos[0]) && Number.isFinite(s.pos[1]) && s.pos[0] !== 0 && s.pos[1] !== 0),
    [hasil.records]
  );

  const kecKg = useMemo(() => {
    const m: Record<string, number> = {};
    Object.entries(hasil.kpi.perKecamatanKg).forEach(([k, v]) => { m[normKec(k)] = v; });
    return m;
  }, [hasil.kpi.perKecamatanKg]);
  const kecKey = useMemo(() => JSON.stringify(kecKg), [kecKg]);

  const flowTerpilih = terpilih?.tipe === 'flow' ? terpilih.id : undefined;
  const saranaTerpilih = terpilih?.tipe === 'sarana' ? terpilih.key : undefined;

  const ctx = useMemo<Ctx>(() => ({
    flows: hasil.flows,
    maxKg,
    hub,
    sarana,
    kecGeo,
    kecKg,
    kecKey,
    tampil: { sarana: tampilSarana, label: tampilLabel, anim: tampilAnim, tigaD: tampilTigaD },
    flowTerpilih,
    saranaTerpilih,
  }), [hasil.flows, maxKg, hub, sarana, kecGeo, kecKg, kecKey, tampilSarana, tampilLabel, tampilAnim, tampilTigaD, flowTerpilih, saranaTerpilih]);

  const gambar = useCallback((t: number) => {
    if (overlayRef.current && ctxRef.current) overlayRef.current.setProps({ layers: buatLayers(ctxRef.current, t) });
  }, []);

  // Sinkronkan konteks → render statis bila animasi mati
  useEffect(() => {
    ctxRef.current = ctx;
    if (mapReady) gambar(performance.now() / 1000);
  }, [ctx, mapReady, gambar]);

  // Loop animasi (~30 fps, hanya saat animasi aktif & tab terlihat)
  useEffect(() => {
    if (!mapReady || !tampilAnim) return;
    let raf = 0;
    let last = 0;
    const loop = (ms: number) => {
      if (!document.hidden && ms - last > 33) {
        last = ms;
        gambar(ms / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mapReady, tampilAnim, gambar]);

  // Handler interaksi (ref agar overlay tidak perlu dibuat ulang)
  const handlerRef = useRef<{ klik: (i: PickingInfo) => void; hover: (i: PickingInfo) => void }>({ klik: () => {}, hover: () => {} });
  handlerRef.current = {
    klik: (info) => {
      const id = info.layer?.id;
      const o: any = info.object;
      if (!o) { setTerpilih(null); return; }
      if (id === 'arc-halo-luar' || id === 'arc-inti' || id === 'asal-inti') setTerpilih({ tipe: 'flow', id: o.id });
      else if (id === 'sarana-core') setTerpilih({ tipe: 'sarana', key: o.key });
      else if (id === 'kec') setTerpilih({ tipe: 'kecamatan', nama: o.properties?.name || '' });
    },
    hover: (info) => {
      const id = info.layer?.id;
      const o: any = info.object;
      if (!o) { setTooltip(null); return; }
      let teks = '';
      if (id === 'arc-halo-luar' || id === 'arc-inti' || id === 'asal-inti') teks = `${o.asal.label} → Kota Cilegon • ${formatTon(o.volumeKg)}`;
      else if (id === 'sarana-core') teks = `${o.rec.nama_lokasi || o.rec.kategori_label || 'Sarana'} • ${o.rec.kelurahan}`;
      else if (id === 'kec') teks = `Kec. ${o.properties?.name || ''} • ${formatTon(kecKg[normKec(o.properties?.name || '')] ?? 0)}`;
      setTooltip(teks ? { x: info.x, y: info.y, teks } : null);
    },
  };

  const fitKamera = useCallback(() => {
    const map = mapRef.current;
    const c = ctxRef.current;
    if (!map || !c) return;
    const kecil = window.innerWidth <= 640;
    const pad = kecil ? { top: 120, bottom: 150, left: 24, right: 24 } : { top: 90, bottom: 90, left: 380, right: 60 };
    if (c.flows.length) {
      const b = new maplibregl.LngLatBounds(c.hub, c.hub);
      c.flows.forEach((f) => b.extend(f.sumber));
      map.fitBounds(b, { padding: pad, pitch: 55, bearing: -14, duration: 1400, maxZoom: 10.5 });
    } else {
      map.flyTo({ center: c.hub, zoom: kecil ? 9.6 : 10.4, pitch: 55, bearing: -14, duration: 1400 });
    }
  }, []);

  // Inisialisasi peta sekali
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_DARK,
        center: CILEGON_HUB,
        zoom: 9.6,
        pitch: 55,
        bearing: -14,
        maxPitch: 80,
        maxZoom: 16,
        attributionControl: false,
      });
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Perangkat tidak mendukung WebGL.');
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    try {
      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: [],
        pickingRadius: 8,
        getCursor: ({ isHovering, isDragging }: { isHovering: boolean; isDragging: boolean }) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'),
        onClick: (info: PickingInfo) => handlerRef.current.klik(info),
        onHover: (info: PickingInfo) => handlerRef.current.hover(info),
      });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    } catch (overlayErr) {
      console.warn('[ArusPasokan] Overlay warning:', overlayErr);
    }

    const onReady = () => {
      setMapReady(true);
      setTimeout(() => map.resize(), 60);
      setTimeout(() => map.resize(), 300);
      setTimeout(() => map.resize(), 800);
    };

    if (map.isStyleLoaded()) {
      onReady();
    } else {
      map.once('load', onReady);
      map.once('styledata', () => {
        onReady();
      });
    }

    map.on('error', (e) => {
      console.warn('[ArusPasokan] map warning:', e?.error?.message || e);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current as unknown as maplibregl.IControl);
          overlayRef.current.finalize();
        } catch { /* sudah dibersihkan */ }
        overlayRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Fit kamera saat himpunan busur berubah (mis. filter diubah) atau pertama kali data siap
  const fitKey = useMemo(() => `${hasil.flows.map((f) => f.id).join(',')}|${hub.join(',')}`, [hasil.flows, hub]);
  useEffect(() => {
    if (!mapReady || !loaded) return;
    if (fitKeyRef.current === fitKey) return;
    fitKeyRef.current = fitKey;
    fitKamera();
  }, [mapReady, loaded, fitKey, fitKamera]);

  // Bersihkan pilihan bila objek tidak lagi ada di hasil filter
  useEffect(() => {
    if (terpilih?.tipe === 'flow' && !hasil.flows.some((f) => f.id === terpilih.id)) setTerpilih(null);
    if (terpilih?.tipe === 'sarana' && !sarana.some((s) => s.key === terpilih.key)) setTerpilih(null);
  }, [hasil.flows, sarana, terpilih]);

  const ubahFilter = (p: Partial<ArusFilter>) => setFilter((f) => ({ ...f, ...p }));
  const filterAktif = JSON.stringify(filter) !== JSON.stringify(FILTER_AWAL);
  const { kpi } = hasil;

  const flowDetail = terpilih?.tipe === 'flow' ? hasil.flows.find((f) => f.id === terpilih.id) : undefined;
  const saranaDetail = terpilih?.tipe === 'sarana' ? sarana.find((s) => s.key === terpilih.key)?.rec : undefined;

  const kosongKarenaFilter = loaded && !error && hasil.records.length === 0;
  const tanpaAsalGeografis = loaded && !error && hasil.records.length > 0 && hasil.flows.length === 0 && filter.arah !== 'keluar';

  // ----------------------------------------------------------------
  return (
    <div id="arus-pasokan-panel" className="relative w-full h-full min-h-[420px] overflow-hidden bg-[#04101f] text-cyan-50 select-none">
      <div ref={containerRef} className="absolute inset-0" aria-label="Peta 3D arus pasokan dan distribusi beras Kota Cilegon" />

      {/* ── Kiri atas: judul + KPI ── */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-[340px] z-10 pointer-events-none">
        <div className={`${glass} rounded-2xl pointer-events-auto overflow-hidden`}>
          <button
            type="button"
            onClick={() => setKpiTerbuka((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer"
            aria-expanded={kpiTerbuka}
          >
            <span className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-[#04101f] shadow-[0_0_18px_rgba(34,227,255,0.55)]">
              <Truck className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <h2 className="text-[12px] font-black tracking-wide text-white leading-tight">Peta Arus Pasokan &amp; Distribusi Beras</h2>
              <span className="block text-[10px] text-cyan-200/80 font-semibold truncate">
                {loaded ? `${formatTon(kpi.totalKg)} • ${kpi.totalSarana} sarana • ${kpi.wilayahPemasok} wilayah pemasok` : 'Memuat data...'}
              </span>
            </span>
            {kpiTerbuka ? <ChevronUp className="w-4 h-4 text-cyan-200" /> : <ChevronDown className="w-4 h-4 text-cyan-200" />}
          </button>

          {kpiTerbuka && (
            <div className="px-3 pb-3 space-y-2.5 border-t border-cyan-300/10 pt-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Kpi label="Sarana Distribusi Terdata" nilai={loaded ? `${kpi.totalSarana}` : null} satuan="titik" aksen="text-amber-300" />
                <Kpi label="Estimasi Pasokan Tercatat" nilai={loaded && kpi.totalSarana > 0 ? formatTon(kpi.totalKg) : null} aksen="text-cyan-200" />
                <Kpi label="Arus Masuk Tervalidasi Petugas" nilai={kpi.masukTervalidasiKg === null ? null : formatTon(kpi.masukTervalidasiKg)} aksen="text-emerald-300" />
                <Kpi label="Arus Keluar Terverifikasi" nilai={null} aksen="text-orange-300" catatan="Data tujuan keluar belum dicatat" />
                <Kpi
                  label="Lokal : Luar Cilegon"
                  nilai={kpi.persenLokal === null ? null : `${kpi.persenLokal}% : ${kpi.persenLuar}%`}
                  aksen="text-white"
                />
                <Kpi label="Wilayah Pemasok Teridentifikasi" nilai={loaded && kpi.totalSarana > 0 ? `${kpi.wilayahPemasok}` : null} satuan="wilayah" aksen="text-white" />
                <Kpi label="Komoditas Terbesar" nilai={kpi.komoditasTerbesar} aksen="text-white" />
                <Kpi label="Pembaruan Terakhir" nilai={kpi.pembaruanTerakhir ? waktu(kpi.pembaruanTerakhir) : null} aksen="text-white" kecil />
              </div>
              {kpi.takTeridentifikasiKg > 0 && (
                <div className="flex items-start gap-2 text-[10px] text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
                  <span>
                    <b className="text-white">Asal belum teridentifikasi:</b> {formatTon(kpi.takTeridentifikasiKg)} (Bulog / tidak diketahui / campuran) — tidak digambar sebagai busur.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kanan atas: kontrol ── */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setFilterTerbuka((v) => !v)}
            className={`${glass} h-9 px-3 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer ${filterAktif ? 'text-amber-200 border-amber-300/50' : 'text-cyan-100'}`}
            aria-expanded={filterTerbuka}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter{filterAktif ? ' •' : ''}</span>
          </button>
          <button type="button" onClick={fitKamera} title="Reset tampilan kamera" aria-label="Reset tampilan kamera" className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 cursor-pointer`}>
            <Compass className="w-4 h-4" />
          </button>
          {onRefresh && (
            <button type="button" onClick={onRefresh} title="Muat ulang data" aria-label="Muat ulang data" className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 cursor-pointer`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`${glass} rounded-xl p-1.5 pointer-events-auto flex items-center gap-1`}>
          <Toggle aktif={basemapMode === 'satellite'} onClick={() => setBasemapMode((m) => (m === 'dark' ? 'satellite' : 'dark'))} label={basemapMode === 'satellite' ? 'Satelit' : 'Dark'} ikon={<span className="text-[10px] font-black leading-none">{basemapMode === 'satellite' ? '🛰️' : '🌙'}</span>} />
          <Toggle aktif={tampilSarana} onClick={() => setTampilSarana((v) => !v)} label="Titik sarana" ikon={<Store className="w-3.5 h-3.5" />} />
          <Toggle aktif={tampilLabel} onClick={() => setTampilLabel((v) => !v)} label="Label" ikon={tampilLabel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} />
          <Toggle aktif={tampilAnim} onClick={() => setTampilAnim((v) => !v)} label="Animasi" ikon={<Activity className="w-3.5 h-3.5" />} />
          <Toggle aktif={tampilTigaD} onClick={() => setTampilTigaD((v) => !v)} label="Layer 3D" ikon={<span className="text-[10px] font-black leading-none">3D</span>} />
        </div>
      </div>

      {/* ── Panel Filter ── */}
      {filterTerbuka && (
        <div className={`${glass} absolute z-20 rounded-2xl p-3.5 space-y-3 bottom-0 inset-x-0 rounded-b-none sm:rounded-b-2xl sm:bottom-auto sm:inset-x-auto sm:top-[104px] sm:right-3 sm:w-[300px] max-h-[70%] overflow-y-auto`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-black text-white flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-cyan-300" /> Filter Arus</h3>
            <button type="button" onClick={() => setFilterTerbuka(false)} aria-label="Tutup filter" className="p-1 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          <Field label="Komoditas">
            <div className="text-[11px] font-bold text-cyan-50 bg-[#0c2640] border border-cyan-300/20 rounded-lg px-2.5 py-1.5">Beras <span className="text-slate-400 font-medium">(satu-satunya komoditas yang tercatat)</span></div>
          </Field>

          <Field label="Arah Arus">
            <div className="grid grid-cols-3 gap-1">
              {([['semua', 'Semua'], ['masuk', 'Masuk'], ['keluar', 'Keluar']] as [FilterArah, string][]).map(([v, l]) => (
                <button key={v} type="button" onClick={() => ubahFilter({ arah: v })} className={`py-1.5 rounded-lg text-[11px] font-black border cursor-pointer ${filter.arah === v ? 'bg-cyan-400 text-[#04101f] border-cyan-200' : 'bg-[#0c2640] text-cyan-100 border-cyan-300/20 hover:border-cyan-300/60'}`}>{l}</button>
              ))}
            </div>
          </Field>

          <Field label="Periode Pencatatan">
            <select className={selectCls} value={filter.periode} onChange={(e) => ubahFilter({ periode: e.target.value as FilterPeriode })}>
              <option value="semua">Semua waktu</option>
              <option value="7">7 hari terakhir</option>
              <option value="30">30 hari terakhir</option>
              <option value="90">90 hari terakhir</option>
            </select>
          </Field>

          <Field label="Sumber Data">
            <select className={selectCls} value={filter.sumber} onChange={(e) => ubahFilter({ sumber: e.target.value as FilterSumber })}>
              <option value="semua">Seluruh data Kamera Cerdas</option>
              <option value="petugas">Dicatat petugas DKPP</option>
              <option value="enumerator">Dicatat enumerator (Gmail)</option>
            </select>
          </Field>

          <Field label="Kecamatan Sarana">
            <select className={selectCls} value={filter.kecamatan} onChange={(e) => ubahFilter({ kecamatan: e.target.value })}>
              <option value="semua">Semua kecamatan</option>
              {Object.keys(WILAYAH).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>

          <Field label="Wilayah Asal Pasokan">
            <select className={selectCls} value={filter.asal} onChange={(e) => ubahFilter({ asal: e.target.value })}>
              <option value="semua">Semua asal</option>
              {ASAL_NODES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </Field>

          <button type="button" onClick={() => setFilter(FILTER_AWAL)} disabled={!filterAktif} className="w-full py-2 rounded-lg text-[11px] font-black bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Atur Ulang Filter
          </button>
        </div>
      )}

      {/* ── Legenda ── */}
      <div className="absolute bottom-3 left-3 z-10 max-w-[260px]">
        {legendaTerbuka ? (
          <div className={`${glass} rounded-2xl p-3 space-y-2`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-white">Legenda</h3>
              <button type="button" onClick={() => setLegendaTerbuka(false)} aria-label="Tutup legenda" className="p-0.5 rounded hover:bg-white/10 text-slate-300 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
            <Legenda warna="rgb(34,227,255)" glow>Pasokan masuk ke Cilegon (tervalidasi petugas)</Legenda>
            <Legenda warna="rgb(150,172,192)">Pasokan masuk — belum divalidasi petugas</Legenda>
            <Legenda warna="rgb(255,128,44)" putus>Distribusi keluar Cilegon — belum tersedia</Legenda>
            <Legenda warna="rgb(255,196,64)" titik>Sarana distribusi (titik observasi)</Legenda>
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              <span className="flex items-end gap-0.5"><i className="block w-3 h-[2px] bg-cyan-300" /><i className="block w-3 h-[5px] bg-cyan-300" /><i className="block w-3 h-[9px] bg-cyan-300 rounded-sm" /></span>
              Tebal garis ∝ √ tonase
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400 border-t border-white/10 pt-1.5">
              Tonase = <b>estimasi pasokan/stok</b> pada sarana distribusi. Titik asal adalah titik representatif wilayah, bukan lokasi pengiriman presisi.
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => setLegendaTerbuka(true)} className={`${glass} h-9 px-3 rounded-xl text-[11px] font-black text-cyan-100 flex items-center gap-1.5 cursor-pointer`}>
            <Info className="w-3.5 h-3.5" /> Legenda
          </button>
        )}
      </div>

      {/* ── Panel Detail ── */}
      {terpilih && (flowDetail || saranaDetail || terpilih.tipe === 'kecamatan') && (
        <div className={`${glass} absolute z-20 bottom-0 inset-x-0 rounded-t-2xl max-h-[48%] sm:max-h-none sm:rounded-2xl sm:bottom-auto sm:inset-x-auto sm:top-[160px] sm:right-3 sm:w-[320px] sm:max-h-[calc(100%-250px)] overflow-y-auto p-4 space-y-3`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {flowDetail && (
                <>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cyan-300"><ArrowDownToLine className="w-3 h-3" /> Arus Masuk</span>
                  <h3 className="text-sm font-black text-white leading-tight">{flowDetail.asal.label} → Kota Cilegon</h3>
                </>
              )}
              {saranaDetail && (
                <>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">Sarana Distribusi</span>
                  <h3 className="text-sm font-black text-white leading-tight">{saranaDetail.nama_lokasi || saranaDetail.kategori_label || 'Titik Observasi'}</h3>
                </>
              )}
              {terpilih.tipe === 'kecamatan' && (
                <>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Kecamatan</span>
                  <h3 className="text-sm font-black text-white leading-tight">Kecamatan {terpilih.nama}</h3>
                </>
              )}
            </div>
            <button type="button" onClick={() => setTerpilih(null)} aria-label="Tutup detail" className="p-1 rounded-lg hover:bg-white/10 text-slate-300 shrink-0 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          {flowDetail && <DetailFlow f={flowDetail} />}
          {saranaDetail && <DetailSarana r={saranaDetail} />}
          {terpilih.tipe === 'kecamatan' && (
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Estimasi Pasokan" nilai={kecKg[normKec(terpilih.nama)] !== undefined ? formatTon(kecKg[normKec(terpilih.nama)]) : 'Belum tersedia'} aksen="text-cyan-200" />
              <Kpi label="Sarana Terdata" nilai={`${hasil.records.filter((r) => normKec(r.kecamatan) === normKec(terpilih.nama)).length}`} satuan="titik" aksen="text-amber-300" />
            </div>
          )}
        </div>
      )}

      {/* ── Tooltip (hover desktop) ── */}
      {tooltip && (
        <div className="absolute z-30 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#04101f]/95 border border-cyan-300/30 text-[11px] font-bold text-cyan-50 shadow-lg" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          {tooltip.teks}
        </div>
      )}

      {/* ── Status: memuat / galat / kosong ── */}
      {(!loaded || kmzLoading) && !mapError && (
        <div className={`${glass} absolute top-[76px] left-3 z-10 rounded-xl px-3 py-1.5 text-[10px] font-bold flex items-center gap-2 text-cyan-100`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {!loaded ? 'Memuat data observasi...' : 'Memuat batas wilayah (KMZ)...'}
        </div>
      )}

      {kmzError && (
        <div className="absolute top-[76px] left-3 z-10 rounded-xl px-3 py-1.5 text-[10px] font-bold bg-amber-500/15 border border-amber-300/40 text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> Batas wilayah KMZ gagal dimuat — peta tetap berfungsi tanpa poligon kecamatan.
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#04101f]">
          <div className={`${glass} max-w-sm rounded-2xl p-5 text-center space-y-2`}>
            <AlertTriangle className="w-7 h-7 text-amber-300 mx-auto" />
            <h3 className="text-sm font-black text-white">Peta 3D tidak dapat ditampilkan</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">Perangkat/peramban ini tidak mendukung WebGL. Gunakan tab <b>Agregasi</b> untuk melihat data pasokan dalam bentuk tabel.</p>
            <p className="text-[10px] text-slate-500 break-words">{mapError}</p>
          </div>
        </div>
      )}

      {error && (
        <div className={`${glass} absolute bottom-16 left-1/2 -translate-x-1/2 z-10 max-w-[92%] rounded-xl px-4 py-2.5 text-[11px] font-bold text-rose-200 border-rose-300/40 flex items-center gap-2`}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          {onRefresh && <button type="button" onClick={onRefresh} className="ml-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer">Coba lagi</button>}
        </div>
      )}

      {kosongKarenaFilter && (
        <div className={`${glass} absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92%] rounded-2xl px-4 py-3 text-center space-y-1.5`}>
          <p className="text-[12px] font-black text-white">
            {semuaPasokan === 0 ? 'Belum ada data pasokan beras dari Kamera Cerdas' : 'Tidak ada data yang memenuhi filter'}
          </p>
          <p className="text-[10px] text-slate-300">
            {semuaPasokan === 0 ? 'Kirim foto sarana distribusi beras pada tab Ambil Foto untuk mulai memetakan arus pasokan.' : 'Ubah atau atur ulang filter untuk melihat data.'}
          </p>
          {filterAktif && <button type="button" onClick={() => setFilter(FILTER_AWAL)} className="px-3 py-1 rounded-lg text-[11px] font-black bg-cyan-400 text-[#04101f] cursor-pointer">Atur Ulang Filter</button>}
        </div>
      )}

      {tanpaAsalGeografis && (
        <div className={`${glass} absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92%] rounded-2xl px-4 py-3 text-center space-y-1`}>
          <p className="text-[12px] font-black text-white">Belum ada asal pasokan yang dapat dipetakan</p>
          <p className="text-[10px] text-slate-300">Seluruh data terfilter berasal dari pasokan lokal atau asal belum teridentifikasi, sehingga tidak ada busur yang digambar.</p>
        </div>
      )}

      {loaded && !error && filter.arah === 'keluar' && (
        <div className={`${glass} absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92%] rounded-2xl px-4 py-3 text-center space-y-1`}>
          <p className="text-[12px] font-black text-orange-200 flex items-center justify-center gap-1.5"><ArrowUpFromLine className="w-3.5 h-3.5" /> Distribusi keluar Cilegon belum tersedia</p>
          <p className="text-[10px] text-slate-300">Kamera Cerdas saat ini hanya mencatat asal pasokan masuk; tujuan pengiriman keluar belum dicatat sehingga tidak ditampilkan.</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Sub-komponen
// ------------------------------------------------------------------
function Kpi({ label, nilai, satuan, aksen, kecil, catatan }: { label: string; nilai: string | null; satuan?: string; aksen: string; kecil?: boolean; catatan?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-tight">{label}</div>
      {nilai === null ? (
        <div className="text-[11px] font-black text-slate-500 mt-0.5">Belum tersedia</div>
      ) : (
        <div className={`${kecil ? 'text-[10.5px]' : 'text-[15px]'} font-black ${aksen} mt-0.5 leading-tight break-words`}>
          {nilai} {satuan && <span className="text-[9px] font-semibold text-slate-400">{satuan}</span>}
        </div>
      )}
      {catatan && nilai === null && <div className="text-[8.5px] text-slate-500 leading-tight mt-0.5">{catatan}</div>}
    </div>
  );
}

function Toggle({ aktif, onClick, label, ikon }: { aktif: boolean; onClick: () => void; label: string; ikon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      title={label}
      className={`h-8 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-colors cursor-pointer ${aktif ? 'bg-cyan-400/20 border-cyan-300/60 text-cyan-100' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
    >
      {ikon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Legenda({ warna, children, glow, putus, titik }: { warna: string; children: React.ReactNode; glow?: boolean; putus?: boolean; titik?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-200 leading-tight">
      {titik ? (
        <span className="w-3 h-3 shrink-0 rounded-full border border-white/80" style={{ background: warna, boxShadow: `0 0 8px ${warna}` }} />
      ) : (
        <span
          className="w-6 h-[3px] shrink-0 rounded-full"
          style={{
            background: putus ? `repeating-linear-gradient(90deg, ${warna} 0 4px, transparent 4px 7px)` : warna,
            boxShadow: glow ? `0 0 8px 1px ${warna}` : undefined,
          }}
        />
      )}
      <span>{children}</span>
    </div>
  );
}

function Baris({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[11px]">
      <span className="text-slate-400 shrink-0">{k}</span>
      <span className="text-white font-bold text-right min-w-0 break-words">{v}</span>
    </div>
  );
}

function DetailFlow({ f }: { f: ArusFlow }) {
  const maxKec = f.perKecamatan[0]?.kg || 1;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Estimasi Pasokan" nilai={formatTon(f.volumeKg)} aksen="text-cyan-200" />
        <Kpi label="Sarana Terlibat" nilai={`${f.jumlahSarana}`} satuan="titik" aksen="text-amber-300" />
      </div>
      <div className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
        <Baris k="Komoditas" v="Beras" />
        <Baris k="Asal" v={f.asal.label} />
        <Baris k="Tujuan" v="Kota Cilegon" />
        <Baris k="Jarak garis lurus" v={`± ${Math.round(f.jarakKm)} km`} />
        <Baris k="Pencatatan terakhir" v={waktu(f.terakhir)} />
        <Baris
          k="Status verifikasi"
          v={
            f.tervalidasi
              ? <span className="text-emerald-300">Tervalidasi petugas ({f.jumlahPetugas})</span>
              : <span className="text-slate-300">Belum divalidasi petugas</span>
          }
        />
        {f.jumlahEnumerator > 0 && <Baris k="Dicatat enumerator" v={`${f.jumlahEnumerator} data`} />}
        <Baris k="Sumber pencatatan" v="Kamera Cerdas (AI Vision + konfirmasi)" />
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sebaran kecamatan sarana</div>
        {f.perKecamatan.slice(0, 5).map((k) => (
          <div key={k.kecamatan} className="space-y-0.5">
            <div className="flex justify-between text-[10.5px]"><span className="text-slate-200 font-semibold">{k.kecamatan}</span><span className="text-cyan-200 font-black">{formatTon(k.kg)}</span></div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-300" style={{ width: `${Math.max(6, (k.kg / maxKec) * 100)}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Pengirim data</div>
        {f.kontributor.slice(0, 4).map((k) => (
          <div key={k.email || k.nama} className="flex items-center justify-between gap-2 text-[10.5px] bg-white/5 rounded-lg px-2 py-1">
            <div className="min-w-0">
              <div className="text-white font-bold truncate">{k.nama}</div>
              <div className="text-slate-400 truncate">{k.email || 'Gmail tidak tercatat'}</div>
            </div>
            <span className="text-cyan-200 font-black shrink-0">{k.jumlah}×</span>
          </div>
        ))}
      </div>

      <p className="text-[9.5px] leading-snug text-slate-400 bg-amber-400/5 border border-amber-300/20 rounded-lg p-2">
        <b className="text-amber-200">Catatan metode:</b> {f.asal.metode}. Nilai adalah <b>estimasi stok/pasokan</b> yang tercatat pada sarana distribusi — bukan bukti transaksi pengiriman.
      </p>
    </div>
  );
}

function DetailSarana({ r }: { r: ObservasiRecord }) {
  const en = getEnumerator(r);
  const asal = klasifikasiAsal(r.asal_pasokan);
  const sarana = SARANA_DISTRIBUSI_LIST.find((s) => s.id === r.kategori);
  const sumber = jenisSumber(r);
  const fotoOk = typeof r.foto_url === 'string' && (r.foto_url.startsWith('data:image') || r.foto_url.startsWith('http'));
  return (
    <div className="space-y-3">
      {fotoOk && (
        <div className="rounded-xl overflow-hidden border border-white/10 aspect-[16/10] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.foto_url} alt="Foto sarana distribusi" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Estimasi Pasokan" nilai={formatTon(Number(r.estimasi_pasokan_kg) > 0 ? Number(r.estimasi_pasokan_kg) : null)} aksen="text-cyan-200" />
        <Kpi label="Jenis Sarana" nilai={sarana?.label || r.kategori_label || '-'} aksen="text-white" kecil />
      </div>
      <div className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
        <Baris k="Lokasi" v={`${r.kelurahan}, ${r.kecamatan}`} />
        <Baris k="Asal pasokan" v={r.asal_pasokan || 'Belum tersedia'} />
        <Baris k="Kategori asal" v={asal.kategori === 'lokal' ? 'Lokal' : asal.kategori === 'luar' ? 'Luar Cilegon' : 'Belum teridentifikasi'} />
        <Baris k="Waktu" v={waktu(r.created_at)} />
        <Baris k="Dikirim oleh" v={<span>{en.nama}<br /><span className="text-slate-400 font-medium text-[10px]">{en.email || 'Gmail tidak tercatat'}</span></span>} />
        <Baris k="Peran" v={sumber === 'petugas' ? 'Petugas DKPP' : sumber === 'enumerator' ? 'Enumerator' : 'Lainnya'} />
      </div>
    </div>
  );
}
