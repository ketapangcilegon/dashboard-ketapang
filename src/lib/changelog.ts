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
    version: `v${APP_VERSION}`,
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Optimasi UI Forecast Mobile, Scrollbar Peta Pasokan & Versioning Platform',
    isCurrent: true,
    changes: [
      'Redesain UI Panel Peramalan Harga Pangan mobile dengan latar mint kontras tinggi, penataan 3 kolom harga (Aktual, +1 Bulan, +3 Bulan), dan pill badge status tren dinamis.',
      'Peningkatan keterbacaan teks tipografi mobile (panduan geser, kuantitas komoditas, dan label Machine Learning dibuat lebih tajam dan gelap).',
      'Penyediaan scrollbar permanen pada kotak info Konsep Crowdsourcing Geospasial di Peta Pasokan Beras agar 100% selalu dapat di-scroll lancar pada seluruh smartphone.',
      'Penambahan indikator nomor versi platform interaktif di bawah PANCI dengan modal riwayat rilis lengkap berbasis Semantic Versioning.'
    ]
  },
  {
    version: 'v2.4',
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
    version: 'v2.3',
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
    version: 'v2.2',
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
    version: 'v2.1',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Oktober 2026',
    title: 'Engine Peramalan Harga Machine Learning (Champion-Challenger)',
    changes: [
      'Pelatihan dan seleksi 3 arsitektur model ML (OLS, GBDT, Holt-Winters/RF) untuk peramalan harga jangka pendek +1 dan +3 bulan.',
      'Evaluasi presisi model berbasis Walk-Forward Validation dan metrik MAPE (Mean Absolute Percentage Error).',
      'Halaman validasi log backtesting perbandingan harga prediksi terhadap realisasi pasar SAGON.'
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
    version: 'v1.3',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'September 2026',
    title: 'Telemetri Lengas Tanah Satelit ECMWF & Agrometeorologi',
    changes: [
      'Integrasi data telemetri lengas tanah (soil moisture) ERA5-Land ECMWF untuk pemantauan lahan pertanian secara spasial.',
      'Kalkulasi matematis akurat poligon sawah dan lahan pertanian di seluruh kecamatan Cilegon.',
      'Optimasi layer peta tematik OSM & CartoDB dengan label poligon berpresisi tinggi.'
    ]
  },
  {
    version: 'v1.2',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'September 2026',
    title: 'AI Intelligence Chatbot RAG Multi-Dokumen & GIS',
    changes: [
      'Integrasi AI Chatbot interaktif bertenaga Google Gemini dengan arsitektur Retrieval-Augmented Generation (RAG).',
      'Penggabungan tiga pilar data cerdas: data geospasial GIS, basis data regulasi/dokumen Pemkot, dan database indikator Supabase.',
      'Visualisasi grafik responsif Recharts dan sintesis neraca pangan lintas komoditas.'
    ]
  },
  {
    version: 'v1.1',
    type: 'minor',
    typeLabel: 'Penyempurnaan Fitur',
    date: 'Agustus - September 2026',
    title: 'Cetak Laporan Eksekutif PDF A4 & Benchmark Indikator',
    changes: [
      'Penyediaan tata letak ekspor dokumen PDF format A4 berstandar resmi pemerintah daerah tanpa pemotongan elemen.',
      'Panel komparasi capaian indikator ketahanan pangan Kota Cilegon terhadap rata-rata nasional 5 tahun terakhir.',
      'Agregasi harian harga pasar rata-rata dari 3 pasar utama di Kota Cilegon.'
    ]
  },
  {
    version: 'v1.0',
    type: 'major',
    typeLabel: 'Perbaikan Besar / Rilis Perdana',
    date: 'Agustus 2026',
    title: 'Peluncuran Awal Dashboard Ketahanan Pangan Cilegon',
    changes: [
      'Pembangunan fondasi platform dashboard ketahanan pangan terpadu berbasis Next.js dan Supabase.',
      'Pemantauan indikator SKPG, FSVA, Prevalensi Balita Stunting, dan Produksi Beras tingkat kelurahan.',
      'Sistem scraping otomatis harga pangan harian pasar dari portal SAGON Banten.',
      'Peta spasial GIS interaktif Leaflet untuk 43 kelurahan di 8 kecamatan Kota Cilegon.'
    ]
  }
];
