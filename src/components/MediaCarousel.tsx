/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface DashboardMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  duration?: string | null;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_MEDIA_SEED: DashboardMedia[] = [
  {
    id: 'seed-1',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=1600&auto=format&fit=crop',
    title: 'Monitoring Harga Pangan',
    description: 'Pemantauan stabilitas harga komoditas pangan pokok di Pasar Baru Cilegon untuk memastikan keterjangkauan masyarakat.',
    location: 'Pasar Baru Cilegon',
    event_date: '2026-08-04',
    is_active: true,
    sort_order: 1
  },
  {
    id: 'seed-2',
    media_type: 'video',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1600&auto=format&fit=crop',
    title: 'Stabilitas Pasokan Beras',
    description: 'Pemeriksaan ketersediaan cadangan beras cadangan pemerintah daerah di gudang Bulog Cilegon.',
    location: 'Gudang Bulog Cilegon',
    event_date: '2026-08-02',
    duration: '00:45',
    is_active: true,
    sort_order: 2
  },
  {
    id: 'seed-3',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?q=80&w=1600&auto=format&fit=crop',
    title: 'Bantuan Pangan B2SA',
    description: 'Penyaluran bantuan pangan Beragam, Bergizi Seimbang, dan Aman (B2SA) untuk penanganan stunting di Pulomerak.',
    location: 'Kecamatan Pulomerak',
    event_date: '2026-07-30',
    is_active: true,
    sort_order: 3
  },
  {
    id: 'seed-4',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop',
    title: 'Monitoring Lahan Pertanian',
    description: 'Kondisi lahan pertanian padi di wilayah Kota Cilegon menunjukkan pertumbuhan optimal menjelang panen.',
    location: 'Kel. Gerem',
    event_date: '2026-07-28',
    is_active: true,
    sort_order: 4
  },
  {
    id: 'seed-5',
    media_type: 'video',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1600&auto=format&fit=crop',
    title: 'Rapat Koordinasi Ketahanan Pangan',
    description: 'Rakor lintas sektor DKPP Kota Cilegon membahas ketersediaan pangan dan mitigasi risiko kerawanan.',
    location: 'DKPP Kota Cilegon',
    event_date: '2026-07-25',
    duration: '01:20',
    is_active: true,
    sort_order: 5
  },
  {
    id: 'seed-6',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1600&auto=format&fit=crop',
    title: 'Gerakan Pangan Murah',
    description: 'Pelaksanaan Gerakan Pangan Murah (GPM) serentak untuk menjaga daya beli masyarakat di Kecamatan Cilegon.',
    location: 'Kecamatan Cilegon',
    event_date: '2026-07-21',
    is_active: true,
    sort_order: 6
  }
];

export default function MediaCarousel() {
  const [items, setItems] = useState<DashboardMedia[]>(DEFAULT_MEDIA_SEED);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [activeVideoModal, setActiveVideoModal] = useState<DashboardMedia | null>(null);
  const [inlineVideoPlaying, setInlineVideoPlaying] = useState<boolean>(false);
  const [showTextOverlay, setShowTextOverlay] = useState<boolean>(true);

  // Dominant color state extracted dynamically from the active image
  const [dominantColor, setDominantColor] = useState<string>('rgb(30, 41, 59)');

  // Dynamic Title & Description line measuring for mobile
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isTitleTwoLines, setIsTitleTwoLines] = useState<boolean>(false);

  // Pointer & touch swipe state
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const hasMovedDrag = useRef<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Fetch items from Supabase
  useEffect(() => {
    async function loadMediaData() {
      try {
        const { data, error } = await supabase
          .from('dashboard_media')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(10);

        if (!error && data && data.length > 0) {
          setItems(data);
        }
      } catch (err) {
        console.warn('[MediaCarousel] Using fallback seed data:', err);
      }
    }
    loadMediaData();
  }, []);

  const totalItems = items.length;

  const nextSlide = useCallback(() => {
    if (totalItems === 0) return;
    setCurrentIndex(prev => (prev + 1) % totalItems);
    setInlineVideoPlaying(false);
  }, [totalItems]);

  const prevSlide = useCallback(() => {
    if (totalItems === 0) return;
    setCurrentIndex(prev => (prev - 1 + totalItems) % totalItems);
    setInlineVideoPlaying(false);
  }, [totalItems]);

  const currentItem = items[currentIndex];
  const activeImageSrc = currentItem
    ? currentItem.media_type === 'video'
      ? currentItem.thumbnail_url || currentItem.media_url
      : currentItem.media_url
    : '';

  // Extract dominant color from the active photo (sampling edges + overall pixels)
  useEffect(() => {
    if (!activeImageSrc) return;
    let isCancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const sampleSize = 32;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let weightTotal = 0;

        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const idx = (y * sampleSize + x) * 4;
            const a = imageData[idx + 3];
            if (a < 128) continue;

            // Beri bobot lebih tinggi pada piksel tepi kanan karena placeholder teks di sisi kanan
            const isRightSide = x >= sampleSize / 2;
            const weight = isRightSide ? 2.0 : 1.0;

            rTotal += imageData[idx] * weight;
            gTotal += imageData[idx + 1] * weight;
            bTotal += imageData[idx + 2] * weight;
            weightTotal += weight;
          }
        }

        if (weightTotal > 0) {
          const r = Math.round(rTotal / weightTotal);
          const g = Math.round(gTotal / weightTotal);
          const b = Math.round(bTotal / weightTotal);
          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        // Fallback handled gracefully
      }
    };
    img.src = activeImageSrc;

    return () => {
      isCancelled = true;
    };
  }, [activeImageSrc]);

  // Perceived luminance calculation for contrast
  const isLightBg = useMemo(() => {
    const match = dominantColor.match(/\d+/g);
    if (!match || match.length < 3) return false;
    const r = parseInt(match[0], 10);
    const g = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150;
  }, [dominantColor]);

  useEffect(() => {
    const checkTitleLines = () => {
      if (titleRef.current) {
        const h = titleRef.current.clientHeight;
        setIsTitleTwoLines(h > 22);
      }
    };
    checkTitleLines();
    window.addEventListener('resize', checkTitleLines);
    return () => window.removeEventListener('resize', checkTitleLines);
  }, [currentIndex, items]);

  // Autoplay Timer (6 seconds interval)
  useEffect(() => {
    if (!isPlaying || isHovered || activeVideoModal !== null || inlineVideoPlaying || isDraggingImage || totalItems <= 1) {
      return;
    }

    const timer = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, activeVideoModal, inlineVideoPlaying, isDraggingImage, totalItems, nextSlide]);

  // Pointer Handlers for Swipe Navigation
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    hasMovedDrag.current = false;
    setIsDraggingImage(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingImage) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 5) {
      hasMovedDrag.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingImage) return;
    setIsDraggingImage(false);

    const deltaX = e.clientX - dragStartX.current;
    if (deltaX < -60) {
      nextSlide();
    } else if (deltaX > 60) {
      prevSlide();
    }
  };

  // Touch Swipe Fallbacks
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
  };

  if (totalItems === 0 || !currentItem) return null;

  return (
    <div className="w-full mb-3.5 select-none">
      {/* Section Header Title */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-1 bg-emerald-600 rounded-full"></span>
          <h2 className="text-[11px] lg:text-xs font-black text-slate-800 uppercase tracking-widest">
            INFORMASI & DOKUMENTASI
          </h2>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. VERSI DESKTOP (sm:flex): Teks Kiri Hijau Gradasi Blur, Foto Kanan Menempel Margin */}
      {/* ========================================================= */}
      <div
        className="hidden sm:flex relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/80 group transition-all duration-300 h-[290px] md:h-[310px] lg:h-[330px] flex-row items-stretch select-none touch-pan-x bg-black"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsDraggingImage(false);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDraggingImage(false)}
      >
        {/* SISI KIRI: Placeholder Teks dengan Background Hijau Gradasi Blur + Glow Orbs */}
        <div
          className="w-[46%] lg:w-[44%] shrink-0 h-full flex flex-col justify-between p-4 sm:p-5 relative z-10 overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#022c22] shadow-inner border-r border-emerald-800/40"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar di dalam Placeholder Teks */}
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/25 relative z-10">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Dokumentasi & Informasi
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-950/60 backdrop-blur-md text-emerald-200 text-[9.5px] sm:text-[10px] font-bold shadow-sm">
              <span>{currentIndex + 1} / {totalItems}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="hover:text-emerald-100 hover:scale-110 transition-transform cursor-pointer p-0.5"
                title={isPlaying ? "Jeda Autoplay" : "Putar Autoplay"}
              >
                {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>

          {/* Area Teks: Scrollable Vertikal, Tidak Overlay ke Foto, Tidak Keluar Placeholder */}
          <div className="flex-1 overflow-y-auto custom-scrollbar my-2.5 pr-1 space-y-2 select-text overscroll-contain relative z-10">
            {/* Judul: Highlight kuning dan teks hitam */}
            <div>
              <span className="bg-yellow-300 text-black font-extrabold text-[12px] sm:text-[13px] lg:text-[14px] leading-snug px-2.5 py-1 rounded shadow-sm inline-block whitespace-normal break-words">
                {currentItem.title}
              </span>
            </div>

            {/* Deskripsi Teks */}
            {currentItem.description && (
              <p className="text-[11px] sm:text-[12px] font-medium leading-relaxed text-emerald-50 whitespace-normal break-words drop-shadow-sm">
                {currentItem.description}
              </p>
            )}

            {/* Lokasi & Tanggal */}
            {(currentItem.location || currentItem.event_date) && (
              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-emerald-100">
                {currentItem.location && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-900/60 border border-emerald-600/30">
                    📍 {currentItem.location}
                  </span>
                )}
                {currentItem.event_date && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-900/60 border border-emerald-600/30">
                    📅 {currentItem.event_date}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar: Dot Indicators di bagian kanan bawah */}
          <div className="pt-2 border-t border-emerald-500/25 flex items-center justify-end gap-1.5 relative z-10">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setInlineVideoPlaying(false);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-5 h-1.5 sm:w-6 sm:h-2 bg-yellow-300 shadow-md'
                    : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-200/40 hover:bg-emerald-100'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* SISI KANAN: Foto menempel ke margin kanan */}
        <div className="w-[54%] lg:w-[56%] h-full relative overflow-hidden bg-black flex items-center justify-end shrink-0">
          {currentItem.media_type === 'video' && inlineVideoPlaying ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <video
                src={currentItem.media_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onEnded={() => setInlineVideoPlaying(false)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineVideoPlaying(false);
                }}
                className="absolute top-2.5 right-2.5 z-30 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-all cursor-pointer"
                title="Tutup Video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-end overflow-hidden bg-black">
              {/* Foto Utama Rata Kanan Menempel Margin */}
              <img
                src={activeImageSrc}
                alt={currentItem.title}
                className="relative z-10 h-full w-full object-contain object-right select-none pointer-events-none drop-shadow-md transition-all duration-300"
                loading="eager"
                draggable={false}
              />
              {/* Video Play Button Overlay if Video */}
              {currentItem.media_type === 'video' && !inlineVideoPlaying && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineVideoPlaying(true);
                    }}
                    className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all border-2 border-white/40 cursor-pointer"
                    title="Putar Video"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Chevron Buttons: Kiri & Kanan */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-md border border-white/30 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg border border-white/30 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. VERSI MOBILE (block sm:hidden): Dikembalikan ke UI/UX Sebelum Perubahan Terakhir */}
      {/* ========================================================= */}
      <div
        className="block sm:hidden relative w-full rounded-xl overflow-hidden shadow-md border border-slate-200/80 group transition-all duration-300 h-[180px] flex flex-col justify-between cursor-grab active:cursor-grabbing select-none touch-pan-x bg-black"
        onClick={() => {
          if (!hasMovedDrag.current) {
            setShowTextOverlay((prev) => !prev);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDraggingImage(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Counter Badge & Play/Pause (Top Right Overlay) */}
        <div
          className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-white text-[10px] font-bold shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{currentIndex + 1} / {totalItems}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="hover:text-emerald-400 transition-colors cursor-pointer p-0.5"
            title={isPlaying ? "Jeda Autoplay" : "Putar Autoplay"}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>

        {/* Media Content Container */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
          {currentItem.media_type === 'video' && inlineVideoPlaying ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <video
                src={currentItem.media_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onEnded={() => setInlineVideoPlaying(false)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineVideoPlaying(false);
                }}
                className="absolute top-3 left-3 z-30 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-all cursor-pointer"
                title="Tutup Video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
              {/* Foto Utama Utuh Tanpa Terpotong */}
              <img
                src={activeImageSrc}
                alt={currentItem.title}
                className="relative z-10 h-full w-auto max-w-full max-h-full object-contain mx-auto select-none pointer-events-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.28)] transition-all duration-300"
                loading="eager"
                draggable={false}
              />
              {/* Video Play Button Overlay if Video */}
              {currentItem.media_type === 'video' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineVideoPlaying(true);
                    }}
                    className="pointer-events-auto w-10 h-10 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all border-2 border-white/40 cursor-pointer"
                    title="Putar Video"
                  >
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom-Left Text & Content Overlay */}
        {!inlineVideoPlaying && (
          <div
            className={`absolute left-3 bottom-2.5 z-20 max-w-[72%] text-left transition-all duration-300 space-y-0.5 ${
              showTextOverlay ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Title (Max 2 lines on Mobile, scrollable if exceeded) */}
            <div
              className="max-h-[2.2rem] overflow-y-auto pointer-events-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/50 mb-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                ref={titleRef}
                className="text-xs font-black leading-snug tracking-wide whitespace-normal break-words"
                style={{
                  color: '#ffffff',
                  WebkitTextStroke: '3.2px #000000',
                  paintOrder: 'stroke fill',
                  textShadow:
                    '-1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000, 0 2px 6px rgba(0,0,0,0.98), 0 0 8px rgba(0,0,0,0.92)',
                }}
              >
                {currentItem.title}
              </h3>
            </div>

            {/* Description (Dynamic Clamping: Max 2 lines if Title is 2 lines, Max 3 lines if Title is 1 line on Mobile) */}
            {currentItem.description && (
              <div
                className={`overflow-y-auto pointer-events-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/50 transition-all duration-200 ${
                  isTitleTwoLines ? 'max-h-[2.1rem]' : 'max-h-[3.1rem]'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  className="text-[10px] font-semibold leading-snug whitespace-normal break-words max-w-xs"
                  style={{
                    color: '#ffffff',
                    WebkitTextStroke: '2.4px #000000',
                    paintOrder: 'stroke fill',
                    textShadow:
                      '-0.8px -0.8px 0 #000000, 0.8px -0.8px 0 #000000, -0.8px 0.8px 0 #000000, 0.8px 0.8px 0 #000000, 0 1.5px 5px rgba(0,0,0,0.98), 0 0 6px rgba(0,0,0,0.9)',
                  }}
                >
                  {currentItem.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dot Indicators (Anchored to Bottom Right Corner) */}
        {!inlineVideoPlaying && (
          <div className="absolute right-3 bottom-2.5 z-20 flex items-center gap-1.5 pointer-events-auto">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setInlineVideoPlaying(false);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-5 h-1.5 bg-emerald-400 shadow-md'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Mobile Chevron Buttons */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white shadow-md border border-white/30 flex items-center justify-center cursor-pointer transition-all active:scale-95"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white shadow-md border border-white/30 flex items-center justify-center cursor-pointer transition-all active:scale-95"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Video Modal Player (Optional extra fallback for full modal viewing) */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90">
              <h4 className="text-white font-bold text-sm truncate">{activeVideoModal.title}</h4>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <video
                src={activeVideoModal.media_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
