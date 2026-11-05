/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  RefreshCw, 
  User, 
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SuperadminInfo {
  id: string;
  email: string;
  role: string;
  lastSignIn?: string;
  createdAt?: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: 'UPDATE_EMAIL' | 'UPDATE_PASSWORD' | 'SESSION_VERIFY';
  oldEmail?: string;
  newEmail?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  timestamp: string;
}

export default function AdminSuperadminSettingsPanel() {
  const [superadminInfo, setSuperadminInfo] = useState<SuperadminInfo | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Email form state
  const [newEmail, setNewEmail] = useState<string>('');
  const [confirmEmail, setConfirmEmail] = useState<string>('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState<string>('');
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState<boolean>(false);
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState<boolean>(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState<boolean>(false);

  // Fetch Superadmin profile & audit logs
  const fetchSuperadminData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/superadmin-settings', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuperadminInfo(data.superadmin);
          setAuditLogs(data.auditLogs || []);
        }
      }
    } catch (err) {
      console.error('Error fetching superadmin settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuperadminData();
  }, [fetchSuperadminData]);

  // Execute Email Update
  const handleUpdateEmail = async () => {
    setEmailLoading(true);
    setEmailMessage(null);
    setShowEmailConfirmModal(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setEmailMessage({ type: 'error', text: 'Sesi login tidak ditemukan. Silakan login kembali.' });
        setEmailLoading(false);
        return;
      }

      const res = await fetch('/api/admin/superadmin-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'update-email',
          newEmail,
          confirmEmail,
          currentPassword: emailCurrentPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailMessage({ type: 'success', text: data.message });
        setNewEmail('');
        setConfirmEmail('');
        setEmailCurrentPassword('');
        fetchSuperadminData();
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Gagal memperbarui email.' });
      }
    } catch (err) {
      setEmailMessage({ type: 'error', text: 'Terjadi kesalahan jaringan atau server.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Execute Password Update
  const handleUpdatePassword = async () => {
    setPasswordLoading(true);
    setPasswordMessage(null);
    setShowPasswordConfirmModal(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPasswordMessage({ type: 'error', text: 'Sesi login tidak ditemukan. Silakan login kembali.' });
        setPasswordLoading(false);
        return;
      }

      const res = await fetch('/api/admin/superadmin-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'update-password',
          currentPassword: oldPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage({ type: 'success', text: data.message });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchSuperadminData();
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Gagal memperbarui password.' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Terjadi kesalahan jaringan atau server.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Belum diisi', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 25, label: 'Lemah (Min. 12 Karakter)', color: 'bg-rose-500' };
    if (score === 3 || score === 4) return { score: 70, label: 'Sedang (Cukup Kuat)', color: 'bg-amber-500' };
    return { score: 100, label: 'Sangat Kuat (Aman)', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-850 via-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-sm border border-emerald-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Superadmin Account Management</h2>
            <p className="text-xs text-emerald-100/90 font-medium">
              Manajemen kredensial akun Superadmin terintegrasi langsung dengan sistem autentikasi Supabase Auth.
            </p>
          </div>
        </div>
        <button
          onClick={fetchSuperadminData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer self-end sm:self-center"
          title="Segarkan data status akun"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Identity Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
              Profil Akun Superadmin Aktif
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            Role: SUPERADMIN
          </span>
        </div>

        {superadminInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Alamat Email Terdaftar
              </span>
              <span className="font-mono font-bold text-slate-800 text-[13px] break-all">
                {superadminInfo.email}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Supabase Auth User ID
              </span>
              <span className="font-mono text-[11px] text-slate-700 font-semibold break-all">
                {superadminInfo.id}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Sesi Terakhir Terhubung
              </span>
              <span className="font-semibold text-slate-700">
                {superadminInfo.lastSignIn ? new Date(superadminInfo.lastSignIn).toLocaleString('id-ID') : 'Sesi Aktif'}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-400 font-medium">
            {loading ? 'Memuat informasi superadmin...' : 'Data superadmin tidak dapat dimuat.'}
          </div>
        )}
      </div>

      {/* Forms Grid: Update Email & Update Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ==================================================== */}
        {/* CARD 1: UPDATE EMAIL */}
        {/* ==================================================== */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Mail className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                Pembaruan Email Superadmin
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Pembaruan email akan mengubah identitas login Supabase Auth secara permanen. Masukkan email baru dan kata sandi saat ini untuk konfirmasi otentikasi.
            </p>

            {emailMessage && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-start gap-2 ${
                emailMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {emailMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
                <span className="leading-snug">{emailMessage.text}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Baru
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="superadmin.baru@cilegon.go.id"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Konfirmasi Email Baru
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Ulangi email baru"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kata Sandi Akun Saat Ini (Untuk Verifikasi)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showEmailCurrentPassword ? 'text' : 'password'}
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailCurrentPassword(!showEmailCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEmailCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={emailLoading || !newEmail || !confirmEmail || !emailCurrentPassword}
              onClick={() => setShowEmailConfirmModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-650 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-extrabold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{emailLoading ? 'Memproses Pembaruan...' : 'Update Email Superadmin'}</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 2: UPDATE PASSWORD */}
        {/* ==================================================== */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                Pembaruan Kata Sandi
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Kata sandi baru wajib memiliki panjang minimal 12 karakter untuk mematuhi standar perlindungan akun Superadmin Pemerintah Kota Cilegon.
            </p>

            {passwordMessage && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-start gap-2 ${
                passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
                <span className="leading-snug">{passwordMessage.text}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kata Sandi Lama
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kata Sandi Baru (Min. 12 Karakter)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 12 karakter kombinasi"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPassword && (
                  <div className="mt-1.5 space-y-1">
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                        style={{ width: `${passwordStrength.score}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      Kekuatan: {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword || newPassword.length < 12}
              onClick={() => setShowPasswordConfirmModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.99] text-white text-xs font-extrabold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{passwordLoading ? 'Memproses Pembaruan...' : 'Update Password Superadmin'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
              Riwayat Audit Log Superadmin
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            Menampilkan {auditLogs.length} aktivitas terakhir
          </span>
        </div>

        {auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Aktivitas</th>
                  <th className="py-2.5 px-3">Target / Detail</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {log.action === 'UPDATE_EMAIL' ? 'Pembaruan Email' : log.action === 'UPDATE_PASSWORD' ? 'Pembaruan Kata Sandi' : log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {log.action === 'UPDATE_EMAIL' ? (
                        <span>
                          {log.oldEmail} &rarr; <strong className="text-emerald-700">{log.newEmail}</strong>
                        </span>
                      ) : (
                        <span>Kredensial kata sandi otentikasi akun</span>
                      )}
                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Ket: {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 font-semibold">
            Belum ada catatan aktivitas pembaruan kredensial superadmin.
          </div>
        )}
      </div>

      {/* Confirmation Modal: Update Email */}
      {showEmailConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-850">Konfirmasi Pembaruan Email</h4>
                <p className="text-[11px] text-slate-500">Tindakan ini akan mengubah alamat akun login Superadmin.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Email Lama: <strong className="font-mono text-slate-800">{superadminInfo?.email}</strong></div>
              <div>Email Baru: <strong className="font-mono text-emerald-700">{newEmail}</strong></div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pastikan Anda memiliki akses ke inbox email baru tersebut untuk menerima tautan verifikasi dari Supabase. Apakah Anda yakin ingin melanjutkan?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateEmail}
                className="px-4 py-2 rounded-xl bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-sm"
              >
                Ya, Perbarui Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Update Password */}
      {showPasswordConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-850">Konfirmasi Pembaruan Kata Sandi</h4>
                <p className="text-[11px] text-slate-500">Kata sandi akun Superadmin akan langsung diperbarui.</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pastikan Anda telah mencatat dan menyimpan kata sandi baru dengan aman. Anda akan menggunakan kata sandi ini untuk login ke Portal Admin PANCI pada sesi berikutnya.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold transition-all cursor-pointer shadow-sm"
              >
                Ya, Perbarui Kata Sandi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
