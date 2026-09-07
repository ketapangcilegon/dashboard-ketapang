import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const KELURAHAN_CANONICAL: Record<string, { kel: string; kec: string }> = {
  'cibeber': { kel: 'Cibeber', kec: 'Cibeber' },
  'kedaleman': { kel: 'Kedaleman', kec: 'Cibeber' },
  'bulakan': { kel: 'Bulakan', kec: 'Cibeber' },
  'cikerai': { kel: 'Cikerai', kec: 'Cibeber' },
  'karangasem': { kel: 'Karang Asem', kec: 'Cibeber' },
  'karang asem': { kel: 'Karang Asem', kec: 'Cibeber' },
  'kalitimbang': { kel: 'Kalitimbang', kec: 'Cibeber' },

  'bagendung': { kel: 'Bagendung', kec: 'Cilegon' },
  'ciwedus': { kel: 'Ciwedus', kec: 'Cilegon' },
  'bendungan': { kel: 'Bendungan', kec: 'Cilegon' },
  'ketileng': { kel: 'Ketileng', kec: 'Cilegon' },
  'ciwaduk': { kel: 'Ciwaduk', kec: 'Cilegon' },

  'tamansari': { kel: 'Tamansari', kec: 'Pulomerak' },
  'taman sari': { kel: 'Tamansari', kec: 'Pulomerak' },
  'lebakgede': { kel: 'Lebakgede', kec: 'Pulomerak' },
  'lebak gede': { kel: 'Lebakgede', kec: 'Pulomerak' },
  'mekarsari': { kel: 'Mekarsari', kec: 'Pulomerak' },
  'mekar sari': { kel: 'Mekarsari', kec: 'Pulomerak' },
  'suralaya': { kel: 'Suralaya', kec: 'Pulomerak' },

  'banjarnegara': { kel: 'Banjar Negara', kec: 'Ciwandan' },
  'banjar negara': { kel: 'Banjar Negara', kec: 'Ciwandan' },
  'tegalratu': { kel: 'Tegal Ratu', kec: 'Ciwandan' },
  'tegal ratu': { kel: 'Tegal Ratu', kec: 'Ciwandan' },
  'kubangsari': { kel: 'Kubangsari', kec: 'Ciwandan' },
  'gunungsugih': { kel: 'Gunung Sugih', kec: 'Ciwandan' },
  'gunung sugih': { kel: 'Gunung Sugih', kec: 'Ciwandan' },
  'kepuh': { kel: 'Kepuh', kec: 'Ciwandan' },
  'randakari': { kel: 'Randakari', kec: 'Ciwandan' },

  'sukmajaya': { kel: 'Sukmajaya', kec: 'Jombang' },
  'jombangwetan': { kel: 'Jombang Wetan', kec: 'Jombang' },
  'jombang wetan': { kel: 'Jombang Wetan', kec: 'Jombang' },
  'masigit': { kel: 'Masigit', kec: 'Jombang' },
  'panggungrawi': { kel: 'Panggung Rawi', kec: 'Jombang' },
  'panggung rawi': { kel: 'Panggung Rawi', kec: 'Jombang' },
  'gedongdalem': { kel: 'Gedong Dalem', kec: 'Jombang' },
  'gedong dalem': { kel: 'Gedong Dalem', kec: 'Jombang' },

  'kotasari': { kel: 'Kotasari', kec: 'Gerogol' },
  'gerogol': { kel: 'Gerogol', kec: 'Gerogol' },
  'grogol': { kel: 'Gerogol', kec: 'Gerogol' },
  'rawaarum': { kel: 'Rawa Arum', kec: 'Gerogol' },
  'rawa arum': { kel: 'Rawa Arum', kec: 'Gerogol' },
  'gerem': { kel: 'Gerem', kec: 'Gerogol' },

  'ramanuju': { kel: 'Ramanuju', kec: 'Purwakarta' },
  'kotabumi': { kel: 'Kotabumi', kec: 'Purwakarta' },
  'kota bumi': { kel: 'Kotabumi', kec: 'Purwakarta' },
  'kebondalem': { kel: 'Kebon Dalem', kec: 'Purwakarta' },
  'kebon dalem': { kel: 'Kebon Dalem', kec: 'Purwakarta' },
  'purwakarta': { kel: 'Purwakarta', kec: 'Purwakarta' },
  'tegal bunder': { kel: 'Tegal Bunder', kec: 'Purwakarta' },
  'tegalbundar': { kel: 'Tegal Bunder', kec: 'Purwakarta' },
  'tegalbunder': { kel: 'Tegal Bunder', kec: 'Purwakarta' },
  'pabean': { kel: 'Pabean', kec: 'Purwakarta' },

  'warnasari': { kel: 'Warnasari', kec: 'Citangkil' },
  'deringo': { kel: 'Deringo', kec: 'Citangkil' },
  'dringo': { kel: 'Deringo', kec: 'Citangkil' },
  'kebonsari': { kel: 'Kebonsari', kec: 'Citangkil' },
  'tamanbaru': { kel: 'Taman Baru', kec: 'Citangkil' },
  'taman baru': { kel: 'Taman Baru', kec: 'Citangkil' },
  'lebakdenok': { kel: 'Lebak Denok', kec: 'Citangkil' },
  'lebak denok': { kel: 'Lebak Denok', kec: 'Citangkil' },
  'samangraya': { kel: 'Samangraya', kec: 'Citangkil' },
  'citangkil': { kel: 'Citangkil', kec: 'Citangkil' },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Berkas file Excel tidak ditemukan.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRows = XLSX.utils.sheet_to_json<any>(ws);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'Berkas Excel kosong atau lembar kerja tidak valid.' }, { status: 400 });
    }

    const firstRow = rawRows[0];
    const requiredFields = ['Tahun', 'Bulan', 'Kecamatan', 'Kelurahan', 'bb_sangat_kurang', 'bb_kurang', 'bb_normal', 'bb_lebih'];
    const missingFields = requiredFields.filter(f => !(f in firstRow));
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Format kolom template tidak sesuai. Kolom berikut hilang: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const adminEmail = process.env.ADMIN_EMAIL || 'ketapangcilegon@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'cilegon2026';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Auth as admin to satisfy RLS write permissions
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (authErr) {
      console.warn('Admin authentication warning:', authErr.message);
    }

    const periodsToClear = new Map<string, { tahun: number; bulan: number }>();
    for (const row of rawRows) {
      const tahun = parseInt(row['Tahun']) || 2026;
      const bulan = parseInt(row['Bulan']) || 7;
      const key = `${tahun}-${bulan}`;
      periodsToClear.set(key, { tahun, bulan });
    }

    // Clear existing target periods
    for (const [, { tahun, bulan }] of periodsToClear) {
      await supabase.from('gizi_balita_skpg_kelurahan').delete().eq('tahun', tahun).eq('bulan', bulan);
      await supabase.from('gizi_balita').delete().eq('tahun', tahun).eq('bulan', bulan);
      await supabase.from('gizi_balita_skpg').delete().eq('tahun', tahun).eq('bulan', bulan);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skpgKelurahanRows: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const giziBalitaRows: any[] = [];
    const kecAgg: Record<string, { bb_sangat_kurang: number; bb_kurang: number; bb_normal: number; bb_lebih: number; total_kurang: number; total_balita: number; tahun: number; bulan: number }> = {};

    for (const r of rawRows) {
      const rawKel = String(r['Kelurahan'] || '').trim().toLowerCase();
      const rawKec = String(r['Kecamatan'] || '').trim();
      const canon = KELURAHAN_CANONICAL[rawKel] || { kel: String(r['Kelurahan'] || '').trim(), kec: rawKec };

      const tahun = parseInt(r['Tahun']) || 2026;
      const bulan = parseInt(r['Bulan']) || 7;
      const bb_sangat_kurang = parseInt(r['bb_sangat_kurang']) || 0;
      const bb_kurang = parseInt(r['bb_kurang']) || 0;
      const bb_normal = parseInt(r['bb_normal']) || 0;
      const bb_lebih = parseInt(r['bb_lebih']) || 0;

      const total_balita = bb_sangat_kurang + bb_kurang + bb_normal + bb_lebih;
      const total_kurang = bb_sangat_kurang + bb_kurang;
      const nilai = total_balita > 0 ? parseFloat(((total_kurang / total_balita) * 100).toFixed(2)) : 0;
      const bobot = nilai >= 15 ? 1 : nilai >= 10 ? 2 : 3;
      const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';

      skpgKelurahanRows.push({
        tahun,
        bulan,
        kecamatan: canon.kec,
        kelurahan: canon.kel,
        bb_sangat_kurang,
        bb_kurang,
        bb_normal,
        bb_lebih,
        total_kurang,
        total_balita,
        nilai,
        bobot,
        status
      });

      giziBalitaRows.push({
        tahun,
        bulan,
        nama_kelurahan: canon.kel,
        gizi_sangat_kurang: bb_sangat_kurang,
        gizi_kurang: bb_kurang,
        gizi_normal: bb_normal,
        gizi_berlebih: bb_lebih
      });

      const kecKey = `${canon.kec}-${tahun}-${bulan}`;
      if (!kecAgg[kecKey]) {
        kecAgg[kecKey] = {
          bb_sangat_kurang: 0,
          bb_kurang: 0,
          bb_normal: 0,
          bb_lebih: 0,
          total_kurang: 0,
          total_balita: 0,
          tahun,
          bulan
        };
      }
      kecAgg[kecKey].bb_sangat_kurang += bb_sangat_kurang;
      kecAgg[kecKey].bb_kurang += bb_kurang;
      kecAgg[kecKey].bb_normal += bb_normal;
      kecAgg[kecKey].bb_lebih += bb_lebih;
      kecAgg[kecKey].total_kurang += total_kurang;
      kecAgg[kecKey].total_balita += total_balita;
    }

    const skpgKecamatanRows = Object.entries(kecAgg).map(([key, v]) => {
      const kecName = key.split('-')[0];
      const nilai = v.total_balita > 0 ? parseFloat(((v.total_kurang / v.total_balita) * 100).toFixed(2)) : 0;
      const bobot = nilai >= 15 ? 1 : nilai >= 10 ? 2 : 3;
      const status = bobot === 3 ? 'AMAN' : bobot === 2 ? 'WASPADA' : 'RENTAN';
      return {
        tahun: v.tahun,
        bulan: v.bulan,
        kecamatan: kecName,
        bb_sangat_kurang: v.bb_sangat_kurang,
        bb_kurang: v.bb_kurang,
        bb_normal: v.bb_normal,
        bb_lebih: v.bb_lebih,
        total_kurang: v.total_kurang,
        total_balita: v.total_balita,
        nilai,
        bobot,
        status
      };
    });

    const { error: insKelErr } = await supabase.from('gizi_balita_skpg_kelurahan').insert(skpgKelurahanRows);
    if (insKelErr) {
      throw new Error(`Gagal menyimpan ke gizi_balita_skpg_kelurahan: ${insKelErr.message}`);
    }

    const { error: insGiziErr } = await supabase.from('gizi_balita').insert(giziBalitaRows);
    if (insGiziErr) {
      throw new Error(`Gagal menyimpan ke gizi_balita: ${insGiziErr.message}`);
    }

    const { error: insKecErr } = await supabase.from('gizi_balita_skpg').insert(skpgKecamatanRows);
    if (insKecErr) {
      throw new Error(`Gagal menyimpan ke gizi_balita_skpg: ${insKecErr.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Upload berhasil! ${skpgKelurahanRows.length} data gizi balita SKPG berhasil diperbarui dan diterapkan ke analisis.`,
      count: skpgKelurahanRows.length
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('API SKPG Upload Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
