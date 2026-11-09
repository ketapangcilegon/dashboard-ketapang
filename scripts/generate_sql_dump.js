const fs = require('fs');
const path = require('path');

const tablesDir = 'C:/PANCI_MASTER/04_DATABASE/tables';
const schemaSqlPath = 'C:/PANCI_MASTER/04_DATABASE/schema.sql';
const fullDumpSqlPath = 'C:/PANCI_MASTER/04_DATABASE/full_database_dump.sql';

const files = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json'));

let schemaSql = `-- ====================================================================
-- PANCI (Platform Analisis Pangan Kota Cilegon)
-- COMPLETE DATABASE SCHEMA DDL
-- Generated: ${new Date().toISOString()}
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

let dumpSql = `-- ====================================================================
-- PANCI (Platform Analisis Pangan Kota Cilegon)
-- FULL DATABASE DUMP (DDL + SEED DATA)
-- Generated: ${new Date().toISOString()}
-- ====================================================================

` + schemaSql;

function inferSqlType(key, val) {
  if (key === 'id') return 'TEXT PRIMARY KEY';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'BIGINT' : 'DOUBLE PRECISION';
  }
  if (typeof val === 'boolean') return 'BOOLEAN';
  if (typeof val === 'object' && val !== null) return 'JSONB';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return 'TIMESTAMPTZ';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'DATE';
    if (val.length > 500) return 'TEXT';
    return 'VARCHAR(255)';
  }
  return 'TEXT';
}

files.forEach(file => {
  const tableName = path.basename(file, '.json');
  const data = JSON.parse(fs.readFileSync(path.join(tablesDir, file), 'utf-8'));

  let cols = {};
  if (data.length > 0) {
    data.forEach(row => {
      Object.keys(row).forEach(k => {
        if (!cols[k] && row[k] !== null && row[k] !== undefined) {
          cols[k] = inferSqlType(k, row[k]);
        }
      });
    });
  } else {
    cols = { id: 'TEXT PRIMARY KEY', created_at: 'TIMESTAMPTZ DEFAULT now()' };
  }

  // Ensure id exists
  if (!cols['id']) {
    cols['id'] = 'TEXT PRIMARY KEY';
  }

  const colDefs = Object.entries(cols).map(([col, type]) => {
    return `  "${col}" ${type}`;
  }).join(',\n');

  const createTableStmt = `-- Table: ${tableName}\nCREATE TABLE IF NOT EXISTS public."${tableName}" (\n${colDefs}\n);\n\n-- RLS Policy for ${tableName}\nALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Public Read Access on ${tableName}" ON public."${tableName}" FOR SELECT USING (true);\nCREATE POLICY "Admin All Access on ${tableName}" ON public."${tableName}" FOR ALL USING (true);\n\n`;

  schemaSql += createTableStmt;
  dumpSql += createTableStmt;

  // Generate INSERT statements
  if (data.length > 0) {
    dumpSql += `-- Insert Data for ${tableName} (${data.length} rows)\n`;
    const colNames = Object.keys(cols);

    data.forEach(row => {
      const vals = colNames.map(col => {
        const v = row[col];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      dumpSql += `INSERT INTO public."${tableName}" ("${colNames.join('", "')}") VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    });
    dumpSql += '\n';
  }
});

fs.writeFileSync(schemaSqlPath, schemaSql, 'utf-8');
fs.writeFileSync(fullDumpSqlPath, dumpSql, 'utf-8');

console.log('Schema DDL written to:', schemaSqlPath, `(${schemaSql.length} bytes)`);
console.log('Full Database Dump written to:', fullDumpSqlPath, `(${dumpSql.length} bytes)`);

