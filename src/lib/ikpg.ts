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
