import { NextResponse } from 'next/server';
import { trainAndForecastAll } from '@/lib/ml/train_model';

export async function POST() {
  try {
    console.log('[API ML Train] Menjalankan retraining dan forecasting...');
    const result = await trainAndForecastAll();
    return NextResponse.json({
      success: true,
      message: 'Model retraining dan forecasting selesai.',
      result
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API ML Train] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal melatih ulang model'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
