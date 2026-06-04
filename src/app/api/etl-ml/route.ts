import { NextResponse } from 'next/server';
import { runETLPipeline } from '@/lib/etl-sagon';

export async function POST() {
  try {
    const result = await runETLPipeline();
    
    return NextResponse.json({
      success: true,
      message: 'Pipeline ETL selesai sukses.',
      totalRows: result.totalRows,
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
