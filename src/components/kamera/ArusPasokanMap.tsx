"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, ChevronDown, ChevronUp, Compass, Eye, EyeOff, Filter, Info, Loader2, Mail,
  RefreshCw, RotateCcw, Store, Truck, X, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Plus, Minus
} from 'lucide-react';
import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST } from '@/lib/kamera-normatif';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import {
  ASAL_NODES, CILEGON_HUB, FILTER_AWAL, bangunArus, formatTon, getEnumerator, jenisSumber,
  klasifikasiAsal,
  type ArusFilter, type ArusFlow, type FilterArah, type FilterPeriode, type FilterSumber
} from '@/lib/arusPasokan';
import {
  hitungEstimasiTahunan,
  formatTonTahun,
  LABEL_SUMBER
} from '@/lib/estimasi-pasokan';

// Dynamic import react-leaflet components to ensure zero SSR mismatch
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then((m) => m.GeoJSON), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((m) => m.Tooltip), { ssr: false });

// Helper to access Leaflet map instance
function MapController({
  flows,
  hub,
  saranaList = [],
  onMapReady,
}: {
  flows: ArusFlow[];
  hub: [number, number];
  saranaList?: ObservasiRecord[];
  onMapReady?: (map: L.Map) => void;
}) {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    onMapReady?.(map);

    // Cegah reset kamera jika pengguna sudah mulai melakukan zoom atau pan manual
    const handleUserInteraction = () => {
      hasFittedRef.current = true;
    };
    map.on('zoomstart', handleUserInteraction);
    map.on('movestart', handleUserInteraction);

    // Lakukan fitBounds HANYA SEKALI saat tampilan awal pertama kali dimuat (peta full 1 pulau Jawa)
    if (!hasFittedRef.current && flows.length > 0) {
      hasFittedRef.current = true;
      map.invalidateSize();
      const bounds = L.latLngBounds([hub[1], hub[0]], [hub[1], hub[0]]);
      flows.forEach((f) => bounds.extend([f.sumber[1], f.sumber[0]]));
      saranaList.forEach((s) => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
          bounds.extend([lat, lng]);
        }
      });
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });

      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(timer);
        map.off('zoomstart', handleUserInteraction);
        map.off('movestart', handleUserInteraction);
      };
    }

    return () => {
      map.off('zoomstart', handleUserInteraction);
      map.off('movestart', handleUserInteraction);
    };
  }, [map, flows.length, hub, onMapReady]);

  return null;
}

// ------------------------------------------------------------------
// Utilitas Busur Lengkung Bezier Geografis
// ------------------------------------------------------------------
function hitungBusurLeaflet(
  sumber: [number, number], // [lng, lat]
  target: [number, number], // [lng, lat]
  heightFactor = 0.22,
  segments = 50
): [number, number][] {
  const points: [number, number][] = [];
  const dx = target[0] - sumber[0];
  const dy = target[1] - sumber[1];
  // Titik kontrol lengkungan yang tegak lurus terhadap garis lurus
  const cx = (sumber[0] + target[0]) / 2 - dy * heightFactor;
  const cy = (sumber[1] + target[1]) / 2 + dx * heightFactor;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Kuadratik Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const lng = (1 - t) * (1 - t) * sumber[0] + 2 * (1 - t) * t * cx + t * t * target[0];
    const lat = (1 - t) * (1 - t) * sumber[1] + 2 * (1 - t) * t * cy + t * t * target[1];
    points.push([lat, lng]); // Leaflet format: [lat, lng]
  }
  return points;
}

// Custom Leaflet Arrow Icon untuk Arah Arus Pasokan Menuju Kota Cilegon
function createFlowArrowIcon(angleDeg: number, color = '#22e3ff') {
  return L.divIcon({
    className: 'arus-arrow-pin',
    html: `
      <div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;transform:translate(-50%, -50%) rotate(${angleDeg}deg);pointer-events:none;">
        <svg width="14" height="14" viewBox="0 0 16 16" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));">
          <path d="M3 2.5 L13 8 L3 13.5 L6 8 Z" fill="${color}" stroke="#031b2e" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Utilitas interpolasi titik dan sudut rotasi sepanjang polyline rute
function getPointAndAngleOnCoords(
  coords: [number, number][],
  t: number
): { lat: number; lng: number; angleDeg: number } {
  const maxIdx = coords.length - 1;
  const floatIdx = Math.max(0, Math.min(maxIdx, t * maxIdx));
  const idx = Math.floor(floatIdx);
  const nextIdx = Math.min(maxIdx, idx + 1);
  const frac = floatIdx - idx;

  const lat = coords[idx][0] + (coords[nextIdx][0] - coords[idx][0]) * frac;
  const lng = coords[idx][1] + (coords[nextIdx][1] - coords[idx][1]) * frac;

  // Tangen segmen lokal (P1 -> P2)
  const p1 = coords[Math.max(0, Math.min(maxIdx - 1, idx))];
  const p2 = coords[Math.max(1, Math.min(maxIdx, idx + 1))];
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  const angleDeg = (Math.atan2(-dLat, dLng) * 180) / Math.PI;

  return { lat, lng, angleDeg };
}

const normKec = (s: string) => s.toLowerCase().replace(/^kecamatan\s+/, '').replace(/\s+/g, ' ').trim();

function waktu(iso?: string): string {
  if (!iso) return 'Belum tersedia';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Belum tersedia' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Custom Leaflet Pin Icon untuk Sarana Toko Beras (Diperkecil)
function createSaranaPinIcon(namaLokasi: string, kg: number, isSelected = false) {
  const size = isSelected ? 20 : 15;
  const tonText = kg > 0 ? (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`) : '';
  return L.divIcon({
    className: 'sarana-beras-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:pointer;">
        <!-- Glowing Pulse -->
        <div style="position:absolute;width:${size + 8}px;height:${size + 8}px;background:rgba(255,196,64,0.3);border-radius:50%;top:calc(100% - ${size / 2}px);left:50%;transform:translate(-50%, -50%);pointer-events:none;animation:pulse 2s infinite;"></div>
        
        <!-- Label Nama Toko (Tanpa Kotak Background, Stroke Tipis Jelas) -->
        <div style="background:transparent;color:#ffdc73;font-weight:900;font-size:8.5px;text-shadow:0 1px 2px rgba(0,0,0,0.95),0 0 4px rgba(0,0,0,0.95),-1px -1px 0 #04101f,1px -1px 0 #04101f,-1px 1px 0 #04101f,1px 1px 0 #04101f;white-space:nowrap;margin-bottom:2px;pointer-events:none;letter-spacing:0.1px;max-width:115px;overflow:hidden;text-overflow:ellipsis;">
          ${namaLokasi} ${tonText ? `• ${tonText}` : ''}
        </div>

        <!-- Teardrop Pin -->
        <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #f59e0b, #d97706);border:1.5px solid #ffffff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:5;">
          <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.55)}px">🏪</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Hub Cilegon Center Icon (Diperkecil)
function createHubPinIcon() {
  return L.divIcon({
    className: 'hub-cilegon-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -50%);pointer-events:none;">
        <div style="width:28px;height:28px;background:rgba(34,227,255,0.2);border:1px solid #22e3ff;border-radius:50%;position:absolute;animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:16px;height:16px;background:rgba(34,227,255,0.35);border-radius:50%;position:absolute;"></div>
        <div style="width:8px;height:8px;background:#ffffff;border:1.5px solid #22e3ff;border-radius:50%;box-shadow:0 0 8px #22e3ff;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Asal Pemasok Pin Icon (Diperkecil)
function createAsalPinIcon(label: string, kg: number) {
  return L.divIcon({
    className: 'asal-pemasok-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);pointer-events:none;">
        <!-- Label Asal Pemasok (Tanpa Kotak Background, Stroke Tipis Jelas) -->
        <div style="background:transparent;color:#22e3ff;font-weight:900;font-size:9.5px;text-shadow:0 1px 2px rgba(0,0,0,0.95),0 0 4px rgba(0,0,0,0.95),-1px -1px 0 #04101f,1px -1px 0 #04101f,-1px 1px 0 #04101f,1px 1px 0 #04101f;white-space:nowrap;margin-bottom:2px;pointer-events:none;letter-spacing:0.1px;">
          ${label} • ${formatTon(kg)}
        </div>
        <div style="width:12px;height:12px;background:#22e3ff;border:1.5px solid #ffffff;border-radius:50%;box-shadow:0 0 8px #22e3ff;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

interface ArusPasokanMapProps {
  observasiList: ObservasiRecord[];
  loaded?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const glass = 'bg-[#071a2e]/85 backdrop-blur-xl border border-cyan-300/20 shadow-[0_10px_40px_rgba(0,0,0,0.55)]';
const selectCls = 'w-full bg-[#0c2640] border border-cyan-300/25 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-cyan-50 focus:outline-none focus:border-cyan-300';

export default function ArusPasokanMap({ observasiList = [], loaded = true, error = null, onRefresh }: ArusPasokanMapProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Filter & tampilan
  const [filter, setFilter] = useState<ArusFilter>(FILTER_AWAL);
  const [tampilSarana, setTampilSarana] = useState(true);
  const [tampilLabel, setTampilLabel] = useState(true);
  const [tampilAnim, setTampilAnim] = useState(true);
  const [tampilTigaD, setTampilTigaD] = useState(true);
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const [kpiTerbuka, setKpiTerbuka] = useState(false);
  const [legendaTerbuka, setLegendaTerbuka] = useState(true);
  const [selectedSarana, setSelectedSarana] = useState<ObservasiRecord | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ArusFlow | null>(null);

  // Animasi denyut partikel arus
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    if (!tampilAnim) return;
    const interval = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 60);
    }, 45);
    return () => clearInterval(interval);
  }, [tampilAnim]);

  // Default responsif: panel dilipat di layar kecil
  useEffect(() => {
    const kecil = window.matchMedia('(max-width: 640px)').matches;
    if (kecil) {
      setKpiTerbuka(false);
      setLegendaTerbuka(false);
    }
  }, []);

  // Batas wilayah dari KMZ Supabase
  const { layers: kmz, loading: kmzLoading, error: kmzError, loadFromURL } = useKMZLoader();
  useEffect(() => {
    loadFromURL();
  }, [loadFromURL]);

  const hub: [number, number] = CILEGON_HUB;

  // Agregasi arus dari data Kamera Cerdas (7 toko beras otomatis terolah)
  const hasil = useMemo(() => bangunArus(observasiList, filter, hub), [observasiList, filter, hub]);
  const semuaPasokan = useMemo(() => observasiList.filter((r) => r.mode === 'pasokan_beras').length, [observasiList]);
  const maxKg = useMemo(() => hasil.flows.reduce((m, f) => Math.max(m, f.volumeKg), 0), [hasil.flows]);

  // Pra-kalkulasi geometri garis rute hairline presisi dan tanda panah arah aliran
  const busurList = useMemo(() => {
    return hasil.flows.map((flow) => {
      const coords = hitungBusurLeaflet(flow.sumber, flow.target, flow.heightFactor, 60);

      // Jumlah tanda panah proporsional terhadap jarak rute (2 - 5 panah)
      const arrowCount = flow.jarakKm < 60 ? 2 : flow.jarakKm < 180 ? 3 : flow.jarakKm < 350 ? 4 : 5;
      const arrows: { lat: number; lng: number; angleDeg: number; opacity: number }[] = [];

      for (let k = 0; k < arrowCount; k++) {
        let t: number;
        if (tampilAnim) {
          // Meluncur mengarah ke tujuan (Kota Cilegon Hub) saat animasi aktif
          const baseOffset = k / arrowCount;
          t = (baseOffset + animStep / 60) % 1.0;
        } else {
          // Posisi statis terdistribusi merata sepanjang rute saat animasi nonaktif
          t = (k + 1) / (arrowCount + 1);
        }

        // Tampilkan panah pada rentang rute yang presisi tanpa bertumpuk dengan marker simpul
        if (t >= 0.05 && t <= 0.95) {
          const { lat, lng, angleDeg } = getPointAndAngleOnCoords(coords, t);
          let opacity = 1;
          if (tampilAnim) {
            if (t < 0.12) opacity = (t - 0.05) / 0.07;
            else if (t > 0.88) opacity = (0.95 - t) / 0.07;
          }
          arrows.push({ lat, lng, angleDeg, opacity });
        }
      }

      return {
        flow,
        coords,
        arrows,
      };
    });
  }, [hasil.flows, animStep, tampilAnim]);

  // Daftar sarana toko beras dengan koordinat valid
  const validSaranaList = useMemo(() => {
    return hasil.records.filter(
      (r) => Number.isFinite(Number(r.longitude)) && Number.isFinite(Number(r.latitude)) && Number(r.latitude) !== 0
    );
  }, [hasil.records]);

  // Fit kamera Leaflet ke seluruh busur dan toko
  const fitKamera = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (hasil.flows.length > 0) {
      const bounds = L.latLngBounds([hub[1], hub[0]], [hub[1], hub[0]]);
      hasil.flows.forEach((f) => bounds.extend([f.sumber[1], f.sumber[0]]));
      validSaranaList.forEach((s) => bounds.extend([Number(s.latitude), Number(s.longitude)]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    } else {
      map.setView([hub[1], hub[0]], 11);
    }
  }, [hasil.flows, validSaranaList, hub]);

  const ubahFilter = (p: Partial<ArusFilter>) => setFilter((f) => ({ ...f, ...p }));
  const filterAktif = JSON.stringify(filter) !== JSON.stringify(FILTER_AWAL);
  const { kpi } = hasil;

  const kosongKarenaFilter = loaded && !error && hasil.records.length === 0;
  const tanpaAsalGeografis = loaded && !error && hasil.records.length > 0 && hasil.flows.length === 0 && filter.arah !== 'keluar';

  return (
    <div id="arus-pasokan-panel" className="relative w-full h-full min-h-[420px] overflow-hidden bg-[#04101f] text-cyan-50 select-none">
      
      {/* ── Main Leaflet Map Engine (Zero WebGL Crash, 100% Reliable) ── */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[hub[1], hub[0]]}
          zoom={10.5}
          style={{ width: '100%', height: '100%', background: '#04101f' }}
          zoomControl={false}
          attributionControl={false}
        >
          <MapController
            flows={hasil.flows}
            hub={hub}
            saranaList={validSaranaList}
            onMapReady={(m) => {
              mapInstanceRef.current = m;
            }}
          />

          {/* Basemap Satelit Esri Resolusi Tinggi */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          {/* Batas Geospasial KMZ Kecamatan Kota Cilegon */}
          {kmz.kecamatan && kmz.kecamatan.length > 0 && (
            <GeoJSON
              data={{ type: 'FeatureCollection', features: kmz.kecamatan } as any}
              style={{
                color: '#22e3ff',
                weight: 1.5,
                opacity: 0.65,
                fillColor: '#059669',
                fillOpacity: 0.12,
              }}
            />
          )}

          {/* 1) Garis Busur Hairline Presisi dan Tanda Panah Arah Aliran Pasokan */}
          {busurList.map(({ flow, coords, arrows }) => {
            const isSelected = selectedFlow?.id === flow.id;
            const lineColor = flow.tervalidasi ? '#22e3ff' : '#94a3b8';
            const arrowColor = flow.tervalidasi ? '#22e3ff' : '#cbd5e1';

            return (
              <React.Fragment key={flow.id}>
                {/* Invisible Wider Hit-Area Polyline for Easy Clicking */}
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: 'transparent',
                    weight: 16,
                    opacity: 0.001,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedFlow(flow);
                      setSelectedSarana(null);
                    },
                  }}
                />

                {/* Subtle, Minimal Glow Layer (Tidak menutupi data/geografis saat zoom out) */}
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: lineColor,
                    weight: isSelected ? 3.5 : 2.5,
                    opacity: isSelected ? 0.35 : 0.18,
                    lineCap: 'round',
                  }}
                />

                {/* Core Hairline Route Line (1.5 - 2px) */}
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : lineColor,
                    weight: isSelected ? 2.0 : 1.5,
                    opacity: 0.95,
                    lineCap: 'round',
                  }}
                />

                {/* Tanda Panah Kecil Mengikuti Arah Aliran Menuju Kota Cilegon */}
                {arrows.map((arr, aIdx) => (
                  <Marker
                    key={`arrow-${flow.id}-${aIdx}`}
                    position={[arr.lat, arr.lng]}
                    icon={createFlowArrowIcon(arr.angleDeg, arrowColor)}
                    opacity={arr.opacity}
                    eventHandlers={{
                      click: () => {
                        setSelectedFlow(flow);
                        setSelectedSarana(null);
                      },
                    }}
                  />
                ))}
              </React.Fragment>
            );
          })}

          {/* 2) Simpul Asal Wilayah Pemasok (Jawa Barat, DKI Jakarta, Serang) */}
          {hasil.flows.map((f) => (
            <Marker
              key={`asal-${f.id}`}
              position={[f.sumber[1], f.sumber[0]]}
              icon={createAsalPinIcon(f.asal.label, f.volumeKg)}
              eventHandlers={{
                click: () => {
                  setSelectedFlow(f);
                  setSelectedSarana(null);
                },
              }}
            >
              <Popup
                offset={[0, 32]}
                autoPan={true}
                autoPanPadding={[20, 90]}
                className="arus-asal-popup"
              >
                <div className="p-2.5 min-w-[200px] text-white font-sans">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 block mb-0.5">
                    Wilayah Asal Pasokan
                  </span>
                  <h4 className="font-extrabold text-xs text-white leading-tight mb-2">
                    {f.asal.label} → Kota Cilegon
                  </h4>
                  <div className="bg-[#0c2640]/90 border border-cyan-300/25 rounded-xl p-2 space-y-1 text-[11px] mb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-200/80 font-medium text-[10px]">Volume Aliran:</span>
                      <b className="text-cyan-200 font-black">{formatTon(f.volumeKg)}</b>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Sarana Terlibat:</span>
                      <span className="text-cyan-50 font-bold">{f.jumlahSarana} titik</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFlow(f);
                      setSelectedSarana(null);
                    }}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#04101f] text-[10.5px] font-black text-center cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    Buka Rincian Aliran ➔
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 3) Simpul Hub Sentral Kota Cilegon */}
          <Marker position={[hub[1], hub[0]]} icon={createHubPinIcon()} />

          {/* 4) Pin Sarana Toko Beras Terverifikasi Lapangan (7 Toko) */}
          {tampilSarana &&
            validSaranaList.map((rec, i) => {
              const isSelected = selectedSarana?.id === rec.id;
              const kg = Number(rec.estimasi_pasokan_kg || 0);
              const nama = rec.nama_lokasi || rec.kategori_label || `Toko #${i + 1}`;
              return (
                <Marker
                  key={rec.id || `sarana-${i}`}
                  position={[Number(rec.latitude), Number(rec.longitude)]}
                  icon={createSaranaPinIcon(nama, kg, isSelected)}
                  eventHandlers={{
                    click: () => {
                      setSelectedSarana(rec);
                      setSelectedFlow(null);
                    },
                  }}
                >
                  <Popup
                    offset={[0, 32]}
                    autoPan={true}
                    autoPanPadding={[20, 90]}
                    className="arus-sarana-popup"
                  >
                    <div className="p-2.5 min-w-[210px] max-w-[260px] text-white font-sans">
                      <div className="flex items-start justify-between gap-2 border-b border-cyan-300/20 pb-1.5 mb-2">
                        <div className="min-w-0 pr-3">
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 block">
                            Sarana Distribusi Beras
                          </span>
                          <h4 className="font-extrabold text-xs text-white leading-tight">
                            {nama}
                          </h4>
                        </div>
                      </div>

                      <div className="bg-[#0c2640]/90 border border-cyan-300/25 rounded-xl p-2 space-y-1 text-[11px] mb-2.5 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-200/80 font-medium text-[10px]">Stok Sesaat (AI):</span>
                          <b className="text-amber-300 font-black">{kg > 0 ? formatTon(kg) : 'Stok tercatat'}</b>
                        </div>
                        {(() => {
                          const est = hitungEstimasiTahunan(rec);
                          return (
                            <>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-cyan-200/80 font-medium">Pasokan / Tahun:</span>
                                <b className="text-emerald-300 font-black">{formatTonTahun(est.tahunanTon)}</b>
                              </div>
                              <div className="flex justify-between items-center text-[9.5px]">
                                <span className="text-slate-400">Sumber:</span>
                                <span className="text-cyan-100 font-bold">{LABEL_SUMBER[est.sumber]}{est.perluVerifikasi ? ' ⚠️' : ''}</span>
                              </div>
                            </>
                          );
                        })()}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">Kelurahan:</span>
                          <span className="text-cyan-50 font-bold">{rec.kelurahan}</span>
                        </div>
                        {rec.asal_pasokan && (
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">Asal Pasokan:</span>
                            <span className="text-cyan-200 font-bold truncate max-w-[125px]">{rec.asal_pasokan}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSarana(rec);
                          setSelectedFlow(null);
                        }}
                        className="w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#04101f] text-[10.5px] font-black text-center cursor-pointer transition-all shadow-md active:scale-95"
                      >
                        Buka Detail Lengkap ➔
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>

      {/* ── Kiri atas: Judul + KPI Card ── */}
      <div className="absolute top-3 left-3 right-20 sm:right-auto sm:w-[340px] z-10 pointer-events-none">
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
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-wide text-white truncate">Peta Arus Pasokan & Distribusi Beras</div>
              <div className="text-[10px] font-semibold text-cyan-200/80 truncate">
                {formatTon(kpi.totalKg)} • {kpi.totalSarana} sarana • {kpi.wilayahPemasok} wilayah pemasok
              </div>
            </div>
            <span className="text-cyan-300 p-1">{kpiTerbuka ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          </button>

          {kpiTerbuka && (
            <div className="p-3 pt-0 space-y-2 border-t border-cyan-300/10">
              <div className="grid grid-cols-2 gap-1.5 pt-2">
                <Kpi label="Sarana Distribusi Terdata" nilai={`${kpi.totalSarana}`} satuan="titik" aksen="text-amber-300" />
                <Kpi label="Estimasi Pasokan Tercatat" nilai={formatTon(kpi.totalKg)} aksen="text-cyan-200" />
                <Kpi label="Arus Masuk Tervalidasi Petugas" nilai={kpi.masukTervalidasiKg !== null ? formatTon(kpi.masukTervalidasiKg) : '0 ton'} aksen="text-emerald-300" />
                <Kpi label="Arus Keluar Terverifikasi" nilai={null} catatan="Data tujuan keluar belum dicatat" aksen="text-slate-400" />
                <Kpi
                  label="Lokal : Luar Cilegon"
                  nilai={kpi.persenLokal !== null && kpi.persenLuar !== null ? `${kpi.persenLokal}% : ${kpi.persenLuar}%` : '-'}
                  aksen="text-cyan-100"
                />
                <Kpi label="Wilayah Pemasok Teridentifikasi" nilai={`${kpi.wilayahPemasok}`} satuan="wilayah" aksen="text-cyan-200" />
                <Kpi label="Komoditas Terbesar" nilai="Beras" aksen="text-white" />
                <Kpi label="Pembaruan Terakhir" nilai={waktu(hasil.flows[0]?.terakhir || hasil.records[0]?.created_at)} aksen="text-cyan-100" kecil />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Kanan: Toolbar Kontrol Vertikal (Filter, Kompas, Zoom In, Zoom Out, Refresh, Sarana, Animasi) ── */}
      <div className="absolute top-16 right-3 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* 1. Filter */}
          <button
            type="button"
            onClick={() => setFilterTerbuka((v) => !v)}
            className={`${glass} h-9 px-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg transition-all ${
              filterAktif ? 'text-amber-200 border-amber-300/50 bg-amber-500/10' : 'text-cyan-100 hover:text-white hover:border-cyan-300/50'
            }`}
            aria-expanded={filterTerbuka}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter{filterAktif ? ' •' : ''}</span>
          </button>

          {/* 2. Kompas / Reset Kamera */}
          <button
            type="button"
            onClick={fitKamera}
            title="Reset tampilan kamera"
            aria-label="Reset tampilan kamera"
            className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 hover:text-white hover:border-cyan-300/50 active:scale-95 shadow-lg cursor-pointer transition-all`}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* 3. Zoom In */}
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Perbesar Peta (Zoom In)"
            aria-label="Perbesar peta"
            className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 hover:text-white hover:border-cyan-300/50 active:scale-95 shadow-lg cursor-pointer transition-all`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 4. Zoom Out */}
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Perkecil Peta (Zoom Out)"
            aria-label="Perkecil peta"
            className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 hover:text-white hover:border-cyan-300/50 active:scale-95 shadow-lg cursor-pointer transition-all`}
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 5. Refresh */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Muat ulang data"
              aria-label="Muat ulang data"
              className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center text-cyan-100 hover:text-white hover:border-cyan-300/50 active:scale-95 shadow-lg cursor-pointer transition-all`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* 6. Titik Sarana Toggle */}
          <button
            type="button"
            onClick={() => setTampilSarana((v) => !v)}
            title="Toggle Titik Sarana Toko Beras"
            aria-label="Toggle Titik Sarana"
            className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
              tampilSarana
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-300/60 shadow-[0_0_12px_rgba(34,227,255,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:border-cyan-300/30'
            }`}
          >
            <Store className="w-4 h-4" />
          </button>

          {/* 7. Animasi Flow Toggle */}
          <button
            type="button"
            onClick={() => setTampilAnim((v) => !v)}
            title="Toggle Animasi Arus Pasokan"
            aria-label="Toggle Animasi Arus"
            className={`${glass} h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
              tampilAnim
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-300/60 shadow-[0_0_12px_rgba(34,227,255,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:border-cyan-300/30'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
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
            <div className="text-[11px] font-bold text-cyan-50 bg-[#0c2640] border border-cyan-300/20 rounded-lg px-2.5 py-1.5">Beras <span className="text-slate-400 font-medium">(komoditas pasokan)</span></div>
          </Field>

          <Field label="Arah Arus">
            <div className="grid grid-cols-3 gap-1">
              {([['semua', 'Semua'], ['masuk', 'Masuk'], ['keluar', 'Keluar']] as [FilterArah, string][]).map(([v, l]) => (
                <button key={v} type="button" onClick={() => ubahFilter({ arah: v })} className={`py-1.5 rounded-lg text-[11px] font-black border cursor-pointer ${filter.arah === v ? 'bg-cyan-400 text-[#04101f] border-cyan-200' : 'bg-[#0c2640] text-cyan-100 border-cyan-300/20 hover:border-cyan-300/60'}`}>{l}</button>
              ))}
            </div>
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
            <Legenda warna="rgb(34,227,255)">Pasokan masuk (tervalidasi petugas)</Legenda>
            <Legenda warna="rgb(148,163,184)">Pasokan masuk — belum divalidasi</Legenda>
            <Legenda warna="rgb(255,196,64)" titik>Sarana toko beras ({validSaranaList.length} titik)</Legenda>
            <div className="flex items-center gap-2 text-[10.5px]">
              <span className="w-4 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 16 16">
                  <path d="M3 2.5 L13 8 L3 13.5 L6 8 Z" fill="#22e3ff" stroke="#031b2e" strokeWidth="1" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-slate-200 leading-tight">Arah arus pasokan</span>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setLegendaTerbuka(true)} className={`${glass} h-9 px-3 rounded-xl text-[11px] font-black text-cyan-100 flex items-center gap-1.5 cursor-pointer`}>
            <Info className="w-3.5 h-3.5" /> Legenda
          </button>
        )}
      </div>

      {/* ── Panel Detail (Ketika Sarana Toko Beras / Aliran Diklik) ── */}
      {(selectedSarana || selectedFlow) && (
        <div className={`${glass} absolute z-20 bottom-0 inset-x-0 rounded-t-2xl sm:rounded-2xl sm:bottom-auto sm:inset-x-auto sm:top-[180px] sm:right-3 sm:w-[320px] max-h-[60%] sm:max-h-[calc(100%-200px)] overflow-y-auto p-4 space-y-3`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {selectedFlow && (
                <>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cyan-300"><ArrowDownToLine className="w-3 h-3" /> Arus Masuk</span>
                  <h3 className="text-sm font-black text-white leading-tight">{selectedFlow.asal.label} → Kota Cilegon</h3>
                </>
              )}
              {selectedSarana && (
                <>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">Sarana Distribusi</span>
                  <h3 className="text-sm font-black text-white leading-tight">{selectedSarana.nama_lokasi || selectedSarana.kategori_label || 'Toko Beras'}</h3>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSarana(null);
                setSelectedFlow(null);
              }}
              aria-label="Tutup detail"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white shrink-0 cursor-pointer transition-colors shadow-sm active:scale-95"
              title="Tutup panel info"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {selectedFlow && <DetailFlow f={selectedFlow} />}
          {selectedSarana && <DetailSarana r={selectedSarana} />}
        </div>
      )}

      {/* ── Status Banner jika Kosong ── */}
      {kosongKarenaFilter && (
        <div className={`${glass} absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-[92%] rounded-2xl px-4 py-3 text-center space-y-1.5`}>
          <p className="text-[12px] font-black text-white">Tidak ada data yang memenuhi filter</p>
          <button type="button" onClick={() => setFilter(FILTER_AWAL)} className="px-3 py-1 rounded-lg text-[11px] font-black bg-cyan-400 text-[#04101f] cursor-pointer">Atur Ulang Filter</button>
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


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Legenda({ warna, glow, putus, titik, children }: { warna: string; glow?: boolean; putus?: boolean; titik?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px]">
      {titik ? (
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: warna, boxShadow: glow ? `0 0 8px ${warna}` : undefined }} />
      ) : (
        <span
          className="w-4 h-0.5 shrink-0"
          style={{
            backgroundColor: putus ? 'transparent' : warna,
            borderTop: putus ? `2px dashed ${warna}` : undefined,
            boxShadow: glow ? `0 0 8px ${warna}` : undefined,
          }}
        />
      )}
      <span className="text-slate-200 leading-tight">{children}</span>
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
        <Baris k="Jarak perkiraan" v={`± ${Math.round(f.jarakKm)} km`} />
        <Baris k="Pencatatan terakhir" v={waktu(f.terakhir)} />
        <Baris
          k="Status verifikasi"
          v={
            f.tervalidasi
              ? <span className="text-emerald-300">Tervalidasi petugas</span>
              : <span className="text-slate-300">Belum divalidasi petugas</span>
          }
        />
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
    </div>
  );
}

function DetailSarana({ r }: { r: ObservasiRecord }) {
  const en = getEnumerator(r);
  const asal = klasifikasiAsal(r.asal_pasokan);
  const sarana = SARANA_DISTRIBUSI_LIST.find((s) => s.id === r.kategori);
  const sumber = jenisSumber(r);
  const est = hitungEstimasiTahunan(r);
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
        <Kpi label="Pasokan / Tahun" nilai={formatTonTahun(est.tahunanTon)} aksen="text-emerald-300" />
        <Kpi label="Stok Sesaat (AI)" nilai={formatTon(Number(r.estimasi_pasokan_kg) > 0 ? Number(r.estimasi_pasokan_kg) : null)} aksen="text-cyan-200" />
      </div>
      <div className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
        <Baris k="Jenis Sarana" v={sarana?.label || r.kategori_label || 'Toko Beras'} />
        <Baris k="Metode Estimasi" v={`${LABEL_SUMBER[est.sumber]}${est.perluVerifikasi ? ' (Perlu verifikasi ⚠️)' : ''}`} />
        {r.frekuensi_pasokan_angka && r.volume_pasokan_angka ? (
          <Baris k="Frekuensi × Kiriman" v={`${r.frekuensi_pasokan_angka}×/${r.frekuensi_pasokan_satuan} @ ${r.volume_pasokan_angka} ${r.volume_pasokan_satuan}`} />
        ) : null}
        <Baris k="Nama Lokasi" v={r.nama_lokasi || 'Toko Beras'} />
        <Baris k="Wilayah" v={`${r.kelurahan}, ${r.kecamatan}`} />
        <Baris k="Asal pasokan" v={r.asal_pasokan || 'Belum tersedia'} />
        <Baris k="Kategori asal" v={asal.kategori === 'lokal' ? 'Lokal' : asal.kategori === 'luar' ? 'Luar Cilegon' : 'Belum teridentifikasi'} />
        <Baris k="Waktu" v={waktu(r.created_at)} />
        <Baris k="Dikirim oleh" v={<span>{en.nama}<br /><span className="text-slate-400 font-medium text-[10px]">{en.email || 'Gmail tidak tercatat'}</span></span>} />
        <Baris k="Peran" v={sumber === 'petugas' ? 'Petugas DKPP' : sumber === 'enumerator' ? 'Enumerator' : 'Lainnya'} />
      </div>
    </div>
  );
}
