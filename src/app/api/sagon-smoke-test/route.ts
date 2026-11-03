import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SAGON_MAIN_URL = 'https://sagon.cilegon.go.id/';
const SAGON_LAPORAN_URL = 'https://sagon.cilegon.go.id/laporan';
const SAGON_INFOGRAFIS_URL = 'https://sagon.cilegon.go.id/infografis/filter';

const TARGET_INFOGRAFIS_COMMODITIES: Record<string, string> = {
  'Beras Medium (Cimanuk)': 'harga_beras',
  'Bawang Merah': 'harga_bawang_merah',
  'Bawang Putih Bonggol': 'harga_bawang_putih',
  'Cabe Merah Besar': 'harga_cabai_merah',
  'Cabe Rawit Merah': 'harga_cabai_rawit',
  'Daging Sapi Murni': 'harga_daging_sapi',
  'Daging Ayam Ras': 'harga_daging_ayam_ras',
  'Telur Ayam Ras': 'harga_telur_ayam_ras',
  'Gula Pasir': 'harga_gula_pasir',
  'Minyak Goreng Kemasan': 'harga_minyak_goreng',
};

export interface SmokeIndicatorResult {
  id: string;
  name: string;
  endpoint: string;
  selectorOrRule: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  latencyMs: number;
  httpStatus: number | null;
  summary: string;
  metrics: Record<string, string | number>;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  // Handle government self-signed certificate chains safely in Node runtime
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const startedAt = Date.now();
  const indicators: SmokeIndicatorResult[] = [];
  const samplePrices: { komoditas: string; harga: number; sumber: string }[] = [];

  // ============================================================================
  // INDIKATOR 1: Endpoint Harian Pasar Penciri (POST https://sagon.cilegon.go.id/)
  // ============================================================================
  {
    const t0 = Date.now();
    let httpStatus: number | null = null;
    try {
      let matchedRows = 0;
      let usedDate = formatDateYMD(new Date());
      let tableFound = false;

      // Cek hari ini hingga H-3 (jika hari ini belum ada input petugas pasar pagi)
      for (let offset = 0; offset <= 3; offset++) {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const dateStr = formatDateYMD(d);

        const body = new URLSearchParams({ id_pasar: '1', tanggal: dateStr });
        const res = await fetch(SAGON_MAIN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Dashboard-Ketapang-SmokeTest/2.5)',
          },
          body: body.toString(),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });

        httpStatus = res.status;
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);
        const hasTable = $('table.table-komoditi').length > 0;
        if (hasTable) {
          tableFound = true;
          let count = 0;
          $('table.table-komoditi tbody tr').each((_, row) => {
            const tds = $(row).find('td');
            if (tds.length === 4) {
              const name = $(tds[1]).text().trim();
              const rawPrice = $(tds[3]).text().replace(/[^0-9]/g, '');
              const price = parseInt(rawPrice, 10) || 0;
              if (name) count++;
              if (price > 0 && samplePrices.length < 4) {
                samplePrices.push({ komoditas: name, harga: price, sumber: `Pasar Kranggot (${dateStr})` });
              }
            }
          });
          if (count > 0) {
            matchedRows = count;
            usedDate = dateStr;
            break;
          }
        }
      }

      const latencyMs = Date.now() - t0;
      if (httpStatus === 200 && tableFound && matchedRows > 0) {
        indicators.push({
          id: 'daily_pasar_table',
          name: '1. Tabel Harian Pasar Penciri (Cheerio DOM)',
          endpoint: 'POST https://sagon.cilegon.go.id/',
          selectorOrRule: 'table.table-komoditi tbody tr (td.length === 4)',
          status: 'PASS',
          latencyMs,
          httpStatus,
          summary: `Struktur tabel valid. Berhasil mem-parsing ${matchedRows} baris komoditas pada tanggal ${usedDate}.`,
          metrics: {
            tanggal_uji: usedDate,
            baris_terbaca: matchedRows,
            selector_table: 'Ditemukan (OK)',
          },
        });
      } else if (httpStatus === 200) {
        indicators.push({
          id: 'daily_pasar_table',
          name: '1. Tabel Harian Pasar Penciri (Cheerio DOM)',
          endpoint: 'POST https://sagon.cilegon.go.id/',
          selectorOrRule: 'table.table-komoditi tbody tr (td.length === 4)',
          status: 'WARN',
          latencyMs,
          httpStatus,
          summary: `Server SAGON merespons HTTP 200, namun tabel komoditas hari ini (${usedDate}) belum terisi oleh petugas pasar.`,
          metrics: {
            tanggal_uji: usedDate,
            baris_terbaca: matchedRows,
            selector_table: tableFound ? 'Ada (Kosong)' : 'Belum Terbit Hari Ini',
          },
        });
      } else {
        indicators.push({
          id: 'daily_pasar_table',
          name: '1. Tabel Harian Pasar Penciri (Cheerio DOM)',
          endpoint: 'POST https://sagon.cilegon.go.id/',
          selectorOrRule: 'table.table-komoditi tbody tr (td.length === 4)',
          status: 'FAIL',
          latencyMs,
          httpStatus,
          summary: `Gagal menghubungi endpoint utama SAGON (HTTP ${httpStatus ?? 'Timeout'}).`,
          metrics: { baris_terbaca: 0 },
        });
      }
    } catch (err: unknown) {
      indicators.push({
        id: 'daily_pasar_table',
        name: '1. Tabel Harian Pasar Penciri (Cheerio DOM)',
        endpoint: 'POST https://sagon.cilegon.go.id/',
        selectorOrRule: 'table.table-komoditi tbody tr (td.length === 4)',
        status: 'FAIL',
        latencyMs: Date.now() - t0,
        httpStatus,
        summary: `Error jaringan/timeout: ${err instanceof Error ? err.message : String(err)}`,
        metrics: { baris_terbaca: 0 },
      });
    }
  }

  // ============================================================================
  // INDIKATOR 2: Endpoint Laporan Agregat Seluruh Pasar (POST /laporan)
  // ============================================================================
  {
    const t0 = Date.now();
    let httpStatus: number | null = null;
    try {
      let validPricesCount = 0;
      let totalRows = 0;
      let usedDate = formatDateYMD(new Date());
      let headerFound = false;

      for (let offset = 0; offset <= 3; offset++) {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const dateStr = formatDateYMD(d);

        const body = new URLSearchParams({
          id_pasar: 'semua',
          tanggal: dateStr,
          tanggal_akhir: dateStr,
        });

        const res = await fetch(SAGON_LAPORAN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Dashboard-Ketapang-SmokeTest/2.5)',
          },
          body: body.toString(),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });

        httpStatus = res.status;
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);

        let seluruhPasarColIndex = 3;
        $('table thead tr th, table tr th').each((idx, th) => {
          const text = $(th).text().trim().toUpperCase();
          if (text.includes('SELURUH PASAR') || text.includes('RATA-RATA') || text.includes('RATA RATA')) {
            seluruhPasarColIndex = idx;
            headerFound = true;
          }
        });

        let rowsWithPrice = 0;
        let trCount = 0;
        $('table tbody tr').each((_, row) => {
          const tds = $(row).find('td');
          if (tds.length >= 3) {
            trCount++;
            const targetTd = tds.length > seluruhPasarColIndex ? $(tds[seluruhPasarColIndex]) : $(tds[tds.length - 1]);
            const rawPrice = targetTd.text().trim().replace(/[^0-9]/g, '');
            const price = parseInt(rawPrice, 10) || 0;
            if (price > 0) rowsWithPrice++;
          }
        });

        if (rowsWithPrice > 0) {
          validPricesCount = rowsWithPrice;
          totalRows = trCount;
          usedDate = dateStr;
          break;
        }
      }

      const latencyMs = Date.now() - t0;
      if (httpStatus === 200 && validPricesCount > 0) {
        indicators.push({
          id: 'laporan_agregat_harian',
          name: '2. Agregat Laporan Harian Seluruh Pasar',
          endpoint: 'POST https://sagon.cilegon.go.id/laporan',
          selectorOrRule: 'table tbody tr + th[SELURUH PASAR / RATA-RATA]',
          status: 'PASS',
          latencyMs,
          httpStatus,
          summary: `Berhasil mengekstrak ${validPricesCount} harga rata-rata kota dari ${totalRows} baris komoditas (${usedDate}).`,
          metrics: {
            tanggal_uji: usedDate,
            komoditas_valid: `${validPricesCount} / ${totalRows}`,
            kolom_agregat: headerFound ? 'Terdeteksi Otomatis' : 'Default Kolom #4',
          },
        });
      } else {
        indicators.push({
          id: 'laporan_agregat_harian',
          name: '2. Agregat Laporan Harian Seluruh Pasar',
          endpoint: 'POST https://sagon.cilegon.go.id/laporan',
          selectorOrRule: 'table tbody tr + th[SELURUH PASAR / RATA-RATA]',
          status: httpStatus === 200 ? 'WARN' : 'FAIL',
          latencyMs,
          httpStatus,
          summary:
            httpStatus === 200
              ? 'Endpoint /laporan aktif, namun belum ada harga > Rp 0 pada rentang 3 hari terakhir.'
              : `Endpoint /laporan gagal diakses (HTTP ${httpStatus ?? 'Timeout'}).`,
          metrics: { komoditas_valid: validPricesCount },
        });
      }
    } catch (err: unknown) {
      indicators.push({
        id: 'laporan_agregat_harian',
        name: '2. Agregat Laporan Harian Seluruh Pasar',
        endpoint: 'POST https://sagon.cilegon.go.id/laporan',
        selectorOrRule: 'table tbody tr + th[SELURUH PASAR / RATA-RATA]',
        status: 'FAIL',
        latencyMs: Date.now() - t0,
        httpStatus,
        summary: `Error koneksi ke /laporan: ${err instanceof Error ? err.message : String(err)}`,
        metrics: { komoditas_valid: 0 },
      });
    }
  }

  // ============================================================================
  // INDIKATOR 3: Endpoint Grafik Bulanan Infografis & Regex Highcharts
  // ============================================================================
  {
    const t0 = Date.now();
    let httpStatus: number | null = null;
    try {
      const body = new URLSearchParams({
        pasar: '1',
        tahun_pertama: '2025',
        tahun_kedua: '2026',
        daterange: '01/01/2025 - 12/31/2026',
      });

      const res = await fetch(SAGON_INFOGRAFIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Dashboard-Ketapang-SmokeTest/2.5)',
        },
        body: body.toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });

      httpStatus = res.status;
      const html = await res.text();
      const $ = cheerio.load(html);
      const cardHeaders = $('div.card-header');

      let mappedCommoditiesCount = 0;
      let parsedSeriesCount = 0;

      cardHeaders.each((_, header) => {
        const headerText = $(header).find('strong').text().trim();
        if (!headerText) return;
        if (TARGET_INFOGRAFIS_COMMODITIES[headerText]) {
          mappedCommoditiesCount++;
        }

        let scriptText = '';
        $(header)
          .parent()
          .find('script')
          .each((__, scr) => {
            const htmlText = $(scr).html() || '';
            if (htmlText.includes('series:')) {
              scriptText = htmlText;
            }
          });

        if (scriptText) {
          const seriesRegex = /name:\s*['"]([^'"]+)['"],\s*data:\s*\[([^\]]+)\]/g;
          let match;
          while ((match = seriesRegex.exec(scriptText)) !== null) {
            parsedSeriesCount++;
          }
        }
      });

      const latencyMs = Date.now() - t0;
      const isPass = res.ok && cardHeaders.length > 0 && mappedCommoditiesCount >= 8 && parsedSeriesCount > 0;

      indicators.push({
        id: 'infografis_monthly_series',
        name: '3. Parser Infografis Bulanan & Highcharts Series',
        endpoint: 'POST https://sagon.cilegon.go.id/infografis/filter',
        selectorOrRule: 'div.card-header strong + Regex /name: "...", data: [...]/',
        status: isPass ? 'PASS' : res.ok && mappedCommoditiesCount > 0 ? 'WARN' : 'FAIL',
        latencyMs,
        httpStatus,
        summary: isPass
          ? `DOM & Regex Highcharts normal. Ditemukan ${cardHeaders.length} card-header, ${mappedCommoditiesCount}/10 komoditas utama cocok, dan ${parsedSeriesCount} series grafik berhasil diekstrak.`
          : `Perhatian: Ditemukan ${cardHeaders.length} card-header dan ${mappedCommoditiesCount}/10 komoditas. Kemungkinan struktur DOM berubah.`,
        metrics: {
          card_headers: cardHeaders.length,
          komoditas_terpetakan: `${mappedCommoditiesCount} / 10`,
          series_grafik_terbaca: parsedSeriesCount,
        },
      });
    } catch (err: unknown) {
      indicators.push({
        id: 'infografis_monthly_series',
        name: '3. Parser Infografis Bulanan & Highcharts Series',
        endpoint: 'POST https://sagon.cilegon.go.id/infografis/filter',
        selectorOrRule: 'div.card-header strong + Regex /name: "...", data: [...]/',
        status: 'FAIL',
        latencyMs: Date.now() - t0,
        httpStatus,
        summary: `Gagal mem-parsing endpoint infografis SAGON: ${err instanceof Error ? err.message : String(err)}`,
        metrics: { card_headers: 0, komoditas_terpetakan: '0 / 10', series_grafik_terbaca: 0 },
      });
    }
  }

  // ============================================================================
  // INDIKATOR 4: Kesiapan Database Fallback Supabase (Zero-Blank-Screen Guarantee)
  // ============================================================================
  {
    const t0 = Date.now();
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const [{ count: dailyCount, data: latestDaily }, { count: skpgCount }] = await Promise.all([
        supabase
          .from('harga_sagon_harian')
          .select('tanggal', { count: 'exact' })
          .order('tanggal', { ascending: false })
          .limit(1),
        supabase.from('harga_komoditas_skpg').select('id', { count: 'exact', head: true }),
      ]);

      const latencyMs = Date.now() - t0;
      const latestDate = latestDaily?.[0]?.tanggal || '-';
      const hasFallback = (dailyCount || 0) > 0 || (skpgCount || 0) > 0;

      indicators.push({
        id: 'supabase_fallback_cache',
        name: '4. Kesiapan Cadangan Database (Supabase Fallback)',
        endpoint: 'Supabase PostgreSQL (harga_sagon_harian & harga_komoditas_skpg)',
        selectorOrRule: 'SELECT COUNT(*) & Last Synced Date',
        status: hasFallback ? 'PASS' : 'WARN',
        latencyMs,
        httpStatus: 200,
        summary: hasFallback
          ? `Sistem Fallback siap. Tersimpan ${dailyCount ?? 0} arsip harian (terakhir: ${latestDate}) & ${skpgCount ?? 0} baris bulanan SKPG.`
          : 'Tabel arsip fallback masih kosong.',
        metrics: {
          arsip_harian_rows: dailyCount ?? 0,
          tanggal_arsip_terakhir: latestDate,
          arsip_bulanan_skpg_rows: skpgCount ?? 0,
        },
      });
    } catch (err: unknown) {
      indicators.push({
        id: 'supabase_fallback_cache',
        name: '4. Kesiapan Cadangan Database (Supabase Fallback)',
        endpoint: 'Supabase PostgreSQL',
        selectorOrRule: 'SELECT COUNT(*)',
        status: 'WARN',
        latencyMs: Date.now() - t0,
        httpStatus: null,
        summary: `Gagal memeriksa tabel fallback: ${err instanceof Error ? err.message : String(err)}`,
        metrics: {},
      });
    }
  }

  const failCount = indicators.filter((i) => i.status === 'FAIL').length;
  const warnCount = indicators.filter((i) => i.status === 'WARN').length;
  const overallStatus: 'PASS' | 'WARN' | 'FAIL' =
    failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';

  return NextResponse.json({
    success: overallStatus !== 'FAIL',
    overallStatus,
    executedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - startedAt,
    indicators,
    samplePrices,
    automationSchedule: {
      dailyCron: {
        endpoint: '/api/harga-sagon',
        cronExpression: '30 23 * * * (UTC) / 06:30 WIB',
        frequency: '1x setiap hari (Otomatis Pagi)',
        triggerType: 'Vercel Cron Scheduler + On-Demand ISR (Revalidate maks 1x/jam saat halaman dibuka)',
      },
      monthlyEtlCron: {
        endpoint: '/api/etl-ml',
        cronExpression: '0 0 1 * * (UTC) / Tanggal 1 pukul 07:00 WIB',
        frequency: '1x setiap bulan (Awal Bulan)',
        triggerType: 'Vercel Cron Scheduler (Sinkronisasi Infografis SAGON Bulanan + Cuaca Open-Meteo + BPS)',
      },
      monthlyMlTrainCron: {
        endpoint: '/api/ml/train',
        cronExpression: '0 0 5 * * (UTC) / Tanggal 5 pukul 07:00 WIB',
        frequency: '1x setiap bulan + Reactive Trigger dari AutoSync bila ada selisih harga > Rp 3.000',
        triggerType: 'Vercel Cron Scheduler + Autonomous Drift Retraining',
      },
      cliCommand: 'npm run test:pipeline (menjalankan node test_sagon_pipeline.js)',
    },
  });
}

