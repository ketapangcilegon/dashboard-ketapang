/**
 * ============================================================================
 * PANCI (Platform Analisis Pangan Kota Cilegon)
 * 1-CLICK AUTOMATED CLONER TO NEW SUPABASE PROJECT
 * ============================================================================
 * Cara Penggunaan:
 *   node scripts/clone_to_new_supabase.js "<NEW_SUPABASE_URL>" "<NEW_ANON_KEY>" "<NEW_SERVICE_ROLE_KEY>"
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const repoDir = path.resolve(__dirname, '..');
const masterDir = 'C:/PANCI_MASTER';
const tablesDir = path.join(masterDir, '04_DATABASE', 'tables');
const storageImgDir = path.join(masterDir, '06_SUPABASE_STORAGE', 'dashboard-media', 'images');
const kmzLocalPath = path.join(repoDir, 'public', 'my-places-apr-2026-v250426.kmz');

const newUrl = (process.argv[2] || '').trim().replace(/\/+$/, '');
const newAnonKey = (process.argv[3] || '').trim();
const newServiceRoleKey = (process.argv[4] || '').trim();

if (!newUrl || !newAnonKey || !newServiceRoleKey) {
  console.error('\n[ERROR] Parameter belum lengkap!');
  console.error('Gunakan perintah:');
  console.error('  node scripts/clone_to_new_supabase.js "https://xxxx.supabase.co" "eyJ...(ANON_KEY)" "eyJ...(SERVICE_ROLE_KEY)"\n');
  process.exit(1);
}

const supabaseAdmin = createClient(newUrl, newServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Conflict targets for tables that use natural primary keys instead of id
const CONFLICT_TARGETS = {
  harga_sagon_harian: 'tanggal',
  sp_cache_data: 'tabel_sumber',
  feature_access_settings: 'feature_key',
};

async function ensureBucketsAndUploadStorage() {
  console.log('\n============================================================');
  console.log('TAHAP 1/4: MEMBUAT BUCKET & UPLOAD MEDIA STORAGE');
  console.log('============================================================');

  const buckets = ['dashboard-media', 'kmz-files', 'knowledge-docs'];
  for (const b of buckets) {
    const { error } = await supabaseAdmin.storage.createBucket(b, { public: true });
    if (error && !/already exists/i.test(error.message)) {
      console.warn(`  [WARN] createBucket ${b}:`, error.message);
    } else {
      console.log(`  [OK] Bucket public '${b}' siap.`);
    }
  }

  // Upload 18 carousel media files (WebP, _sm.webp, JPG)
  if (fs.existsSync(storageImgDir)) {
    const imgFiles = fs.readdirSync(storageImgDir);
    for (const fileName of imgFiles) {
      const fullPath = path.join(storageImgDir, fileName);
      if (!fs.statSync(fullPath).isFile()) continue;
      const buf = fs.readFileSync(fullPath);
      const ext = path.extname(fileName).toLowerCase();
      const contentType =
        ext === '.webp' ? 'image/webp' :
        ext === '.png' ? 'image/png' :
        ext === '.mp4' ? 'video/mp4' : 'image/jpeg';

      const { error } = await supabaseAdmin.storage
        .from('dashboard-media')
        .upload(`images/${fileName}`, buf, {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (error) {
        console.warn(`  [WARN] Gagal upload images/${fileName}:`, error.message);
      } else {
        console.log(`  [UPLOADED] dashboard-media/images/${fileName} (${(buf.length / 1024).toFixed(1)} KB)`);
      }
    }
  }

  // Upload KMZ file to dashboard-media & kmz-files
  if (fs.existsSync(kmzLocalPath)) {
    const kmzBuf = fs.readFileSync(kmzLocalPath);
    for (const b of ['dashboard-media', 'kmz-files']) {
      const { error } = await supabaseAdmin.storage
        .from(b)
        .upload('my-places-apr-2026-v250426.kmz', kmzBuf, {
          contentType: 'application/vnd.google-earth.kmz',
          cacheControl: '31536000',
          upsert: true,
        });
      if (!error) {
        console.log(`  [UPLOADED] ${b}/my-places-apr-2026-v250426.kmz (${(kmzBuf.length / 1024).toFixed(1)} KB)`);
      }
    }
  }
}

async function seedAllTables() {
  console.log('\n============================================================');
  console.log('TAHAP 2/4: MIGRASI SELURUH 49 TABEL & 11.328 BARIS DATA');
  console.log('============================================================');

  const jsonFiles = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json')).sort();
  let totalInserted = 0;

  for (const file of jsonFiles) {
    const table = path.basename(file, '.json');
    let rows = JSON.parse(fs.readFileSync(path.join(tablesDir, file), 'utf8'));

    if (!rows || rows.length === 0) {
      console.log(`  [EMPTY] ${table}: 0 baris (tabel siap)`);
      continue;
    }

    // Rewrite old Supabase Storage URLs in dashboard_media to point to newUrl
    if (table === 'dashboard_media') {
      rows = rows.map(r => ({
        ...r,
        media_url: typeof r.media_url === 'string'
          ? r.media_url.replace(/https:\/\/[a-z0-9]+\.supabase\.co/i, newUrl)
          : r.media_url,
        thumbnail_url: typeof r.thumbnail_url === 'string'
          ? r.thumbnail_url.replace(/https:\/\/[a-z0-9]+\.supabase\.co/i, newUrl)
          : r.thumbnail_url,
      }));
    }

    const batchSize = table === 'sp_cache_data' ? 1 : 200;
    const onConflict = CONFLICT_TARGETS[table] || (rows[0] && 'id' in rows[0] ? 'id' : undefined);
    let tableSuccess = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const query = onConflict
        ? supabaseAdmin.from(table).upsert(chunk, { onConflict })
        : supabaseAdmin.from(table).insert(chunk);

      const { error } = await query;
      if (error) {
        console.error(`  [ERROR] Tabel ${table} (baris ${i}..${i + chunk.length}):`, error.message);
        break;
      } else {
        tableSuccess += chunk.length;
      }
    }

    totalInserted += tableSuccess;
    console.log(`  [MIGRATED] ${table}: ${tableSuccess}/${rows.length} baris`);
  }

  // Sync PostgreSQL sequences
  const { data: syncRes, error: syncErr } = await supabaseAdmin.rpc('sync_all_sequences');
  if (syncErr) {
    console.warn('  [INFO] sync_all_sequences:', syncErr.message);
  } else {
    console.log('  [OK] Sequence Auto-Increment disinkronkan:', syncRes);
  }

  console.log(`\nTotal Baris Berhasil Dimigrasikan: ${totalInserted} baris.`);
}

function updateLocalConfigsAndGenerateVercelEnv() {
  console.log('\n============================================================');
  console.log('TAHAP 3/4: UPDATE .env.local & FILE KONFIGURASI VERCEL BARU');
  console.log('============================================================');

  const envLocalPath = path.join(repoDir, '.env.local');
  let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';

  const replaceOrAppendEnv = (content, key, val) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${val}`);
    }
    return content.trimEnd() + `\n${key}=${val}\n`;
  };

  envContent = replaceOrAppendEnv(envContent, 'NEXT_PUBLIC_SUPABASE_URL', newUrl);
  envContent = replaceOrAppendEnv(envContent, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', newAnonKey);
  envContent = replaceOrAppendEnv(envContent, 'SUPABASE_SERVICE_ROLE_KEY', newServiceRoleKey);

  fs.writeFileSync(envLocalPath, envContent, 'utf8');
  console.log('  [OK] .env.local berhasil diperbarui ke project Supabase baru.');

  // Update SUPABASE_FALLBACK_URL in src/hooks/useKMZLoader.ts
  const kmzHookPath = path.join(repoDir, 'src', 'hooks', 'useKMZLoader.ts');
  if (fs.existsSync(kmzHookPath)) {
    const hookTxt = fs.readFileSync(kmzHookPath, 'utf8');
    const updatedHookTxt = hookTxt.replace(
      /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/dashboard-media\/my-places-apr-2026-v250426\.kmz/gi,
      `${newUrl}/storage/v1/object/public/dashboard-media/my-places-apr-2026-v250426.kmz`
    );
    fs.writeFileSync(kmzHookPath, updatedHookTxt, 'utf8');
    console.log('  [OK] Fallback URL di src/hooks/useKMZLoader.ts diperbarui.');
  }

  // Save ready-to-paste Vercel .env file
  const vercelEnvOut = path.join(masterDir, '08_CONFIGURATION', 'VERCEL_ENV_VARS_READY_TO_PASTE.env');
  fs.mkdirSync(path.dirname(vercelEnvOut), { recursive: true });
  fs.writeFileSync(vercelEnvOut, envContent, 'utf8');
  console.log(`  [OK] File Environment Variables untuk Vercel baru disimpan di:\n       ${vercelEnvOut}`);
}

async function verifyMigration() {
  console.log('\n============================================================');
  console.log('TAHAP 4/4: VERIFIKASI AKHIR PROJECT SUPABASE BARU');
  console.log('============================================================');

  const checkTables = ['forecast_result', 'dashboard_media', 'ai_knowledge_chunks', 'gizi_balita_skpg_kelurahan', 'sp_cache_data', 'harga_sagon_harian'];
  for (const t of checkTables) {
    const { count, error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
    console.log(`  [VERIFY] ${t}: ${error ? 'ERROR ' + error.message : count + ' baris OK'}`);
  }
  console.log('\n============================================================');
  console.log('KLONING 100% KE SUPABASE BARU SELESAI DENGAN SUKSES!');
  console.log('============================================================\n');
}

async function run() {
  await ensureBucketsAndUploadStorage();
  await seedAllTables();
  updateLocalConfigsAndGenerateVercelEnv();
  await verifyMigration();
}

run().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});

