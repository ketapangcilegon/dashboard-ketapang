"use client";

import { useState, useEffect } from 'react';
import { Info, ShieldAlert, Code2, ArrowLeft, Brain, Database, ChevronDown, ChevronUp, Award, Lock, Users, Globe2, MapPin, Activity, Calendar } from 'lucide-react';
import { FULL_VERSION } from '@/lib/version';
import { useFeatureAccess } from '@/lib/useFeatureAccess';

interface VisitorStatsData {
  total_count: number;
  online_count: number;
  today_count: number;
  this_month_count: number;
  last_month_count: number;
  today_label?: string;
  this_month_label?: string;
  last_month_label?: string;
  last_visited_at?: string | null;
  current_visitor?: {
    masked_ip: string;
    location: string;
  };
  regions?: Array<{
    location: string;
    count: number;
    last_visited_at: string;
  }>;
  active_sessions?: Array<{
    masked_ip: string;
    location: string;
    hits: number;
    last_seen: string;
  }>;
}

interface TentangAplikasiProps {
  onBack?: () => void;
}

export default function TentangAplikasi({ onBack }: TentangAplikasiProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    statistik_kunjungan: true,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [visitorStats, setVisitorStats] = useState<VisitorStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { isTentangLocked } = useFeatureAccess();

  useEffect(() => {
    const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
    setIsAdmin(sessionActive);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/visit-count?stats=1')
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.success) {
          setVisitorStats(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canViewTechnical = !isTentangLocked || isAdmin;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in zoom-in-95 duration-500">
      {/* Header / Navigation */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-500 font-bold" />
          Kembali ke Beranda
        </button>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase border-b-4 border-emerald-500 inline-block pb-2">
          Tentang Aplikasi
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Section 1: Tentang Aplikasi */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('tentang')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                <Info className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Tentang Aplikasi
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['tentang'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['tentang'] && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
              <p className="mt-4">
                Web App <strong className="text-slate-800">Food Security Intelligence & DSS</strong> merupakan platform informasi dan analisis yang dikembangkan untuk mendukung pemanfaatan data ketahanan pangan secara lebih efektif, terintegrasi, dan mudah diakses dalam mendukung pengambilan keputusan.
              </p>
              <p>
                Platform ini menyajikan berbagai indikator strategis ketahanan pangan, visualisasi data spasial, statistik sektoral, serta informasi pendukung lainnya yang dapat dimanfaatkan oleh pengambil kebijakan, pemangku kepentingan, akademisi, dan masyarakat dalam mendukung perencanaan, pemantauan, evaluasi, dan pengambilan keputusan berbasis data.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Status & Disclaimer */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('status')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Status Pengembangan & Disclaimer
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['status'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['status'] && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
              <p className="mt-4">
                <strong className="text-slate-800 font-bold">PANCI (Platform Analisis Pangan Kota Cilegon)</strong> merupakan inisiatif inovasi digital yang dikembangkan secara mandiri sebagai kontribusi dalam pemanfaatan teknologi informasi dan analisis data untuk mendukung penguatan sistem ketahanan pangan daerah.
              </p>
              <p>
                Pengembangan PANCI telah memperoleh rekomendasi positif dari Kepala Dinas Ketahanan Pangan dan Pertanian Kota Cilegon sebagai salah satu inovasi yang potensial untuk mendukung pengelolaan informasi, pemantauan, analisis, dan perumusan kebijakan di bidang ketahanan pangan.
              </p>
              <p>
                Saat ini, PANCI masih berada dalam tahap pengembangan dan penyempurnaan berkelanjutan. Aplikasi ini belum ditetapkan sebagai aplikasi resmi Pemerintah Kota Cilegon dan belum menjadi sistem yang mewakili keputusan, kebijakan, maupun pernyataan resmi pemerintah daerah.
              </p>
              <p>
                Seluruh fitur, visualisasi, analisis, dan rekomendasi yang disajikan dikembangkan sebagai instrumen pendukung analisis (<em>decision support system</em>), bukan sebagai pengganti kewenangan, pertimbangan, maupun proses pengambilan keputusan oleh instansi pemerintah yang berwenang.
              </p>
              <p>
                Data dan informasi di dalam aplikasi diupayakan bersumber dari referensi yang relevan dan dapat dipertanggungjawabkan. Meskipun demikian, untuk kepentingan administrasi, pelaporan resmi, dan pengambilan keputusan strategis, pengguna tetap perlu melakukan verifikasi terhadap sumber data dan dokumen resmi terkait.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Metodologi & Validasi Machine Learning */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('metodologi')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                <Brain className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Metodologi & Validasi Machine Learning (ML)
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['metodologi'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['metodologi'] && (
            canViewTechnical ? (
              <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
                <p className="mt-4">
                  Modul peramalan harga pangan pada platform ini dirancang dengan pendekatan ilmiah yang ketat untuk memberikan estimasi harga jangka pendek yang andal bagi pengambil kebijakan:
                </p>
                <ul className="list-disc pl-5 space-y-2.5 text-slate-600">
                  <li>
                    <strong className="text-slate-800">Pipeline Seleksi Model (Champion-Challenger) Berbasis Serverless Engine:</strong> Modul peramalan dikembangkan menggunakan <span className="font-semibold text-slate-700">TypeScript murni (native JS/TS engine)</span> agar dapat berjalan optimal dalam infrastruktur serverless (Vercel Functions) tanpa dependensi binary C++ eksternal. Sistem membandingkan tiga model matematis secara dinamis untuk setiap komoditas:
                    <ul className="list-circle pl-5 mt-2 space-y-1.5 text-slate-550">
                      <li><strong className="text-slate-700">Multiple Linear Regression dengan Fitur Musiman Terekayasa (OLS):</strong> Model regresi linear multivariat yang memecahkan hubungan tren, variabel dummy musiman (HBKN), dan data lag harga secara closed-form menggunakan metode Least Squares (OLS) yang diselesaikan dengan dekomposisi LU (Gaussian Elimination).</li>
                      <li><strong className="text-slate-700">Custom Gradient Boosting Regressor (GBDT Sederhana):</strong> Algoritme pohon keputusan bertahap (gradient boosting) yang dibangun secara iteratif untuk meminimalkan residual kesalahan dari pohon keputusan sebelumnya.</li>
                      <li><strong className="text-slate-700">Custom Random Forest Regressor:</strong> Pendekatan ensemble decision trees sederhana berbasis bootstrap agregasi.</li>
                    </ul>
                    Model dengan nilai kesalahan validasi (MAPE) terkecil secara otomatis dipilih sebagai champion untuk peramalan akhir.
                  </li>
                  <li>
                    <strong className="text-slate-800">Skema Validasi & Backtesting (Walk-Forward Validation):</strong> Model divalidasi menggunakan skema <em className="italic">Expanding Window / Walk-Forward Cross-Validation</em> lintas 4 periode (Fold 1: train &le; 2022, test 2023; Fold 2: train &le; 2023, test 2024; Fold 3: train &le; 2024, test 2025; Fold 4: train &le; 2025, test 2026 berjalan). Skema ini menjamin pengujian bebas dari kebocoran data (*data leakage*) dan memberikan ukuran sampel uji gabungan yang terukur ($\approx 43$ observasi out-of-sample).
                  </li>
                  <li>
                    <strong className="text-slate-800">Metrik Evaluasi & Presisi Peramalan:</strong> Performa model diukur menggunakan metrik <em className="italic">Mean Absolute Percentage Error</em> (MAPE) terakumulasi dari seluruh fold validasi. Indikator <strong className="text-slate-800">Akurasi Model (100% - MAPE)</strong> yang ditampilkan di dashboard mengukur presisi peramalan out-of-sample. Pada pengujian 10 komoditas utama, tingkat akurasi berkisar dari **70,2%** (komoditas sangat volatil seperti cabai rawit) hingga **99,2%** (komoditas stabil seperti beras), dengan **rata-rata MAPE lintas komoditas sebesar 7,66% (Akurasi Rata-rata 92,34%)**.
                    <p className="mt-1.5 text-slate-500 italic text-[11px] leading-relaxed">
                      *Catatan Metodologi: Metrik 100% - MAPE diukur dari rata-rata performa peramalan out-of-sample pada sampel uji lintas 4 periode validasi (n &approx; 43 observasi bulanan per komoditas) untuk merefleksikan variabilitas harga secara obyektif.
                    </p>
                  </li>
                  <li>
                    <strong className="text-slate-800">Interpretasi & Batasan Peramalan:</strong> Tingkat presisi peramalan jangka pendek (<em className="italic">one-step-ahead monthly prediction</em>) didukung oleh data historis lag harga serta rekayasa fitur musiman Hari Besar Keagamaan Nasional (HBKN). Model ini dirancang untuk estimasi kondisi normal dan tren musiman, namun pengambil kebijakan tetap diimbau untuk mempertimbangkan faktor eksternal tak terduga seperti anomali iklim ekstrem (El Niño/La Niña) atau perubahan kebijakan pasokan mendadak.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 py-6 text-center text-slate-500 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                <Lock className="w-8 h-8 text-amber-500 animate-bounce mt-4" />
                <p className="font-bold text-slate-700">Informasi Metodologi & Validasi Machine Learning Terkunci.</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Silakan masuk sebagai Administrator (Portal Admin) untuk melihat detail teknis.</p>
              </div>
            )
          )}
        </div>

        {/* Section 4: Pipeline Data & Keandalan SAGON */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('pipeline')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shrink-0">
                <Database className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Keandalan & Pipeline Data Real-time (SAGON)
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['pipeline'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['pipeline'] && (
            canViewTechnical ? (
              <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
                <p className="mt-4">
                  Sistem pemantauan harga real-time terintegrasi secara langsung dengan portal SAGON (<a href="https://sagon.cilegon.go.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">sagon.cilegon.go.id</a>). Guna menjaga ketahanan sistem terhadap risiko perubahan eksternal, arsitektur data dirancang dengan skema mitigasi berlapis:
                </p>
                <ul className="list-disc pl-5 space-y-2.5 text-slate-600">
                  <li>
                    <strong className="text-slate-800">Mekanisme Scraping & Parsing:</strong> Data diekstrak secara otomatis melalui mesin parser HTML (<em className="italic">cheerio-based</em>) dari halaman infografis dan komoditas pasar harian SAGON.
                  </li>
                  <li>
                    <strong className="text-slate-800">Antisipasi Perubahan Struktur (Layout Breakage):</strong> Mengingat scraping bergantung pada kestabilan elemen DOM, perubahan layout situs SAGON dapat memicu kegagalan ETL. Platform ini mengantisipasinya dengan mekanisme <strong className="text-slate-850">Local Caching & Fallback</strong>, di mana sistem akan otomatis menyajikan data cache terbaru di database lokal jika koneksi ke SAGON gagal atau struktur HTML berubah, sehingga menjaga dashboard tetap operasional tanpa merusak antarmuka pengguna.
                  </li>
                  <li>
                    <strong className="text-slate-800">Pengujian Otomatis (Automated Smoke Test):</strong> Pengembang telah menyediakan unit test khusus (<code className="px-1.5 py-0.5 bg-slate-100 rounded text-blue-700 font-bold text-[11px]">npm run test:pipeline</code>) yang dapat dijalankan secara berkala dalam alur CI/CD untuk memvalidasi kompatibilitas parser terhadap HTML SAGON secara berkala dan memberikan peringatan dini jika terdeteksi adanya perubahan struktur DOM.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 py-6 text-center text-slate-500 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                <Lock className="w-8 h-8 text-blue-500 animate-bounce mt-4" />
                <p className="font-bold text-slate-700">Informasi Keandalan & Pipeline Data SAGON Terkunci.</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Silakan masuk sebagai Administrator (Portal Admin) untuk melihat detail teknis.</p>
              </div>
            )
          )}
        </div>
        {/* Section 5: Pengembang */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('pengembang')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                <Code2 className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Pengembang
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['pengembang'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['pengembang'] && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
              <p className="mt-4">
                Platform ini dikembangkan dan dikelola secara mandiri oleh Tim Inovasi yang dipimpin seorang Analis Ketahanan Pangan pada DKPP Kota Cilegon sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan gizi daerah.
              </p>
              <p>
                Pengembangan dilakukan secara bertahap dengan pendekatan inovatif yang mengintegrasikan dashboard analitik, visualisasi spasial, pengelolaan data, dan teknologi kecerdasan buatan guna mendukung tata kelola pangan yang lebih efektif dan adaptif.
              </p>
            </div>
          )}
        </div>

        {/* Section 6: Kontributor & Lisensi */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button 
            onClick={() => toggleSection('kontributor')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                Kontributor & Lisensi
              </h2>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['kontributor'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>
          
          {expandedSections['kontributor'] && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-6 text-[13px] md:text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-350">
              {/* Part 1: Penghargaan kepada Sumber Data */}
              <div className="mt-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-indigo-500 pl-2">
                  Penghargaan kepada Sumber Data
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* 1. SAGON (Disperindag Kota Cilegon) */}
                  <a 
                    href="https://sagon.cilegon.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-sagon.png" 
                        alt="SAGON Disperindag Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/logo-cilegon.png';
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-emerald-700 transition-colors">
                      SAGON (Disperindag Kota Cilegon)
                    </span>
                  </a>

                  {/* 2. DKPP Kota Cilegon */}
                  <a 
                    href="https://dkpp.info" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-cilegon.png" 
                        alt="DKPP Kota Cilegon Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.png')) {
                            target.src = '/logo-cilegon.jpg';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-emerald-700 transition-colors">
                      DKPP Kota Cilegon
                    </span>
                  </a>

                  {/* 3. Dinas Kesehatan Kota Cilegon */}
                  <a 
                    href="https://dinkes.cilegon.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-cilegon.png" 
                        alt="Dinas Kesehatan Kota Cilegon Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.png')) {
                            target.src = '/logo-cilegon.jpg';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Dinas Kesehatan Kota Cilegon
                    </span>
                  </a>

                  {/* 4. Bapanas */}
                  <a 
                    href="https://badanpangan.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bapanas.png" 
                        alt="Bapanas Logo" 
                        className="max-h-full max-w-[120px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.png')) {
                            target.src = '/logo-bapanas.jpg';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Badan Pangan Nasional (Bapanas)
                    </span>
                  </a>

                  {/* 5. BMKG */}
                  <a 
                    href="https://www.bmkg.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bmkg.png" 
                        alt="BMKG Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.png')) {
                            target.src = '/logo-bmkg.jpg';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)
                    </span>
                  </a>

                  {/* 6. BPS */}
                  <a 
                    href="https://www.bps.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bps.png" 
                        alt="BPS Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.png')) {
                            target.src = '/logo-bps.jpg';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Badan Pusat Statistik (BPS)
                    </span>
                  </a>
                </div>
              </div>

              {/* Part 2: Infrastruktur, Layanan Cloud, Lisensi & Open Source */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 border-l-4 border-indigo-500 pl-2">
                  Infrastruktur, Layanan Cloud, Lisensi & Open Source
                </h3>
                <p className="text-slate-650 mb-4">
                  Aplikasi ini memanfaatkan berbagai perangkat lunak dan teknologi open source yang memungkinkan pengembangan, distribusi, dan peningkatan layanan secara berkelanjutan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* GitHub */}
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <svg className="w-8 h-8 text-slate-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">GitHub</h4>
                      <p className="text-[10px] text-slate-500">Repository & CI/CD</p>
                    </div>
                  </div>

                  {/* Supabase */}
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <svg className="w-8 h-8 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.35 2.05a1.2 1.2 0 00-1.78.26L5.32 12.2a1.2 1.2 0 001 1.8h5.33l-1 7.95a1.2 1.2 0 001.78-.26l6.25-9.89a1.2 1.2 0 00-1-1.8H12.35l1-7.95z" />
                    </svg>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">Supabase</h4>
                      <p className="text-[10px] text-slate-500">Database & Auth</p>
                    </div>
                  </div>

                  {/* Vercel */}
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <svg className="w-7 h-7 text-black shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 22h20L12 2z" />
                    </svg>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">Vercel</h4>
                      <p className="text-[10px] text-slate-500">Cloud Hosting</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3.5 italic">
                  * Dan berbagai framework serta pustaka open source lainnya sesuai dengan ketentuan lisensi masing-masing.
                </p>
              </div>

              {/* Part 3: Ketentuan Lisensi */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Ketentuan Lisensi
                </h3>
                <p className="text-xs text-slate-650 text-justify leading-relaxed">
                  Seluruh merek dagang, logo, dan hak cipta pihak ketiga tetap menjadi milik pemegang hak masing-masing. Penggunaan perangkat lunak open source dalam aplikasi ini mengikuti ketentuan lisensi yang ditetapkan oleh masing-masing pengembang.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 7: Statistik Kunjungan & Sebaran Wilayah Pengunjung (Paling Bawah) */}
        <div className="dashboard-card bg-white p-0 rounded-xl shadow-md border border-emerald-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
          <button
            onClick={() => toggleSection('statistik_kunjungan')}
            className="w-full flex items-center justify-between p-6 md:p-8 cursor-pointer hover:bg-emerald-50/40 transition-colors text-left focus:outline-none group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-all duration-300 shrink-0">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                  Statistik Kunjungan & Sebaran Wilayah Pengunjung
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Pemantauan trafik real-time, akumulasi periode, dan geolokasi IP pengunjung
                </p>
              </div>
            </div>
            <div className="p-1.5 bg-slate-50 group-hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors shrink-0 flex items-center justify-center">
              {expandedSections['statistik_kunjungan'] ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </button>

          {expandedSections['statistik_kunjungan'] && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-2 duration-350">
              {statsLoading ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400">
                  Memuat data statistik pengunjung...
                </div>
              ) : (
                <>
                  {/* 5 Kartu Ringkasan Kunjungan */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                    {/* 1. Sedang Online */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Sedang Online
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black text-emerald-700 tabular-nums">
                          {(visitorStats?.online_count ?? 1).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                          Sesi aktif (15 mnt terakhir)
                        </div>
                      </div>
                    </div>

                    {/* 2. Hari Ini */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Hari Ini
                        </span>
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black text-slate-800 tabular-nums">
                          {(visitorStats?.today_count ?? 1).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                          {visitorStats?.today_label || 'Hari berjalan (WIB)'}
                        </div>
                      </div>
                    </div>

                    {/* 3. Bulan Ini */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Bulan Ini
                        </span>
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black text-slate-800 tabular-nums">
                          {(visitorStats?.this_month_count ?? 1).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                          {visitorStats?.this_month_label || 'Bulan berjalan'}
                        </div>
                      </div>
                    </div>

                    {/* 4. Bulan Lalu */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Bulan Lalu
                        </span>
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black text-slate-800 tabular-nums">
                          {(visitorStats?.last_month_count ?? 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                          {visitorStats?.last_month_label || 'Bulan sebelumnya'}
                        </div>
                      </div>
                    </div>

                    {/* 5. Total Kunjungan */}
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                          Total Kunjungan
                        </span>
                        <Users className="w-3.5 h-3.5 text-emerald-200" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black text-white tabular-nums">
                          {(visitorStats?.total_count ?? 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-100 mt-0.5">
                          Akumulasi keseluruhan
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sebaran Daerah / Kota & Log IP Pengunjung */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Kolom Kiri: Sebaran Wilayah Asal Pengunjung */}
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Globe2 className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Sebaran Daerah Asal Pengunjung
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          Geolokasi IP
                        </span>
                      </div>

                      {visitorStats?.regions && visitorStats.regions.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {(() => {
                            const maxRegCount = Math.max(
                              ...visitorStats.regions.map((r) => r.count),
                              1
                            );
                            return visitorStats.regions.map((reg, idx) => {
                              const pct = Math.max(8, Math.round((reg.count / maxRegCount) * 100));
                              return (
                                <div key={reg.location} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 flex items-center gap-1.5 truncate">
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                        #{idx + 1}
                                      </span>
                                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span className="truncate">{reg.location}</span>
                                    </span>
                                    <span className="font-black text-slate-800 tabular-nums shrink-0 ml-2">
                                      {reg.count.toLocaleString('id-ID')} kunjungan
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-2">
                          Belum ada data wilayah tercatat.
                        </p>
                      )}
                    </div>

                    {/* Kolom Kanan: Identitas jaringan & IP pengunjung terkini */}
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-teal-600" />
                          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            IP Address & Sesi Pengunjung Aktif
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Privasi Disamarkan
                        </span>
                      </div>

                      {visitorStats?.current_visitor && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-800 block">
                              Koneksi Anda Saat Ini
                            </span>
                            <span className="font-extrabold text-slate-800">
                              {visitorStats.current_visitor.masked_ip} • {visitorStats.current_visitor.location}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            Anda
                          </span>
                        </div>
                      )}

                      {visitorStats?.active_sessions && visitorStats.active_sessions.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {visitorStats.active_sessions.map((s, i) => (
                            <div
                              key={`${s.masked_ip}-${i}`}
                              className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <code className="font-bold text-slate-700 text-[10.5px]">
                                  {s.masked_ip}
                                </code>
                                <span className="text-slate-500 truncate">
                                  ({s.location})
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 shrink-0 ml-2">
                                {new Date(s.last_seen).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} WIB
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Version */}
      <div className="mt-12 text-center">
        <p className="text-xs font-black text-slate-400 tracking-widest uppercase">
          Food Security Intelligence & DSS {FULL_VERSION}
        </p>
      </div>
    </div>
  );
}
