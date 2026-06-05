const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const JSZip = require('jszip');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'harga_pangan',
  'ketersediaan_pangan',
  'gizi_masyarakat',
  'intervensi_pangan',
  'pou_data',
  'gizi_balita',
  'intervensi_kelurahan',
  'fsva_matang',
  'skpg_matang',
  'cv_beras_data',
  'pph_data',
  'produksi_beras_data',
  'konsumsi_energi_data',
  'konsumsi_protein_data',
  'ketersediaan_energi_data',
  'ketersediaan_protein_data',
  'ai_insights_cache',
  'harga_sagon_harian',
  'harga_pangan_ml',
  'cuaca_ml',
  'inflasi_ml',
  'ml_metrics',
  'kalender_ml',
  'forecast_result',
  'model_registry',
  'ikp_data'
];

const SCHEMA_FILES = [
  'supabase_schema.sql',
  'migrate_ml.sql',
  'migrate_cuaca.sql',
  'migrate_inflasi.sql',
  'migrate_kalender.sql',
  'migrate_forecast_result.sql',
  'migrate_gizi_balita.sql',
  'migrate_harga_sagon_harian.sql',
  'migrate_ikp.sql',
  'migrate_intervensi_kelurahan.sql',
  'migrate_kpi.sql',
  'migrate_matang.sql'
];

function formatSqlValue(val) {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (typeof val === 'object') {
    const str = JSON.stringify(val).replace(/'/g, "''");
    return `'${str}'::jsonb`;
  }
  if (typeof val === 'string') {
    const str = val.replace(/'/g, "''");
    return `'${str}'`;
  }
  return `'${val.toString().replace(/'/g, "''")}'`;
}

async function run() {
  console.log('=== STARTING SUPABASE & WORKSPACE BACKUP ===');
  
  let sqlContent = '';
  sqlContent += `-- ==========================================================\n`;
  sqlContent += `-- SUPABASE BACKUP DUMP - DASHBOARD KETAPANG\n`;
  sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
  sqlContent += `-- ==========================================================\n\n`;
  
  // 1. Append Schemas
  console.log('Loading schema files...');
  for (const file of SCHEMA_FILES) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`Appending schema: ${file}`);
      sqlContent += `-- --- SCHEMA FROM ${file} ---\n`;
      sqlContent += fs.readFileSync(filePath, 'utf8');
      sqlContent += '\n\n';
    } else {
      console.warn(`Warning: Schema file not found: ${file}`);
    }
  }
  
  // 2. Fetch and append data
  console.log('Fetching data from tables...');
  sqlContent += `-- ==========================================================\n`;
  sqlContent += `-- TABLE DATA INSERTS\n`;
  sqlContent += `-- ==========================================================\n\n`;
  
  for (const table of TABLES) {
    console.log(`Fetching ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        sqlContent += `-- ERROR FETCHING TABLE ${table}: ${error.message}\n\n`;
        continue;
      }
      
      sqlContent += `-- Data for table: ${table} (${data.length} rows)\n`;
      if (data.length > 0) {
        sqlContent += `DELETE FROM ${table};\n`;
        
        // Get all column names from the first row
        const cols = Object.keys(data[0]);
        const colsStr = cols.join(', ');
        
        for (const row of data) {
          const vals = cols.map(col => formatSqlValue(row[col]));
          const valsStr = vals.join(', ');
          sqlContent += `INSERT INTO ${table} (${colsStr}) VALUES (${valsStr});\n`;
        }
      } else {
        sqlContent += `-- Table ${table} is empty.\n`;
      }
      sqlContent += '\n';
    } catch (e) {
      console.error(`Exception fetching ${table}:`, e.message);
      sqlContent += `-- EXCEPTION FETCHING TABLE ${table}: ${e.message}\n\n`;
    }
  }
  
  const backupSqlFile = path.join(__dirname, 'supabase_backup.sql');
  fs.writeFileSync(backupSqlFile, sqlContent, 'utf8');
  console.log(`Created supabase_backup.sql at: ${backupSqlFile}`);
  
  // 3. Creating ZIP package
  console.log('Creating ZIP package...');
  const zip = new JSZip();
  
  const rootDir = __dirname;
  const excludes = [
    'node_modules',
    '.next',
    '.git',
    'dashboard-ketapang-backup.zip',
    'generate_backup_pkg.js',
    'test_tables_scratch.js',
    'test_tables_scratch.js.log'
  ];
  
  // Add files recursively helper
  async function addFiles(zipFolder, currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relativePath = path.relative(rootDir, fullPath);
      
      if (excludes.includes(file) || excludes.includes(relativePath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const folder = zipFolder.folder(file);
        await addFiles(folder, fullPath);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(file, content);
      }
    }
  }
  
  await addFiles(zip, rootDir);
  
  // Generate the zip buffer
  console.log('Generating ZIP content...');
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  const zipPath = path.join(rootDir, 'dashboard-ketapang-backup.zip');
  fs.writeFileSync(zipPath, content);
  console.log(`Backup created successfully at: ${zipPath}`);
  console.log('=== BACKUP COMPLETED ===');
}

run().catch(err => {
  console.error('Fatal backup error:', err);
});
