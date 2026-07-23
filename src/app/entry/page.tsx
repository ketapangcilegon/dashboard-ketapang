/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import UploadPanel from '@/components/UploadPanel';
import { Lock, Mail, AlertCircle, LogOut, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function EntryPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load session from sessionStorage to persist state on refresh
  useEffect(() => {
    const session = sessionStorage.getItem('adminSession');
    if (session === 'active') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!authError && data.user) {
        setIsLoggedIn(true);
        sessionStorage.setItem('adminSession', 'active');
      } else {
        setError(authError ? 'Akses ditolak: ' + authError.message : 'Akses ditolak. Email atau kata sandi tidak valid atau tidak terdaftar.');
      }
    } catch (err) {
      console.error('[Login Error]', err);
      setError('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('adminSession');
    setEmail('');
    setPassword('');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Logout Error]', err);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      {/* Mobile Sidebar Drawer Overlay (Slide in from left) */}
      {isLoggedIn && (
        <div 
          className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
            isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Drawer Content */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`absolute left-0 top-0 bottom-0 w-64 max-w-[280px] bg-gradient-to-b from-[#2d6a4f] via-[#1b4332] to-[#081c15] shadow-2xl transition-transform duration-300 ease-out transform ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Close button inside mobile sidebar drawer */}
            <div className="absolute right-4 top-6 z-50">
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                aria-label="Close Sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar 
              isMobile={true} 
              onCloseMobile={() => setIsMobileSidebarOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Sidebar - Visible only after login for better focus during login */}
      {isLoggedIn && (
        <div className="hidden lg:block w-64 shrink-0 bg-gradient-to-b from-[#2d6a4f] via-[#1b4332] to-[#081c15] text-white shadow-xl z-20">
          <Sidebar />
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {!isLoggedIn && (
          <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent z-0 opacity-70 pointer-events-none"></div>
        )}
        
        {isLoggedIn && (
          <div className="bg-gradient-to-r from-[#03593b] via-[#047857] to-[#10b981] text-white print:hidden pb-1 shadow-md relative z-10 border-b border-emerald-800/10">
            <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          </div>
        )}
        
        <main className={`flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10 flex ${
          !isLoggedIn 
            ? 'items-center justify-center' 
            : 'flex-col items-center justify-start pb-16'
        }`}>
          {!isLoggedIn ? (
            /* GLASSMORPHISM PREMIUM LOGIN CARD */
            <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 relative z-20 transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-md mb-3">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-black text-[#0B1E41] tracking-tight">Portal Admin Ketapang</h2>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1">Kota Cilegon</p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="contoh@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-all font-semibold"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all cursor-pointer focus:outline-none"
                      title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs tracking-wider uppercase py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  {isLoading ? 'Memverifikasi...' : 'Masuk Portal'}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-[9px] text-slate-400 font-bold leading-normal">
                  Hanya admin resmi terdaftar<br/>yang diizinkan menginput dan memodifikasi data.
                </p>
              </div>
            </div>
          ) : (
            /* UPLOAD & MANUAL INPUT FORMS WRAPPER */
            <div className="w-full max-w-5xl space-y-6">
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#0B1E41] tracking-tight">Upload & Input Data Ketahanan Pangan</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Unggah template Excel atau gunakan formulir input manual di bawah. Sistem terintegrasi dengan database Supabase Kota Cilegon.
                  </p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black text-rose-600 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
              
              <UploadPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
