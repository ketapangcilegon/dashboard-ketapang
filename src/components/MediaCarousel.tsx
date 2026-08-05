/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, MapPin, Calendar, X } from 'lucide-react';
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

  // Dynamic Title & Description line measuring for mobile (Item 1)
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isTitleTwoLines, setIsTitleTwoLines] = useState<boolean>(false);

  // Drag/Pan Image State for 3.6:1 Aspect Ratio Images on Mobile (Item 2)
  const [panPercentage, setPanPercentage] = useState<number>(50);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartPan = useRef<number>(50);
  const hasMovedDrag = useRef<boolean>(false);

  // Swipe gesture touch state
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

  // Reset pan & check title height on slide change
  useEffect(() => {
    setPanPercentage(50);
  }, [currentIndex]);

  useEffect(() => {
    const checkTitleLines = () => {
      if (titleRef.current) {
        const h = titleRef.current.clientHeight;
        // On mobile, text-xs line height is ~16.5px. If height > 22px, title is 2 lines.
        setIsTitleTwoLines(h > 22);
      }
    };
    checkTitleLines();
    window.addEventListener('resize', checkTitleLines);
    return () => window.removeEventListener('resize', checkTitleLines);
  }, [currentIndex, items]);

  // Autoplay Timer (5-7 seconds interval)
  useEffect(() => {
    if (!isPlaying || isHovered || activeVideoModal !== null || inlineVideoPlaying || isDraggingImage || totalItems <= 1) {
      return;
    }

    const timer = setInterval(() => {
      nextSlide();
    }, 6000); // 6 seconds

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, activeVideoModal, inlineVideoPlaying, isDraggingImage, totalItems, nextSlide]);

  // Pointer / Touch Handlers for Drag/Pan Image (Item 2)
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragStartPan.current = panPercentage;
    hasMovedDrag.current = false;
    setIsDraggingImage(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingImage) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 5) {
      hasMovedDrag.current = true;
    }
    const containerWidth = (e.currentTarget as HTMLElement).clientWidth || 360;
    // Dragging left (deltaX < 0) increases pan % (moves image right)
    // Dragging right (deltaX > 0) decreases pan % (moves image left)
    const panDelta = -(deltaX / containerWidth) * 110;
    const newPan = Math.max(0, Math.min(100, dragStartPan.current + panDelta));
    setPanPercentage(newPan);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingImage) return;
    setIsDraggingImage(false);

    const deltaX = e.clientX - dragStartX.current;
    // Quick horizontal swipe over 75px triggers slide transition
    if (deltaX < -75) {
      nextSlide();
    } else if (deltaX > 75) {
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
    const minSwipeDistance = 50; // minimum px swipe
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
  };

  if (totalItems === 0) return null;

  const currentItem = items[currentIndex];

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

      {/* Main Carousel Hero Card */}
      <div 
        className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200/80 group transition-all duration-300 h-[170px] sm:h-[195px] md:h-[210px] lg:h-[220px] flex flex-col justify-between cursor-grab active:cursor-grabbing select-none touch-pan-x"
        onClick={() => {
          if (!hasMovedDrag.current) {
            setShowTextOverlay(prev => !prev);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsDraggingImage(false);
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
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-white text-[10px] sm:text-[11px] font-bold shadow-sm"
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
        <div className="absolute inset-0 w-full h-full">
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
            <div className="relative w-full h-full">
              <img 
                src={currentItem.media_type === 'video' ? (currentItem.thumbnail_url || currentItem.media_url) : currentItem.media_url}
                alt={currentItem.title}
                className="w-full h-full object-cover transform scale-[1.01] transition-all duration-75 ease-out select-none pointer-events-none"
                style={{ objectPosition: `${panPercentage}% center` }}
                loading="eager"
                draggable={false}
              />
              
              {/* Subtle Overlay to enhance contrast without darkening full image */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Previous Button (Left Arrow - Always Visible) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/35 hover:bg-black/65 text-white shadow-md border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        {/* Next Button (Right Arrow - Always Visible) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/35 hover:bg-black/65 text-white shadow-lg border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>

        {/* Video Play Button Overlay in Center */}
        {currentItem.media_type === 'video' && !inlineVideoPlaying && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInlineVideoPlaying(true);
              }}
              className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all border-2 border-white/40 cursor-pointer"
              title="Putar Video"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
            </button>
          </div>
        )}

        {/* Bottom-Left Text & Content Overlay */}
        {!inlineVideoPlaying && (
          <div 
            className={`absolute left-3 sm:left-4.5 bottom-2.5 sm:bottom-3 z-10 max-w-[72%] sm:max-w-md lg:max-w-lg text-left transition-all duration-300 space-y-0.5 ${
              showTextOverlay ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Title (Max 2 lines on Mobile, scrollable if exceeded) */}
            <div 
              className="max-h-[2.2rem] sm:max-h-[3rem] overflow-y-auto pointer-events-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/50 mb-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 
                ref={titleRef}
                className="text-xs sm:text-[13.5px] lg:text-sm font-black leading-snug tracking-wide whitespace-normal break-words"
                style={{
                  color: '#ffffff',
                  WebkitTextStroke: '1px #000000',
                  paintOrder: 'stroke fill',
                  textShadow: '0 1.5px 3px rgba(0,0,0,0.95), 0 0 4px #000000'
                }}
              >
                {currentItem.title}
              </h3>
            </div>

            {/* Description (Dynamic Clamping: Max 2 lines if Title is 2 lines, Max 3 lines if Title is 1 line on Mobile) */}
            {currentItem.description && (
              <div 
                className={`overflow-y-auto pointer-events-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/50 transition-all duration-200 ${
                  isTitleTwoLines ? 'max-h-[2.1rem] sm:max-h-[4.4rem]' : 'max-h-[3.1rem] sm:max-h-[4.4rem]'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <p 
                  className="text-[10px] sm:text-[11.5px] font-medium leading-snug whitespace-normal break-words max-w-xs sm:max-w-md lg:max-w-lg"
                  style={{
                    color: '#ffffff',
                    WebkitTextStroke: '0.75px #000000',
                    paintOrder: 'stroke fill',
                    textShadow: '0 1px 1.5px rgba(0,0,0,0.95), 0 0 3px #000000'
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
          <div className="absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 z-10 flex items-center gap-1.5 pointer-events-auto">
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
                    ? 'w-5 h-1.5 sm:w-6 sm:h-2 bg-emerald-400 shadow-md'
                    : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
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
