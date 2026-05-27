"use client";

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import {
  FSVA_COLORS, SKPG_COLORS,
  NO_DATA_COLOR, getFSVACategory,
} from '@/lib/ikpg';

/* ─────────── Admin boundary styles ─────────── */
const kecStyle = { color: '#c0392b', weight: 3, fillOpacity: 0, dashArray: '8,4' };
const kelStyle = { color: '#f39c12', weight: 2, fillOpacity: 0, dashArray: '4,3' };

export function KecamatanLayer({ data }: { data: any[] }) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => (
        <GeoJSON 
          key={`kec-${i}`} 
          data={f} 
          style={kecStyle as any} 
          onEachFeature={(f, l) => {
            l.bindPopup(`<b style="color:#c0392b">🏛️ ${f.properties?.name || ''}</b>`);
          }} 
        />
      ))}
    </>
  );
}

/* KelurahanLayer — supports IKPG heatmap */
function getIKPGStyle(nama: string, activeIKPGLayer: string, fsvaData: any[], skpgData: any[], ikpgOpacity: number) {
  if (!activeIKPGLayer) return kelStyle;

  if (activeIKPGLayer === 'fsva') {
    const row = fsvaData.find(r => r.nama_kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const { k } = getFSVACategory(parseFloat(row.ikp || '0'));
    const c = FSVA_COLORS[k] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'skpg') {
    const row = skpgData.find(r => r.nama_kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const prev = parseFloat(row.prevalensi_gizi_buruk || '0');
    const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
    const c = SKPG_COLORS[cat] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  
  return kelStyle;
}

export function KelurahanLayer({
  data, activeIKPGLayer, ikpgOpacity = 0.55, fsvaData = [], skpgData = []
}: {
  data: any[];
  activeIKPGLayer: string;
  ikpgOpacity?: number;
  fsvaData?: any[];
  skpgData?: any[];
}) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => {
        const nama = f.properties?.name || f.properties?.Name || '';
        const style = getIKPGStyle(nama, activeIKPGLayer, fsvaData, skpgData, ikpgOpacity);
        return (
          <GeoJSON
            key={`kel-${i}-${activeIKPGLayer || 'x'}-${ikpgOpacity}`}
            data={f}
            style={style as any}
            onEachFeature={(f, l) => {
              const namaKel = f.properties?.name || '';
              l.bindTooltip(
                `<span style="font-size:11px;font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap">${namaKel}</span>`,
                { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
              );
              l.bindPopup(`<b style="color:#0d9488">🏘️ ${namaKel}</b>`);
            }}
          />
        );
      })}
    </>
  );
}
