"use client";

import { Info, ShieldAlert, Code2, ArrowLeft } from 'lucide-react';

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

      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase border-b-4 border-emerald-500 inline-block pb-2">
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
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide mb-3">
                Tentang Aplikasi
              </h2>
              <div className="text-slate-600 space-y-4 text-sm md:text-base leading-relaxed">
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
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide mb-3">
                Status & Disclaimer
              </h2>
              <div className="text-slate-600 space-y-4 text-sm md:text-base leading-relaxed">
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

        {/* Section 3: Pengembang */}
        <div className="dashboard-card bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Code2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide mb-3">
                Pengembang
              </h2>
              <div className="text-slate-600 space-y-4 text-sm md:text-base leading-relaxed">
                <p>
                  Platform ini dikembangkan dan dikelola secara mandiri oleh seorang <strong className="text-slate-800">Analis Ketahanan Pangan Ahli Muda pada DKPP Kota Cilegon</strong> sebagai bentuk kontribusi profesional dalam mendorong transformasi digital, pemanfaatan data, serta pengembangan sistem informasi ketahanan pangan dan gizi daerah.
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
          Food Security Intelligence & DSS v1.0 - 06/2026
        </p>
      </div>
    </div>
  );
}
