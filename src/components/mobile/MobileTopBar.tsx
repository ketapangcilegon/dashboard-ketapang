/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';
import { ArrowLeft, Bell, Sparkles } from 'lucide-react';

interface MobileTopBarProps {
  currentView: string;
  onBack: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  unreadCount?: number;
}

export default function MobileTopBar({
  currentView,
  onBack,
  onOpenNotifications,
  onOpenProfile,
  unreadCount = 0,
}: MobileTopBarProps) {
  const isHome = currentView === 'beranda';

  // Feature title dictionary for mobile header
  const getFeatureMeta = (view: string) => {
    switch (view) {
      case 'grafik_ikp':
      case 'ikp_grafik':
        return { title: 'Indeks Ketahanan Pangan', subtitle: 'Tren IKP & PoU Kota Cilegon' };
      case 'peta_full':
        return { title: 'Peta Ketahanan Pangan', subtitle: 'Peta Tematik Spasial FSVA & SKPG' };
      case 'harga_full':
        return { title: 'Panel Harga Pangan', subtitle: 'Sistem Informasi SAGON Real-Time' };
      case 'forecasting':
        return { title: 'Forecast Harga & EWS', subtitle: 'Prediksi Machine Learning Pasar' };
      case 'validasi_forecast':
        return { title: 'Validasi Model ML', subtitle: 'Akurasi Model Peramalan Harga' };
      case 'radar_kelurahan':
        return { title: 'Radar Ketahanan Pangan', subtitle: 'Komparasi Kelurahan vs Kecamatan' };
      case 'analisis_skpg':
        return { title: 'Analisis SKPG', subtitle: 'Sistem Kewaspadaan Pangan & Gizi' };
      case 'analisis_skpg_kelurahan':
        return { title: 'SKPG 43 Kelurahan', subtitle: 'Pemetaan Gizi Balita Posyandu' };
      case 'agregasi_kamera':
        return { title: 'Agregasi Data Lapangan', subtitle: 'Kamera Cerdas & Rekapitulasi Spasial' };
      case 'rantai_pasok':
        return { title: 'Analisis Rantai Pasok', subtitle: 'Ketergantungan Pangan Kota Cilegon' };
      case 'kamera_cerdas':
        return { title: 'Kamera Cerdas', subtitle: 'Pantau Telemetri Ketapang' };
      case 'ai_intelligence':
      case 'ai_insight':
      case 'insight':
        return { title: 'AI Insight', subtitle: 'Food Security Intelligence & Asisten Pangan' };
      case 'ketersediaan':
        return { title: 'Pilar Ketersediaan', subtitle: 'Produksi, Cadangan & NBM' };
      case 'keterjangkauan':
        return { title: 'Pilar Keterjangkauan', subtitle: 'Akses Ekonomi & Stabilitas Harga' };
      case 'pemanfaatan':
        return { title: 'Pilar Pemanfaatan', subtitle: 'Konsumsi Gizi, PPH & Kesehatan' };
      case 'sumber_data':
        return { title: 'Sumber Data & Referensi', subtitle: 'Katalog Metadata Resmi Pemerintah' };
      case 'tentang':
        return { title: 'Tentang Aplikasi', subtitle: 'Sistem Intelijen Ketahanan Pangan' };
      case 'profil_menu':
        return { title: 'Portal Admin', subtitle: 'Autentikasi & Pengaturan Sistem' };
      default:
        return { title: 'Ketahanan Pangan', subtitle: 'Kota Cilegon' };
    }
  };

  const featureMeta = getFeatureMeta(currentView);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-[0_2px_12px_rgba(5,150,105,0.05)] px-3.5 py-2.5 transition-all lg:hidden select-none">
      {isHome ? (
        // Mode 1: Brand Header (Screen 1 Mockup)
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img 
              src="/logo-serumpun-padi.png" 
              alt="Logo Serumpun Padi" 
              className="w-8 h-8 rounded-lg object-contain shrink-0 shadow-xs border border-emerald-600/30"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm text-[#006038] tracking-tight">PANCI</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  MOBILE
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5 leading-tight">
                Platform Analisis Pangan Cilegon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell with Badge */}
            <button
              onClick={onOpenNotifications}
              className="relative w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-95 shadow-xs"
              aria-label="Lihat Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Portal Admin Avatar */}
            <button
              onClick={onOpenProfile}
              className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500 shadow-xs cursor-pointer active:scale-95 transition-all"
              aria-label="Portal Admin"
              title="Portal Admin"
            >
              <img 
                src="/cowboy_admin.png" 
                alt="Portal Admin" 
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            </button>
          </div>
        </div>
      ) : (
        // Mode 2: Screen Sub-View with Back Button (Screen 2, 3, 4, 5 Mockup)
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
              aria-label="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>

            <div className="flex flex-col min-w-0 flex-1 pr-2">
              <h2 className="font-black text-xs sm:text-sm text-slate-900 truncate leading-tight tracking-tight">
                {featureMeta.title}
              </h2>
              <p className="text-[10px] text-slate-500 truncate leading-tight">
                {featureMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenNotifications}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <img src="/cowboy_admin.png" alt="Profil" className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
