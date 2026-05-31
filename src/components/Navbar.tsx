"use client";

import { Bell, MapPin, Calendar, Filter, ChevronDown, Menu } from 'lucide-react';
import { WILAYAH } from '@/lib/wilayah';

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
  
  const handleKecamatanChange = (kec: string) => {
    setSelectedKecamatan(kec);
    setSelectedKelurahan('ALL'); // Reset kelurahan when kecamatan changes
  };

  const activeKelurahans = selectedKecamatan !== 'ALL' ? WILAYAH[selectedKecamatan] : [];

  return (
    <header className="h-auto pt-6 pb-6 bg-transparent flex items-center justify-between px-6 z-10 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white hover:scale-105 active:scale-95 transition-all shadow-inner cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-sm uppercase">DASHBOARD KETAHANAN PANGAN</h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-bold tracking-wide mt-0.5">Kota Cilegon</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dropdowns */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Kecamatan Filter */}
          <div className="relative">
            <select
              value={selectedKecamatan}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              className="appearance-none bg-white border border-emerald-100 py-2.5 pl-9.5 pr-9 rounded-full text-xs font-black text-slate-700 shadow-md hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="ALL">Semua Kecamatan</option>
              {Object.keys(WILAYAH).sort().map((kec) => (
                <option key={kec} value={kec}>
                  Kec. {kec}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Kelurahan Filter (Cascading) */}
          <div className="relative">
            <select
              value={selectedKelurahan}
              onChange={(e) => setSelectedKelurahan(e.target.value)}
              disabled={selectedKecamatan === 'ALL'}
              className="appearance-none bg-white border border-emerald-100 py-2.5 pl-9.5 pr-9 rounded-full text-xs font-black text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="ALL">Semua Kelurahan</option>
              {activeKelurahans.sort().map((kel) => (
                <option key={kel} value={kel}>
                  Kel. {kel}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* Month/Year Filter */}
          <div className="relative flex items-center gap-1.5 bg-white border border-emerald-100 py-2 px-3.5 rounded-full shadow-md">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="appearance-none bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              {[
                { val: 1, name: 'Januari' },
                { val: 2, name: 'Februari' },
                { val: 3, name: 'Maret' },
                { val: 4, name: 'April' },
                { val: 5, name: 'Mei' },
                { val: 6, name: 'Juni' },
                { val: 7, name: 'Juli' },
                { val: 8, name: 'Agustus' },
                { val: 9, name: 'September' },
                { val: 10, name: 'Oktober' },
                { val: 11, name: 'November' },
                { val: 12, name: 'Desember' },
              ].map((m) => (
                <option key={m.val} value={m.val}>
                  {m.name}
                </option>
              ))}
            </select>

            <span className="text-slate-300 text-[10px] font-medium">|</span>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

        </div>

        <div className="h-8 w-px bg-white/20 mx-2 hidden md:block"></div>

        {/* Notifications */}
        <button className="relative p-2.5 text-emerald-800 bg-white hover:bg-emerald-50 transition-all rounded-full shadow-md hover:scale-105 active:scale-95 flex items-center justify-center border border-emerald-100 cursor-pointer">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center shadow-sm">
            3
          </span>
        </button>

        {/* Profile (Clickable Admin Link) */}
        <a href="/entry" className="flex items-center gap-2.5 ml-1 cursor-pointer bg-white py-1 px-1 pr-4 rounded-full shadow-md border border-emerald-100 hover:bg-emerald-50 hover:scale-[1.02] transition-all">
          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-emerald-300 shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-black text-slate-800 leading-none mb-0.5">Admin Kota</p>
            <p className="text-[9px] font-bold text-slate-400 leading-none">Administrator</p>
          </div>
        </a>
      </div>
    </header>
  );
}

