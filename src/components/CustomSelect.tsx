"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (val: any) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'default';
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export default function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  icon,
  variant = 'emerald',
  disabled = false,
  searchable = true,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when pressing ESC or clicking outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Color theme logic
  const getThemeClasses = () => {
    if (variant === 'amber') {
      return {
        buttonBg: 'bg-amber-50/60 border-amber-300 hover:border-amber-400 text-amber-950 focus:ring-amber-500',
        activeBadge: 'bg-amber-500 text-white',
        radioActive: 'border-amber-500 bg-amber-500 text-white',
        itemActiveBg: 'bg-amber-50 text-amber-950 font-bold border-amber-200',
      };
    }
    if (variant === 'emerald') {
      return {
        buttonBg: 'bg-slate-50 border-slate-300 hover:border-emerald-400 text-slate-800 focus:ring-emerald-500',
        activeBadge: 'bg-emerald-600 text-white',
        radioActive: 'border-emerald-600 bg-emerald-600 text-white',
        itemActiveBg: 'bg-emerald-50/80 text-emerald-950 font-bold border-emerald-200',
      };
    }
    return {
      buttonBg: 'bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800 focus:ring-slate-500',
      activeBadge: 'bg-slate-700 text-white',
      radioActive: 'border-slate-700 bg-slate-700 text-white',
      itemActiveBg: 'bg-slate-100 text-slate-900 font-bold border-slate-200',
    };
  };

  const theme = getThemeClasses();

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center justify-between text-xs font-bold rounded-lg px-3 py-2 border transition-all cursor-pointer shadow-xs focus:ring-2 focus:outline-none ${
          disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : theme.buttonBg
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Professional Mobile & Desktop Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          {/* Backdrop Overlay Click to Close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* Modal Content Box - Constrained size so it NEVER fills full screen on mobile */}
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-sm max-h-[75vh] md:max-h-[60vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                {icon && <span className="text-emerald-600">{icon}</span>}
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                  {label ? label : 'Pilih Opsi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200/60 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input (If options > 5 or searchable) */}
            {searchable && options.length > 5 && (
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Radio Options List Container */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Tidak ada opsi yang cocok
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={String(opt.value)}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 border-transparent'
                          : isSelected
                          ? `${theme.itemActiveBg} shadow-xs`
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-xs truncate font-semibold pr-2">{opt.label}</span>

                      {/* Custom Professional Radio Button */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isSelected ? (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${theme.radioActive}`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white hover:border-slate-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
