"use client";

import React, { useEffect, useRef } from 'react';
import { 
  X, Bell, TrendingUp, AlertTriangle, ArrowRight, 
  CheckCircle2, BellRing, Sparkles, ShieldAlert 
} from 'lucide-react';
import { RealNotificationItem } from '@/lib/useAppNotifications';

interface MobileNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  notifications?: RealNotificationItem[];
  permissionStatus?: NotificationPermission;
  onRequestPermission?: () => void;
}

export default function MobileNotificationModal({
  isOpen,
  onClose,
  onNavigate,
  notifications = [],
  permissionStatus = 'default',
  onRequestPermission,
}: MobileNotificationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  // Kunci scroll background (body & html)
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

  // Cegah scroll bocor ke background saat scroll mentok
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

      if (scrollTop <= 0 && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      e.stopPropagation();
    };

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollTop <= 0 && e.deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      <div 
        className="absolute inset-0 touch-none select-none overscroll-none" 
        onClick={onClose} 
        onTouchMove={(e) => { if (e.cancelable) e.preventDefault(); }}
      />

      <div 
        ref={modalRef}
        className="relative z-10 w-[94%] sm:w-full max-w-lg max-h-[86vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Drag handle / Top accent */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-2xs shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-800 text-xs tracking-tight truncate">Peringatan & EWS</h3>
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black shrink-0">
                    {notifications.length}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 font-medium truncate">
                Peringatan dini & kenaikan harga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Browser Permission Banner */}
        <div className="px-3 pt-2.5 pb-0.5">
          {permissionStatus === 'granted' ? (
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Notifikasi browser aktif</span>
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[9px] font-medium text-slate-600">
              <BellRing className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">Izin notifikasi non-aktif</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1.5 p-1.5 px-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-[9px]">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold min-w-0">
                <BellRing className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-bounce" />
                <span className="truncate">Notifikasi browser</span>
              </div>
              {onRequestPermission && (
                <button
                  onClick={onRequestPermission}
                  className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[8.5px] shadow-xs active:scale-95 cursor-pointer shrink-0 transition-all"
                >
                  Izinkan
                </button>
              )}
            </div>
          )}
        </div>

        {/* Real Notification List */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3.5 space-y-2.5 pb-5 overscroll-contain"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {notifications.length === 0 ? (
            <div className="text-center py-6 px-2 space-y-1.5">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-[11px] text-slate-800">Semua Indikator Stabil</h4>
              <p className="text-[9.5px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Tidak ada kenaikan harga signifikan dan seluruh parameter EWS terpantau kondusif.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isEws = item.source === 'ews';

              return (
                <div 
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.actionView);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-md active:scale-98 ${
                    isEws 
                      ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300' 
                      : 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isEws ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isEws ? <AlertTriangle className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      </div>
                      <div className="truncate">
                        <span className="text-[8px] font-bold uppercase tracking-wider block leading-none text-slate-400">
                          {item.title}
                        </span>
                        <h4 className="font-black text-[11px] text-slate-900 truncate mt-0.5">
                          {item.commodityName}
                        </h4>
                      </div>
                    </div>
                    
                    <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                      isEws 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {item.badge}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-[10px] text-slate-700 leading-snug font-medium">
                    {item.message}
                  </p>

                  {/* Action Link to Data Source Segment */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span className="text-[8px] text-slate-400 font-semibold">{item.time}</span>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 text-[8.5px] font-black transition-colors ${
                        isEws ? 'text-amber-800 hover:text-amber-900' : 'text-rose-800 hover:text-rose-900'
                      }`}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
