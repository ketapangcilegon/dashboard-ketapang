import { supabase } from '@/lib/supabase';

/**
 * Menyinkronkan data peramalan terbaru dari forecast_result ke tabel forecast_history (log bulanan).
 * Berjalan otomatis secara fire-and-forget saat user mengakses halaman utama / forecast.
 */
async function syncForecastHistory(predictions: any[]) {
  try {
    if (!predictions || predictions.length === 0) return;
    
    // Ambil awal bulan saat ini dalam format YYYY-MM-01
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}-01`;
    
    const historyRows = predictions.map(p => ({
      komoditas: p.komoditas,
      bulan: monthStr,
      harga_aktual: Number(p.harga_aktual) || 0,
      forecast_1m: Number(p.forecast_1m) || 0,
      forecast_3m: Number(p.forecast_3m) || 0
    }));
    
    // Upsert ke forecast_history. Jika sudah ada komoditas di bulan berjalan, akan terupdate
    const { error } = await supabase
      .from('forecast_history')
      .upsert(historyRows, { onConflict: 'komoditas,bulan' });
      
    if (error) {
      console.warn('[ML Predict] Gagal sync data ke forecast_history:', error.message);
    }
  } catch (err) {
    console.warn('[ML Predict] Gagal sync forecast history:', err);
  }
}

/**
 * Fetches the latest computed predictions from the forecast_result table.
 * 
 * @param commodity Optional filter for a specific food commodity (e.g. 'harga_beras')
 */
export async function getLatestPredictions(commodity?: string) {
  let query = supabase
    .from('forecast_result')
    .select('*')
    .order('komoditas', { ascending: true });
    
  if (commodity) {
    query = query.eq('komoditas', commodity);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Gagal mengambil hasil prediksi dari database: ${error.message}`);
  }
  
  // Triger sinkronisasi otomatis secara asinkron (fire-and-forget)
  if (data && data.length > 0) {
    syncForecastHistory(data);
  }
  
  return data || [];
}
