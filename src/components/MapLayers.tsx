"use client";

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import {
  FSVA_COLORS, SKPG_COLORS, BORDA_DESIL_COLORS,
  NO_DATA_COLOR, getFSVACategory
} from '@/lib/ikpg';
import { calculateAllIndicators } from '@/lib/fsva/form1-calculator';
import { calculateFSVAResult } from '@/lib/fsva/composite-score';

/* ─────────── Admin boundary styles ─────────── */
const kecStyle = { color: '#c0392b', weight: 3, fillOpacity: 0, dashArray: '8,4' };
const kelStyle = { color: '#f39c12', weight: 2, fillOpacity: 0, dashArray: '4,3' };

export function getFSVACalculatedResult(row: any) {
  if (!row) return null;
  const input = {
    produksi_padi: parseFloat(row.produksi_gkg || '0'),
    produksi_jagung: parseFloat(row.produksi_jagung || '0'),
    produksi_ubi_kayu: parseFloat(row.produksi_ubi_kayu || '0'),
    produksi_ubi_jalar: parseFloat(row.produksi_ubi_jalar || '0'),
    produksi_sagu: 0,
    produksi_pisang: 0,
    jumlah_penduduk: parseInt(row.penduduk_total || row.penduduk || '1'),
    provinsi: 'Banten',
    konsumsi_energi: parseFloat(row.konsumsi_energi_kkal || '2000'),
    konsumsi_protein: parseFloat(row.konsumsi_protein_gram || '60'),
    cadangan_cbpd: parseFloat(row.cppd_ton || '0'),
    cadangan_lpm: 0,
    pct_miskin: parseFloat(row.rt_miskin_persen || '0'),
    cv_harga_beras: 3.65,
    cv_harga_ayam: 4.2,
    cv_harga_telur: 1.6,
    cv_harga_minyak: 2.7,
    pou: parseFloat(row.pou || '0'),
    lama_sekolah_perempuan: parseFloat(row.perempuan_sekolah_persen || '0'),
    pct_no_water: parseFloat(row.rt_tanpa_air_bersih_persen || '0'),
    skor_pph: parseFloat(row.skor_pph || '0'),
    pct_stunting: parseFloat(row.prevalensi_stunting || '0'),
  };
  const indicators = calculateAllIndicators(input);
  return calculateFSVAResult(indicators);
}

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
            l.bindPopup(`<b style="color:#c0392b">🏛️ Kecamatan: ${f.properties?.name || ''}</b>`);
          }} 
        />
      ))}
    </>
  );
}

/* KelurahanLayer — supports IKPG heatmap */
function getIKPGStyle(
  nama: string,
  activeIKPGLayer: string,
  fsvaData: any[],
  skpgData: any[],
  intervensiData: any[],
  ikpgOpacity: number
) {
  if (!activeIKPGLayer) return kelStyle;

  if (activeIKPGLayer === 'fsva') {
    const row = fsvaData.find(r => r.nama_kelurahan === nama || r.kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    
    // Calculate actual composite FSVA IKP (indeks_komposit) on-the-fly
    const calc = getFSVACalculatedResult(row);
    const ikp = calc ? calc.indeks_komposit : parseFloat(row.ikp || row.skor_pph || '0');
    
    const { k } = getFSVACategory(ikp);
    const c = FSVA_COLORS[k] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'skpg') {
    const row = skpgData.find(r => r.nama_kelurahan === nama || r.kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    const prev = parseFloat(row.prevalensi_gizi_buruk || row.prevalensi_stunting || '0');
    const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
    const c = SKPG_COLORS[cat] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'borda') {
    const row = skpgData.find(r => r.nama_kelurahan === nama || r.kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    
    // Calculate on-the-fly Borda sum ranking using actual composite IKP
    const calculatedFSVA = skpgData.map(item => {
      const calc = getFSVACalculatedResult(item);
      return {
        kelurahan: item.kelurahan,
        ikp: calc ? calc.indeks_komposit : parseFloat(item.ikp || item.skor_pph || '0'),
        prevalensi_stunting: parseFloat(item.prevalensi_stunting || '0')
      };
    });
    
    const fsvaSorted = [...calculatedFSVA].sort((a, b) => a.ikp - b.ikp);
    const skpgSorted = [...calculatedFSVA].sort((a, b) => b.prevalensi_stunting - a.prevalensi_stunting);
    
    const allBordaSums = calculatedFSVA.map(r => {
      const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      return { kelurahan: r.kelurahan, sum: fRank + sRank };
    });
    
    const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
    const bordaRank = sortedSums.findIndex(x => x.kelurahan === row.kelurahan) + 1;
    const total = sortedSums.length;
    
    const desil = Math.min(10, Math.ceil((bordaRank / total) * 10));
    const c = BORDA_DESIL_COLORS[desil] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'intervensi') {
    const row = intervensiData.find(r => r.nama_kelurahan === nama || r.kelurahan === nama);
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: '#cccccc' };
    
    const gpm = parseInt(row.kegiatan_gpm || '0');
    const bantuan = parseInt(row.penerima_bantuan_jiwa || '0');
    
    let c = { fill: '#e2e8f0', border: '#94a3b8' }; // fallback
    if (gpm > 0 && bantuan > 0) {
      c = { fill: '#a855f7', border: '#7e22ce' }; // both (Purple)
    } else if (gpm > 0) {
      c = { fill: '#f59e0b', border: '#d97706' }; // gpm (Orange)
    } else if (bantuan > 0) {
      c = { fill: '#3b82f6', border: '#1d4ed8' }; // bantuan (Blue)
    } else {
      c = { fill: '#10b981', border: '#047857' }; // none (Green / Mandiri)
    }
    
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  
  return kelStyle;
}

export function KelurahanLayer({
  data, activeIKPGLayer, ikpgOpacity = 0.65, fsvaData = [], skpgData = [], intervensiData = []
}: {
  data: any[];
  activeIKPGLayer: string;
  ikpgOpacity?: number;
  fsvaData?: any[];
  skpgData?: any[];
  intervensiData?: any[];
}) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => {
        const nama = f.properties?.name || f.properties?.Name || '';
        const style = getIKPGStyle(nama, activeIKPGLayer, fsvaData, skpgData, intervensiData, ikpgOpacity);
        return (
          <GeoJSON
            key={`kel-${i}-${activeIKPGLayer || 'x'}-${ikpgOpacity}`}
            data={f}
            style={style as any}
            onEachFeature={(f, l) => {
              const namaKel = f.properties?.name || f.properties?.Name || '';
              l.bindTooltip(
                `<span class="ikpg-tooltip-text" style="font-weight:700;color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;white-space:nowrap">${namaKel}</span>`,
                { permanent: true, direction: 'center', className: 'ikpg-kel-label', interactive: false }
              );
              
              // Custom Popup Content
              let popupContent = `<div style="font-family:sans-serif;padding:4px;min-width:180px;">
                <h4 style="margin:0 0 6px 0;color:#1e293b;font-weight:bold;font-size:12px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">🏘️ Kel. ${namaKel}</h4>`;
              
              if (activeIKPGLayer === 'fsva') {
                const row = fsvaData.find(r => r.nama_kelurahan === namaKel || r.kelurahan === namaKel);
                if (row) {
                  const calc = getFSVACalculatedResult(row);
                  const ikp = calc ? calc.indeks_komposit : parseFloat(row.ikp || row.skor_pph || '0');
                  const prioritas = calc ? calc.prioritas : 6;
                  const { k } = getFSVACategory(ikp);
                  const label = k.replace('_', ' ').toUpperCase();
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Indeks Ketahanan Pangan (IKP)</b>: <span style="font-weight:900;color:#0f172a;">${ikp.toFixed(2)}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Prioritas FSVA</b>: <span style="font-weight:900;color:#0f172a;">Prioritas ${prioritas}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Kategori</b>: <span style="font-weight:bold;color:${FSVA_COLORS[k]?.border || '#333'};">${label}</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data FSVA.</p>`;
                }
              } else if (activeIKPGLayer === 'skpg') {
                const row = skpgData.find(r => r.nama_kelurahan === namaKel || r.kelurahan === namaKel);
                if (row) {
                  const prev = parseFloat(row.prevalensi_gizi_buruk || row.prevalensi_stunting || '0');
                  const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
                  const label = cat.toUpperCase();
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Stunting (SKPG)</b>: <span style="font-weight:900;color:#0f172a;">${prev.toFixed(1)}%</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Kategori</b>: <span style="font-weight:bold;color:${SKPG_COLORS[cat]?.border || '#333'};">${label}</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data SKPG.</p>`;
                }
              } else if (activeIKPGLayer === 'borda') {
                const row = skpgData.find(r => r.nama_kelurahan === namaKel || r.kelurahan === namaKel);
                if (row) {
                  const calculatedFSVA = skpgData.map(item => {
                    const calc = getFSVACalculatedResult(item);
                    return {
                      kelurahan: item.kelurahan,
                      ikp: calc ? calc.indeks_komposit : parseFloat(item.ikp || item.skor_pph || '0'),
                      prevalensi_stunting: parseFloat(item.prevalensi_stunting || '0')
                    };
                  });
                  
                  const fsvaSorted = [...calculatedFSVA].sort((a, b) => a.ikp - b.ikp);
                  const skpgSorted = [...calculatedFSVA].sort((a, b) => b.prevalensi_stunting - a.prevalensi_stunting);
                  
                  const fsvaRank = fsvaSorted.findIndex(r => r.kelurahan === row.kelurahan) + 1;
                  const skpgRank = skpgSorted.findIndex(r => r.kelurahan === row.kelurahan) + 1;
                  const bordaSum = fsvaRank + skpgRank;
                  
                  const allBordaSums = calculatedFSVA.map(r => {
                    const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
                    const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
                    return { kelurahan: r.kelurahan, sum: fRank + sRank };
                  });
                  const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
                  const bordaRank = sortedSums.findIndex(x => x.kelurahan === row.kelurahan) + 1;
                  const total = sortedSums.length;
                  const desil = Math.min(10, Math.ceil((bordaRank / total) * 10));
                  
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Skor Borda (Rfsva+Rskpg)</b>: <span style="font-weight:900;color:#0f172a;">${bordaSum}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Peringkat Borda</b>: <span style="font-weight:900;color:#0f172a;">${bordaRank} dari ${total}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Desil Prioritas</b>: <span style="font-weight:bold;color:${BORDA_DESIL_COLORS[desil]?.border || '#333'};">Desil D${desil} ${desil <= 5 ? '(Prioritas)' : '(Tahan)'}</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data Borda.</p>`;
                }
              } else if (activeIKPGLayer === 'intervensi') {
                const row = intervensiData.find(r => r.nama_kelurahan === namaKel || r.kelurahan === namaKel);
                if (row) {
                  const gpm = parseInt(row.kegiatan_gpm || '0');
                  const bantuan = parseInt(row.penerima_bantuan_jiwa || '0');
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;">🎪 <b>Kegiatan GPM</b>: <span style="font-weight:900;color:#0f172a;">${gpm} kegiatan</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;">🌾 <b>Penerima Bantuan Pangan</b>: <span style="font-weight:900;color:#0f172a;">${bantuan.toLocaleString('id-ID')} jiwa</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data intervensi.</p>`;
                }
              }
              
              popupContent += `</div>`;
              l.bindPopup(popupContent);
            }}
          />
        );
      })}
    </>
  );
}
