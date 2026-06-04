import { createClient } from '@supabase/supabase-js';

interface BMKGWeatherItem {
  datetime?: string;
  t: number | string;
  hu: number | string;
  ws: number | string;
  tp?: number | string;
}

export async function runWeatherETL() {
  console.log('[Weather ETL] Memulai ekstraksi data cuaca dari BMKG...');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const url = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=36.72.05.1002";
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Gagal menghubungi API BMKG: HTTP ${res.status}`);
  }

  const data = await res.json();
  
  if (!data.data || !data.data[0] || !data.data[0].cuaca) {
    throw new Error('Struktur data cuaca BMKG tidak valid.');
  }

  const cuaca = data.data[0].cuaca; // 3 days array of arrays
  
  let totalT = 0;
  let totalHu = 0;
  let totalWs = 0;
  let totalTp = 0;
  let forecastCount = 0;
  
  // Track rainy days (out of the 3 forecasted days)
  const rainyDaysSet = new Set<string>();
  const totalDaysSet = new Set<string>();

  cuaca.forEach((dayForecast: BMKGWeatherItem[]) => {
    if (!Array.isArray(dayForecast)) return;
    
    dayForecast.forEach((item: BMKGWeatherItem) => {
      const dateKey = item.datetime ? item.datetime.split('T')[0] : '';
      if (dateKey) {
        totalDaysSet.add(dateKey);
      }
      
      const t = typeof item.t === 'number' ? item.t : parseFloat(item.t);
      const hu = typeof item.hu === 'number' ? item.hu : parseFloat(item.hu);
      const ws = typeof item.ws === 'number' ? item.ws : parseFloat(item.ws);
      const tp = item.tp ? (typeof item.tp === 'number' ? item.tp : parseFloat(item.tp)) : 0; // Total precipitation
      
      if (!isNaN(t)) {
        totalT += t;
        totalHu += hu;
        totalWs += ws;
        totalTp += tp;
        forecastCount++;
        
        if (tp > 0 && dateKey) {
          rainyDaysSet.add(dateKey);
        }
      }
    });
  });

  if (forecastCount === 0) {
    throw new Error('Tidak ada data prakiraan cuaca yang berhasil di-parse.');
  }

  // Calculate averages
  const avgT = Math.round((totalT / forecastCount) * 10) / 10;
  const avgHu = Math.round(totalHu / forecastCount);
  const avgWs = Math.round((totalWs / forecastCount) * 10) / 10;
  
  // Extrapolate to monthly rainfall
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed (Jan = 1)
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const numDaysForecasted = totalDaysSet.size || 3;
  const estimatedMonthlyRain = Math.round((totalTp / numDaysForecasted) * daysInMonth);
  
  // Extrapolate rainy days
  const numRainyDaysForecasted = rainyDaysSet.size;
  const estimatedHariHujan = Math.round((numRainyDaysForecasted / numDaysForecasted) * daysInMonth);

  console.log(`[Weather ETL] Averages - Suhu: ${avgT}°C, Kelembapan: ${avgHu}%, Angin: ${avgWs} km/h`);
  console.log(`[Weather ETL] Extrapolated monthly - Curah Hujan: ${estimatedMonthlyRain} mm, Hari Hujan: ${estimatedHariHujan} hari`);

  // Upload/Upsert to Supabase cuaca_ml
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Kredensial Supabase tidak ditemukan (URL atau KEY).');
  }

  const adminSupabase = createClient(supabaseUrl, supabaseKey);
  
  const weatherRow = {
    tahun: year,
    bulan: month,
    curah_hujan_mm: estimatedMonthlyRain,
    suhu_c: avgT,
    kelembapan: avgHu,
    hari_hujan: estimatedHariHujan,
    kecepatan_angin: avgWs
  };

  const { error } = await adminSupabase
    .from('cuaca_ml')
    .upsert(weatherRow, { onConflict: 'tahun, bulan' });

  if (error) {
    console.error('[Weather ETL] Error upserting weather:', error);
    throw new Error(`Gagal menyimpan data cuaca ke Supabase: ${error.message}`);
  }

  console.log(`[Weather ETL] Berhasil memperbarui data cuaca untuk ${month}/${year} di Supabase!`);
  
  return {
    year,
    month,
    weatherRow
  };
}
