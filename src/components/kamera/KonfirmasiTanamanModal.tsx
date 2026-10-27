import React, { useState, useMemo } from 'react';
import { TANAMAN_PANGAN_LIST, hitungEstimasiProduksiNormatif, haversineDistanceMeters } from '@/lib/kamera-normatif';
import { WILAYAH } from '@/lib/wilayah';
import { Check, Edit3, MapPin, Sparkles, AlertCircle, AlertTriangle, Leaf, Trees, ArrowRight, Loader2, Calculator } from 'lucide-react';

interface KonfirmasiTanamanModalProps {
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
  existingObservations?: any[];
  onSave: (finalData: any) => Promise<void>;
  onRetake: () => void;
  isSaving: boolean;
}

export default function KonfirmasiTanamanModal({
  photoPreview,
  gpsMeta,
  aiDraft,
  existingObservations = [],
  onSave,
  onRetake,
  isSaving,
}: KonfirmasiTanamanModalProps) {
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [isConfirmedDistinct, setIsConfirmedDistinct] = useState(false);

  // Algoritma Deteksi Proximity / Kemiripan Titik GPS Pin Eksisting (Radius <= 80m)
  const nearbyPin = useMemo(() => {
    if (!existingObservations || existingObservations.length === 0 || !gpsMeta?.lat || !gpsMeta?.lng) return null;
    let closest: { obs: any; distMeters: number } | null = null;
    for (const obs of existingObservations) {
      const oLat = Number(obs.latitude);
      const oLng = Number(obs.longitude);
      if (!oLat || !oLng || isNaN(oLat) || isNaN(oLng)) continue;
      const d = haversineDistanceMeters(gpsMeta.lat, gpsMeta.lng, oLat, oLng);
      if (d <= 80) { // Radius 80 meter
        if (!closest || d < closest.distMeters) {
          closest = { obs, distMeters: Math.round(d) };
        }
      }
    }
    return closest;
  }, [existingObservations, gpsMeta]);

  // Form State
  const [tanamanId, setTanamanId] = useState(aiDraft?.tanaman_id || 'sukun');
  const [namaLokasi, setNamaLokasi] = useState(aiDraft?.nama_kebun || '');
  const [kelurahan, setKelurahan] = useState(gpsMeta.kelurahan || 'Citangkil');
  const [kecamatan, setKecamatan] = useState(gpsMeta.kecamatan || 'Citangkil');
  const [fasePertumbuhan, setFasePertumbuhan] = useState(aiDraft?.fase_pertumbuhan || 'Vegetatif (Sedang Tumbuh)');
  
  // Pengukuran Lahan / Pohon
  const [inputType, setInputType] = useState<'pohon' | 'luas_m2' | 'luas_ha'>('pohon');
  const [jumlahPohon, setJumlahPohon] = useState<number | ''>(5);
  const [luasM2, setLuasM2] = useState<number | ''>(500);
  const [luasHa, setLuasHa] = useState<number | ''>(0.05);
  const [catatanLapangan, setCatatanLapangan] = useState('');

  const selectedTanaman = useMemo(() => {
    return TANAMAN_PANGAN_LIST.find(t => t.id === tanamanId) || TANAMAN_PANGAN_LIST[0];
  }, [tanamanId]);

  // Hitung Estimasi Normatif
  const estimasiNormatif = useMemo(() => {
    return hitungEstimasiProduksiNormatif(tanamanId, {
      jumlah_pohon: inputType === 'pohon' ? Number(jumlahPohon) || 0 : undefined,
      luas_m2: inputType === 'luas_m2' ? Number(luasM2) || 0 : undefined,
      luas_ha: inputType === 'luas_ha' ? Number(luasHa) || 0 : undefined
    });
  }, [tanamanId, inputType, jumlahPohon, luasM2, luasHa]);

  const handleKecamatanChange = (kec: string) => {
    setKecamatan(kec);
    const kels = WILAYAH[kec] || [];
    if (kels.length > 0) setKelurahan(kels[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nearbyPin && !isConfirmedDistinct) {
      alert(`⚠️ Peringatan Duplikasi Lokasi:\nTitik GPS Anda berjarak ±${nearbyPin.distMeters}m dari "${nearbyPin.obs.nama_lokasi || nearbyPin.obs.kategori}".\n\nJika ini adalah tanaman pangan / lahan yang BERBEDA, silakan centang kotak pernyataan konfirmasi pembeda sebelum menyimpan.`);
      return;
    }

    const finalPayload = {
      mode: 'tanaman_pangan',
      kategori: tanamanId,
      kategori_label: selectedTanaman.label,
      nama_lokasi: namaLokasi.trim() || `${selectedTanaman.label} (${kelurahan})`,
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
      jumlah_pohon_rumpun: inputType === 'pohon' ? Number(jumlahPohon) : undefined,
      luas_lahan_m2: inputType === 'luas_m2' ? Number(luasM2) : inputType === 'luas_ha' ? (Number(luasHa) || 0) * 10000 : undefined,
      luas_lahan_ha: inputType === 'luas_ha' ? Number(luasHa) : inputType === 'luas_m2' ? (Number(luasM2) || 0) / 10000 : undefined,
      fase_pertumbuhan: fasePertumbuhan,
      estimasi_produksi_kg: estimasiNormatif.estimasi_kg,
      metode_estimasi: 'normatif_agronomi',
      catatan_lapangan: catatanLapangan,
      ai_analysis_raw: aiDraft,
      ai_confidence: aiDraft?.confidence_score || 0.85,
      ai_detected_objects: [
        aiDraft?.jenis_tanaman,
        aiDraft?.fase_pertumbuhan,
        aiDraft?.perkiraan_jumlah_terlihat
      ].filter(Boolean),
      status_verifikasi: 'terverifikasi_pengguna'
    };

    await onSave(finalPayload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-emerald-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between bg-white/90 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <Trees className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">Konfirmasi Tanaman Pangan</h3>
              <p className="text-[10px] text-slate-500">Verifikasi tanaman karbohidrat & estimasi produksi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="text-xs text-slate-500 hover:text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 transition-colors"
          >
            Foto Ulang
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* Preview Foto dengan GPS Watermark */}
          <div className="relative rounded-xl overflow-hidden border border-emerald-200 aspect-[16/10] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Foto Tanaman" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-700 flex items-center gap-1.5 border border-emerald-300">
              <MapPin className="w-3 h-3 text-emerald-700" />
              <span>{gpsMeta.lat.toFixed(5)}, {gpsMeta.lng.toFixed(5)}</span>
            </div>
          </div>

          {/* Warning: Lokasi Berdekatan / Mirip Terdeteksi (Item 5) */}
          {nearbyPin && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl p-3.5 space-y-2 text-left shadow-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                    Terdeteksi Titik Mirip / Berdekatan (±{nearbyPin.distMeters} meter)
                  </h4>
                  <p className="text-[10.5px] text-amber-900 leading-tight mt-0.5">
                    Lokasi ini sangat dekat dengan pin: <strong>{nearbyPin.obs.nama_lokasi || nearbyPin.obs.kategori}</strong> ({nearbyPin.obs.kategori_label || nearbyPin.obs.kelurahan}).
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-300/80 text-[10px] space-y-1.5 text-slate-700">
                <p className="font-bold text-amber-950">
                  Apakah ini komoditas / sentra tanaman pangan yang BERBEDA?
                </p>
                <p className="leading-relaxed">
                  Jika ini adalah kebun/lahan tanaman yang berbeda, pastikan Anda mengisi <strong>Nama Lokasi/Blok</strong> dan <strong>Catatan Lapangan</strong> yang membedakan dengan titik yang sudah ada agar tidak terjadi duplikasi estimasi produksi.
                </p>
                <label className="flex items-center gap-2 pt-1 font-black text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmedDistinct}
                    onChange={(e) => setIsConfirmedDistinct(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Saya konfirmasi ini adalah tanaman pangan BERBEDA</span>
                </label>
              </div>
            </div>
          )}

          {/* AI Result Card */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Hasil Analisis AI Vision</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                Keyakinan: {Math.round((aiDraft?.confidence_score || 0.85) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <p className="text-slate-500 text-[10px]">Prediksi Tanaman:</p>
                <p className="font-bold text-slate-900">{aiDraft?.jenis_tanaman || selectedTanaman.label}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Fase Pertumbuhan:</p>
                <p className="font-bold text-amber-700">{aiDraft?.fase_pertumbuhan || fasePertumbuhan}</p>
              </div>
              {aiDraft?.perkiraan_jumlah_terlihat && (
                <div className="col-span-2">
                  <p className="text-slate-500 text-[10px]">Kondisi & Jumlah Terlihat:</p>
                  <p className="text-slate-700">{aiDraft?.perkiraan_jumlah_terlihat} • {aiDraft?.kondisi_tanaman || 'Sehat'}</p>
                </div>
              )}
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-emerald-300 text-[10px] text-emerald-700/80">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Hasil visual AI memerlukan konfirmasi luasan/pohon
              </span>
              <button
                type="button"
                onClick={() => setIsEditingManual(!isEditingManual)}
                className="text-amber-700 hover:text-amber-700 font-bold flex items-center gap-1 underline"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingManual ? 'Tutup Koreksi' : 'Koreksi Tanaman'}
              </button>
            </div>
          </div>

          {/* Form Input / Koreksi */}
          <div className="space-y-3 text-left">
            
            {/* Jenis Tanaman */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Jenis Tanaman Pangan Karbohidrat
              </label>
              <select
                value={tanamanId}
                onChange={(e) => setTanamanId(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
              >
                {TANAMAN_PANGAN_LIST.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Nama Kebun / Lahan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nama Lahan / Pemilik <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                value={namaLokasi}
                onChange={(e) => setNamaLokasi(e.target.value)}
                placeholder="Contoh: Kebun Sukun Warga Kelurahan Cikerai, Lahan Singkong Masigit"
                className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Wilayah: Kecamatan & Kelurahan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Kecamatan</label>
                <select
                  value={kecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {Object.keys(WILAYAH).map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Kelurahan</label>
                <select
                  value={kelurahan}
                  onChange={(e) => setKelurahan(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {(WILAYAH[kecamatan] || []).map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Ukuran: Pohon / Luas Lahan */}
            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-emerald-700 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Kalkulasi Potensi Produksi</span>
                </label>
                
                {/* Switcher Tipe Input */}
                <div className="flex bg-white p-0.5 rounded-lg border border-emerald-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setInputType('pohon')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      inputType === 'pohon' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-emerald-800'
                    }`}
                  >
                    Jumlah Pohon
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('luas_m2')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      inputType === 'luas_m2' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-emerald-800'
                    }`}
                  >
                    Luas (m²)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('luas_ha')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      inputType === 'luas_ha' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-emerald-800'
                    }`}
                  >
                    Luas (Ha)
                  </button>
                </div>
              </div>

              {/* Input Nilai */}
              <div>
                {inputType === 'pohon' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Jumlah Pohon / Rumpun Produktif:</label>
                    <input
                      type="number"
                      min="1"
                      value={jumlahPohon}
                      onChange={(e) => setJumlahPohon(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Masukkan jumlah pohon/rumpun..."
                      className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
                {inputType === 'luas_m2' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Luas Lahan (m²):</label>
                    <input
                      type="number"
                      min="1"
                      value={luasM2}
                      onChange={(e) => setLuasM2(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 1500 m²"
                      className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
                {inputType === 'luas_ha' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Luas Lahan (Hektare):</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.01"
                      value={luasHa}
                      onChange={(e) => setLuasHa(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 0.5 Ha, 1.2 Ha"
                      className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Output Hasil Estimasi Normatif */}
              <div className="pt-2 border-t border-emerald-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Estimasi Produksi Normatif:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {estimasiNormatif.estimasi_kg.toLocaleString('id-ID')} Kg ({estimasiNormatif.estimasi_ton} Ton)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  Basis: {estimasiNormatif.metode_perhitungan}
                </p>
              </div>
            </div>

            {/* Fase Pertumbuhan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Fase Pertumbuhan Tanaman
              </label>
              <select
                value={fasePertumbuhan}
                onChange={(e) => setFasePertumbuhan(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="Baru Tanam / Bibit">🌱 Baru Tanam / Bibit</option>
                <option value="Vegetatif (Sedang Tumbuh)">🌿 Vegetatif (Sedang Tumbuh)</option>
                <option value="Generatif / Berbuah">🌸 Generatif / Berbuah</option>
                <option value="Siap Panen">🌾 Siap Panen</option>
                <option value="Pasca Panen">🍂 Pasca Panen</option>
              </select>
            </div>

            {/* Catatan Lapangan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Catatan Petugas Lapangan <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <textarea
                rows={2}
                value={catatanLapangan}
                onChange={(e) => setCatatanLapangan(e.target.value)}
                placeholder="Tambahkan informasi kesehatan tanaman, hama, ketersediaan air, atau rencana panen..."
                className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-emerald-100 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={onRetake}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl border border-emerald-200 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all disabled:opacity-50"
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
