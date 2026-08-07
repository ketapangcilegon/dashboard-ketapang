const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/lib/fsva-official-data.json', 'utf8'));

let sql = `-- ========================================================================\n`;
sql += `-- Migration SQL: Populate FSVA Matang Data 2024 & 2025\n`;
sql += `-- Source: public/fsva_interaktif_2024_2025.xlsx\n`;
sql += `-- ========================================================================\n\n`;

// 1. Add missing column definitions to fsva_matang table
sql += `-- Step 1: Ensure table structure has all indicator columns\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS rank INT;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS idx_ketersediaan NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS idx_akses NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS idx_pemanfaatan NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_lahan NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_sarana NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_miskin NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_jalan NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_air NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS score_tenkes NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS rasio_miskin NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS rasio_air NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS raw_miskin NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS raw_air NUMERIC;\n\n`;

// 2. Clean existing rows if re-seeding
sql += `-- Step 2: Delete existing rows for 2024 & 2025 to avoid duplicates\n`;
sql += `DELETE FROM fsva_matang WHERE periode IN (2024, 2025);\n\n`;

// 3. Insert rows for 2025 and 2024
[2025, 2024].forEach(yr => {
  const sheet = data[yr] || {};
  sql += `-- ========================================================================\n`;
  sql += `-- DATA FSVA TAHUN ${yr} (${Object.keys(sheet).length} KELURAHAN KOTA CILEGON)\n`;
  sql += `-- ========================================================================\n`;

  Object.values(sheet).forEach((item) => {
    const kel = String(item.kelurahan).replace(/'/g, "''");
    const bps = String(item.bps_code);
    const ikp = item.ikp ?? 0;
    const rank = item.rank ?? 1;
    const avail = item.idx_ketersediaan ?? 50;
    const access = item.idx_akses ?? 50;
    const util = item.idx_pemanfaatan ?? 50;
    const sLahan = item.score_lahan ?? 50;
    const sSarana = item.score_sarana ?? 50;
    const sMiskin = item.score_miskin ?? 50;
    const sJalan = item.score_jalan ?? 50;
    const sAir = item.score_air ?? 50;
    const sTenkes = item.score_tenkes ?? 50;
    const rMiskin = item.rasio_miskin ?? 0;
    const rAir = item.rasio_air ?? 0;
    const rwMiskin = item.raw_miskin ?? 0;
    const rwAir = item.raw_air ?? 0;

    sql += `INSERT INTO fsva_matang (nama_kelurahan, kode_kel_bps, ikp, periode, rank, idx_ketersediaan, idx_akses, idx_pemanfaatan, score_lahan, score_sarana, score_miskin, score_jalan, score_air, score_tenkes, rasio_miskin, rasio_air, raw_miskin, raw_air) VALUES ('${kel}', '${bps}', ${ikp}, ${yr}, ${rank}, ${avail}, ${access}, ${util}, ${sLahan}, ${sSarana}, ${sMiskin}, ${sJalan}, ${sAir}, ${sTenkes}, ${rMiskin}, ${rAir}, ${rwMiskin}, ${rwAir});\n`;
  });

  sql += `\n`;
});

fs.writeFileSync('migrate_fsva_2024_2025.sql', sql, 'utf8');
console.log('✅ Generated migrate_fsva_2024_2025.sql successfully!');
