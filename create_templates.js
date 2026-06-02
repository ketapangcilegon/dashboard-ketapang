const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Target directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create FSVA Template
const fsvaData = [
  { nama_kelurahan: 'Bagendung', kode_kel_bps: '3672030001', ikp: 70.79, periode: 2025 },
  { nama_kelurahan: 'Banjar Negara', kode_kel_bps: '3672010005', ikp: 71.90, periode: 2025 },
  { nama_kelurahan: 'Bendungan', kode_kel_bps: '3672030003', ikp: 71.53, periode: 2025 }
];

const ws_fsva = XLSX.utils.json_to_sheet(fsvaData);
const wb_fsva = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb_fsva, ws_fsva, 'FSVA Matang');
XLSX.writeFile(wb_fsva, path.join(publicDir, 'template_fsva.xlsx'));

// 2. Create SKPG Template
const skpgData = [
  { Tahun: 2025, Bulan: 1, Kecamatan: 'Cilegon', nama_kelurahan: 'Bagendung', gizi_sangat_kurang: 72, gizi_kurang: 462, gizi_normal: 338, gizi_berlebih: 8414 },
  { Tahun: 2025, Bulan: 1, Kecamatan: 'Ciwandan', nama_kelurahan: 'Banjar Negara', gizi_sangat_kurang: 92, gizi_kurang: 122, gizi_normal: 165, gizi_berlebih: 7684 },
  { Tahun: 2025, Bulan: 1, Kecamatan: 'Cilegon', nama_kelurahan: 'Bendungan', gizi_sangat_kurang: 98, gizi_kurang: 485, gizi_normal: 443, gizi_berlebih: 6904 }
];

const ws_skpg = XLSX.utils.json_to_sheet(skpgData);
const wb_skpg = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb_skpg, ws_skpg, 'SKPG Matang');
XLSX.writeFile(wb_skpg, path.join(publicDir, 'template_skpg.xlsx'));

// 3. Create Gizi Balita Template (Kelurahan Level)
const giziBalitaData = [
  { Tahun: 2026, Bulan: 1, Kecamatan: 'Cilegon', nama_kelurahan: 'Bagendung', gizi_sangat_kurang: 10, gizi_kurang: 23, gizi_normal: 673, gizi_berlebih: 27 },
  { Tahun: 2026, Bulan: 1, Kecamatan: 'Ciwandan', nama_kelurahan: 'Banjar Negara', gizi_sangat_kurang: 17, gizi_kurang: 70, gizi_normal: 553, gizi_berlebih: 12 }
];

const ws_gizi_balita = XLSX.utils.json_to_sheet(giziBalitaData);
const wb_gizi_balita = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb_gizi_balita, ws_gizi_balita, 'Gizi Balita Kelurahan');
XLSX.writeFile(wb_gizi_balita, path.join(publicDir, 'template_gizi_balita.xlsx'));

// 4. Create Intervensi Kelurahan Template
const intervensiData = [
  { no_urut: 1, Tahun: 2026, kode_kec_bps: '3672030', nama_kecamatan: 'CILEGON', kode_desa_bps: '3672030001', nama_kelurahan: 'Bagendung', GPM: 1, bantuan_pangan: 742 },
  { no_urut: 2, Tahun: 2026, kode_kec_bps: '3672010', nama_kecamatan: 'CIWANDAN', kode_desa_bps: '3672010005', nama_kelurahan: 'Banjar Negara', GPM: 0, bantuan_pangan: 960 }
];

const ws_intervensi = XLSX.utils.json_to_sheet(intervensiData);
const wb_intervensi = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb_intervensi, ws_intervensi, 'Intervensi Kelurahan');
XLSX.writeFile(wb_intervensi, path.join(publicDir, 'template_intervensi.xlsx'));

console.log('🎉 Separate XLSX templates generated in public directory successfully!');
