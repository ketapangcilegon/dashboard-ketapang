const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf-8');
const getEnv = (k) => { const m = env.match(new RegExp(k + '=(.*)')); return m ? m[1].trim() : ''; };

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const ALL_KNOWN_TABLES = [
  'forecast_result',
  'dashboard_media',
  'knowledge_documents',
  'feature_access_settings',
  'ai_knowledge_chunks',
  'ai_knowledge_docs',
  'cuaca_ml',
  'cv_beras_bulanan',
  'cv_beras_data',
  'fsva_matang',
  'gizi_balita',
  'gizi_balita_skpg_kelurahan',
  'harga_pangan_ml',
  'ikp_data',
  'inflasi_ml',
  'intervensi_kelurahan',
  'ketersediaan_energi_data',
  'ketersediaan_pangan',
  'ketersediaan_protein_data',
  'konsumsi_energi_data',
  'konsumsi_protein_data',
  'page_visits',
  'pou_data',
  'pph_data',
  'produksi_beras_data',
  'skpg_matang',
  'sp_cache_data',
  'pasokan_beras',
  'data_skpg',
  'profiles'
];

async function dumpTables() {
  const targetDir = 'C:/PANCI_MASTER/04_DATABASE/tables';
  const dumpSummary = {};
  let totalRows = 0;

  for (const table of ALL_KNOWN_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        dumpSummary[table] = { status: 'ERROR', error: error.message };
      } else {
        const rows = data || [];
        totalRows += rows.length;
        dumpSummary[table] = { status: 'SUCCESS', count: rows.length };
        
        // Save JSON
        fs.writeFileSync(path.join(targetDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf-8');
        
        // Save CSV if rows exist
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          const csvLines = [headers.join(',')];
          for (const row of rows) {
            const vals = headers.map(h => {
              const v = row[h];
              if (v === null || v === undefined) return '';
              const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
              return '"' + str.replace(/"/g, '""') + '"';
            });
            csvLines.push(vals.join(','));
          }
          fs.writeFileSync(path.join(targetDir, `${table}.csv`), csvLines.join('\n'), 'utf-8');
        }
      }
    } catch (err) {
      dumpSummary[table] = { status: 'EXCEPTION', error: err.message };
    }
  }

  // Save dump summary
  fs.writeFileSync('C:/PANCI_MASTER/04_DATABASE/tables_inventory.json', JSON.stringify(dumpSummary, null, 2), 'utf-8');

  console.log('TABLE DUMP COMPLETE. Total Rows Dumped:', totalRows);
  console.log(JSON.stringify(dumpSummary, null, 2));
}

dumpTables();

