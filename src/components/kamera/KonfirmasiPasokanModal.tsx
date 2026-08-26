"use client";

import React, { useState } from 'react';
import { SARANA_DISTRIBUSI_LIST, ASAL_PASOKAN_OPTIONS } from '@/lib/kamera-normatif';
import { WILAYAH } from '@/lib/wilayah';
import { Check, Edit3, MapPin, Sparkles, AlertCircle, Calendar, Clock, Store, ArrowRight, Loader2 } from 'lucide-react';

interface KonfirmasiPasokanModalProps {
  photoPreview: string;
  gpsMeta: {
    lat: number;
    lng: number;
    accuracy?: number;
    kelurahan: string;
    kecamatan: string;
    timestamp: Date;
  };
  aiDraft: any;
  onSave: (finalData: any) => Promise<void>;
  onRetake: () => void;
  isSaving: boolean;
}

export default function KonfirmasiPasokanModal({
  photoPreview,
  gpsMeta,
  aiDraft,
  onSave,
  onRetake,
  isSaving,
}: KonfirmasiPasokanModalProps) {
  const [isEditingManual, setIsEditingManual] = useState(false);

  // Form State
  const [namaLokasi, setNamaLokasi] = useState(aiDraft?.nama_toko || '');
  const [kategoriId, setKategoriId] = useState(aiDraft?.kategori_id || 'toko_beras');
  const [kelurahan, setKelurahan] = useState(gpsMeta.kelurahan || 'Citangkil');
  const [kecamatan, setKecamatan] = useState(gpsMeta.kecamatan || 'Citangkil');
  
  // Data Pasokan
  const [jumlahInput, setJumlahInput] = useState<number | ''>(aiDraft?.perkiraan_jumlah_karung_angka || 10);
  const [satuan, setSatuan] = useState<'karung' | 'kg' | 'ton'>('karung');
  const [ukuranKarungKg, setUkuranKarungKg] = useState<number>(25);
  const [asalPasokan, setAsalPasokan] = useState(aiDraft?.saran_asal_pasokan_default || 'Kabupaten Serang (Banten)');
  const [jenisKemasan, setJenisKemasan] = useState(aiDraft?.ukuran_kemasan_terdeteksi || 'Karung 25 kg & Kemasan 5 kg');
  const [merekBeras, setMerekBeras] = useState(aiDraft?.merek_terbaca || '');
  const [catatanLapangan, setCatatanLapangan] = useState('');

  // Hitung total kg
  const totalKg = Number(
    satuan === 'karung'
      ? (Number(jumlahInput) || 0) * ukuranKarungKg
      : satuan === 'ton'
      ? (Number(jumlahInput) || 0) * 1000
      : Number(jumlahInput) || 0
  );

  const selectedKategori = SARANA_DISTRIBUSI_LIST.find(s => s.id === kategoriId) || SARANA_DISTRIBUSI_LIST[0];

  const handleKecamatanChange = (kec: string) => {
    setKecamatan(kec);
    const kels = WILAYAH[kec] || [];
    if (kels.length > 0) setKelurahan(kels[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPayload = {
      mode: 'pasokan_beras',
      kategori: kategoriId,
      kategori_label: selectedKategori.label,
      nama_lokasi: namaLokasi.trim() || `${selectedKategori.label} (${kelurahan})`,
      latitude: gpsMeta.lat,
      longitude: gpsMeta.lng,
      accuracy_meters: gpsMeta.accuracy,
      kelurahan,
      kecamatan,
      kota: 'Kota Cilegon',
      foto_url: photoPreview,
      foto_watermark_meta: {
        timestamp: gpsMeta.timestamp.toISOString(),
        lat: gpsMeta.lat,
        lng: gpsMeta.lng,
        kelurahan,
        kecamatan
      },
      estimasi_pasokan_kg: totalKg,
      satuan_input: satuan,
      ukuran_karung_kg: satuan === 'karung' ? ukuranKarungKg : undefined,
      jumlah_karung: satuan === 'karung' ? Number(jumlahInput) : undefined,
      asal_pasokan: asalPasokan,
      jenis_kemasan: jenisKemasan,
      merek_beras: merekBeras,
      catatan_lapangan: catatanLapangan,
      ai_analysis_raw: aiDraft,
      ai_confidence: aiDraft?.confidence_score || 0.8,
      ai_detected_objects: [
        aiDraft?.kategori_sarana,
        aiDraft?.estimasi_tumpukan_karung,
        aiDraft?.ukuran_kemasan_terdeteksi
      ].filter(Boolean),
      status_verifikasi: 'terverifikasi_pengguna'
    };

    await onSave(finalPayload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white leading-tight">Konfirmasi Pasokan Beras</h3>
              <p className="text-[10px] text-slate-400">Verifikasi data lapangan & analisis AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 transition-colors"
          >
            Foto Ulang
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* Preview Foto dengan GPS Watermark */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700/80 aspect-[16/10] bg-black group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Foto Lapangan" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 border border-emerald-500/30">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{gpsMeta.lat.toFixed(5)}, {gpsMeta.lng.toFixed(5)}</span>
            </div>
          </div>

          {/* AI Result Card */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Hasil Analisis AI Vision</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Keyakinan: {Math.round((aiDraft?.confidence_score || 0.8) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <p className="text-slate-400 text-[10px]">Prediksi Sarana:</p>
                <p className="font-bold text-white">{aiDraft?.kategori_sarana || selectedKategori.label}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Estimasi Tumpukan (Visual):</p>
                <p className="font-bold text-amber-300">{aiDraft?.estimasi_tumpukan_karung || '± 10 karung'}</p>
              </div>
              {aiDraft?.ukuran_kemasan_terdeteksi && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-[10px]">Kemasan & Merek Terbaca:</p>
                  <p className="text-slate-200">{aiDraft?.ukuran_kemasan_terdeteksi} {aiDraft?.merek_terbaca ? `(${aiDraft.merek_terbaca})` : ''}</p>
                </div>
              )}
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-emerald-500/20 text-[10px] text-emerald-300/80">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Data AI bersifat estimasi visual
              </span>
              <button
                type="button"
                onClick={() => setIsEditingManual(!isEditingManual)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 underline"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingManual ? 'Tutup Koreksi' : 'Koreksi Data'}
              </button>
            </div>
          </div>

          {/* Form Input / Koreksi */}
          <div className="space-y-3 text-left">
            
            {/* Nama Toko / Sarana */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Nama Toko / Outlet / Distributor <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                value={namaLokasi}
                onChange={(e) => setNamaLokasi(e.target.value)}
                placeholder="Contoh: Toko Beras Berkah Jaya, Warung Madura Citangkil"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Jenis Sarana */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Jenis Sarana Distribusi
              </label>
              <select
                value={kategoriId}
                onChange={(e) => setKategoriId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {SARANA_DISTRIBUSI_LIST.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Wilayah: Kecamatan & Kelurahan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kecamatan</label>
                <select
                  value={kecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.keys(WILAYAH).map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kelurahan</label>
                <select
                  value={kelurahan}
                  onChange={(e) => setKelurahan(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {(WILAYAH[kecamatan] || []).map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimasi Pasokan & Satuan */}
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl space-y-2.5">
              <label className="block text-[11px] font-extrabold text-emerald-400">
                Estimasi Pasokan / Stok Beras
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={jumlahInput}
                    onChange={(e) => setJumlahInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Jumlah pasokan..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="karung">Karung</option>
                    <option value="kg">Kg</option>
                    <option value="ton">Ton</option>
                  </select>
                </div>
              </div>

              {satuan === 'karung' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">Ukuran per karung:</span>
                  {[5, 10, 25, 50].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setUkuranKarungKg(size)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-colors ${
                        ukuranKarungKg === size
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {size} kg
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-700/60 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Total Estimasi Pasokan:</span>
                <span className="font-black text-emerald-400 text-sm">
                  {totalKg.toLocaleString('id-ID')} Kg ({ (totalKg / 1000).toFixed(2) } Ton)
                </span>
              </div>
            </div>

            {/* Asal Pasokan Beras */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Asal / Sumber Pasokan Beras
              </label>
              <select
                value={asalPasokan}
                onChange={(e) => setAsalPasokan(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {ASAL_PASOKAN_OPTIONS.map((asal) => (
                  <option key={asal} value={asal}>{asal}</option>
                ))}
              </select>
            </div>

            {/* Catatan Lapangan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Catatan Petugas Lapangan <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <textarea
                rows={2}
                value={catatanLapangan}
                onChange={(e) => setCatatanLapangan(e.target.value)}
                placeholder="Tambahkan informasi penting terkait harga, kelangkaan, atau kondisi toko..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-3">
          <button
            type="button"
            onClick={onRetake}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50"
          >
            Batal / Foto Ulang
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Peta...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Konfirmasi & Simpan ke Peta</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
