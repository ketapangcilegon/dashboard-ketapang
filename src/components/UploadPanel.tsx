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

type DataType = 'harga' | 'pou' | 'cv_beras' | 'pph' | 'k_energi' | 'k_protein' | 't_energi' | 't_protein' | 'produksi_beras' | 'fsva_matang' | 'skpg_matang' | 'gizi_balita' | 'intervensi_kelurahan';
type ViewMode = 'upload' | 'manual';

const DATA_TYPES = [
  { value: 'gizi_balita', label: 'Gizi Balita Kel' },
  { value: 'intervensi_kelurahan', label: 'Intervensi Kel' },
  { value: 'fsva_matang', label: 'FSVA Matang' },
  { value: 'skpg_matang', label: 'SKPG Matang' },
  { value: 'pou', label: 'Grafik POU' },
  { value: 'cv_beras', label: 'CV Beras' },
  { value: 'pph', label: 'Skor PPH' },
  { value: 'k_energi', label: 'Konsumsi Energi' },
  { value: 'k_protein', label: 'Konsumsi Protein' },
  { value: 't_energi', label: 'Ketersediaan Energi' },
  { value: 't_protein', label: 'Ketersediaan Protein' },
  { value: 'produksi_beras', label: 'Produksi Beras' }
] as const;

export default function UploadPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [selectedType, setSelectedType] = useState<DataType>('gizi_balita');
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

  // Form State: POU Data (Nasional, Provinsi Banten, Kota Cilegon)
  const [pouForm, setPouForm] = useState({
    tahun: 2025,
    nasional: 7.89,
    provinsi: 2.88,
    cilegon: 2.78
  });

  // Form State: CV Beras
  const [cvBerasForm, setCvBerasForm] = useState({
    tahun: 2025,
    target: 10,
    cilegon: 3.65
  });

  // Form State: PPH
  const [pphForm, setPphForm] = useState({
    tahun: 2025,
    target: 80,
    cilegon: 90.9
  });

  // Form State: Konsumsi Energi
  const [kEnergiForm, setKEnergiForm] = useState({
    tahun: 2025,
    target: 2100,
    cilegon: 2021
  });

  // Form State: Konsumsi Protein
  const [kProteinForm, setKProteinForm] = useState({
    tahun: 2025,
    target: 57,
    cilegon: 59
  });

  // Form State: Ketersediaan Energi
  const [tEnergiForm, setTEnergiForm] = useState({
    tahun: 2025,
    target: 2400,
    cilegon: 2582
  });

  // Form State: Ketersediaan Protein
  const [tProteinForm, setTProteinForm] = useState({
    tahun: 2025,
    target: 63,
    cilegon: 85
  });

  // Form State: Produksi Beras Lokal
  const [produksiBerasForm, setProduksiBerasForm] = useState({
    tahun: 2025,
    produksiGkg: 13772.30,
    konversi: 63.23,
    produksiBeras: 8708.20
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
      } else if (type === 'pou') {
        filename = 'template_grafik_pou.xlsx';
        headers = ['Tahun', 'POU Nasional', 'POU Provinsi Banten', 'POU Cilegon'];
        sampleData = [
          [2025, 7.89, 2.88, 2.78],
        ];
      } else if (type === 'cv_beras') {
        filename = 'template_cv_beras.xlsx';
        headers = ['Tahun', 'CV Beras', 'Target CV'];
        sampleData = [
          [2025, 3.65, '< 10 %'],
        ];
      } else if (type === 'pph') {
        filename = 'template_pph.xlsx';
        headers = ['Tahun', 'PPH Nasional Target', 'PPH Cilegon'];
        sampleData = [
          [2025, 80, 90.9],
        ];
      } else if (type === 'k_energi') {
        filename = 'template_konsumsi_energi.xlsx';
        headers = ['Tahun', 'Konsumsi Energi Standar Nasional', 'Konsumsi Energi Cilegon'];
        sampleData = [
          [2025, 2100, 2021],
        ];
      } else if (type === 'k_protein') {
        filename = 'template_konsumsi_protein.xlsx';
        headers = ['Tahun', 'Konsumsi Protein Standar Nasional', 'Konsumsi Protein Cilegon'];
        sampleData = [
          [2025, 57, 59],
        ];
      } else if (type === 't_energi') {
        filename = 'template_ketersediaan_energi.xlsx';
        headers = ['Tahun', 'Ketersediaan Energi Standar Nasional', 'Ketersediaan Energi Cilegon'];
        sampleData = [
          [2025, 2400, 2582],
        ];
      } else if (type === 't_protein') {
        filename = 'template_ketersediaan_protein.xlsx';
        headers = ['Tahun', 'Ketersediaan Protein Standar Nasional', 'Ketersediaan Protein Cilegon'];
        sampleData = [
          [2025, 63, 85],
        ];
      } else if (type === 'produksi_beras') {
        filename = 'template_produksi_beras.xlsx';
        headers = ['Tahun', 'Produksi GKG', 'Angka Konversi GKG ke Beras', 'Produksi Beras'];
        sampleData = [
          [2025, 13772.30, 63.23, 8708.20],
        ];
      } else if (type === 'fsva_matang') {
        filename = 'template_fsva.xlsx';
        headers = ['nama_kelurahan', 'kode_kel_bps', 'ikp', 'periode'];
        sampleData = [
          ['Bagendung', '3672030001', 70.78556644, 2025],
          ['Banjar Negara', '3672010005', 71.90255582, 2025],
        ];
      } else if (type === 'skpg_matang') {
        filename = 'template_skpg.xlsx';
        headers = ['Tahun', 'Bulan', 'Kecamatan', 'nama_kelurahan', 'gizi_sangat_kurang', 'gizi_kurang', 'gizi_normal', 'gizi_berlebih'];
        sampleData = [
          [2025, 1, 'Cilegon', 'Bagendung', 72, 462, 338, 8414],
          [2025, 1, 'Ciwandan', 'Banjar Negara', 92, 122, 165, 7684],
        ];
      } else if (type === 'gizi_balita') {
        filename = 'template_gizi_balita.xlsx';
        headers = ['Tahun', 'Bulan', 'Kecamatan', 'nama_kelurahan', 'gizi_sangat_kurang', 'gizi_kurang', 'gizi_normal', 'gizi_berlebih'];
        sampleData = [
          [2026, 1, 'Cilegon', 'Bagendung', 10, 23, 673, 27],
          [2026, 1, 'Ciwandan', 'Banjar Negara', 17, 70, 553, 12],
        ];
      } else if (type === 'intervensi_kelurahan') {
        filename = 'template_intervensi.xlsx';
        headers = ['no_urut', 'Tahun', 'kode_kec_bps', 'nama_kecamatan', 'kode_desa_bps', 'nama_kelurahan', 'GPM', 'bantuan_pangan'];
        sampleData = [
          [1, 2026, '3672030', 'CILEGON', '3672030001', 'Bagendung', 1, 742],
          [2, 2026, '3672010', 'CIWANDAN', '3672010005', 'Banjar Negara', 0, 960],
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
        } else if (selectedType === 'cv_beras') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const targetStr = String(row['Target CV'] || '< 10 %');
          const target = parseFloat(targetStr.replace(/[^\d.]/g, '')) || 10;
          const cilegon = parseFloat(row['CV Beras']) || 0;

          const { error } = await supabase.from('cv_beras_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 'pph') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const target = parseFloat(row['PPH Nasional Target']) || 80;
          const cilegon = parseFloat(row['PPH Cilegon']) || 0;

          const { error } = await supabase.from('pph_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 'k_energi') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const target = parseFloat(row['Konsumsi Energi Standar Nasional']) || 2100;
          const cilegon = parseFloat(row['Konsumsi Energi Cilegon']) || 0;

          const { error } = await supabase.from('konsumsi_energi_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 'k_protein') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const target = parseFloat(row['Konsumsi Protein Standar Nasional']) || 57;
          const cilegon = parseFloat(row['Konsumsi Protein Cilegon']) || 0;

          const { error } = await supabase.from('konsumsi_protein_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 't_energi') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const target = parseFloat(row['Ketersediaan Energi Standar Nasional']) || 2400;
          const cilegon = parseFloat(row['Ketersediaan Energi Cilegon']) || 0;

          const { error } = await supabase.from('ketersediaan_energi_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 't_protein') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const target = parseFloat(row['Ketersediaan Protein Standar Nasional']) || 63;
          const cilegon = parseFloat(row['Ketersediaan Protein Cilegon']) || 0;

          const { error } = await supabase.from('ketersediaan_protein_data').upsert({
            tahun,
            target,
            cilegon
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 'produksi_beras') {
          const tahun = parseInt(row['Tahun']) || new Date().getFullYear();
          const gkg = parseFloat(row['Produksi GKG']) || 0;
          const konversi = parseFloat(row['Angka Konversi GKG ke Beras']) || 63.23;
          const beras = parseFloat(row['Produksi Beras']) || parseFloat((gkg * konversi / 100).toFixed(2));

          const { error } = await supabase.from('produksi_beras_data').upsert({
            tahun,
            produksi_gkg: gkg,
            konversi,
            produksi_beras: beras
          }, { onConflict: 'tahun' });

          if (error) throw error;
        } else if (selectedType === 'fsva_matang') {
          const nama_kelurahan = String(row['nama_kelurahan'] || '').trim();
          const kode_kel_bps = String(row['kode_kel_bps'] || '').trim();
          const ikp = parseFloat(row['ikp']) || 0;
          const periode = parseInt(row['periode']) || 2025;

          if (!nama_kelurahan || !kode_kel_bps) continue;

          const { error } = await supabase.from('fsva_matang').insert({
            nama_kelurahan,
            kode_kel_bps,
            ikp,
            periode
          });

          if (error) throw error;
        } else if (selectedType === 'skpg_matang') {
          const nama_kelurahan = String(row['nama_kelurahan'] || row['Nama Kelurahan'] || '').trim();
          const gizi_kurang = parseInt(row['gizi_kurang'] || row['Gizi Kurang']) || 0;
          const gizi_sangat_kurang = parseInt(row['gizi_sangat_kurang'] || row['Gizi Sangat Kurang']) || 0;
          const gizi_berlebih = parseInt(row['gizi_berlebih'] || row['Gizi Berlebih'] || row['gizi_lebih']) || 0;
          const gizi_normal = parseInt(row['gizi_normal'] || row['Gizi Normal']) || 0;
          const periode = parseInt(row['Tahun'] || row['periode'] || row['Tahun']) || 2025;
          const bulan = parseInt(row['Bulan'] || row['bulan'] || row['Bulan']) || 1;

          if (!nama_kelurahan) continue;

          const { error } = await supabase.from('skpg_matang').insert({
            nama_kelurahan,
            gizi_kurang,
            gizi_sangat_kurang,
            gizi_berlebih,
            gizi_normal,
            periode,
            bulan
          });

          if (error) throw error;
        } else if (selectedType === 'gizi_balita') {
          const tahun = parseInt(row['Tahun'] || row['tahun'] || row['periode']) || 2026;
          const bulan = parseInt(row['Bulan'] || row['bulan']) || 1;
          const nama_kelurahan = String(row['nama_kelurahan'] || row['Nama Kelurahan'] || '').trim();
          const gizi_sangat_kurang = parseInt(row['gizi_sangat_kurang'] || row['Gizi Sangat Kurang']) || 0;
          const gizi_kurang = parseInt(row['gizi_kurang'] || row['Gizi Kurang']) || 0;
          const gizi_normal = parseInt(row['gizi_normal'] || row['Gizi Normal']) || 0;
          const gizi_berlebih = parseInt(row['gizi_berlebih'] || row['Gizi Berlebih'] || row['gizi_lebih']) || 0;

          if (!nama_kelurahan) continue;

          const { error } = await supabase.from('gizi_balita').insert({
            tahun,
            bulan,
            nama_kelurahan,
            gizi_sangat_kurang,
            gizi_kurang,
            gizi_normal,
            gizi_berlebih
          });

          if (error) throw error;
        } else if (selectedType === 'intervensi_kelurahan') {
          const no_urut = parseInt(row['no_urut']) || 0;
          const tahun = parseInt(row['Tahun']) || 2026;
          const bulan = 1; // Default to Jan
          const kode_kec_bps = String(row['kode_kec_bps'] || '').trim();
          const nama_kecamatan = String(row['nama_kecamatan'] || '').trim();
          const kode_desa_bps = String(row['kode_desa_bps'] || '').trim();
          const nama_kelurahan = String(row['nama_kelurahan'] || '').trim();
          const gpm = parseInt(row['GPM']) || 0;
          const bantuan_pangan = parseInt(row['bantuan_pangan']) || 0;

          if (!nama_kelurahan) continue;

          const { error } = await supabase.from('intervensi_kelurahan').insert({
            no_urut,
            tahun,
            bulan,
            kode_kec_bps,
            nama_kecamatan,
            kode_desa_bps,
            nama_kelurahan,
            gpm,
            bantuan_pangan
          });

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

      } else if (selectedType === 'pou') {
        const { tahun, nasional, provinsi, cilegon } = pouForm;
        const { error } = await supabase.from('pou_data').upsert({
          tahun,
          pou_nasional: nasional,
          pou_provinsi: provinsi,
          pou_cilegon: cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 'cv_beras') {
        const { tahun, target, cilegon } = cvBerasForm;
        const { error } = await supabase.from('cv_beras_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 'pph') {
        const { tahun, target, cilegon } = pphForm;
        const { error } = await supabase.from('pph_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 'k_energi') {
        const { tahun, target, cilegon } = kEnergiForm;
        const { error } = await supabase.from('konsumsi_energi_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 'k_protein') {
        const { tahun, target, cilegon } = kProteinForm;
        const { error } = await supabase.from('konsumsi_protein_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 't_energi') {
        const { tahun, target, cilegon } = tEnergiForm;
        const { error } = await supabase.from('ketersediaan_energi_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 't_protein') {
        const { tahun, target, cilegon } = tProteinForm;
        const { error } = await supabase.from('ketersediaan_protein_data').upsert({
          tahun,
          target,
          cilegon
        }, { onConflict: 'tahun' });
        if (error) throw error;
      } else if (selectedType === 'produksi_beras') {
        const { tahun, produksiGkg, konversi, produksiBeras } = produksiBerasForm;
        const { error } = await supabase.from('produksi_beras_data').upsert({
          tahun,
          produksi_gkg: produksiGkg,
          konversi,
          produksi_beras: produksiBeras
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

        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl w-full gap-1">
          {DATA_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => { setSelectedType(type.value); setStatus('idle'); }}
              type="button"
              className={`flex-1 md:flex-initial px-3.5 py-2 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                selectedType === type.value ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {type.label}
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
                Upload {selectedType === 'harga' ? 'Harga Pangan' : selectedType === 'gizi_balita' ? 'Gizi Balita Kel' : selectedType === 'intervensi_kelurahan' ? 'Intervensi Kel' : selectedType === 'fsva_matang' ? 'FSVA Matang' : selectedType === 'skpg_matang' ? 'SKPG Matang' : selectedType === 'pou' ? 'POU' : selectedType === 'cv_beras' ? 'CV Beras' : selectedType === 'pph' ? 'Skor PPH' : selectedType === 'k_energi' ? 'Konsumsi Energi' : selectedType === 'k_protein' ? 'Konsumsi Protein' : selectedType === 't_energi' ? 'Ketersediaan Energi' : selectedType === 't_protein' ? 'Ketersediaan Protein' : 'Produksi Beras'} Template
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
                Form Input Manual: {DATA_TYPES.find(d => d.value === selectedType)?.label || selectedType}
              </h3>
            </div>

            {/* Common Location Selectors (Hidden for City-wide Annual Data) */}
            {!['pou', 'cv_beras', 'pph', 'k_energi', 'k_protein', 't_energi', 't_protein', 'produksi_beras'].includes(selectedType) && (
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

                {selectedType === 'harga' && (
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

            {selectedType === 'cv_beras' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik CV Beras Lintas Tahun</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={cvBerasForm.tahun}
                      onChange={(e) => setCvBerasForm({ ...cvBerasForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target CV (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cvBerasForm.target}
                      onChange={(e) => setCvBerasForm({ ...cvBerasForm, target: parseFloat(e.target.value) || 10 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">CV Cilegon (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cvBerasForm.cilegon}
                      onChange={(e) => setCvBerasForm({ ...cvBerasForm, cilegon: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'pph' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Pola Pangan Harapan (PPH)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={pphForm.tahun}
                      onChange={(e) => setPphForm({ ...pphForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Nasional (Skor)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pphForm.target}
                      onChange={(e) => setPphForm({ ...pphForm, target: parseFloat(e.target.value) || 80 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Skor Cilegon</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pphForm.cilegon}
                      onChange={(e) => setPphForm({ ...pphForm, cilegon: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'k_energi' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Konsumsi Energi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={kEnergiForm.tahun}
                      onChange={(e) => setKEnergiForm({ ...kEnergiForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Standar Nasional (kkal)</label>
                    <input
                      type="number"
                      required
                      value={kEnergiForm.target}
                      onChange={(e) => setKEnergiForm({ ...kEnergiForm, target: parseInt(e.target.value) || 2100 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Konsumsi Cilegon (kkal)</label>
                    <input
                      type="number"
                      required
                      value={kEnergiForm.cilegon}
                      onChange={(e) => setKEnergiForm({ ...kEnergiForm, cilegon: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'k_protein' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Konsumsi Protein</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={kProteinForm.tahun}
                      onChange={(e) => setKProteinForm({ ...kProteinForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Standar Nasional (gram)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={kProteinForm.target}
                      onChange={(e) => setKProteinForm({ ...kProteinForm, target: parseFloat(e.target.value) || 57 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Konsumsi Cilegon (gram)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={kProteinForm.cilegon}
                      onChange={(e) => setKProteinForm({ ...kProteinForm, cilegon: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 't_energi' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Ketersediaan Energi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={tEnergiForm.tahun}
                      onChange={(e) => setTEnergiForm({ ...tEnergiForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Standar Nasional (kkal)</label>
                    <input
                      type="number"
                      required
                      value={tEnergiForm.target}
                      onChange={(e) => setTEnergiForm({ ...tEnergiForm, target: parseInt(e.target.value) || 2400 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Ketersediaan Cilegon (kkal)</label>
                    <input
                      type="number"
                      required
                      value={tEnergiForm.cilegon}
                      onChange={(e) => setTEnergiForm({ ...tEnergiForm, cilegon: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 't_protein' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Ketersediaan Protein</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={tProteinForm.tahun}
                      onChange={(e) => setTProteinForm({ ...tProteinForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Standar Nasional (gram)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tProteinForm.target}
                      onChange={(e) => setTProteinForm({ ...tProteinForm, target: parseFloat(e.target.value) || 63 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Ketersediaan Cilegon (gram)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tProteinForm.cilegon}
                      onChange={(e) => setTProteinForm({ ...tProteinForm, cilegon: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'produksi_beras' && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-4">Metrik Produksi Beras Lokal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tahun</label>
                    <input
                      type="number"
                      required
                      value={produksiBerasForm.tahun}
                      onChange={(e) => setProduksiBerasForm({ ...produksiBerasForm, tahun: parseInt(e.target.value) || 2025 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi GKG (ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={produksiBerasForm.produksiGkg}
                      onChange={(e) => {
                        const gkg = parseFloat(e.target.value) || 0;
                        const beras = parseFloat((gkg * (produksiBerasForm.konversi / 100)).toFixed(2));
                        setProduksiBerasForm({ ...produksiBerasForm, produksiGkg: gkg, produksiBeras: beras });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Konversi GKG ke Beras (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={produksiBerasForm.konversi}
                      onChange={(e) => {
                        const konv = parseFloat(e.target.value) || 0;
                        const beras = parseFloat((produksiBerasForm.produksiGkg * (konv / 100)).toFixed(2));
                        setProduksiBerasForm({ ...produksiBerasForm, konversi: konv, produksiBeras: beras });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Produksi Beras (ton)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={produksiBerasForm.produksiBeras}
                      onChange={(e) => setProduksiBerasForm({ ...produksiBerasForm, produksiBeras: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {(selectedType === 'fsva_matang' || selectedType === 'skpg_matang') && (
              <div className="p-5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold leading-normal">
                  Pemberitahuan: Pengisian data matang FSVA & SKPG sangat disarankan melalui metode <b>Upload Excel</b> untuk kepraktisan pemrosesan batch seluruh kelurahan Kota Cilegon secara kolektif.
                </span>
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
