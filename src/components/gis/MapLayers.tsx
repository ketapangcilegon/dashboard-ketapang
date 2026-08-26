"use client";

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

const GeoJSONComp: any = GeoJSON;

import {
  FSVA_COLORS, SKPG_COLORS, BORDA_DESIL_COLORS,
  NO_DATA_COLOR, getFSVACategory,
} from '@/lib/ikpg';

/* ─────────── Admin boundary styles ─────────── */
const kecStyle = { color: '#c0392b', weight: 3, fillOpacity: 0, dashArray: '8,4' };
const kelStyle = { color: '#f39c12', weight: 2, fillOpacity: 0, dashArray: '4,3' };

export function KecamatanLayer({
  data,
  onEachFeature,
}: {
  data: any[];
  onEachFeature?: (feature: any, layer: L.Layer) => void;
}) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => (
        <GeoJSONComp
          key={`kec-${i}`}
          data={f}
          style={kecStyle as any}
          onEachFeature={onEachFeature || ((feat, l) => {
            const name = feat.properties?.name || feat.properties?.Name || '';
            l.bindPopup(`
              <div style="font-family:system-ui;font-size:12px;padding:4px 0">
                <b style="color:#c0392b">🏛️ Kecamatan: ${name}</b>
              </div>
            `);
          })}
        />
      ))}
    </>
  );
}

/* KelurahanLayer — supports IKPG heatmap */
function getIKPGStyle(nama: string, activeIKPGLayer?: string, fsvaData: any[] = [], skpgData: any[] = [], ikpgOpacity: number = 0.65) {
  if (!activeIKPGLayer) return kelStyle;

  if (activeIKPGLayer === 'fsva') {
    const row = fsvaData.find(r => (r.nama_kelurahan || r.kelurahan) === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const { k } = getFSVACategory(parseFloat(row.ikp || '0'));
    const c = FSVA_COLORS[k] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'skpg') {
    const row = skpgData.find(r => (r.nama_kelurahan || r.kelurahan) === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const prev = parseFloat(row.prevalensi_gizi_buruk || row.prevalensi_stunting || '0');
    const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
    const c = SKPG_COLORS[cat] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'borda') {
    const row = skpgData.find(r => (r.nama_kelurahan || r.kelurahan) === nama);
    if (!row?.borda_sum) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const sorted = [...skpgData].filter(r => r.borda_sum).sort((a, b) => a.borda_sum - b.borda_sum);
    const rank = sorted.findIndex(r => (r.nama_kelurahan || r.kelurahan) === nama) + 1;
    const total = sorted.length;
    const desil = Math.min(10, Math.ceil((rank / total) * 10));
    const c = BORDA_DESIL_COLORS[desil] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  return kelStyle;
}

export function KelurahanLayer({
  data,
  onEachFeature,
  activeIKPGLayer,
  ikpgOpacity = 0.65,
  fsvaData = [],
  skpgData = [],
  activeKelNames = [],
}: {
  data: any[];
  onEachFeature?: (feature: any, layer: L.Layer) => void;
  activeIKPGLayer?: string;
  ikpgOpacity?: number;
  fsvaData?: any[];
  skpgData?: any[];
  activeKelNames?: string[];
}) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => {
        const nama = f.properties?.name || f.properties?.Name || '';
        const style = getIKPGStyle(nama, activeIKPGLayer, fsvaData, skpgData, ikpgOpacity);
        return (
          <GeoJSONComp
            key={`kel-${i}-${activeKelNames.join()}-${activeIKPGLayer || 'x'}-${ikpgOpacity}`}
            data={f}
            style={style as any}
            onEachFeature={onEachFeature || ((feat, l) => {
              const name = feat.properties?.name || feat.properties?.Name || '';
              l.bindTooltip(
                `<span class="ikpg-tooltip-text" style="font-weight:800;color:#ffffff;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap;pointer-events:none;">${name}</span>`,
                { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
              );
              l.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;padding:4px 0">
                  <b style="color:#f39c12">📍 Kelurahan: ${name}</b>
                </div>
              `);
            })}
          />
        );
      })}
    </>
  );
}

export function SawahLayer({
  data,
  showSawah = true,
  getStyle,
  onEachFeature,
  sawahStatus,
  fillOpacity = 0.50,
}: {
  data: any[];
  showSawah?: boolean;
  getStyle?: (feature: any) => L.PathOptions;
  onEachFeature?: (feature: any, layer: L.Layer) => void;
  sawahStatus?: Record<string, any>;
  fillOpacity?: number;
}) {
  if (!showSawah || !data?.length) return null;

  const defaultSawahStyle = (feature: any): L.PathOptions => {
    const sid = feature._id || feature.properties?.name || feature.properties?.Name || '';
    const st = sawahStatus?.[sid]?.status;
    let fillColor = '#4ade80'; // Hijau muda cerah (terang)
    let color = '#22c55e';     // Garis hijau muda menyala & kontras
    if (st === 'bera') {
      fillColor = '#fef08a';
      color = '#f59e0b';
    } else if (st === 'siap_panen') {
      fillColor = '#fde047';
      color = '#eab308';
    }
    return {
      color,
      weight: 1.8,
      fillColor,
      fillOpacity: fillOpacity ?? 0.50,
    };
  };

  return (
    <>
      {data.map((f, i) => (
        <GeoJSONComp
          key={`sawah-${f._id || i}-${JSON.stringify(sawahStatus?.[f._id] || {})}-${fillOpacity}`}
          data={f}
          style={(getStyle ? getStyle(f) : defaultSawahStyle(f)) as any}
          onEachFeature={onEachFeature || ((feat, l) => {
            const name = feat.properties?.name || feat.properties?.Name || `Petak Sawah #${i + 1}`;
            const luas = feat.properties?.luas_m2 ? `${(feat.properties.luas_m2 / 10000).toFixed(2)} Ha` : '';
            l.bindPopup(`
              <div style="font-family:system-ui;font-size:12px;padding:4px 0">
                <b style="color:#166534">🌾 ${name}</b>
                ${luas ? `<br/><span style="color:#475569">📐 Luas: ${luas}</span>` : ''}
              </div>
            `);
          })}
        />
      ))}
    </>
  );
}

/* ─────────── Icon helper ─────────── */
export const makeIcon = (emoji: string, bgColor: string, size: number = 26) =>
  L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bgColor};border:2px solid #fff;border-radius:50% 50% 50% 0;transform: scale(var(--pin-scale, 1)) rotate(-45deg);transform-origin:bottom left;box-shadow:0 2px 6px rgba(0,0,0,0.4);transition:transform 0.25s ease-out;"><span style="transform:rotate(45deg);font-size:${Math.round(size * 0.5)}px">${emoji}</span></div>`,
  });

/* ─────────── Pin layers — all use `show` prop ─────────── */
export function HortiPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('🌶️', '#52b788');
  return (
    <>
      {data.map((p, i) => (
        <GeoJSONComp
          key={`horti-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng || p.lng, p._lat || p.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#52b788">🌶️ ${p._name || p.nama_pemilik || p.komoditas || 'Hortikultura'}</b><br/>${p._komoditas || p.komoditas || ''} ${p._pemilik || p.nama_pemilik ? '· 👤 ' + (p._pemilik || p.nama_pemilik) : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function PalawijaPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('🌿', '#74c69d');
  return (
    <>
      {data.map((p, i) => (
        <GeoJSONComp
          key={`palawija-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng || p.lng, p._lat || p.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#74c69d">🌿 ${p._name || p.nama_pemilik || p.komoditas || 'Palawija'}</b><br/>${p._komoditas || p.komoditas || ''} ${p._pemilik || p.nama_pemilik ? '· 👤 ' + (p._pemilik || p.nama_pemilik) : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function PoktanPins({
  data,
  showPoktan = true,
  showKWT = true,
  showGapoktan = true,
}: {
  data: any[];
  showPoktan?: boolean;
  showKWT?: boolean;
  showGapoktan?: boolean;
}) {
  if (!data?.length) return null;

  const ICONS = {
    Poktan: makeIcon('👨🌾', '#2d6a4f'),
    KWT: makeIcon('👩🌾', '#b5003a'),
    Gapoktan: makeIcon('🤝', '#1a4fa0'),
  };

  return (
    <>
      {data.map((p, i) => {
        const jenis = p._jenis || p.jenis || 'Poktan';
        const vis = jenis === 'KWT' ? showKWT : jenis === 'Gapoktan' ? showGapoktan : showPoktan;
        if (!vis) return null;
        const icon = (ICONS as any)[jenis] || ICONS.Poktan;
        return (
          <GeoJSONComp
            key={`poktan-${i}`}
            data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [p._lng || p.lng, p._lat || p.lat] }, properties: {} } as any}
            pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
            onEachFeature={(_: any, l: any) =>
              l.bindPopup(
                `<b style="color:#2d6a4f">${jenis === 'KWT' ? '👩🌾' : jenis === 'Gapoktan' ? '🤝' : '👨🌾'} ${p._name || p.nama_poktan}</b><br/>${jenis} ${p._ketua || p.nama_ketua ? '· Ketua: ' + (p._ketua || p.nama_ketua) : ''} ${p._kelurahan || p.kelurahan ? '<br/>🏘️ ' + (p._kelurahan || p.kelurahan) : ''}`
              )
            }
          />
        );
      })}
    </>
  );
}

export function WarningPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('⚠️', '#e63946');
  return (
    <>
      {data.map((w, i) => (
        <GeoJSONComp
          key={`warning-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [w._lng || w.lng, w._lat || w.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#e63946">⚠️ ${w._name || w.nama_opt || w.jenis_warning || 'Warning'}</b><br/>${w._jenis || ''} ${w._opt || w.nama_opt ? '· 🐛 ' + (w._opt || w.nama_opt) : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function KolamPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  return (
    <>
      {data.filter(k => k.geometry || (k.lat && k.lng)).map((k, i) => {
        const icon = makeIcon('🐟', '#0096c7');
        const coords = k.geometry ? undefined : [k.lng, k.lat];
        const geoData = k.geometry ? k : { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: {} };
        return (
          <GeoJSONComp
            key={`kolam-${i}`}
            data={geoData}
            style={{ color: '#0096c7', weight: 2.5, fillColor: '#0096c7', fillOpacity: 0.25 }}
            pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
            onEachFeature={(_: any, l: any) =>
              l.bindPopup(
                `<b style="color:#0096c7">🐟 ${k._name || k.nama_pemilik || 'Kolam Budidaya'}</b><br/>${k._pemilik || k.nama_pemilik ? '👤 ' + (k._pemilik || k.nama_pemilik) + '<br/>' : ''}🐠 ${k._jenis_ikan || k.jenis_ikan || '—'}<br/>📐 ${k._luas || k.luas_m2 || '—'} m² · ${k._status || k.status || k.status_kolam || 'Aktif'}`
              )
            }
          />
        );
      })}
    </>
  );
}

export function NelayanPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('⛵', '#2ec4b6', 28);
  return (
    <>
      {data.map((n, i) => (
        <GeoJSONComp
          key={`nelayan-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [n._lng || n.lng, n._lat || n.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#2ec4b6">⛵ ${n._name || n.nama_nelayan}</b><br/>${n._alat || n.alat_tangkap ? '🎣 ' + (n._alat || n.alat_tangkap) + '<br/>' : ''}${n._jenis_ikan || n.jenis_ikan ? '🐟 ' + (n._jenis_ikan || n.jenis_ikan) + '<br/>' : ''}${n._perahu || n.perahu ? 'Perahu: ' + (typeof (n._perahu || n.perahu) === 'object' ? JSON.stringify(n._perahu || n.perahu) : (n._perahu || n.perahu)) : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function KolamDBPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('🐟', '#0096c7');
  return (
    <>
      {data.filter(r => r.lat && r.lng).map((r, i) => (
        <GeoJSONComp
          key={`kolam-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#0096c7">🐟 ${r.nama_pemilik || 'Kolam Budidaya'}</b><br/>🐠 ${r.jenis_ikan || '—'}<br/>📐 ${r.luas_m2 ? r.luas_m2 + ' m²' : '—'} · ${r.status || r.status_kolam || 'Aktif'}`
            )
          }
        />
      ))}
    </>
  );
}

export function NelayanDBPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('⛵', '#2ec4b6', 28);
  return (
    <>
      {data.filter(r => r.lat && r.lng && r.lat !== 0).map((r, i) => (
        <GeoJSONComp
          key={`nelayan-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#2ec4b6">⛵ ${r.nama_nelayan || '—'}</b><br/>🎣 ${r.alat_tangkap || '—'}<br/>📍 ${r.kelurahan || 'Pesisir Cilegon'}`
            )
          }
        />
      ))}
    </>
  );
}

export function PoktanDBPins({
  data,
  showPoktan = true,
  showKWT = true,
  showGapoktan = true,
}: {
  data: any[];
  showPoktan?: boolean;
  showKWT?: boolean;
  showGapoktan?: boolean;
}) {
  if (!data?.length) return null;
  const ICONS = {
    Poktan: makeIcon('👨🌾', '#2d6a4f'),
    KWT: makeIcon('👩🌾', '#b5003a'),
    Gapoktan: makeIcon('🤝', '#1a4fa0'),
  };
  return (
    <>
      {data.filter(r => r.lat && r.lng && r.lat !== 0).map((r, i) => {
        const jenis = r.jenis || 'Poktan';
        const vis = jenis === 'KWT' ? showKWT : jenis === 'Gapoktan' ? showGapoktan : showPoktan;
        if (!vis) return null;
        const icon = (ICONS as any)[jenis] || ICONS.Poktan;
        const produk = r.produk_unggulan ? `<br/>🌾 ${r.produk_unggulan}` : '';
        const status = r.status_aktif ? `<br/><span style="color:${r.status_aktif === 'Aktif' ? '#2d6a4f' : '#888'}">${r.status_aktif}</span>` : '';
        return (
          <GeoJSONComp
            key={`poktan-db-${i}`}
            data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: {} } as any}
            pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
            onEachFeature={(_: any, l: any) =>
              l.bindPopup(
                `<b style="color:#2d6a4f">${jenis === 'KWT' ? '👩🌾' : jenis === 'Gapoktan' ? '🤝' : '👨🌾'} ${r.nama_poktan}</b><br/>${jenis}${r.nama_ketua ? ' · Ketua: ' + r.nama_ketua : ''}${r.kelurahan ? '<br/>🏘️ ' + r.kelurahan : ''}${produk}${status}`
              )
            }
          />
        );
      })}
    </>
  );
}

export function HortiDBPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('🌶️', '#52b788');
  return (
    <>
      {data.filter(r => (r.lat && (r.lon || r.lng))).map((r, i) => (
        <GeoJSONComp
          key={`horti-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon || r.lng, r.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#52b788">🌶️ ${r.nama_pemilik || r.komoditas || 'Hortikultura'}</b><br/>${r.komoditas || ''}${r.tanggal_tanam ? '<br/>📅 Tanam: ' + r.tanggal_tanam : ''}${r.prediksi_panen ? '<br/>🌾 Est. Panen: ' + r.prediksi_panen : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function PalawijaDBPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('🌿', '#74c69d');
  return (
    <>
      {data.filter(r => r.lat && (r.lon || r.lng) && r.lat !== 0).map((r, i) => (
        <GeoJSONComp
          key={`palawija-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon || r.lng, r.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#74c69d">🌿 ${r.nama_pemilik || r.komoditas || 'Palawija'}</b><br/>${r.komoditas || ''}${r.tanggal_tanam ? '<br/>📅 Tanam: ' + r.tanggal_tanam : ''}${r.prediksi_panen ? '<br/>🌾 Est. Panen: ' + r.prediksi_panen : ''}`
            )
          }
        />
      ))}
    </>
  );
}

export function WarningDBPins({ data, show = true }: { data: any[]; show?: boolean }) {
  if (!show || !data?.length) return null;
  const icon = makeIcon('⚠️', '#e63946');
  return (
    <>
      {data.filter(r => r.lat && r.lat !== 0).map((r, i) => (
        <GeoJSONComp
          key={`warning-db-${i}`}
          data={{ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng || r.lon, r.lat] }, properties: {} } as any}
          pointToLayer={(_: any, ll: any) => L.marker(ll, { icon })}
          onEachFeature={(_: any, l: any) =>
            l.bindPopup(
              `<b style="color:#e63946">⚠️ ${r.nama_opt || r.jenis_warning || 'Warning'}</b><br/>📍 ${r.kelurahan || '—'}${r.luas_terdampak ? '<br/>Luas: ' + r.luas_terdampak + ' ' + (r.satuan_luas || 'Ha') : ''}`
            )
          }
        />
      ))}
    </>
  );
}
