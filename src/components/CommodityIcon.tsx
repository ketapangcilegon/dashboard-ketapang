import React from 'react';

interface CommodityIconProps {
  id?: string;
  name?: string;
  className?: string;
  size?: number;
}

/**
 * Custom Green Chili Pepper Icon (Cabe Rawit Hijau)
 * Styled with Noto Color Emoji aesthetics (bold outline, vibrant fill, shiny highlight)
 */
export function GreenChiliIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 drop-shadow-sm ${className}`}
      style={{ verticalAlign: '-0.15em' }}
    >
      <defs>
        <linearGradient id="greenChiliBody" x1="6" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="40%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id="greenChiliStem" x1="18" y1="3" x2="13" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>
      </defs>

      {/* Stem */}
      <path
        d="M20.5 4C20.5 4 19 6.5 16 7"
        stroke="url(#greenChiliStem)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Chili Body */}
      <path
        d="M17.5 7.5C21 8.5 25.5 12 25 18C24.5 23.5 19.5 28 13.5 28.5C11.5 28.6 9 27.5 7.5 26C6.5 25 6.8 23.8 8 23.2C10.5 22 13 19.5 14 16C15.2 12 14.5 9 13.5 7.5C14.5 7 16.5 7 17.5 7.5Z"
        fill="url(#greenChiliBody)"
        stroke="#0F2E1B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Calyx / Cap */}
      <path
        d="M13.5 7.5C14.5 9 16 9.5 18 8C19 9.5 20.5 9.5 21 8C20 10.5 17 11 15 10C13.5 10 13 8.5 13.5 7.5Z"
        fill="#166534"
        stroke="#0F2E1B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Highlight Shine */}
      <path
        d="M19 12C20.8 14 21.2 17 20.5 20"
        stroke="#BBF7D0"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Custom Stand-up Pouch Packaging Icon (Kemasan Pouch Tepung Terigu)
 * Styled with Noto Color Emoji aesthetics (bold outline, stand-up pouch shape, flour badge)
 */
export function PouchPackagingIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 drop-shadow-sm ${className}`}
      style={{ verticalAlign: '-0.15em' }}
    >
      <defs>
        <linearGradient id="pouchBodyGrad" x1="9" y1="9" x2="23" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="pouchHeaderGrad" x1="9" y1="4" x2="23" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      {/* Stand-up Pouch Gusset Bottom Base */}
      <ellipse
        cx="16"
        cy="26.5"
        rx="7"
        ry="2.2"
        fill="#CBD5E1"
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* Pouch Main Bag Body */}
      <path
        d="M9.5 9L8.2 24.5C8 26.5 11 27.5 16 27.5C21 27.5 24 26.5 23.8 24.5L22.5 9H9.5Z"
        fill="url(#pouchBodyGrad)"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Top Heat Seal Area */}
      <path
        d="M9 4.5H23C23.6 4.5 24 5 23.8 5.6L23.2 8.5C23.1 9 22.6 9.5 22 9.5H10C9.4 9.5 8.9 9 8.8 8.5L8.2 5.6C8 5 8.4 4.5 9 4.5Z"
        fill="url(#pouchHeaderGrad)"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Heat Seal Crimps / Zip Texture */}
      <line x1="10.5" y1="6.5" x2="21.5" y2="6.5" stroke="#94A3B8" strokeWidth="1" strokeDasharray="1.5 1" />

      {/* Left & Right Tear Notches */}
      <path d="M8.3 7.2L9.3 7.7L8.3 8.2" stroke="#1E293B" strokeWidth="1" fill="none" />
      <path d="M23.7 7.2L22.7 7.7L23.7 8.2" stroke="#1E293B" strokeWidth="1" fill="none" />

      {/* Flour Brand Label Banner on Pouch */}
      <rect x="11" y="13" width="10" height="7" rx="1.5" fill="#3B82F6" stroke="#1E293B" strokeWidth="1" />
      
      {/* Wheat / Flour Motif on Label */}
      <circle cx="16" cy="16.5" r="2.2" fill="#FDE047" />
      <path d="M14.5 16.5C15.5 15 16.5 15 17.5 16.5M16 14.5V18.5" stroke="#B45309" strokeWidth="0.8" strokeLinecap="round" />

      {/* Label Text Lines */}
      <rect x="12" y="21.5" width="8" height="1" rx="0.5" fill="#94A3B8" />
    </svg>
  );
}

/**
 * Universal Commodity Icon Component
 * Returns the exact emoji or custom SVG matching user directives
 */
export default function CommodityIcon({ id = '', name = '', className = '', size = 20 }: CommodityIconProps) {
  const normId = id.toLowerCase();
  const normName = name.toLowerCase();

  // 1. Cabe Rawit Hijau -> Green Chili Icon
  if (normId.includes('hijau') || normName.includes('hijau')) {
    return <GreenChiliIcon size={size} className={className} />;
  }

  // 2. Tepung Terigu -> Kemasan Pouch Icon
  if (normId.includes('tepung') || normName.includes('tepung') || normName.includes('terigu')) {
    return <PouchPackagingIcon size={size} className={className} />;
  }

  // 3. Other commodities with high-quality Noto Emoji
  let emoji = '📦';
  if (normId.includes('beras') || normName.includes('beras')) emoji = '🌾';
  else if (normId.includes('bawang_merah') || normName.includes('bawang merah')) emoji = '🧅';
  else if (normId.includes('bawang_putih') || normName.includes('bawang putih')) emoji = '🧄';
  else if (normId.includes('cabai') || normId.includes('cabe') || normName.includes('cabe') || normName.includes('cabai')) emoji = '🌶️';
  else if (normId.includes('sapi') || normName.includes('sapi')) emoji = '🥩';
  else if ((normId.includes('ayam') || normName.includes('ayam')) && !normId.includes('telur') && !normName.includes('telur')) emoji = '🐔';
  else if (normId.includes('telur') || normName.includes('telur')) emoji = '🥚';
  else if (normId.includes('gula') || normName.includes('gula')) emoji = '🍚';
  else if (normId.includes('minyak') || normName.includes('minyak')) emoji = '🧴';

  return (
    <span
      className={`inline-flex items-center justify-center leading-none select-none drop-shadow-sm shrink-0 ${className}`}
      style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
    >
      {emoji}
    </span>
  );
}
