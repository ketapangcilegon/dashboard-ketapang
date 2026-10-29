import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SARANA_DISTRIBUSI_LIST, ASAL_PASOKAN_OPTIONS, haversineDistanceMeters } from '@/lib/kamera-normatif';
import { WILAYAH } from '@/lib/wilayah';
import { cariWilayahMendekati } from '@/lib/wilayah-indonesia';
import { Check, Edit3, MapPin, Sparkles, AlertCircle, AlertTriangle, Calendar, Clock, Store, ArrowRight, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';

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
  existingObservations?: any[];
  onSave: (finalData: any) => Promise<void>;
  onRetake: () => void;
  isSaving: boolean;
}

export default function KonfirmasiPasokanModal({
  photoPreview,
  gpsMeta,
  aiDraft,
  existingObservations = [],
  onSave,
  onRetake,
  isSaving,
}: KonfirmasiPasokanModalProps) {
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
  const [namaLokasi, setNamaLokasi] = useState(aiDraft?.nama_toko || '');
  const [kategoriId, setKategoriId] = useState(aiDraft?.kategori_id || (aiDraft?.kotak_beras?.terdeteksi ? 'pasar_tradisional' : 'toko_beras'));
  const [kelurahan, setKelurahan] = useState(gpsMeta.kelurahan || 'Citangkil');
  const [kecamatan, setKecamatan] = useState(gpsMeta.kecamatan || 'Citangkil');

  // Custom Dropdown UI States (Capture 5 Clean Light UI for Mobile & Desktop)
  const [isKategoriDropdownOpen, setIsKategoriDropdownOpen] = useState(false);
  const [isAsalDropdownOpen, setIsAsalDropdownOpen] = useState(false);
  const kategoriDropdownRef = useRef<HTMLDivElement>(null);
  const asalDropdownRef = useRef<HTMLDivElement>(null);

  // Isian Manual Asal Pasokan & Smart Geo Typo Matcher (Capture 1 & 2)
  const [manualAsalText, setManualAsalText] = useState('');
  const [asalSuggestion, setAsalSuggestion] = useState<{
    rekomendasi: string;
    namaResmi: string;
    skor: number;
    pesanKonfirmasi: string;
  } | null>(null);
  const [isAsalConfirmed, setIsAsalConfirmed] = useState(false);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (kategoriDropdownRef.current && !kategoriDropdownRef.current.contains(e.target as Node)) {
        setIsKategoriDropdownOpen(false);
      }
      if (asalDropdownRef.current && !asalDropdownRef.current.contains(e.target as Node)) {
        setIsAsalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleManualAsalChange = (val: string) => {
    setManualAsalText(val);
    setIsAsalConfirmed(false);
    if (!val.trim()) {
      setAsalSuggestion(null);
      return;
    }
    const match = cariWilayahMendekati(val);
    if (match && match.rekomendasi.toLowerCase() !== val.trim().toLowerCase()) {
      setAsalSuggestion(match);
    } else if (match && match.rekomendasi.toLowerCase() === val.trim().toLowerCase()) {
      setAsalSuggestion(null);
      setIsAsalConfirmed(true);
    } else {
      setAsalSuggestion(null);
    }
  };

  const handleAcceptSuggestion = () => {
    if (asalSuggestion) {
      setManualAsalText(asalSuggestion.rekomendasi);
      setIsAsalConfirmed(true);
      setAsalSuggestion(null);
    }
  };
  
  // Deteksi Geometris Kotak Beras Curah (Pasar Tradisional / Warung Kecil)
  const isKotakDetected = Boolean(aiDraft?.kotak_beras?.terdeteksi || aiDraft?.format_penyimpanan?.includes('kotak'));

  // Data Pasokan
  const [jumlahInput, setJumlahInput] = useState<number | ''>(aiDraft?.perkiraan_jumlah_karung_angka || 10);
  const [satuan, setSatuan] = useState<'kotak' | 'karung' | 'kg' | 'ton'>(
    isKotakDetected ? 'kotak' : 'karung'
  );
  const [ukuranKarungKg, setUkuranKarungKg] = useState<number>(25);

  // Parameter Geometris & Fisika Kotak Sekat Beras
  const [jumlahSekat, setJumlahSekat] = useState<number>(aiDraft?.kotak_beras?.jumlah_sekat || 4);
  const [ukuranKotakTipe, setUkuranKotakTipe] = useState<'standar_pasar' | 'sedang_warung' | 'besar_grosir'>('standar_pasar');
  const [volumePerSekatLiter, setVolumePerSekatLiter] = useState<number>(aiDraft?.kotak_beras?.estimasi_volume_per_sekat_liter || 65);
  const [kondisiIsiPersen, setKondisiIsiPersen] = useState<number>(aiDraft?.kotak_beras?.estimasi_persen_isi || 105);
  const [bufferKarungJumlah, setBufferKarungJumlah] = useState<number>(aiDraft?.karung_cadangan?.estimasi_jumlah_karung || 0);
  const [bufferKarungKg, setBufferKarungKg] = useState<number>(aiDraft?.karung_cadangan?.ukuran_rata_rata_kg || 25);

  const handleSelectUkuranKotak = (tipe: 'standar_pasar' | 'sedang_warung' | 'besar_grosir') => {
    setUkuranKotakTipe(tipe);
    if (tipe === 'standar_pasar') setVolumePerSekatLiter(65);
    else if (tipe === 'sedang_warung') setVolumePerSekatLiter(45);
    else if (tipe === 'besar_grosir') setVolumePerSekatLiter(85);
  };

  const [asalPasokan, setAsalPasokan] = useState(aiDraft?.saran_asal_pasokan_default || 'Kabupaten Serang (Banten)');
  const [searchAsal, setSearchAsal] = useState('');
  const [jenisKemasan, setJenisKemasan] = useState(
    aiDraft?.ukuran_kemasan_terdeteksi || (isKotakDetected ? 'Kotak Display Sekat Kayu & Curah' : 'Karung 25 kg & Kemasan 5 kg')
  );
  const [merekBeras, setMerekBeras] = useState(aiDraft?.merek_terbaca || '');
  const [catatanLapangan, setCatatanLapangan] = useState(aiDraft?.metode_kalkulasi ? `[AI Vision] ${aiDraft.metode_kalkulasi}` : '');

  // Frekuensi dan Jumlah Pasokan (Capture 2)
  const [frekuensiPasokan, setFrekuensiPasokan] = useState<string>('');
  const [satuanFrekuensi, setSatuanFrekuensi] = useState<'hari' | 'minggu' | 'bulan'>('minggu');
  const [jumlahRataRataPasokan, setJumlahRataRataPasokan] = useState<string>('');
  const [satuanVolumePasokan, setSatuanVolumePasokan] = useState<'kg' | 'kwintal' | 'ton'>('kg');

  // Perhitungan Otomatis Pasokan Tahunan
  const numFrek = parseFloat(frekuensiPasokan) || 0;
  const numVol = parseFloat(jumlahRataRataPasokan) || 0;
  const frekPerTahun = satuanFrekuensi === 'hari' ? numFrek * 365 : satuanFrekuensi === 'minggu' ? numFrek * 52 : numFrek * 12;
  const volKgPerKirim = satuanVolumePasokan === 'kg' ? numVol : satuanVolumePasokan === 'kwintal' ? numVol * 100 : numVol * 1000;
  const totalTahunanKg = Math.round(frekPerTahun * volKgPerKirim);
  const totalTahunanTon = Number((totalTahunanKg / 1000).toFixed(2));

  // Filtered Asal Options
  const filteredAsalOptions = useMemo(() => {
    if (!searchAsal.trim()) return ASAL_PASOKAN_OPTIONS;
    return ASAL_PASOKAN_OPTIONS.filter(opt => opt.toLowerCase().includes(searchAsal.toLowerCase()));
  }, [searchAsal]);

  // Bulk Density Beras Putih Standar SNI/Bulog: 0.80 kg/liter (1 Liter Beras ≈ 0.80 kg)
  const beratKotakKg = Math.round(jumlahSekat * volumePerSekatLiter * (kondisiIsiPersen / 100) * 0.80);
  const beratBufferKarungKg = bufferKarungJumlah * bufferKarungKg;

  // Hitung total kg komprehensif
  const totalKg = Number(
    satuan === 'kotak'
      ? beratKotakKg + beratBufferKarungKg
      : satuan === 'karung'
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

    if (nearbyPin && !isConfirmedDistinct) {
      alert(`⚠️ Peringatan Duplikasi Lokasi:\nTitik GPS Anda berjarak ±${nearbyPin.distMeters}m dari "${nearbyPin.obs.nama_lokasi || nearbyPin.obs.kategori}".\n\nJika ini adalah toko/sarana beras yang BERBEDA, silakan centang kotak pernyataan konfirmasi pembeda sebelum menyimpan.`);
      return;
    }

    const finalAsal = asalPasokan === 'Lainnya (Manual)'
      ? (manualAsalText.trim() || 'Lainnya (Manual)')
      : asalPasokan;

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
      frekuensi_pasokan_angka: numFrek > 0 ? numFrek : undefined,
      frekuensi_pasokan_satuan: numFrek > 0 ? satuanFrekuensi : undefined,
      volume_pasokan_angka: numVol > 0 ? numVol : undefined,
      volume_pasokan_satuan: numVol > 0 ? satuanVolumePasokan : undefined,
      total_pasokan_tahunan_kg: totalTahunanKg > 0 ? totalTahunanKg : undefined,
      total_pasokan_tahunan_ton: totalTahunanTon > 0 ? totalTahunanTon : undefined,
      detail_kotak_curah: satuan === 'kotak' ? {
        jumlah_sekat: jumlahSekat,
        tipe_ukuran: ukuranKotakTipe,
        volume_per_sekat_liter: volumePerSekatLiter,
        kondisi_isi_persen: kondisiIsiPersen,
        berat_kotak_kg: beratKotakKg,
        buffer_karung_jumlah: bufferKarungJumlah,
        buffer_karung_kg: beratBufferKarungKg,
        densitas_ruah_kg_per_l: 0.80
      } : undefined,
      asal_pasokan: finalAsal,
      jenis_kemasan: jenisKemasan,
      merek_beras: merekBeras,
      catatan_lapangan: catatanLapangan,
      ai_analysis_raw: aiDraft,
      ai_confidence: aiDraft?.confidence_score || 0.85,
      ai_detected_objects: [
        aiDraft?.kategori_sarana,
        isKotakDetected ? `Kotak Curah (${jumlahSekat} Sekat)` : null,
        aiDraft?.estimasi_tumpukan_karung,
        aiDraft?.ukuran_kemasan_terdeteksi
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
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">Konfirmasi Pasokan Beras</h3>
              <p className="text-[10px] text-slate-500">Verifikasi data lapangan & analisis AI</p>
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
          <div className="relative rounded-xl overflow-hidden border border-emerald-200 aspect-[16/10] bg-black group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Foto Lapangan" className="w-full h-full object-cover" />
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
                  Apakah ini sarana / toko beras yang BERBEDA?
                </p>
                <p className="leading-relaxed">
                  Jika ini adalah toko yang berbeda, pastikan Anda mengisi <strong>Nama Toko/Grosir</strong> dan <strong>Catatan Lapangan</strong> yang membedakan dengan sarana yang sudah ada agar tidak terjadi duplikasi agregasi.
                </p>
                <label className="flex items-center gap-2 pt-1 font-black text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmedDistinct}
                    onChange={(e) => setIsConfirmedDistinct(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Saya konfirmasi ini adalah sarana/toko BERBEDA</span>
                </label>
              </div>
            </div>
          )}

          {/* AI Result Card */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Hasil Analisis AI Vision (Spasial & Geometri)</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                Keyakinan: {Math.round((aiDraft?.confidence_score || 0.85) * 100)}%
              </span>
            </div>

            {/* Grid Informasi AI */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <p className="text-slate-500 text-[10px]">Prediksi Sarana:</p>
                <p className="font-bold text-slate-900">{aiDraft?.kategori_sarana || selectedKategori.label}</p>
              </div>

              <div>
                <p className="text-slate-500 text-[10px]">Format Display:</p>
                <p className="font-bold text-emerald-900">
                  {isKotakDetected ? '📦 Kotak Beras Curah Bersekat' : '🎒 Tumpukan Karung Kemasan'}
                </p>
              </div>

              {/* Rincian Khusus Kotak Beras Sekat Tradisional */}
              {isKotakDetected && (
                <div className="col-span-2 bg-white/90 p-2 rounded-lg border border-emerald-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-950 text-[10.5px]">
                      📐 Deteksi Wadah Kotak Sekat Kayu:
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                      {aiDraft?.kotak_beras?.jumlah_sekat || jumlahSekat} Sekat • {aiDraft?.kotak_beras?.kondisi_permukaan === 'menggunung' ? 'Menggunung (110%)' : 'Penuh Rata'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-700 leading-tight">
                    Estimasi Volume Kotak: <strong>~{aiDraft?.kotak_beras?.total_volume_liter || Math.round(jumlahSekat * volumePerSekatLiter)} Liter</strong> (~{aiDraft?.kotak_beras?.estimasi_berat_kotak_kg || beratKotakKg} kg beras)
                  </p>
                  
                  {/* Papan Harga Terbaca */}
                  {aiDraft?.kotak_beras?.label_harga_terbaca && aiDraft.kotak_beras.label_harga_terbaca.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[9.5px] pt-0.5 text-amber-900 font-bold">
                      <span className="bg-amber-100 px-1 rounded border border-amber-300">🏷️ Papan Harga Terbaca:</span>
                      <span className="text-slate-800">
                        Rp {aiDraft.kotak_beras.label_harga_terbaca.join(' / Rp ')}
                      </span>
                    </div>
                  )}

                  {/* Kaleng Canting Terbaca */}
                  {aiDraft?.kotak_beras?.canting_takaran_terlihat && (
                    <div className="text-[9.5px] text-emerald-800 font-semibold">
                      ⚖️ <em>Canting takaran 1 liter terdeteksi di atas kotak (acuan skala & takaran curah).</em>
                    </div>
                  )}

                  {/* Karung Cadangan */}
                  {aiDraft?.karung_cadangan?.terdeteksi && (
                    <p className="text-[9.5px] text-slate-600">
                      🎒 Cadangan Karung di Sekitar: ±{aiDraft.karung_cadangan.estimasi_jumlah_karung} karung ({aiDraft.karung_cadangan.estimasi_berat_karung_kg} kg)
                    </p>
                  )}
                </div>
              )}

              {/* Rincian Non-Kotak / Kemasan Biasa */}
              {!isKotakDetected && (
                <>
                  <div>
                    <p className="text-slate-500 text-[10px]">Estimasi Tumpukan Karung:</p>
                    <p className="font-bold text-amber-800">{aiDraft?.estimasi_tumpukan_karung || '± 10 karung'}</p>
                  </div>
                  {aiDraft?.ukuran_kemasan_terdeteksi && (
                    <div className="col-span-2">
                      <p className="text-slate-500 text-[10px]">Kemasan & Merek Terbaca:</p>
                      <p className="text-slate-700">{aiDraft?.ukuran_kemasan_terdeteksi} {aiDraft?.merek_terbaca ? `(${aiDraft.merek_terbaca})` : ''}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-emerald-300 text-[10px] text-emerald-800/80">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-emerald-600" /> Bulk Density Beras SNI: 0.80 kg/L
              </span>
              <button
                type="button"
                onClick={() => setIsEditingManual(!isEditingManual)}
                className="text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1 underline"
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
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nama Toko / Outlet / Kios Pasar <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                value={namaLokasi}
                onChange={(e) => setNamaLokasi(e.target.value)}
                placeholder="Contoh: Kios Beras Berkah Pasar Kranggot, Warung Madura Citangkil"
                className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Jenis Sarana (Capture 5 Custom Dropdown - Mobile & Desktop) */}
            <div className="relative" ref={kategoriDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Jenis Sarana Distribusi
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsKategoriDropdownOpen(!isKategoriDropdownOpen);
                  setIsAsalDropdownOpen(false);
                }}
                className="w-full bg-[#ECFDF5] border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-sm shrink-0">{selectedKategori.icon}</span>
                  <span className="truncate">{selectedKategori.label}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 shrink-0 ${isKategoriDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isKategoriDropdownOpen && (
                <div className="relative mt-2 z-10 bg-[#F0FDF4] border-2 border-emerald-400 rounded-xl shadow-md overflow-hidden max-h-56 overflow-y-auto animate-in fade-in duration-150">
                  {SARANA_DISTRIBUSI_LIST.map((s) => {
                    const isSelected = s.id === kategoriId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setKategoriId(s.id);
                          setIsKategoriDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer border-b border-emerald-100/60 last:border-b-0 ${
                          isSelected
                            ? 'bg-[#1A73E8] text-white font-bold shadow-xs'
                            : 'text-slate-800 hover:bg-emerald-100/70'
                        }`}
                      >
                        <span className="text-sm shrink-0">{s.icon}</span>
                        <span className="truncate leading-tight">{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
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

            {/* Estimasi Pasokan & Format Perhitungan */}
            <div className="bg-emerald-50/90 border border-emerald-300 p-3.5 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-emerald-900">
                  Estimasi Pasokan & Metode Perhitungan
                </label>
                <span className="text-[9.5px] bg-emerald-200/70 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  Formula Fisika Spasial
                </span>
              </div>

              {/* Satuan Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Format Penyimpanan / Satuan Input:
                </label>
                <select
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value as any)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="kotak">📦 Kotak Sekat Kayu (Curah Pasar / Warung)</option>
                  <option value="karung">🎒 Tumpukan Karung Beras</option>
                  <option value="kg">⚖️ Bobot Langsung (Kilogram / Kg)</option>
                  <option value="ton">🚛 Skala Tonase (Ton)</option>
                </select>
              </div>

              {/* A. JIKA SATUAN = KOTAK SEKAT KAYU (ALGORITMA GEOMETRI & BULK DENSITY) */}
              {satuan === 'kotak' && (
                <div className="bg-white/95 border border-emerald-300 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span>📐</span> Kalkulator Geometri Kotak Beras
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Densitas: 0.80 kg/L
                    </span>
                  </div>

                  {/* 1. Jumlah Sekat Kotak */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-bold text-slate-700">Jumlah Sekat Kotak Terlihat:</span>
                      <span className="text-xs font-black text-emerald-700">{jumlahSekat} Sekat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setJumlahSekat(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-black text-sm flex items-center justify-center hover:bg-emerald-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={jumlahSekat}
                        onChange={(e) => setJumlahSekat(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 text-center bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 text-xs font-black text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahSekat(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-black text-sm flex items-center justify-center hover:bg-emerald-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 2. Ukuran Modular Kotak Sekat */}
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Dimensi Modular Kotak Sekat:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectUkuranKotak('standar_pasar')}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          ukuranKotakTipe === 'standar_pasar'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-emerald-50 text-slate-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="text-[10px] font-black">Standar Pasar</span>
                        <span className="text-[9px] opacity-90">~65 L (52 kg)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectUkuranKotak('sedang_warung')}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          ukuranKotakTipe === 'sedang_warung'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-emerald-50 text-slate-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="text-[10px] font-black">Warung Kecil</span>
                        <span className="text-[9px] opacity-90">~45 L (36 kg)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectUkuranKotak('besar_grosir')}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          ukuranKotakTipe === 'besar_grosir'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-emerald-50 text-slate-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="text-[10px] font-black">Grosir Besar</span>
                        <span className="text-[9px] opacity-90">~85 L (68 kg)</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Profil Permukaan Keterisian Beras */}
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Kondisi Permukaan Beras:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {[
                        { label: '🏔️ Menggunung (110%)', val: 110 },
                        { label: '📏 Penuh Rata (100%)', val: 100 },
                        { label: '☕ 3/4 Terisi (75%)', val: 75 },
                        { label: '📉 1/2 Terambil (50%)', val: 50 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setKondisiIsiPersen(item.val)}
                          className={`py-1.5 px-2 rounded-lg border font-bold text-left transition-all ${
                            kondisiIsiPersen === item.val
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-emerald-50 text-slate-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Cadangan Karung Pendukung (Buffer Stock di Belakang / Samping Kotak) */}
                  <div className="border-t border-emerald-100 pt-2.5">
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Cadangan Karung di Sekitar Kotak <span className="text-slate-500 font-normal">(Buffer Stock)</span>:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9.5px] text-slate-500 block mb-0.5">Jumlah Karung:</span>
                        <input
                          type="number"
                          min="0"
                          value={bufferKarungJumlah}
                          onChange={(e) => setBufferKarungJumlah(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                          placeholder="0 karung"
                        />
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-500 block mb-0.5">Ukuran Rata-rata:</span>
                        <select
                          value={bufferKarungKg}
                          onChange={(e) => setBufferKarungKg(Number(e.target.value))}
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                        >
                          <option value="5">5 kg</option>
                          <option value="10">10 kg</option>
                          <option value="25">25 kg (Standar Toko)</option>
                          <option value="50">50 kg (Karung Bulog/Pabrik)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Subtotal Fisika */}
                  <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 text-[10.5px] space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span>• Beras Kotak ({jumlahSekat} sekat × {volumePerSekatLiter}L × {kondisiIsiPersen}%):</span>
                      <strong className="text-slate-900">{beratKotakKg} kg (~{Math.round(beratKotakKg / 0.8)} L)</strong>
                    </div>
                    {bufferKarungJumlah > 0 && (
                      <div className="flex justify-between">
                        <span>• Karung Cadangan ({bufferKarungJumlah} × {bufferKarungKg}kg):</span>
                        <strong className="text-slate-900">{beratBufferKarungKg} kg</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* B. JIKA SATUAN = KARUNG / KG / TON */}
              {satuan !== 'kotak' && (
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={jumlahInput}
                        onChange={(e) => setJumlahInput(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Jumlah pasokan..."
                        className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-700 flex items-center px-2 bg-emerald-100/50 rounded-lg border border-emerald-200 justify-center">
                      {satuan.toUpperCase()}
                    </div>
                  </div>

                  {satuan === 'karung' && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[10px] text-slate-500">Ukuran per karung:</span>
                      {[5, 10, 25, 50].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setUkuranKarungKg(size)}
                          className={`text-[10px] px-2.5 py-0.5 rounded font-bold border transition-colors ${
                            ukuranKarungKg === size
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-white text-slate-600 border-emerald-200 hover:text-emerald-800'
                          }`}
                        >
                          {size} kg
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Total Summary Footer */}
              <div className="pt-2 border-t border-emerald-300 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">Total Estimasi Stok:</span>
                <span className="font-black text-emerald-800 text-base">
                  {totalKg.toLocaleString('id-ID')} Kg <span className="text-xs font-normal text-slate-500">({ (totalKg / 1000).toFixed(2) } Ton)</span>
                </span>
              </div>
            </div>

            {/* Kotak Input Baru: Frekuensi dan Jumlah Pasokan (Capture 2) */}
            <div className="bg-gradient-to-br from-white to-emerald-50/70 border border-emerald-300 p-3.5 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                    🔄
                  </div>
                  <label className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                    Frekuensi dan Jumlah Pasokan
                  </label>
                </div>
                <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Kalkulasi Tahunan Otomatis
                </span>
              </div>

              {/* 1. Frekuensi Pasokan */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                  Frekuensi Pasokan <span className="text-slate-400 font-normal">(Angka saja)</span>:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*\.?[0-9]*"
                      value={frekuensiPasokan}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setFrekuensiPasokan(val);
                      }}
                      placeholder="Contoh: 2"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <select
                      value={satuanFrekuensi}
                      onChange={(e) => setSatuanFrekuensi(e.target.value as 'hari' | 'minggu' | 'bulan')}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="hari">/ Hari</option>
                      <option value="minggu">/ Minggu</option>
                      <option value="bulan">/ Bulan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Jumlah Rata-rata Pasokan Dikirim */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                  Jumlah Rata-rata Pasokan Dikirim <span className="text-slate-400 font-normal">(Angka saja)</span>:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*\.?[0-9]*"
                      value={jumlahRataRataPasokan}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setJumlahRataRataPasokan(val);
                      }}
                      placeholder="Contoh: 500"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <select
                      value={satuanVolumePasokan}
                      onChange={(e) => setSatuanVolumePasokan(e.target.value as 'kg' | 'kwintal' | 'ton')}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="kwintal">kwintal</option>
                      <option value="ton">ton</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Hasil Perhitungan Otomatis Total Pasokan Per Tahun */}
              <div className="pt-2 border-t border-emerald-200">
                <div className="bg-emerald-100/60 border border-emerald-300 rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] text-emerald-950 font-bold block">
                      Total Estimasi Pasokan Per Tahun:
                    </span>
                    <span className="text-[9.5px] text-slate-600">
                      {frekuensiPasokan && jumlahRataRataPasokan ? (
                        `${frekuensiPasokan}×/${satuanFrekuensi} (${frekPerTahun.toLocaleString('id-ID')}×/thn) × ${jumlahRataRataPasokan} ${satuanVolumePasokan}`
                      ) : (
                        'Isi frekuensi & rata-rata pasokan untuk kalkulasi'
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    {totalTahunanTon > 0 ? (
                      <div>
                        <div className="text-sm font-black text-emerald-800">
                          {totalTahunanTon.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton <span className="text-[10px] font-normal text-emerald-700">/ Thn</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-semibold">
                          ({totalTahunanKg.toLocaleString('id-ID')} Kg/Thn)
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Asal Pasokan Beras (Capture 5 Custom Dropdown - Mobile & Desktop) */}
            <div className="relative" ref={asalDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Asal / Sumber Pasokan Beras
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAsalDropdownOpen(!isAsalDropdownOpen);
                  setIsKategoriDropdownOpen(false);
                }}
                className="w-full bg-[#ECFDF5] border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-emerald-700 shrink-0">
                    {asalPasokan === 'Lainnya (Manual)' ? '✍️' : '📍'}
                  </span>
                  <span className="truncate">
                    {asalPasokan === 'Lainnya (Manual)' && manualAsalText
                      ? `Lainnya: ${manualAsalText}`
                      : asalPasokan}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 shrink-0 ${isAsalDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAsalDropdownOpen && (
                <div className="relative mt-2 z-10 bg-[#F0FDF4] border-2 border-emerald-400 rounded-xl shadow-md overflow-hidden animate-in fade-in duration-150">
                  {/* Search Filter for Instant Region Finding */}
                  <div className="p-2 border-b border-emerald-200 bg-white sticky top-0 z-10">
                    <input
                      type="text"
                      value={searchAsal}
                      onChange={(e) => setSearchAsal(e.target.value)}
                      placeholder="🔍 Cari nama kota / kabupaten / provinsi..."
                      className="w-full px-2.5 py-1.5 text-xs bg-emerald-50 border border-emerald-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div className="touch-pan-y">
                    {filteredAsalOptions.map((asal) => {
                      const isSelected = asal === asalPasokan;
                      const isManual = asal.includes('Lainnya');
                      return (
                        <div
                          key={asal}
                          onClick={() => {
                            setAsalPasokan(asal);
                            setIsAsalDropdownOpen(false);
                            if (!isManual) {
                              setManualAsalText('');
                              setAsalSuggestion(null);
                              setIsAsalConfirmed(false);
                            }
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer border-b border-emerald-100/60 last:border-b-0 ${
                            isSelected
                              ? 'bg-[#1A73E8] text-white font-bold shadow-xs'
                              : 'text-slate-800 hover:bg-emerald-100/70'
                          }`}
                        >
                          <span className="text-sm shrink-0">{isManual ? '✍️' : '📍'}</span>
                          <span className="truncate leading-tight font-medium">{asal}</span>
                        </div>
                      );
                    })}
                    {filteredAsalOptions.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500">
                        Wilayah tidak ditemukan di daftar. Silakan pilih{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAsalPasokan('Lainnya (Manual)');
                            setIsAsalDropdownOpen(false);
                          }}
                          className="text-emerald-700 font-bold underline cursor-pointer"
                        >
                          Lainnya (Manual)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Input Manual Asal Daerah & Saran Koreksi Typo Instan (Capture 1 & 2) */}
              {asalPasokan === 'Lainnya (Manual)' && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5">
                      <span>✍️</span> Ketik Nama Kota / Kab / Provinsi Asal Beras:
                    </label>
                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                      Analisis Cerdas Typo
                    </span>
                  </div>

                  <input
                    type="text"
                    value={manualAsalText}
                    onChange={(e) => handleManualAsalChange(e.target.value)}
                    placeholder="Contoh: Palembang, Subang, Cianjur, Lampung..."
                    className="w-full bg-emerald-50/70 border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />

                  {/* Saran Typo Instan & Konfirmasi Tombol OK (Misal: palembng -> "Palembang, apakah sudah benar?") */}
                  {asalSuggestion && !isAsalConfirmed && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border-2 border-emerald-400 text-slate-800 space-y-1.5 shadow-2xs animate-in fade-in">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px]">
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <span>💡</span> Saran Wilayah Terdeteksi:
                          </span>
                          <p className="font-black text-slate-900 mt-0.5 text-xs">
                            "{asalSuggestion.rekomendasi}", apakah sudah benar?
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAcceptSuggestion}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" /> OK
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Terkonfirmasi */}
                  {isAsalConfirmed && manualAsalText && (
                    <div className="flex items-center justify-between text-[10.5px] bg-emerald-100/90 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 font-bold">
                      <span className="flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">Daerah asal terkonfirmasi: <strong>{manualAsalText}</strong></span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAsalConfirmed(false)}
                        className="text-amber-800 hover:underline text-[10px] shrink-0 ml-2 font-bold cursor-pointer"
                      >
                        Ubah
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                placeholder="Tambahkan informasi penting terkait harga, kelangkaan, atau kondisi toko..."
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
