"use client";

import { Bell, MapPin, Calendar, Filter, ChevronDown } from 'lucide-react';
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
}: NavbarProps) {
  
  const handleKecamatanChange = (kec: string) => {
    setSelectedKecamatan(kec);
    setSelectedKelurahan('ALL'); // Reset kelurahan when kecamatan changes
  };

  const activeKelurahans = selectedKecamatan !== 'ALL' ? WILAYAH[selectedKecamatan] : [];

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-6 z-10">
      <div>
        <h1 className="text-2xl font-black text-[#0B1E41] tracking-tight">DASHBOARD KETAHANAN PANGAN</h1>
        <p className="text-[#64748B] text-sm font-medium">Kota Cilegon</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Dropdowns */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Kecamatan Filter */}
          <div className="relative">
            <select
              value={selectedKecamatan}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 py-2 pl-9 pr-8 rounded-full text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kecamatan</option>
              {Object.keys(WILAYAH).sort().map((kec) => (
                <option key={kec} value={kec}>
                  Kec. {kec}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Kelurahan Filter (Cascading) */}
          <div className="relative">
            <select
              value={selectedKelurahan}
              onChange={(e) => setSelectedKelurahan(e.target.value)}
              disabled={selectedKecamatan === 'ALL'}
              className="appearance-none bg-white border border-slate-200 py-2 pl-9 pr-8 rounded-full text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelurahan</option>
              {activeKelurahans.sort().map((kel) => (
                <option key={kel} value={kel}>
                  Kel. {kel}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* Month/Year Filter */}
          <div className="relative flex items-center gap-1 bg-white border border-slate-200 py-1.5 px-3 rounded-full shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="appearance-none bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
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

            <span className="text-slate-300 text-[10px]">|</span>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

        </div>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full shadow-sm border border-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* Profile (Clickable Admin Link) */}
        <a href="/entry" className="flex items-center gap-3 ml-2 cursor-pointer bg-white py-1.5 px-3 rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-[#0B1E41] leading-none mb-1">Admin Kota</p>
            <p className="text-[10px] font-semibold text-slate-500 leading-none">Administrator</p>
          </div>
        </a>
      </div>
    </header>
  );
}

