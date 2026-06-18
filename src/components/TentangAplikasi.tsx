"use client";

import { useState } from 'react';
import { Info, ShieldAlert, Code2, ArrowLeft, Brain, Database, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { FULL_VERSION } from '@/lib/version';

interface TentangAplikasiProps {
  onBack?: () => void;
}

export default function TentangAplikasi({ onBack }: TentangAplikasiProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
            <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify animate-in fade-in slide-in-from-top-2 duration-350">
              <p className="mt-4">
                Modul peramalan harga pangan pada platform ini dirancang dengan pendekatan ilmiah yang ketat untuk memberikan estimasi harga jangka pendek yang andal bagi pengambil kebijakan:
              </p>
              <ul className="list-disc pl-5 space-y-2.5 text-slate-600">
                <li>
                  <strong className="text-slate-800">Pipeline Seleksi Model (Champion-Challenger):</strong> Sistem membandingkan tiga algoritme secara dinamis untuk setiap komoditas: <span className="font-semibold text-slate-700">XGBoost Regressor</span> (untuk pola non-linear kompleks), <span className="font-semibold text-slate-700">Random Forest Regressor</span> (untuk stabilitas variansi), dan <span className="font-semibold text-slate-700">Prophet Additive Model</span> (untuk tren musiman jangka panjang). Model dengan akurasi validasi terbaik otomatis dipilih sebagai champion untuk melakukan peramalan akhir.
                </li>
                <li>
                  <strong className="text-slate-800">Skema Validasi & Backtesting:</strong> Model divalidasi menggunakan pembagian data berdasarkan waktu (<em className="italic">Time-Series Split</em>), dengan data historis hingga tahun 2025 digunakan sebagai data latih (<em className="italic">training</em>), dan data tahun 2026 digunakan sebagai set pengujian (<em className="italic">validation/testing</em>) untuk menjamin keabsahan prediksi sebelum model dirilis ke produksi.
                </li>
                <li>
                  <strong className="text-slate-800">Metrik Evaluasi & Tingkat Kepercayaan:</strong> Performa model diukur menggunakan metrik <em className="italic">Mean Absolute Percentage Error</em> (MAPE). Indikator <strong className="text-slate-800">Tingkat Kepercayaan (Confidence Score)</strong> yang ditampilkan di dashboard (misalnya 99.2%) dihitung secara langsung dengan formula <code className="px-1.5 py-0.5 bg-slate-100 rounded text-purple-700 font-bold text-[11px]">100% - MAPE</code> (di mana MAPE = 0.8%).
                </li>
                <li>
                  <strong className="text-slate-800">Interpretasi Akurasi Tinggi:</strong> Tingkat kepercayaan yang sangat tinggi ini mencerminkan keandalan peramalan jangka pendek (<em className="italic">one-step-ahead monthly prediction</em>) karena model memanfaatkan data lag harga bulan sebelumnya serta pola musiman Hari Besar Keagamaan Nasional (HBKN). Pengguna diimbau untuk memahami bahwa akurasi ini mengukur kestabilan jangka pendek dan tidak meniadakan risiko guncangan ekstrem tak terduga seperti anomali iklim global (El Niño) atau intervensi kebijakan impor yang mendadak.
                </li>
              </ul>
            </div>
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
                        src="https://upload.wikimedia.org/wikipedia/commons/e/e3/Logo_Badan_Pangan_Nasional_-_NFA_%282022%29.png" 
                        alt="Bapanas Logo" 
                        className="max-h-full max-w-[120px] object-contain group-hover/item:scale-105 transition-transform duration-300"
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
                        src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Lambang_Kota_Cilegon.png" 
                        alt="Pemkot Cilegon Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
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
                        src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Logo_BMKG_%282010%29.png" 
                        alt="BMKG Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
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
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/512px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png" 
                        alt="BPS Logo" 
                        className="max-h-full max-w-[80px] object-contain group-hover/item:scale-105 transition-transform duration-300"
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
