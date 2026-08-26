/**
 * Kamera Cerdas — Parameter Normatif, Kategori Sarana Distribusi & Geocoding Cilegon
 */

import { WILAYAH, KEL_TO_KEC } from '@/lib/wilayah';

// ============================================================
// 1. KATEGORI SARANA DISTRIBUSI BERAS
// ============================================================
export interface SaranaDistribusiConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  deskripsi: string;
}

export const SARANA_DISTRIBUSI_LIST: SaranaDistribusiConfig[] = [
  { id: 'toko_beras', label: 'Toko Beras Khusus', icon: '🏪', color: '#16a34a', deskripsi: 'Kios/toko spesialis menjual aneka jenis beras' },
  { id: 'warung_madura', label: 'Warung Madura / 24 Jam', icon: '🏪', color: '#dc2626', deskripsi: 'Warung kelontong 24 jam dengan display karung/literan beras' },
  { id: 'distributor_agen', label: 'Distributor / Agen Beras', icon: '🏬', color: '#2563eb', deskripsi: 'Pusat grosir/distribusi beras kapasitas menengah-besar' },
  { id: 'minimarket', label: 'Minimarket (Indomaret/Alfamart/dll)', icon: '🛒', color: '#0284c7', deskripsi: 'Retail modern dengan beras kemasan 2.5kg - 5kg' },
  { id: 'warung_kelontong', label: 'Warung Kelontong / Toko Sembako', icon: '🏡', color: '#d97706', deskripsi: 'Warung sembako warga sekitar pemukiman' },
  { id: 'supermarket', label: 'Supermarket / Hypermarket', icon: '🛍️', color: '#7c3aed', deskripsi: 'Pasar swalayan modern skala besar' },
  { id: 'pasar_tradisional', label: 'Kios Pasar Tradisional', icon: '🧺', color: '#059669', deskripsi: 'Kios beras di dalam pasar (Kranggot, Merak, Blok F, dll)' },
  { id: 'gudang_beras', label: 'Gudang Penyimpanan Beras', icon: '🏭', color: '#475569', deskripsi: 'Gudang logistik/stok beras' },
  { id: 'toko_sayur', label: 'Toko Sayur & Pangan', icon: '🥬', color: '#65a30d', deskripsi: 'Toko penjual sayuran yang juga menyediakan beras' },
  { id: 'lainnya', label: 'Sarana Distribusi Lainnya', icon: '📍', color: '#64748b', deskripsi: 'Sarana distribusi beras lainnya' },
];

export const ASAL_PASOKAN_OPTIONS = [
  'Kota Cilegon (Lokal)',
  'Kabupaten Serang (Banten)',
  'Kabupaten Pandeglang (Banten)',
  'Kabupaten Lebak (Banten)',
  'Kabupaten Tangerang / Karawang (Jawa Barat)',
  'Jawa Tengah / Demak / Sragen',
  'Jawa Timur / Ngawi',
  'Lampung / Luar Jawa',
  'Bulog / Cadangan Pangan Pemerintah',
  'Tidak Diketahui / Campuran'
];

// ============================================================
// 2. PARAMETER NORMATIF TANAMAN PANGAN SUMBER KARBOHIDRAT
// ============================================================
export interface TanamanPanganConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  produktivitas_ha_kg: number; // kg per hektar per musim
  produktivitas_pohon_kg: number; // kg per pohon/rumpun per tahun/panen
  satuan_utama: 'ha' | 'pohon' | 'm2';
  umur_panen_hari: number;
  deskripsi: string;
}

export const TANAMAN_PANGAN_LIST: TanamanPanganConfig[] = [
  {
    id: 'sukun',
    label: 'Pohon Sukun (Artocarpus altilis)',
    icon: '🌳',
    color: '#15803d',
    produktivitas_ha_kg: 20000,
    produktivitas_pohon_kg: 200, // 1 pohon produktif ~200 kg buah/tahun (~50 kg tepung sukun)
    satuan_utama: 'pohon',
    umur_panen_hari: 365,
    deskripsi: 'Pangan lokal unggulan Cilegon untuk substitusi beras & diversifikasi B2SA'
  },
  {
    id: 'padi',
    label: 'Padi Sawah (Oryza sativa)',
    icon: '🌾',
    color: '#ca8a04',
    produktivitas_ha_kg: 4500, // 4.5 ton GKG per Ha (standar ubinan Cilegon)
    produktivitas_pohon_kg: 0.15,
    satuan_utama: 'ha',
    umur_panen_hari: 115,
    deskripsi: 'Padi sawah irigasi/tadah hujan varietas Ciherang, Inpari 32, IR64'
  },
  {
    id: 'singkong',
    label: 'Singkong / Ubi Kayu (Manihot esculenta)',
    icon: '🌿',
    color: '#65a30d',
    produktivitas_ha_kg: 25000, // 25 ton/ha
    produktivitas_pohon_kg: 2.5, // ~2.5 kg per batang
    satuan_utama: 'm2',
    umur_panen_hari: 240,
    deskripsi: 'Tanaman pangan karbohidrat lahan kering/pekarangan'
  },
  {
    id: 'ubi_jalar',
    label: 'Ubi Jalar / Mantang (Ipomoea batatas)',
    icon: '🍠',
    color: '#c2410c',
    produktivitas_ha_kg: 18000, // 18 ton/ha
    produktivitas_pohon_kg: 1.2,
    satuan_utama: 'm2',
    umur_panen_hari: 120,
    deskripsi: 'Ubi jalar oranye/ungu sumber karbohidrat & serat'
  },
  {
    id: 'jagung',
    label: 'Jagung Pangan (Zea mays)',
    icon: '🌽',
    color: '#eab308',
    produktivitas_ha_kg: 6000, // 6 ton pipilan kering/ha
    produktivitas_pohon_kg: 0.25,
    satuan_utama: 'm2',
    umur_panen_hari: 95,
    deskripsi: 'Jagung pipil atau jagung manis'
  },
  {
    id: 'talas',
    label: 'Talas / Keladi (Colocasia esculenta)',
    icon: '🍃',
    color: '#047857',
    produktivitas_ha_kg: 15000, // 15 ton/ha
    produktivitas_pohon_kg: 1.5,
    satuan_utama: 'pohon',
    umur_panen_hari: 180,
    deskripsi: 'Umbi talas lahan basah/pekarangan'
  },
  {
    id: 'sorgum',
    label: 'Sorgum / Cantel (Sorghum bicolor)',
    icon: '🌾',
    color: '#b45309',
    produktivitas_ha_kg: 4000, // 4 ton/ha
    produktivitas_pohon_kg: 0.1,
    satuan_utama: 'm2',
    umur_panen_hari: 100,
    deskripsi: 'Serealia alternatif tahan kekeringan'
  },
  {
    id: 'lainnya',
    label: 'Tanaman Karbohidrat Lainnya',
    icon: '🌱',
    color: '#10b981',
    produktivitas_ha_kg: 10000,
    produktivitas_pohon_kg: 2,
    satuan_utama: 'm2',
    umur_panen_hari: 120,
    deskripsi: 'Tanaman pangan karbohidrat lokal lainnya'
  }
];

// ============================================================
// 3. KALKULATOR ESTIMASI NORMATIF PRODUKSI
// ============================================================
export function hitungEstimasiProduksiNormatif(
  tanamanId: string,
  params: {
    luas_m2?: number;
    luas_ha?: number;
    jumlah_pohon?: number;
  }
): {
  estimasi_kg: number;
  estimasi_ton: number;
  metode_perhitungan: string;
} {
  const cfg = TANAMAN_PANGAN_LIST.find(t => t.id === tanamanId) || TANAMAN_PANGAN_LIST[0];

  // Prioritas 1: Jika berbasis pohon/rumpun (misal Sukun/Talas)
  if (params.jumlah_pohon && params.jumlah_pohon > 0) {
    const kg = params.jumlah_pohon * cfg.produktivitas_pohon_kg;
    return {
      estimasi_kg: Math.round(kg),
      estimasi_ton: Number((kg / 1000).toFixed(2)),
      metode_perhitungan: `${params.jumlah_pohon} pohon × ${cfg.produktivitas_pohon_kg} kg/pohon`
    };
  }

  // Prioritas 2: Jika berbasis Luas Hektare
  if (params.luas_ha && params.luas_ha > 0) {
    const kg = params.luas_ha * cfg.produktivitas_ha_kg;
    return {
      estimasi_kg: Math.round(kg),
      estimasi_ton: Number((kg / 1000).toFixed(2)),
      metode_perhitungan: `${params.luas_ha} Ha × ${cfg.produktivitas_ha_kg} kg/Ha`
    };
  }

  // Prioritas 3: Jika berbasis Luas M2
  if (params.luas_m2 && params.luas_m2 > 0) {
    const ha = params.luas_m2 / 10000;
    const kg = ha * cfg.produktivitas_ha_kg;
    return {
      estimasi_kg: Math.round(kg),
      estimasi_ton: Number((kg / 1000).toFixed(2)),
      metode_perhitungan: `${params.luas_m2} m² (${ha.toFixed(3)} Ha) × ${cfg.produktivitas_ha_kg} kg/Ha`
    };
  }

  return { estimasi_kg: 0, estimasi_ton: 0, metode_perhitungan: 'Data lahan/pohon belum diinput' };
}

// ============================================================
// 4. REVERSE GEOCODING SEDERHANA KE WILAYAH CILEGON
// ============================================================
export const KELURAHAN_COORDINATES: Record<string, { lat: number; lng: number; kec: string }> = {
  // Cibeber
  'Cibeber': { lat: -6.0271, lng: 106.0712, kec: 'Cibeber' },
  'Kedaleman': { lat: -6.0210, lng: 106.0789, kec: 'Cibeber' },
  'Bulakan': { lat: -6.0450, lng: 106.0680, kec: 'Cibeber' },
  'Cikerai': { lat: -6.0590, lng: 106.0650, kec: 'Cibeber' },
  'Karang Asem': { lat: -6.0350, lng: 106.0600, kec: 'Cibeber' },
  'Kalitimbang': { lat: -6.0420, lng: 106.0520, kec: 'Cibeber' },
  
  // Cilegon
  'Bagendung': { lat: -6.0380, lng: 106.0410, kec: 'Cilegon' },
  'Ciwedus': { lat: -6.0260, lng: 106.0480, kec: 'Cilegon' },
  'Bendungan': { lat: -6.0190, lng: 106.0530, kec: 'Cilegon' },
  'Ketileng': { lat: -6.0140, lng: 106.0590, kec: 'Cilegon' },
  'Ciwaduk': { lat: -6.0180, lng: 106.0470, kec: 'Cilegon' },

  // Pulo Merak
  'Tamansari': { lat: -5.9320, lng: 105.9980, kec: 'Pulo Merak' },
  'Lebakgede': { lat: -5.9080, lng: 106.0040, kec: 'Pulo Merak' },
  'Mekarsari': { lat: -5.9420, lng: 106.0020, kec: 'Pulo Merak' },
  'Suralaya': { lat: -5.8950, lng: 106.0180, kec: 'Pulo Merak' },

  // Ciwandan
  'Banjar Negara': { lat: -6.0280, lng: 105.9750, kec: 'Ciwandan' },
  'Tegal Ratu': { lat: -6.0180, lng: 105.9620, kec: 'Ciwandan' },
  'Kubangsari': { lat: -6.0050, lng: 105.9520, kec: 'Ciwandan' },
  'Gunung Sugih': { lat: -6.0260, lng: 105.9320, kec: 'Ciwandan' },
  'Kepuh': { lat: -6.0350, lng: 105.9500, kec: 'Ciwandan' },
  'Randakari': { lat: -6.0310, lng: 105.9650, kec: 'Ciwandan' },

  // Jombang
  'Sukmajaya': { lat: -6.0080, lng: 106.0640, kec: 'Jombang' },
  'Jombang Wetan': { lat: -6.0120, lng: 106.0550, kec: 'Jombang' },
  'Masigit': { lat: -6.0070, lng: 106.0540, kec: 'Jombang' },
  'Panggung Rawi': { lat: -5.9980, lng: 106.0620, kec: 'Jombang' },
  'Gedong Dalem': { lat: -5.9910, lng: 106.0580, kec: 'Jombang' },

  // Gerogol
  'Kotasari': { lat: -5.9820, lng: 106.0280, kec: 'Gerogol' },
  'Gerogol': { lat: -5.9730, lng: 106.0320, kec: 'Gerogol' },
  'Rawa Arum': { lat: -5.9780, lng: 106.0140, kec: 'Gerogol' },
  'Gerem': { lat: -5.9560, lng: 106.0350, kec: 'Gerogol' },

  // Purwakarta
  'Ramanuju': { lat: -6.0050, lng: 106.0420, kec: 'Purwakarta' },
  'Kotabumi': { lat: -5.9890, lng: 106.0420, kec: 'Purwakarta' },
  'Kebon Dalem': { lat: -5.9950, lng: 106.0490, kec: 'Purwakarta' },
  'Purwakarta': { lat: -5.9820, lng: 106.0520, kec: 'Purwakarta' },
  'Tegal Bunder': { lat: -5.9740, lng: 106.0580, kec: 'Purwakarta' },
  'Pabean': { lat: -5.9620, lng: 106.0620, kec: 'Purwakarta' },

  // Citangkil
  'Warnasari': { lat: -5.9960, lng: 106.0020, kec: 'Citangkil' },
  'Deringo': { lat: -6.0240, lng: 106.0150, kec: 'Citangkil' },
  'Kebonsari': { lat: -6.0120, lng: 106.0220, kec: 'Citangkil' },
  'Taman Baru': { lat: -6.0210, lng: 106.0320, kec: 'Citangkil' },
  'Lebak Denok': { lat: -6.0260, lng: 106.0240, kec: 'Citangkil' },
  'Samangraya': { lat: -6.0040, lng: 106.0120, kec: 'Citangkil' },
  'Citangkil': { lat: -6.0160, lng: 106.0180, kec: 'Citangkil' },
};

export function cariKelurahanTerdekat(lat: number, lng: number): { kelurahan: string; kecamatan: string; jarak_km: number } {
  let closestKel = 'Citangkil';
  let closestKec = 'Citangkil';
  let minDist = Infinity;

  for (const [kel, coord] of Object.entries(KELURAHAN_COORDINATES)) {
    // Euclidean approx distance for local city scale
    const dLat = (coord.lat - lat) * 111;
    const dLng = (coord.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      closestKel = kel;
      closestKec = coord.kec;
    }
  }

  return {
    kelurahan: closestKel,
    kecamatan: closestKec,
    jarak_km: Number(minDist.toFixed(2))
  };
}
