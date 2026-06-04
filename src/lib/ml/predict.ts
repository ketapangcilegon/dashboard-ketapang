import { supabase } from '@/lib/supabase';

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
  
  return data || [];
}
