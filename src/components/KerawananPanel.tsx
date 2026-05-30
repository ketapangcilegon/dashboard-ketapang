"use client";

import { HandHelping, Store } from 'lucide-react';
import { WILAYAH } from '@/lib/wilayah';

interface KerawananPanelProps {
  intervensiData: any[];
  selectedKecamatan: string;
  fsvaMatangData?: any[];
  skpgMatangData?: any[];
}

export default function KerawananPanel({ 
  intervensiData = [], 
  selectedKecamatan = 'ALL',
  fsvaMatangData = [],
  skpgMatangData = []
}: KerawananPanelProps) {
  
  // 1. Calculate Borda Ranks & Deciles dynamically to identify priority kelurahans (Desil 1 s.d. Desil 4)
  let priorityKelurahans: string[] = [];
  
  if (fsvaMatangData && fsvaMatangData.length > 0 && skpgMatangData && skpgMatangData.length > 0) {
    const calculatedBorda = skpgMatangData.map(item => {
      const fsvaRow = fsvaMatangData.find(x => x.nama_kelurahan === item.nama_kelurahan);
      const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
      const prev = total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : 0;
      return {
        kelurahan: item.nama_kelurahan,
        ikp: fsvaRow ? parseFloat(fsvaRow.ikp) : 70,
        prevalensi: prev
      };
    });
    
    const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
    const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);
    
    const allBordaSums = calculatedBorda.map(r => {
      const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      return { kelurahan: r.kelurahan, sum: fRank + sRank };
    });
    
    const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
    
    priorityKelurahans = sortedSums
      .map((r, idx) => {
        const rank = idx + 1;
        const desil = Math.min(10, Math.ceil((rank / sortedSums.length) * 10));
        return { kelurahan: r.kelurahan, desil };
      })
      .filter(x => x.desil <= 4)
      .map(x => x.kelurahan);
  } else {
    // High-fidelity fallback default priority kelurahans if mature data is loading
    priorityKelurahans = ['Bagendung', 'Bulakan', 'Cikerai', 'Mekarsari', 'Samangraya', 'Suralaya', 'Tamansari', 'Tegal Ratu'];
  }

  // Filter priority kelurahans by active Kecamatan if selected
  const localPriorityKels = selectedKecamatan === 'ALL'
    ? priorityKelurahans
    : priorityKelurahans.filter(k => (WILAYAH[selectedKecamatan] || []).includes(k));

  const totalLokus = localPriorityKels.length; // Denominator (faktor pembagi)

  // 2. GPM Lokus Calculations
  // Count how many priority kelurahans actually received GPM (gpm > 0 or kegiatan_gpm > 0)
  const activeGpmLokus = localPriorityKels.filter(kelName => {
    const row = intervensiData.find(x => x.nama_kelurahan === kelName || x.kelurahan === kelName);
    const gpmVal = row ? (row.gpm !== undefined ? row.gpm : row.kegiatan_gpm) : 0;
    return gpmVal > 0;
  }).length;

  const gpmPercentage = totalLokus > 0 ? (activeGpmLokus / totalLokus) * 100 : 0;

  // 3. Bantuan Pangan Calculations
  // Sum of beneficiary KPM families inside target priority kelurahans (Desil 1 s.d. Desil 4)
  const activeKPM = localPriorityKels.reduce((sum, kelName) => {
    const row = intervensiData.find(x => x.nama_kelurahan === kelName || x.kelurahan === kelName);
    const val = row ? (row.bantuan_pangan !== undefined ? row.bantuan_pangan : row.penerima_bantuan_jiwa) : 0;
    return sum + (val || 0);
  }, 0);

  // Sum of beneficiary families across ALL kelurahans in active scope (kecamatan or city-wide)
  const totalKPM = intervensiData.reduce((sum, row) => {
    const val = row.bantuan_pangan !== undefined ? row.bantuan_pangan : row.penerima_bantuan_jiwa;
    return sum + (val || 0);
  }, 0) || 34769; // Default fallback to city-wide Jan 2026 total KPM if empty

  const bantuanPercentage = totalKPM > 0 ? (activeKPM / totalKPM) * 100 : 100;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#E2F1FF] to-[#D1FAE5] p-4 rounded-xl shadow-sm border border-[#A7F3D0]/60 text-slate-800 justify-between relative overflow-hidden">
      {/* Subtle ambient circle inside background */}
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/40 blur-xl pointer-events-none"></div>

      {/* Header */}
      <div className="z-10 text-left">
        <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none">Intervensi</h4>
        <h3 className="text-xs font-bold text-teal-950 mt-1 leading-tight">Penanganan Kerawanan</h3>
      </div>

      {/* GPM Section */}
      <div className="z-10 flex flex-col gap-1 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="text-[10px] font-bold text-slate-700">GPM Lokus</span>
          </div>
          <span className="text-[10px] font-black text-teal-700">{gpmPercentage.toFixed(1)}%</span>
        </div>
        <div>
          <div className="text-[11px] font-black text-slate-800">
            {activeGpmLokus} <span className="font-medium text-slate-500">dari</span> {totalLokus} <span className="font-medium text-slate-500">lokus (D1-D4)</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full bg-slate-200/80 rounded-full h-2 mt-1 overflow-hidden border border-slate-300/30">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${gpmPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Bantuan Pangan Section */}
      <div className="z-10 flex flex-col gap-1 mt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <HandHelping className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="text-[10px] font-bold text-slate-700">Bantuan Pangan</span>
          </div>
          <span className="text-[10px] font-black text-teal-700">{bantuanPercentage.toFixed(1)}%</span>
        </div>
        <div>
          <div className="text-[11px] font-black text-slate-800 truncate">
            {activeKPM.toLocaleString('id-ID')} <span className="font-medium text-slate-500">dari</span> {totalKPM.toLocaleString('id-ID')} <span className="font-medium text-slate-500">KPM</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full bg-slate-200/80 rounded-full h-2 mt-1 overflow-hidden border border-slate-300/30">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${bantuanPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-10 mt-3 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[8px] font-bold text-slate-500 leading-tight">
        <span>TA 2026</span>
        <span>Sumber: APBD & APBN</span>
      </div>
    </div>
  );
}
