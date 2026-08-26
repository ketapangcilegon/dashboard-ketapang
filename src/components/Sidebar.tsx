"use client";

import { useState } from 'react';
import { Home, Layers, PieChart, ExternalLink, Database, Info, Download, Leaf, ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight, Sparkles, Camera } from 'lucide-react';

interface SidebarProps {
  currentView?: string;
  setCurrentView?: (view: string) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  currentView = 'beranda', 
  setCurrentView = () => {},
  isCollapsed = false,
  setIsCollapsed = () => {},
  isMobile = false,
  onCloseMobile = () => {}
}: SidebarProps) {

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fiturUtama: true,
    aspekPangan: true,
    linkExternal: true
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleNavClick = (e: React.MouseEvent, view: string, url?: string) => {
    if (url) return; // External link opens in new tab
    e.preventDefault();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = `/?view=${view}`;
      return;
    }
    setCurrentView(view);
    if (isMobile) {
      onCloseMobile();
    }
  };

  const fiturUtamaSub = [
    { label: 'Panel Harga Pangan Strategis', view: 'harga_full' },
    { label: 'Peta Tematik FSVA dan SKPG', view: 'peta_full' },
    { label: 'Forecast Harga Pangan & EWS', view: 'forecasting' },
    { label: 'Insight Ketahanan Pangan', view: 'insight' },
    { label: 'Analisis SKPG', view: 'analisis_skpg' },
    { label: 'Grafik Radar Ketahanan Pangan Kelurahan', view: 'radar_kelurahan' }
  ];

  const aspekPanganSub = [
    { label: 'Ketersediaan', view: 'ketersediaan' },
    { label: 'Keterjangkauan', view: 'keterjangkauan' },
    { label: 'Pemanfaatan', view: 'pemanfaatan' }
  ];

  const linkExternalSub = [
    { label: 'DKPP.info', url: 'https://dkpp.info/' },
    { label: 'FSVA.my.id', url: 'https://fsva.my.id/' }
  ];

  return (
    <div className="h-full flex flex-col justify-between pt-6 pb-6 print:hidden relative transition-all duration-300 overflow-y-auto custom-scrollbar select-none text-left">
      
      {/* Toggle Collapse Button (Desktop Only) */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all z-30"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ChevronsLeft className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>
      )}

      <div>
        {/* Header Branding */}
        <div className={`px-6 mb-6 flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 border border-emerald-400 shadow-md">
             <Leaf className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300 text-left">
              <h1 className="text-white font-black leading-tight text-[11px] tracking-wider uppercase text-left">Ketahanan Pangan</h1>
              <p className="text-emerald-400 text-[9px] uppercase tracking-widest font-black text-left">KOTA CILEGON</p>
            </div>
          )}
        </div>

        <nav className="space-y-3 px-3 text-left">
          
          {/* 1. BERANDA */}
          <a
            href="/?view=beranda"
            onClick={(e) => handleNavClick(e, 'beranda')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-200 hover:text-white hover:bg-white/10 text-left ${
              currentView === 'beranda' ? 'bg-emerald-800/80 text-white font-extrabold shadow-sm' : ''
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? "BERANDA" : undefined}
          >
            <Home className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words">BERANDA</span>
            )}
          </a>

          {/* 2. FITUR UTAMA (Collapsible Tree) */}
          <div>
            <button
              onClick={() => toggleSection('fiturUtama')}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer text-left ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isCollapsed ? "FITUR UTAMA" : undefined}
            >
              <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && (
                  <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words leading-tight flex-1">FITUR UTAMA</span>
                )}
              </div>
              {!isCollapsed && (
                openSections.fiturUtama ? (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                )
              )}
            </button>

            {!isCollapsed && openSections.fiturUtama && (
              <div className="ml-5 pl-3 border-l border-emerald-500/40 space-y-1 mt-1 text-left">
                {fiturUtamaSub.map((sub, i) => (
                  <a
                    key={i}
                    href={`/?view=${sub.view}`}
                    onClick={(e) => handleNavClick(e, sub.view)}
                    className={`relative flex items-center text-left px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all whitespace-normal break-words leading-tight before:content-[''] before:absolute before:-left-3 before:top-3 before:w-2.5 before:h-px before:bg-emerald-500/40 ${
                      currentView === sub.view ? 'text-white bg-emerald-900/60 font-black' : ''
                    }`}
                  >
                    <span className="text-left">{sub.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 3. ASPEK KETAHANAN PANGAN (Collapsible Tree) */}
          <div>
            <button
              onClick={() => toggleSection('aspekPangan')}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer text-left ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isCollapsed ? "ASPEK KETAHANAN PANGAN" : undefined}
            >
              <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                <PieChart className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && (
                  <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words leading-tight flex-1">ASPEK KETAHANAN PANGAN</span>
                )}
              </div>
              {!isCollapsed && (
                openSections.aspekPangan ? (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                )
              )}
            </button>

            {!isCollapsed && openSections.aspekPangan && (
              <div className="ml-5 pl-3 border-l border-emerald-500/40 space-y-1 mt-1 text-left">
                {aspekPanganSub.map((sub, i) => (
                  <a
                    key={i}
                    href={`/?view=${sub.view}`}
                    onClick={(e) => handleNavClick(e, sub.view)}
                    className={`relative flex items-center text-left px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all whitespace-normal break-words leading-tight before:content-[''] before:absolute before:-left-3 before:top-3 before:w-2.5 before:h-px before:bg-emerald-500/40 ${
                      currentView === sub.view ? 'text-white bg-emerald-900/60 font-black' : ''
                    }`}
                  >
                    <span className="text-left">{sub.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* FOOD SECURITY INTELLIGENCE (Diposisikan di atas Link External) */}
          <a
            href="/?view=ai_intelligence"
            onClick={(e) => handleNavClick(e, 'ai_intelligence')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-200 hover:text-white hover:bg-white/10 text-left ${
              currentView === 'ai_intelligence'
                ? 'bg-emerald-800/80 text-white font-extrabold shadow-sm'
                : 'hover:bg-emerald-900/40'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? "FOOD SECURITY INTELLIGENCE" : undefined}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words leading-tight flex-1">
                <span>FOOD SECURITY INTELLIGENCE</span>
                <span className="text-[8px] font-black bg-amber-500/80 text-white px-1.5 py-0.5 rounded-full tracking-widest leading-none inline-block">
                  BETA
                </span>
              </div>
            )}
          </a>

          {/* 📷 KAMERA CERDAS (BETA) */}
          <a
            href="/?view=kamera_cerdas"
            onClick={(e) => handleNavClick(e, 'kamera_cerdas')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-200 hover:text-white hover:bg-white/10 text-left ${
              currentView === 'kamera_cerdas'
                ? 'bg-emerald-800/80 text-white font-extrabold shadow-sm'
                : 'hover:bg-emerald-900/40'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? "KAMERA CERDAS (BETA)" : undefined}
          >
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words leading-tight flex-1">
                <span>KAMERA CERDAS</span>
                <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full tracking-widest leading-none inline-block">
                  BETA
                </span>
              </div>
            )}
          </a>

          {/* 4. LINK EXTERNAL (Collapsible Tree) */}
          <div>
            <button
              onClick={() => toggleSection('linkExternal')}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer text-left ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isCollapsed ? "LINK EXTERNAL" : undefined}
            >
              <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
                {!isCollapsed && (
                  <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words leading-tight flex-1">LINK EXTERNAL</span>
                )}
              </div>
              {!isCollapsed && (
                openSections.linkExternal ? (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                )
              )}
            </button>

            {!isCollapsed && openSections.linkExternal && (
              <div className="ml-5 pl-3 border-l border-emerald-500/40 space-y-1 mt-1 text-left">
                {linkExternalSub.map((sub, i) => (
                  <a
                    key={i}
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center text-left px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all whitespace-normal break-words leading-tight before:content-[''] before:absolute before:-left-3 before:top-3 before:w-2.5 before:h-px before:bg-emerald-500/40"
                  >
                    <span className="text-left">{sub.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 5. SUMBER DATA */}
          <a
            href="/?view=sumber_data"
            onClick={(e) => handleNavClick(e, 'sumber_data')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-200 hover:text-white hover:bg-white/10 text-left ${
              currentView === 'sumber_data' ? 'bg-emerald-800/80 text-white font-extrabold shadow-sm' : ''
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? "SUMBER DATA" : undefined}
          >
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words">SUMBER DATA</span>
            )}
          </a>

          {/* 6. TENTANG APLIKASI */}
          <a
            href="/?view=tentang"
            onClick={(e) => handleNavClick(e, 'tentang')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-200 hover:text-white hover:bg-white/10 text-left ${
              currentView === 'tentang' ? 'bg-emerald-800/80 text-white font-extrabold shadow-sm' : ''
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? "TENTANG APLIKASI" : undefined}
          >
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <span className="text-xs font-black tracking-wider uppercase text-left whitespace-normal break-words">TENTANG APLIKASI</span>
            )}
          </a>

        </nav>
      </div>

      <div className="mt-6 space-y-3 px-3 text-left">
        {/* Disclaimer & Unduh Laporan */}
        {!isCollapsed && (
          <div className="text-[9px] text-slate-200/90 leading-normal font-medium bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 animate-in fade-in duration-300 text-left">
            <p className="text-left">
              <strong className="font-extrabold text-amber-400 block mb-1 text-left">Disclaimer:</strong> 
              Interpretasi AI pada dashboard ini disusun secara otomatis berdasarkan data yang tersedia dan bertujuan sebagai informasi pendukung. Hasil analisis dapat mengandung keterbatasan atau ketidaksesuaian sehingga tetap memerlukan verifikasi dan penilaian profesional sebelum digunakan sebagai dasar pengambilan keputusan.
            </p>
          </div>
        )}

        <button 
          onClick={() => typeof window !== 'undefined' && window.print()}
          className={`w-full py-2.5 rounded-lg border border-emerald-500/50 hover:border-emerald-400 text-white text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-emerald-700/30 hover:text-emerald-300 transition-all cursor-pointer active:scale-95 shadow-sm ${
            isCollapsed ? 'px-0 w-10 h-10' : 'px-4'
          }`}
          title={isCollapsed ? "Unduh Laporan" : undefined}
        >
          <Download className="w-3.5 h-3.5 shrink-0" /> 
          {!isCollapsed && <span>Unduh Laporan</span>}
        </button>
      </div>
    </div>
  );
}
