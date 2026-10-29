"use client";

import React, { useState } from 'react';
import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import {
  hitungEstimasiTahunan,
  hitungManualTahunanKg,
  formatTonTahun,
  LABEL_SUMBER,
  WARNA_KEYAKINAN,
  type Kalibrasi,
  type SatuanFrekuensi,
  type SatuanVolume
} from '@/lib/estimasi-pasokan';
import { AlertTriangle, Calculator, Lock, Save, Loader2, Pencil } from 'lucide-react';

export interface PatchPasokan {
  frekuensi_pasokan_angka: number;
  frekuensi_pasokan_satuan: SatuanFrekuensi;
  volume_pasokan_angka: number;
  volume_pasokan_satuan: SatuanVolume;
  total_pasokan_tahunan_kg: number;
  total_pasokan_tahunan_ton: number;
}

interface Props {
  records: ObservasiRecord[];
  kalibrasi: Kalibrasi;
  canEdit?: (r: ObservasiRecord) => boolean;
  onQuickSave?: (r: ObservasiRecord, patch: PatchPasokan) => Promise<void>;
}

const angkaSaja = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

function InputPasokanInline({
  record,
  onSave,
  onCancel
}: {
  record: ObservasiRecord;
  onSave: (patch: PatchPasokan) => Promise<void>;
  onCancel?: () => void;
}) {
  const [frek, setFrek] = useState(record.frekuensi_pasokan_angka ? String(record.frekuensi_pasokan_angka) : '');
  const [satFrek, setSatFrek] = useState<SatuanFrekuensi>(record.frekuensi_pasokan_satuan || 'minggu');
  const [vol, setVol] = useState(record.volume_pasokan_angka ? String(record.volume_pasokan_angka) : '');
  const [satVol, setSatVol] = useState<SatuanVolume>(record.volume_pasokan_satuan || 'kg');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const preview = hitungManualTahunanKg({
    frekuensi_pasokan_angka: Number(frek),
    frekuensi_pasokan_satuan: satFrek,
    volume_pasokan_angka: Number(vol),
    volume_pasokan_satuan: satVol
  });

  const simpan = async () => {
    if (!preview) { setErr('Isi frekuensi & jumlah'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({
        frekuensi_pasokan_angka: Number(frek),
        frekuensi_pasokan_satuan: satFrek,
        volume_pasokan_angka: Number(vol),
        volume_pasokan_satuan: satVol,
        total_pasokan_tahunan_kg: Math.round(preview),
        total_pasokan_tahunan_ton: Number((preview / 1000).toFixed(3))
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-14 bg-white border border-emerald-300 rounded-md px-1.5 py-1 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400';
  const selectCls = 'bg-emerald-50 border border-emerald-300 rounded-md px-1 py-1 text-[10.5px] font-bold text-slate-700 focus:outline-none cursor-pointer';

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <input inputMode="decimal" value={frek} onChange={(e) => setFrek(angkaSaja(e.target.value))} placeholder="Frek." className={inputCls} aria-label="Frekuensi kiriman" />
        <span className="text-[10px] text-slate-500">×/</span>
        <select value={satFrek} onChange={(e) => setSatFrek(e.target.value as SatuanFrekuensi)} className={selectCls} aria-label="Satuan frekuensi">
          <option value="hari">hari</option>
          <option value="minggu">minggu</option>
          <option value="bulan">bulan</option>
        </select>
        <span className="text-[10px] text-slate-400 mx-0.5">@</span>
        <input inputMode="decimal" value={vol} onChange={(e) => setVol(angkaSaja(e.target.value))} placeholder="Jumlah" className={inputCls} aria-label="Jumlah per kiriman" />
        <select value={satVol} onChange={(e) => setSatVol(e.target.value as SatuanVolume)} className={selectCls} aria-label="Satuan jumlah">
          <option value="kg">kg</option>
          <option value="kwintal">kwintal</option>
          <option value="ton">ton</option>
        </select>
        <button
          type="button"
          onClick={simpan}
          disabled={saving || !preview}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-black disabled:opacity-40 cursor-pointer hover:bg-emerald-700"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-[10px] text-slate-500 underline cursor-pointer px-1">Batal</button>
        )}
      </div>
      <div className="text-[10px] text-slate-500">
        {preview ? <>= <b className="text-indigo-700">{formatTonTahun(preview / 1000)}</b> ({Math.round(preview).toLocaleString('id-ID')} kg/thn)</> : 'Contoh: 2 × / minggu @ 500 kg'}
        {err && <span className="text-rose-600 font-bold ml-2">{err}</span>}
      </div>
    </div>
  );
}

export default function KameraEstimasiTahunanTable({ records, kalibrasi, canEdit, onQuickSave }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = records
    .filter((r) => r.mode === 'pasokan_beras')
    .map((r) => ({ r, e: hitungEstimasiTahunan(r, kalibrasi) }))
    .sort((a, b) => b.e.tahunanKg - a.e.tahunanKg);

  if (rows.length === 0) {
    return <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada titik sarana beras untuk wilayah ini.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-emerald-100">
      <table className="w-full min-w-[760px] text-left text-xs border-collapse">
        <thead>
          <tr className="bg-emerald-50 text-slate-500 text-[10px] uppercase tracking-wider">
            <th className="py-2 px-3 font-bold">Toko / Titik</th>
            <th className="py-2 px-3 font-bold text-right">Stok AI</th>
            <th className="py-2 px-3 font-bold">Frekuensi × Jumlah Pasokan (Manual)</th>
            <th className="py-2 px-3 font-bold text-right">Estimasi / Tahun</th>
            <th className="py-2 px-3 font-bold text-center">Sumber</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100">
          {rows.map(({ r, e }, i) => {
            const bolehEdit = !!onQuickSave && (!canEdit || canEdit(r));
            const adaManual = !!e.manualKg && !!r.frekuensi_pasokan_angka;
            const sedangEdit = editingId === r.id;
            return (
              <tr key={r.id || `est-${i}`} className="align-top hover:bg-emerald-50/50">
                <td className="py-2 px-3">
                  <div className="font-bold text-slate-900 leading-tight">{r.nama_lokasi || r.kategori_label || 'Titik Observasi'}</div>
                  <div className="text-[10px] text-slate-500">{r.kategori_label || r.kategori} • {r.kelurahan}, {r.kecamatan}</div>
                  <div className={`text-[9.5px] font-bold mt-0.5 ${e.isLokal ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {e.isLokal ? '🏠' : '🚚'} {r.asal_pasokan || 'Asal tidak diketahui'}
                  </div>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  {e.stokAiKg ? (
                    <>
                      <div className="font-bold text-amber-700">{e.stokAiKg.toLocaleString('id-ID')} kg</div>
                      <div className="text-[9.5px] text-slate-500" title={e.turnoverTerkalibrasi ? 'Perputaran hasil kalibrasi data lapangan' : 'Perputaran normatif awal'}>
                        × {e.turnover}/thn{e.turnoverTerkalibrasi ? ' ⚙️' : ''}
                      </div>
                    </>
                  ) : <span className="text-slate-400">-</span>}
                </td>
                <td className="py-2 px-3">
                  {adaManual && !sedangEdit ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {r.frekuensi_pasokan_angka}×/{r.frekuensi_pasokan_satuan} @ {r.volume_pasokan_angka} {r.volume_pasokan_satuan}
                      </span>
                      {bolehEdit && (
                        <button type="button" onClick={() => setEditingId(r.id || null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer" title="Ubah isian">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : bolehEdit ? (
                    <InputPasokanInline
                      record={r}
                      onCancel={sedangEdit ? () => setEditingId(null) : undefined}
                      onSave={async (patch) => { await onQuickSave!(r, patch); setEditingId(null); }}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Belum diisi (hanya pendata/Admin)
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <div className="font-black text-indigo-700">{formatTonTahun(e.tahunanTon)}</div>
                  {e.perluVerifikasi && (
                    <div className="text-[9.5px] text-rose-600 font-bold flex items-center justify-end gap-0.5" title={`Rasio manual/AI = ${e.rasio?.toFixed(2)} (di luar 0,33–3)`}>
                      <AlertTriangle className="w-3 h-3" /> Perlu verifikasi
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className="inline-block text-[9.5px] font-black px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                    style={{ color: WARNA_KEYAKINAN[e.keyakinan], borderColor: WARNA_KEYAKINAN[e.keyakinan], background: `${WARNA_KEYAKINAN[e.keyakinan]}14` }}
                  >
                    {LABEL_SUMBER[e.sumber]}
                  </span>
                  <div className="text-[9px] text-slate-500 mt-0.5 capitalize">keyakinan {e.keyakinan.replace('_', ' ')}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-start gap-1.5 px-3 py-2 bg-emerald-50/60 text-[10px] text-slate-600 border-t border-emerald-100">
        <Calculator className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700" />
        <span>
          Estimasi = <b>frekuensi × jumlah × periode/tahun</b> (prioritas). Bila isian manual kosong: <b>stok AI × perputaran stok</b> per jenis sarana (⚙️ = terkalibrasi otomatis dari titik berdata lengkap).
          Isian manual dicek silang dengan AI; rasio di luar 0,33–3 ditandai perlu verifikasi.
        </span>
      </div>
    </div>
  );
}

