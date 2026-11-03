"use client";

import { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  Brain, 
  Database, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Eye,
  Sliders,
  Sparkles,
  Info,
  ExternalLink,
  Activity,
  Play,
  Clock,
  Terminal,
  Server
} from 'lucide-react';
import { useFeatureAccess } from '@/lib/useFeatureAccess';

interface SmokeIndicatorResult {
  id: string;
  name: string;
  endpoint: string;
  selectorOrRule: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  latencyMs: number;
  httpStatus: number | null;
  summary: string;
  metrics: Record<string, string | number>;
}

interface SmokeTestResponse {
  success: boolean;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  executedAt: string;
  totalDurationMs: number;
  indicators: SmokeIndicatorResult[];
  samplePrices: { komoditas: string; harga: number; sumber: string }[];
  automationSchedule?: {
    dailyCron: { endpoint: string; cronExpression: string; frequency: string; triggerType: string };
    monthlyEtlCron: { endpoint: string; cronExpression: string; frequency: string; triggerType: string };
    monthlyMlTrainCron: { endpoint: string; cronExpression: string; frequency: string; triggerType: string };
    cliCommand: string;
  };
}

export default function AdminFeatureAccessPanel() {
  const { settings, isLoading, isKameraLocked, isTentangLocked, updateSettings, reload } = useFeatureAccess();
  const [isUpdating, setIsUpdating] = useState<'kamera' | 'tentang' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State untuk Smoke Test Pipeline Cheerio HTML SAGON
  const [isRunningSmoke, setIsRunningSmoke] = useState(false);
  const [smokeResult, setSmokeResult] = useState<SmokeTestResponse | null>(null);
  const [smokeError, setSmokeError] = useState<string | null>(null);

  const handleRunSmokeTest = async () => {
    setIsRunningSmoke(true);
    setSmokeError(null);
    try {
      const res = await fetch('/api/sagon-smoke-test', { cache: 'no-store' });
      const data: SmokeTestResponse = await res.json();
      setSmokeResult(data);
      if (data.overallStatus === 'PASS') {
        showToast('✅ Smoke Test Pipeline SAGON LULUS (PASS) — Seluruh selector DOM & Regex berfungsi normal!');
      } else if (data.overallStatus === 'WARN') {
        showToast('⚠️ Smoke Test selesai dengan catatan peringatan (WARN).');
      } else {
        showToast('❌ Smoke Test mendeteksi kegagalan pada salah satu endpoint SAGON.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi endpoint /api/sagon-smoke-test';
      setSmokeError(msg);
      showToast('❌ Gagal menjalankan Smoke Test.');
    } finally {
      setIsRunningSmoke(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleKamera = async () => {
    setIsUpdating('kamera');
    const targetState = !isKameraLocked;
    const ok = await updateSettings({ kameraCerdasLocked: targetState });
    setIsUpdating(null);
    if (ok) {
      showToast(targetState 
        ? '🔒 Modul Kamera Cerdas sekarang DIBLOKIR (Hanya Petugas/Admin DKPP).' 
        : '🔓 Modul Kamera Cerdas sekarang TERBUKA UNTUK PUBLIK (Umum dapat mengambil foto & AI Vision).'
      );
    } else {
      showToast('❌ Gagal memperbarui pengaturan Kamera Cerdas.');
    }
  };

  const handleToggleTentang = async () => {
    setIsUpdating('tentang');
    const targetState = !isTentangLocked;
    const ok = await updateSettings({ tentangMetodologiLocked: targetState });
    setIsUpdating(null);
    if (ok) {
      showToast(targetState 
        ? '🔒 Tentang Aplikasi (Metodologi & Keandalan) sekarang DIBLOKIR (Khusus Admin).' 
        : '🔓 Tentang Aplikasi (Metodologi & Keandalan) sekarang TERBUKA UNTUK PUBLIK.'
      );
    } else {
      showToast('❌ Gagal memperbarui pengaturan Tentang Aplikasi.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">
              <Sliders className="w-3.5 h-3.5" /> Tata Kelola Akses & Keamanan Sistem
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
              Kontrol Akses Segmen & Modul Terproteksi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Kelola visibilitas modul lapangan dan dokumentasi teknis sistem. Anda dapat mengunci (khusus admin) atau membuka akses modul untuk masyarakat umum secara instan tanpa perlu redeploy.
            </p>
          </div>

          <button
            onClick={() => reload()}
            disabled={isLoading}
            className="self-start md:self-center inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sinkronkan Status</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Switch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: KAMERA CERDAS */}
        <div className={`dashboard-card bg-white rounded-2xl border transition-all duration-300 p-6 flex flex-col justify-between shadow-md hover:shadow-lg ${
          isKameraLocked ? 'border-amber-200/90' : 'border-emerald-200/90'
        }`}>
          <div>
            {/* Header Card */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
                  isKameraLocked 
                    ? 'bg-amber-100 text-amber-600' 
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wide">
                    Modul Kamera Cerdas
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400">
                    Perekaman Foto & AI Vision Lapangan
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 ${
                isKameraLocked 
                  ? 'bg-amber-500/15 text-amber-700 border border-amber-300' 
                  : 'bg-emerald-500/15 text-emerald-700 border border-emerald-300'
              }`}>
                {isKameraLocked ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    <span>DIBLOKIR (ADMIN)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                    <span>TERBUKA (PUBLIK)</span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed text-justify mb-5">
              Mengontrol apakah fitur <strong>perekaman kamera langsung, upload foto galeri, dan pemindaian AI Vision</strong> (verifikasi karung beras, bibit, dan tanaman pangan) hanya dapat dijalankan oleh Surveyor resmi berakun admin, atau terbuka untuk publik.
            </p>

            {/* Mode Matrix */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 text-[11px] space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Saat Sakelar <strong>ON (Diblokir)</strong>:</span>
                <span className="font-bold text-amber-700">Terkunci untuk publik</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-600">Saat Sakelar <strong>OFF (Terbuka)</strong>:</span>
                <span className="font-bold text-emerald-700">Publik bebas mencoba</span>
              </div>
            </div>
          </div>

          {/* Action Row & Toggle Switch */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Status Blokir: {isKameraLocked ? 'AKTIF (Terkunci)' : 'NONAKTIF (Terbuka)'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Klik sakelar untuk mengubah hak akses
              </span>
            </div>

            {/* iOS Style Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isKameraLocked}
              disabled={isUpdating === 'kamera'}
              onClick={handleToggleKamera}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
                isKameraLocked ? 'bg-amber-500' : 'bg-slate-300 hover:bg-slate-400'
              }`}
            >
              <span className="sr-only">Toggle Blokir Kamera Cerdas</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isKameraLocked ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isUpdating === 'kamera' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                ) : isKameraLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* CARD 2: TENTANG APLIKASI (METODOLOGI & KEANDALAN) */}
        <div className={`dashboard-card bg-white rounded-2xl border transition-all duration-300 p-6 flex flex-col justify-between shadow-md hover:shadow-lg ${
          isTentangLocked ? 'border-amber-200/90' : 'border-emerald-200/90'
        }`}>
          <div>
            {/* Header Card */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
                  isTentangLocked 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wide">
                    Tentang Aplikasi
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400">
                    Metodologi Machine Learning & Keandalan SAGON
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 ${
                isTentangLocked 
                  ? 'bg-amber-500/15 text-amber-700 border border-amber-300' 
                  : 'bg-emerald-500/15 text-emerald-700 border border-emerald-300'
              }`}>
                {isTentangLocked ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    <span>DIBLOKIR (ADMIN)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                    <span>TERBUKA (PUBLIK)</span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed text-justify mb-5">
              Mengontrol apakah rincian teknis pada halaman Tentang Aplikasi — yaitu <strong>Section 3: Metodologi & Validasi Machine Learning (Champion-Challenger/OLS/GBDT/MAPE)</strong> dan <strong>Section 4: Keandalan & Pipeline Data SAGON (Scraping/Fallback)</strong> — hanya dapat dibaca oleh Admin atau terbuka untuk umum/akademisi.
            </p>

            {/* Mode Matrix */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 text-[11px] space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Saat Sakelar <strong>ON (Diblokir)</strong>:</span>
                <span className="font-bold text-amber-700">Terkunci (Muncul ikon gembok)</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-600">Saat Sakelar <strong>OFF (Terbuka)</strong>:</span>
                <span className="font-bold text-emerald-700">Publik dapat membaca detail</span>
              </div>
            </div>
          </div>

          {/* Action Row & Toggle Switch */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Status Blokir: {isTentangLocked ? 'AKTIF (Terkunci)' : 'NONAKTIF (Terbuka)'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Klik sakelar untuk mengubah hak akses
              </span>
            </div>

            {/* iOS Style Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isTentangLocked}
              disabled={isUpdating === 'tentang'}
              onClick={handleToggleTentang}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
                isTentangLocked ? 'bg-amber-500' : 'bg-slate-300 hover:bg-slate-400'
              }`}
            >
              <span className="sr-only">Toggle Blokir Tentang Aplikasi</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isTentangLocked ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isUpdating === 'tentang' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                ) : isTentangLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* PANEL SMOKE TEST PIPELINE CHEERIO HTML SAGON (MANUAL TRIGGER & STATUS) */}
      {/* ===================================================================== */}
      <div id="sagon-smoke-test-panel" className="bg-white rounded-2xl border border-emerald-200/90 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/30">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5" /> Pipeline Integrity & DOM Parser Monitor
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              Smoke Test Pipeline Cheerio HTML SAGON
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Uji kesehatan langsung (live non-destructive) terhadap struktur HTML tabel harian, agregat pasar, grafik bulanan Highcharts <code className="text-emerald-300 font-mono">sagon.cilegon.go.id</code>, serta kesiapan database fallback Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunSmokeTest}
            disabled={isRunningSmoke}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isRunningSmoke ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menguji Pipeline SAGON...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Jalankan Smoke Test Manual</span>
              </>
            )}
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Ringkasan Jadwal Otomatis & Trigger */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Cron Harian SAGON
                </span>
                <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  1x / Hari
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-800">Setiap Pukul 06:30 WIB (23:30 UTC)</p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Trigger: Vercel Cron (<code className="font-mono text-[10px]">/api/harga-sagon</code>) + On-Demand ISR (maks. 1x/jam saat user membuka panel harga).
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> Cron Bulanan ETL & ML
                </span>
                <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  2x / Bulan
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-800">Tgl 1 & Tgl 5 Pukul 07:00 WIB</p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Trigger: Tgl 1 (<code className="font-mono text-[10px]">/api/etl-ml</code> Infografis Bulanan) & Tgl 5 (<code className="font-mono text-[10px]">/api/ml/train</code> + Auto-Retrain saat drift &gt; Rp 3.000).
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> Eksekusi Manual (Admin / CLI)
                </span>
                <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  On-Demand
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-800">Tombol Panel Admin & Terminal CLI</p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Klik tombol <strong>Jalankan Smoke Test Manual</strong> di atas atau jalankan <code className="font-mono text-[10px] bg-slate-200/70 px-1 py-0.5 rounded">npm run test:pipeline</code>.
              </p>
            </div>
          </div>

          {smokeError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{smokeError}</span>
            </div>
          )}

          {/* Hasil Live Smoke Test */}
          {smokeResult ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      smokeResult.overallStatus === 'PASS'
                        ? 'bg-emerald-500 text-slate-950'
                        : smokeResult.overallStatus === 'WARN'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    STATUS KESELURUHAN: {smokeResult.overallStatus}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    Total Durasi: <strong className="text-white">{smokeResult.totalDurationMs} ms</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Diambil: {new Date(smokeResult.executedAt).toLocaleString('id-ID')} WIB
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {smokeResult.indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className={`rounded-xl border p-4 space-y-2.5 ${
                      ind.status === 'PASS'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : ind.status === 'WARN'
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-900">{ind.name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{ind.endpoint}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                          ind.status === 'PASS'
                            ? 'bg-emerald-600 text-white'
                            : ind.status === 'WARN'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {ind.status} • {ind.latencyMs}ms
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{ind.summary}</p>

                    <div className="bg-white/90 rounded-lg p-2.5 border border-slate-200/70 text-[10.5px] space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Selector / Rule:</span>
                        <code className="font-mono font-bold text-slate-800">{ind.selectorOrRule}</code>
                      </div>
                      {Object.entries(ind.metrics).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-slate-600 border-t border-slate-100 pt-1">
                          <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                          <strong className="text-slate-900">{String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {smokeResult.samplePrices && smokeResult.samplePrices.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 mb-2">
                    Sampel Harga Live Terbaca saat Smoke Test:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {smokeResult.samplePrices.map((sp, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs"
                      >
                        {sp.komoditas}: <strong className="text-emerald-700">Rp {sp.harga.toLocaleString('id-ID')}</strong>{' '}
                        <span className="text-[10px] text-slate-400">({sp.sumber})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-xl p-5 text-center space-y-1">
              <p className="text-xs font-extrabold text-slate-700">
                Belum ada sesi pengujian manual yang dijalankan pada tampilan ini.
              </p>
              <p className="text-[11px] text-slate-500">
                Klik tombol <strong>&ldquo;Jalankan Smoke Test Manual&rdquo;</strong> di kanan atas kartu ini untuk memverifikasi 4 indikator Cheerio HTML SAGON secara real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Information Callout */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-blue-900 leading-relaxed">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold uppercase tracking-wide">
            Informasi Sinkronisasi Real-Time
          </p>
          <p className="text-slate-650">
            Perubahan sakelar di panel ini langsung disimpan ke basis data terpadu (Supabase) dan dipancarkan ke seluruh peramban pengguna. Jika sakelar dinonaktifkan (OFF), pengunjung publik dapat langsung mengakses fitur tanpa perlu memasukkan kredensial login admin.
          </p>
        </div>
      </div>
    </div>
  );
}
