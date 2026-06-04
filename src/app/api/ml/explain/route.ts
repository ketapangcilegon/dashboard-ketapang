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
    
    // Fetch the latest 1-month-ahead forecast which has the explanation
    const { data, error } = await supabase
      .from('forecast_result')
      .select('komoditas, tanggal_prediksi, periode, prediksi_harga, mape, akurasi, faktor_utama, narasi')
      .eq('komoditas', commodity)
      .order('tanggal_prediksi', { ascending: false })
      .limit(2); // Get 1-month and 3-month if available
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
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
