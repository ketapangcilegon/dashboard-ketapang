import { createClient } from '@supabase/supabase-js';
import { trainAndForecastAll } from './train_model';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

async function getAdminClient() {
  const client = createClient(supabaseUrl, supabaseKey);
  let token: string | undefined = undefined;
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminEmail = process.env.ADMIN_EMAIL || 'ketapangcilegon@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'cilegon2026';
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    if (authErr) {
      console.warn('[AutoSync] Admin login warning:', authErr.message);
    } else {
      token = authData.session?.access_token;
    }
  }
  return { client, token };
}

interface SagonDailyRow {
  tanggal: string;
  beras: number;
  minyak_goreng: number;
  telur: number;
  daging_ayam: number;
  gula_pasir: number;
  cabe_merah: number;
  bawang_merah: number;
  bawang_putih: number;
  cabe_rawit: number;
  daging_sapi: number;
}

interface MonthlyAgg {
  tahun: number;
  bulan: number;
  harga_beras: number;
  harga_bawang_merah: number;
  harga_bawang_putih: number;
  harga_cabai_merah: number;
  harga_cabai_rawit: number;
  harga_daging_sapi: number;
  harga_daging_ayam_ras: number;
  harga_telur_ayam_ras: number;
  harga_gula_pasir: number;
  harga_minyak_goreng: number;
}

/**
 * Sinkronisasi Otonom dari Arsip Harian SAGON ke Dataset Bulanan ML (`harga_pangan_ml`)
 * dan secara otomatis memperbarui model prediksi jika ada data bulanan baru.
 */
export async function autoSyncSagonToDataset(): Promise<{
  success: boolean;
  syncedMonths: string[];
  retrained: boolean;
  message: string;
}> {
  try {
    console.log('[AutoSync] Memulai agregasi otonom data harian SAGON ke dataset bulanan...');
    const { client: db, token } = await getAdminClient();

    // 1. Ambil data harian SAGON yang tersimpan di Supabase
    const { data: dailyRows, error: dailyErr } = await db
      .from('harga_sagon_harian')
      .select('*')
      .order('tanggal', { ascending: true });

    if (dailyErr || !dailyRows || dailyRows.length === 0) {
      console.warn('[AutoSync] Data harga_sagon_harian kosong atau gagal diambil:', dailyErr?.message);
      return { success: false, syncedMonths: [], retrained: false, message: 'Data arsip harian kosong' };
    }

    // 2. Kelompokkan data harian per Tahun-Bulan (YYYY-MM)
    const monthlyGroups: Record<string, SagonDailyRow[]> = {};
    dailyRows.forEach((row: SagonDailyRow) => {
      if (!row.tanggal) return;
      const key = row.tanggal.substring(0, 7); // e.g. "2026-08"
      if (!monthlyGroups[key]) monthlyGroups[key] = [];
      monthlyGroups[key].push(row);
    });

    // 3. Ambil data historis dari harga_pangan_ml untuk mengetahui baseline Juni 2026
    const { data: existingHp, error: hpErr } = await db
      .from('harga_pangan_ml')
      .select('*')
      .order('tahun', { ascending: true })
      .order('bulan', { ascending: true });

    if (hpErr) {
      console.error('[AutoSync] Gagal membaca harga_pangan_ml:', hpErr.message);
      return { success: false, syncedMonths: [], retrained: false, message: hpErr.message };
    }

    const june2026 = (existingHp || []).find(r => r.tahun === 2026 && r.bulan === 6);

    const rowsToUpsert: MonthlyAgg[] = [];
    const syncedMonths: string[] = [];

    // Hitung rata-rata per bulan dari data harian
    const computedMonthly: Record<string, MonthlyAgg> = {};
    for (const [ym, rows] of Object.entries(monthlyGroups)) {
      const [yearStr, monthStr] = ym.split('-');
      const tahun = parseInt(yearStr, 10);
      const bulan = parseInt(monthStr, 10);

      // Hanya proses tahun 2026 ke atas
      if (tahun < 2026) continue;

      const n = rows.length;
      if (n === 0) continue;

      const avg = (fn: (r: SagonDailyRow) => number) =>
        Math.round(rows.reduce((s, r) => s + (Number(fn(r)) || 0), 0) / n);

      computedMonthly[ym] = {
        tahun,
        bulan,
        harga_beras: avg(r => r.beras),
        harga_bawang_merah: avg(r => r.bawang_merah),
        harga_bawang_putih: avg(r => r.bawang_putih),
        harga_cabai_merah: avg(r => r.cabe_merah),
        harga_cabai_rawit: avg(r => r.cabe_rawit),
        harga_daging_sapi: avg(r => r.daging_sapi),
        harga_daging_ayam_ras: avg(r => r.daging_ayam),
        harga_telur_ayam_ras: avg(r => r.telur),
        harga_gula_pasir: avg(r => r.gula_pasir),
        harga_minyak_goreng: avg(r => r.minyak_goreng)
      };
    }

    // Periksa apakah ada bulan di antara Juni dan Agustus yang belum ada (yaitu Juli 2026 / 2026-07)
    // Jika Juli tidak ada di computedMonthly tapi ada Juni dan Agustus, lakukan interpolasi rata-rata
    if (!computedMonthly['2026-07'] && june2026 && computedMonthly['2026-08']) {
      const aug = computedMonthly['2026-08'];
      const interp = (keyJune: keyof typeof june2026, valAug: number) =>
        Math.round(((Number(june2026[keyJune]) || valAug) + valAug) / 2);

      computedMonthly['2026-07'] = {
        tahun: 2026,
        bulan: 7,
        harga_beras: interp('harga_beras', aug.harga_beras),
        harga_bawang_merah: interp('harga_bawang_merah', aug.harga_bawang_merah),
        harga_bawang_putih: interp('harga_bawang_putih', aug.harga_bawang_putih),
        harga_cabai_merah: interp('harga_cabai_merah', aug.harga_cabai_merah),
        harga_cabai_rawit: interp('harga_cabai_rawit', aug.harga_cabai_rawit),
        harga_daging_sapi: interp('harga_daging_sapi', aug.harga_daging_sapi),
        harga_daging_ayam_ras: interp('harga_daging_ayam_ras', aug.harga_daging_ayam_ras),
        harga_telur_ayam_ras: interp('harga_telur_ayam_ras', aug.harga_telur_ayam_ras),
        harga_gula_pasir: interp('harga_gula_pasir', aug.harga_gula_pasir),
        harga_minyak_goreng: interp('harga_minyak_goreng', aug.harga_minyak_goreng)
      };
      console.log('[AutoSync] Imputasi mulus untuk Juli 2026 (2026-07) berhasil dikonstruksi.');
    }

    for (const ym of Object.keys(computedMonthly).sort()) {
      // Kecualikan bulan berjalan jika baru tanggal 1 dan data belum genap 1 bulan
      const [y, m] = ym.split('-').map(Number);
      const currentDate = new Date();
      const isCurrentMonth = currentDate.getFullYear() === y && (currentDate.getMonth() + 1) === m;
      if (isCurrentMonth && computedMonthly[ym] && monthlyGroups[ym]?.length < 5) {
        // Bulan berjalan baru dimulai (kurang dari 5 hari data), gunakan data harian live untuk forecast, jangan jadikan monthly aggregate final
        continue;
      }

      rowsToUpsert.push(computedMonthly[ym]);
      syncedMonths.push(ym);
    }

    if (rowsToUpsert.length === 0) {
      return { success: true, syncedMonths: [], retrained: false, message: 'Tidak ada data bulanan baru yang perlu disinkronkan' };
    }

    // 4. Simpan ke database harga_pangan_ml (upsert)
    console.log(`[AutoSync] Mengunggah ${rowsToUpsert.length} baris agregasi ke harga_pangan_ml:`, syncedMonths);
    for (const row of rowsToUpsert) {
      const { error: upsertErr } = await db
        .from('harga_pangan_ml')
        .upsert(row, { onConflict: 'tahun, bulan' });

      if (upsertErr) {
        console.error(`[AutoSync] Gagal upsert ${row.tahun}-${row.bulan}:`, upsertErr.message);
      } else {
        console.log(`[AutoSync] ✅ Sukses upsert periode ${row.tahun}-${row.bulan} ke harga_pangan_ml.`);
      }
    }

    // 5. Cek apakah model peramalan ML perlu dilatih ulang (retrained)
    const { data: currentForecast } = await db
      .from('forecast_result')
      .select('komoditas, harga_aktual')
      .eq('komoditas', 'harga_bawang_merah')
      .single();

    let needRetrain = false;
    const augBawang = computedMonthly['2026-08']?.harga_bawang_merah;
    if (augBawang && (!currentForecast || Math.abs(currentForecast.harga_aktual - augBawang) > 3000)) {
      console.log(`[AutoSync] Terdeteksi perbedaan harga baseline (DB Forecast: ${currentForecast?.harga_aktual} vs Agt Aktual: ${augBawang}). Memicu retraining model ML otonom...`);
      needRetrain = true;
    }

    let retrained = false;
    if (needRetrain) {
      try {
        await trainAndForecastAll(token);
        retrained = true;
        console.log('✅ [AutoSync] Retraining model ML dan perbaruan forecast_result selesai!');
      } catch (trainErr: any) {
        console.error('[AutoSync] Error saat retraining ML:', trainErr?.message);
      }
    }

    return {
      success: true,
      syncedMonths,
      retrained,
      message: `Berhasil menyinkronkan ${syncedMonths.join(', ')} dan ${retrained ? 'melatih ulang model ML' : 'model ML sudah up-to-date'}.`
    };
  } catch (err: any) {
    console.error('[AutoSync] Terjadi kegagalan pada autoSyncSagonToDataset:', err?.message);
    return { success: false, syncedMonths: [], retrained: false, message: err?.message || 'Unknown error' };
  }
}
