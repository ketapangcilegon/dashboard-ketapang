"use client";

import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Download, FileSpreadsheet, PlusCircle, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Standard Kecamatan and Kelurahan in Cilegon City
const WILAYAH: Record<string, string[]> = {
  'Cibeber':    ['Cibeber', 'Kedaleman', 'Bulakan', 'Cikerai', 'Karang Asem', 'Kalitimbang'],
  'Cilegon':    ['Bagendung', 'Ciwedus', 'Bendungan', 'Ketileng', 'Ciwaduk'],
  'Pulo Merak': ['Tamansari', 'Lebakgede', 'Mekarsari', 'Suralaya'],
  'Ciwandan':   ['Banjar Negara', 'Tegal Ratu', 'Kubangsari', 'Gunung Sugih', 'Kepuh', 'Randakari'],
  'Jombang':    ['Sukmajaya', 'Jombang Wetan', 'Masigit', 'Panggung Rawi', 'Gedong Dalem'],
  'Gerogol':    ['Kotasari', 'Gerogol', 'Rawa Arum', 'Gerem'],
  'Purwakarta': ['Ramanuju', 'Kotabumi', 'Kebon Dalem', 'Purwakarta', 'Tegal Bunder', 'Pabean'],
  'Citangkil':  ['Warnasari', 'Deringo', 'Kebonsari', 'Taman Baru', 'Lebak Denok', 'Samangraya', 'Citangkil'],
};

type DataType = 'harga' | 'gizi' | 'balita' | 'pou';
type ViewMode = 'upload' | 'manual';

export default function UploadPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [selectedType, setSelectedType] = useState<DataType>('harga');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Form State: General location selectors
  const [kecamatan, setKecamatan] = useState('Cibeber');
  const [kelurahan, setKelurahan] = useState('Cibeber');

  // Form State: Harga Pangan
  const [hargaForm, setHargaForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    beras: 13500,
    minyak: 21000,
    telur: 30400,
    gula: 16000,
    cabai: 45000,
  });

  // Form State: Gizi & Demografi
  const [giziForm, setGiziForm] = useState({
    tahun: 2025,
    pendudukLaki: 5000,
    pendudukPerempuan: 4900,
    luasSawah: 25.5,
    luasWilayah: 200.0,
    pph: 92.5,
    stunting: 8.5,
    pou: 2.5,
    airBersih: 98.0,
    miskin: 12.5,
    gkg: 150.0,
    jagung: 10.0,
    ubiKayu: 15.0,
    ubiJalar: 5.0,
  });

  // Form State: Balita & GPM
  const [balitaForm, setBalitaForm] = useState({
    tahun: 2026,
    bulan: 2,
    sangatKurang: 30,
    kurang: 120,
    normal: 3500,
    lebih: 100,
    status: 'AMAN',
    gpm: 1,
    bantuan: 1400,
  });

  // Form State: POU Data (Nasional, Provinsi Banten, Kota Cilegon)
  const [pouForm, setPouForm] = useState({
    tahun: 2025,
    nasional: 7.89,
    provinsi: 2.88,
    cilegon: 2.78
  });

  // Automatically update kelurahan when kecamatan changes
  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKec = e.target.value;
    setKecamatan(newKec);
    if (WILAYAH[newKec] && WILAYAH[newKec].length > 0) {
      setKelurahan(WILAYAH[newKec][0]);
    }
  };

  // Helper to compute CV (Coefficient of Variation) for price data
  const computeCV = (beras: number, minyak: number, telur: number, gula: number, cabai: number) => {
    const prices = [beras, telur, 35000, minyak, gula, cabai]; // Includes default chicken price (35000)
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / prices.length);
    return parseFloat(((stdDev / mean) * 100).toFixed(2));
  };

  // Download Excel Template dynamically
  const downloadTemplate = async (type: DataType) => {
    try {
      const XLSX = await import('xlsx');
      let headers: string[] = [];
      let sampleData: any[] = [];
      let filename = '';

      if (type === 'harga') {
        filename = 'template_harga_pangan.xlsx';
        headers = ['Tanggal', 'Kecamatan', 'Kelurahan', 'Beras', 'Minyak', 'Telur', 'Gula', 'Cabai'];
        sampleData = [
          ['2026-05-28', 'Cibeber', 'Cibeber', 13500, 22000, 30400, 16000, 45000],
          ['2026-05-28', 'Cibeber', 'Kedaleman', 13500, 22000, 30400, 16000, 45000],
        ];
      } else if (type === 'gizi') {
        filename = 'template_gizi_demografi.xlsx';
        headers = [
          'Tahun', 'Kecamatan', 'Kelurahan', 'Penduduk Laki', 'Penduduk Perempuan', 
          'Luas Sawah', 'Luas Wilayah', 'PPH', 'Stunting', 'PoU', 'Air Bersih', 
          'Miskin', 'GKG', 'Jagung', 'Ubi Kayu', 'Ubi Jalar'
        ];
        sampleData = [
          [2025, 'Cibeber', 'Cibeber', 11761, 11570, 31.5, 239.0, 92.65, 2.18, 1.798, 97.82, 2.18, 602.62, 20.53, 65.68, 5.25],
        ];
      } else if (type === 'balita') {
        filename = 'template_balita_gpm.xlsx';
        headers = ['Tahun', 'Bulan', 'Kecamatan', 'BB Sangat Kurang', 'BB Kurang', 'BB Normal', 'BB Lebih', 'Status', 'Kegiatan GPM', 'Bantuan'];
        sampleData = [
          [2026, 2, 'Cibeber', 47, 132, 3731, 102, 'AMAN', 1, 1420],
        ];
      } else if (type === 'pou') {
        filename = 'template_grafik_pou.xlsx';
        headers = ['Tahun', 'POU Nasional', 'POU Provinsi Banten', 'POU Cilegon'];
        sampleData = [
          [2025, 7.89, 2.88, 2.78],
        ];
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal men-download template:', err);
    }
  };

  // Upload and Parse Excel File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setMessage('Membaca file Excel...');

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rows.length === 0) {
        throw new Error('File Excel kosong atau format tidak sesuai.');
      }

      setMessage(`Mengunggah ${rows.length} baris data ke database...`);
      let successCount = 0;

      for (const row of rows) {
        if (selectedType === 'harga') {
          // Normalize inputs
          const tanggal = row['Tanggal'] || new Date().toISOString().split('T')[0];
          const kec = row['Kecamatan'] || 'Cibeber';
          const kel = row['Kelurahan'] || 'Cibeber';
          const beras = parseFloat(row['Beras']) || 0;
          const minyak = parseFloat(row['Minyak']) || 0;
          const telur = parseFloat(row['Telur']) || 0;
          const gula = parseFloat(row['Gula']) || 0;
          const cabai = parseFloat(row['Cabai']) || 0;
          const cv = computeCV(beras, minyak, telur, gula, cabai);

          const { error } = await supabase.from('harga_pangan').insert({
            tanggal,
            kecamatan: kec.trim(),
            kelurahan: kel.trim(),
            beras,
            minyak_goreng: minyak,
            telur,
            gula_pasir: gula,
            cabe_merah: cabai,
            daging_ayam: 35000, // Default chicken price
            cv_harga: cv,
          });

          if (error) throw error;

        } else if (selectedType === 'gizi') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const kec = row['Kecamatan'] || 'Cibeber';
          const kel = row['Kelurahan'] || 'Cibeber';
          const l = parseInt(row['Penduduk Laki']) || 0;
          const p = parseInt(row['Penduduk Perempuan']) || 0;
          const airBersih = parseFloat(row['Air Bersih']) || 100;
          const miskin = parseFloat(row['Miskin']) || 0;

          const { error } = await supabase.from('gizi_masyarakat').insert({
            tahun,
            kecamatan: kec.trim(),
            kelurahan: kel.trim(),
            penduduk_laki: l,
            penduduk_perempuan: p,
            penduduk_total: l + p,
            luas_sawah: parseFloat(row['Luas Sawah']) || 0,
            luas_wilayah: parseFloat(row['Luas Wilayah']) || 0,
            skor_pph: parseFloat(row['PPH']) || 0,
            prevalensi_stunting: parseFloat(row['Stunting']) || 0,
            pou: parseFloat(row['PoU']) || 0,
            rt_tanpa_air_bersih_persen: Math.max(0, 100 - airBersih),
            rt_miskin_persen: miskin,
            produksi_gkg: parseFloat(row['GKG']) || 0,
            produksi_jagung: parseFloat(row['Jagung']) || 0,
            produksi_ubi_kayu: parseFloat(row['Ubi Kayu']) || 0,
            produksi_ubi_jalar: parseFloat(row['Ubi Jalar']) || 0,
            konsumsi_energi_kkal: 2050, // Rich defaults
            standar_energi: 2100,
            konsumsi_protein_gram: 20,
            standar_protein_hewani: 25,
            perempuan_sekolah_persen: 92,
          });

          if (error) throw error;

        } else if (selectedType === 'balita') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const bulan = parseInt(row['Bulan']) || 1;
          const kec = row['Kecamatan'] || 'Cibeber';
          const sangatKurang = parseInt(row['BB Sangat Kurang']) || 0;
          const kurang = parseInt(row['BB Kurang']) || 0;
          const normal = parseInt(row['BB Normal']) || 0;
          const lebih = parseInt(row['BB Lebih']) || 0;
          const status = row['Status'] || 'AMAN';
          const gpm = parseInt(row['Kegiatan GPM']) || 0;
          const bantuan = parseInt(row['Bantuan']) || 0;

          // Insert into balita_gizi
          const { error: errorBalita } = await supabase.from('balita_gizi').insert({
            tahun,
            bulan,
            kecamatan: kec.trim(),
            sangat_kurang: sangatKurang,
            kurang,
            normal,
            lebih,
            status,
          });
          if (errorBalita) throw errorBalita;

          // Insert into intervensi_pangan
          const { error: errorInt } = await supabase.from('intervensi_pangan').insert({
            tahun,
            bulan,
            kecamatan: kec.trim(),
            kelurahan: '-', // Aggregated kecamatan level
            penerima_bantuan_jiwa: bantuan,
            kegiatan_gpm: gpm,
          });
          if (errorInt) throw errorInt;

        } else if (selectedType === 'pou') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const pouNasional = parseFloat(row['POU Nasional']) || 0;
          const pouProvinsi = parseFloat(row['POU Provinsi Banten']) || 0;
          const pouCilegon = parseFloat(row['POU Cilegon']) || 0;

          const { error } = await supabase.from('pou_data').upsert({
            tahun,
            pou_nasional: pouNasional,
            pou_provinsi: pouProvinsi,
            pou_cilegon: pouCilegon,
          }, { onConflict: 'tahun' });

          if (error) throw error;
        }

        successCount++;
      }

      setStatus('success');
      setMessage(`Berhasil memproses ${successCount} baris data! Dashboard Anda telah diperbarui.`);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan saat memproses file Excel.');
    }
  };

  // Submit Manual Form Entry
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setMessage('Menyimpan data manual ke Supabase...');

    try {
      if (selectedType === 'harga') {
        const { beras, minyak, telur, gula, cabai, tanggal } = hargaForm;
        const cv = computeCV(beras, minyak, telur, gula, cabai);

        const { error } = await supabase.from('harga_pangan').insert({
          tanggal,
          kecamatan,
          kelurahan,
          beras,
          minyak_goreng: minyak,
          telur,
          gula_pasir: gula,
          cabe_merah: cabai,
          daging_ayam: 35000,
          cv_harga: cv,
        });
        if (error) throw error;

      } else if (selectedType === 'gizi') {
        const {
          tahun, pendudukLaki, pendudukPerempuan, luasSawah, luasWilayah,
          pph, stunting, pou, airBersih, miskin, gkg, jagung, ubiKayu, ubiJalar
        } = giziForm;

        const { error } = await supabase.from('gizi_masyarakat').insert({
          tahun,
          kecamatan,
          kelurahan,
          penduduk_laki: pendudukLaki,
          penduduk_perempuan: pendudukPerempuan,
          penduduk_total: pendudukLaki + pendudukPerempuan,
          luas_sawah: luasSawah,
          luas_wilayah: luasWilayah,
          skor_pph: pph,
          prevalensi_stunting: stunting,
          pou,
          rt_tanpa_air_bersih_persen: Math.max(0, 100 - airBersih),
          rt_miskin_persen: miskin,
          produksi_gkg: gkg,
          produksi_jagung: jagung,
          produksi_ubi_kayu: ubiKayu,
          produksi_ubi_jalar: ubiJalar,
          konsumsi_energi_kkal: 2050,
          standar_energi: 2100,
          konsumsi_protein_gram: 20,
          standar_protein_hewani: 25,
          perempuan_sekolah_persen: 92,
        });
        if (error) throw error;

      } else if (selectedType === 'balita') {
        const { tahun, bulan, sangatKurang, kurang, normal, lebih, status: statusGizi, gpm, bantuan } = balitaForm;

        const { error: errorBalita } = await supabase.from('balita_gizi').insert({
          tahun,
          bulan,
          kecamatan,
          sangat_kurang: sangatKurang,
          kurang,
          normal,
          lebih,
          status: statusGizi,
        });
        if (errorBalita) throw errorBalita;

        const { error: errorInt } = await supabase.from('intervensi_pangan').insert({
          tahun,
          bulan,
          kecamatan,
          kelurahan: '-',
          penerima_bantuan_jiwa: bantuan,
          kegiatan_gpm: gpm,
        });
        if (errorInt) throw errorInt;
      } else if (selectedType === 'pou') {
        const { tahun, nasional, provinsi, cilegon } = pouForm;
        const { error } = await supabase.from('pou_data').upsert({
          tahun,
          pou_nasional: nasional,
          pou_provinsi: provinsi,
          pou_cilegon: cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      }

      setStatus('success');
      setMessage('Data manual berhasil disimpan ke database!');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Gagal menyimpan data manual.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Dynamic View & Type Selectors */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-slate-100">
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => { setViewMode('upload'); setStatus('idle'); }}
            className={`flex items-center justify-center gap-2 flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-all ${
              viewMode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Upload Excel
          </button>
          <button
            onClick={() => { setViewMode('manual'); setStatus('idle'); }}
            className={`flex items-center justify-center gap-2 flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-all ${
              viewMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Input Manual
          </button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          {(['harga', 'gizi', 'balita', 'pou'] as DataType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setStatus('idle'); }}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-md capitalize transition-all ${
                selectedType === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === 'harga' ? 'Harga Pangan' : type === 'gizi' ? 'Gizi & Demografi' : type === 'balita' ? 'Balita & GPM' : 'Grafik POU'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Action Box */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-100">
        {status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 transition-all ${
            status === 'processing' ? 'bg-blue-50 text-blue-700' :
            status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {status === 'error' && <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold text-sm">{message}</span>
          </div>
        )}

        {viewMode === 'upload' ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileSpreadsheet className="w-8 h-8 text-blue-500" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Upload {selectedType === 'harga' ? 'Harga Pangan Strategis' : selectedType === 'gizi' ? 'Gizi & Demografi Kelurahan' : selectedType === 'balita' ? 'Balita & Intervensi GPM' : 'Data POU Historis'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Gunakan template Excel resmi agar format baris dan kolom sesuai untuk dashboard.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => downloadTemplate(selectedType)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> Download Excel Template
              </button>
            </div>

            <label className="relative cursor-pointer group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mb-3 transition-colors" />
                <p className="mb-2 text-sm text-slate-600">
                  <span className="font-black text-blue-600">Klik untuk upload template</span> atau drag and drop
                </p>
                <p className="text-xs text-slate-400">Hanya format XLSX atau XLS (Maks. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={status === 'processing'}
              />
            </label>
          </div>
        ) : (
          /* MANUAL ENTRY FORM VIEW */
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Edit className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800 capitalize">
                Form Input Manual: {selectedType === 'harga' ? 'Harga Pangan' : selectedType === 'gizi' ? 'Gizi & Demografi' : selectedType === 'balita' ? 'Balita & GPM' : 'Data POU'}
              </h3>
            </div>

            {/* Common Location Selectors (Hidden for City-wide POU Data) */}
            {selectedType !== 'pou' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Kecamatan</label>
                  <select
                    value={kecamatan}
                    onChange={handleKecamatanChange}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {Object.keys(WILAYAH).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {selectedType !== 'balita' && (
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Kelurahan</label>
                    <select
                      value={kelurahan}
                      onChange={(e) => setKelurahan(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all"
                    >
                      {(WILAYAH[kecamatan] || []).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Specific Form Fields */}
            {selectedType === 'harga' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Tanggal Release</label>
                  <input
                    type="date"
                    required
                    value={hargaForm.tanggal}
                    onChange={(e) => setHargaForm({ ...hargaForm, tanggal: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Beras (Rp/kg)</label>
                  <input
                    type="number"
                    required
                    value={hargaForm.beras}
                    onChange={(e) => setHargaForm({ ...hargaForm, beras: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Minyak Goreng (Rp/Lt)</label>
                  <input
                    type="number"
                    required
                    value={hargaForm.minyak}
                    onChange={(e) => setHargaForm({ ...hargaForm, minyak: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Telur Ayam (Rp/kg)</label>
                  <input
                    type="number"
                    required
                    value={hargaForm.telur}
                    onChange={(e) => setHargaForm({ ...hargaForm, telur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Gula Pasir (Rp/kg)</label>
                  <input
                    type="number"
                    required
                    value={hargaForm.gula}
                    onChange={(e) => setHargaForm({ ...hargaForm, gula: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Cabai Merah (Rp/kg)</label>
                  <input
                    type="number"
                    required
                    value={hargaForm.cabai}
                    onChange={(e) => setHargaForm({ ...hargaForm, cabai: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {selectedType === 'gizi' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun Rilis</label>
                    <input
                      type="number"
                      required
                      value={giziForm.tahun}
                      onChange={(e) => setGiziForm({ ...giziForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Penduduk Laki-laki (Jiwa)</label>
                    <input
                      type="number"
                      required
                      value={giziForm.pendudukLaki}
                      onChange={(e) => setGiziForm({ ...giziForm, pendudukLaki: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Penduduk Perempuan (Jiwa)</label>
                    <input
                      type="number"
                      required
                      value={giziForm.pendudukPerempuan}
                      onChange={(e) => setGiziForm({ ...giziForm, pendudukPerempuan: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Luas Sawah (Ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.luasSawah}
                      onChange={(e) => setGiziForm({ ...giziForm, luasSawah: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Luas Wilayah (Ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.luasWilayah}
                      onChange={(e) => setGiziForm({ ...giziForm, luasWilayah: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PPH (Skor)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.pph}
                      onChange={(e) => setGiziForm({ ...giziForm, pph: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Prevalensi Stunting (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.stunting}
                      onChange={(e) => setGiziForm({ ...giziForm, stunting: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PoU (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.pou}
                      onChange={(e) => setGiziForm({ ...giziForm, pou: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Akses Air Bersih (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.airBersih}
                      onChange={(e) => setGiziForm({ ...giziForm, airBersih: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Masyarakat Miskin (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.miskin}
                      onChange={(e) => setGiziForm({ ...giziForm, miskin: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi GKG (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.gkg}
                      onChange={(e) => setGiziForm({ ...giziForm, gkg: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi Jagung (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.jagung}
                      onChange={(e) => setGiziForm({ ...giziForm, jagung: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi Ubi Kayu (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.ubiKayu}
                      onChange={(e) => setGiziForm({ ...giziForm, ubiKayu: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi Ubi Jalar (Ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={giziForm.ubiJalar}
                      onChange={(e) => setGiziForm({ ...giziForm, ubiJalar: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'balita' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun Rilis</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.tahun}
                      onChange={(e) => setBalitaForm({ ...balitaForm, tahun: parseInt(e.target.value) || 2026 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Bulan</label>
                    <select
                      value={balitaForm.bulan}
                      onChange={(e) => setBalitaForm({ ...balitaForm, bulan: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Status Gizi Balita</label>
                    <select
                      value={balitaForm.status}
                      onChange={(e) => setBalitaForm({ ...balitaForm, status: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="AMAN">AMAN</option>
                      <option value="WASPADA">WASPADA</option>
                      <option value="AWAS">AWAS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">BB Sangat Kurang (Balita)</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.sangatKurang}
                      onChange={(e) => setBalitaForm({ ...balitaForm, sangatKurang: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">BB Kurang (Balita)</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.kurang}
                      onChange={(e) => setBalitaForm({ ...balitaForm, kurang: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">BB Normal (Balita)</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.normal}
                      onChange={(e) => setBalitaForm({ ...balitaForm, normal: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">BB Lebih (Balita)</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.lebih}
                      onChange={(e) => setBalitaForm({ ...balitaForm, lebih: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Jumlah Kegiatan GPM</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.gpm}
                      onChange={(e) => setBalitaForm({ ...balitaForm, gpm: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Bantuan Pangan (Jiwa)</label>
                    <input
                      type="number"
                      required
                      value={balitaForm.bantuan}
                      onChange={(e) => setBalitaForm({ ...balitaForm, bantuan: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'pou' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik POU Lintas Tahun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={pouForm.tahun}
                      onChange={(e) => setPouForm({ ...pouForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">POU Nasional (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pouForm.nasional}
                      onChange={(e) => setPouForm({ ...pouForm, nasional: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">POU Banten (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pouForm.provinsi}
                      onChange={(e) => setPouForm({ ...pouForm, provinsi: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">POU Cilegon (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pouForm.cilegon}
                      onChange={(e) => setPouForm({ ...pouForm, cilegon: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all active:scale-95"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={status === 'processing'}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
              >
                {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan ke Database
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
