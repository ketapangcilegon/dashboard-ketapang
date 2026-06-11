import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  return POST(request);
}

