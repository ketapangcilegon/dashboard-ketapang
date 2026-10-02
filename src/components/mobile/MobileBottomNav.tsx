"use client";

import React from 'react';
import { Home, Info, Camera, BarChart3, User } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenCatalog?: () => void;
}

export default function MobileBottomNav({
  currentView,
  onSelectView,
  onOpenCatalog,
}: MobileBottomNavProps) {
  const isHome = currentView === 'beranda';
  const isAbout = currentView === 'tentang';
  const isCamera = currentView === 'kamera_cerdas';
  const isAI = currentView === 'insight' || currentView === 'ai_insight';
  const isProfile = currentView === 'profil_menu';

  return (
    <nav 
      aria-label="Navigasi Bawah Aplikasi Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-[0_-4px_25px_rgba(5,150,105,0.08)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] print:hidden lg:hidden"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        
        {/* 1. Beranda */}
        <button
          onClick={() => onSelectView('beranda')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            isHome ? 'text-emerald-700 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1 rounded-full transition-all ${isHome ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-xs' : ''}`}>
            <Home className="w-5 h-5" strokeWidth={isHome ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Beranda</span>
          {isHome && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </button>

        {/* 2. Tentang Aplikasi */}
        <button
          onClick={() => onSelectView('tentang')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            isAbout ? 'text-emerald-700 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1 rounded-full transition-all ${isAbout ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-xs' : ''}`}>
            <Info className="w-5 h-5" strokeWidth={isAbout ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Tentang</span>
          {isAbout && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </button>

        {/* 3. Kamera Cerdas */}
        <button
          onClick={() => onSelectView('kamera_cerdas')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            isCamera ? 'text-emerald-700 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1 rounded-full transition-all ${isCamera ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-xs' : ''}`}>
            <Camera className="w-5 h-5" strokeWidth={isCamera ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Kamera</span>
          {isCamera && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </button>

        {/* 4. AI Insight */}
        <button
          onClick={() => onSelectView('insight')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            isAI ? 'text-emerald-700 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1 rounded-full transition-all ${isAI ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-xs' : ''}`}>
            <BarChart3 className="w-5 h-5" strokeWidth={isAI ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">AI Insight</span>
          {isAI && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </button>

        {/* 5. Profil & Menu */}
        <button
          onClick={() => onSelectView('profil_menu')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            isProfile ? 'text-emerald-700 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1 rounded-full transition-all ${isProfile ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-xs' : ''}`}>
            <User className="w-5 h-5" strokeWidth={isProfile ? 2.5 : 2} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">Admin</span>
          {isProfile && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </button>

      </div>
    </nav>
  );
}
