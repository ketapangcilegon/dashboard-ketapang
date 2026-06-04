import { NextResponse } from 'next/server';
import { retrainModel } from '@/lib/ml';

export async function POST() {
  try {
    const metrics = await retrainModel();
    return NextResponse.json({
      success: true,
      message: 'Model Machine Learning berhasil dilatih ulang.',
      metrics
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API ML Retrain] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal melakukan retraining model'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

