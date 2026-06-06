"use client";

import { Info, ShieldAlert, Code2, ArrowLeft, Brain, Database } from 'lucide-react';
import { FULL_VERSION } from '@/lib/version';

interface TentangAplikasiProps {
  onBack?: () => void;
}

export default function TentangAplikasi({ onBack }: TentangAplikasiProps) {
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
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Info className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mb-2.5">
                Tentang Aplikasi
              </h2>
              <div className="text-slate-600 space-y-3.5 text-[13px] md:text-sm leading-relaxed">
                <p>
                  Web App <strong className="text-slate-800">Food Security Intelligence & DSS</strong> merupakan platform informasi dan analisis yang dikembangkan untuk mendukung pemanfaatan data ketahanan pangan secara lebih efektif, terintegrasi, dan mudah diakses dalam mensupport pengambilan keputusan.
                </p>
                <p>
                  Platform ini menyajikan berbagai indikator strategis ketahanan pangan, visualisasi data spasial, statistik sektoral, serta informasi pendukung lainnya yang dapat dimanfaatkan oleh pengambil kebijakan, pemangku kepentingan, akademisi, dan masyarakat dalam mendukung perencanaan, monitoring, evaluasi, dan pengambilan keputusan berbasis data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Status & Disclaimer */}
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mb-2.5">
                Status & Disclaimer
              </h2>
              <div className="text-slate-600 space-y-3.5 text-[13px] md:text-sm leading-relaxed">
                <p>
                  Web app ini merupakan inisiatif pengembangan mandiri dan saat ini <strong className="text-amber-700">belum merupakan aplikasi resmi Pemerintah Kota Cilegon</strong> maupun representasi resmi dari kebijakan, sikap, keputusan, atau pernyataan institusi mana pun.
                </p>
                <p>
                  Seluruh konten, fitur, visualisasi, dan pengembangannya dilakukan secara independen sebagai sarana inovasi pemanfaatan data dan teknologi informasi dalam mendukung analisis ketahanan pangan.
                </p>
                <p>
                  Meskipun berbagai data dan informasi telah diupayakan untuk disajikan secara akurat, pengguna tetap disarankan untuk melakukan verifikasi terhadap sumber data resmi apabila diperlukan untuk kebutuhan formal atau pengambilan keputusan strategis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Metodologi & Validasi Machine Learning */}
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Brain className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mb-2.5">
                Metodologi & Validasi Machine Learning (ML)
              </h2>
              <div className="text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify">
                <p>
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
            </div>
          </div>
        </div>

        {/* Section 4: Pipeline Data & Keandalan SAGON */}
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <Database className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mb-2.5">
                Keandalan & Pipeline Data Real-time (SAGON)
              </h2>
              <div className="text-slate-650 space-y-3.5 text-[13px] md:text-sm leading-relaxed text-justify">
                <p>
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
            </div>
          </div>
        </div>

        {/* Section 5: Pengembang */}
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Code2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mb-2.5">
                Pengembang
              </h2>
              <div className="text-slate-600 space-y-3.5 text-[13px] md:text-sm leading-relaxed">
                <p>
                  Platform ini dikembangkan dan dikelola secara mandiri oleh seorang Analis Ketahanan Pangan pada DKPP Kota Cilegon sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan gizi daerah.
                </p>
                <p>
                  Pengembangan dilakukan secara bertahap dengan pendekatan inovatif yang mengintegrasikan dashboard analitik, visualisasi spasial, pengelolaan data, dan teknologi kecerdasan buatan guna mendukung tata kelola pangan yang lebih efektif dan adaptif.
                </p>
              </div>
            </div>
          </div>
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
