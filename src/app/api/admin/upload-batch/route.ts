import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeKelurahanName } from '@/lib/wilayah';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, rows } = body as { type?: string; rows?: Record<string, unknown>[] };

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Parameter type dan rows wajib diisi serta tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const sb = getServiceClient();

    if (type === 'fsva_matang') {
      const dedupedMap = new Map<string, {
        nama_kelurahan: string;
        kode_kel_bps: string;
        ikp: number;
        periode: number;
      }>();
      const periodesSet = new Set<number>();

      for (const row of rows) {
        const rawKel = String(row['nama_kelurahan'] ?? row['kelurahan'] ?? '').trim();
        const kode_kel_bps = String(row['kode_kel_bps'] ?? '').trim();
        const ikp = parseFloat(String(row['ikp'] ?? '0')) || 0;
        const periode = parseInt(String(row['periode'] ?? '2026'), 10) || 2026;

        if (!rawKel || !kode_kel_bps) continue;

        const nama_kelurahan = normalizeKelurahanName(rawKel);
        periodesSet.add(periode);
        dedupedMap.set(`${periode}::${nama_kelurahan.toLowerCase()}`, {
          nama_kelurahan,
          kode_kel_bps,
          ikp,
          periode,
        });
      }

      const cleanRows = Array.from(dedupedMap.values());
      if (cleanRows.length === 0) {
        return NextResponse.json(
          { error: 'Tidak ada baris valid dengan kolom nama_kelurahan dan kode_kel_bps.' },
          { status: 400 }
        );
      }

      const periodes = Array.from(periodesSet);
      // Hapus data lama pada periode yang sama agar tidak terjadi duplikasi (172 baris)
      const { error: delError } = await sb
        .from('fsva_matang')
        .delete()
        .in('periode', periodes);

      if (delError) {
        return NextResponse.json(
          { error: `Gagal membersihkan data FSVA periode ${periodes.join(', ')}: ${delError.message}` },
          { status: 500 }
        );
      }

      const { error: insError } = await sb
        .from('fsva_matang')
        .insert(cleanRows);

      if (insError) {
        return NextResponse.json(
          { error: `Gagal menyimpan data FSVA Matang: ${insError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        count: cleanRows.length,
        periode: periodes[periodes.length - 1] || 2026,
      });
    }

    if (type === 'intervensi_kelurahan') {
      const dedupedMap = new Map<string, {
        no_urut: number;
        tahun: number;
        bulan: number;
        kode_kec_bps: string;
        nama_kecamatan: string;
        kode_desa_bps: string;
        nama_kelurahan: string;
        gpm: number;
        bantuan_pangan: number;
      }>();
      const periodPairs = new Map<string, { tahun: number; bulan: number }>();

      for (const row of rows) {
        const no_urut = parseInt(String(row['no_urut'] ?? '0'), 10) || 0;
        const tahun = parseInt(String(row['Tahun'] ?? row['tahun'] ?? '2026'), 10) || 2026;
        const bulan = parseInt(String(row['Bulan'] ?? row['bulan'] ?? '1'), 10) || 1;
        const kode_kec_bps = String(row['kode_kec_bps'] ?? '').trim();
        const nama_kecamatan = String(row['nama_kecamatan'] ?? '').trim();
        const kode_desa_bps = String(row['kode_desa_bps'] ?? '').trim();
        const rawKel = String(row['nama_kelurahan'] ?? '').trim();
        const gpm = parseInt(String(row['GPM'] ?? row['gpm'] ?? '0'), 10) || 0;
        const bantuan_pangan = parseInt(String(row['bantuan_pangan'] ?? '0'), 10) || 0;

        if (!rawKel) continue;
        const nama_kelurahan = normalizeKelurahanName(rawKel);

        periodPairs.set(`${tahun}-${bulan}`, { tahun, bulan });
        dedupedMap.set(`${tahun}-${bulan}::${nama_kelurahan.toLowerCase()}`, {
          no_urut,
          tahun,
          bulan,
          kode_kec_bps,
          nama_kecamatan,
          kode_desa_bps,
          nama_kelurahan,
          gpm,
          bantuan_pangan,
        });
      }

      const cleanRows = Array.from(dedupedMap.values());
      if (cleanRows.length === 0) {
        return NextResponse.json(
          { error: 'Tidak ada baris valid dengan kolom nama_kelurahan.' },
          { status: 400 }
        );
      }

      for (const { tahun, bulan } of periodPairs.values()) {
        await sb
          .from('intervensi_kelurahan')
          .delete()
          .eq('tahun', tahun)
          .eq('bulan', bulan);
      }

      const { error: insError } = await sb
        .from('intervensi_kelurahan')
        .insert(cleanRows);

      if (insError) {
        return NextResponse.json(
          { error: `Gagal menyimpan data Intervensi Kelurahan: ${insError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        count: cleanRows.length,
      });
    }

    return NextResponse.json({ error: `Tipe batch tidak dikenali: ${type}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan internal server.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
