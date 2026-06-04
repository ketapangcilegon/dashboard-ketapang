const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env variables manually if dotenv is not used
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/['"]/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Upload] Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadSupabase() {
  console.log('[Upload] Menyiapkan unggahan ke Supabase...');

  if (!fs.existsSync('./ml_dataset.csv')) {
    console.error('[Upload] Error: ml_dataset.csv tidak ditemukan.');
    process.exit(1);
  }

  const csvContent = fs.readFileSync('./ml_dataset.csv', 'utf8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    console.error('[Upload] Error: File CSV kosong atau tidak ada data.');
    process.exit(1);
  }

  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const val = values[j].trim();
      // Only set if not empty string
      if (val !== '') {
        row[headers[j]] = parseInt(val, 10);
      } else {
        row[headers[j]] = null;
      }
    }
    records.push(row);
  }

  console.log(`[Upload] Membaca ${records.length} baris dari CSV.`);

  try {
    // We will use an upsert with ON CONFLICT (tahun, bulan)
    // But since Supabase REST API handles bulk upsert easily if primary key is known...
    // The user's SQL has `UNIQUE(tahun, bulan)`, so we can use upsert with onConflict.
    
    console.log('[Upload] Mengirim data ke Supabase (tabel: harga_pangan_ml)...');
    
    const { data, error } = await supabase
      .from('harga_pangan_ml')
      .upsert(records, { onConflict: 'tahun, bulan' });

    if (error) {
      throw error;
    }

    console.log('[Upload] Sinkronisasi ke Supabase BERHASIL!');
    
  } catch (error) {
    console.error('[Upload] Terjadi kesalahan saat upload ke Supabase:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadSupabase();
}

module.exports = uploadSupabase;
