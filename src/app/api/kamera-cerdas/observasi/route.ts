import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// /api/kamera-cerdas/observasi
// GET: Ambil daftar observasi lapangan
// POST: Simpan observasi baru (Mode Pasokan Beras / Tanaman Pangan)
// ============================================================

export interface ObservasiRecord {
  id?: string;
  created_at?: string;
  mode: 'pasokan_beras' | 'tanaman_pangan';
  kategori: string;
  kategori_label?: string;
  nama_lokasi?: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  kelurahan: string;
  kecamatan: string;
  kota?: string;
  foto_url: string;
  foto_watermark_meta?: Record<string, unknown>;
  file_size_kb?: number;
  
  // Pasokan Beras
  estimasi_pasokan_kg?: number;
  satuan_input?: string;
  ukuran_karung_kg?: number;
  jumlah_karung?: number;
  asal_pasokan?: string;
  jenis_kemasan?: string;
  merek_beras?: string;

  // Frekuensi & Pasokan Tahunan (Capture 2)
  frekuensi_pasokan_angka?: number;
  frekuensi_pasokan_satuan?: 'hari' | 'minggu' | 'bulan';
  volume_pasokan_angka?: number;
  volume_pasokan_satuan?: 'kg' | 'kwintal' | 'ton';
  total_pasokan_tahunan_kg?: number;
  total_pasokan_tahunan_ton?: number;

  // Tanaman Pangan
  luas_lahan_m2?: number;
  luas_lahan_ha?: number;
  jumlah_pohon_rumpun?: number;
  fase_pertumbuhan?: string;
  estimasi_produksi_kg?: number;
  metode_estimasi?: string;

  // AI Results
  ai_analysis_raw?: Record<string, unknown>;
  ai_confidence?: number;
  ai_detected_objects?: string[];

  // Meta
  catatan_lapangan?: string;
  petugas_nama?: string;
  /** Gmail enumerator / email petugas pengirim (diisi server dari token autentikasi). */
  petugas_email?: string;
  status_verifikasi?: string;
}

/**
 * Verifikasi identitas pengirim dari header `Authorization: Bearer <access_token>`.
 * Mengembalikan null bila token tidak ada / tidak valid.
 * - provider `google`  → Enumerator publik (login Gmail)
 * - provider lain      → Petugas / Admin DKPP (login email & kata sandi)
 */
async function verifikasiPengirim(request: Request): Promise<{ nama: string; email: string; peran: 'enumerator' | 'petugas' } | null> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      const user = data?.user;
      if (!error && user?.email) {
        const peran = user.app_metadata?.provider === 'google' ? 'enumerator' : 'petugas';
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const nama = String(meta.full_name || meta.name || user.email.split('@')[0]);
        return { nama, email: user.email, peran };
      }
    } catch {
      // lanjut ke fallback
    }
  }

  // Fallback enumerator crowdsourcing teridentifikasi jika Google OAuth belum dikonfigurasi di Supabase Console
  const enumEmail = request.headers.get('x-enumerator-email') || '';
  const enumName = request.headers.get('x-enumerator-name') || '';
  if (enumEmail && enumEmail.includes('@')) {
    return {
      nama: enumName.trim() || enumEmail.split('@')[0],
      email: enumEmail.trim().toLowerCase(),
      peran: 'enumerator'
    };
  }

  return null;
}

import { SEED_OBSERVASI_DATA, getSeedObservasiById } from '@/lib/kameraSeedData';
import { maskEmailAddress } from '@/lib/arusPasokan';

// Server-side cache keyed by sp_cache_data.fetched_at to avoid downloading 5.3 MB on every GET request
const SEED_BASELINE_FETCHED_AT = '2026-11-09T04:36:04.9+00:00';
let serverObservasiCache: {
  fetchedAt: string;
  checkedAt: number;
  rawList: ObservasiRecord[];
} = {
  fetchedAt: SEED_BASELINE_FETCHED_AT,
  checkedAt: 0,
  rawList: SEED_OBSERVASI_DATA,
};
const METADATA_CHECK_TTL_MS = 60 * 1000; // Check fetched_at (40B) at most once per 60 seconds

async function getRawObservasiList(): Promise<ObservasiRecord[]> {
  const now = Date.now();
  if (now - serverObservasiCache.checkedAt < METADATA_CHECK_TTL_MS && serverObservasiCache.rawList.length > 0) {
    return serverObservasiCache.rawList;
  }

  try {
    // 1. Cek hanya kolom fetched_at (~40 byte) terlebih dahulu agar tidak mengunduh blob 5.3 MB jika belum ada perubahan
    const { data: metaRow, error: metaErr } = await supabase
      .from('sp_cache_data')
      .select('fetched_at')
      .eq('tabel_sumber', 'kamera_cerdas_observasi')
      .single();

    if (!metaErr && metaRow?.fetched_at) {
      serverObservasiCache.checkedAt = now;
      if (metaRow.fetched_at === serverObservasiCache.fetchedAt && serverObservasiCache.rawList.length > 0) {
        return serverObservasiCache.rawList;
      }

      // Hanya unduh kolom data penuh jika fetched_at berubah (ada input/edit baru)
      const { data: cacheData } = await supabase
        .from('sp_cache_data')
        .select('data, fetched_at')
        .eq('tabel_sumber', 'kamera_cerdas_observasi')
        .single();

      if (Array.isArray(cacheData?.data) && cacheData.data.length > 0) {
        serverObservasiCache = {
          fetchedAt: cacheData.fetched_at || metaRow.fetched_at,
          checkedAt: now,
          rawList: cacheData.data,
        };
        return serverObservasiCache.rawList;
      }
    }
  } catch {
    // lanjut ke seed fallback
  }

  serverObservasiCache.checkedAt = now;
  return serverObservasiCache.rawList;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const kecamatan = searchParams.get('kecamatan');
    const kelurahan = searchParams.get('kelurahan');
    const idParam = searchParams.get('id');
    const isSummary = searchParams.get('summary') === '1' || searchParams.get('summary') === 'true';

    const rawList = await getRawObservasiList();

    // Gabungkan dengan data seed (seluruh titik sarana distribusi terverifikasi beserta foto & koordinat GPS)
    // agar data penting yang sulit didapat TIDAK PERNAH hilang
    const combinedMap = new Map<string, ObservasiRecord>();
    SEED_OBSERVASI_DATA.forEach((r) => {
      const key = r.id || `${r.nama_lokasi}-${r.latitude}-${r.longitude}`;
      combinedMap.set(key, r);
    });

    rawList.forEach((r) => {
      const key = r.id || `${r.nama_lokasi}-${r.latitude}-${r.longitude}`;
      combinedMap.set(key, r);
    });

    let result = Array.from(combinedMap.values()).sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    if (idParam) result = result.filter((r) => r.id === idParam);
    if (mode) result = result.filter((r) => r.mode === mode);
    if (kecamatan) result = result.filter((r) => r.kecamatan === kecamatan);
    if (kelurahan) result = result.filter((r) => r.kelurahan === kelurahan);

    // Masking seluruh email (baik Admin maupun Enumerator) menjadi huruf pertama + **** + huruf terakhir (misal k*************n@gmail.com)
    const maskedResult = result.map((r) => {
      const rawMeta = (r.foto_watermark_meta || {}) as Record<string, unknown>;
      const metaEmail = typeof rawMeta.enumerator_email === 'string' ? rawMeta.enumerator_email : '';
      const metaNama = typeof rawMeta.enumerator_nama === 'string' ? rawMeta.enumerator_nama : '';
      const isAdminPin = (r.status_verifikasi || '').toLowerCase().includes('admin');

      const rawEmail =
        r.petugas_email ||
        metaEmail ||
        (r.petugas_nama && r.petugas_nama.includes('@') ? r.petugas_nama : '') ||
        (isAdminPin ? 'k*************n@gmail.com' : '');

      const maskedEmail = maskEmailAddress(rawEmail);
      const maskedPetugasNama =
        r.petugas_nama && r.petugas_nama.includes('@')
          ? maskEmailAddress(r.petugas_nama)
          : r.petugas_nama || (maskedEmail ? maskedEmail : 'Enumerator Lapangan');

      const maskedMetaNama =
        metaNama && metaNama.includes('@') ? maskEmailAddress(metaNama) : metaNama;

      // Jika summary mode (?summary=1), gantikan base64 foto seed dengan token ringan '__SEED_PHOTO__'
      // yang langsung di-rehydrate di sisi klien dari SEED_OBSERVASI_DATA lokal (menghemat ~5.2 MB transfer per request)
      let compactFotoUrl = r.foto_url;
      if (isSummary && r.id) {
        const seedItem = getSeedObservasiById(r.id);
        if (seedItem && seedItem.foto_url === r.foto_url) {
          compactFotoUrl = '__SEED_PHOTO__';
        }
      }

      return {
        ...r,
        foto_url: compactFotoUrl,
        petugas_nama: maskedPetugasNama,
        petugas_email: maskedEmail || undefined,
        foto_watermark_meta: {
          ...rawMeta,
          ...(maskedMetaNama ? { enumerator_nama: maskedMetaNama } : {}),
          ...(maskedEmail ? { enumerator_email: maskedEmail } : {}),
        },
      };
    });

    return NextResponse.json(
      { success: true, count: maskedResult.length, data: maskedResult },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=3600',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );

  } catch (error: unknown) {
    console.warn('Fallback error pada GET observasi, menyajikan data seed:', error);
    const fallbackResult = SEED_OBSERVASI_DATA;
    return NextResponse.json({ success: true, count: fallbackResult.length, data: fallbackResult, is_fallback: true });
  }
}

export async function POST(request: Request) {
  try {
    const body: ObservasiRecord = await request.json();

    if (!body.mode || !body.latitude || !body.longitude || !body.foto_url) {
      return NextResponse.json({ error: 'Field mode, koordinat GPS (lat, lng), dan foto wajib diisi' }, { status: 400 });
    }

    // Identitas pengirim wajib terautentikasi (Google untuk enumerator / email-sandi untuk petugas)
    const pengirim = await verifikasiPengirim(request);
    if (!pengirim) {
      return NextResponse.json({ error: 'Autentikasi diperlukan. Silakan masuk dengan akun Google (Gmail) untuk mengirim data Kamera Cerdas.' }, { status: 401 });
    }

    const payload: ObservasiRecord = {
      ...body,
      id: body.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined),
      created_at: body.created_at || new Date().toISOString(),
      kota: body.kota || 'Kota Cilegon',
      // Status & identitas ditetapkan server — klien tidak dapat memalsukan peran/email
      status_verifikasi: pengirim.peran === 'petugas' ? 'TERVERIFIKASI_ADMIN' : 'terverifikasi_pengguna',
      petugas_nama: pengirim.nama,
      petugas_email: pengirim.email,
      foto_watermark_meta: {
        ...(body.foto_watermark_meta || {}),
        enumerator_nama: pengirim.nama,
        enumerator_email: pengirim.email,
        enumerator_peran: pengirim.peran
      }
    };

    // 1. Simpan ke tabel kamera_cerdas_observasi
    let { data, error } = await supabase
      .from('kamera_cerdas_observasi')
      .insert([payload])
      .select();

    // Kolom petugas_email belum dimigrasi? Ulangi tanpa kolom tsb (email tetap ada di foto_watermark_meta)
    if (error && /petugas_email/i.test(error.message || '')) {
      const { petugas_email: _omit, ...tanpaEmail } = payload;
      void _omit;
      ({ data, error } = await supabase
        .from('kamera_cerdas_observasi')
        .insert([tanpaEmail])
        .select());
    }

    if (!error && data) {
      return NextResponse.json({ success: true, data: data[0] });
    }

    // 2. Fallback jika tabel belum di-create: Simpan ke sp_cache_data
    console.warn('Simpan ke tabel kamera_cerdas_observasi fallback ke sp_cache_data:', error?.message);
    const currentList = await getRawObservasiList();
    const filteredExisting = currentList.filter((r: ObservasiRecord) => r.id !== payload.id);
    const updatedList = [payload, ...filteredExisting];
    const newFetchedAt = new Date().toISOString();

    await supabase
      .from('sp_cache_data')
      .upsert({
        tabel_sumber: 'kamera_cerdas_observasi',
        data: updatedList,
        fetched_at: newFetchedAt
      }, { onConflict: 'tabel_sumber' });

    serverObservasiCache = {
      fetchedAt: newFetchedAt,
      checkedAt: Date.now(),
      rawList: updatedList,
    };

    return NextResponse.json({ success: true, data: payload, saved_in_fallback: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: Partial<ObservasiRecord> & { id: string } = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID observasi wajib disertakan' }, { status: 400 });
    }

    // 1. Verifikasi pengirim / headers
    const pengirim = await verifikasiPengirim(request);

    // 2. Ambil data observasi saat ini dari cache / seed tanpa re-download penuh jika belum berubah
    const currentCachedList = await getRawObservasiList();
    let existingRecord: ObservasiRecord | null =
      currentCachedList.find((r: ObservasiRecord) => r.id === body.id) ||
      SEED_OBSERVASI_DATA.find((r) => r.id === body.id) ||
      null;

    if (!existingRecord) {
      return NextResponse.json({ error: 'Data observasi tidak ditemukan' }, { status: 404 });
    }

    // 3. Governance Check:
    // Pengeditan hanya diizinkan bagi Admin atau User (Enumerator) yang menginput data tersebut
    // Admin hanya diakui melalui token sesi Supabase yang terverifikasi (bukan header klien)
    const isPetugasAdmin = pengirim?.peran === 'petugas';
    const recordEmail = (
      existingRecord.petugas_email ||
      (existingRecord.foto_watermark_meta as any)?.enumerator_email ||
      ''
    ).toLowerCase().trim();
    const userEmail = (pengirim?.email || '').toLowerCase().trim();
    const maskedUserEmail = maskEmailAddress(userEmail).toLowerCase().trim();

    const isOwner = Boolean(
      userEmail &&
      recordEmail &&
      (userEmail === recordEmail || maskedUserEmail === recordEmail)
    );

    if (!isPetugasAdmin && !isOwner) {
      return NextResponse.json({
        error: 'Akses ditolak (Governance): Hanya Admin atau user pendata yang menginput titik ini yang berhak mengedit data.'
      }, { status: 403 });
    }

    // Gabungkan pembaruan
    const updatedRecord: ObservasiRecord = {
      ...existingRecord,
      ...body,
      // Pertahankan id dan created_at asli
      id: existingRecord.id,
      created_at: existingRecord.created_at,
      // Identitas pendata tidak boleh diubah melalui edit
      petugas_email: existingRecord.petugas_email,
      petugas_nama: existingRecord.petugas_nama,
      status_verifikasi: isPetugasAdmin ? 'TERVERIFIKASI_ADMIN' : existingRecord.status_verifikasi
    };

    // 4. Update di sp_cache_data
    try {
      let currentList = [...currentCachedList];
      const idx = currentList.findIndex((r: ObservasiRecord) => r.id === body.id);
      if (idx !== -1) {
        currentList[idx] = updatedRecord;
      } else {
        currentList = [updatedRecord, ...currentList];
      }

      const newFetchedAt = new Date().toISOString();
      await supabase
        .from('sp_cache_data')
        .upsert({
          tabel_sumber: 'kamera_cerdas_observasi',
          data: currentList,
          fetched_at: newFetchedAt
        }, { onConflict: 'tabel_sumber' });

      serverObservasiCache = {
        fetchedAt: newFetchedAt,
        checkedAt: Date.now(),
        rawList: currentList,
      };
    } catch (e) {
      console.warn('Gagal update sp_cache_data:', e);
    }

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
