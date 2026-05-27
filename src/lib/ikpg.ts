// Warna FSVA (6 prioritas)
export const FSVA_COLORS: Record<string, { fill: string; border: string }> = {
  sangat_rentan: { fill: '#d62828', border: '#9b1c1c' },
  rentan:        { fill: '#e76f51', border: '#c1440e' },
  agak_rentan:   { fill: '#f4a261', border: '#c97230' },
  agak_tahan:    { fill: '#a8dadc', border: '#6aacaf' },
  tahan:         { fill: '#57cc99', border: '#2d9e6b' },
  sangat_tahan:  { fill: '#2dc653', border: '#1a7a32' },
};

// Warna SKPG (3 kategori)
export const SKPG_COLORS: Record<string, { fill: string; border: string }> = {
  rentan:  { fill: '#d62828', border: '#9b1c1c' },
  waspada: { fill: '#fcbf49', border: '#c49200' },
  aman:    { fill: '#2dc653', border: '#1a7a32' },
};

// Warna Borda Desil (10 level)
export const BORDA_DESIL_COLORS: Record<number, { fill: string; border: string }> = {
  1:  { fill: '#7b0000', border: '#4a0000' },  // Sangat Prioritas
  2:  { fill: '#b71c1c', border: '#7f0000' },  // Prioritas Tinggi
  3:  { fill: '#d32f2f', border: '#9a0007' },  // Prioritas
  4:  { fill: '#e57373', border: '#c62828' },  // Prioritas Sedang
  5:  { fill: '#ef9a9a', border: '#d32f2f' },  // Perlu Perhatian
  6:  { fill: '#a5d6a7', border: '#66bb6a' },  // Cukup Tahan
  7:  { fill: '#66bb6a', border: '#388e3c' },  // Tahan
  8:  { fill: '#43a047', border: '#2e7d32' },  // Sangat Tahan
  9:  { fill: '#2e7d32', border: '#1b5e20' },  // Mandiri
  10: { fill: '#1b5e20', border: '#0d3b0d' },  // Sangat Mandiri
};

export const NO_DATA_COLOR = { fill: '#cccccc', border: '#999999' };

// Threshold FSVA (BKP standard)
export const getFSVACategory = (ikp: number) => {
  if (ikp < 46.37) return { p: 1, k: 'sangat_rentan' };
  if (ikp < 53.95) return { p: 2, k: 'rentan' };
  if (ikp < 61.83) return { p: 3, k: 'agak_rentan' };
  if (ikp < 69.71) return { p: 4, k: 'agak_tahan' };
  if (ikp < 77.29) return { p: 5, k: 'tahan' };
  return { p: 6, k: 'sangat_tahan' };
};

export const FSVA_LEGEND = [
  { color: '#d62828', label: 'P1 Sangat Rentan' },
  { color: '#e76f51', label: 'P2 Rentan' },
  { color: '#f4a261', label: 'P3 Agak Rentan' },
  { color: '#a8dadc', label: 'P4 Agak Tahan' },
  { color: '#57cc99', label: 'P5 Tahan' },
  { color: '#2dc653', label: 'P6 Sangat Tahan' },
];

export const SKPG_LEGEND = [
  { color: '#d62828', label: 'Rentan (>15%)' },
  { color: '#fcbf49', label: 'Waspada (10-15%)' },
  { color: '#2dc653', label: 'Aman (<10%)' },
];

export const BORDA_LEGEND = [
  { color: '#7b0000', label: 'D1 Sangat Prioritas' },
  { color: '#b71c1c', label: 'D2 Prioritas Tinggi' },
  { color: '#d32f2f', label: 'D3 Prioritas' },
  { color: '#e57373', label: 'D4 Prioritas Sedang' },
  { color: '#ef9a9a', label: 'D5 Perlu Perhatian' },
  { color: '#a5d6a7', label: 'D6 Cukup Tahan' },
  { color: '#66bb6a', label: 'D7 Tahan' },
  { color: '#43a047', label: 'D8 Sangat Tahan' },
  { color: '#2e7d32', label: 'D9 Mandiri' },
  { color: '#1b5e20', label: 'D10 Sangat Mandiri' },
];

