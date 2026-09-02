/**
 * thematic-indicators.ts
 * Engine pengolahan indikator tematik Choropleth & Legend Peta GIS Ketahanan Pangan Kota Cilegon.
 * Mendukung 6 Mode: Netral, IKP, Kepadatan Penduduk, FSVA, SKPG, dan Stunting.
 * Dilengkapi Robust Baseline & Placeholder Engine untuk mengantisipasi data yang belum diinput admin.
 */

export type ThematicMode = 'none' | 'ikp' | 'penduduk' | 'fsva' | 'skpg' | 'stunting';

export interface KelurahanThematicData {
  nama: string;
  kecamatan: string;
  penduduk: number;
  luasSawahHa: number;
  ikpScore?: number | null;
  fsvaPriority?: number | null; // 1 - 6
  skpgStatus?: 'aman' | 'waspada' | 'rentan' | null;
  stuntingPct?: number | null;
  isPlaceholder?: boolean;
}

export interface LegendItem {
  color: string;
  borderColor?: string;
  label: string;
  subLabel?: string;
}

export interface ThematicLegendConfig {
  title: string;
  subtitle: string;
  unit: string;
  items: LegendItem[];
}

// ────────────────────────────────────────────────────────────
// 1. DATA BASELINE RESMI 43 KELURAHAN KOTA CILEGON (2025)
// Berdasarkan data resmi DKPP, FSVA 2025, dan Dukcapil/BPS 2025
// Total Penduduk: 480.378 Jiwa | Total Sawah: 1.151,97 Ha
// ────────────────────────────────────────────────────────────
export const BASELINE_KELURAHAN_DATA: Record<string, KelurahanThematicData> = {
  // Kecamatan Cibeber (67.220 Jiwa, Sawah 181.16 Ha)
  'Bulakan':       { nama: 'Bulakan', kecamatan: 'Cibeber', penduduk: 6541, luasSawahHa: 16.53, ikpScore: 78.40, fsvaPriority: 6, skpgStatus: 'aman', stuntingPct: 4.2 },
  'Cibeber':       { nama: 'Cibeber', kecamatan: 'Cibeber', penduduk: 23331, luasSawahHa: 72.75, ikpScore: 75.10, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.1 },
  'Cikerai':       { nama: 'Cikerai', kecamatan: 'Cibeber', penduduk: 4498, luasSawahHa: 16.72, ikpScore: 71.30, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.8 },
  'Kalitimbang':   { nama: 'Kalitimbang', kecamatan: 'Cibeber', penduduk: 8694, luasSawahHa: 5.15, ikpScore: 68.20, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 6.3 },
  'Karang Asem':   { nama: 'Karang Asem', kecamatan: 'Cibeber', penduduk: 13460, luasSawahHa: 12.07, ikpScore: 73.50, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.4 },
  'Kedaleman':     { nama: 'Kedaleman', kecamatan: 'Cibeber', penduduk: 10696, luasSawahHa: 57.95, ikpScore: 76.90, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.5 },

  // Kecamatan Cilegon (54.711 Jiwa, Sawah 28.38 Ha)
  'Bagendung':     { nama: 'Bagendung', kecamatan: 'Cilegon', penduduk: 8895, luasSawahHa: 14.80, ikpScore: 64.10, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 8.2 },
  'Bendungan':     { nama: 'Bendungan', kecamatan: 'Cilegon', penduduk: 10980, luasSawahHa: 0.09, ikpScore: 72.40, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.9 },
  'Ciwaduk':       { nama: 'Ciwaduk', kecamatan: 'Cilegon', penduduk: 12794, luasSawahHa: 0.00, ikpScore: 74.80, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.6 },
  'Ciwedus':       { nama: 'Ciwedus', kecamatan: 'Cilegon', penduduk: 14198, luasSawahHa: 6.59, ikpScore: 70.90, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.7 },
  'Ketileng':      { nama: 'Ketileng', kecamatan: 'Cilegon', penduduk: 7844, luasSawahHa: 6.89, ikpScore: 69.50, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 6.8 },

  // Kecamatan Citangkil (87.885 Jiwa, Sawah 132.65 Ha)
  'Citangkil':     { nama: 'Citangkil', kecamatan: 'Citangkil', penduduk: 16751, luasSawahHa: 0.00, ikpScore: 71.80, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 6.2 },
  'Deringo':       { nama: 'Deringo', kecamatan: 'Citangkil', penduduk: 10465, luasSawahHa: 19.85, ikpScore: 73.10, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.5 },
  'Kebonsari':     { nama: 'Kebonsari', kecamatan: 'Citangkil', penduduk: 12218, luasSawahHa: 12.37, ikpScore: 70.20, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.8 },
  'Lebak Denok':   { nama: 'Lebak Denok', kecamatan: 'Citangkil', penduduk: 13322, luasSawahHa: 25.43, ikpScore: 74.60, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.9 },
  'Samangraya':    { nama: 'Samangraya', kecamatan: 'Citangkil', penduduk: 10697, luasSawahHa: 20.67, ikpScore: 72.50, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.2 },
  'Taman Baru':    { nama: 'Taman Baru', kecamatan: 'Citangkil', penduduk: 9930, luasSawahHa: 41.78, ikpScore: 76.20, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.7 },
  'Warnasari':     { nama: 'Warnasari', kecamatan: 'Citangkil', penduduk: 14502, luasSawahHa: 12.55, ikpScore: 71.40, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.6 },

  // Kecamatan Ciwandan (54.606 Jiwa, Sawah 266.41 Ha)
  'Banjar Negara': { nama: 'Banjar Negara', kecamatan: 'Ciwandan', penduduk: 8475, luasSawahHa: 31.79, ikpScore: 68.90, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 7.1 },
  'Gunung Sugih':  { nama: 'Gunung Sugih', kecamatan: 'Ciwandan', penduduk: 6740, luasSawahHa: 15.27, ikpScore: 72.26, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.2 },
  'Kepuh':         { nama: 'Kepuh', kecamatan: 'Ciwandan', penduduk: 9326, luasSawahHa: 57.24, ikpScore: 69.73, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.8 },
  'Kubangsari':    { nama: 'Kubangsari', kecamatan: 'Ciwandan', penduduk: 8233, luasSawahHa: 39.70, ikpScore: 71.10, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 6.0 },
  'Randakari':     { nama: 'Randakari', kecamatan: 'Ciwandan', penduduk: 9845, luasSawahHa: 40.35, ikpScore: 73.80, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.3 },
  'Tegal Ratu':    { nama: 'Tegal Ratu', kecamatan: 'Ciwandan', penduduk: 11987, luasSawahHa: 82.05, ikpScore: 75.40, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.9 },

  // Kecamatan Gerogol (46.910 Jiwa, Sawah 99.00 Ha)
  'Gerem':         { nama: 'Gerem', kecamatan: 'Gerogol', penduduk: 15753, luasSawahHa: 28.97, ikpScore: 67.50, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 7.5 },
  'Gerogol':       { nama: 'Gerogol', kecamatan: 'Gerogol', penduduk: 5040, luasSawahHa: 41.87, ikpScore: 77.10, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.1 },
  'Kotasari':      { nama: 'Kotasari', kecamatan: 'Gerogol', penduduk: 9632, luasSawahHa: 5.60, ikpScore: 72.00, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.6 },
  'Rawa Arum':     { nama: 'Rawa Arum', kecamatan: 'Gerogol', penduduk: 16485, luasSawahHa: 22.56, ikpScore: 69.10, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 6.9 },

  // Kecamatan Jombang (73.046 Jiwa, Sawah 229.40 Ha)
  'Gedong Dalem':  { nama: 'Gedong Dalem', kecamatan: 'Jombang', penduduk: 9038, luasSawahHa: 62.13, ikpScore: 76.50, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.4 },
  'Jombang Wetan': { nama: 'Jombang Wetan', kecamatan: 'Jombang', penduduk: 22265, luasSawahHa: 0.05, ikpScore: 71.90, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.5 },
  'Masigit':       { nama: 'Masigit', kecamatan: 'Jombang', penduduk: 15798, luasSawahHa: 6.45, ikpScore: 73.20, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.2 },
  'Panggung Rawi': { nama: 'Panggung Rawi', kecamatan: 'Jombang', penduduk: 11372, luasSawahHa: 102.85, ikpScore: 79.20, fsvaPriority: 6, skpgStatus: 'aman', stuntingPct: 3.8 },
  'Sukmajaya':     { nama: 'Sukmajaya', kecamatan: 'Jombang', penduduk: 14573, luasSawahHa: 57.93, ikpScore: 75.80, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.6 },

  // Kecamatan Pulo Merak (51.300 Jiwa, Sawah 13.60 Ha)
  'Lebakgede':     { nama: 'Lebakgede', kecamatan: 'Pulo Merak', penduduk: 14203, luasSawahHa: 13.60, ikpScore: 66.80, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 7.9 },
  'Mekarsari':     { nama: 'Mekarsari', kecamatan: 'Pulo Merak', penduduk: 13679, luasSawahHa: 0.00, ikpScore: 68.40, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 7.2 },
  'Suralaya':      { nama: 'Suralaya', kecamatan: 'Pulo Merak', penduduk: 7306, luasSawahHa: 0.00, ikpScore: 69.90, fsvaPriority: 4, skpgStatus: 'waspada', stuntingPct: 6.5 },
  'Tamansari':     { nama: 'Tamansari', kecamatan: 'Pulo Merak', penduduk: 16112, luasSawahHa: 0.00, ikpScore: 70.50, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.8 },

  // Kecamatan Purwakarta (44.700 Jiwa, Sawah 201.36 Ha)
  'Kebon Dalem':   { nama: 'Kebon Dalem', kecamatan: 'Purwakarta', penduduk: 15996, luasSawahHa: 6.33, ikpScore: 71.20, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.7 },
  'Kotabumi':      { nama: 'Kotabumi', kecamatan: 'Purwakarta', penduduk: 9278, luasSawahHa: 0.00, ikpScore: 73.60, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 5.0 },
  'Pabean':        { nama: 'Pabean', kecamatan: 'Purwakarta', penduduk: 3921, luasSawahHa: 58.93, ikpScore: 77.80, fsvaPriority: 6, skpgStatus: 'aman', stuntingPct: 3.9 },
  'Purwakarta':    { nama: 'Purwakarta', kecamatan: 'Purwakarta', penduduk: 7489, luasSawahHa: 75.95, ikpScore: 78.10, fsvaPriority: 6, skpgStatus: 'aman', stuntingPct: 4.0 },
  'Ramanuju':      { nama: 'Ramanuju', kecamatan: 'Purwakarta', penduduk: 2100, luasSawahHa: 0.95, ikpScore: 74.00, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.5 },
  'Tegal Bunder':  { nama: 'Tegal Bunder', kecamatan: 'Purwakarta', penduduk: 5916, luasSawahHa: 59.21, ikpScore: 76.80, fsvaPriority: 5, skpgStatus: 'aman', stuntingPct: 4.3 },
};

// ────────────────────────────────────────────────────────────
// 2. PALET WARNA THEMATIC CHOROPLETH
// ────────────────────────────────────────────────────────────

export const THEMATIC_COLORS = {
  // Mode Netral (Garis Batas Halus, Transparan - Fokus Satelit)
  neutral: { fill: 'transparent', border: '#f59e0b', weight: 1.5, dashArray: '4,3' },

  // Placeholder / Data Belum Diinput Admin (Abu-abu Netral Lembut)
  placeholder: { fill: '#94a3b8', border: '#64748b', weight: 1.5, dashArray: '3,3' },

  // IKP (6 Kelas: Hijau Tua ke Merah Gelap)
  ikp: {
    sangat_tahan:  { fill: '#15803d', border: '#166534', label: 'Sangat Tahan (≥ 77.3)' },
    tahan:         { fill: '#22c55e', border: '#15803d', label: 'Tahan (69.7 - 77.2)' },
    agak_tahan:    { fill: '#84cc16', border: '#65a30d', label: 'Agak Tahan (61.8 - 69.6)' },
    agak_rentan:   { fill: '#f59e0b', border: '#d97706', label: 'Agak Rentan (54.0 - 61.7)' },
    rentan:        { fill: '#f97316', border: '#c2410c', label: 'Rentan (46.4 - 53.9)' },
    sangat_rentan: { fill: '#ef4444', border: '#b91c1c', label: 'Sangat Rentan (< 46.4)' },
  },

  // Kepadatan Penduduk (4 Kuantil)
  penduduk: {
    rendah:       { fill: '#bfdbfe', border: '#93c5fd', label: '< 7.500 Jiwa (Rendah)' },
    sedang:       { fill: '#60a5fa', border: '#3b82f6', label: '7.500 – 12.500 Jiwa (Sedang)' },
    tinggi:       { fill: '#2563eb', border: '#1d4ed8', label: '12.501 – 18.000 Jiwa (Tinggi)' },
    sangat_padat: { fill: '#1e3a8a', border: '#172554', label: '> 18.000 Jiwa (Sangat Padat)' },
  },

  // FSVA 6 Prioritas (Bapanas Standard)
  fsva: {
    p1: { fill: '#7f1d1d', border: '#450a0a', label: 'Prioritas 1 (Sangat Rentan)' },
    p2: { fill: '#dc2626', border: '#991b1b', label: 'Prioritas 2 (Rentan)' },
    p3: { fill: '#f87171', border: '#ef4444', label: 'Prioritas 3 (Agak Rentan)' },
    p4: { fill: '#fde047', border: '#eab308', label: 'Prioritas 4 (Agak Tahan)' },
    p5: { fill: '#86efac', border: '#4ade80', label: 'Prioritas 5 (Tahan)' },
    p6: { fill: '#15803d', border: '#166534', label: 'Prioritas 6 (Sangat Tahan)' },
  },

  // SKPG (3 Status)
  skpg: {
    aman:    { fill: '#16a34a', border: '#15803d', label: 'Aman (Kasus < 10%)' },
    waspada: { fill: '#eab308', border: '#ca8a04', label: 'Waspada (10% - 15%)' },
    rentan:  { fill: '#dc2626', border: '#b91c1c', label: 'Rentan (> 15%)' },
  },

  // Stunting Balita
  stunting: {
    rendah:  { fill: '#10b981', border: '#059669', label: 'Rendah (< 5.0%)' },
    sedang:  { fill: '#f59e0b', border: '#d97706', label: 'Sedang (5.0% - 7.5%)' },
    tinggi:  { fill: '#ef4444', border: '#b91c1c', label: 'Waspada / Tinggi (> 7.5%)' },
  },
};

// ────────────────────────────────────────────────────────────
// 3. FUNGSI RESOLUSI DATA DENGAN SISTEM PLACEHOLDER KUAT
// ────────────────────────────────────────────────────────────

export function resolveKelurahanData(
  rawName: string,
  supabaseData?: {
    fsvaMatang?: any[];
    skpgMatang?: any[];
    giziBalita?: any[];
  }
): KelurahanThematicData {
  const cleanName = (rawName || '').replace(/^Kelurahan\s+|^Kecamatan\s+/i, '').trim();

  // 1. Cek Baseline Terverifikasi
  let record = BASELINE_KELURAHAN_DATA[cleanName];

  // Jika nama tidak ada persis, cari case-insensitive
  if (!record) {
    const foundKey = Object.keys(BASELINE_KELURAHAN_DATA).find(
      k => k.toLowerCase() === cleanName.toLowerCase()
    );
    if (foundKey) {
      record = BASELINE_KELURAHAN_DATA[foundKey];
    }
  }

  // Jika kelurahan benar-benar baru dan belum ada di baseline (Placeholder State)
  if (!record) {
    record = {
      nama: cleanName,
      kecamatan: 'Kota Cilegon',
      penduduk: 0,
      luasSawahHa: 0,
      ikpScore: null,
      fsvaPriority: null,
      skpgStatus: null,
      stuntingPct: null,
      isPlaceholder: true,
    };
  } else {
    // Clone agar aman dari mutasi
    record = { ...record, isPlaceholder: false };
  }

  // 2. Overwrite / Inject dengan Data Riil Supabase jika Admin sudah menginput
  if (supabaseData?.fsvaMatang?.length) {
    const fsvaRow = supabaseData.fsvaMatang.find((r: any) => {
      const rn = (r.nama_kelurahan || r.kelurahan || '').replace(/^Kelurahan\s+/i, '').trim().toLowerCase();
      return rn === cleanName.toLowerCase();
    });

    if (fsvaRow) {
      if (typeof fsvaRow.ikp === 'number' || !isNaN(parseFloat(fsvaRow.ikp))) {
        record.ikpScore = parseFloat(fsvaRow.ikp);
        record.isPlaceholder = false;
      }
      if (typeof fsvaRow.stunting === 'number' || !isNaN(parseFloat(fsvaRow.stunting))) {
        record.stuntingPct = parseFloat(fsvaRow.stunting);
      }
      if (typeof fsvaRow.rank === 'number') {
        if (record.ikpScore !== null && record.ikpScore !== undefined) {
          if (record.ikpScore >= 77.29) record.fsvaPriority = 6;
          else if (record.ikpScore >= 69.71) record.fsvaPriority = 5;
          else if (record.ikpScore >= 61.83) record.fsvaPriority = 4;
          else if (record.ikpScore >= 53.95) record.fsvaPriority = 3;
          else if (record.ikpScore >= 46.37) record.fsvaPriority = 2;
          else record.fsvaPriority = 1;
        }
      }
    }
  }

  return record;
}

// ────────────────────────────────────────────────────────────
// 4. GENERATOR STYLE CHOROPLETH POLIGON LEAFLET
// ────────────────────────────────────────────────────────────

export function getThematicPolygonStyle(
  featureName: string,
  mode: ThematicMode,
  opacity: number = 0.65,
  supabaseData?: {
    fsvaMatang?: any[];
    skpgMatang?: any[];
    giziBalita?: any[];
  }
): {
  color: string;
  weight: number;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
  isPlaceholder?: boolean;
} {
  // Mode Netral: Transparan fokus satelit
  if (mode === 'none') {
    return {
      color: THEMATIC_COLORS.neutral.border,
      weight: THEMATIC_COLORS.neutral.weight,
      fillColor: 'transparent',
      fillOpacity: 0,
      dashArray: THEMATIC_COLORS.neutral.dashArray,
      isPlaceholder: false,
    };
  }

  const data = resolveKelurahanData(featureName, supabaseData);

  // Jika indikator belum diinput sama sekali di database & baseline (Placeholder)
  let isMissing = false;
  if (mode === 'ikp' && (data.ikpScore === null || data.ikpScore === undefined)) isMissing = true;
  if (mode === 'penduduk' && (!data.penduduk || data.penduduk === 0)) isMissing = true;
  if (mode === 'fsva' && !data.fsvaPriority) isMissing = true;
  if (mode === 'skpg' && !data.skpgStatus) isMissing = true;
  if (mode === 'stunting' && (data.stuntingPct === null || data.stuntingPct === undefined)) isMissing = true;

  if (isMissing || data.isPlaceholder) {
    return {
      color: THEMATIC_COLORS.placeholder.border,
      weight: THEMATIC_COLORS.placeholder.weight,
      fillColor: THEMATIC_COLORS.placeholder.fill,
      fillOpacity: Math.min(opacity, 0.45),
      dashArray: THEMATIC_COLORS.placeholder.dashArray,
      isPlaceholder: true,
    };
  }

  // 1. Mode IKP
  if (mode === 'ikp') {
    const score = data.ikpScore || 0;
    let cfg = THEMATIC_COLORS.ikp.sangat_tahan;
    if (score < 46.37) cfg = THEMATIC_COLORS.ikp.sangat_rentan;
    else if (score < 53.95) cfg = THEMATIC_COLORS.ikp.rentan;
    else if (score < 61.83) cfg = THEMATIC_COLORS.ikp.agak_rentan;
    else if (score < 69.71) cfg = THEMATIC_COLORS.ikp.agak_tahan;
    else if (score < 77.29) cfg = THEMATIC_COLORS.ikp.tahan;

    return {
      color: cfg.border,
      weight: 1.5,
      fillColor: cfg.fill,
      fillOpacity: opacity,
      isPlaceholder: false,
    };
  }

  // 2. Mode Kepadatan Penduduk
  if (mode === 'penduduk') {
    const p = data.penduduk;
    let cfg = THEMATIC_COLORS.penduduk.rendah;
    if (p > 18000) cfg = THEMATIC_COLORS.penduduk.sangat_padat;
    else if (p > 12500) cfg = THEMATIC_COLORS.penduduk.tinggi;
    else if (p >= 7500) cfg = THEMATIC_COLORS.penduduk.sedang;

    return {
      color: cfg.border,
      weight: 1.5,
      fillColor: cfg.fill,
      fillOpacity: opacity,
      isPlaceholder: false,
    };
  }

  // 3. Mode FSVA
  if (mode === 'fsva') {
    const pr = data.fsvaPriority || 6;
    let cfg = THEMATIC_COLORS.fsva.p6;
    if (pr === 1) cfg = THEMATIC_COLORS.fsva.p1;
    else if (pr === 2) cfg = THEMATIC_COLORS.fsva.p2;
    else if (pr === 3) cfg = THEMATIC_COLORS.fsva.p3;
    else if (pr === 4) cfg = THEMATIC_COLORS.fsva.p4;
    else if (pr === 5) cfg = THEMATIC_COLORS.fsva.p5;

    return {
      color: cfg.border,
      weight: 1.5,
      fillColor: cfg.fill,
      fillOpacity: opacity,
      isPlaceholder: false,
    };
  }

  // 4. Mode SKPG
  if (mode === 'skpg') {
    const st = data.skpgStatus || 'aman';
    let cfg = THEMATIC_COLORS.skpg.aman;
    if (st === 'rentan') cfg = THEMATIC_COLORS.skpg.rentan;
    else if (st === 'waspada') cfg = THEMATIC_COLORS.skpg.waspada;

    return {
      color: cfg.border,
      weight: 1.5,
      fillColor: cfg.fill,
      fillOpacity: opacity,
      isPlaceholder: false,
    };
  }

  // 5. Mode Stunting
  if (mode === 'stunting') {
    const st = data.stuntingPct || 0;
    let cfg = THEMATIC_COLORS.stunting.rendah;
    if (st > 7.5) cfg = THEMATIC_COLORS.stunting.tinggi;
    else if (st >= 5.0) cfg = THEMATIC_COLORS.stunting.sedang;

    return {
      color: cfg.border,
      weight: 1.5,
      fillColor: cfg.fill,
      fillOpacity: opacity,
      isPlaceholder: false,
    };
  }

  return {
    color: THEMATIC_COLORS.neutral.border,
    weight: THEMATIC_COLORS.neutral.weight,
    fillColor: 'transparent',
    fillOpacity: 0,
    isPlaceholder: false,
  };
}

// ────────────────────────────────────────────────────────────
// 5. KONFIGURASI LEGENDA DINAMIS ADAPTIF
// ────────────────────────────────────────────────────────────

export function getThematicLegendConfig(mode: ThematicMode): ThematicLegendConfig | null {
  if (mode === 'none') return null;

  if (mode === 'ikp') {
    return {
      title: 'Indeks Ketahanan Pangan (IKP)',
      subtitle: 'Standar Badan Pangan Nasional',
      unit: 'Skor Komposit IKP',
      items: [
        { color: THEMATIC_COLORS.ikp.sangat_tahan.fill, borderColor: THEMATIC_COLORS.ikp.sangat_tahan.border, label: 'Sangat Tahan', subLabel: '≥ 77.29' },
        { color: THEMATIC_COLORS.ikp.tahan.fill, borderColor: THEMATIC_COLORS.ikp.tahan.border, label: 'Tahan', subLabel: '69.71 – 77.28' },
        { color: THEMATIC_COLORS.ikp.agak_tahan.fill, borderColor: THEMATIC_COLORS.ikp.agak_tahan.border, label: 'Agak Tahan', subLabel: '61.83 – 69.70' },
        { color: THEMATIC_COLORS.ikp.agak_rentan.fill, borderColor: THEMATIC_COLORS.ikp.agak_rentan.border, label: 'Agak Rentan', subLabel: '53.95 – 61.82' },
        { color: THEMATIC_COLORS.ikp.rentan.fill, borderColor: THEMATIC_COLORS.ikp.rentan.border, label: 'Rentan', subLabel: '46.37 – 53.94' },
        { color: THEMATIC_COLORS.ikp.sangat_rentan.fill, borderColor: THEMATIC_COLORS.ikp.sangat_rentan.border, label: 'Sangat Rentan', subLabel: '< 46.37' },
        { color: THEMATIC_COLORS.placeholder.fill, borderColor: THEMATIC_COLORS.placeholder.border, label: 'Placeholder / Siap Input', subLabel: 'Data Belum Tersedia' },
      ],
    };
  }

  if (mode === 'penduduk') {
    return {
      title: 'Jumlah & Kepadatan Penduduk',
      subtitle: 'Dukcapil / FSVA 2025 (Total: 480.378 Jiwa)',
      unit: 'Jiwa / Kelurahan',
      items: [
        { color: THEMATIC_COLORS.penduduk.sangat_padat.fill, borderColor: THEMATIC_COLORS.penduduk.sangat_padat.border, label: 'Sangat Padat', subLabel: '> 18.000 Jiwa' },
        { color: THEMATIC_COLORS.penduduk.tinggi.fill, borderColor: THEMATIC_COLORS.penduduk.tinggi.border, label: 'Tinggi', subLabel: '12.501 – 18.000 Jiwa' },
        { color: THEMATIC_COLORS.penduduk.sedang.fill, borderColor: THEMATIC_COLORS.penduduk.sedang.border, label: 'Sedang', subLabel: '7.500 – 12.500 Jiwa' },
        { color: THEMATIC_COLORS.penduduk.rendah.fill, borderColor: THEMATIC_COLORS.penduduk.rendah.border, label: 'Rendah', subLabel: '< 7.500 Jiwa' },
        { color: THEMATIC_COLORS.placeholder.fill, borderColor: THEMATIC_COLORS.placeholder.border, label: 'Placeholder', subLabel: '0 / Belum Terdata' },
      ],
    };
  }

  if (mode === 'fsva') {
    return {
      title: 'Prioritas Kerentanan FSVA',
      subtitle: 'Peta Ketahanan & Kerentanan Pangan',
      unit: 'Tingkat Prioritas (P1–P6)',
      items: [
        { color: THEMATIC_COLORS.fsva.p1.fill, borderColor: THEMATIC_COLORS.fsva.p1.border, label: 'P1 Sangat Rentan', subLabel: 'Prioritas Utama' },
        { color: THEMATIC_COLORS.fsva.p2.fill, borderColor: THEMATIC_COLORS.fsva.p2.border, label: 'P2 Rentan', subLabel: 'Prioritas Tinggi' },
        { color: THEMATIC_COLORS.fsva.p3.fill, borderColor: THEMATIC_COLORS.fsva.p3.border, label: 'P3 Agak Rentan', subLabel: 'Prioritas Sedang' },
        { color: THEMATIC_COLORS.fsva.p4.fill, borderColor: THEMATIC_COLORS.fsva.p4.border, label: 'P4 Agak Tahan', subLabel: 'Cukup Aman' },
        { color: THEMATIC_COLORS.fsva.p5.fill, borderColor: THEMATIC_COLORS.fsva.p5.border, label: 'P5 Tahan', subLabel: 'Kondisi Tahan' },
        { color: THEMATIC_COLORS.fsva.p6.fill, borderColor: THEMATIC_COLORS.fsva.p6.border, label: 'P6 Sangat Tahan', subLabel: 'Mandiri Pangan' },
        { color: THEMATIC_COLORS.placeholder.fill, borderColor: THEMATIC_COLORS.placeholder.border, label: 'Placeholder', subLabel: 'Menunggu Data' },
      ],
    };
  }

  if (mode === 'skpg') {
    return {
      title: 'Status Kerawanan SKPG',
      subtitle: 'Sistem Kewaspadaan Pangan & Gizi Bulanan',
      unit: 'Status Kewaspadaan',
      items: [
        { color: THEMATIC_COLORS.skpg.aman.fill, borderColor: THEMATIC_COLORS.skpg.aman.border, label: 'Aman', subLabel: 'Kasus Kerawanan < 10%' },
        { color: THEMATIC_COLORS.skpg.waspada.fill, borderColor: THEMATIC_COLORS.skpg.waspada.border, label: 'Waspada', subLabel: 'Kasus Kerawanan 10% – 15%' },
        { color: THEMATIC_COLORS.skpg.rentan.fill, borderColor: THEMATIC_COLORS.skpg.rentan.border, label: 'Rentan', subLabel: 'Kasus Kerawanan > 15%' },
        { color: THEMATIC_COLORS.placeholder.fill, borderColor: THEMATIC_COLORS.placeholder.border, label: 'Placeholder', subLabel: 'Data Siap Input' },
      ],
    };
  }

  if (mode === 'stunting') {
    return {
      title: 'Prevalensi Stunting & Gizi Balita',
      subtitle: 'Indikator Pemanfaatan Pangan Posyandu',
      unit: 'Persentase Kasus (%)',
      items: [
        { color: THEMATIC_COLORS.stunting.rendah.fill, borderColor: THEMATIC_COLORS.stunting.rendah.border, label: 'Rendah', subLabel: '< 5.0%' },
        { color: THEMATIC_COLORS.stunting.sedang.fill, borderColor: THEMATIC_COLORS.stunting.sedang.border, label: 'Sedang', subLabel: '5.0% – 7.5%' },
        { color: THEMATIC_COLORS.stunting.tinggi.fill, borderColor: THEMATIC_COLORS.stunting.tinggi.border, label: 'Waspada / Tinggi', subLabel: '> 7.5%' },
        { color: THEMATIC_COLORS.placeholder.fill, borderColor: THEMATIC_COLORS.placeholder.border, label: 'Placeholder', subLabel: 'Menunggu Input Admin' },
      ],
    };
  }

  return null;
}
