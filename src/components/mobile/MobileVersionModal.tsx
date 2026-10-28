"use client";

import React, { useEffect } from 'react';
import { Lightbulb, X, CheckCircle2, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { PLATFORM_CHANGELOG, VersionLog } from '@/lib/changelog';
import { APP_VERSION } from '@/lib/version';

interface MobileVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileVersionModal({ isOpen, onClose }: MobileVersionModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Kotak Teks Info Lampu Kuning */}
      <div 
        className="w-full max-w-lg bg-gradient-to-br from-amber-50 via-yellow-50/90 to-emerald-50 border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '88vh' }}
      >
        {/* Header Kotak Kuning */}
        <div className="bg-gradient-to-r from-amber-100/90 via-yellow-100 to-amber-50 border-b border-amber-300/80 px-4 py-3 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-sm">
              <Lightbulb className="w-4.5 h-4.5 fill-amber-950 text-amber-950" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-tight flex items-center gap-1.5 truncate">
                Riwayat Versi Platform PANCI
              </h3>
              <p className="text-[10px] text-amber-900 font-bold truncate">
                Versi Eksisting: <span className="font-mono text-emerald-800">v{APP_VERSION}</span> • Kaidah Standar SemVer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-black/5 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup Riwayat Versi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Penjelasan Kaidah Standar Versioning */}
        <div className="px-4 py-2 bg-amber-100/60 border-b border-amber-200/80 text-[10px] text-amber-950 flex items-center gap-2 shrink-0">
          <span className="font-black px-1.5 py-0.5 rounded-md bg-amber-200/90 text-amber-900 text-[9px] font-mono shrink-0">
            SemVer
          </span>
          <p className="leading-tight text-[9.5px]">
            <strong>Digit Pertama:</strong> Perbaikan/transformasi besar arsitektur. <strong>Digit Kedua:</strong> Peningkatan modul & penyempurnaan fitur.
          </p>
        </div>

        {/* Scrollable Changelog List */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 space-y-3.5 pr-2"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: '#F59E0B #FEF3C7'
          }}
        >
          {PLATFORM_CHANGELOG.map((log: VersionLog) => (
            <div 
              key={log.version}
              className={`p-3 rounded-2xl border transition-all ${
                log.isCurrent 
                  ? 'bg-white/95 border-emerald-400 shadow-sm ring-1 ring-emerald-200'
                  : 'bg-white/85 border-amber-200/90 shadow-2xs hover:border-amber-300'
              }`}
            >
              {/* Header Baris Versi */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                    log.isCurrent 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : log.type === 'major'
                      ? 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {log.version}
                  </span>

                  {log.isCurrent && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Eksisting
                    </span>
                  )}

                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border ${
                    log.type === 'major'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {log.typeLabel}
                  </span>
                </div>

                <span className="text-[9px] font-semibold text-slate-500 shrink-0">
                  {log.date}
                </span>
              </div>

              {/* Judul Rilis */}
              <h4 className="text-[11px] font-black text-slate-900 pt-1.5 leading-snug">
                {log.title}
              </h4>

              {/* Rincian Peningkatan */}
              <ul className="pt-1.5 space-y-1 text-[10px] text-slate-700">
                {log.changes.map((change, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">●</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Kotak Info */}
        <div className="bg-amber-100/70 border-t border-amber-200/90 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[9.5px] font-bold text-amber-900 truncate">
            {PLATFORM_CHANGELOG.length} Versi Terdokumentasi (v1.0 – v{APP_VERSION})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[10.5px] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
