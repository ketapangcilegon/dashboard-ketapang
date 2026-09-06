"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import { useKMZLoader } from '@/hooks/useKMZLoader';
import { supabase } from '@/lib/supabase';
import { Loader2, Layers, MapPin, Navigation, Map, Plus, Minus, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { FSVA_LEGEND, SKPG_LEGEND } from '@/lib/ikpg';
import { useMap } from 'react-leaflet';
import * as XLSX from 'xlsx';
import { isKelurahanMatch, normalizeKelurahanName } from '@/lib/wilayah';

// Dynamically import Leaflet components to avoid SSR errors in Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const KecamatanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KecamatanLayer), { ssr: false });
const KelurahanLayer = dynamic(() => import('@/components/MapLayers').then(mod => mod.KelurahanLayer), { ssr: false });

interface MapUnifiedProps {
  selectedKecamatan: string;
  selectedKelurahan: string;
  selectedYear: number;
  selectedMonth: number;
}

type MapMode = 'fsva' | 'skpg' | 'borda' | 'intervensi';
type BasemapMode = 'light' | 'streets';

// A helper inner component to handle map movements and custom overlay panels
interface MapControllerProps {
  activeLayer: MapMode;
  setActiveLayer: (mode: MapMode) => void;
  opacity: number;
  setOpacity: (val: number) => void;
  basemap: BasemapMode;
  setBasemap: (mode: BasemapMode) => void;
  fsvaMatangData?: any[];
  skpgMatangData?: any[];
  intervensiData: any[];
  isPrinting?: boolean;
  activeSkpgPeriod?: { tahun: number; bulan: number };
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  hasPrevMonth?: boolean;
  hasNextMonth?: boolean;
  fsvaYear?: number;
  validFsvaYears?: number[];
  setFsvaYear?: (yr: number) => void;
  bordaYear?: number;
  validBordaYears?: number[];
  onPrevBordaYear?: () => void;
  onNextBordaYear?: () => void;
  hasPrevBordaYear?: boolean;
  hasNextBordaYear?: boolean;
}

function MapController({
  activeLayer,
  setActiveLayer,
  opacity,
  setOpacity,
  basemap,
  setBasemap,
  fsvaMatangData,
  skpgMatangData,
  intervensiData,
  isPrinting,
  activeSkpgPeriod,
  onPrevMonth,
  onNextMonth,
  hasPrevMonth,
  hasNextMonth,
  fsvaYear = 2025,
  validFsvaYears = [2025],
  setFsvaYear,
  bordaYear = 2026,
  validBordaYears = [2025, 2026, 2027],
  onPrevBordaYear,
  onNextBordaYear,
  hasPrevBordaYear,
  hasNextBordaYear
}: MapControllerProps) {
  const map = useMap();
  const [expandLayers, setExpandLayers] = useState(false);
  const [expandLegend, setExpandLegend] = useState(false);
  const [expandPrioritas, setExpandPrioritas] = useState(false);

  // Panel DOM refs for Leaflet event isolation
  const layersRef = useRef<HTMLDivElement | null>(null);
  const prioritasRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setExpandLegend(true);
    }
  }, []);

  // Prevent Leaflet map click/scroll propagation on custom control panels
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      [layersRef, prioritasRef, legendRef, controlsRef].forEach(ref => {
        if (ref.current) {
          L.DomEvent.disableClickPropagation(ref.current);
          L.DomEvent.disableScrollPropagation(ref.current);
        }
      });
    });
  }, [expandLayers, expandPrioritas, expandLegend]);

  // Helper to switch active layer and auto-collapse dropdown on mobile
  const selectLayer = (mode: MapMode) => {
    setActiveLayer(mode);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setExpandLayers(false);
    }
  };

  // Drag-to-scroll state for Prioritas Lokus list on desktop & mobile (2D touch/mouse drag)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isScrollDragging, setIsScrollDragging] = useState(false);
  const scrollStartX = useRef(0);
  const scrollStartY = useRef(0);
  const scrollTopVal = useRef(0);
  const scrollLeftVal = useRef(0);

  // Prevent any mouse/touch/scroll events on the inner scroll list from propagating to Leaflet map container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const stopPropagation = (e: Event) => {
      e.stopPropagation();
    };

    el.addEventListener('mousedown', stopPropagation);
    el.addEventListener('touchstart', stopPropagation, { passive: true });
    el.addEventListener('touchmove', stopPropagation, { passive: true });
    el.addEventListener('touchend', stopPropagation);
    el.addEventListener('pointerdown', stopPropagation);
    el.addEventListener('pointermove', stopPropagation);
    // NOTE: do NOT stopPropagation on 'click' or 'dblclick' — that would block button clicks (e.g. Download xlsx)
    el.addEventListener('wheel', stopPropagation);

    return () => {
      el.removeEventListener('mousedown', stopPropagation);
      el.removeEventListener('touchstart', stopPropagation);
      el.removeEventListener('touchmove', stopPropagation);
      el.removeEventListener('touchend', stopPropagation);
      el.removeEventListener('pointerdown', stopPropagation);
      el.removeEventListener('pointermove', stopPropagation);
      el.removeEventListener('wheel', stopPropagation);
    };
  }, [expandPrioritas]);

  const handleScrollStart = (clientX: number, clientY: number, target: HTMLElement) => {
    if (!scrollRef.current) return;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    setIsScrollDragging(true);
    scrollStartX.current = clientX;
    scrollStartY.current = clientY;
    scrollLeftVal.current = scrollRef.current.scrollLeft;
    scrollTopVal.current = scrollRef.current.scrollTop;
  };

  const handleScrollMouseDown = (e: React.MouseEvent) => {
    handleScrollStart(e.clientX, e.clientY, e.target as HTMLElement);
    e.stopPropagation();
  };

  const handleScrollTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleScrollStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
    }
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrollDragging || !scrollRef.current) return;
      e.preventDefault();
      const deltaX = e.clientX - scrollStartX.current;
      const deltaY = e.clientY - scrollStartY.current;
      scrollRef.current.scrollLeft = scrollLeftVal.current - deltaX;
      scrollRef.current.scrollTop = scrollTopVal.current - deltaY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrollDragging || !scrollRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - scrollStartX.current;
      const deltaY = e.touches[0].clientY - scrollStartY.current;
      scrollRef.current.scrollLeft = scrollLeftVal.current - deltaX;
      scrollRef.current.scrollTop = scrollTopVal.current - deltaY;
    };

    const handleDragEnd = () => {
      setIsScrollDragging(false);
    };

    if (isScrollDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isScrollDragging]);

  // Dynamically inject zoom-dependent CSS classes to the Leaflet map container
  useEffect(() => {
    if (!map) return;
    
    const updateZoomClass = () => {
      const container = map.getContainer();
      if (!container) return;
      
      // Remove any existing zoom classes
      for (let z = 0; z <= 22; z++) {
        container.classList.remove(`map-zoom-${z}`);
      }
      // Add the current zoom class
      container.classList.add(`map-zoom-${map.getZoom()}`);
    };

    map.on('zoomend', updateZoomClass);
    updateZoomClass(); // Initial execution on mount

    return () => {
      map.off('zoomend', updateZoomClass);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (isPrinting) {
      map.setView([-6.015, 106.012], 10.8);
    }
  }, [isPrinting, map]);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleLocateMe = () => {
    // Smoothly pan and zoom to Cilegon city center
    map.setView([-6.012, 106.028], 13);
  };
  const toggleBasemap = () => {
    setBasemap(basemap === 'light' ? 'streets' : 'light');
  };

  const toggleLayers = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !expandLayers;
    setExpandLayers(nextVal);
    if (nextVal) {
      setExpandLegend(false);
      setExpandPrioritas(false);
    }
  };

  const toggleLegend = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !expandLegend;
    setExpandLegend(nextVal);
    if (nextVal) {
      setExpandLayers(false);
      setExpandPrioritas(false);
    }
  };

  const togglePrioritas = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !expandPrioritas;
    setExpandPrioritas(nextVal);
    if (nextVal) {
      setExpandLayers(false);
      setExpandLegend(false);
    }
  };

  // Helper to calculate top 10 Kelurahans with lowest Borda Count
  const getTop10Borda = () => {
    if (!skpgMatangData || skpgMatangData.length === 0) return [];

    const calculatedBorda = skpgMatangData.map(item => {
      const fsvaRow = fsvaMatangData?.find(x => isKelurahanMatch(x.nama_kelurahan || x.kelurahan, item.nama_kelurahan || item.kelurahan));
      const total = (item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0) + (item.gizi_normal || 0) + (item.gizi_berlebih || 0);
      const prev = item.prevalensiRataRata !== undefined 
        ? item.prevalensiRataRata 
        : (total > 0 ? ((item.gizi_kurang || 0) + (item.gizi_sangat_kurang || 0)) / total * 100 : 0);
      const rawIkp = fsvaRow ? parseFloat(fsvaRow.ikp) : 70;
      const ikpVal = isNaN(rawIkp) ? 70 : rawIkp;
      return {
        kelurahan: item.nama_kelurahan || item.kelurahan,
        ikp: ikpVal,
        prevalensi: isNaN(prev) ? 0 : prev
      };
    });

    const fsvaSorted = [...calculatedBorda].sort((a, b) => a.ikp - b.ikp);
    const skpgSorted = [...calculatedBorda].sort((a, b) => b.prevalensi - a.prevalensi);

    const allBordaSums = calculatedBorda.map(r => {
      const fRank = fsvaSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      const sRank = skpgSorted.findIndex(x => x.kelurahan === r.kelurahan) + 1;
      return { kelurahan: r.kelurahan, sum: fRank + sRank };
    });

    const sortedSums = [...allBordaSums].sort((a, b) => a.sum - b.sum);
    const total = sortedSums.length;
    return sortedSums.map((item, index) => {
      const rank = index + 1;
      const desil = Math.min(10, Math.ceil((rank / total) * 10));
      return {
        kelurahan: item.kelurahan,
        sum: item.sum,
        rank,
        desil
      };
    }).slice(0, 10);
  };

  const handleDownloadLokusXlsx = () => {
    const headers = [
      ["No", "Kelurahan Borda Count (FSVA & SKPG)", "Skor Borda", "Desil Borda", "Rank Borda", "Kelurahan Gizi Buruk (SKPG)", "Prevalensi Gizi Buruk (%)"]
    ];
    
    const bordaList = getTop10Borda();
    const rankedList = (skpgMatangData || [])
      .map(item => {
        const sk = item.gizi_sangat_kurang || 0;
        const k = item.gizi_kurang || 0;
        const n = item.gizi_normal || 0;
        const l = item.gizi_berlebih || 0;
        const total = sk + k + n + l;
        const prevalensi = total > 0 ? ((sk + k) / total) * 100 : 0;
        return { kelurahan: item.nama_kelurahan || item.kelurahan, prevalensi };
      })
      .filter(x => x.prevalensi > 0)
      .sort((a, b) => b.prevalensi - a.prevalensi)
      .slice(0, 10);

    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push([
        i + 1,
        bordaList[i] ? `Kel. ${bordaList[i].kelurahan}` : '',
        bordaList[i] ? bordaList[i].sum : '',
        bordaList[i] ? `Desil ${bordaList[i].desil}` : '',
        bordaList[i] ? `Rank ${bordaList[i].rank}` : '',
        rankedList[i] ? `Kel. ${rankedList[i].kelurahan}` : '',
        rankedList[i] ? `${rankedList[i].prevalensi.toFixed(1)}%` : ''
      ]);
    }

    const data = [...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prioritas Lokus");
    XLSX.writeFile(wb, "Prioritas_Lokus_Intervensi.xlsx");
  };

  return (
    <>
      {/* 1. FLOATING CASCADE/COLLAPSE PANEL (TOP-LEFT) */}
      <div 
        ref={layersRef}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-4 left-4 ${expandLayers ? 'z-[1010]' : 'z-[1000]'} pointer-events-auto print:hidden`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden w-[185px] transition-all duration-300">
          <button
            onClick={toggleLayers}
            className="w-full px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-between text-xs font-black tracking-wider uppercase transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Layer Peta</span>
            </div>
            {expandLayers ? <ChevronUp className="w-4 h-4 animate-bounce" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandLayers && (
            <div className="p-4 space-y-4 transition-all duration-300">
              {/* Layers List */}
              <div className="space-y-3">
                {/* FSVA Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">FSVA {fsvaYear}</span>
                    <div className="flex items-center gap-1 mt-1 select-none">
                      <span className="text-[8px] text-slate-400 font-bold mr-0.5">IKP Makro</span>
                      
                      {/* Tombol Kiri (n-1) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = validFsvaYears.indexOf(fsvaYear);
                          if (idx > 0 && setFsvaYear) {
                            setFsvaYear(validFsvaYears[idx - 1]);
                          }
                        }}
                        disabled={validFsvaYears.indexOf(fsvaYear) <= 0}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          validFsvaYears.indexOf(fsvaYear) > 0 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Tahun Sebelumnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&lt;</span>
                      </button>

                      {/* Tombol Kanan (n+1) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = validFsvaYears.indexOf(fsvaYear);
                          if (idx !== -1 && idx < validFsvaYears.length - 1 && setFsvaYear) {
                            setFsvaYear(validFsvaYears[idx + 1]);
                          }
                        }}
                        disabled={validFsvaYears.indexOf(fsvaYear) === -1 || validFsvaYears.indexOf(fsvaYear) >= validFsvaYears.length - 1}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          validFsvaYears.indexOf(fsvaYear) !== -1 && validFsvaYears.indexOf(fsvaYear) < validFsvaYears.length - 1
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Tahun Berikutnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&gt;</span>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => selectLayer('fsva')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${activeLayer === 'fsva' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'fsva' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* SKPG Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">
                      SKPG {(() => {
                        const MONTHS_INDO = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const m = activeSkpgPeriod?.bulan || 6;
                        const y = activeSkpgPeriod?.tahun || 2026;
                        return `${MONTHS_INDO[m - 1]} ${y}`;
                      })()}
                    </span>
                    <div className="flex items-center gap-1 mt-1 select-none">
                      <span className="text-[8px] text-slate-400 font-bold mr-0.5">Gizi Balita</span>
                      
                      {/* Tombol Kiri (n-1) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onPrevMonth) onPrevMonth();
                        }}
                        disabled={!hasPrevMonth}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          hasPrevMonth 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Bulan Sebelumnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&lt;</span>
                      </button>

                      {/* Tombol Kanan (n+1) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNextMonth) onNextMonth();
                        }}
                        disabled={!hasNextMonth}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          hasNextMonth 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Bulan Berikutnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&gt;</span>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => selectLayer('skpg')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${activeLayer === 'skpg' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'skpg' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Prioritas Borda Switch (FSVA + SKPG) */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">FSVA + SKPG</span>
                    <div className="flex items-center gap-1 mt-1 select-none">
                      <span className="text-[8px] text-slate-400 font-bold mr-0.5">Borda {bordaYear}</span>
                      
                      {/* Tombol Kiri (<) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onPrevBordaYear) onPrevBordaYear();
                        }}
                        disabled={!hasPrevBordaYear}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          hasPrevBordaYear 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Tahun Borda Sebelumnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&lt;</span>
                      </button>

                      {/* Tombol Kanan (>) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNextBordaYear) onNextBordaYear();
                        }}
                        disabled={!hasNextBordaYear}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          hasNextBordaYear 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-90' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                        }`}
                        title="Tahun Borda Berikutnya"
                      >
                        <span className="text-[8px] font-black leading-none -mt-0.5">&gt;</span>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => selectLayer('borda')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${activeLayer === 'borda' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'borda' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* INTERVENSI Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-slate-800 leading-none">Intervensi</span>
                    <span className="text-[8px] text-slate-400 font-bold mt-0.5">Distribusi Bantuan & GPM</span>
                  </div>
                  <button 
                    onClick={() => selectLayer('intervensi')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${activeLayer === 'intervensi' ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${activeLayer === 'intervensi' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                  <span>Transparansi Peta</span>
                  <span>{opacity}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. FLOATING CONTROL BUTTONS (TOP-RIGHT) - Dark Glassmorphism Stack sesuai Mockup */}
      <div 
        ref={controlsRef}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 z-[1000] pointer-events-auto flex flex-col items-center print:hidden"
      >
        {/* Zoom In & Out Combined Box */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-black/50 backdrop-blur-md border border-white/20 shadow-lg mb-1.5">
          <button
            onClick={handleZoomIn}
            title="Perbesar Peta (Zoom In)"
            className="w-[34px] h-[32px] flex items-center justify-center text-white hover:bg-white/15 transition-all active:scale-95 cursor-pointer border-b border-white/15"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Perkecil Peta (Zoom Out)"
            className="w-[34px] h-[32px] flex items-center justify-center text-white hover:bg-white/15 transition-all active:scale-95 cursor-pointer"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Fit Bounds / Focus City Center */}
        <button
          onClick={() => {
            try {
              map.setView([-6.012, 106.028], 12.5, { animate: true });
            } catch {}
          }}
          title="Pusatkan Peta ke Seluruh Wilayah Kota Cilegon"
          className="w-[34px] h-[34px] rounded-xl bg-black/50 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/70 flex items-center justify-center text-white hover:border-white/40 transition-all active:scale-95 cursor-pointer mb-1.5"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4H5a2 2 0 0 0-2 2v2M17 4h2a2 2 0 0 1 2 2v2M7 20H5a2 2 0 0 1-2-2v-2M17 20h2a2 2 0 0 0 2-2v-2"/>
          </svg>
        </button>

        {/* Locate Me GPS */}
        <button
          onClick={handleLocateMe}
          title="Temukan Lokasi Saya (GPS)"
          className="w-[34px] h-[34px] rounded-xl bg-black/50 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/70 flex items-center justify-center text-white hover:border-white/40 transition-all active:scale-95 cursor-pointer mb-1.5"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="7"/>
            <circle cx="12" cy="12" r="2" fill="#ffffff"/>
            <line x1="12" y1="2" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
          </svg>
        </button>

        {/* Map Layers / Basemap switch */}
        <button
          onClick={toggleBasemap}
          title="Ganti Tampilan Basemap (Jalan / Satelit)"
          className="w-[34px] h-[34px] rounded-xl bg-black/50 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/70 flex items-center justify-center text-white hover:border-white/40 transition-all active:scale-95 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 12 12 17 22 12"/>
            <polyline points="2 17 12 22 22 17"/>
          </svg>
        </button>
      </div>

      {/* 3. DYNAMIC COLLAPSABLE LEGEND (BOTTOM-RIGHT) */}
      <div 
        ref={legendRef}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-4 right-4 z-[1000] pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300 ${
          expandLegend ? 'w-44 sm:w-48' : 'w-[105px] sm:w-48'
        }`}
      >
        <button
          onClick={toggleLegend}
          className="w-full px-2 py-2 sm:px-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[8.5px] sm:text-[9px] font-black tracking-wider uppercase text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">Legenda {activeLayer === 'borda' ? 'FSVA + SKPG' : activeLayer.toUpperCase()}</span>
            <span className="inline sm:hidden">Legenda</span>
          </div>
          {expandLegend ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronUp className="w-3 h-3 shrink-0" />}
        </button>

        {expandLegend && (
          <div className="p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {activeLayer === 'fsva' && (
              FSVA_LEGEND.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[9px] font-bold">
                  <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                  <span className="text-slate-600">{l.label}</span>
                </div>
              ))
            )}

            {activeLayer === 'skpg' && (
              SKPG_LEGEND.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[9px] font-bold">
                  <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ background: l.color }} />
                  <span className="text-slate-600">{l.label}</span>
                </div>
              ))
            )}

            {activeLayer === 'borda' && (
              <div className="space-y-1.5 text-[9px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-red-800 bg-red-600 shrink-0" />
                  <span className="text-slate-600">D1 - D5: Prioritas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-green-800 bg-emerald-600 shrink-0" />
                  <span className="text-slate-600">D6 - D10: Tahan</span>
                </div>
                <p className="text-[7.5px] text-slate-400 font-medium leading-tight pt-1">
                  *Prioritas desil Borda hasil gabungan kerentanan FSVA & SKPG.
                </p>
              </div>
            )}

            {activeLayer === 'intervensi' && (
              <div className="space-y-1.5 text-[9px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-purple-800 bg-purple-500 shrink-0" />
                  <span className="text-slate-600">Bantuan & GPM Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-blue-800 bg-blue-500 shrink-0" />
                  <span className="text-slate-600">Penerima Bantuan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-amber-600 bg-amber-500 shrink-0" />
                  <span className="text-slate-600">GPM Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-emerald-800 bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">Mandiri / Aman</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. DYNAMIC COLLAPSABLE PRIORITAS LOKUS (BOTTOM-LEFT) */}
      <div 
        ref={prioritasRef}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-4 left-4 ${expandPrioritas ? 'z-[1020]' : 'z-[1000]'} pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300 ${
          expandPrioritas ? 'w-[224px] sm:w-[315px]' : 'w-[125px] sm:w-48'
        }`}
      >
        <button
          onClick={togglePrioritas}
          className="w-full px-1.5 sm:px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Prioritas Lokus</span>
          </div>
          {expandPrioritas ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronUp className="w-3 h-3 shrink-0" />}
        </button>

        {expandPrioritas && (
          <div 
            ref={scrollRef}
            onMouseDown={handleScrollMouseDown}
            onTouchStart={handleScrollTouchStart}
            className={`p-3 max-h-[286px] overflow-x-auto overflow-y-auto custom-scrollbar bg-amber-50/95 border-t border-amber-200/60 select-none ${
              isScrollDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="flex items-start justify-between border-b border-amber-200/50 pb-2 mb-3">
              <div className="flex flex-col pl-1">
                <div className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-wider leading-tight">
                  {(() => {
                    if (activeLayer === 'fsva') {
                      return `Prioritas Intervensi Berdasarkan FSVA ${fsvaYear}`;
                    } else if (activeLayer === 'skpg') {
                      const MONTHS_INDO = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
                      const m = activeSkpgPeriod?.bulan || 6;
                      const y = activeSkpgPeriod?.tahun || 2026;
                      return `Prioritas Intervensi Berdasarkan SKPG ${MONTHS_INDO[m - 1]} ${y}`;
                    } else if (activeLayer === 'borda') {
                      const MONTHS_INDO = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
                      const m = activeSkpgPeriod?.bulan || 6;
                      const y = activeSkpgPeriod?.tahun || 2026;
                      return `Prioritas Intervensi Berdasarkan FSVA ${fsvaYear} dan SKPG ${MONTHS_INDO[m - 1]} ${y}`;
                    } else if (activeLayer === 'intervensi') {
                      return 'INTERVENSI';
                    }
                    return 'Prioritas Intervensi';
                  })()}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5">
                  {(() => {
                    if (activeLayer === 'fsva') {
                      return '(Tahunan / Indikator makro)';
                    } else if (activeLayer === 'skpg') {
                      return '(Bulanan / prevalensi gizi buruk)';
                    } else if (activeLayer === 'borda') {
                      return '(Borda count)';
                    }
                    return '';
                  })()}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadLokusXlsx(); }}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[8.5px] font-black text-emerald-850 bg-emerald-100 hover:bg-emerald-250 hover:text-white rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 border border-emerald-200/60 shrink-0"
                title="Download xlsx"
              >
                <Download className="w-3 h-3" />
                Download xlsx
              </button>
            </div>
            
            {/* Dynamic content depending on activeLayer */}
            {activeLayer === 'fsva' && (
              <div className="space-y-1 pl-1 min-w-max">
                {(() => {
                  if (!fsvaMatangData || fsvaMatangData.length === 0) {
                    return <div className="text-[10px] font-bold text-slate-400 py-1">Tidak ada data FSVA.</div>;
                  }
                  // Sort by IKP ascending (lowest value = highest priority)
                  const sortedFsva = [...fsvaMatangData]
                    .map(item => ({
                      kelurahan: item.nama_kelurahan || item.kelurahan,
                      ikp: parseFloat(item.ikp) || 0
                    }))
                    .sort((a, b) => a.ikp - b.ikp)
                    .slice(0, 10);

                  return (
                    <ol className="list-decimal list-inside space-y-1 text-[11.5px] sm:text-[12px] font-extrabold text-slate-700">
                      {sortedFsva.map((item, idx) => (
                        <li key={idx} className="border-b border-slate-200/40 pb-0.5 last:border-0 whitespace-nowrap" title={`Nilai IKP: ${item.ikp.toFixed(2)}`}>
                          Kel. {item.kelurahan} <span className="text-[9px] text-slate-400 font-bold ml-1">(IKP: {item.ikp.toFixed(1)})</span>
                        </li>
                      ))}
                    </ol>
                  );
                })()}
              </div>
            )}

            {activeLayer === 'skpg' && (
              <div className="space-y-1 pl-1 min-w-max">
                {(() => {
                  if (!skpgMatangData || skpgMatangData.length === 0) {
                    return <div className="text-[10px] font-bold text-slate-400 py-1">Tidak ada data SKPG.</div>;
                  }
                  const ranked = skpgMatangData
                    .map(item => {
                      const sk = item.gizi_sangat_kurang || 0;
                      const k = item.gizi_kurang || 0;
                      const n = item.gizi_normal || 0;
                      const l = item.gizi_berlebih || 0;
                      const total = sk + k + n + l;
                      const prevalensi = total > 0 ? ((sk + k) / total) * 100 : 0;
                      return { kelurahan: item.nama_kelurahan || item.kelurahan, prevalensi };
                    })
                    .filter(x => x.prevalensi > 0)
                    .sort((a, b) => b.prevalensi - a.prevalensi)
                    .slice(0, 10);

                  if (ranked.length === 0) {
                    return <div className="text-[10px] font-bold text-slate-400 py-1">Tidak ada data prevalensi gizi buruk.</div>;
                  }
                  return (
                    <ol className="list-decimal list-inside space-y-1 text-[11.5px] sm:text-[12px] font-extrabold text-slate-700">
                      {ranked.map((item, idx) => (
                        <li key={idx} className="border-b border-slate-200/40 pb-0.5 last:border-0 whitespace-nowrap" title={`Prevalensi: ${item.prevalensi.toFixed(1)}%`}>
                          Kel. {item.kelurahan} <span className="text-[9px] text-rose-550 font-extrabold ml-1">({item.prevalensi.toFixed(1)}%)</span>
                        </li>
                      ))}
                    </ol>
                  );
                })()}
              </div>
            )}

            {activeLayer === 'borda' && (
              <div className="space-y-1 pl-1 min-w-max">
                {getTop10Borda().length === 0 ? (
                  <div className="text-[10px] font-bold text-slate-400 py-1">Tidak ada data untuk Borda Count.</div>
                ) : (
                  <ol className="list-decimal list-inside space-y-1 text-[11.5px] sm:text-[12px] font-extrabold text-slate-700">
                    {getTop10Borda().map((item, idx) => (
                      <li key={idx} className="border-b border-slate-200/40 pb-0.5 last:border-0 whitespace-nowrap" title={`Skor Borda: ${item.sum}, Desil: ${item.desil}, Rank: ${item.rank}`}>
                        Kel. {item.kelurahan} <span className="text-[8px] text-amber-600 font-black ml-1">(Skor:{item.sum} | D:{item.desil})</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {activeLayer === 'intervensi' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Kolom Kiri: GPM */}
                <div className="border-r border-slate-200 pr-2">
                  <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-black tracking-wider mb-2 border-b border-slate-200 pb-1 leading-none uppercase">GPM</div>
                  <div className="text-[9px] text-slate-400 font-bold italic py-1">(Data menyusul)</div>
                </div>

                {/* Kolom Kanan: B2SA */}
                <div className="pl-1">
                  <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-black tracking-wider mb-2 border-b border-slate-200 pb-1 leading-tight uppercase">Bahan pangan B2SA untuk balita</div>
                  <div className="text-[9px] text-slate-400 font-bold italic py-1">(Data menyusul)</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function MapUnified({
  selectedKecamatan,
  selectedKelurahan,
  selectedYear,
  selectedMonth
}: MapUnifiedProps) {
  const [mounted, setMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapMode>('fsva');
  const [opacity, setOpacity] = useState<number>(75); // transparency state
  const [basemap, setBasemap] = useState<BasemapMode>('streets');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const beforePrint = () => setIsPrinting(true);
    const afterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);
  
  const { layers, loadFromURL, loading: kmzLoading } = useKMZLoader();

  // Supabase Data States
  const [fsvaMatangData, setFsvaMatangData] = useState<any[]>([]);
  const [fsvaYear, setFsvaYear] = useState<number>(2025);
  const [validFsvaYears, setValidFsvaYears] = useState<number[]>([2025]);
  const [bordaYear, setBordaYear] = useState<number>(2026);
  const [validBordaYears, setValidBordaYears] = useState<number[]>([2025, 2026, 2027]);
  const [skpgMatangData, setSkpgMatangData] = useState<any[]>([]);
  const [intervensiData, setIntervensiData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [validPeriods, setValidPeriods] = useState<{ tahun: number; bulan: number }[]>([]);
  const [activeSkpgPeriod, setActiveSkpgPeriod] = useState<{ tahun: number; bulan: number }>({ tahun: 2026, bulan: 6 });

  // Fetch all valid FSVA years available in database
  useEffect(() => {
    if (!mounted) return;
    const fetchValidFsvaYears = async () => {
      try {
        const { data, error } = await supabase
          .from('fsva_matang')
          .select('periode')
          .order('periode', { ascending: true });

        if (!error && data) {
          const list = Array.from(new Set(data.map(r => r.periode))).sort((a, b) => a - b);
          if (list.length > 0) {
            setValidFsvaYears(list);
            setFsvaYear(list[list.length - 1]); // default to newest year
          }
        }
      } catch (err) {
        console.error('Failed to fetch valid FSVA years:', err);
      }
    };
    fetchValidFsvaYears();
  }, [mounted]);

  // Fetch valid Borda years available in database only if data is complete
  useEffect(() => {
    if (!mounted) return;
    const fetchValidBordaYears = async () => {
      try {
        // 1. Check which years have real uploaded stunting data
        const { data: skpgRows } = await supabase
          .from('gizi_balita_skpg_kelurahan')
          .select('tahun, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih');

        const skpgYearsSet = new Set<number>();
        if (skpgRows) {
          skpgRows.forEach(r => {
            const tot = (r.bb_sangat_kurang || 0) + (r.bb_kurang || 0) + (r.bb_normal || 0) + (r.bb_lebih || 0);
            if (r.tahun && tot > 0) {
              skpgYearsSet.add(r.tahun);
            }
          });
        }

        // 2. Check available FSVA years in fsva_matang
        const { data: fsvaRows } = await supabase
          .from('fsva_matang')
          .select('periode');

        const fsvaYearsSet = new Set<number>();
        if (fsvaRows) {
          fsvaRows.forEach(r => {
            if (r.periode) fsvaYearsSet.add(r.periode);
          });
        }

        // A Borda year Y is valid if SKPG has >= 1 month of uploaded data for year Y AND FSVA has data for year Y-1 or year Y
        const validList: number[] = [];
        skpgYearsSet.forEach(y => {
          if (fsvaYearsSet.has(y - 1) || fsvaYearsSet.has(y)) {
            validList.push(y);
          }
        });

        // Fallback default to 2026 if list is empty but 2026 SKPG and 2025 FSVA exist
        if (validList.length === 0 && skpgYearsSet.has(2026) && fsvaYearsSet.has(2025)) {
          validList.push(2026);
        }

        validList.sort((a, b) => a - b);
        setValidBordaYears(validList);

        // Make sure bordaYear is set to a valid year in the list
        if (validList.length > 0 && !validList.includes(bordaYear)) {
          setBordaYear(validList[validList.length - 1]);
        }
      } catch (err) {
        console.error('Failed to fetch valid Borda years:', err);
      }
    };
    fetchValidBordaYears();
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    loadFromURL();
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [loadFromURL]);

  // Fetch all valid periods available with real stunting data
  useEffect(() => {
    if (!mounted) return;
    const fetchValidPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('gizi_balita_skpg_kelurahan')
          .select('tahun, bulan, total_balita')
          .order('tahun', { ascending: false })
          .order('bulan', { ascending: false });

        if (!error && data) {
          const list: { tahun: number; bulan: number }[] = [];
          // Selalu masukkan Januari 2026 sebagai backup
          list.push({ tahun: 2026, bulan: 1 });

          data.forEach(r => {
            if (r.total_balita > 0) {
              if (!list.some(p => p.tahun === r.tahun && p.bulan === r.bulan)) {
                list.push({ tahun: r.tahun, bulan: r.bulan });
              }
            }
          });

          // Urutkan ascending agar mudah navigasi step
          list.sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan);
          setValidPeriods(list);

          // Default set ke periode terbaru
          if (list.length > 0) {
            setActiveSkpgPeriod(list[list.length - 1]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch valid stunting periods:', err);
      }
    };
    fetchValidPeriods();
  }, [mounted]);

  // Fetch Supabase Data dynamically on year/month/activeSkpgPeriod/bordaYear change
  useEffect(() => {
    if (!mounted) return;

    async function fetchMapData() {
      setDataLoading(true);
      try {
        // Fetch FSVA Dataset: For Borda Count layer (year Y), use FSVA year Y - 1 (e.g. Borda 2026 uses FSVA 2025)
        try {
          const targetFsvaYear = activeLayer === 'borda' ? (bordaYear - 1) : fsvaYear;
          const { data: fsvaM, error } = await supabase
            .from('fsva_matang')
            .select('*')
            .eq('periode', targetFsvaYear);
          
          if (!error && fsvaM && fsvaM.length > 0) {
            setFsvaMatangData(fsvaM);
          } else {
            // Fallback to active fsvaYear if exact targetFsvaYear doesn't exist
            const { data: fsvaFB } = await supabase
              .from('fsva_matang')
              .select('*')
              .eq('periode', fsvaYear);
            setFsvaMatangData(fsvaFB || []);
          }
        } catch (e) {
          console.warn('fsva_matang fetch failed:', e);
        }

        // Fetch SKPG Dataset for activeSkpgPeriod & bordaYear
        try {
          // Fetch YTD average prevalences for the selected bordaYear (Rata-rata Jan s/d bulan terakhir yg diupload di bordaYear)
          const bordaAverages: Record<string, number> = {};
          try {
            const { data: ytdRows } = await supabase
              .from('gizi_balita_skpg_kelurahan')
              .select('*')
              .eq('tahun', bordaYear);
            
            if (ytdRows && ytdRows.length > 0) {
              const groups: Record<string, { sum: number; count: number }> = {};
              ytdRows.forEach(r => {
                const total = (r.bb_sangat_kurang || 0) + (r.bb_kurang || 0) + (r.bb_normal || 0) + (r.bb_lebih || 0);
                if (total > 0) {
                  const prev = ((r.bb_sangat_kurang || 0) + (r.bb_kurang || 0)) / total * 100;
                  if (!groups[r.kelurahan]) {
                    groups[r.kelurahan] = { sum: 0, count: 0 };
                  }
                  groups[r.kelurahan].sum += prev;
                  groups[r.kelurahan].count += 1;
                }
              });
              Object.keys(groups).forEach(kel => {
                bordaAverages[kel] = groups[kel].sum / groups[kel].count;
              });
            }
          } catch (eytd) {
            console.warn('Failed to calculate YTD averages for bordaYear:', eytd);
          }

          if (activeLayer === 'borda') {
            if (Object.keys(bordaAverages).length === 0) {
              // Data incomplete for bordaYear -> do not force map display
              setSkpgMatangData([]);
            } else {
              // Build mapped SKPG dataset for Borda
              const bordaMapped = Object.keys(bordaAverages).map(kel => ({
                nama_kelurahan: kel,
                kelurahan: kel,
                periode: bordaYear,
                prevalensiRataRata: bordaAverages[kel]
              }));
              setSkpgMatangData(bordaMapped);
            }
          } else {
            const { data: skpgRows, error } = await supabase
              .from('gizi_balita_skpg_kelurahan')
              .select('*')
              .eq('tahun', activeSkpgPeriod.tahun)
              .eq('bulan', activeSkpgPeriod.bulan);
            
            if (!error && skpgRows && skpgRows.length > 0) {
              const mappedSkpg = skpgRows.map(r => ({
                nama_kelurahan: r.kelurahan,
                gizi_sangat_kurang: r.bb_sangat_kurang,
                gizi_kurang: r.bb_kurang,
                gizi_normal: r.bb_normal,
                gizi_berlebih: r.bb_lebih,
                periode: r.tahun,
                bulan: r.bulan,
                prevalensiRataRata: bordaAverages[r.kelurahan]
              }));
              setSkpgMatangData(mappedSkpg);
            } else {
              const { data: skpgMFallback } = await supabase
                .from('skpg_matang')
                .select('*')
                .eq('periode', Number(selectedYear));
              setSkpgMatangData(skpgMFallback || []);
            }
          }
        } catch (e) {
          console.warn('gizi_balita_skpg_kelurahan fetch failed:', e);
        }


        // Fetch Intervensi & Bantuan (Try intervensi_kelurahan with fallbacks)
        let { data: intervensi, error: intError } = await supabase
          .from('intervensi_kelurahan')
          .select('*')
          .eq('tahun', selectedYear)
          .eq('bulan', selectedMonth);
          
        if (!intError && intervensi && intervensi.length > 0) {
          setIntervensiData(intervensi);
        } else {
          // Fallback 1: January of the selected year
          const { data: fbYear } = await supabase
            .from('intervensi_kelurahan')
            .select('*')
            .eq('tahun', selectedYear)
            .eq('bulan', 1);
            
          if (fbYear && fbYear.length > 0) {
            setIntervensiData(fbYear);
          } else {
            // Fallback 2: Year 2026 Month 1 (January)
            const { data: fbDefault } = await supabase
              .from('intervensi_kelurahan')
              .select('*')
              .eq('tahun', 2026)
              .eq('bulan', 1);
            setIntervensiData(fbDefault || []);
          }
        }

      } catch (err) {
        console.error('Gagal mengambil data peta Supabase:', err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchMapData();
  }, [mounted, selectedYear, selectedMonth, activeSkpgPeriod, fsvaYear, bordaYear, activeLayer]);

  if (!mounted || kmzLoading) {
    return (
      <div className="w-full h-full bg-slate-50 min-h-[350px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs font-semibold">Memuat Batas Wilayah Geospasial...</span>
      </div>
    );
  }

  // Filter map layers visually if specific Kelurahan/Kecamatan is selected
  const getFilteredKelurahanLayers = () => {
    if (!layers.kelurahan) return [];
    if (isPrinting) return layers.kelurahan;
    
    let filtered = [...layers.kelurahan];

    // Filter by Kecamatan if set
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      const KEL_TO_KEC: Record<string, string> = {
        'Cibeber': 'CIBEBER', 'Kedaleman': 'CIBEBER', 'Bulakan': 'CIBEBER', 'Cikerai': 'CIBEBER', 'Karang Asem': 'CIBEBER', 'Kalitimbang': 'CIBEBER',
        'Bagendung': 'CILEGON', 'Ciwedus': 'CILEGON', 'Bendungan': 'CILEGON', 'Ketileng': 'CILEGON', 'Ciwaduk': 'CILEGON',
        'Tamansari': 'PULO MERAK', 'Lebakgede': 'PULO MERAK', 'Mekarsari': 'PULO MERAK', 'Suralaya': 'PULO MERAK',
        'Banjar Negara': 'CIWANDAN', 'Tegal Ratu': 'CIWANDAN', 'Kubangsari': 'CIWANDAN', 'Gunung Sugih': 'CIWANDAN', 'Kepuh': 'CIWANDAN', 'Randakari': 'CIWANDAN',
        'Sukmajaya': 'JOMBANG', 'Jombang Wetan': 'JOMBANG', 'Masigit': 'JOMBANG', 'Panggung Rawi': 'JOMBANG', 'Gedong Dalem': 'JOMBANG',
        'Kotasari': 'GEROGOL', 'Gerogol': 'GEROGOL', 'Grogol': 'GEROGOL', 'Rawa Arum': 'GEROGOL', 'Gerem': 'GEROGOL',
        'Ramanuju': 'PURWAKARTA', 'Kotabumi': 'PURWAKARTA', 'Kebon Dalem': 'PURWAKARTA', 'Purwakarta': 'PURWAKARTA', 'Tegal Bunder': 'PURWAKARTA', 'Pabean': 'PURWAKARTA',
        'Warnasari': 'CITANGKIL', 'Deringo': 'CITANGKIL', 'Dringo': 'CITANGKIL', 'Kebonsari': 'CITANGKIL', 'Taman Baru': 'CITANGKIL', 'Lebak Denok': 'CITANGKIL', 'Samangraya': 'CITANGKIL', 'Citangkil': 'CITANGKIL'
      };

      filtered = filtered.filter(f => {
        const kelName = f.properties?.name || f.properties?.Name || '';
        return KEL_TO_KEC[kelName] === standardKec || KEL_TO_KEC[normalizeKelurahanName(kelName)] === standardKec;
      });
    }

    // Filter by Kelurahan if set
    if (selectedKelurahan !== 'ALL') {
      filtered = filtered.filter(f => {
        const kelName = f.properties?.name || f.properties?.Name || '';
        return isKelurahanMatch(kelName, selectedKelurahan);
      });
    }

    return filtered;
  };

  const getFilteredKecamatanLayers = () => {
    if (!layers.kecamatan) return [];
    if (isPrinting) return layers.kecamatan;
    if (selectedKecamatan !== 'ALL') {
      const standardKec = selectedKecamatan.toUpperCase();
      return layers.kecamatan.filter(f => {
        const kecName = (f.properties?.name || f.properties?.Name || '').toUpperCase();
        return kecName === standardKec;
      });
    }
    return layers.kecamatan;
  };



  const tileUrl = basemap === 'light'
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";

  return (
    <div className="relative w-full h-full min-h-[350px] flex flex-col rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
      
      {/* Map Loader Indicator */}
      {dataLoading && (
        <div className="absolute top-16 right-16 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md border border-slate-100 flex items-center gap-1.5 text-[8px] font-black text-slate-600 animate-pulse">
          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          Memproses peta...
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={[-6.015, 106.024]}
          zoom={11.0}
          zoomControl={false}
          className="w-full h-full z-0"
          style={{ background: '#EEF2F6' }}
        >
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <KecamatanLayer data={getFilteredKecamatanLayers()} />
          <KelurahanLayer
            data={getFilteredKelurahanLayers()}
            activeIKPGLayer={activeLayer}
            fsvaMatangData={fsvaMatangData}
            skpgMatangData={skpgMatangData}
            intervensiData={intervensiData}
            ikpgOpacity={opacity / 100}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />

          {/* Inject controller inside the Leaflet context */}
          {(() => {
            const idx = validPeriods.findIndex(p => p.tahun === activeSkpgPeriod.tahun && p.bulan === activeSkpgPeriod.bulan);
            const hasPrev = idx > 0;
            const hasNext = idx !== -1 && idx < validPeriods.length - 1;

            const handlePrev = () => {
              if (hasPrev) setActiveSkpgPeriod(validPeriods[idx - 1]);
            };
            const handleNext = () => {
              if (hasNext) setActiveSkpgPeriod(validPeriods[idx + 1]);
            };

            const bIdx = validBordaYears.indexOf(bordaYear);
            const hasPrevBorda = bIdx > 0;
            const hasNextBorda = bIdx !== -1 && bIdx < validBordaYears.length - 1;

            const handlePrevBorda = () => {
              if (hasPrevBorda) setBordaYear(validBordaYears[bIdx - 1]);
            };
            const handleNextBorda = () => {
              if (hasNextBorda) setBordaYear(validBordaYears[bIdx + 1]);
            };

            return (
              <MapController 
                activeLayer={activeLayer}
                setActiveLayer={setActiveLayer}
                opacity={opacity}
                setOpacity={setOpacity}
                basemap={basemap}
                setBasemap={setBasemap}
                fsvaMatangData={fsvaMatangData}
                skpgMatangData={skpgMatangData}
                intervensiData={intervensiData}
                isPrinting={isPrinting}
                activeSkpgPeriod={activeSkpgPeriod}
                onPrevMonth={handlePrev}
                onNextMonth={handleNext}
                hasPrevMonth={hasPrev}
                hasNextMonth={hasNext}
                fsvaYear={fsvaYear}
                validFsvaYears={validFsvaYears}
                setFsvaYear={setFsvaYear}
                bordaYear={bordaYear}
                validBordaYears={validBordaYears}
                onPrevBordaYear={handlePrevBorda}
                onNextBordaYear={handleNextBorda}
                hasPrevBordaYear={hasPrevBorda}
                hasNextBordaYear={hasNextBorda}
              />
            );
          })()}
        </MapContainer>
      </div>
      
    </div>
  );
}
