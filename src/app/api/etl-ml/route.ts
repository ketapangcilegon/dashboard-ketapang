import { NextResponse } from 'next/server';
import { runETLPipeline } from '@/lib/etl-sagon';
import { runWeatherETL } from '@/lib/etl-weather';
import { runInflationETL } from '@/lib/etl-inflation';
import { retrainModel } from '@/lib/ml';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Verify token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: ' + (authError?.message || 'Invalid token') }, { status: 401 });
    }

    console.log('[API ETL] Memulai pipeline ETL Pangan...');
    const panganResult = await runETLPipeline();
    
    console.log('[API ETL] Memulai pipeline ETL Cuaca BMKG...');
    const cuacaResult = await runWeatherETL();
    
    console.log('[API ETL] Memulai pipeline ETL Inflasi BPS...');
    const inflasiResult = await runInflationETL();
    
    // Auto-trigger ML Model Retraining when new monthly data is processed
    let retrainResult = null;
    try {
      console.log('[API ETL] Memicu retraining model otomatis...');
      retrainResult = await retrainModel();
    } catch (retrainErr: unknown) {
      const errMessage = retrainErr instanceof Error ? retrainErr.message : String(retrainErr);
      console.warn('[API ETL] Retraining model dilewati / gagal:', errMessage);
      retrainResult = { success: false, error: errMessage };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pipeline ETL Pangan, Cuaca, dan Inflasi selesai dengan sukses.',
      totalRows: panganResult.totalRows,
      weatherUpdated: `${cuacaResult.month}/${cuacaResult.year}`,
      inflationUpdated: `${inflasiResult.month}/${inflasiResult.year}`,
      retrainResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API ETL] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal menjalankan pipeline ETL'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

