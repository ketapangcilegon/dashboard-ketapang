// Wilayah Data - Kecamatan dan Kelurahan Kota Cilegon
export const WILAYAH: Record<string, string[]> = {
  'Cibeber':    ['Cibeber','Kedaleman','Bulakan','Cikerai','Karang Asem','Kalitimbang'],
  'Cilegon':    ['Bagendung','Ciwedus','Bendungan','Ketileng','Ciwaduk'],
  'Pulo Merak': ['Tamansari','Lebakgede','Mekarsari','Suralaya'],
  'Ciwandan':   ['Banjar Negara','Tegal Ratu','Kubangsari','Gunung Sugih','Kepuh','Randakari'],
  'Jombang':    ['Sukmajaya','Jombang Wetan','Masigit','Panggung Rawi','Gedong Dalem'],
  'Gerogol':    ['Kotasari','Gerogol','Grogol','Rawa Arum','Gerem'],
  'Purwakarta': ['Ramanuju','Kotabumi','Kebon Dalem','Purwakarta','Tegal Bunder','Pabean'],
  'Citangkil':  ['Warnasari','Deringo','Dringo','Kebonsari','Taman Baru','Lebak Denok','Samangraya','Citangkil'],
};

export const KEL_TO_KEC: Record<string, string> = {};
Object.entries(WILAYAH).forEach(([kec, kels]) => {
  kels.forEach(k => { KEL_TO_KEC[k] = kec; });
});

export const ALL_KEL = Object.values(WILAYAH).flat().sort();
export const ALL_KEC = Object.keys(WILAYAH).sort();

export function normalizeKelurahanName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'grogol' || lower === 'gerogol') return 'Gerogol';
  if (lower === 'dringo' || lower === 'deringo') return 'Deringo';

  return trimmed;
}

export function isKelurahanMatch(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;
  
  const n1 = normalizeKelurahanName(name1).toLowerCase();
  const n2 = normalizeKelurahanName(name2).toLowerCase();
  
  return n1 === n2;
}
