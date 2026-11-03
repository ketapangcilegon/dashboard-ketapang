/**
 * Model data & utilitas Peta Arus Pasokan Beras Kota Cilegon.
 *
 * Sumber data tunggal: observasi Kamera Cerdas (`kamera_cerdas_observasi`) yang sama dengan
 * panel Agregasi Data Lapangan. Tidak ada dataset tambahan / hardcode volume.
 */

import type { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { cariKoordinatWilayah, type WilayahRef } from '@/lib/wilayah-indonesia';
import { hitungEstimasiTahunan, hitungKalibrasi, type Kalibrasi } from '@/lib/estimasi-pasokan';

export type ArahArus = 'masuk' | 'keluar';
export type FilterArah = 'semua' | ArahArus;
export type FilterPeriode = 'semua' | '7' | '30' | '90';
export type FilterSumber = 'semua' | 'petugas' | 'enumerator';
export type ModePasokanPeta = 'tahunan' | 'terdata';

/** Titik hub Kota Cilegon (fallback bila centroid KMZ belum termuat). */
export const CILEGON_HUB: [number, number] = [106.02, -6.0];

export interface AsalNode {
  id: string;
  label: string;
  /** Koordinat representatif [lng, lat]; undefined = tidak memiliki geografi yang sah. */
  posisi?: [number, number];
  /** Cara penentuan titik (didokumentasikan & ditampilkan di panel detail). */
  metode: string;
  kategori: 'lokal' | 'luar' | 'tak_teridentifikasi';
  /** Pola pencocokan nama asal (lowercase). */
  pola: RegExp;
}

const METODE_KAB = 'Titik central GPS Kabupaten/Kota — disesuaikan otomatis dengan daerah asal';
const METODE_PROV = 'Titik central GPS Provinsi — disesuaikan otomatis dengan daerah asal';

/** Simpul preset standar (digunakan bila input adalah opsi gabungan dropdown). */
export const ASAL_NODES: AsalNode[] = [
  { id: 'lokal', label: 'Kota Cilegon (Lokal)', metode: 'Pasokan lokal — tidak digambar sebagai busur', kategori: 'lokal', pola: /^kota cilegon|cilegon\s*\(lokal\)/i },
  { id: 'bulog', label: 'Bulog / Cadangan Pangan Pemerintah', metode: 'Tidak memiliki lokasi asal tunggal', kategori: 'tak_teridentifikasi', pola: /bulog|cadangan pangan/i },
  { id: 'serang', label: 'Kabupaten Serang', posisi: [106.1503, -6.1514], metode: METODE_KAB, kategori: 'luar', pola: /^kabupaten serang/i },
  { id: 'pandeglang', label: 'Kabupaten Pandeglang', posisi: [106.1067, -6.3086], metode: METODE_KAB, kategori: 'luar', pola: /^kabupaten pandeglang/i },
  { id: 'lebak', label: 'Kabupaten Lebak', posisi: [106.2522, -6.3578], metode: METODE_KAB, kategori: 'luar', pola: /^kabupaten lebak/i },
  { id: 'tangerang', label: 'Kab. Tangerang / Karawang', posisi: [106.4519, -6.1783], metode: 'Titik representatif gabungan Kab. Tangerang / Karawang', kategori: 'luar', pola: /kabupaten tangerang\s*\/\s*karawang/i },
  { id: 'jateng', label: 'Jawa Tengah / Demak / Sragen', posisi: [110.6396, -6.8906], metode: METODE_PROV, kategori: 'luar', pola: /jawa tengah\s*\/\s*demak\s*\/\s*sragen/i },
  { id: 'jatim', label: 'Jawa Timur / Ngawi', posisi: [111.4461, -7.4039], metode: METODE_PROV, kategori: 'luar', pola: /jawa timur\s*\/\s*ngawi/i },
  { id: 'lampung', label: 'Lampung / Luar Jawa', posisi: [105.4068, -4.5586], metode: METODE_PROV, kategori: 'luar', pola: /lampung\s*\/\s*luar jawa/i },
  { id: 'tak_diketahui', label: 'Asal belum teridentifikasi', metode: 'Asal tidak diketahui / campuran', kategori: 'tak_teridentifikasi', pola: /tidak diketahui|campuran|^lainnya\s*\(manual\)$/i },
];

const NODE_TAK_TERIDENTIFIKASI = ASAL_NODES[ASAL_NODES.length - 1];

/**
 * Klasifikasi & Geocode Otomatis Daerah Asal Pasokan:
 * 1. Mengecek opsi khusus (Lokal Cilegon, Bulog, Tidak Diketahui, atau opsi gabungan dropdown).
 * 2. Mencocokkan nama Kabupaten/Kota/Provinsi yang diinput user/petugas (misal "Bondowoso",
 *    "Subang", "Karawang", "Banyuwangi", "Sidrap", "Palembang") ke database koordinat GPS
 *    Indonesia (`wilayah_koordinat_indonesia` / `DAFTAR_WILAYAH_INDONESIA`) sehingga garis
 *    lengkung pasokan ditarik presisi dari titik central daerah tersebut.
 */
export function klasifikasiAsal(asal?: string | null, extraWilayah?: WilayahRef[]): AsalNode {
  const raw = (asal || '').trim();
  const s = raw.toLowerCase();
  if (!s) return NODE_TAK_TERIDENTIFIKASI;

  // 1. Cek kategori non-busur atau opsi preset gabungan persis
  for (const preset of ASAL_NODES) {
    if (preset.pola.test(s)) {
      return preset;
    }
  }

  // 2. Cari di direktori koordinat GPS Kabupaten/Kota & Provinsi se-Indonesia
  const matched = cariKoordinatWilayah(raw, extraWilayah);
  if (matched) {
    if (matched.nama.toLowerCase() === 'cilegon') {
      return ASAL_NODES[0]; // Kota Cilegon (Lokal)
    }
    const cleanId = `wilayah-${(matched.kode || matched.nama).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const labelFormatted =
      matched.tipe === 'kabupaten'
        ? `Kab. ${matched.nama}`
        : matched.tipe === 'kota'
        ? matched.nama.toLowerCase().startsWith('kota ')
          ? matched.nama
          : `Kota ${matched.nama}`
        : matched.nama;

    return {
      id: cleanId,
      label: labelFormatted,
      posisi: [matched.lng, matched.lat],
      metode:
        matched.tipe === 'provinsi'
          ? `Titik central GPS Provinsi ${matched.nama}`
          : `Titik central GPS ${labelFormatted}${matched.provinsi ? ` (${matched.provinsi})` : ''}`,
      kategori: 'luar',
      pola: new RegExp(matched.nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    };
  }

  return NODE_TAK_TERIDENTIFIKASI;
}

// ------------------------------------------------------------------
// Identitas enumerator & Masking Email (Privasi Publik)
// ------------------------------------------------------------------
export interface EnumeratorInfo {
  nama: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Masking email agar hanya menampilkan huruf pertama dan huruf terakhir dari username
 * sebelum '@' dengan tanda bintang di tengahnya.
 * Contoh: ketapangcilegon@gmail.com -> k*************n@gmail.com
 */
export function maskEmailAddress(raw?: string | null): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || !trimmed.includes('@')) return trimmed;
  const atIndex = trimmed.indexOf('@');
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!local || !domain) return trimmed;
  if (local.includes('*')) return trimmed; // sudah dimasking
  if (local.length <= 1) return `${local}****@${domain}`;
  if (local.length === 2) return `${local[0]}****${local[1]}@${domain}`;
  const stars = '*'.repeat(Math.max(4, local.length - 2));
  return `${local[0]}${stars}${local[local.length - 1]}@${domain}`;
}

/** Ambil nama & email pengirim dari rekaman (kolom khusus → metadata → petugas_nama), dengan email ter-masking. */
export function getEnumerator(rec: ObservasiRecord): EnumeratorInfo {
  const meta = (rec.foto_watermark_meta || {}) as Record<string, unknown>;
  const metaEmail = typeof meta.enumerator_email === 'string' ? meta.enumerator_email : '';
  const metaNama = typeof meta.enumerator_nama === 'string' ? meta.enumerator_nama : '';
  const petugas = (rec.petugas_nama || '').trim();
  const isAdminRecord = (rec.status_verifikasi || '').toLowerCase().includes('admin');

  const rawEmail = (
    rec.petugas_email ||
    metaEmail ||
    (EMAIL_RE.test(petugas) ? petugas : '') ||
    (isAdminRecord ? 'k*************n@gmail.com' : '')
  ).trim();

  const email = maskEmailAddress(rawEmail);

  const rawNama = (
    metaNama ||
    (EMAIL_RE.test(petugas) ? maskEmailAddress(petugas) : petugas) ||
    ''
  ).trim();

  const nama = EMAIL_RE.test(rawNama)
    ? maskEmailAddress(rawNama)
    : rawNama || (email ? email : 'Tidak tercatat');

  return { nama, email };
}

export function jenisSumber(rec: ObservasiRecord): 'petugas' | 'enumerator' | 'lainnya' {
  const s = (rec.status_verifikasi || '').toLowerCase();
  if (s.includes('admin')) return 'petugas';
  if (s.includes('pengguna')) return 'enumerator';
  return 'lainnya';
}

// ------------------------------------------------------------------
// Filter & agregasi
// ------------------------------------------------------------------
export interface ArusFilter {
  arah: FilterArah;
  periode: FilterPeriode;
  sumber: FilterSumber;
  kecamatan: string; // 'semua' | nama
  asal: string; // 'semua' | id node
}

export const FILTER_AWAL: ArusFilter = { arah: 'semua', periode: 'semua', sumber: 'semua', kecamatan: 'semua', asal: 'semua' };

function kgTerdataValid(r: ObservasiRecord): number {
  const v = Number(r.estimasi_pasokan_kg);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function kgTahunanValid(r: ObservasiRecord, kalibrasi?: Kalibrasi): number {
  const est = hitungEstimasiTahunan(r, kalibrasi);
  return Number.isFinite(est.tahunanKg) && est.tahunanKg > 0 ? est.tahunanKg : 0;
}

export function filterRecords(
  list: ObservasiRecord[],
  f: ArusFilter,
  now = Date.now(),
  extraWilayah?: WilayahRef[]
): ObservasiRecord[] {
  const batas = f.periode === 'semua' ? 0 : now - Number(f.periode) * 86400000;
  return list.filter((r) => {
    if (r.mode !== 'pasokan_beras') return false;
    if (f.kecamatan !== 'semua' && r.kecamatan !== f.kecamatan) return false;
    if (f.sumber !== 'semua') {
      const j = jenisSumber(r);
      if (f.sumber === 'petugas' && j !== 'petugas') return false;
      if (f.sumber === 'enumerator' && j !== 'enumerator') return false;
    }
    if (batas > 0) {
      const t = r.created_at ? Date.parse(r.created_at) : NaN;
      if (!Number.isFinite(t) || t < batas) return false;
    }
    if (f.asal !== 'semua' && klasifikasiAsal(r.asal_pasokan, extraWilayah).id !== f.asal) return false;
    return true;
  });
}

export interface ArusFlow {
  id: string;
  arah: ArahArus;
  asal: AsalNode;
  sumber: [number, number];
  target: [number, number];
  volumeKg: number;
  volumeTerdataKg: number;
  volumeTahunanKg: number;
  jumlahSarana: number;
  perKecamatan: { kecamatan: string; kg: number }[];
  jumlahPetugas: number;
  jumlahEnumerator: number;
  /** true bila setidaknya satu rekaman divalidasi petugas. */
  tervalidasi: boolean;
  terakhir?: string;
  kontributor: (EnumeratorInfo & { jumlah: number })[];
  heightFactor: number;
  jarakKm: number;
}

export interface ArusKPI {
  totalSarana: number;
  totalKg: number;
  totalTerdataKg: number;
  totalTahunanKg: number;
  lokalKg: number;
  luarKg: number;
  persenLokal: number | null;
  persenLuar: number | null;
  masukTervalidasiKg: number | null;
  keluarKg: null;
  wilayahPemasok: number;
  takTeridentifikasiKg: number;
  komoditasTerbesar: string | null;
  pembaruanTerakhir?: string;
  perKecamatanKg: Record<string, number>;
}

export interface ArusResult {
  flows: ArusFlow[];
  kpi: ArusKPI;
  records: ObservasiRecord[];
  activeOriginNodes: AsalNode[];
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Faktor tinggi busur: puncak ≈ 30% jarak, dibatasi 85 km agar tidak menutupi peta. */
function hitungHeightFactor(jarakKm: number): number {
  const puncakKm = Math.min(0.3 * jarakKm, 85);
  return jarakKm > 0 ? (2 * puncakKm) / jarakKm : 0;
}

export interface BangunArusOptions {
  modePasokan?: ModePasokanPeta;
  kalibrasi?: Kalibrasi;
  extraWilayah?: WilayahRef[];
}

export function bangunArus(
  list: ObservasiRecord[],
  f: ArusFilter,
  hub: [number, number],
  options?: BangunArusOptions
): ArusResult {
  const modePasokan: ModePasokanPeta = options?.modePasokan || 'tahunan';
  const kalibrasi = options?.kalibrasi || hitungKalibrasi(list);
  const extraWilayah = options?.extraWilayah;

  const records = filterRecords(list, f, Date.now(), extraWilayah);

  const ambilKg = (r: ObservasiRecord) =>
    modePasokan === 'tahunan' ? kgTahunanValid(r, kalibrasi) : kgTerdataValid(r);

  let totalKg = 0;
  let totalTerdataKg = 0;
  let totalTahunanKg = 0;
  let lokalKg = 0;
  let luarKg = 0;
  let takKg = 0;
  let masukValidKg = 0;
  let last = 0;
  const perKecamatanKg: Record<string, number> = {};
  const grup = new Map<string, { node: AsalNode; recs: ObservasiRecord[] }>();
  const originNodeMap = new Map<string, AsalNode>();

  for (const r of records) {
    const kg = ambilKg(r);
    const kgTerdata = kgTerdataValid(r);
    const kgTahunan = kgTahunanValid(r, kalibrasi);

    totalKg += kg;
    totalTerdataKg += kgTerdata;
    totalTahunanKg += kgTahunan;

    perKecamatanKg[r.kecamatan] = (perKecamatanKg[r.kecamatan] || 0) + kg;
    const t = r.created_at ? Date.parse(r.created_at) : NaN;
    if (Number.isFinite(t) && t > last) last = t;

    const node = klasifikasiAsal(r.asal_pasokan, extraWilayah);
    originNodeMap.set(node.id, node);

    if (node.kategori === 'lokal') lokalKg += kg;
    else luarKg += kg;
    if (node.kategori === 'tak_teridentifikasi') takKg += kg;

    if (node.kategori === 'luar' && node.posisi && kg > 0) {
      if (jenisSumber(r) === 'petugas') masukValidKg += kg;
      const existing = grup.get(node.id);
      if (existing) {
        existing.recs.push(r);
      } else {
        grup.set(node.id, { node, recs: [r] });
      }
    }
  }

  const flows: ArusFlow[] = [];
  if (f.arah !== 'keluar') {
    grup.forEach(({ node, recs }, id) => {
      const volumeKg = recs.reduce((a, r) => a + ambilKg(r), 0);
      const volumeTerdataKg = recs.reduce((a, r) => a + kgTerdataValid(r), 0);
      const volumeTahunanKg = recs.reduce((a, r) => a + kgTahunanValid(r, kalibrasi), 0);
      const kec = new Map<string, number>();
      const kon = new Map<string, EnumeratorInfo & { jumlah: number }>();
      let tervalidasi = false;
      let petugas = 0;
      let enumerator = 0;
      let terakhirMs = 0;
      for (const r of recs) {
        kec.set(r.kecamatan, (kec.get(r.kecamatan) || 0) + ambilKg(r));
        const j = jenisSumber(r);
        if (j === 'petugas') {
          tervalidasi = true;
          petugas++;
        } else if (j === 'enumerator') enumerator++;
        const en = getEnumerator(r);
        const key = (en.email || en.nama).toLowerCase();
        const cur = kon.get(key);
        if (cur) cur.jumlah++;
        else kon.set(key, { ...en, jumlah: 1 });
        const t = r.created_at ? Date.parse(r.created_at) : NaN;
        if (Number.isFinite(t) && t > terakhirMs) terakhirMs = t;
      }
      const jarakKm = haversineKm(node.posisi!, hub);
      flows.push({
        id: `masuk-${id}`,
        arah: 'masuk',
        asal: node,
        sumber: node.posisi!,
        target: hub,
        volumeKg,
        volumeTerdataKg,
        volumeTahunanKg,
        jumlahSarana: recs.length,
        perKecamatan: [...kec.entries()].map(([kecamatan, kg]) => ({ kecamatan, kg })).sort((a, b) => b.kg - a.kg),
        jumlahPetugas: petugas,
        jumlahEnumerator: enumerator,
        tervalidasi,
        terakhir: terakhirMs ? new Date(terakhirMs).toISOString() : undefined,
        kontributor: [...kon.values()].sort((a, b) => b.jumlah - a.jumlah),
        heightFactor: hitungHeightFactor(jarakKm),
        jarakKm,
      });
    });
  }
  flows.sort((a, b) => b.volumeKg - a.volumeKg);

  const kpi: ArusKPI = {
    totalSarana: records.length,
    totalKg,
    totalTerdataKg,
    totalTahunanKg,
    lokalKg,
    luarKg,
    persenLokal: totalKg > 0 ? Math.round((lokalKg / totalKg) * 100) : null,
    persenLuar: totalKg > 0 ? 100 - Math.round((lokalKg / totalKg) * 100) : null,
    masukTervalidasiKg: records.length > 0 ? masukValidKg : null,
    keluarKg: null,
    wilayahPemasok: flows.length,
    takTeridentifikasiKg: takKg,
    komoditasTerbesar: records.length > 0 ? 'Beras' : null,
    pembaruanTerakhir: last ? new Date(last).toISOString() : undefined,
    perKecamatanKg,
  };

  return {
    flows,
    kpi,
    records,
    activeOriginNodes: [...originNodeMap.values()],
  };
}

// ------------------------------------------------------------------
// Skala visual (satu fungsi normalisasi untuk semua busur)
// ------------------------------------------------------------------
export const LEBAR_MIN = 2;
export const LEBAR_MAX = 14;

/** Skala sqrt agar rentang tonase lebar tetap terbaca; nilai ≤0/NaN → lebar minimum. */
export function skalaVolume(volumeKg: number, maxKg: number): number {
  if (!Number.isFinite(volumeKg) || volumeKg <= 0 || !Number.isFinite(maxKg) || maxKg <= 0) return 0;
  return Math.sqrt(Math.min(volumeKg, maxKg) / maxKg);
}

export function lebarBusur(volumeKg: number, maxKg: number): number {
  return LEBAR_MIN + (LEBAR_MAX - LEBAR_MIN) * skalaVolume(volumeKg, maxKg);
}

export function formatTon(kg: number | null | undefined, suffix = 'ton'): string {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return 'Belum tersedia';
  const t = kg / 1000;
  return `${t.toLocaleString('id-ID', { maximumFractionDigits: t >= 10 ? 1 : 2 })} ${suffix}`;
}

// ------------------------------------------------------------------
// Geometri busur yang identik dengan ArcLayer deck.gl (proyeksi flat)
// ------------------------------------------------------------------
const TILE = 512;
const EARTH_C = 40075016.686;

function keCommon(lng: number, lat: number): [number, number] {
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * TILE, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE];
}

function dariCommon(x: number, y: number): [number, number] {
  const n = Math.PI - (2 * Math.PI * y) / TILE;
  return [(x / TILE) * 360 - 180, (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))];
}

/** Posisi [lng, lat, tinggi_meter] pada busur di parameter t∈[0,1] (mengikuti shader ArcLayer). */
export function titikBusur(src: [number, number], dst: [number, number], t: number, heightFactor: number): [number, number, number] {
  const tt = Math.min(1, Math.max(0, t));
  const r = tt * tt * (3 - 2 * tt);
  const a = keCommon(src[0], src[1]);
  const b = keCommon(dst[0], dst[1]);
  const x = a[0] + (b[0] - a[0]) * r;
  const y = a[1] + (b[1] - a[1]) * r;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const zCommon = Math.sqrt(Math.max(0, r * (1 - r))) * dist * heightFactor;
  const [lng, lat] = dariCommon(x, y);
  return [lng, lat, (zCommon * EARTH_C * Math.cos((lat * Math.PI) / 180)) / TILE];
}
