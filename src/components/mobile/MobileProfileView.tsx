/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, Bell, Settings, HelpCircle, Info, ChevronRight, 
  LogOut, ShieldCheck, Camera, FileText, Sparkles, ExternalLink 
} from 'lucide-react';
import VisitCounter from '@/components/VisitCounter';

interface MobileProfileViewProps {
  onNavigate: (view: string) => void;
  onOpenNotifications: () => void;
}

export default function MobileProfileView({
  onNavigate,
  onOpenNotifications,
}: MobileProfileViewProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
    setIsAdmin(sessionActive);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('adminSession');
      setIsAdmin(false);
      onNavigate('beranda');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto animate-in fade-in duration-200">
      
      {/* 1. User Profile Card (Mockup Match) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
            <img 
              src="/cowboy_admin.png" 
              alt="Ridwan Sugiarto" 
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm text-slate-900 truncate">
                Ridwan Sugiarto
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                {isAdmin ? 'ADMIN' : 'ASN'}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
              ASN Analis Ketahanan Pangan
            </p>
            <p className="text-[10px] text-emerald-600 font-bold truncate">
              DKPP Kota Cilegon
            </p>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
      </div>

      {/* 2. Menu Navigation Group 1: Data & Fitur */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {/* Data Saya */}
        <button
          onClick={() => onNavigate('radar_kelurahan')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Data & Analisis Kelurahan</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Notifikasi */}
        <button
          onClick={onOpenNotifications}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Notifikasi Sistem</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
              3
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </button>

        {/* Validasi Model ML */}
        <button
          onClick={() => onNavigate('validasi_forecast')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Audit Model Machine Learning</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Kamera Cerdas */}
        <button
          onClick={() => onNavigate('kamera_cerdas')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Kamera Cerdas Ketapang</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

      </div>

      {/* 3. Menu Navigation Group 2: Informasi & Sistem */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {/* Sumber Data & Rujukan */}
        <button
          onClick={() => onNavigate('sumber_data')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Sumber Data & Referensi</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Tentang Aplikasi */}
        <button
          onClick={() => onNavigate('tentang')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Tentang Aplikasi</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Portal Entry Admin */}
        <a
          href="/entry"
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xs">
              ADM
            </div>
            <span className="text-xs font-black text-slate-800">Portal Input Data (Admin)</span>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </a>

      </div>

      {/* 4. Green Scenic Slogan Banner (Mockup Screen 6 Match) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#006038] via-[#007A48] to-[#044D2E] text-white shadow-md space-y-2 border border-emerald-600/50">
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-black">
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>Visi Ketahanan Pangan</span>
        </div>
        <p className="text-xs text-emerald-50/90 leading-relaxed font-medium">
          Bersama mewujudkan ketahanan pangan dan pertanian yang berkelanjutan di Kota Cilegon 🌱
        </p>
      </div>

      {/* 5. Visit Counter Badge */}
      <div className="flex justify-center pt-1 pb-1">
        <VisitCounter className="bg-white border border-emerald-200/90 text-slate-600 shadow-2xs hover:border-emerald-300" />
      </div>

      {/* 6. Logout / Back Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
      >
        <LogOut className="w-4 h-4 text-slate-400" />
        <span>Keluar ke Beranda</span>
      </button>

    </div>
  );
}
