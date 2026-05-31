"use client";

import { Home, Package, Utensils, FileText, Download, Brain, TrendingUp, ExternalLink, ChevronsLeft, ChevronsRight, Leaf } from 'lucide-react';

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
  
  const menuItems = [
    { 
      icon: Home, 
      label: 'Beranda', 
      view: 'beranda' 
    },
    { 
      icon: Brain, 
      label: 'Insight Ketahanan Pangan', 
      view: 'insight' 
    },
    { 
      icon: Package, 
      label: 'Ketersediaan', 
      view: 'ketersediaan' 
    },
    { 
      icon: TrendingUp, 
      label: 'Keterjangkauan', 
      view: 'keterjangkauan' 
    },
    { 
      icon: Utensils, 
      label: 'Pemanfaatan', 
      view: 'pemanfaatan' 
    },
    { 
      icon: ExternalLink, 
      label: 'Serumpun Padi : Dashboard Pertanian dan Kelautan', 
      view: 'serumpun',
      url: 'https://serumpunpadi.web.id/'
    },
    { 
      icon: FileText, 
      label: 'DSS FSVA : Otomasi Peta', 
      view: 'dss_fsva',
      url: 'https://dss-fsva.vercel.app/'
    }
  ];

  const handleMenuClick = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    if (item.url) {
      // External link: let default behavior open in new tab
      return;
    }
    e.preventDefault();
    setCurrentView(item.view);
    if (isMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className="h-full flex flex-col justify-between pt-[1cm] pb-6 print:hidden relative transition-all duration-300">
      
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
        {/* Leaf Green Circle Header Icon */}
        <div className={`px-6 mb-8 flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 border border-emerald-400 shadow-md">
             <Leaf className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-white font-black leading-tight text-[11px] tracking-wider uppercase">Ketahanan Pangan</h1>
              <p className="text-emerald-400 text-[9px] uppercase tracking-widest font-black">KOTA CILEGON</p>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            
            return (
              <a 
                key={i} 
                href={item.url || '#'}
                target={item.url ? '_blank' : undefined}
                rel={item.url ? 'noopener noreferrer' : undefined}
                onClick={(e) => handleMenuClick(e, item)}
                className={`sidebar-link flex items-center gap-3 px-6 py-2.5 transition-all text-slate-300 hover:text-white hover:bg-slate-800/50 ${
                  isActive ? '!text-white bg-[#0f172a] border-l-4 border-emerald-500 pl-5 font-bold shadow-inner' : ''
                } ${isCollapsed ? 'justify-center px-0 pl-0 border-l-0 pl-[4px]' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <span className="text-[12px] font-black tracking-wide uppercase leading-tight whitespace-normal break-words flex-1 animate-in fade-in duration-300">
                    {item.label}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div className={`px-6 mt-8 space-y-4 ${isCollapsed ? 'px-2 flex flex-col items-center' : ''}`}>
        {!isCollapsed ? (
          <div className="text-[9px] text-slate-400 leading-normal font-medium bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 animate-in fade-in duration-300">
            <p>
              <span className="font-extrabold text-amber-400 block mb-1">Disclaimer:</span> 
              Interpretasi AI pada dashboard ini disusun secara otomatis berdasarkan data yang tersedia dan bertujuan sebagai informasi pendukung. Hasil analisis dapat mengandung keterbatasan atau ketidaksesuaian sehingga tetap memerlukan verifikasi dan penilaian profesional sebelum digunakan sebagai dasar pengambilan keputusan.
            </p>
          </div>
        ) : null}
        <button 
          onClick={() => typeof window !== 'undefined' && window.print()}
          className={`w-full py-2.5 rounded-lg border border-slate-600 hover:border-emerald-500 text-white text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-emerald-600/10 hover:text-emerald-400 transition-all cursor-pointer active:scale-95 shadow-sm ${isCollapsed ? 'px-0 w-10 h-10' : 'px-4'}`}
          title={isCollapsed ? "Unduh Laporan" : undefined}
        >
          <Download className="w-3.5 h-3.5 shrink-0" /> 
          {!isCollapsed && <span>Unduh Laporan</span>}
        </button>
      </div>
    </div>
  );
}
