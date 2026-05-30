"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';
import { Loader2, Layers, MapPin, Navigation, Map, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { FSVA_LEGEND, SKPG_LEGEND } from '@/lib/ikpg';
import { useMap } from 'react-leaflet';

// Dynamically import Leaflet components to avoid SSR errors in Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const KecamatanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KecamatanLayer), { ssr: false });
const KelurahanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KelurahanLayer), { ssr: false });

interface MapUnifiedProps {
  selectedKecamatan: string;
  selectedKelurahan: string;
  selectedYear: number;
  selectedMonth: number;
}

type MapMode = 'fsva' | 'skpg' | 'borda' | 'intervensi';
type BasemapMode = 'light' | 'streets';

// A helper inner component to handle map movements and custom overlay panels
interface MapControllerProps {
  activeLayer: MapMode;
  setActiveLayer: (mode: MapMode) => void;
  opacity: number;
  setOpacity: (val: number) => void;
  basemap: BasemapMode;
  setBasemap: (mode: BasemapMode) => void;
  giziData: any[];
  fsvaMatangData?: any[];
  skpgMatangData?: any[];
  intervensiData: any[];
  isPrinting?: boolean;
}

function MapController({
  activeLayer,
  setActiveLayer,
  opacity,
  setOpacity,
  basemap,
  setBasemap,
  giziData,
  intervensiData,
  isPrinting
}: MapControllerProps) {
  const map = useMap();
  const [expandLayers, setExpandLayers] = useState(false);
  const [expandLegend, setExpandLegend] = useState(false);

  // Dynamically inject zoom-dependent CSS classes to the Leaflet map container
  useEffect(() => {
    if (!map) return;
    
    const updateZoomClass = () => {
      const container = map.getContainer();
      if (!container) return;
      
      // Remove any existing zoom classes
      for (let z = 0; z <= 22; z++) {
        container.classList.remove(`map-zoom-${z}`);
      }
      // Add the current zoom class
      container.classList.add(`map-zoom-${map.getZoom()}`);
    };

    map.on('zoomend', updateZoomClass);
    updateZoomClass(); // Initial execution on mount

    return () => {
      map.off('zoomend', updateZoomClass);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (isPrinting) {
      map.setView([-6.015, 106.012], 10.8);
    }
  }, [isPrinting, map]);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleLocateMe = () => {
    // Smoothly pan and zoom to Cilegon city center
    map.setView([-6.012, 106.028], 13);
  };
  const toggleBasemap = () => {
    setBasemap(basemap === 'light' ? 'streets' : 'light');
  };

  return (
    <>
      {/* 1. FLOATING CASCADE/COLLAPSE PANEL (TOP-LEFT) */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-auto print:hidden">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden w-[185px] transition-all duration-300">
          <button
            onClick={() => setExpandLayers(!expandLayers)}
            className="w-full px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-between text-xs font-black tracking-wider uppercase transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Layer Peta</span>
            </div>
            {expandLayers ? <ChevronUp className="w-4 h-4 animate-bounce" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandLayers && (
            <div className="p-4 space-y-4 transition-all duration-300">
              {/* Layers List */}
              <div className="space-y-3">
                {/* FSVA Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">FSVA</span>
                    <span className="text-[8px] text-slate-400 font-bold mt-0.5">Indeks Ketahanan Pangan</span>
                  </div>
                  <button 
                    onClick={() => setActiveLayer('fsva')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${activeLayer === 'fsva' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'fsva' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* SKPG Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">SKPG</span>
                    <span className="text-[8px] text-slate-400 font-bold mt-0.5">Gizi Balita</span>
                  </div>
                  <button 
                    onClick={() => setActiveLayer('skpg')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${activeLayer === 'skpg' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'skpg' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Prioritas Borda Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">Prioritas</span>
                    <span className="text-[8px] text-slate-400 font-bold mt-0.5">Borda Count Desil</span>
                  </div>
                  <button 
                    onClick={() => setActiveLayer('borda')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${activeLayer === 'borda' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'borda' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* INTERVENSI Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">Intervensi</span>
                    <span className="text-[8px] text-slate-400 font-bold mt-0.5">Distribusi Bantuan & GPM</span>
                  </div>
                  <button 
                    onClick={() => setActiveLayer('intervensi')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${activeLayer === 'intervensi' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'intervensi' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                  <span>Transparansi Peta</span>
                  <span>{opacity}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. FLOATING CONTROL BUTTONS (TOP-RIGHT) */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto flex flex-col gap-2 print:hidden">
        {/* Locate Me */}
        <button
          onClick={handleLocateMe}
          title="Locate Me"
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all active:scale-90"
        >
          <Navigation className="w-4 h-4" />
        </button>

        {/* Map Layers / Basemap switch */}
        <button
          onClick={toggleBasemap}
          title="Toggle Detailed Basemap"
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all active:scale-90"
        >
          <Map className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all active:scale-90 font-bold"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all active:scale-90 font-bold"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* 3. DYNAMIC COLLAPSABLE LEGEND (BOTTOM-RIGHT) */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden w-48 transition-all duration-300">
        <button
          onClick={() => setExpandLegend(!expandLegend)}
          className="w-full px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[9px] font-black tracking-wider uppercase text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Legenda {activeLayer.toUpperCase()}</span>
          </div>
          {expandLegend ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {expandLegend && (
          <div className="p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {activeLayer === 'fsva' && (
              FSVA_LEGEND.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[9px] font-bold">
                  <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                  <span className="text-slate-600">{l.label}</span>
                </div>
              ))
            )}

            {activeLayer === 'skpg' && (
              SKPG_LEGEND.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[9px] font-bold">
                  <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                  <span className="text-slate-600">{l.label}</span>
                </div>
              ))
            )}

            {activeLayer === 'borda' && (
              <div className="space-y-1.5 text-[9px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-red-800 bg-red-600 shrink-0" />
                  <span className="text-slate-600">D1 - D5: Prioritas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-green-800 bg-emerald-600 shrink-0" />
                  <span className="text-slate-600">D6 - D10: Tahan</span>
                </div>
                <p className="text-[7.5px] text-slate-400 font-medium leading-tight pt-1">
                  *Prioritas desil Borda hasil gabungan kerentanan FSVA & SKPG.
                </p>
              </div>
            )}

            {activeLayer === 'intervensi' && (
              <div className="space-y-1.5 text-[9px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-purple-800 bg-purple-500 shrink-0" />
                  <span className="text-slate-600">Bantuan & GPM Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-blue-800 bg-blue-500 shrink-0" />
                  <span className="text-slate-600">Penerima Bantuan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-amber-600 bg-amber-500 shrink-0" />
                  <span className="text-slate-600">GPM Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-emerald-800 bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">Mandiri / Aman</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function MapUnified({
  selectedKecamatan,
  selectedKelurahan,
  selectedYear,
  selectedMonth
}: MapUnifiedProps) {
  const [mounted, setMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapMode>('fsva');
  const [opacity, setOpacity] = useState<number>(75); // transparency state
  const [basemap, setBasemap] = useState<BasemapMode>('streets');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const beforePrint = () => setIsPrinting(true);
    const afterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);
  
  const { layers, loadFromURL, loading: kmzLoading } = useKMZLoader();

  // Supabase Data States
  const [giziData, setGiziData] = useState<any[]>([]);
  const [fsvaMatangData, setFsvaMatangData] = useState<any[]>([]);
  const [skpgMatangData, setSkpgMatangData] = useState<any[]>([]);
  const [intervensiData, setIntervensiData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
  }, [loadFromURL]);

  // Fetch Supabase Data dynamically on year/month change
  useEffect(() => {
    if (!mounted) return;

    async function fetchMapData() {
      setDataLoading(true);
      try {
        // Fetch Gizi & Demografi
        const { data: gizi } = await supabase
          .from('gizi_masyarakat')
          .select('*')
          .eq('tahun', selectedYear);
        setGiziData(gizi || []);

        // Fetch Mature FSVA Dataset
        try {
          const { data: fsvaM } = await supabase
            .from('fsva_matang')
            .select('*')
            .eq('periode', selectedYear);
          setFsvaMatangData(fsvaM || []);
        } catch (e) {
          console.warn('fsva_matang fetch failed:', e);
        }

        // Fetch Mature SKPG Dataset
        try {
          const { data: skpgM } = await supabase
            .from('skpg_matang')
            .select('*')
            .eq('periode', selectedYear);
          setSkpgMatangData(skpgM || []);
        } catch (e) {
          console.warn('skpg_matang fetch failed:', e);
        }

        // Fetch Intervensi & Bantuan
        const { data: intervensi } = await supabase
          .from('intervensi_pangan')
          .select('*')
          .eq('tahun', selectedYear)
          .eq('bulan', selectedMonth);
        setIntervensiData(intervensi || []);

      } catch (err) {
        console.error('Gagal mengambil data peta Supabase:', err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchMapData();
  }, [mounted, selectedYear, selectedMonth]);

  if (!mounted || kmzLoading) {
    return (
      <div className="w-full h-full bg-slate-50 min-h-[350px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs font-semibold">Memuat Batas Wilayah Geospasial...</span>
      </div>
    );
  }

  // Filter map layers visually if specific Kelurahan/Kecamatan is selected
  const getFilteredKelurahanLayers = () => {
    if (!layers.kelurahan) return [];
    if (isPrinting) return layers.kelurahan;
    
    let filtered = [...layers.kelurahan];

    // Filter by Kecamatan if set
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      const KEL_TO_KEC: Record<string, string> = {
        'Cibeber': 'CIBEBER', 'Kedaleman': 'CIBEBER', 'Bulakan': 'CIBEBER', 'Cikerai': 'CIBEBER', 'Karang Asem': 'CIBEBER', 'Kalitimbang': 'CIBEBER',
        'Bagendung': 'CILEGON', 'Ciwedus': 'CILEGON', 'Bendungan': 'CILEGON', 'Ketileng': 'CILEGON', 'Ciwaduk': 'CILEGON',
        'Tamansari': 'PULO MERAK', 'Lebakgede': 'PULO MERAK', 'Mekarsari': 'PULO MERAK', 'Suralaya': 'PULO MERAK',
        'Banjar Negara': 'CIWANDAN', 'Tegal Ratu': 'CIWANDAN', 'Kubangsari': 'CIWANDAN', 'Gunung Sugih': 'CIWANDAN', 'Kepuh': 'CIWANDAN', 'Randakari': 'CIWANDAN',
        'Sukmajaya': 'JOMBANG', 'Jombang Wetan': 'JOMBANG', 'Masigit': 'JOMBANG', 'Panggung Rawi': 'JOMBANG', 'Gedong Dalem': 'JOMBANG',
        'Kotasari': 'GEROGOL', 'Gerogol': 'GEROGOL', 'Rawa Arum': 'GEROGOL', 'Gerem': 'GEROGOL',
        'Ramanuju': 'PURWAKARTA', 'Kotabumi': 'PURWAKARTA', 'Kebon Dalem': 'PURWAKARTA', 'Purwakarta': 'PURWAKARTA', 'Tegal Bunder': 'PURWAKARTA', 'Pabean': 'PURWAKARTA',
        'Warnasari': 'CITANGKIL', 'Deringo': 'CITANGKIL', 'Kebonsari': 'CITANGKIL', 'Taman Baru': 'CITANGKIL', 'Lebak Denok': 'CITANGKIL', 'Samangraya': 'CITANGKIL', 'Citangkil': 'CITANGKIL'
      };

      filtered = filtered.filter(f => {
        const kelName = f.properties?.name || f.properties?.Name || '';
        return KEL_TO_KEC[kelName] === standardKec;
      });
    }

    // Filter by Kelurahan if set
    if (selectedKelurahan !== 'ALL') {
      filtered = filtered.filter(f => {
        const kelName = f.properties?.name || f.properties?.Name || '';
        return kelName === selectedKelurahan;
      });
    }

    return filtered;
  };

  const getFilteredKecamatanLayers = () => {
    if (!layers.kecamatan) return [];
    if (isPrinting) return layers.kecamatan;
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      return layers.kecamatan.filter(f => {
        const kecName = (f.properties?.name || f.properties?.Name || '').toUpperCase();
        return kecName === standardKec;
      });
    }
    return layers.kecamatan;
  };

  const tileUrl = basemap === 'light'
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="relative w-full h-full min-h-[350px] flex flex-col rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
      
      {/* Map Loader Indicator */}
      {dataLoading && (
        <div className="absolute top-16 right-16 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md border border-slate-100 flex items-center gap-1.5 text-[8px] font-black text-slate-600 animate-pulse">
          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          Memproses peta...
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={[-6.015, 106.012]}
          zoom={11.0}
          zoomControl={false}
          className="w-full h-full z-0"
          style={{ background: '#EEF2F6' }}
        >
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <KecamatanLayer data={getFilteredKecamatanLayers()} />
          <KelurahanLayer
            data={getFilteredKelurahanLayers()}
            activeIKPGLayer={activeLayer}
            fsvaData={giziData}
            skpgData={giziData}
            fsvaMatangData={fsvaMatangData}
            skpgMatangData={skpgMatangData}
            intervensiData={intervensiData}
            ikpgOpacity={opacity / 100}
          />

          {/* Inject controller inside the Leaflet context */}
          <MapController 
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
            opacity={opacity}
            setOpacity={setOpacity}
            basemap={basemap}
            setBasemap={setBasemap}
            giziData={giziData}
            fsvaMatangData={fsvaMatangData}
            skpgMatangData={skpgMatangData}
            intervensiData={intervensiData}
            isPrinting={isPrinting}
          />
        </MapContainer>
      </div>
      
    </div>
  );
}
