const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'public/Form Analisis 2025_Kabupaten Kota_Ver1- Rev/2. Form Penentuan Cut Off dan Analisis Komposit Baseline FSVA Kabupaten Kota ver.1.xlsb';
const wb = XLSX.readFile(filePath);

const s21 = XLSX.utils.sheet_to_json(wb.Sheets['2.1 Data FSVA 2024 & Bobot'], { header: 1 });
const s23 = XLSX.utils.sheet_to_json(wb.Sheets['2.3 Indeks & Cut off Komposit'], { header: 1 });

const result = {};

const rows21 = s21.slice(6);
const rows23 = s23.slice(10);

function toNum(val, dec = 2) {
  const n = Number(val);
  return isNaN(n) ? 0 : +n.toFixed(dec);
}

rows21.forEach(r21 => {
  if (r21 && r21[1] && r21[5] && typeof r21[0] === 'number') {
    const no = r21[0];
    const kec = String(r21[1]).trim();
    const kel = String(r21[5]).trim();
    const bps = r21[4] ? String(r21[4]).trim() : '';

    // Find matching row in s23
    const r23 = rows23.find(r => r && (r[0] === no || (r[5] && String(r[5]).trim().toLowerCase() === kel.toLowerCase()))) || [];

    const normNcpr = Math.round(toNum(r23[6], 4) * 100);
    const normEnergy = Math.round(toNum(r23[7], 4) * 100);
    const normProtein = Math.round(toNum(r23[8], 4) * 100);
    const normReserves = Math.round(toNum(r23[9], 4) * 100);
    const normPoverty = Math.round(toNum(r23[10], 4) * 100);
    const normCv = Math.round(toNum(r23[11], 4) * 100);
    const normPou = Math.round(toNum(r23[12], 4) * 100);
    const normSchool = Math.round(toNum(r23[13], 4) * 100);
    const normWater = Math.round(toNum(r23[14], 4) * 100);
    const normPph = Math.round(toNum(r23[15], 4) * 100);
    const normStunting = Math.round(toNum(r23[16], 4) * 100);

    const ikpComposite = toNum(r23[17] ? r23[17] * 100 : (r23[19] ? r23[19] : 70), 2);
    const rank = Number(r23[20]) || no;

    result[kel] = {
      no,
      kecamatan: kec,
      kelurahan: kel,
      bps_code: bps,
      // Raw Values from Form 2.1
      raw_ncpr: toNum(r21[6], 2),
      raw_energy: toNum(r21[8], 1),
      raw_animal_protein: toNum(r21[10], 1),
      raw_food_reserves: toNum(r21[12], 2),
      raw_poverty: toNum(r21[14], 1),
      raw_price_cv: toNum(r21[16], 1),
      raw_pou: toNum(r21[18], 1),
      raw_female_school: toNum(r21[20], 1),
      raw_no_water: toNum(r21[22], 1),
      raw_pph: toNum(r21[24], 1),
      raw_stunting: toNum(r21[26], 1),
      // Normalized Scores (0-100) from Form 2.3
      score_ncpr: normNcpr,
      score_energy: normEnergy,
      score_animal_protein: normProtein,
      score_food_reserves: normReserves,
      score_poverty: normPoverty,
      score_price_cv: normCv,
      score_pou: normPou,
      score_female_school: normSchool,
      score_no_water: normWater,
      score_pph: normPph,
      score_stunting: normStunting,
      // Aggregates
      idx_ketersediaan: Math.round((normNcpr + normEnergy + normProtein + normReserves) / 4),
      idx_akses: Math.round((normPoverty + normCv + normPou) / 3),
      idx_pemanfaatan: Math.round((normSchool + normWater + normPph + normStunting) / 4),
      ikp: ikpComposite,
      rank: rank
    };
  }
});

console.log(`✅ Successfully extracted Form 2.1 & 2.3 for ${Object.keys(result).length} Kelurahan!`);
console.log('Sample Gunung Sugih:', result['Gunung Sugih']);

fs.writeFileSync('src/lib/fsva-form2-official-data.json', JSON.stringify(result, null, 2));

// Generate updated SQL migration file
let sql = `-- ========================================================================\n`;
sql += `-- Migration SQL: FSVA 2025 (Official 11 Indicators from Form 2.1 & 2.3)\n`;
sql += `-- Source: public/Form Analisis 2025_Kabupaten Kota_Ver1- Rev/\n`;
sql += `--         2. Form Penentuan Cut Off dan Analisis Komposit Baseline FSVA.xlsb\n`;
sql += `-- ========================================================================\n\n`;

sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS ncpr NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS energy NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS animal_protein NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS food_reserves NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS poverty NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS price_cv NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS pou NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS female_school NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS no_water NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS pph NUMERIC;\n`;
sql += `ALTER TABLE fsva_matang ADD COLUMN IF NOT EXISTS stunting NUMERIC;\n\n`;

sql += `DELETE FROM fsva_matang WHERE periode IN (2024, 2025);\n\n`;

[2025, 2024].forEach(yr => {
  sql += `-- ========================================================================\n`;
  sql += `-- DATA FSVA TAHUN ${yr} (${Object.keys(result).length} KELURAHAN KOTA CILEGON)\n`;
  sql += `-- ========================================================================\n`;
  Object.values(result).forEach(item => {
    const kel = String(item.kelurahan).replace(/'/g, "''");
    const bps = String(item.bps_code);
    sql += `INSERT INTO fsva_matang (nama_kelurahan, kode_kel_bps, ikp, periode, rank, idx_ketersediaan, idx_akses, idx_pemanfaatan, score_lahan, score_sarana, score_miskin, score_jalan, score_air, score_tenkes, rasio_miskin, rasio_air, ncpr, energy, animal_protein, food_reserves, poverty, price_cv, pou, female_school, no_water, pph, stunting) VALUES ('${kel}', '${bps}', ${item.ikp}, ${yr}, ${item.rank}, ${item.idx_ketersediaan}, ${item.idx_akses}, ${item.idx_pemanfaatan}, ${item.score_ncpr}, ${item.score_energy}, ${item.score_poverty}, ${item.score_price_cv}, ${item.score_no_water}, ${item.score_stunting}, ${item.raw_poverty}, ${item.raw_no_water}, ${item.raw_ncpr}, ${item.raw_energy}, ${item.raw_animal_protein}, ${item.raw_food_reserves}, ${item.raw_poverty}, ${item.raw_price_cv}, ${item.raw_pou}, ${item.raw_female_school}, ${item.raw_no_water}, ${item.raw_pph}, ${item.raw_stunting});\n`;
  });
  sql += `\n`;
});

fs.writeFileSync('migrate_fsva_2024_2025.sql', sql, 'utf8');
console.log('✅ Generated updated migrate_fsva_2024_2025.sql successfully!');
