// ================================================================
// KONSTANTA FSVA — Badan Pangan Nasional, Juknis No.301.2/2025
// ================================================================

// Bobot indikator (Tabel 3 Juknis) — total = 100
export const WEIGHTS = {
  ncpr:      9.5,
  energy:    8.0,
  protein:   8.0,
  cadangan:  8.0,
  poverty:   11.8,
  cv_harga:  11.3,
  pou:       9.9,
  sekolah:   6.5,
  air:       10.0,
  pph:       9.0,
  stunting:  8.0,
} as const

// Cut off komposit (Tabel 4 Juknis) — sudah fixed, tidak dihitung ulang
export const COMPOSITE_CUTOFF = {
  p1_max: 46.37,   // <46.37 = Prioritas 1 (Sangat rentan)
  p2_max: 53.95,   // 46.37–53.95 = Prioritas 2 (Rentan)
  p3_max: 61.83,   // 53.95–61.83 = Prioritas 3 (Agak rentan)
  p4_max: 69.71,   // 61.83–69.71 = Prioritas 4 (Agak tahan)
  p5_max: 77.29,   // 69.71–77.29 = Prioritas 5 (Tahan)
                   // >77.29      = Prioritas 6 (Sangat tahan)
}

// Range indikator individu (Tabel 2 Juknis)
// breaks: batas antara P1-P2, P2-P3, P3-P4, P4-P5, P5-P6
// inverse: true = nilai BESAR = lebih BURUK (rentan)
export const INDICATOR_RANGES = {
  ncpr:     { breaks: [0.50, 0.75, 1.00, 1.25, 1.50], inverse: true },
  energy:   { breaks: [70,   80,   90,   100,  110],  inverse: false },
  protein:  { breaks: [70,   80,   90,   100,  110],  inverse: false },
  cadangan: { breaks: [0.25, 0.38, 0.50, 0.63, 0.75], inverse: false },
  poverty:  { breaks: [10,   15,   20,   25,   30],   inverse: true },
  cv_harga: { breaks: [6,    7,    8,    9,    10],   inverse: true },
  pou:      { breaks: [5,    10,   15,   20,   25],   inverse: true },
  sekolah:  { breaks: [6.0,  6.5,  7.5,  8.5,  9.0], inverse: false },
  air:      { breaks: [30,   40,   50,   60,   70],   inverse: true },
  pph:      { breaks: [70,   75,   80,   85,   90],   inverse: false },
  stunting: { breaks: [20,   30,   40],               inverse: true, who: true },
  // stunting menggunakan 4 range (WHO), bukan 6
}

// Konversi GKG → Beras per Provinsi (Gambar 1 Juknis, Sumber BPS 2018)
export const GKG_CONVERSION: Record<string, number> = {
  'Papua Barat':        0.6670,
  'Kalimantan Tengah':  0.6594,
  'Kalimantan Utara':   0.6581,
  'Kep. Bangka Belitung': 0.6580,
  'Kalimantan Selatan': 0.6569,
  'Kalimantan Barat':   0.6568,
  'Sulawesi Tengah':    0.6553,
  'DKI Jakarta':        0.6544,
  'Nusa Tenggara Timur': 0.6503,
  'Kalimantan Timur':   0.6457,
  'Sumatera Barat':     0.6428,
  'Jambi':              0.6422,
  'Jawa Barat':         0.6411,
  'Jawa Timur':         0.6410,
  'Indonesia':          0.6402,
  'Aceh':               0.6395,
  'Bengkulu':           0.6394,
  'Jawa Tengah':        0.6384,
  'Lampung':            0.6382,
  'Sulawesi Barat':     0.6376,
  'Sumatera Selatan':   0.6375,
  'Sulawesi Tenggara':  0.6375,
  'Sulawesi Selatan':   0.6371,
  'Riau':               0.6371,
  'Sumatera Utara':     0.6368,
  'Kep. Riau':          0.6353,
  'Papua':              0.6339,
  'Banten':             0.6323,
  'Nusa Tenggara Barat': 0.6323,
  'DI Yogyakarta':      0.6306,
  'Bali':               0.6261,
  'Sulawesi Utara':     0.6238,
  'Maluku':             0.6217,
  'Maluku Utara':       0.6213,
  'Gorontalo':          0.6199,
}

// Konversi komoditas setara beras
export const COMMODITY_CONVERSION = {
  jagung:   0.92,
  ubi_kayu: 0.365,
  ubi_jalar: 0.260,
  sagu:     0.942,
  pisang:   0.135,
}

// Faktor susut/tercecer padi (Rumus 1-5 Juknis)
export const PADI_SUSUT = {
  benih:  0.0090,  // 0.90%
  pakan:  0.0044,  // 0.44%
  tercecer: 0.0492, // 4.92%
}
export const BERAS_SUSUT = {
  benih:   0.0000,  // 0%
  pakan:   0.0017,  // 0.17%
  tercecer: 0.0250, // 2.5%
}

// Faktor susut komoditas lain
export const KOMODITAS_SUSUT = {
  jagung:    { benih: 0.0035, pakan: 0.7633, tercecer: 0.0462 },
  ubi_kayu:  { benih: 0.0000, pakan: 0.0200, tercecer: 0.0004 },
  ubi_jalar: { benih: 0.0000, pakan: 0.0200, tercecer: 0.0005 },
  sagu:      { benih: 0.0000, pakan: 0.0000, tercecer: 0.0072 },
  pisang:    { benih: 0.0000, pakan: 0.0000, tercecer: 0.0111 },
}

// Konversi jagung JPK ke konsumsi (kadar air 28% → 14%)
export const JAGUNG_KONSUMSI_FACTOR = 0.7385

// Standar kebutuhan gizi (Permenkes No.28/2019 + Kesepakatan Tim FSVA)
export const NUTRITION_STANDARDS = {
  energi_kkal: 2100,       // kkal/kap/hari
  protein_hewani_gr: 25,   // gr/kap/hari
  konsumsi_normatif_gr: 300, // gram serealia/kap/hari
}

// Bobot CV harga (Rumus 20 Juknis)
export const CV_HARGA_WEIGHTS = {
  beras:  0.50,
  ayam:   0.15,
  telur:  0.20,
  minyak: 0.15,
}

// Label prioritas untuk UI
export const PRIORITY_LABELS = {
  1: { label: 'Sangat Rentan',  color: '#8B0000', fill: '#CC0000' },
  2: { label: 'Rentan',         color: '#CC3300', fill: '#FF6600' },
  3: { label: 'Agak Rentan',    color: '#CC7700', fill: '#FFAA00' },
  4: { label: 'Agak Tahan',     color: '#668800', fill: '#AACC00' },
  5: { label: 'Tahan',          color: '#336600', fill: '#55AA00' },
  6: { label: 'Sangat Tahan',   color: '#004400', fill: '#007700' },
}
