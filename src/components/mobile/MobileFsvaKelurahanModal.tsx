"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ArrowUpDown, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';

export interface FsvaKelurahanItem {
  nama: string;
  kecamatan: string;
  ikp: number;
  prioritas: number;
}

export interface FsvaPriorityDef {
  p: number;
  code: string;
  title: string;
  color: string;
  bg: string;
  border: string;
  textCol: string;
  count: number;
}

interface MobileFsvaKelurahanModalProps {
  isOpen: boolean;
  onClose: () => void;
  priorityDef: FsvaPriorityDef | null;
  items: FsvaKelurahanItem[];
  onNavigateToMap?: () => void;
}

export default function MobileFsvaKelurahanModal({
  isOpen,
  onClose,
  priorityDef,
  items = [],
  onNavigateToMap,
}: MobileFsvaKelurahanModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Reset search when modal opens or priority changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSortDirection('desc');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, priorityDef?.p]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter & Sort list
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item => item.nama.toLowerCase().includes(q) || item.kecamatan.toLowerCase().includes(q)
      );
    }

    // Sort by IKP
    result.sort((a, b) => {
      if (sortDirection === 'desc') {
        return b.ikp - a.ikp;
      }
      return a.ikp - b.ikp;
    });

    return result;
  }, [items, searchQuery, sortDirection]);

  if (!isOpen || !priorityDef) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-[92%] sm:max-w-md max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-200/90">
        
        {/* Top Accent Handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Modal Header */}
        <div 
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ backgroundColor: priorityDef.bg, borderColor: priorityDef.border }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span 
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white" 
              style={{ backgroundColor: priorityDef.color }}
            />
            <div className="min-w-0">
              <h3 
                className="font-black text-xs sm:text-sm uppercase tracking-tight truncate leading-tight"
                style={{ color: priorityDef.textCol }}
              >
                Prioritas {priorityDef.p}: {priorityDef.title}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                Total {items.length} Kelurahan • Data Layer Peta FSVA 2025
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kelurahan / kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Toggle Button */}
          <button
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 font-black text-[10px] flex items-center gap-1 shrink-0 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Ubah urutan IKP"
          >
            <ArrowUpDown className="w-3 h-3 text-emerald-600" />
            <span>{sortDirection === 'desc' ? 'IKP ⬇' : 'IKP ⬆'}</span>
          </button>
        </div>

        {/* Kelurahan Table Container */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-400 space-y-1">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Tidak ada kelurahan ditemukan</p>
              <p className="text-[10px]">Coba kata kunci pencarian yang lain.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                    <th className="py-2 px-2.5 text-center w-9">No</th>
                    <th className="py-2 px-2.5">Kelurahan</th>
                    <th className="py-2 px-2.5">Kecamatan</th>
                    <th 
                      onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="py-2 px-2.5 text-right cursor-pointer hover:text-emerald-700 transition-colors select-none"
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Skor IKP
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-70" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredAndSortedItems.map((item, index) => (
                    <tr 
                      key={item.nama}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      {/* Rank Number */}
                      <td className="py-2 px-2.5 text-center font-bold text-slate-400 text-[10px]">
                        {index + 1}
                      </td>

                      {/* Nama Kelurahan */}
                      <td className="py-2 px-2.5 font-extrabold text-slate-900">
                        {item.nama}
                      </td>

                      {/* Kecamatan */}
                      <td className="py-2 px-2.5 text-slate-500 font-semibold text-[11px]">
                        {item.kecamatan}
                      </td>

                      {/* Skor IKP */}
                      <td className="py-2 px-2.5 text-right font-black">
                        <span 
                          className="inline-block px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-black"
                          style={{ backgroundColor: priorityDef.bg, color: priorityDef.textCol }}
                        >
                          {item.ikp.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-500">
            Menampilkan {filteredAndSortedItems.length} dari {items.length} kelurahan
          </span>
          {onNavigateToMap && (
            <button
              onClick={() => {
                onClose();
                onNavigateToMap();
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer transition-all shrink-0"
            >
              <span>Lihat di Peta GIS</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
