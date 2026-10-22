"use client";

import React, { useEffect, useRef } from 'react';
import { 
  X, MapPin, Store, Sparkles, Target, Activity, Camera, 
  Bot, Layers, BarChart3, ShieldCheck, Database, Info, 
  ExternalLink, ChevronRight, CheckCircle2, Truck 
} from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string;
  isExternal?: boolean;
  url?: string;
}

interface MobileFeatureCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (view: string) => void;
  currentView: string;
}

export default function MobileFeatureCatalogModal({
  isOpen,
  onClose,
  onSelectFeature,
  currentView,
}: MobileFeatureCatalogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  // Kunci scroll halaman belakang (body & html) saat modal terbuka
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);

      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      };
    }
  }, [isOpen, onClose]);

  // Cegah scroll bocor / scroll chaining ke halaman latar saat scroll di dalam modal mencapai batas mentok
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;
      const { scrollTop, scrollHeight, clientHeight } = el;

      // 1. Mentok di paling atas dan user menarik ke bawah (pull down)
      if (scrollTop <= 0 && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // 2. Mentok di paling bawah dan user menggeser ke atas (scroll up hingga mentok bawah)
      // Gunakan toleransi 1px untuk subpixel layar mobile
      if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      e.stopPropagation();
    };

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;

      // Mentok atas dan scroll ke atas
      if (scrollTop <= 0 && e.deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // Mentok bawah dan scroll ke bawah
      if (scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      e.stopPropagation();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleItemClick = (item: FeatureItem) => {
    if (item.isExternal && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    onSelectFeature(item.id);
    onClose();
  };

  const featureGroups: { category: string; items: FeatureItem[] }[] = [
    {
      category: 'Fitur Unggulan (11 Modul)',
      items: [
        {
          id: 'harga_full',
          title: 'Panel Harga Pangan',
          subtitle: 'Integrasi data pasar SAGON harian real-time',
          icon: <Store className="w-5 h-5 text-white" />,
          gradient: 'from-amber-500 to-orange-600',
          badge: 'Real-Time',
        },
        {
          id: 'forecasting',
          title: 'Forecast Harga & EWS',
          subtitle: 'Prediksi Machine Learning Holt-Winters & SARIMA',
          icon: <Sparkles className="w-5 h-5 text-white" />,
          gradient: 'from-[#FF5E74] to-[#FF405B]',
          badge: 'AI ML',
        },
        {
          id: 'peta_full',
          title: 'Peta FSVA & SKPG',
          subtitle: 'Peta digital FSVA & SKPG 43 Kelurahan se-Cilegon',
          icon: <MapPin className="w-5 h-5 text-white" />,
          gradient: 'from-[#0FA4B4] to-[#087F8C]',
          badge: 'GIS',
        },
        {
          id: 'grafik_ikp',
          title: 'Panel IKP & POU',
          subtitle: 'Tren Indeks Ketahanan Pangan & Prevalensi PoU Cilegon',
          icon: <BarChart3 className="w-5 h-5 text-white" />,
          gradient: 'from-[#00A878] to-[#008F67]',
          badge: 'Indeks',
        },
        {
          id: 'ai_intelligence',
          title: 'RAG Chatbot',
          subtitle: 'Chatbot Pangan Cilegon & Asisten Pangan cerdas',
          icon: <Bot className="w-5 h-5 text-white" />,
          gradient: 'from-indigo-600 to-blue-600',
          badge: 'GenAI',
        },
        {
          id: 'peta_pasokan',
          title: 'Peta Pasokan Beras',
          subtitle: 'Arus pasokan beras & logistik wilayah',
          icon: <Truck className="w-5 h-5 text-white" />,
          gradient: 'from-cyan-600 to-blue-700',
          badge: 'Geospasial',
        },
        {
          id: 'analisis_skpg',
          title: 'Analisis SKPG',
          subtitle: 'Sistem Kewaspadaan Pangan & Gizi tingkat Kota',
          icon: <Activity className="w-5 h-5 text-white" />,
          gradient: 'from-purple-600 to-indigo-600',
          badge: 'EWS',
        },
        {
          id: 'radar_kelurahan',
          title: 'Radar Ketahanan Pangan',
          subtitle: 'Komparasi 11 indikator kelurahan vs wilayah induk',
          icon: <Target className="w-5 h-5 text-white" />,
          gradient: 'from-teal-600 to-emerald-700',
          badge: 'Komparasi',
        },
        {
          id: 'agregasi_kamera',
          title: 'Agregasi Data Lapangan',
          subtitle: 'Rekapitulasi spasial sarana distribusi & potensi pangan',
          icon: <BarChart3 className="w-5 h-5 text-white" />,
          gradient: 'from-[#007A48] to-[#10B981]',
          badge: 'IoT Data',
        },
        {
          id: 'rantai_pasok',
          title: 'Analisis Rantai Pasok Pangan',
          subtitle: 'Observasi ketergantungan pasokan beras & logistik luar daerah',
          icon: <Truck className="w-5 h-5 text-white" />,
          gradient: 'from-blue-600 to-cyan-600',
          badge: 'Logistik',
        },
        {
          id: 'validasi_forecast',
          title: 'Validasi Model ML',
          subtitle: 'Audit akurasi model regresi terhadap pasar riil',
          icon: <ShieldCheck className="w-5 h-5 text-white" />,
          gradient: 'from-slate-700 to-slate-900',
          badge: 'Audit ML',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      {/* Backdrop (mencegah sentuhan tembus ke background) */}
      <div 
        className="absolute inset-0 touch-none select-none overscroll-none" 
        onClick={onClose} 
        onTouchMove={(e) => { if (e.cancelable) e.preventDefault(); }}
      />

      {/* Android Bottom Sheet Container */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 border-t border-slate-200"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header & Grab Handle (Touch none agar drag di header tidak menggulung background) */}
        <div 
          className="w-full shrink-0 touch-none select-none"
          onTouchMove={(e) => { if (e.cancelable) e.preventDefault(); }}
        >
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-base tracking-tight">Fitur Unggulan</h3>
              <p className="text-[11px] text-slate-500 font-medium">11 fitur dan modul analisis ketahanan pangan Cilegon</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body (Categorized List dengan isolasi scroll ketat) */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar pb-10 overscroll-contain"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {featureGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
                        isActive
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-100 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center text-slate-400 pl-2">
                        {isActive ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
