"use client";

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import {
  FSVA_COLORS, SKPG_COLORS, BORDA_DESIL_COLORS,
  NO_DATA_COLOR, getFSVACategory
} from '@/lib/ikpg';
import { calculateAllIndicators } from '@/lib/fsva/form1-calculator';
import { calculateFSVAResult } from '@/lib/fsva/composite-score';
import { isKelurahanMatch } from '@/lib/wilayah';

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
  fsvaMatangData: any[],
  skpgMatangData: any[],
  intervensiData: any[],
  ikpgOpacity: number
) {
  if (!activeIKPGLayer) return kelStyle;

  if (activeIKPGLayer === 'fsva') {
    const row = fsvaMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, nama));
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    
    const ikp = parseFloat(row.ikp || '0');
    const { k } = getFSVACategory(ikp);
    const c = FSVA_COLORS[k] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'skpg') {
    const row = skpgMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, nama));
    if (!row) {
      // Fallback to raw stunting
      const fallbackRow = skpgData.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, nama));
      if (!fallbackRow) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
      const prev = parseFloat(fallbackRow.prevalensi_gizi_buruk || fallbackRow.prevalensi_stunting || '0');
      const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
      const c = SKPG_COLORS[cat] || NO_DATA_COLOR;
      return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
    }
    const total = (row.gizi_kurang || 0) + (row.gizi_sangat_kurang || 0) + (row.gizi_normal || 0) + (row.gizi_berlebih || 0);
    const prev = total > 0 ? ((row.gizi_kurang || 0) + (row.gizi_sangat_kurang || 0)) / total * 100 : 0;
    const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
    const c = SKPG_COLORS[cat] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'borda') {
    const row = skpgMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, nama));
    if (!row) return { ...kelStyle, fillOpacity: 0.1, fillColor: NO_DATA_COLOR.fill };
    
    // Calculate Borda rank using exact mature data
    const calculatedBorda = skpgMatangData.map(item => {
      const fsvaRow = fsvaMatangData?.find(x => isKelurahanMatch(x.nama_kelurahan || x.kelurahan, item.nama_kelurahan || item.kelurahan));
      const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
      const prev = item.prevalensiRataRata !== undefined 
        ? item.prevalensiRataRata 
        : (total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : 0);
      return {
        kelurahan: item.nama_kelurahan || item.kelurahan,
        ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
        prevalensi: prev
      };
    });
    
    const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
    const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);
    
    const allBordaSums = calculatedBorda.map(r => {
      const fRank = fsvaSorted.findIndex(x => isKelurahanMatch(x.kelurahan, r.kelurahan)) + 1;
      const sRank = skpgSorted.findIndex(x => isKelurahanMatch(x.kelurahan, r.kelurahan)) + 1;
      return { kelurahan: r.kelurahan, sum: fRank + sRank };
    });
    
    const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
    const bordaRank = sortedSums.findIndex(x => isKelurahanMatch(x.kelurahan, row.nama_kelurahan || row.kelurahan)) + 1;
    const total = sortedSums.length;
    
    const desil = Math.min(10, Math.ceil((bordaRank / total) * 10));
    const c = BORDA_DESIL_COLORS[desil] || NO_DATA_COLOR;
    return { color: c.border, weight: 1.5, fillColor: c.fill, fillOpacity: ikpgOpacity };
  }
  if (activeIKPGLayer === 'intervensi') {
    // sementara peta intervensi dihapus saja (disabled)
    return { color: '#cbd5e1', weight: 1.2, fillColor: '#f8fafc', fillOpacity: 0.15 };
  }
  
  return kelStyle;
}

export function KelurahanLayer({
  data, activeIKPGLayer, ikpgOpacity = 0.65, fsvaData = [], skpgData = [],
  fsvaMatangData = [], skpgMatangData = [], intervensiData = [],
  selectedYear = 2026, selectedMonth = 1
}: {
  data: any[];
  activeIKPGLayer: string;
  ikpgOpacity?: number;
  fsvaData?: any[];
  skpgData?: any[];
  fsvaMatangData?: any[];
  skpgMatangData?: any[];
  intervensiData?: any[];
  selectedYear?: number;
  selectedMonth?: number;
}) {
  if (!data?.length) return null;
  return (
    <>
      {data.map((f, i) => {
        const nama = f.properties?.name || f.properties?.Name || '';
        const style = getIKPGStyle(nama, activeIKPGLayer, fsvaData, skpgData, fsvaMatangData, skpgMatangData, intervensiData, ikpgOpacity);
        return (
          <GeoJSON
            key={`kel-${i}-${activeIKPGLayer || 'x'}-${ikpgOpacity}-${selectedYear}-${selectedMonth}-${fsvaMatangData.length}-${skpgMatangData.length}-${intervensiData.length}`}
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
                const row = fsvaMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, namaKel));
                if (row) {
                  const ikp = parseFloat(row.ikp || '0');
                  const { k } = getFSVACategory(ikp);
                  // Calculate raw priorities (1-6) from cutoff desils
                  const prioritas = ikp < 46.37 ? 1 : ikp < 53.95 ? 2 : ikp < 61.83 ? 3 : ikp < 69.71 ? 4 : ikp < 77.29 ? 5 : 6;
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
                const row = skpgMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, namaKel));
                if (row) {
                  const total = (row.gizi_kurang || 0) + (row.gizi_sangat_kurang || 0) + (row.gizi_normal || 0) + (row.gizi_berlebih || 0);
                  const prev = total > 0 ? ((row.gizi_kurang || 0) + (row.gizi_sangat_kurang || 0)) / total * 100 : 0;
                  const cat = prev > 15 ? 'rentan' : prev >= 10 ? 'waspada' : 'aman';
                  const label = cat.toUpperCase();
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Gizi Kurang (SKPG)</b>: <span style="font-weight:900;color:#0f172a;">${row.gizi_kurang} balita</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Gizi Sangat Kurang</b>: <span style="font-weight:900;color:#0f172a;">${row.gizi_sangat_kurang} balita</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Rasio Kerawanan Gizi</b>: <span style="font-weight:900;color:#0f172a;">${prev.toFixed(2)}%</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Kategori</b>: <span style="font-weight:bold;color:${SKPG_COLORS[cat]?.border || '#333'};">${label}</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data SKPG.</p>`;
                }
              } else if (activeIKPGLayer === 'borda') {
                const row = skpgMatangData?.find(r => isKelurahanMatch(r.nama_kelurahan || r.kelurahan, namaKel));
                if (row) {
                  const calculatedBorda = skpgMatangData.map(item => {
                    const fsvaRow = fsvaMatangData?.find(x => isKelurahanMatch(x.nama_kelurahan || x.kelurahan, item.nama_kelurahan || item.kelurahan));
                    const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
                    const prev = item.prevalensiRataRata !== undefined 
                      ? item.prevalensiRataRata 
                      : (total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : 0);
                    return {
                      kelurahan: item.nama_kelurahan || item.kelurahan,
                      ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
                      prevalensi: prev
                    };
                  });
                  
                  const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
                  const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);
                  
                  const fsvaRank = fsvaSorted.findIndex(r => isKelurahanMatch(r.kelurahan, row.nama_kelurahan || row.kelurahan)) + 1;
                  const skpgRank = skpgSorted.findIndex(r => isKelurahanMatch(r.kelurahan, row.nama_kelurahan || row.kelurahan)) + 1;
                  const bordaSum = fsvaRank + skpgRank;
                  
                  const allBordaSums = calculatedBorda.map(r => {
                    const fRank = fsvaSorted.findIndex(x => isKelurahanMatch(x.kelurahan, r.kelurahan)) + 1;
                    const sRank = skpgSorted.findIndex(x => isKelurahanMatch(x.kelurahan, r.kelurahan)) + 1;
                    return { kelurahan: r.kelurahan, sum: fRank + sRank };
                  });
                  const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
                  const bordaRank = sortedSums.findIndex(x => isKelurahanMatch(x.kelurahan, row.nama_kelurahan || row.kelurahan)) + 1;
                  const total = sortedSums.length;
                  const desil = Math.min(10, Math.ceil((bordaRank / total) * 10));
                  
                  const targetKel = calculatedBorda.find(x => isKelurahanMatch(x.kelurahan, row.nama_kelurahan || row.kelurahan || namaKel));
                  const prevVal = targetKel ? targetKel.prevalensi : 0;
                  
                  popupContent += `
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Rerata Prevalensi Gizi Buruk</b>: <span style="font-weight:900;color:#0f172a;">${prevVal.toFixed(2)}%</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Skor Borda (Rfsva+Rskpg)</b>: <span style="font-weight:900;color:#0f172a;">${bordaSum}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Peringkat Borda</b>: <span style="font-weight:900;color:#0f172a;">${bordaRank} dari ${total}</span></p>
                    <p style="margin:4px 0;font-size:11px;color:#475569;"><b>Desil Prioritas</b>: <span style="font-weight:bold;color:${BORDA_DESIL_COLORS[desil]?.border || '#333'};">Desil D${desil} ${desil <= 5 ? '(Prioritas)' : '(Tahan)'}</span></p>
                  `;
                } else {
                  popupContent += `<p style="margin:4px 0;font-size:11px;color:#94a3b8;">Tidak ada data Borda.</p>`;
                }
              } else if (activeIKPGLayer === 'intervensi') {
                popupContent += `
                  <p style="margin:4px 0;font-size:11px;color:#64748b;font-weight:bold;">📍 Kelurahan: ${namaKel}</p>
                  <p style="margin:4px 0;font-size:11px;color:#94a3b8;font-style:italic;">Data intervensi spasial (GPM & B2SA) menyusul.</p>
                `;
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
