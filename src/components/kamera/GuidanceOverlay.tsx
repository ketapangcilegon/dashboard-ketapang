"use client";

import React from 'react';

interface GuidanceOverlayProps {
  mode: 'pasokan_beras' | 'tanaman_pangan';
}

export default function GuidanceOverlay({ mode }: GuidanceOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-between p-6">
      {/* Top Guidance Header */}
      <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white text-[11px] font-bold shadow-lg text-center animate-in fade-in duration-300">
        {mode === 'pasokan_beras' ? (
          <span>🏪 Arahkan kamera ke plang toko atau tumpukan karung beras</span>
        ) : (
          <span>🌳 Posisikan pohon/rumpun tanaman di dalam bingkai</span>
        )}
      </div>

      {/* Center Framing Viewfinder */}
      <div className="relative w-[82%] max-w-[340px] aspect-[4/5] rounded-2xl border-2 border-dashed border-white/60 flex flex-col items-center justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]">
        {/* Corner Reticles */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

        {/* Level Horizon Crosshair */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-2 opacity-40">
          <div className="w-6 h-[1.5px] bg-emerald-400" />
          <div className="w-2 h-2 rounded-full border border-emerald-400" />
          <div className="w-6 h-[1.5px] bg-emerald-400" />
        </div>

        {/* Mode-specific Measurement Grid Guidelines */}
        {mode === 'tanaman_pangan' ? (
          <div className="w-full h-full flex flex-col justify-between py-4 opacity-50">
            <div className="flex justify-between items-center text-[9px] text-emerald-300 font-mono">
              <span>Tajuk / Daun</span>
              <span>[Max]</span>
            </div>
            <div className="border-t border-emerald-400/40 border-dotted w-full" />
            <div className="flex justify-between items-center text-[9px] text-emerald-300 font-mono">
              <span>Batang / Rumpun</span>
              <span>[Mid]</span>
            </div>
            <div className="border-t border-emerald-400/40 border-dotted w-full" />
            <div className="flex justify-between items-center text-[9px] text-emerald-300 font-mono">
              <span>Pangkal / Lahan</span>
              <span>[Base]</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between py-4 opacity-50">
            <div className="flex justify-between items-center text-[9px] text-amber-300 font-mono">
              <span>Plang Nama Toko</span>
            </div>
            <div className="border-t border-amber-400/40 border-dotted w-full" />
            <div className="flex justify-between items-center text-[9px] text-amber-300 font-mono">
              <span>Display / Karung Beras</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-white/80 text-[10px] font-medium drop-shadow-md text-center">
        Pencahayaan terang & stabil menghasilkan akurasi AI terbaik
      </div>
    </div>
  );
}
