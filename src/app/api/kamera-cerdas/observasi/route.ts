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
  status_verifikasi?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const kecamatan = searchParams.get('kecamatan');
    const kelurahan = searchParams.get('kelurahan');

    // 1. Coba ambil dari tabel kamera_cerdas_observasi
    let query = supabase
      .from('kamera_cerdas_observasi')
      .select('*')
      .order('created_at', { ascending: false });

    if (mode) query = query.eq('mode', mode);
    if (kecamatan) query = query.eq('kecamatan', kecamatan);
    if (kelurahan) query = query.eq('kelurahan', kelurahan);

    const { data, error } = await query;

    if (!error && data) {
      return NextResponse.json({ success: true, count: data.length, data });
    }

    // 2. Fallback: Coba ambil dari sp_cache_data jika tabel utama belum dimigrasi
    const { data: cacheData } = await supabase
      .from('sp_cache_data')
      .select('data')
      .eq('tabel_sumber', 'kamera_cerdas_observasi')
      .single();

    const fallbackList = Array.isArray(cacheData?.data) ? cacheData.data : [];
    let filtered = fallbackList;
    if (mode) filtered = filtered.filter((r: ObservasiRecord) => r.mode === mode);
    if (kecamatan) filtered = filtered.filter((r: ObservasiRecord) => r.kecamatan === kecamatan);
    if (kelurahan) filtered = filtered.filter((r: ObservasiRecord) => r.kelurahan === kelurahan);

    return NextResponse.json({ success: true, count: filtered.length, data: filtered, is_fallback: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: ObservasiRecord = await request.json();

    if (!body.mode || !body.latitude || !body.longitude || !body.foto_url) {
      return NextResponse.json({ error: 'Field mode, koordinat GPS (lat, lng), dan foto wajib diisi' }, { status: 400 });
    }

    const payload: ObservasiRecord = {
      ...body,
      id: body.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined),
      created_at: body.created_at || new Date().toISOString(),
      kota: body.kota || 'Kota Cilegon',
      status_verifikasi: body.status_verifikasi || 'terverifikasi_pengguna'
    };

    // 1. Simpan ke tabel kamera_cerdas_observasi
    const { data, error } = await supabase
      .from('kamera_cerdas_observasi')
      .insert([payload])
      .select();

    if (!error && data) {
      return NextResponse.json({ success: true, data: data[0] });
    }

    // 2. Fallback jika tabel belum di-create: Simpan ke sp_cache_data
    console.warn('Simpan ke tabel kamera_cerdas_observasi fallback ke sp_cache_data:', error?.message);
    const { data: existingCache } = await supabase
      .from('sp_cache_data')
      .select('data')
      .eq('tabel_sumber', 'kamera_cerdas_observasi')
      .single();

    const currentList = Array.isArray(existingCache?.data) ? existingCache.data : [];
    const updatedList = [payload, ...currentList];

    await supabase
      .from('sp_cache_data')
      .upsert({
        tabel_sumber: 'kamera_cerdas_observasi',
        data: updatedList,
        fetched_at: new Date().toISOString()
      }, { onConflict: 'tabel_sumber' });

    return NextResponse.json({ success: true, data: payload, saved_in_fallback: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
