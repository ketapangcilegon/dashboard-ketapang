"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';
import { Loader2, Layers, MapPin } from 'lucide-react';
import { FSVA_LEGEND, SKPG_LEGEND, BORDA_LEGEND } from '@/lib/ikpg';

// Dynamically import Leaflet components to avoid SSR errors in Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });
const KecamatanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KecamatanLayer), { ssr: false });
const KelurahanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KelurahanLayer), { ssr: false });

interface MapUnifiedProps {
  selectedKecamatan: string;
  selectedKelurahan: string;
  selectedYear: number;
  selectedMonth: number;
}

type MapMode = 'fsva' | 'skpg' | 'borda' | 'intervensi';

export default function MapUnified({
  selectedKecamatan,
  selectedKelurahan,
  selectedYear,
  selectedMonth
}: MapUnifiedProps) {
  const [mounted, setMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapMode>('fsva');
  const { layers, loadFromURL, loading: kmzLoading } = useKMZLoader();

  // Supabase Data States
  const [giziData, setGiziData] = useState<any[]>([]);
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
      <div className="w-full h-full bg-slate-50 min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs font-semibold">Memuat Batas Wilayah Geospasial...</span>
      </div>
    );
  }

  // Filter map layers visually if specific Kelurahan/Kecamatan is selected
  const getFilteredKelurahanLayers = () => {
    if (!layers.kelurahan) return [];
    
    let filtered = [...layers.kelurahan];

    // Filter by Kecamatan if set
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      // Import mapper or map manually
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
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      return layers.kecamatan.filter(f => {
        const kecName = (f.properties?.name || f.properties?.Name || '').toUpperCase();
        return kecName === standardKec;
      });
    }
    return layers.kecamatan;
  };

  return (
    <div className="relative w-full h-full min-h-[480px] flex flex-col rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
      
      {/* MAP CONTROLS OVERLAY: 4 Jelly-Style Premium Option Buttons */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap gap-2 justify-center pointer-events-none">
        {(['fsva', 'skpg', 'borda', 'intervensi'] as MapMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveLayer(mode)}
            className={`pointer-events-auto px-4 py-2 text-[11px] font-black rounded-lg uppercase tracking-wider transition-all duration-300 shadow-md transform hover:scale-105 active:scale-95 cursor-pointer ${
              activeLayer === mode
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500 shadow-blue-500/20 ring-4 ring-blue-500/20'
                : 'bg-white/90 backdrop-blur-md text-slate-700 hover:text-blue-600 border border-slate-200 hover:bg-white'
            }`}
          >
            {mode === 'fsva' ? 'FSVA' : 
             mode === 'skpg' ? 'SKPG' : 
             mode === 'borda' ? 'MIX (Borda Count)' : 
             'INTERVENSI'}
          </button>
        ))}
      </div>

      {/* Map Loader Indicator */}
      {dataLoading && (
        <div className="absolute top-16 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-slate-600 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          Updating colors...
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={[-6.012, 106.028]} // Centered on Cilegon City
          zoom={11.5}
          zoomControl={false}
          className="w-full h-full z-0"
          style={{ background: '#EEF2F6' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ZoomControl position="bottomleft" />
          
          <KecamatanLayer data={getFilteredKecamatanLayers()} />
          <KelurahanLayer
            data={getFilteredKelurahanLayers()}
            activeIKPGLayer={activeLayer}
            fsvaData={giziData}
            skpgData={giziData}
            intervensiData={intervensiData}
            ikpgOpacity={0.65}
          />
        </MapContainer>
      </div>

      {/* DYNAMIC PREMIUM MAP LEGEND BOX */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-slate-200 z-[1000] text-[10px] font-black text-slate-700 max-h-[220px] overflow-y-auto w-[190px] space-y-2 transition-all duration-300">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-[11px] font-black text-slate-800 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Legenda {activeLayer.toUpperCase()}</span>
        </div>

        <div className="space-y-1.5">
          {activeLayer === 'fsva' && (
            FSVA_LEGEND.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                <span className="text-slate-600 font-semibold">{l.label}</span>
              </div>
            ))
          )}

          {activeLayer === 'skpg' && (
            SKPG_LEGEND.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                <span className="text-slate-600 font-semibold">{l.label}</span>
              </div>
            ))
          )}

          {activeLayer === 'borda' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-red-800 bg-red-600 shrink-0" />
                <span className="text-slate-600 font-bold">D1 - D5: Prioritas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-green-800 bg-emerald-600 shrink-0" />
                <span className="text-slate-600 font-bold">D6 - D10: Tahan</span>
              </div>
              <div className="border-t border-slate-100 pt-1.5 mt-1 text-[8px] text-slate-400 font-semibold leading-relaxed">
                *MIX Borda menggabungkan kerentanan FSVA & SKPG ke desil prioritas intervensi.
              </div>
            </div>
          )}

          {activeLayer === 'intervensi' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-purple-800 bg-purple-500 shrink-0" />
                <span className="text-slate-600 font-semibold">Bantuan & GPM Aktif</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-blue-800 bg-blue-500 shrink-0" />
                <span className="text-slate-600 font-semibold">Penerima Bantuan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-amber-600 bg-amber-500 shrink-0" />
                <span className="text-slate-600 font-semibold">GPM Aktif</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm border border-emerald-800 bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-semibold">Mandiri / Aman</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
