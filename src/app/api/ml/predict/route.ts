import { NextRequest, NextResponse } from 'next/server';
import { getLatestPredictions } from '@/lib/ml/predict';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commodity = searchParams.get('commodity') || undefined;
    
    const predictions = await getLatestPredictions(commodity);
    
    return NextResponse.json({
      success: true,
      data: predictions
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API ML Predict] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal mengambil data prediksi'
    }, { status: 500 });
  }
}
