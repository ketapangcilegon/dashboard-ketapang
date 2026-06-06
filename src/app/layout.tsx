import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css'; // Essential for maps to render correctly
import SeoStructuredData from "@/components/SeoStructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ── TITLE ──────────────────────────────────────────────────
  title: {
    default: 'Sistem Informasi Ketahanan Pangan Kota Cilegon | Food Security Intelligence & DSS',
    template: '%s | Ketahanan Pangan Cilegon',
  },

  // ── DESCRIPTION ────────────────────────────────────────────
  description:
    'Platform analitik dan DSS ketahanan pangan Kota Cilegon. Pemantauan harga pangan strategis real-time, peta FSVA, analisis SKPG, indeks IKP, forecast ML, dan early warning system (EWS) kerawanan pangan berbasis kecerdasan buatan.',

  // ── KEYWORDS ───────────────────────────────────────────────
  keywords: [
    // Nama sistem & brand
    'food security intelligence Cilegon',
    'DSS ketahanan pangan Cilegon',
    'sistem informasi ketahanan pangan Kota Cilegon',
    'dashboard pangan Cilegon',
    'pangancilegon',

    // Istilah teknis pangan Indonesia
    'FSVA Cilegon',
    'SKPG Kota Cilegon',
    'Indeks Ketahanan Pangan IKP Cilegon',
    'Pola Pangan Harapan PPH Cilegon',
    'Prevalence of Undernourishment PoU Cilegon',
    'kerawanan pangan Cilegon',
    'ketersediaan pangan Cilegon',
    'keterjangkauan pangan Cilegon',
    'pemanfaatan pangan Cilegon',
    'Neraca Bahan Makanan NBM Cilegon',

    // Harga pangan & komoditas
    'harga pangan Cilegon real-time',
    'harga beras Cilegon hari ini',
    'harga bawang merah Cilegon',
    'harga cabai Cilegon',
    'harga minyak goreng Cilegon',
    'harga pangan strategis Banten',
    'CV koefisien variasi harga beras',
    'stabilitas harga pangan Kota Cilegon',
    'SAGON Cilegon harga pasar',

    // Forecast & AI
    'forecast harga pangan Cilegon',
    'prediksi harga komoditas Cilegon',
    'early warning system pangan Cilegon',
    'EWS kerawanan pangan AI Cilegon',
    'machine learning ketahanan pangan Cilegon',
    'XGBoost forecast harga beras Cilegon',
    'AI insight ketahanan pangan daerah',
    'analisis tren harga komoditas strategis Cilegon',
    'early warning system kompatibel SKPG Cilegon',
    'volatilitas harga pangan Kota Cilegon',
    'koefisien variasi harga pangan Cilegon',

    // Geospasial & peta
    'peta ketahanan pangan Cilegon',
    'peta kerentanan pangan Cilegon',
    'peta tematik pangan Kota Cilegon',
    'WebGIS ketahanan pangan Cilegon',
    'peta FSVA kelurahan Cilegon',
    'geospasial pangan Banten',

    // Konteks kebijakan & stunting
    'stunting Cilegon data pangan',
    'gizi buruk Cilegon',
    'balita gizi kurang Cilegon',
    'intervensi pangan stunting Cilegon',
    'DKPP Kota Cilegon',
    'Dinas Ketahanan Pangan Pertanian Cilegon',
    'kebijakan pangan daerah Cilegon',

    // Wilayah
    'Kota Cilegon Banten',
    'ketahanan pangan Banten',
    'kelurahan rentan pangan Cilegon',
    'Borda desil kerentanan pangan',

    // Umum & nasional
    'sistem informasi pangan gizi terintegrasi',
    'dashboard ketahanan pangan kabupaten kota Indonesia',
    'food security monitoring Indonesia',
    'aplikasi pangan daerah Indonesia',
    'Badan Pangan Nasional data daerah',
  ],

  // ── AUTHORS & CREATORS ─────────────────────────────────────
  authors: [{ name: 'DKPP Kota Cilegon — Analis Ketahanan Pangan' }],
  creator: 'Dinas Ketahanan Pangan dan Pertanian Kota Cilegon',
  publisher: 'Kota Cilegon',

  // ── CANONICAL URL ──────────────────────────────────────────
  metadataBase: new URL('https://pangancilegon.web.id'),
  alternates: {
    canonical: '/',
  },

  // ── OPEN GRAPH (Facebook, WhatsApp, LinkedIn) ──────────────
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://pangancilegon.web.id',
    siteName: 'Sistem Informasi Ketahanan Pangan Kota Cilegon',
    title: 'Food Security Intelligence & DSS — Kota Cilegon',
    description:
      'Pantau harga pangan real-time, peta FSVA, forecast AI, dan early warning system kerawanan pangan Kota Cilegon secara interaktif.',
    images: [
      {
        url: '/og-image.png',        // buat gambar 1200×630 px, taruh di /public/
        width: 1200,
        height: 630,
        alt: 'Dashboard Ketahanan Pangan Kota Cilegon',
      },
    ],
  },

  // ── TWITTER / X CARD ───────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Food Security Intelligence & DSS — Kota Cilegon',
    description:
      'Pantau harga pangan real-time, forecast ML, dan EWS kerawanan pangan Kota Cilegon.',
    images: ['/og-image.png'],
  },

  // ── ROBOTS ─────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── ICONS ──────────────────────────────────────────────────
  icons: {
    icon: '/icon',
  },

  // ── VERIFICATION ───────────────────────────────────────────
  verification: {
    google: 'google3a48f5f895510c57',
  },

  // ── KATEGORI & KLASIFIKASI ─────────────────────────────────
  category: 'government,food security,data analytics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8FAFC]`}
      >
        <SeoStructuredData />
        {children}
      </body>
    </html>
  );
}
