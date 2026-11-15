// Wilayah Data - Kecamatan dan Kelurahan Kota Cilegon
export const WILAYAH: Record<string, string[]> = {
  'Cibeber':    ['Cibeber','Kedaleman','Bulakan','Cikerai','Karang Asem','Kalitimbang'],
  'Cilegon':    ['Bagendung','Ciwedus','Bendungan','Ketileng','Ciwaduk'],
  'Pulo Merak': ['Tamansari','Lebakgede','Mekarsari','Suralaya'],
  'Ciwandan':   ['Banjar Negara','Tegal Ratu','Kubangsari','Gunung Sugih','Kepuh','Randakari'],
  'Jombang':    ['Sukmajaya','Jombang Wetan','Masigit','Panggung Rawi','Gedong Dalem'],
  'Gerogol':    ['Kotasari','Gerogol','Rawa Arum','Gerem'],
  'Purwakarta': ['Ramanuju','Kotabumi','Kebon Dalem','Purwakarta','Tegal Bunder','Pabean'],
  'Citangkil':  ['Warnasari','Deringo','Kebonsari','Taman Baru','Lebak Denok','Samangraya','Citangkil'],
};

export const KEL_TO_KEC: Record<string, string> = {};
Object.entries(WILAYAH).forEach(([kec, kels]) => {
  kels.forEach(k => { KEL_TO_KEC[k] = kec; });
});

export const ALL_KEL = Object.values(WILAYAH).flat().sort();
export const ALL_KEC = Object.keys(WILAYAH).sort();

function toKelurahanKey(name: string): string {
  const raw = name
    .replace(/^(kelurahan|kel\.?)\s+/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (raw === 'grogol' || raw === 'gerogol') return 'gerogol';
  if (raw === 'dringo' || raw === 'deringo') return 'deringo';
  return raw;
}

const KEY_TO_CANONICAL_KEL: Record<string, string> = {};
ALL_KEL.forEach((kel) => {
  KEY_TO_CANONICAL_KEL[toKelurahanKey(kel)] = kel;
});

export function normalizeKelurahanName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  const key = toKelurahanKey(trimmed);
  if (KEY_TO_CANONICAL_KEL[key]) {
    return KEY_TO_CANONICAL_KEL[key];
  }
  return trimmed;
}

export function isKelurahanMatch(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;
  return toKelurahanKey(name1) === toKelurahanKey(name2);
}

export function getKecamatanByKelurahan(kelName: string | null | undefined): string {
  if (!kelName) return 'Kota Cilegon';
  const clean = kelName.replace(/^kel\.?\s*/i, '').trim();
  const normalized = normalizeKelurahanName(clean);
  if (KEL_TO_KEC[normalized]) return KEL_TO_KEC[normalized];
  if (KEL_TO_KEC[clean]) return KEL_TO_KEC[clean];
  for (const [k, kec] of Object.entries(KEL_TO_KEC)) {
    if (k.toLowerCase() === clean.toLowerCase() || k.toLowerCase() === normalized.toLowerCase()) {
      return kec;
    }
  }
  return 'Kota Cilegon';
}
