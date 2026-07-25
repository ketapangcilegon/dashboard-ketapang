"use client";

import { useState, useEffect } from 'react';
import { Info, ShieldAlert, Code2, ArrowLeft, Brain, Database, ChevronDown, ChevronUp, Award, Lock } from 'lucide-react';
import { FULL_VERSION } from '@/lib/version';

interface TentangAplikasiProps {
  onBack?: () => void;
}

export default function TentangAplikasi({ onBack }: TentangAplikasiProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
    setIsAdmin(sessionActive);
  }, []);

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
                Status & Disclaimer
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
                Web app ini merupakan inisiatif pengembangan mandiri dan saat ini <strong className="text-amber-705">belum merupakan aplikasi resmi Pemerintah Kota Cilegon</strong> maupun representasi resmi dari kebijakan, sikap, keputusan, atau pernyataan institusi mana pun.
              </p>
              <p>
                Seluruh konten, fitur, visualisasi, dan pengembangannya dilakukan secara independen sebagai sarana inovasi pemanfaatan data dan teknologi informasi dalam mendukung analisis ketahanan pangan.
              </p>
              <p>
                Meskipun berbagai data dan informasi telah diupayakan untuk disajikan secara akurat, pengguna tetap disarankan untuk melakukan verifikasi terhadap sumber data resmi apabila diperlukan untuk kebutuhan formal atau pengambilan keputusan strategis.
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
            isAdmin ? (
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
            isAdmin ? (
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
                Platform ini dikembangkan dan dikelola secara mandiri oleh seorang Analis Ketahanan Pangan pada DKPP Kota Cilegon sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan gizi daerah.
              </p>
              <p>
                Pengembangan dilakukan secara bertahap dengan pendekatan inovatif yang mengintegrasikan dashboard analitik, visualisasi spasial, pengelolaan data, dan teknologi kecerdasan buatan guna mendukung tata kelola pangan yang lebih efektif dan adaptif.
              </p>
              <div className="pt-3 border-t border-slate-100 text-[13px] md:text-sm">
                <span className="font-extrabold text-slate-800">Kontak pengembang:</span>{' '}
                <a 
                  href="mailto:ketapangcilegon@gmail.com" 
                  className="text-emerald-600 hover:text-emerald-700 font-semibold underline transition-colors"
                >
                  ketapangcilegon@gmail.com
                </a>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bapanas */}
                  <a 
                    href="https://badanpangan.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bapanas.jpg" 
                        alt="Bapanas Logo" 
                        className="max-h-full max-w-[120px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.jpg')) {
                            target.src = '/logo-bapanas.png';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Badan Pangan Nasional (Bapanas)
                    </span>
                  </a>

                  {/* Pemkot Cilegon */}
                  <a 
                    href="https://cilegon.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-cilegon.jpg" 
                        alt="Pemkot Cilegon Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.jpg')) {
                            target.src = '/logo-cilegon.png';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Pemerintah Kota Cilegon
                    </span>
                  </a>

                  {/* BMKG */}
                  <a 
                    href="https://www.bmkg.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bmkg.jpg" 
                        alt="BMKG Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.jpg')) {
                            target.src = '/logo-bmkg.png';
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-650 transition-colors">
                      Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)
                    </span>
                  </a>

                  {/* BPS */}
                  <a 
                    href="https://www.bps.go.id" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all duration-300 text-center group/item hover:shadow-sm"
                  >
                    <div className="h-16 flex items-center justify-center mb-3">
                      <img 
                        src="/logo-bps.jpg" 
                        alt="BPS Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('.jpg')) {
                            target.src = '/logo-bps.png';
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
