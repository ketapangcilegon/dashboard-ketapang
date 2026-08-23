import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');
import { supabase } from '@/lib/supabase';
import { matchLocationToWilayah } from '@/lib/spatialWilayahMatcher';

// ============================================================
// /api/sp-sync
// Sync data dari Serumpun-Padi GIS ke cache lokal (sp_cache_data)
// Dipanggil oleh /api/ai-intelligence jika cache stale (>6 jam)
// ============================================================

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSPClient(): any {
  const url = process.env.SP_SUPABASE_URL;
  const key = process.env.SP_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Serumpun-Padi credentials tidak ditemukan di env');
  return createClient(url, key);
}

// Agregasi sawah_status: ringkasan per kecamatan + total
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSawahSummary(sp: any): Promise<Record<string, unknown>> {
  const { data, error } = await sp
    .from('sawah_status')
    .select('kecamatan, kelurahan, status, luas_m2, tanggal_tanam, varietas, hasil_ubinan');
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data || [];
  const totalLuasHa = rows.reduce((s: number, r: any) => s + (r.luas_m2 || 0), 0) / 10000;
  
  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const st = r.status || 'tidak_diketahui';
    byStatus[st] = (byStatus[st] || 0) + (r.luas_m2 || 0) / 10000;
  }

  const byKecamatan: Record<string, { total_ha: number; by_status: Record<string, number>; kelurahan: string[] }> = {};
  for (const r of rows) {
    const kec = r.kecamatan || 'Tidak Diketahui';
    if (!byKecamatan[kec]) byKecamatan[kec] = { total_ha: 0, by_status: {}, kelurahan: [] };
    byKecamatan[kec].total_ha += (r.luas_m2 || 0) / 10000;
    const st = r.status || 'tidak_diketahui';
    byKecamatan[kec].by_status[st] = (byKecamatan[kec].by_status[st] || 0) + (r.luas_m2 || 0) / 10000;
    if (r.kelurahan && !byKecamatan[kec].kelurahan.includes(r.kelurahan)) {
      byKecamatan[kec].kelurahan.push(r.kelurahan);
    }
  }

  // Round semua angka ke 2 desimal
  for (const kec of Object.keys(byKecamatan)) {
    byKecamatan[kec].total_ha = Math.round(byKecamatan[kec].total_ha * 100) / 100;
    for (const st of Object.keys(byKecamatan[kec].by_status)) {
      byKecamatan[kec].by_status[st] = Math.round(byKecamatan[kec].by_status[st] * 100) / 100;
    }
  }

  // Hitung avg hasil_ubinan (hanya baris yang ada nilainya)
  const ubinanRows = rows.filter((r: any) => r.hasil_ubinan != null);
  const avgUbinan = ubinanRows.length > 0
    ? ubinanRows.reduce((s: number, r: any) => s + Number(r.hasil_ubinan), 0) / ubinanRows.length
    : null;

  return {
    total_sawah: rows.length,
    total_luas_ha: Math.round(totalLuasHa * 100) / 100,
    by_status: Object.fromEntries(
      Object.entries(byStatus).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    by_kecamatan: byKecamatan,
    avg_hasil_ubinan: avgUbinan ? Math.round(avgUbinan * 100) / 100 : null,
    catatan_ubinan: 'ton/ha (estimasi, perlu konfirmasi satuan)'
  };
}

// Agregasi kolam_budidaya
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchKolamSummary(sp: any): Promise<Record<string, unknown>> {
  const { data, error } = await sp
    .from('kolam_budidaya')
    .select('nama_pemilik, jenis_ikan, luas_m2, status_kolam, jenis_kolam, jenis_ikan_pembenihan, lat, lng');
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data || [];
  const totalLuasM2 = rows.reduce((s: number, r: any) => s + (r.luas_m2 || 0), 0);
  const byStatus: Record<string, number> = {};
  const byJenis: Record<string, number> = {};
  const byKecamatan: Record<string, number> = {};
  const byKelurahan: Record<string, string[]> = {};
  const allIkan: string[] = [];
  const listKolam: Array<Record<string, unknown>> = [];

  for (const r of rows) {
    const st = r.status_kolam || 'tidak_diketahui';
    byStatus[st] = (byStatus[st] || 0) + 1;
    const jk = r.jenis_kolam || 'tidak_diketahui';
    byJenis[jk] = (byJenis[jk] || 0) + 1;
    if (r.jenis_ikan) {
      r.jenis_ikan.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((ik: string) => {
        if (!allIkan.includes(ik)) allIkan.push(ik);
      });
    }

    // Resolusi spasial GPS lat/lng
    let kel = 'Tidak Diketahui';
    let kec = 'Kota Cilegon';
    if (r.lat && r.lng) {
      const matched = await matchLocationToWilayah(r.lat, r.lng);
      kel = matched.kelurahan;
      kec = matched.kecamatan;
    }

    byKecamatan[kec] = (byKecamatan[kec] || 0) + 1;
    if (!byKelurahan[kel]) byKelurahan[kel] = [];
    byKelurahan[kel].push(`Kolam ${r.nama_pemilik || 'Warga'} (${r.jenis_ikan || 'Ikan Air Tawar'}, ${r.luas_m2 || 0} m²)`);

    listKolam.push({
      nama_pemilik: r.nama_pemilik,
      jenis_ikan: r.jenis_ikan,
      luas_m2: r.luas_m2,
      status: r.status_kolam,
      kelurahan: kel,
      kecamatan: kec
    });
  }

  return {
    total_kolam: rows.length,
    total_luas_m2: totalLuasM2,
    total_luas_ha: Math.round(totalLuasM2 / 10000 * 100) / 100,
    by_status: byStatus,
    by_jenis: byJenis,
    by_kecamatan: byKecamatan,
    by_kelurahan: byKelurahan,
    jenis_ikan_dibudidaya: allIkan,
    list_kolam: listKolam
  };
}

// Agregasi nelayan_tangkap
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchNelayanSummary(sp: any): Promise<Record<string, unknown>> {
  const { data, error } = await sp
    .from('nelayan_tangkap')
    .select('nama_nelayan, alat_tangkap, jenis_ikan, perahu, lat, lng');
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data || [];
  const alatMap: Record<string, number> = {};
  const ikanSet: string[] = [];
  const byKecamatan: Record<string, number> = {};
  const byKelurahan: Record<string, string[]> = {};
  const listNelayan: Array<Record<string, unknown>> = [];

  for (const r of rows) {
    if (r.alat_tangkap) {
      r.alat_tangkap.split(',').map((s: string) => s.split(':')[0].trim()).filter(Boolean).forEach((a: string) => {
        alatMap[a] = (alatMap[a] || 0) + 1;
      });
    }
    if (r.jenis_ikan) {
      r.jenis_ikan.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((ik: string) => {
        if (!ikanSet.includes(ik)) ikanSet.push(ik);
      });
    }

    // Resolusi spasial GPS lat/lng ke Kelurahan & Kecamatan di Cilegon
    let kel = 'Pesisir Cilegon';
    let kec = 'Kota Cilegon';
    if (r.lat && r.lng) {
      const matched = await matchLocationToWilayah(r.lat, r.lng);
      kel = matched.kelurahan;
      kec = matched.kecamatan;
    }

    byKecamatan[kec] = (byKecamatan[kec] || 0) + 1;
    if (!byKelurahan[kel]) byKelurahan[kel] = [];
    byKelurahan[kel].push(r.nama_nelayan);

    listNelayan.push({
      nama_nelayan: r.nama_nelayan,
      alat_tangkap: r.alat_tangkap,
      perahu: r.perahu,
      kelurahan: kel,
      kecamatan: kec,
      lat: r.lat,
      lng: r.lng
    });
  }

  return {
    total_nelayan: rows.length,
    by_alat_tangkap: alatMap,
    by_kecamatan: byKecamatan,
    by_kelurahan: byKelurahan,
    jenis_ikan_tangkap: ikanSet,
    list_nelayan: listNelayan
  };
}

// Agregasi poktan_kwt
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPoktanSummary(sp: any): Promise<Record<string, unknown>> {
  const { data, error } = await sp
    .from('poktan_kwt')
    .select('nama_poktan, jenis, nama_ketua, jumlah_anggota, kelurahan, kecamatan, produk_unggulan, status_aktif, lat, lng');
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data || [];
  const byJenis: Record<string, number> = {};
  const byKecamatan: Record<string, number> = {};
  const byKelurahan: Record<string, string[]> = {};
  const listPoktan: Array<Record<string, unknown>> = [];
  const totalAnggota = rows.reduce((s: number, r: any) => s + (Number(r.jumlah_anggota) || 0), 0);
  const aktif = rows.filter((r: any) => r.status_aktif === 'Aktif' || r.status_aktif === true).length;

  for (const r of rows) {
    const j = r.jenis || 'Poktan';
    byJenis[j] = (byJenis[j] || 0) + 1;

    let kel = r.kelurahan || 'Tidak Diketahui';
    let kec = r.kecamatan || 'Kota Cilegon';
    if ((!r.kelurahan || !r.kecamatan) && r.lat && r.lng) {
      const matched = await matchLocationToWilayah(r.lat, r.lng);
      kel = kel === 'Tidak Diketahui' ? matched.kelurahan : kel;
      kec = kec === 'Kota Cilegon' ? matched.kecamatan : kec;
    }

    byKecamatan[kec] = (byKecamatan[kec] || 0) + 1;
    if (!byKelurahan[kel]) byKelurahan[kel] = [];
    byKelurahan[kel].push(`${r.nama_poktan} (${j}, Ketua: ${r.nama_ketua || '-'}, ${r.jumlah_anggota || 0} anggota)`);

    listPoktan.push({
      nama_poktan: r.nama_poktan,
      jenis: j,
      nama_ketua: r.nama_ketua,
      jumlah_anggota: r.jumlah_anggota,
      produk_unggulan: r.produk_unggulan,
      status_aktif: r.status_aktif,
      kelurahan: kel,
      kecamatan: kec,
      lat: r.lat,
      lng: r.lng
    });
  }

  return {
    total_poktan: rows.length,
    poktan_aktif: aktif,
    total_anggota: totalAnggota,
    by_jenis: byJenis,
    by_kecamatan: byKecamatan,
    by_kelurahan: byKelurahan,
    list_poktan: listPoktan
  };
}

// Agregasi pohon_sukun (pemetaan pangan lokal)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPohonSukunSummary(sp: any): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await sp
      .from('pohon_sukun')
      .select('id, kode_titik, nama_lokasi, jumlah_pohon, kondisi, estimasi_kg_tahun, lat, lng, kelurahan, kecamatan, nama_pemilik, keterangan');
    
    if (error) {
      // Jika tabel belum dibuat di SP, fallback ke data kosong yang aman
      return {
        total_titik: 0,
        total_pohon: 0,
        by_kelurahan: {},
        by_kecamatan: {},
        list_titik: [],
        catatan: 'Tabel pohon_sukun siap diisi titik pin baru'
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = data || [];
    let totalPohon = 0;
    const byKelurahan: Record<string, { total_pohon: number; estimasi_kg: number; titik: string[] }> = {};
    const byKecamatan: Record<string, number> = {};
    const listTitik: Array<Record<string, unknown>> = [];

    for (const r of rows) {
      const jml = Number(r.jumlah_pohon) || 1;
      const kgPerPohon = Number(r.estimasi_kg_tahun) || 200;
      totalPohon += jml;

      let kel = r.kelurahan || 'Tidak Diketahui';
      let kec = r.kecamatan || 'Kota Cilegon';
      if ((!r.kelurahan || !r.kecamatan) && r.lat && r.lng) {
        const matched = await matchLocationToWilayah(r.lat, r.lng);
        kel = kel === 'Tidak Diketahui' ? matched.kelurahan : kel;
        kec = kec === 'Kota Cilegon' ? matched.kecamatan : kec;
      }

      byKecamatan[kec] = (byKecamatan[kec] || 0) + jml;
      if (!byKelurahan[kel]) byKelurahan[kel] = { total_pohon: 0, estimasi_kg: 0, titik: [] };
      byKelurahan[kel].total_pohon += jml;
      byKelurahan[kel].estimasi_kg += (jml * kgPerPohon);
      byKelurahan[kel].titik.push(`${r.nama_lokasi || 'Titik Sukun'} (${jml} pohon, Lat: ${r.lat}, Lng: ${r.lng})`);

      listTitik.push({
        id: r.id,
        nama_lokasi: r.nama_lokasi,
        jumlah_pohon: jml,
        kondisi: r.kondisi || 'Produktif',
        estimasi_kg_tahun: jml * kgPerPohon,
        lat: r.lat,
        lng: r.lng,
        kelurahan: kel,
        kecamatan: kec,
        nama_pemilik: r.nama_pemilik
      });
    }

    return {
      total_titik: rows.length,
      total_pohon: totalPohon,
      estimasi_total_kg_tahun: totalPohon * 200,
      estimasi_total_ton_tahun: Math.round((totalPohon * 200 / 1000) * 100) / 100,
      by_kelurahan: byKelurahan,
      by_kecamatan: byKecamatan,
      list_titik: listTitik
    };
  } catch {
    return { total_titik: 0, total_pohon: 0, by_kelurahan: {}, by_kecamatan: {}, list_titik: [] };
  }
}

// Agregasi komoditas_hortikultura dan palawija (handle jika tabel kosong)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchKomoditasSummary(sp: any, tabel: string): Promise<Record<string, unknown>> {
  const { data, error, count } = await sp
    .from(tabel)
    .select('*', { count: 'exact', head: false })
    .limit(50);
  
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data || [];
  
  if (rows.length === 0) {
    return { total: 0, catatan: 'Belum ada data', tabel };
  }

  const cols = Object.keys(rows[0]);
  return {
    total: count || rows.length,
    kolom: cols,
    sample: rows.slice(0, 3),
    tabel
  };
}

// ============================================================
// Main handler — cek staleness, sync jika perlu
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body?.force === true;

    // Cek staleness dari cache lokal
    const { data: cacheRows } = await supabase
      .from('sp_cache_data')
      .select('tabel_sumber, fetched_at')
      .order('fetched_at', { ascending: false });

    const cacheMap: Record<string, Date> = {};
    for (const r of (cacheRows || []) as Array<{ tabel_sumber: string; fetched_at: string }>) {
      cacheMap[r.tabel_sumber] = new Date(r.fetched_at);
    }

    const now = Date.now();
    const needed = ['sawah_status', 'kolam_budidaya', 'nelayan_tangkap', 'poktan_kwt', 'pohon_sukun', 'komoditas_hortikultura', 'komoditas_palawija'];
    const stale = needed.filter(t => {
      if (forceRefresh) return true;
      const cached = cacheMap[t];
      return !cached || (now - cached.getTime()) > CACHE_TTL_MS;
    });

    if (stale.length === 0) {
      return NextResponse.json({ success: true, synced: [], message: 'Semua cache masih segar' });
    }

    const sp = getSPClient();
    const results: string[] = [];
    const errors: string[] = [];

    for (const tabel of stale) {
      try {
        let summary: Record<string, unknown>;
        switch (tabel) {
          case 'sawah_status':
            summary = await fetchSawahSummary(sp);
            break;
          case 'kolam_budidaya':
            summary = await fetchKolamSummary(sp);
            break;
          case 'nelayan_tangkap':
            summary = await fetchNelayanSummary(sp);
            break;
          case 'poktan_kwt':
            summary = await fetchPoktanSummary(sp);
            break;
          case 'pohon_sukun':
            summary = await fetchPohonSukunSummary(sp);
            break;
          case 'komoditas_hortikultura':
          case 'komoditas_palawija':
            summary = await fetchKomoditasSummary(sp, tabel);
            break;
          default:
            continue;
        }

        const { error: upsertError } = await supabase
          .from('sp_cache_data')
          .upsert(
            { tabel_sumber: tabel, data: summary, fetched_at: new Date().toISOString() },
            { onConflict: 'tabel_sumber' }
          );

        if (upsertError) {
          errors.push(`${tabel}: upsert error — ${upsertError.message}`);
        } else {
          results.push(tabel);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${tabel}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      synced: results,
      errors,
      message: `Sync selesai: ${results.length} tabel diperbarui${errors.length > 0 ? `, ${errors.length} error` : ''}`
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// GET — cek status cache saat ini
export async function GET() {
  const { data } = await supabase
    .from('sp_cache_data')
    .select('tabel_sumber, fetched_at, data')
    .order('fetched_at', { ascending: false });

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = ((data || []) as any[]).map(r => ({
    tabel: r.tabel_sumber,
    fetched_at: r.fetched_at,
    age_minutes: Math.round((now - new Date(r.fetched_at).getTime()) / 60000),
    is_stale: (now - new Date(r.fetched_at).getTime()) > CACHE_TTL_MS,
    row_count: typeof r.data === 'object' && r.data !== null && 'total' in r.data
      ? r.data.total
      : typeof r.data === 'object' && r.data !== null && 'total_sawah' in r.data
        ? r.data.total_sawah
        : '?'
  }));

  return NextResponse.json({ status, cached_tables: status.length });
}
