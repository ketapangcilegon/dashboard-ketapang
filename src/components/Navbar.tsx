import { Bell, MapPin, Calendar, Filter, ChevronDown } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-6 z-10">
      <div>
        <h1 className="text-2xl font-black text-[#0B1E41] tracking-tight">DASHBOARD KETAHANAN PANGAN</h1>
        <p className="text-[#64748B] text-sm font-medium">Tingkat Kota</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Dropdowns */}
        <div className="hidden md:flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 py-2 px-4 rounded-full text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <MapPin className="w-4 h-4 text-slate-400" />
            Kota Maju
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          
          <button className="flex items-center gap-2 bg-white border border-slate-200 py-2 px-4 rounded-full text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Calendar className="w-4 h-4 text-slate-400" />
            Mei 2025
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          <button className="flex items-center gap-2 bg-white border border-slate-200 py-2 px-4 rounded-full text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Filter className="w-4 h-4 text-slate-400" />
            Filter
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full shadow-sm border border-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 ml-2 cursor-pointer bg-white py-1.5 px-3 rounded-full shadow-sm border border-slate-100 hover:bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-[#0B1E41] leading-none mb-1">Admin Kota</p>
            <p className="text-[10px] font-semibold text-slate-500 leading-none">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
