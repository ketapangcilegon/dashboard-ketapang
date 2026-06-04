import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commodity = searchParams.get('commodity');
    
    if (!commodity) {
      return NextResponse.json({
        success: false,
        error: 'Parameter "commodity" wajib disertakan.'
      }, { status: 400 });
    }
    
    // Fetch the single row for the commodity which contains all forecast, EWS and driver info
    const { data, error } = await supabase
      .from('forecast_result')
      .select('komoditas, harga_aktual, forecast_1m, forecast_3m, perubahan_pct, lower_bound, upper_bound, cv, growth_yoy, status_forecast, status_cv, status_skpg, confidence, drivers, narasi, rekomendasi, created_at')
      .eq('komoditas', commodity)
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data: data || null
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API ML Explain] Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal mengambil data interpretasi model'
    }, { status: 500 });
  }
}
