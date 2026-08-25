/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client";

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Filter, ChevronDown, Menu } from 'lucide-react';
import { WILAYAH } from '@/lib/wilayah';
import { FULL_VERSION } from '@/lib/version';

interface NavbarProps {
  selectedKecamatan?: string;
  setSelectedKecamatan?: (kec: string) => void;
  selectedKelurahan?: string;
  setSelectedKelurahan?: (kel: string) => void;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
  selectedMonth?: number;
  setSelectedMonth?: (month: number) => void;
  onMenuClick?: () => void;
}

export default function Navbar({
  selectedKecamatan = 'ALL',
  setSelectedKecamatan = () => {},
  selectedKelurahan = 'ALL',
  setSelectedKelurahan = () => {},
  selectedYear = 2025,
  setSelectedYear = () => {},
  selectedMonth = 5,
  setSelectedMonth = () => {},
  onMenuClick = () => {},
}: NavbarProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
      setIsAdminLoggedIn(sessionActive);
    };
    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const handleKecamatanChange = (kec: string) => {
    setSelectedKecamatan(kec);
    setSelectedKelurahan('ALL'); // Reset kelurahan when kecamatan changes
  };

  const activeKelurahans = selectedKecamatan !== 'ALL' ? WILAYAH[selectedKecamatan] : [];

  return (
    <header className="h-auto pt-1.5 pb-1.5 sm:pt-2 sm:pb-2 bg-transparent flex items-center justify-between px-3 sm:px-6 z-10 select-none">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white hover:scale-105 active:scale-95 transition-all shadow-inner cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col justify-center">
          <h1 className="text-[9.5px] min-[360px]:text-[11px] min-[390px]:text-[12px] sm:text-base lg:text-lg font-black text-white tracking-tight leading-tight drop-shadow-sm max-w-none sm:max-w-md md:max-w-lg lg:max-w-xl whitespace-nowrap uppercase">
            Food Security Intelligence & DSS
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-emerald-100 font-black tracking-widest uppercase text-[8.5px] sm:text-[11px] leading-none">
            <span>KOTA CILEGON</span>
            <span className="text-white/40 hidden sm:inline">|</span>
            <span className="text-emerald-200/85 font-semibold tracking-normal normal-case text-[8px] sm:text-[9.5px]">
              Versi: {FULL_VERSION}
            </span>
          </div>
          <div className="text-amber-300 font-black text-[10.5px] sm:text-[13.5px] tracking-wide mt-0.5 sm:mt-1 select-all hover:opacity-90 transition-opacity leading-none">
            PanganCilegon.web.id
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Timestamp & Update Data Info Block (Professional GovTech Style) */}
        <div className="hidden md:flex flex-col text-right text-[10px] font-black text-emerald-50/90 tracking-wide leading-tight whitespace-nowrap select-none">
          <div>Harga Pangan: <span className="text-white font-black bg-red-500/80 px-1 py-0.2 rounded text-[8px] ml-0.5 tracking-normal animate-pulse shadow-sm">REALTIME</span></div>
          <div>KPI: <span className="text-white">Tahun 2025</span></div>
          <div>Baseline FSVA: <span className="text-white">Tahun 2025</span></div>
          <div>Baseline SKPG: <span className="text-white">Februari 2026</span></div>
        </div>

        <div className="h-8 w-px bg-white/20 mx-2 hidden md:block"></div>

        {/* Mobile Admin Icon Link */}
        <div className="flex md:hidden items-center shrink-0">
          <a
            href="/entry"
            className="block p-1 rounded-full hover:bg-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Portal Admin"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-300/80 shadow-sm flex items-center justify-center">
              <img src="/cowboy_admin.png" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </a>
        </div>

        {/* Desktop Admin Icon Link */}
        <div className="hidden md:flex items-center shrink-0">
          <a
            href="/entry"
            className="block p-1 rounded-full hover:bg-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Portal Admin"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-300/80 shadow-sm flex items-center justify-center">
              <img src="/cowboy_admin.png" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </a>
        </div>
      </div>
    </header>
  );
}

