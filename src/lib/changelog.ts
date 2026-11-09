import { APP_VERSION } from './version';

export interface VersionLog {
  version: string;
  type: 'major' | 'minor';
  typeLabel: string;
  date: string;
  title: string;
  isCurrent?: boolean;
  changes: string[];
}

export const PLATFORM_CHANGELOG: VersionLog[] = [
  {
    version: 'v2.6',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'November 2026',
    title: 'Rekonstruksi Integrated EWS 4-Dimensi, Masking Kuota AI Insight & Redesain Dokumentasi',
    isCurrent: true,
    changes: [
      'Rekonstruksi algoritma Early Warning System (EWS) komposit berbasis 4 dimensi terpadu: Proyeksi +1 Bulan, Proyeksi +3 Bulan, Volatilitas CV 12-Bulan, dan Tekanan Tahunan YoY dengan standardisasi status AMAN, WASPADA, dan AWAS.',
      'Penyediaan Bobot Komposit transparan (Equal Weighting 25%), penghapusan matriks irisan rumit, dan pembesaran tipografi teks diagnostik.',
      'Penambahan kolom Koefisien Variasi CV (%) pada Panel Harga Pangan Strategis harian dan berkas unduhan Excel (.xlsx).',
      'Penerapan sistem masking on-demand AI Insight untuk menghemat kuota token AI, serta pemindahan panel ke pojok kanan atas di bawah header.',
      'Redesain Panel Informasi & Dokumentasi dengan layout adaptif desktop dan mobile serta pembaruan klausul resmi Status Pengembangan & Disclaimer.'
    ]
  },
  {
    version: 'v2.5',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Mesin Estimasi Pasokan Tahunan & Aliran Rantai Pasok Nusantara',
    changes: [
      'Implementasi mesin estimasi pasokan beras tahunan hibrida (kombinasi input manual lapangan dan perputaran stok AI turnover rate).',
      'Visualisasi arus simpul asal wilayah pemasok lintas provinsi se-Indonesia (Jawa Barat, Jawa Tengah, Jawa Timur, NTB, Lampung) ke Kota Cilegon.',
      'Penyempurnaan tata kelola edit data observasi lapangan dan optimasi performa peta satelit Leaflet.'
    ]
  },
  {
    version: 'v2.4',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Optimasi UI Forecast Mobile, Scrollbar Peta Pasokan & Platform Versioning',
    changes: [
      'Redesain UI Panel Peramalan Harga Pangan mobile dengan latar mint kontras tinggi, penataan 3 kolom harga (Aktual, +1 Bulan, +3 Bulan), dan pill badge status tren dinamis.',
      'Peningkatan keterbacaan teks tipografi mobile (panduan geser, kuantitas komoditas, dan label Machine Learning dibuat lebih tajam dan gelap).',
      'Penyediaan scrollbar permanen pada kotak info Konsep Crowdsourcing Geospasial di Peta Pasokan Beras agar 100% selalu dapat di-scroll lancar pada seluruh smartphone.',
      'Penambahan indikator nomor versi platform interaktif di bawah PANCI dengan modal riwayat rilis lengkap berbasis Semantic Versioning.'
    ]
  },
  {
    version: 'v2.3',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Lampu Metodologi Analitik & Optimasi Kamera Cerdas HUD',
    changes: [
      'Penambahan ikon lampu kuning metodologi ilmiah pada seluruh modul analitik (Peramalan ML, EWS, IKP & PoU, dan FSVA).',
      'Pemisahan visual kartu Early Warning System (EWS) dan grafik 5 tahun IKP-PoU untuk kemudahan pembacaan.',
      'Redesain HUD Kamera Cerdas AI Vision, perbaikan geocoding GPS dinamis, dan proteksi duplikasi data berbasis jarak (proximity).'
    ]
  },
  {
    version: 'v2.2',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Peta 3D Arus Pasokan Beras & Autentikasi Enumerator',
    changes: [
      'Visualisasi 3D rantai pasok dan distribusi beras ke Kota Cilegon dengan garis lengkung bercahaya (glowing bezier arcs).',
      'Dukungan autentikasi enumerator dan kontributor pangan lapangan via Google (Gmail OAuth).',
      'Integrasi batas spasial wilayah administratif Kota Cilegon berbasis layer KMZ resmi.'
    ]
  },
  {
    version: 'v2.1',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Kamera Cerdas AI Vision Lapangan & Geotagging Otomatis',
    changes: [
      'Peluncuran fitur Kamera Cerdas AI Vision untuk deteksi stok komoditas pangan dan fase tanaman pertanian secara instan.',
      'Ekstraksi koordinat GPS otomatis dan penerbitan pin observasi terverifikasi ke peta spasial Cilegon.',
      'Direktori data sarana penjual pangan (kios, grosir beras) dan sentra produksi pangan lokal.'
    ]
  },
  {
    version: 'v2.0',
    type: 'major',
    typeLabel: 'Perbaikan Besar / Transformasi Sistem',
    date: 'Oktober 2026',
    title: 'Rebranding PANCI & Transformasi Total Mobile-First',
    changes: [
      'Transformasi identitas platform menjadi PANCI (Platform Analisis Pangan Cilegon).',
      'Perombakan menyeluruh antarmuka menjadi Mobile-First Design System dengan tema warna emerald yang modern dan responsif.',
      'Integrasi reel 13 komoditas strategis pangan harian SAGON dengan navigasi tanggal historis.',
      'Penyediaan modal tabel prioritas FSVA kelurahan berurut skor IKP komposit.',
      'Penambahan fitur pelacak kunjungan platform (Visit Counter) dan Portal Otentikasi Petugas/Admin.'
    ]
  },
  {
    version: 'v1.4',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'September 2026',
    title: 'AI Intelligence Chatbot RAG Multi-Dokumen & GIS Spasial',
    changes: [
      'Integrasi AI Chatbot interaktif bertenaga Google Gemini dengan arsitektur Retrieval-Augmented Generation (RAG).',
      'Penggabungan tiga pilar data cerdas: data spasial GIS, basis data regulasi/dokumen Pemkot, dan database indikator Supabase.',
      'Visualisasi grafik responsif Recharts dan sintesis neraca pangan otomatis lintas sektor.'
    ]
  },
  {
    version: 'v1.3',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Agustus 2026',
    title: 'Telemetri Lengas Tanah ECMWF, Sawah Baku LBS & Walk-Forward Validation',
    changes: [
      'Integrasi data telemetri lengas tanah (soil moisture) ERA5-Land ECMWF dan kalkulasi matematis poligon sawah baku (LBS) per kecamatan/kelurahan.',
      'Implementasi Walk-Forward Validation (Backtesting Akurasi ML deret waktu bergeser) untuk menguji keandalan model terhadap realisasi harga pasar.',
      'Standardisasi tata letak ekspor dokumen PDF A4 resmi pemerintah daerah tanpa pemotongan elemen maupun tumpang tindih.',
      'Integrasi basis data spasial Serumpun Padi dan sentra pangan lokal/sukun Kota Cilegon.'
    ]
  },
  {
    version: 'v1.2',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Juli 2026',
    title: 'Komparasi Benchmark Indikator & Neraca Bahan Makanan',
    changes: [
      'Panel komparasi capaian indikator ketahanan pangan Kota Cilegon terhadap target dan rata-rata nasional 5 tahun terakhir (PPH, IKP, PoU).',
      'Agregasi harian harga pasar rata-rata dari 3 pasar utama di Kota Cilegon.',
      'Penguatan skema filter spasial 43 kelurahan dan formulir entri data neraca bahan makanan (NBM).'
    ]
  },
  {
    version: 'v1.1',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Juni 2026',
    title: 'Engine Peramalan Harga Machine Learning (OLS, GBDT, Random Forest) & EWS',
    changes: [
      'Pelatihan dan seleksi 3 arsitektur model ML (OLS, GBDT, Random Forest) untuk peramalan harga komoditas pangan jangka pendek (+1 dan +3 bulan).',
      'Penerapan skema evaluasi presisi Champion-Challenger berbasis nilai MAPE (Mean Absolute Percentage Error) terkecil.',
      'Pembangunan pipeline ETL SAGON otomatis, integrasi indikator inflasi BPS, dan peluncuran modul awal Early Warning System (EWS).',
      'Halaman validasi perbandingan harga prediksi terhadap realisasi pasar SAGON.'
    ]
  },
  {
    version: 'v1.0',
    type: 'major',
    typeLabel: 'Perbaikan Besar / Inisiasi Platform',
    date: '28 Mei 2026',
    title: 'Inisiasi Repositori & Rilis Fondasi Platform Ketahanan Pangan',
    changes: [
      'Inisiasi repositori resmi GitHub dashboard-ketapang oleh @ketapangcilegon (28 Mei 2026) dan integrasi awal Supabase data tingkat kelurahan dengan benchmark Kota Cilegon.',
      'Pembangunan portal admin, tema peta dinamis, dan integrasi live scraping harga pasar harian SAGON Banten dengan bypass TLS.',
      'Kalkulasi komposit FSVA IKP kelurahan, formula prioritas Borda Desil intervensi pangan, serta ekspor laporan cetak resmi PDF A4.',
      'Penerapan persistent database cache dan token-limiting Gemini AI 2.5 Flash Lite untuk analitik cerdas efisien biaya.'
    ]
  }
];
