"use client";

import { useState } from 'react';

import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UploadPanel() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setMessage('Membaca file Excel...');

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Data starts at row 3 (index 2) usually, but sheet_to_json handles objects better if we specify header row.
      // Alternatively, we use array of arrays
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];
      
      // Find where headers actually start (look for 'Kecamatan' or 'No')
      let headerRowIndex = 0;
      for (let i = 0; i < 10; i++) {
        if (rows[i] && rows[i].includes('Kecamatan')) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rows[headerRowIndex];
      const dataRows = rows.slice(headerRowIndex + 1).filter(r => r.length > 0 && r[0]);

      setMessage(`Ditemukan ${dataRows.length} baris data kecamatan. Memproses ke database...`);

      // Dummy algorithm to save. In reality, we map these to Supabase.
      // Example row:
      // index 1: Tahun, 2: Kecamatan, 9: Produksi GKG, 13: Konsumsi Energi, 22: PPH, 23: Stunting, 24: Harga beras
      
      let successCount = 0;
      
      for (const row of dataRows) {
         const kecamatan = row[2] || 'Tidak diketahui';
         const tahun = parseInt(row[1]) || new Date().getFullYear();
         
         // 1. Simpan Harga Pangan
         await supabase.from('harga_pangan').insert({
            tanggal: new Date().toISOString().split('T')[0],
            kecamatan: kecamatan,
            beras: parseFloat(row[24]) || 0,
            minyak_goreng: parseFloat(row[25]) || 0,
            telur: parseFloat(row[26]) || 0,
            gula_pasir: parseFloat(row[27]) || 0,
         });

         // 2. Simpan Ketersediaan Pangan (Produksi GKG diubah ke beras = x 0.64)
         const prodGKG = parseFloat(row[9]) || 0;
         await supabase.from('ketersediaan_pangan').insert({
            tahun: tahun,
            bulan: new Date().getMonth() + 1,
            produksi_beras_ton: prodGKG * 0.64,
            skor_nbm: 90 + Math.random() * 10 // Mock formula for now
         });

         // 3. Simpan Gizi
         await supabase.from('gizi_masyarakat').insert({
            tahun: tahun,
            kecamatan: kecamatan,
            skor_pph: parseFloat(row[22]) || 0,
            konsumsi_energi_kkal: parseFloat(row[13]) || 0,
            konsumsi_protein_gram: parseFloat(row[15]) || 0,
            prevalensi_stunting: parseFloat(row[23]) || 0,
            pou: parseFloat(row[19]) || 0
         });
         
         successCount++;
      }

      setStatus('success');
      setMessage(`Berhasil memproses ${successCount} kecamatan. Dashboard akan segera diperbarui!`);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan saat memproses file');
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-2xl mx-auto text-center">
      
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
          <UploadCloud className="w-10 h-10 text-blue-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Data Bulanan</h2>
      <p className="text-slate-500 mb-8">Pilih file template_data.xlsx untuk mengupdate seluruh indikator.</p>

      <label className="relative cursor-pointer group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-4 text-slate-400 group-hover:text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          <p className="mb-2 text-sm text-slate-500"><span className="font-bold text-blue-600">Klik untuk upload</span> atau drag and drop</p>
          <p className="text-xs text-slate-400">XLSX, XLS (MAX. 10MB)</p>
        </div>
        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={processFile} disabled={status === 'uploading'} />
      </label>

      {status !== 'idle' && (
        <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
          status === 'uploading' ? 'bg-blue-50 text-blue-700' :
          status === 'success' ? 'bg-emerald-50 text-emerald-700' :
          'bg-red-50 text-red-700'
        }`}>
          {status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {status === 'error' && <AlertCircle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{message}</span>
        </div>
      )}
      
    </div>
  );
}
