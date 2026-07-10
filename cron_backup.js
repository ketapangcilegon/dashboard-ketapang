/**
 * cron_backup.js
 * 
 * Script Node.js mandiri untuk membackup data rata-rata harga pangan 3 komoditas 
 * dari SAGON Cilegon langsung ke database Supabase.
 * 
 * Aturan Penjadwalan:
 * Jalankan script ini setiap akhir bulan pukul 23:30 WIB.
 * 
 * Cara pasang di Windows Task Scheduler:
 * 1. Buka Task Scheduler -> Create Task.
 * 2. Trigger: Monthly -> Pada hari terakhir setiap bulan pukul 23:30.
 * 3. Action: Start a program -> Program: "node", Arguments: "cron_backup.js", Start in: "[path_ke_folder_dashboard_ketapang]".
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Disable self-signed SSL verification for government website crawling
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load credentials
let supabaseUrl = '';
let supabaseAnonKey = '';
let adminEmail = '';
let adminPassword = '';

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const dotenvContent = fs.readFileSync(envPath, 'utf-8');
    dotenvContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] ? match[2].trim() : '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        
        if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
        if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = value;
        if (match[1] === 'ADMIN_EMAIL') adminEmail = value;
        if (match[1] === 'ADMIN_PASSWORD') adminPassword = value;
      }
    });
  }
} catch (err) {
  console.error("Failed to read credentials from .env.local:", err.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
  console.error("❌ Required env variables are missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const KECAMATANS = ['Cibeber', 'Cilegon', 'Pulomerak', 'Ciwandan', 'Jombang', 'Gerogol', 'Purwakarta', 'Citangkil'];
const FALLBACKS_2026_MARKETS = {
  '1': { beras: 14000, minyak: 21032, telur: 31967 }, // Kranggot
  '2': { beras: 13500, minyak: 22000, telur: 30033 }, // Blok F
  '3': { beras: 14000, minyak: 21032, telur: 31967 }  // Merak
};

async function scrapeMarketLive(marketId) {
  const result = { beras: [], minyak: [], telur: [] };
  try {
    const body = new URLSearchParams({
      pasar: marketId,
      tahun_pertama: '2025',
      tahun_kedua: '2026',
      daterange: '01/01/2025 - 12/31/2026'
    });

    const res = await fetch('https://sagon.cilegon.go.id/infografis/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    $('div.card-header').each((_, header) => {
      const headerText = $(header).find('strong').text().trim();
      if (!headerText) return;

      let matchedKey = null;
      if (['beras medium', 'beras'].some(alias => headerText.toLowerCase().includes(alias))) matchedKey = 'beras';
      else if (['minyak goreng kemasan', 'minyak kemasan', 'minyak'].some(alias => headerText.toLowerCase().includes(alias))) matchedKey = 'minyak';
      else if (['telur ayam ras', 'telur ayam', 'telur'].some(alias => headerText.toLowerCase().includes(alias))) matchedKey = 'telur';

      if (!matchedKey) return;

      const parent = $(header).parent();
      let scriptText = '';
      parent.find('script').each((_, scr) => {
        const text = $(scr).html() || '';
        if (text.includes('series:')) scriptText = text;
      });

      if (!scriptText.includes('series:')) return;

      const seriesRegex = /name:\s*['"](2025|2026)['"],\s*data:\s*\[([^\]]+)\]/g;
      let match;
      while ((match = seriesRegex.exec(scriptText)) !== null) {
        const year = match[1];
        const dataStr = match[2];
        const dataArr = dataStr.split(',').map(val => {
          const num = parseInt(val.trim().replace(/['"]/g, ''), 10);
          return isNaN(num) ? 0 : num;
        });

        if (year === '2026') {
          result[matchedKey] = dataArr;
        }
      }
    });
  } catch (err) {
    console.warn(`⚠️ Warning: Failed live scraping for market ${marketId}, using fallbacks:`, err.message);
  }
  return result;
}

async function run() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed (1-12)
  const monthIdx = month - 1; // 0-indexed array

  console.log(`[Backup Cron] Starting backup for: ${year}/${month} (${now.toLocaleString('id-ID')})`);
  console.log('🔄 Scraping live data from SAGON Cilegon...');

  const [m1, m2, m3] = await Promise.all([
    scrapeMarketLive('1'),
    scrapeMarketLive('2'),
    scrapeMarketLive('3')
  ]);

  const p1 = {
    beras: m1.beras[monthIdx] || FALLBACKS_2026_MARKETS['1'].beras,
    minyak: m1.minyak[monthIdx] || FALLBACKS_2026_MARKETS['1'].minyak,
    telur: m1.telur[monthIdx] || FALLBACKS_2026_MARKETS['1'].telur
  };
  const p2 = {
    beras: m2.beras[monthIdx] || FALLBACKS_2026_MARKETS['2'].beras,
    minyak: m2.minyak[monthIdx] || FALLBACKS_2026_MARKETS['2'].minyak,
    telur: m2.telur[monthIdx] || FALLBACKS_2026_MARKETS['2'].telur
  };
  const p3 = {
    beras: m3.beras[monthIdx] || FALLBACKS_2026_MARKETS['3'].beras,
    minyak: m3.minyak[monthIdx] || FALLBACKS_2026_MARKETS['3'].minyak,
    telur: m3.telur[monthIdx] || FALLBACKS_2026_MARKETS['3'].telur
  };

  const pricesCur = {
    Cibeber: p2,
    Cilegon: p2,
    Pulomerak: p3,
    Gerogol: p3,
    Ciwandan: p1,
    Jombang: p1,
    Purwakarta: p1,
    Citangkil: p1
  };

  // Construct DB records
  const records = Object.entries(pricesCur).map(([kec, p]) => ({
    tahun: year,
    bulan: month,
    kecamatan: kec,
    beras: p.beras,
    jagung: 0,
    gula: 0,
    minyak: p.minyak,
    daging: 0,
    telur: p.telur
  }));

  console.log('🔑 Authenticating with Supabase...');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (signInError) {
    console.error('❌ Authentication failed:', signInError.message);
    process.exit(1);
  }

  console.log('⬆️  Upserting prices into `harga_komoditas_skpg`...');
  const { error: upsertError } = await supabase
    .from('harga_komoditas_skpg')
    .upsert(records, { onConflict: 'tahun, bulan, kecamatan' });

  if (upsertError) {
    console.error('❌ Backup failed:', upsertError.message);
    process.exit(1);
  }

  console.log('🎉 Done! Backup successfully completed.');
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
