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
    <header className="h-auto pt-2.5 pb-2.5 sm:pt-6 sm:pb-6 bg-transparent flex items-center justify-between px-3 sm:px-6 z-10 select-none">
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

        {/* Mobile Profile Display (Mockup 1 Match) */}
        <div className="flex md:hidden flex-col items-end justify-center text-right shrink-0 select-none">
          {/* Teks kecil putih Admin */}
          <span className="text-[9px] text-white/95 font-medium leading-none mb-0.5 tracking-tight">Admin</span>
          
          {/* Ikon Admin 50% ukuran (w-4.5 h-4.5) */}
          <a href="/entry" className="block my-0.5 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-4.5 h-4.5 rounded bg-slate-100 overflow-hidden border border-emerald-300 shadow-sm flex items-center justify-center">
              <img src="/cowboy_admin.png" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </a>

          {/* Guest mode / Mode Tamu (Lampu Merah disable saat Admin login) */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 shrink-0 inline-block ${
              isAdminLoggedIn
                ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                : 'bg-red-600 border-red-200 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
            }`}></span>
            <span className="text-[9px] text-white font-medium leading-none tracking-tight whitespace-nowrap">
              {isAdminLoggedIn ? 'Mode Admin' : 'Mode Tamu'}
            </span>
          </div>
        </div>

        {/* Desktop Profile Display */}
        <div className="hidden md:flex flex-col items-end gap-1">
          <a href="/entry" className="flex items-center gap-2.5 ml-1 cursor-pointer bg-white py-1 px-1 pr-4 rounded-full shadow-md border border-emerald-100 hover:bg-emerald-50 hover:scale-[1.02] transition-all">
            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-emerald-300 shadow-sm">
              <img src="/cowboy_admin.png" alt="Admin" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-800 leading-none">ADMIN</p>
            </div>
          </a>
          <span className={`text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow-sm mr-2 border transition-all duration-300 ${
            isAdminLoggedIn 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isAdminLoggedIn ? 'MODE ADMIN' : 'MODE TAMU'}
          </span>
        </div>
      </div>
    </header>
  );
}

