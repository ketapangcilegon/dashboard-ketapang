"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST, TANAMAN_PANGAN_LIST } from '@/lib/kamera-normatif';
import { MapRefSetter, MoveZoomControl, FitBoundsControl } from '@/components/gis/MapHelpers';
import LocateMe from '@/components/gis/LocateMe';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { Filter, Store, Trees, MapPin, Calendar, CheckCircle2, ChevronRight, Layers, Sparkles, Truck, Globe2 } from 'lucide-react';
import {
  hitungKalibrasi,
  hitungEstimasiTahunan,
  formatTonTahun,
  LABEL_SUMBER,
  WARNA_KEYAKINAN,
  type Kalibrasi
} from '@/lib/estimasi-pasokan';

export interface KameraCerdasMapProps {
  observasiList: ObservasiRecord[];
  onRefresh?: () => void;
  focusPinId?: string | null;
  focusCoords?: [number, number] | null;
  onSwitchToArusMap?: () => void;
  filterMode?: 'semua' | 'pasokan_beras' | 'tanaman_pangan';
}

// Builder Icon Teardrop Tematik Serumpun Padi
export const createKameraPinIcon = (record: ObservasiRecord, tonBadge?: string) => {
  const isPasokan = record.mode === 'pasokan_beras';
  
  let emoji = '📍';
  let bgColor = '#10b981';

  if (isPasokan) {
    const sarana = SARANA_DISTRIBUSI_LIST.find(s => s.id === record.kategori);
    emoji = sarana?.icon || '🏪';
    bgColor = sarana?.color || '#2563eb';
  } else {
    const tanaman = TANAMAN_PANGAN_LIST.find(t => t.id === record.kategori);
    emoji = tanaman?.icon || '🌳';
    bgColor = tanaman?.color || '#15803d';
  }

  const size = 16;
  const labelText = record.nama_lokasi || record.kategori_label || 'Titik Observasi';

  return L.divIcon({
    className: 'kamera-cerdas-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:pointer;">
        <!-- Glowing Radar Pulse -->
        <div class="sp-loc-pulse" style="width:22px;height:22px;background:${bgColor}44;top:calc(100% - 8px);left:50%;margin-left:-11px;margin-top:-11px;"></div>
        
        <!-- Transparent Label with Sharp Text Shadow -->
        <div style="background:transparent;color:#ffffff;font-weight:900;font-size:9.5px;text-shadow:0 1px 2px rgba(0,0,0,0.95),0 0 4px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-bottom:2px;z-index:10;pointer-events:none;">
          ${labelText}${tonBadge ? ` <span style="color:#67e8f9;">• ${tonBadge}</span>` : ''}
        </div>

        <!-- Teardrop Marker Pin (50% dari ukuran eksisting 32px -> 16px) -->
        <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgColor};border:1.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1.5px 5px rgba(0,0,0,0.45);z-index:5;">
          <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.55)}px">${emoji}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export default function KameraCerdasMap({
  observasiList = [],
  onRefresh,
  focusPinId,
  focusCoords,
  onSwitchToArusMap,
  filterMode: filterModeProp
}: KameraCerdasMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  // Filters & Mode Pasokan (default 'tahunan' = Estimasi Tahunan)
  const [filterModeLokal, setFilterModeLokal] = useState<'semua' | 'pasokan_beras' | 'tanaman_pangan'>('semua');
  const filterMode = filterModeProp ?? filterModeLokal;
  const [modePasokan, setModePasokan] = useState<'tahunan' | 'terdata'>('tahunan');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('semua');
  const [filterKelurahan, setFilterKelurahan] = useState<string>('semua');
  const [showOsm, setShowOsm] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ObservasiRecord | null>(null);
  const kalibrasi: Kalibrasi = useMemo(() => hitungKalibrasi(observasiList), [observasiList]);

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, []);

  // Auto-focus and open popup when focusCoords or focusPinId changes
  useEffect(() => {
    if (focusCoords && mapRef.current) {
      mapRef.current.flyTo(focusCoords, 16.5, { duration: 1.5 });
    }
  }, [focusCoords]);

  useEffect(() => {
    if (focusPinId) {
      const match = observasiList.find(o => o.id === focusPinId);
      if (match) {
        setSelectedRecord(match);
        if (mapRef.current && match.latitude && match.longitude) {
          mapRef.current.flyTo([Number(match.latitude), Number(match.longitude)], 16.5, { duration: 1.5 });
        }
      }
      const t = setTimeout(() => {
        if (markerRefs.current[focusPinId]) {
          markerRefs.current[focusPinId].openPopup();
        }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [focusPinId, observasiList]);

  // Filtered List
  const filteredData = useMemo(() => {
    return observasiList.filter(item => {
      if (filterMode !== 'semua' && item.mode !== filterMode) return false;
      if (filterKecamatan !== 'semua' && item.kecamatan !== filterKecamatan) return false;
      if (filterKelurahan !== 'semua' && item.kelurahan !== filterKelurahan) return false;
      return true;
    });
  }, [observasiList, filterMode, filterKecamatan, filterKelurahan]);

  const handleKecamatanChange = (kec: string) => {
    setFilterKecamatan(kec);
    setFilterKelurahan('semua');
  };

  return (
    <div className="w-full h-full min-h-[420px] relative overflow-hidden flex flex-col bg-[#F5FAF2]">
      
      {/* Kolom Ikon Navigasi (kiri, lurus ke bawah, glass hitam transparan) */}
      <div className="absolute left-[10px] top-[164px] z-[400] flex flex-col gap-[5px] pointer-events-auto">
        {([
          { key: 'terdata', title: 'Pasokan Terdata', icon: <Truck className="w-4 h-4" />, aktif: modePasokan === 'terdata', onClick: () => setModePasokan('terdata') },
          { key: 'tahunan', title: 'Estimasi Tahunan', icon: <Calendar className="w-4 h-4" />, aktif: modePasokan === 'tahunan', onClick: () => setModePasokan('tahunan') },
          { key: 'osm', title: 'Overlay Jalan & Sungai', icon: <Layers className="w-4 h-4" />, aktif: showOsm, onClick: () => setShowOsm(!showOsm) },
          ...(onSwitchToArusMap ? [{ key: 'arus', title: 'Peta Arus Pasokan', icon: <Globe2 className="w-4 h-4" />, aktif: false, onClick: onSwitchToArusMap }] : []),
        ]).map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            title={b.title}
            aria-label={b.title}
            className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center cursor-pointer backdrop-blur-md border shadow-lg transition-all active:scale-95 ${
              b.aktif
                ? 'bg-cyan-500/25 border-cyan-300/70 text-cyan-100 shadow-[0_0_12px_rgba(34,227,255,0.45)]'
                : 'bg-[#091728]/50 border-white/20 text-white hover:bg-[#0f2138]/75 hover:border-white/45'
            }`}
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Dropdown Kecamatan (kanan atas) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5 pointer-events-auto">
        <select
          value={filterKecamatan}
          onChange={(e) => handleKecamatanChange(e.target.value)}
          className="bg-[#091728]/60 backdrop-blur-md border border-white/25 rounded-[10px] px-2.5 h-[34px] text-white focus:outline-none focus:border-cyan-300 font-bold text-[11px] shadow-lg max-w-[170px]"
        >
          <option className="text-slate-900" value="semua">Semua Kecamatan</option>
          {Object.keys(WILAYAH).map(kec => (
            <option className="text-slate-900" key={kec} value={kec}>{kec}</option>
          ))}
        </select>
        {filterKecamatan !== 'semua' && (
          <select
            value={filterKelurahan}
            onChange={(e) => setFilterKelurahan(e.target.value)}
            className="bg-[#091728]/60 backdrop-blur-md border border-white/25 rounded-[10px] px-2.5 h-[34px] text-white focus:outline-none focus:border-cyan-300 font-bold text-[11px] shadow-lg max-w-[170px]"
          >
            <option className="text-slate-900" value="semua">Semua Kelurahan</option>
            {(WILAYAH[filterKecamatan] || []).map(kel => (
              <option className="text-slate-900" key={kel} value={kel}>{kel}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Leaflet Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[-6.01, 106.02]}
          zoom={12.5}
          style={{ height: '100%', width: '100%' }}
          preferCanvas={true}
          zoomControl={true}
          attributionControl={false}
        >
          <MapRefSetter mapRef={mapRef} />
          <MoveZoomControl />
          <FitBoundsControl />
          <LocateMe />

          {/* Basemap Satelit Esri */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />

          {/* Overlay Jalan & Sungai OSM */}
          {showOsm && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              opacity={0.55}
              maxZoom={19}
            />
          )}

          {/* Markers Observasi Lapangan */}
          {filteredData.map((item, idx) => {
            if (!item.latitude || !item.longitude) return null;
            let tonBadge: string | undefined;
            if (item.mode === 'pasokan_beras') {
              const est = hitungEstimasiTahunan(item, kalibrasi);
              if (modePasokan === 'tahunan') {
                tonBadge = est.tahunanTon >= 1
                  ? `${est.tahunanTon.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ton/thn`
                  : `${Math.round(est.tahunanKg)} kg/thn`;
              } else {
                const kg = Number(item.estimasi_pasokan_kg || 0);
                tonBadge = kg >= 1000
                  ? `${(kg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ton`
                  : `${Math.round(kg)} kg`;
              }
            }
            return (
              <Marker
                key={`${item.id || `kamera-obs-${idx}`}-${modePasokan}`}
                position={[Number(item.latitude), Number(item.longitude)]}
                icon={createKameraPinIcon(item, tonBadge)}
                ref={(m) => {
                  if (m && item.id) markerRefs.current[item.id] = m;
                }}
                eventHandlers={{
                  click: () => setSelectedRecord(item)
                }}
              >
                <Popup className="kamera-cerdas-popup">
                  <div className="p-1 max-w-[240px] text-slate-900 font-sans text-xs">
                    {/* Header Image */}
                    {item.foto_url && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 mb-2 aspect-[16/10]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.foto_url} alt="Foto" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {item.nama_lokasi || item.kategori_label}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      📍 {item.kelurahan}, {item.kecamatan}
                    </p>

                    {item.mode === 'pasokan_beras' ? (() => {
                      const est = hitungEstimasiTahunan(item, kalibrasi);
                      return (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Estimasi / Tahun:</span>
                            <b className="text-indigo-700">{formatTonTahun(est.tahunanTon)}</b>
                          </div>
                          <div className="flex justify-between border-t border-blue-200/70 pt-1">
                            <span className="text-slate-600">Pasokan Terdata (AI):</span>
                            <b className="text-blue-700">{(item.estimasi_pasokan_kg || 0).toLocaleString('id-ID')} Kg</b>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500">Metode:</span>
                            <span
                              className="font-bold px-1.5 py-0.5 rounded-full text-[9px]"
                              style={{ color: WARNA_KEYAKINAN[est.keyakinan], background: `${WARNA_KEYAKINAN[est.keyakinan]}1f` }}
                            >
                              {LABEL_SUMBER[est.sumber]}{est.perluVerifikasi ? ' ⚠️' : ''}
                            </span>
                          </div>
                          {item.asal_pasokan && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-600">Asal Pasokan:</span>
                              <b className="text-slate-800">{item.asal_pasokan}</b>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Estimasi Produksi:</span>
                          <b className="text-emerald-700">{(item.estimasi_produksi_kg || 0).toLocaleString('id-ID')} Kg</b>
                        </div>
                        {item.jumlah_pohon_rumpun ? (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">Jumlah Pohon:</span>
                            <b className="text-slate-800">{item.jumlah_pohon_rumpun} Pohon</b>
                          </div>
                        ) : item.luas_lahan_m2 ? (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">Luas Lahan:</span>
                            <b className="text-slate-800">{item.luas_lahan_m2} m²</b>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Terkonfirmasi'}</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Terverifikasi
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
}
