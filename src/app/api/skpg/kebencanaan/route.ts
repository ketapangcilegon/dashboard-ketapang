import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { classifyKebencanaan, normalizeKecamatanName } from '@/lib/skpg/scoring';
import { normalizeKelurahanName, getKecamatanByKelurahan } from '@/lib/wilayah';

export interface KebencanaanRow {
  tahun: number;
  bulan: number;
  kecamatan: string;
  kelurahan: string;
  banjir: number;
  cuaca_ekstrem: number;
  tanah_longsor: number;
  gelombang_pasang_abrasi: number;
  kekeringan: number;
  gempa_bumi: number;
  tsunami: number;
  erupsi_gunung_api: number;
  karhutla: number;
  total_kejadian: number;
  level_bencana: 'PUTIH' | 'HIJAU' | 'ORANYE' | 'MERAH';
  keterangan: string;
}

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function numCol(row: Record<string, unknown>, aliases: string[]): number {
  for (const key of Object.keys(row)) {
    const kNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const a of aliases) {
      if (kNorm === a || kNorm.includes(a)) {
        const val = parseInt(String(row[key] ?? '0'), 10);
        return Number.isNaN(val) ? 0 : Math.max(0, val);
      }
    }
  }
  return 0;
}

function strCol(row: Record<string, unknown>, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    const kNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const a of aliases) {
      if (kNorm === a || kNorm.includes(a)) {
        return String(row[key] ?? '').trim();
      }
    }
  }
  return '';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tahun = parseInt(searchParams.get('tahun') || '0', 10);
  const bulan = parseInt(searchParams.get('bulan') || '0', 10);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ success: true, rows: [], storageMode: 'local_only' });
  }

  let query = supabase.from('kebencanaan_skpg').select('*');
  if (tahun > 0) query = query.eq('tahun', tahun);
  if (bulan > 0) query = query.eq('bulan', bulan);

  const { data, error } = await query.order('kecamatan', { ascending: true });
  if (error) {
    // Jika tabel kebencanaan_skpg belum dibuat di Supabase, kembalikan status graceful agar UI pakai localStorage
    return NextResponse.json({
      success: true,
      rows: [],
      storageMode: 'local_only',
      note: 'Tabel kebencanaan_skpg belum tersedia di Supabase; data tersimpan di browser lokal.',
    });
  }

  return NextResponse.json({
    success: true,
    rows: data || [],
    storageMode: 'supabase',
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const defaultTahun = parseInt(String(formData.get('tahun') || new Date().getFullYear()), 10);
    const defaultBulan = parseInt(String(formData.get('bulan') || (new Date().getMonth() + 1)), 10);

    if (!file) {
      return NextResponse.json({ error: 'Berkas Excel (.xlsx) kebencanaan tidak ditemukan.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'File Excel kebencanaan kosong atau tidak memiliki baris data.' }, { status: 400 });
    }

    const parsedRows: KebencanaanRow[] = [];
    for (const r of rawRows) {
      const rawKel = strCol(r, ['kelurahan', 'desa']);
      const normKel = rawKel ? normalizeKelurahanName(rawKel) : '';
      const rawKec = strCol(r, ['kecamatan']);
      const kecFromKel = normKel ? getKecamatanByKelurahan(normKel) : '';
      const normKec = normalizeKecamatanName(rawKec) || normalizeKecamatanName(kecFromKel);
      if (!normKec) continue;

      const tahun = numCol(r, ['tahun']) || defaultTahun;
      const bulan = numCol(r, ['bulan']) || defaultBulan;

      const banjir = numCol(r, ['banjir']);
      const cuaca_ekstrem = numCol(r, ['cuacaekstrem', 'anginkencang', 'putingbeliung']);
      const tanah_longsor = numCol(r, ['tanahlongsor', 'longsor']);
      const gelombang_pasang_abrasi = numCol(r, ['gelombangpasang', 'abrasi']);
      const kekeringan = numCol(r, ['kekeringan']);
      const gempa_bumi = numCol(r, ['gempabumi', 'gempa']);
      const tsunami = numCol(r, ['tsunami']);
      const erupsi_gunung_api = numCol(r, ['erupsigunungapi', 'erupsi']);
      const karhutla = numCol(r, ['karhutla', 'kebakaranhutan', 'kebakaranlahan']);

      const explicitTotal = numCol(r, ['totalkejadian', 'jumlahkejadian', 'jumlahbencana']);
      const sumTypes =
        banjir +
        cuaca_ekstrem +
        tanah_longsor +
        gelombang_pasang_abrasi +
        kekeringan +
        gempa_bumi +
        tsunami +
        erupsi_gunung_api +
        karhutla;
      const total_kejadian = sumTypes > 0 ? sumTypes : explicitTotal;
      const level = classifyKebencanaan(total_kejadian).level;
      const keterangan = strCol(r, ['keterangan', 'catatan', 'dampak']);

      parsedRows.push({
        tahun,
        bulan,
        kecamatan: normKec,
        kelurahan: normKel,
        banjir,
        cuaca_ekstrem,
        tanah_longsor,
        gelombang_pasang_abrasi,
        kekeringan,
        gempa_bumi,
        tsunami,
        erupsi_gunung_api,
        karhutla,
        total_kejadian,
        level_bencana: level,
        keterangan,
      });
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ditemukan baris Kecamatan/Kelurahan Kota Cilegon yang valid pada file Excel.' },
        { status: 400 }
      );
    }

    // Coba simpan ke Supabase jika tabel kebencanaan_skpg tersedia
    let persistedToSupabase = false;
    const supabase = getSupabaseServer();
    if (supabase) {
      const periods = new Map<string, { tahun: number; bulan: number }>();
      parsedRows.forEach((row) => periods.set(`${row.tahun}-${row.bulan}`, { tahun: row.tahun, bulan: row.bulan }));

      let dbOk = true;
      for (const [, p] of periods) {
        const { error: delErr } = await supabase
          .from('kebencanaan_skpg')
          .delete()
          .eq('tahun', p.tahun)
          .eq('bulan', p.bulan);
        if (delErr) {
          dbOk = false;
          break;
        }
      }
      if (dbOk) {
        const { error: insErr } = await supabase.from('kebencanaan_skpg').insert(parsedRows);
        if (!insErr) persistedToSupabase = true;
      }
    }

    return NextResponse.json({
      success: true,
      persistedToSupabase,
      count: parsedRows.length,
      rows: parsedRows,
      message: persistedToSupabase
        ? `Berhasil mengunggah ${parsedRows.length} baris data kebencanaan SKPG ke database Supabase.`
        : `Berhasil membaca ${parsedRows.length} baris data kebencanaan SKPG (tersimpan di penyimpanan lokal browser; jalankan supabase/skpg_kebencanaan.sql bila ingin sinkron cloud).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
