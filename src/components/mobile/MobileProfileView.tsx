/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, Bell, Info, ChevronRight, 
  LogOut, ShieldCheck, Camera, FileText, Sparkles, ExternalLink,
  Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2,
  KeyRound, Shield, Image as ImageIcon, UploadCloud
} from 'lucide-react';
import VisitCounter from '@/components/VisitCounter';
import { supabase } from '@/lib/supabase';

interface MobileProfileViewProps {
  onNavigate: (view: string) => void;
  onOpenNotifications: () => void;
}

export default function MobileProfileView({
  onNavigate,
  onOpenNotifications,
}: MobileProfileViewProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
      setIsAdmin(sessionActive);
      if (sessionActive) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user?.email) {
            setAdminEmail(data.user.email);
          } else {
            setAdminEmail('admin@cilegon.go.id');
          }
        } catch {
          setAdminEmail('admin@cilegon.go.id');
        }
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error && data.user) {
        sessionStorage.setItem('adminSession', 'active');
        setIsAdmin(true);
        setAdminEmail(data.user.email || email);
        setPassword('');
        setAuthError('');
      } else {
        setAuthError(error ? 'Akses ditolak: ' + error.message : 'Email atau kata sandi admin tidak sesuai.');
      }
    } catch (err: any) {
      console.error('[Login Error]', err);
      setAuthError('Terjadi kesalahan jaringan: ' + (err?.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('adminSession');
    setIsAdmin(false);
    setAdminEmail('');
    setEmail('');
    setPassword('');
    setAuthError('');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[Logout Error]', e);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto animate-in fade-in duration-200">
      
      {/* 1. Header Card Portal Admin (Teks nama dihapus total, diganti Portal Admin) */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-4 rounded-3xl border border-emerald-200/90 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-13 h-13 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xs shrink-0 bg-emerald-100 flex items-center justify-center">
            <img 
              src="/cowboy_admin.png" 
              alt="Portal Admin" 
              className="w-full h-full object-cover"
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isAdmin ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm text-emerald-950 truncate">
                Portal Admin
              </h3>
              <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full shrink-0 border ${
                isAdmin 
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {isAdmin ? 'ADMIN AKTIF' : 'LOGIN DIPERLUKAN'}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
              {isAdmin ? (adminEmail || 'admin@cilegon.go.id') : 'Autentikasi Pengelola Sistem'}
            </p>
            <p className="text-[10px] text-emerald-700 font-bold truncate">
              {isAdmin ? 'Akses Penuh Manajemen Data' : 'Masukkan email & kata sandi admin'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Form Autentikasi Admin (Jika Belum Login: Email, Password & Ikon Mata) */}
      {!isAdmin && (
        <div className="bg-white p-4 rounded-3xl border border-emerald-200/90 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 leading-tight">
                Autentikasi Administrator
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                Masukkan kredensial admin resmi untuk mengelola sistem
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-[11px] font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cilegon.go.id"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Input with Eye Icon */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                Kata Sandi Admin
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-700/20 active:scale-98 cursor-pointer disabled:opacity-70 mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk Portal Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Cakupan Menu Administrator */}
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100/90 text-slate-600 space-y-1.5">
            <span className="font-black text-emerald-950 block text-[10.5px]">
              Menu Pengelolaan Administrator:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-700 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Input Data Pangan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate text-amber-900 font-black">Media Komunikasi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span className="truncate">Knowledge Base AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="truncate">Kontrol Akses Fitur</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Panel Khusus Fitur Admin (Jika Sudah Terautentikasi) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl border border-emerald-200/90 shadow-sm overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-200">
          <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-emerald-950">Akses Pengelola Terverifikasi</span>
            </div>
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Full Access
            </span>
          </div>

          {/* 1. Menu Media Komunikasi & Dokumentasi */}
          <a
            href="/entry?tab=media"
            className="w-full flex items-center justify-between p-3.5 hover:bg-amber-50/40 transition-colors text-left cursor-pointer active:bg-slate-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800 block truncate">Media Komunikasi & Dokumentasi</span>
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    MEDIA
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">Kelola carousel media, foto, video & berita</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
          </a>

          {/* 2. Menu Input & Upload Data Ketahanan Pangan */}
          <a
            href="/entry?tab=upload"
            className="w-full flex items-center justify-between p-3.5 hover:bg-emerald-50/40 transition-colors text-left cursor-pointer active:bg-slate-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 block truncate">Input Data Ketahanan Pangan</span>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">Input neraca, harga pasar & FSVA</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
          </a>

          {/* 3. Menu Knowledge Base AI */}
          <a
            href="/entry?tab=knowledge"
            className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/40 transition-colors text-left cursor-pointer active:bg-slate-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 block truncate">Knowledge Base AI (Dokumen & Perda)</span>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">Basis pengetahuan & rujukan AI Ketapang</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-purple-600 shrink-0" />
          </a>

          {/* 4. Menu Pengaturan Hak Akses Fitur */}
          <a
            href="/entry?tab=access"
            className="w-full flex items-center justify-between p-3.5 hover:bg-teal-50/40 transition-colors text-left cursor-pointer active:bg-slate-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 block truncate">Pengaturan Hak Akses Fitur</span>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">Kunci / buka akses fitur publik</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-teal-600 shrink-0" />
          </a>
        </div>
      )}

      {/* 4. Menu Navigasi Fitur Analisis & Monitoring */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {/* Data & Analisis Kelurahan */}
        <button
          onClick={() => onNavigate('radar_kelurahan')}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Data & Analisis Kelurahan</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Notifikasi Sistem */}
        <button
          onClick={onOpenNotifications}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Pusat Peringatan & EWS</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Validasi Model ML */}
        <button
          onClick={() => onNavigate('validasi_forecast')}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
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
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Kamera Cerdas Ketapang</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Sumber Data & Rujukan */}
        <button
          onClick={() => onNavigate('sumber_data')}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
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
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800">Tentang Aplikasi</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

      </div>

      {/* 5. Visi Ketahanan Pangan */}
      <div className="p-3.5 rounded-3xl bg-gradient-to-r from-[#006038] via-[#007A48] to-[#044D2E] text-white shadow-md space-y-1.5 border border-emerald-600/50">
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-black">
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>Visi Ketahanan Pangan</span>
        </div>
        <p className="text-[11px] text-emerald-50/90 leading-relaxed font-medium">
          Mewujudkan ketahanan pangan dan pertanian yang mandiri dan berkelanjutan di Kota Cilegon 🌱
        </p>
      </div>

      {/* 6. Statistik Pengunjung Badge */}
      <div className="flex justify-center pt-1 pb-1">
        <VisitCounter className="bg-white border border-emerald-200/90 text-slate-600 shadow-2xs hover:border-emerald-300" />
      </div>

      {/* 7. Action Button: Logout atau Kembali ke Beranda */}
      {isAdmin ? (
        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Keluar dari Sesi Admin</span>
        </button>
      ) : (
        <button
          onClick={() => onNavigate('beranda')}
          className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
        >
          <span>Kembali ke Beranda</span>
        </button>
      )}

    </div>
  );
}
