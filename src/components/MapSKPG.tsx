"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });
const KecamatanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KecamatanLayer), { ssr: false });
const KelurahanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KelurahanLayer), { ssr: false });

export default function MapSKPG() {
  const [mounted, setMounted] = useState(false);
  const { layers, loadFromURL, loading } = useKMZLoader();
  const [skpgData, setSkpgData] = useState([]);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
    // Simulate fetching SKPG data from Supabase
    supabase.from('gizi_masyarakat').select('*').then(({ data }) => {
      if (data) {
        const mockSkpg = data.map((d: any) => ({
          nama_kelurahan: d.kecamatan, 
          prevalensi_gizi_buruk: d.balita_gizi_buruk
        }));
        setSkpgData(mockSkpg as any);
      }
    });
  }, []);

  if (!mounted || loading) {
    return <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Memuat Peta...</div>;
  }

  return (
    <>
      <MapContainer 
        center={[-6.01, 106.03]} // Rough coordinates for Cilegon/Banten area
        zoom={11} 
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ background: '#F8FAFC' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomControl position="topright" />
        
        <KecamatanLayer data={layers.kecamatan} />
        <KelurahanLayer 
          data={layers.kelurahan} 
          activeIKPGLayer="skpg" 
          skpgData={skpgData} 
        />
      </MapContainer>

      {/* Map Legend Floating */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 z-[1000] text-[10px] font-semibold text-slate-700">
        <div className="flex items-center gap-2 mb-1.5"><span className="w-3 h-3 rounded-sm bg-[#d62828]"></span> Rentan ({'>'}15%)</div>
        <div className="flex items-center gap-2 mb-1.5"><span className="w-3 h-3 rounded-sm bg-[#fcbf49]"></span> Waspada (10-15%)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#2dc653]"></span> Aman ({'<'}10%)</div>
      </div>
    </>
  );
}
