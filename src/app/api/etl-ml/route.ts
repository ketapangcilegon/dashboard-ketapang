import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const rootDir = process.cwd();
    
    // 1. Extract
    console.log('[API ETL] Running extract_sagon.js...');
    await execAsync('node extract_sagon.js', { cwd: rootDir });
    
    // 2. Transform
    console.log('[API ETL] Running transform_ml.js...');
    await execAsync('node transform_ml.js', { cwd: rootDir });
    
    // 3. Upload
    console.log('[API ETL] Running upload_supabase.js...');
    await execAsync('node upload_supabase.js', { cwd: rootDir });
    
    // Also read the CSV to return some stats
    const csvPath = path.join(rootDir, 'ml_dataset.csv');
    let totalRows = 0;
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      totalRows = content.trim().split('\n').length - 1; // subtract header
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pipeline ETL selesai sukses.',
      totalRows: totalRows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[API ETL] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menjalankan pipeline ETL'
    }, { status: 500 });
  }
}
