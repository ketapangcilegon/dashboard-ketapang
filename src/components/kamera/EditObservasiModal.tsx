import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SARANA_DISTRIBUSI_LIST, ASAL_PASOKAN_OPTIONS } from '@/lib/kamera-normatif';
import { WILAYAH } from '@/lib/wilayah';
import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import type { EnumeratorProfile } from '@/lib/enumeratorAuth';
import { 
  X, Check, Edit3, MapPin, AlertCircle, AlertTriangle, 
  Store, Loader2, ChevronDown, CheckCircle2, Lock, ShieldCheck, Calendar 
} from 'lucide-react';

interface EditObservasiModalProps {
  record: ObservasiRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedRecord: ObservasiRecord) => void;
  isAdmin: boolean;
  enumerator?: EnumeratorProfile | null;
  /** Mengambil token sesi (Admin / Google) untuk verifikasi governance di server */
  getAuthToken?: () => Promise<string | null>;
}

export function canEditRecord(
  rec: ObservasiRecord | null,
  isAdmin: boolean,
  currentEnumerator?: { email?: string; nama?: string } | null
): boolean {
  if (!rec) return false;
  if (isAdmin) return true;
  if (!currentEnumerator) return false;

  const creatorEmail = (
    rec.petugas_email ||
    (rec.foto_watermark_meta as any)?.enumerator_email ||
    ''
  ).toLowerCase().trim();

  const creatorNama = (
    rec.petugas_nama ||
    (rec.foto_watermark_meta as any)?.enumerator_nama ||
    ''
  ).toLowerCase().trim();

  const userEmail = (currentEnumerator.email || '').toLowerCase().trim();
  const userNama = (currentEnumerator.nama || '').toLowerCase().trim();

  if (creatorEmail && userEmail && creatorEmail === userEmail) return true;
  if (creatorNama && userNama && creatorNama === userNama) return true;

  return false;
}

export default function EditObservasiModal({
  record,
  isOpen,
  onClose,
  onSaveSuccess,
  isAdmin,
  enumerator,
  getAuthToken
}: EditObservasiModalProps) {
  const isAllowed = useMemo(() => canEditRecord(record, isAdmin, enumerator), [record, isAdmin, enumerator]);

  // Form State
  const [namaLokasi, setNamaLokasi] = useState('');
  const [kategoriId, setKategoriId] = useState('toko_beras');
  const [kecamatan, setKecamatan] = useState('Citangkil');
  const [kelurahan, setKelurahan] = useState('Citangkil');
  const [asalPasokan, setAsalPasokan] = useState('Kota Cilegon (Lokal)');
  const [manualAsalText, setManualAsalText] = useState('');
  const [searchAsal, setSearchAsal] = useState('');

  // Pasokan Saat Ini
  const [estimasiPasokanKg, setEstimasiPasokanKg] = useState<number | ''>(250);
  const [merekBeras, setMerekBeras] = useState('');
  const [jenisKemasan, setJenisKemasan] = useState('');
  const [catatanLapangan, setCatatanLapangan] = useState('');

  // Frekuensi dan Jumlah Pasokan (Capture 2)
  const [frekuensiPasokan, setFrekuensiPasokan] = useState<string>('');
  const [satuanFrekuensi, setSatuanFrekuensi] = useState<'hari' | 'minggu' | 'bulan'>('minggu');
  const [jumlahRataRataPasokan, setJumlahRataRataPasokan] = useState<string>('');
  const [satuanVolumePasokan, setSatuanVolumePasokan] = useState<'kg' | 'kwintal' | 'ton'>('kg');

  // UI dropdowns
  const [isKategoriDropdownOpen, setIsKategoriDropdownOpen] = useState(false);
  const [isAsalDropdownOpen, setIsAsalDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state with selected record
  useEffect(() => {
    if (record) {
      setNamaLokasi(record.nama_lokasi || '');
      setKategoriId(record.kategori || 'toko_beras');
      setKecamatan(record.kecamatan || 'Citangkil');
      setKelurahan(record.kelurahan || 'Citangkil');

      const isKnownAsal = ASAL_PASOKAN_OPTIONS.includes(record.asal_pasokan || '');
      if (isKnownAsal) {
        setAsalPasokan(record.asal_pasokan || 'Kota Cilegon (Lokal)');
        setManualAsalText('');
      } else if (record.asal_pasokan) {
        setAsalPasokan('Lainnya (Manual)');
        setManualAsalText(record.asal_pasokan);
      } else {
        setAsalPasokan('Kota Cilegon (Lokal)');
        setManualAsalText('');
      }

      setEstimasiPasokanKg(record.estimasi_pasokan_kg !== undefined ? Number(record.estimasi_pasokan_kg) : '');
      setMerekBeras(record.merek_beras || '');
      setJenisKemasan(record.jenis_kemasan || '');
      setCatatanLapangan(record.catatan_lapangan || '');

      setFrekuensiPasokan(record.frekuensi_pasokan_angka ? String(record.frekuensi_pasokan_angka) : '');
      setSatuanFrekuensi(record.frekuensi_pasokan_satuan || 'minggu');
      setJumlahRataRataPasokan(record.volume_pasokan_angka ? String(record.volume_pasokan_angka) : '');
      setSatuanVolumePasokan(record.volume_pasokan_satuan || 'kg');

      setErrorMessage(null);
      setIsKategoriDropdownOpen(false);
      setIsAsalDropdownOpen(false);
    }
  }, [record, isOpen]);

  // Perhitungan Otomatis Pasokan Tahunan
  const numFrek = parseFloat(frekuensiPasokan) || 0;
  const numVol = parseFloat(jumlahRataRataPasokan) || 0;
  const frekPerTahun = satuanFrekuensi === 'hari' ? numFrek * 365 : satuanFrekuensi === 'minggu' ? numFrek * 52 : numFrek * 12;
  const volKgPerKirim = satuanVolumePasokan === 'kg' ? numVol : satuanVolumePasokan === 'kwintal' ? numVol * 100 : numVol * 1000;
  const totalTahunanKg = Math.round(frekPerTahun * volKgPerKirim);
  const totalTahunanTon = Number((totalTahunanKg / 1000).toFixed(2));

  const selectedKategori = SARANA_DISTRIBUSI_LIST.find(s => s.id === kategoriId) || SARANA_DISTRIBUSI_LIST[0];

  const filteredAsalOptions = useMemo(() => {
    if (!searchAsal.trim()) return ASAL_PASOKAN_OPTIONS;
    return ASAL_PASOKAN_OPTIONS.filter(opt => opt.toLowerCase().includes(searchAsal.toLowerCase()));
  }, [searchAsal]);

  const handleKecamatanChange = (kec: string) => {
    setKecamatan(kec);
    const kels = WILAYAH[kec] || [];
    if (kels.length > 0) setKelurahan(kels[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    if (!isAllowed) {
      alert('Governance: Anda tidak memiliki wewenang untuk mengedit data ini.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const finalAsal = asalPasokan === 'Lainnya (Manual)'
        ? (manualAsalText.trim() || 'Lainnya (Manual)')
        : asalPasokan;

      const updatePayload: Partial<ObservasiRecord> & { id: string } = {
        id: record.id!,
        nama_lokasi: namaLokasi.trim() || `${selectedKategori.label} (${kelurahan})`,
        kategori: kategoriId,
        kategori_label: selectedKategori.label,
        kecamatan,
        kelurahan,
        asal_pasokan: finalAsal,
        estimasi_pasokan_kg: estimasiPasokanKg === '' ? undefined : Number(estimasiPasokanKg),
        frekuensi_pasokan_angka: numFrek > 0 ? numFrek : undefined,
        frekuensi_pasokan_satuan: numFrek > 0 ? satuanFrekuensi : undefined,
        volume_pasokan_angka: numVol > 0 ? numVol : undefined,
        volume_pasokan_satuan: numVol > 0 ? satuanVolumePasokan : undefined,
        total_pasokan_tahunan_kg: totalTahunanKg > 0 ? totalTahunanKg : undefined,
        total_pasokan_tahunan_ton: totalTahunanTon > 0 ? totalTahunanTon : undefined,
        merek_beras: merekBeras.trim(),
        jenis_kemasan: jenisKemasan.trim(),
        catatan_lapangan: catatanLapangan.trim()
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const token = getAuthToken ? await getAuthToken() : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (enumerator?.email) {
        headers['x-enumerator-email'] = enumerator.email;
        headers['x-enumerator-name'] = enumerator.nama || '';
      }

      const res = await fetch('/api/kamera-cerdas/observasi', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menyimpan perubahan');
      }

      const updated = json.data || { ...record, ...updatePayload };
      onSaveSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memperbarui');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !record) return null;

  const creatorName = record.petugas_nama || (record.foto_watermark_meta as any)?.enumerator_nama || 'Petugas Lapangan';
  const creatorEmail = record.petugas_email || (record.foto_watermark_meta as any)?.enumerator_email || '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-emerald-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col text-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between bg-white/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAllowed ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500 border border-slate-300'
            }`}>
              {isAllowed ? <Edit3 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                {isAllowed ? 'Edit Data Sarana / Titik Pasokan' : 'Rincian Data Sarana (Hanya-Lihat)'}
              </h3>
              <p className="text-[10px] text-slate-500">
                Diinput oleh: <strong className="text-slate-700">{creatorName}</strong> {creatorEmail ? `(${creatorEmail})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* Governance Notice Banner */}
          {isAllowed ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-950 leading-relaxed">
                <span className="font-bold">Akses Governance Terverifikasi:</span> Anda diizinkan mengedit seluruh data sarana ini sebagai <strong>{isAdmin ? 'Admin DKPP' : 'User Pendata Asli'}</strong>.
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-950 leading-relaxed">
                <span className="font-bold">Akses Terkunci (Governance):</span> Hanya Admin DKPP atau user pendata yang menginput titik ini ({creatorName}) yang memiliki hak mengubah data. Form ditampilkan dalam mode baca saja.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-bold">
              âš ï¸ {errorMessage}
            </div>
          )}

          {/* Foto Preview & Info Lokasi GPS */}
          {record.foto_url && (
            <div className="relative rounded-xl overflow-hidden border border-emerald-200 aspect-[16/9] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={record.foto_url} alt="Foto Sarana" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-800 flex items-center gap-1.5 border border-emerald-300">
                <MapPin className="w-3 h-3 text-emerald-700" />
                <span>{Number(record.latitude).toFixed(5)}, {Number(record.longitude).toFixed(5)}</span>
              </div>
            </div>
          )}

          <div className="space-y-3.5 text-left">
            
            {/* Nama Lokasi / Toko */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Toko / Outlet / Kios Pasar:
              </label>
              <input
                type="text"
                disabled={!isAllowed}
                value={namaLokasi}
                onChange={(e) => setNamaLokasi(e.target.value)}
                placeholder="Nama sarana distribusi..."
                className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:bg-slate-100"
              />
            </div>

            {/* Jenis Sarana Distribusi */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Jenis Sarana Distribusi:
              </label>
              <button
                type="button"
                disabled={!isAllowed}
                onClick={() => {
                  setIsKategoriDropdownOpen(!isKategoriDropdownOpen);
                  setIsAsalDropdownOpen(false);
                }}
                className="w-full bg-[#ECFDF5] border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-colors disabled:opacity-60 disabled:bg-slate-100 cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-sm shrink-0">{selectedKategori.icon}</span>
                  <span className="truncate">{selectedKategori.label}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 shrink-0 ${isKategoriDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isKategoriDropdownOpen && isAllowed && (
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

            {/* Kecamatan & Kelurahan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Kecamatan</label>
                <select
                  disabled={!isAllowed}
                  value={kecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:bg-slate-100"
                >
                  {Object.keys(WILAYAH).map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Kelurahan</label>
                <select
                  disabled={!isAllowed}
                  value={kelurahan}
                  onChange={(e) => setKelurahan(e.target.value)}
                  className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:bg-slate-100"
                >
                  {(WILAYAH[kecamatan] || []).map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimasi Pasokan Saat Ini (Kg) */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl space-y-2">
              <label className="block text-[11px] font-black text-emerald-950">
                Estimasi Stok / Pasokan Tersedia Saat Ini (Kg):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={!isAllowed}
                    value={estimasiPasokanKg}
                    onChange={(e) => setEstimasiPasokanKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Volume pasokan saat foto..."
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                </div>
                <div className="text-xs font-bold text-slate-700 flex items-center px-2 bg-emerald-100/50 rounded-lg border border-emerald-200 justify-center">
                  KG
                </div>
              </div>
            </div>

            {/* Kotak Input: Frekuensi dan Jumlah Pasokan (Capture 2) */}
            <div className="bg-gradient-to-br from-white to-emerald-50/70 border border-emerald-300 p-3.5 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                    ðŸ”„
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
                      disabled={!isAllowed}
                      value={frekuensiPasokan}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setFrekuensiPasokan(val);
                      }}
                      placeholder="Contoh: 2"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <select
                      disabled={!isAllowed}
                      value={satuanFrekuensi}
                      onChange={(e) => setSatuanFrekuensi(e.target.value as 'hari' | 'minggu' | 'bulan')}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
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
                      disabled={!isAllowed}
                      value={jumlahRataRataPasokan}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setJumlahRataRataPasokan(val);
                      }}
                      placeholder="Contoh: 500"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-400 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <select
                      disabled={!isAllowed}
                      value={satuanVolumePasokan}
                      onChange={(e) => setSatuanVolumePasokan(e.target.value as 'kg' | 'kwintal' | 'ton')}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
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
                        `${frekuensiPasokan}Ã—/${satuanFrekuensi} (${frekPerTahun.toLocaleString('id-ID')}Ã—/thn) Ã— ${jumlahRataRataPasokan} ${satuanVolumePasokan}`
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

            {/* Asal Sumber Pasokan Beras (Capture 3: Dropdown in-flow, UX scroll tidak terkunci) */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Asal / Sumber Pasokan Beras:
              </label>
              <button
                type="button"
                disabled={!isAllowed}
                onClick={() => {
                  setIsAsalDropdownOpen(!isAsalDropdownOpen);
                  setIsKategoriDropdownOpen(false);
                }}
                className="w-full bg-[#ECFDF5] border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-colors disabled:opacity-60 disabled:bg-slate-100 cursor-pointer text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-emerald-700 shrink-0">
                    {asalPasokan === 'Lainnya (Manual)' ? 'âœï¸' : 'ðŸ“'}
                  </span>
                  <span className="truncate">
                    {asalPasokan === 'Lainnya (Manual)' && manualAsalText
                      ? `Lainnya: ${manualAsalText}`
                      : asalPasokan}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 shrink-0 ${isAsalDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAsalDropdownOpen && isAllowed && (
                <div className="relative mt-2 z-10 bg-[#F0FDF4] border-2 border-emerald-400 rounded-xl shadow-md overflow-hidden animate-in fade-in duration-150">
                  <div className="p-2 border-b border-emerald-200 bg-white sticky top-0 z-10">
                    <input
                      type="text"
                      value={searchAsal}
                      onChange={(e) => setSearchAsal(e.target.value)}
                      placeholder="ðŸ” Cari nama kota / kabupaten / provinsi..."
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
                            }
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer border-b border-emerald-100/60 last:border-b-0 ${
                            isSelected
                              ? 'bg-[#1A73E8] text-white font-bold shadow-xs'
                              : 'text-slate-800 hover:bg-emerald-100/70'
                          }`}
                        >
                          <span className="text-sm shrink-0">{isManual ? 'âœï¸' : 'ðŸ“'}</span>
                          <span className="truncate leading-tight font-medium">{asal}</span>
                        </div>
                      );
                    })}
                    {filteredAsalOptions.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-500">
                        Wilayah tidak ditemukan. Pilih{' '}
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

              {/* Input Manual jika memilih Lainnya */}
              {asalPasokan === 'Lainnya (Manual)' && (
                <div className="mt-2 p-2.5 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-1.5 animate-in fade-in">
                  <label className="text-[10.5px] font-bold text-emerald-950 block">
                    Ketik Wilayah Asal Pasokan:
                  </label>
                  <input
                    type="text"
                    disabled={!isAllowed}
                    value={manualAsalText}
                    onChange={(e) => setManualAsalText(e.target.value)}
                    placeholder="Contoh: Palembang, Cianjur, Subang..."
                    className="w-full bg-emerald-50/70 border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Merek Beras & Jenis Kemasan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Merek Beras</label>
                <input
                  type="text"
                  disabled={!isAllowed}
                  value={merekBeras}
                  onChange={(e) => setMerekBeras(e.target.value)}
                  placeholder="Contoh: Ramos, Sania..."
                  className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Jenis Kemasan</label>
                <input
                  type="text"
                  disabled={!isAllowed}
                  value={jenisKemasan}
                  onChange={(e) => setJenisKemasan(e.target.value)}
                  placeholder="Contoh: Karung 25 kg..."
                  className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Catatan Lapangan */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Catatan Petugas Lapangan:
              </label>
              <textarea
                rows={2}
                disabled={!isAllowed}
                value={catatanLapangan}
                onChange={(e) => setCatatanLapangan(e.target.value)}
                placeholder="Catatan tambahan kondisi stok, kendala pasokan, dsb..."
                className="w-full bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
              />
            </div>

          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-emerald-100 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white/95 pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {isAllowed ? 'Batal' : 'Tutup'}
            </button>
            {isAllowed && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}

