"use client";

import React, { useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WILAYAH } from '@/lib/wilayah';
import { SARANA_DISTRIBUSI_LIST, TANAMAN_PANGAN_LIST } from '@/lib/kamera-normatif';
import { MapRefSetter, MoveZoomControl, FitBoundsControl } from '@/components/gis/MapHelpers';
import LocateMe from '@/components/gis/LocateMe';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { Filter, Store, Trees, MapPin, Calendar, CheckCircle2, ChevronRight, Layers, Sparkles } from 'lucide-react';

interface KameraCerdasMapProps {
  observasiList: ObservasiRecord[];
  onRefresh?: () => void;
}

// Builder Icon Teardrop Tematik Serumpun Padi
const createKameraPinIcon = (record: ObservasiRecord) => {
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

  const size = 32;

  return L.divIcon({
    className: 'kamera-cerdas-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:pointer;">
        <!-- Glowing Radar Pulse -->
        <div class="sp-loc-pulse" style="width:44px;height:44px;background:${bgColor}44;top:calc(100% - 16px);left:50%;margin-left:-22px;margin-top:-22px;"></div>
        
        <!-- Transparent Label with Sharp Text Shadow -->
        <div style="background:transparent;color:#ffffff;font-weight:900;font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;margin-bottom:3px;z-index:10;pointer-events:none;">
          ${record.nama_lokasi || record.kategori_label || 'Titik Observasi'}
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
};

export default function KameraCerdasMap({
  observasiList = [],
  onRefresh
}: KameraCerdasMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Filters
  const [filterMode, setFilterMode] = useState<'semua' | 'pasokan_beras' | 'tanaman_pangan'>('semua');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('semua');
  const [filterKelurahan, setFilterKelurahan] = useState<string>('semua');
  const [showOsm, setShowOsm] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ObservasiRecord | null>(null);

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
    <div className="w-full h-full relative overflow-hidden flex flex-col bg-slate-950">
      
      {/* Floating Filter Bar */}
      <div className="absolute top-4 left-14 sm:left-16 right-4 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl shadow-xl flex flex-wrap items-center gap-2 text-xs">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 font-bold">
            <button
              onClick={() => setFilterMode('semua')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterMode === 'semua' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({observasiList.length})
            </button>
            <button
              onClick={() => setFilterMode('pasokan_beras')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterMode === 'pasokan_beras' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Pasokan Beras</span>
            </button>
            <button
              onClick={() => setFilterMode('tanaman_pangan')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterMode === 'tanaman_pangan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trees className="w-3.5 h-3.5" />
              <span>Tanaman Pangan</span>
            </button>
          </div>

          {/* Kecamatan Dropdown */}
          <select
            value={filterKecamatan}
            onChange={(e) => handleKecamatanChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold text-[11px]"
          >
            <option value="semua">Semua Kecamatan</option>
            {Object.keys(WILAYAH).map(kec => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>

          {/* Kelurahan Dropdown */}
          {filterKecamatan !== 'semua' && (
            <select
              value={filterKelurahan}
              onChange={(e) => setFilterKelurahan(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold text-[11px]"
            >
              <option value="semua">Semua Kelurahan</option>
              {(WILAYAH[filterKecamatan] || []).map(kel => (
                <option key={kel} value={kel}>{kel}</option>
              ))}
            </select>
          )}
        </div>

        {/* OSM Overlay Toggle Button */}
        <button
          onClick={() => setShowOsm(!showOsm)}
          className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-bold shadow-xl transition-all flex items-center gap-1.5 ${
            showOsm
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
          }`}
          title="Tampilkan / Sembunyikan Overlay Jalan & Sungai"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overlay Jalan</span>
        </button>
      </div>

      {/* Main Leaflet Map */}
      <div className="flex-1 w-full h-full relative">
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
            return (
              <Marker
                key={item.id || `kamera-obs-${idx}`}
                position={[Number(item.latitude), Number(item.longitude)]}
                icon={createKameraPinIcon(item)}
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

                    {item.mode === 'pasokan_beras' ? (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Estimasi Pasokan:</span>
                          <b className="text-blue-700">{(item.estimasi_pasokan_kg || 0).toLocaleString('id-ID')} Kg</b>
                        </div>
                        {item.asal_pasokan && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">Asal Pasokan:</span>
                            <b className="text-slate-800">{item.asal_pasokan}</b>
                          </div>
                        )}
                      </div>
                    ) : (
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

                    <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
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

      {/* Floating Bottom Count Badge */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-xl flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>{filteredData.length} Titik Lapangan Terpetakan</span>
      </div>

    </div>
  );
}
