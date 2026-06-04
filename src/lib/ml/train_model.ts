import { supabase } from '@/lib/supabase';
import { XGBoostRegressor, RandomForestRegressor, ProphetRegressor } from './algorithms';
import { evaluatePredictions } from './evaluate';
import { explainPrediction } from './explain';

const COMMODITIES = [
  'harga_beras',
  'harga_bawang_merah',
  'harga_bawang_putih',
  'harga_cabai_merah',
  'harga_cabai_rawit',
  'harga_daging_sapi',
  'harga_daging_ayam_ras',
  'harga_telur_ayam_ras',
  'harga_gula_pasir',
  'harga_minyak_goreng'
];

interface RawDatasetRow {
  tahun: number;
  bulan: number;
  harga_beras: number | null;
  harga_bawang_merah: number | null;
  harga_bawang_putih: number | null;
  harga_cabai_merah: number | null;
  harga_cabai_rawit: number | null;
  harga_daging_sapi: number | null;
  harga_daging_ayam_ras: number | null;
  harga_telur_ayam_ras: number | null;
  harga_gula_pasir: number | null;
  harga_minyak_goreng: number | null;
  ihk: number | null;
  inflasi_mtm: number | null;
  inflasi_yoy: number | null;
  curah_hujan_mm: number | null;
  suhu_c: number | null;
  kelembapan: number | null;
  hari_hujan: number | null;
  kecepatan_angin: number | null;
  ramadhan: number | null;
  idul_fitri: number | null;
  idul_adha: number | null;
  nataru: number | null;
  hari_menuju_idul_fitri: number | null;
  hari_menuju_idul_adha: number | null;
}

interface EngineeredSample {
  y: number;
  features: number[];
  featureMap: Record<string, number>;
  tahun: number;
  bulan: number;
}

// Convert month/year to date string for the first day of that month
function getFirstDayOfMonth(year: number, month: number): string {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-01`;
}

// Helper to extract feature names list to keep indexing clean
const FEATURE_NAMES = [
  'lag_1', 'lag_2', 'lag_3', 'moving_avg_3', 'bulan', 'quarter',
  'ihk', 'inflasi_mtm', 'inflasi_yoy', 'curah_hujan_mm', 'suhu_c',
  'kelembapan', 'hari_hujan', 'ramadhan', 'idul_fitri', 'idul_adha',
  'nataru', 'hari_menuju_idul_fitri', 'hari_menuju_idul_adha'
];

export async function trainAndForecastAll() {
  console.log('[ML Train] Memulai pipeline training model ML...');
  
  // 1. Fetch entire historical dataset from forecast_dataset view
  const { data, error } = await supabase
    .from('forecast_dataset')
    .select('*')
    .order('tahun', { ascending: true })
    .order('bulan', { ascending: true });
    
  if (error) {
    throw new Error(`Gagal mengambil dataset forecast: ${error.message}`);
  }
  
  const rawRows = (data || []) as RawDatasetRow[];
  if (rawRows.length < 30) {
    throw new Error(`Data di forecast_dataset terlalu sedikit untuk pelatihan model (saat ini: ${rawRows.length} bulan).`);
  }
  
  const resultsToUpsert: Record<string, unknown>[] = [];
  
  // 2. Train models for each commodity
  for (const commodity of COMMODITIES) {
    console.log(`[ML Train] Melatih model untuk komoditas: ${commodity}`);
    
    // Construct engineered samples
    const samples: EngineeredSample[] = [];
    
    for (let t = 3; t < rawRows.length; t++) {
      const currentRow = rawRows[t];
      const targetVal = currentRow[commodity as keyof RawDatasetRow];
      
      // We need valid historical actual prices to train
      if (targetVal === null || targetVal === undefined || targetVal <= 0) continue;
      
      const p1 = rawRows[t - 1][commodity as keyof RawDatasetRow] as number;
      const p2 = rawRows[t - 2][commodity as keyof RawDatasetRow] as number;
      const p3 = rawRows[t - 3][commodity as keyof RawDatasetRow] as number;
      
      if (!p1 || !p2 || !p3) continue; // Skip if lags are incomplete
      
      const moving_avg_3 = (p1 + p2 + p3) / 3;
      const bulan = currentRow.bulan;
      const quarter = Math.ceil(bulan / 3);
      
      const featureMap: Record<string, number> = {
        lag_1: p1,
        lag_2: p2,
        lag_3: p3,
        moving_avg_3,
        bulan,
        quarter,
        ihk: currentRow.ihk || 115.0,
        inflasi_mtm: currentRow.inflasi_mtm || 0.15,
        inflasi_yoy: currentRow.inflasi_yoy || 2.1,
        curah_hujan_mm: currentRow.curah_hujan_mm || 150,
        suhu_c: currentRow.suhu_c || 27.5,
        kelembapan: currentRow.kelembapan || 79,
        hari_hujan: currentRow.hari_hujan || 10,
        ramadhan: currentRow.ramadhan || 0,
        idul_fitri: currentRow.idul_fitri || 0,
        idul_adha: currentRow.idul_adha || 0,
        nataru: currentRow.nataru || 0,
        hari_menuju_idul_fitri: currentRow.hari_menuju_idul_fitri || 365,
        hari_menuju_idul_adha: currentRow.hari_menuju_idul_adha || 365
      };
      
      // Order features exactly according to FEATURE_NAMES list
      const features = FEATURE_NAMES.map(name => featureMap[name]);
      
      samples.push({
        y: targetVal,
        features,
        featureMap,
        tahun: currentRow.tahun,
        bulan: currentRow.bulan
      });
    }
    
    if (samples.length < 24) {
      console.warn(`[ML Train] Data sampel terlalu sedikit untuk ${commodity}. Dilewati.`);
      continue;
    }

    // 3. Time Series Split:
    // Training: 2022 - 2025
    // Validation: 2026
    const trainSamples = samples.filter(s => s.tahun <= 2025);
    const valSamples = samples.filter(s => s.tahun === 2026);
    
    // Fallback: If 2026 validation data is empty, split 80% train / 20% validation
    const hasValidation = valSamples.length > 0;
    const finalTrain = hasValidation ? trainSamples : samples.slice(0, Math.floor(samples.length * 0.8));
    const finalVal = hasValidation ? valSamples : samples.slice(Math.floor(samples.length * 0.8));
    
    const trainX = finalTrain.map(s => s.features);
    const trainY = finalTrain.map(s => s.y);
    const valX = finalVal.map(s => s.features);
    const valY = finalVal.map(s => s.y);
    
    // Train and evaluate XGBoost
    const xgb = new XGBoostRegressor(12, 3, 0.1);
    xgb.fit(trainX, trainY);
    const xgbPreds = valX.map(x => xgb.predict(x));
    const xgbMetrics = evaluatePredictions(valY, xgbPreds);
    
    // Train and evaluate Prophet-like model
    const prophet = new ProphetRegressor();
    prophet.fit(trainX, trainY);
    const prophetPreds = valX.map(x => prophet.predict(x));
    const prophetMetrics = evaluatePredictions(valY, prophetPreds);
    
    // Train and evaluate Random Forest
    const rf = new RandomForestRegressor(10, 4);
    rf.fit(trainX, trainY);
    const rfPreds = valX.map(x => rf.predict(x));
    const rfMetrics = evaluatePredictions(valY, rfPreds);
    
    console.log(`[ML Train] Metrics for ${commodity}:`);
    console.log(` - XGBoost Validation MAPE: ${xgbMetrics.mape}%`);
    console.log(` - Prophet Validation MAPE: ${prophetMetrics.mape}%`);
    console.log(` - Random Forest Validation MAPE: ${rfMetrics.mape}%`);
    
    // Choose model with lowest validation MAPE
    let bestModelType: 'xgboost' | 'prophet' | 'randomforest' = 'xgboost';
    let bestMAPE = xgbMetrics.mape;
    
    if (prophetMetrics.mape < bestMAPE) {
      bestModelType = 'prophet';
      bestMAPE = prophetMetrics.mape;
    }
    if (rfMetrics.mape < bestMAPE) {
      bestModelType = 'randomforest';
      bestMAPE = rfMetrics.mape;
    }
    
    console.log(`[ML Train] Model terbaik untuk ${commodity}: ${bestModelType.toUpperCase()} (MAPE: ${bestMAPE}%)`);
    
    // 4. Retrain the selected champion model on the entire dataset (train + validation)
    const allX = samples.map(s => s.features);
    const allY = samples.map(s => s.y);
    
    let championModel: XGBoostRegressor | ProphetRegressor | RandomForestRegressor;
    if (bestModelType === 'xgboost') {
      championModel = new XGBoostRegressor(12, 3, 0.1);
      championModel.fit(allX, allY);
    } else if (bestModelType === 'prophet') {
      championModel = new ProphetRegressor();
      championModel.fit(allX, allY);
    } else {
      championModel = new RandomForestRegressor(10, 4);
      championModel.fit(allX, allY);
    }
    
    // 5. Predict 1 month and 3 months ahead recursively
    // Find the latest record that contains actual price data
    let latestIdx = rawRows.length - 1;
    while (latestIdx >= 0 && (rawRows[latestIdx][commodity as keyof RawDatasetRow] === null || (rawRows[latestIdx][commodity as keyof RawDatasetRow] as number) <= 0)) {
      latestIdx--;
    }
    
    if (latestIdx < 3) {
      console.warn(`[ML Train] Tidak ada data harga terbaru untuk ${commodity}. Dilewati.`);
      continue;
    }
    
    const latestRow = rawRows[latestIdx];
    const currentPrice = latestRow[commodity as keyof RawDatasetRow] as number;
    const currentYear = latestRow.tahun;
    const currentMonth = latestRow.bulan;
    
    console.log(`[ML Train] Harga saat ini (${currentMonth}/${currentYear}) untuk ${commodity}: Rp ${currentPrice}`);
    
    // Projections target dates
    // 1 month ahead
    let target1Month = currentMonth + 1;
    let target1Year = currentYear;
    if (target1Month > 12) {
      target1Month = 1;
      target1Year++;
    }
    
    // 3 months ahead
    let target3Month = currentMonth + 3;
    let target3Year = currentYear;
    if (target3Month > 12) {
      target3Month = target3Month - 12;
      target3Year++;
    }
    
    // Find future feature rows in the rawRows dataset (populated by seeders)
    const findFutureRow = (y: number, m: number) => {
      return rawRows.find(row => row.tahun === y && row.bulan === m);
    };
    
    const rowT1 = findFutureRow(target1Year, target1Month);
    const rowT2 = findFutureRow(target1Month === 12 ? target1Year + 1 : target1Year, target1Month === 12 ? 1 : target1Month + 1);
    const rowT3 = findFutureRow(target3Year, target3Month);
    
    if (!rowT1 || !rowT3) {
      console.warn(`[ML Train] Baris target masa depan di forecast_dataset tidak ditemukan untuk ${commodity}. Pastikan seeder sudah terisi hingga akhir 2026.`);
      continue;
    }
    
    // --- STEP A: Forecast 1 Month Ahead (t+1) ---
    const featureMap1: Record<string, number> = {
      lag_1: currentPrice,
      lag_2: rawRows[latestIdx - 1][commodity as keyof RawDatasetRow] as number,
      lag_3: rawRows[latestIdx - 2][commodity as keyof RawDatasetRow] as number,
      moving_avg_3: (currentPrice + (rawRows[latestIdx - 1][commodity as keyof RawDatasetRow] as number) + (rawRows[latestIdx - 2][commodity as keyof RawDatasetRow] as number)) / 3,
      bulan: target1Month,
      quarter: Math.ceil(target1Month / 3),
      ihk: rowT1.ihk || 120.0,
      inflasi_mtm: rowT1.inflasi_mtm || 0.22,
      inflasi_yoy: rowT1.inflasi_yoy || 1.7,
      curah_hujan_mm: rowT1.curah_hujan_mm || 150,
      suhu_c: rowT1.suhu_c || 27.5,
      kelembapan: rowT1.kelembapan || 79,
      hari_hujan: rowT1.hari_hujan || 10,
      ramadhan: rowT1.ramadhan || 0,
      idul_fitri: rowT1.idul_fitri || 0,
      idul_adha: rowT1.idul_adha || 0,
      nataru: rowT1.nataru || 0,
      hari_menuju_idul_fitri: rowT1.hari_menuju_idul_fitri || 365,
      hari_menuju_idul_adha: rowT1.hari_menuju_idul_adha || 365
    };
    
    const vec1 = FEATURE_NAMES.map(name => featureMap1[name]);
    const pred1 = Math.round(championModel.predict(vec1));
    
    // Attributing error bounds using MAPE
    const boundDelta1 = pred1 * (bestMAPE / 100);
    const lower1 = Math.max(0, Math.round(pred1 - boundDelta1));
    const upper1 = Math.round(pred1 + boundDelta1);
    
    // Generate explainability for 1 Month
    const explainResult1 = explainPrediction(currentPrice, pred1, featureMap1, commodity);
    
    resultsToUpsert.push({
      tanggal_prediksi: getFirstDayOfMonth(target1Year, target1Month),
      komoditas: commodity,
      periode: '1_bulan',
      prediksi_harga: pred1,
      lower_bound: lower1,
      upper_bound: upper1,
      akurasi: Math.max(0, Math.min(100, 100 - bestMAPE)),
      mape: bestMAPE,
      faktor_utama: explainResult1.factors,
      narasi: explainResult1.narasi
    });
    
    // --- STEP B: Recursive Forecast 3 Months Ahead (t+3) ---
    // In order to predict t+3, we must recursively predict t+2 first
    let pred2 = pred1;
    if (rowT2) {
      const featureMap2: Record<string, number> = {
        lag_1: pred1, // recursive forecast lag
        lag_2: currentPrice,
        lag_3: rawRows[latestIdx - 1][commodity as keyof RawDatasetRow] as number,
        moving_avg_3: (pred1 + currentPrice + (rawRows[latestIdx - 1][commodity as keyof RawDatasetRow] as number)) / 3,
        bulan: rowT2.bulan,
        quarter: Math.ceil(rowT2.bulan / 3),
        ihk: rowT2.ihk || 120.0,
        inflasi_mtm: rowT2.inflasi_mtm || 0.22,
        inflasi_yoy: rowT2.inflasi_yoy || 1.7,
        curah_hujan_mm: rowT2.curah_hujan_mm || 150,
        suhu_c: rowT2.suhu_c || 27.5,
        kelembapan: rowT2.kelembapan || 79,
        hari_hujan: rowT2.hari_hujan || 10,
        ramadhan: rowT2.ramadhan || 0,
        idul_fitri: rowT2.idul_fitri || 0,
        idul_adha: rowT2.idul_adha || 0,
        nataru: rowT2.nataru || 0,
        hari_menuju_idul_fitri: rowT2.hari_menuju_idul_fitri || 365,
        hari_menuju_idul_adha: rowT2.hari_menuju_idul_adha || 365
      };
      const vec2 = FEATURE_NAMES.map(name => featureMap2[name]);
      pred2 = Math.round(championModel.predict(vec2));
    }
    
    // Now predict t+3 (3 months ahead)
    const featureMap3: Record<string, number> = {
      lag_1: pred2, // recursive forecast lag 1
      lag_2: pred1, // recursive forecast lag 2
      lag_3: currentPrice,
      moving_avg_3: (pred2 + pred1 + currentPrice) / 3,
      bulan: target3Month,
      quarter: Math.ceil(target3Month / 3),
      ihk: rowT3.ihk || 120.0,
      inflasi_mtm: rowT3.inflasi_mtm || 0.22,
      inflasi_yoy: rowT3.inflasi_yoy || 1.7,
      curah_hujan_mm: rowT3.curah_hujan_mm || 150,
      suhu_c: rowT3.suhu_c || 27.5,
      kelembapan: rowT3.kelembapan || 79,
      hari_hujan: rowT3.hari_hujan || 10,
      ramadhan: rowT3.ramadhan || 0,
      idul_fitri: rowT3.idul_fitri || 0,
      idul_adha: rowT3.idul_adha || 0,
      nataru: rowT3.nataru || 0,
      hari_menuju_idul_fitri: rowT3.hari_menuju_idul_fitri || 365,
      hari_menuju_idul_adha: rowT3.hari_menuju_idul_adha || 365
    };
    
    const vec3 = FEATURE_NAMES.map(name => featureMap3[name]);
    const pred3 = Math.round(championModel.predict(vec3));
    
    // Add cumulative error variance penalty for 3 month forecast (multiply MAPE by 1.5)
    const bestMAPE3 = bestMAPE * 1.5;
    const boundDelta3 = pred3 * (bestMAPE3 / 100);
    const lower3 = Math.max(0, Math.round(pred3 - boundDelta3));
    const upper3 = Math.round(pred3 + boundDelta3);
    
    // Generate explainability for 3 Month
    const explainResult3 = explainPrediction(currentPrice, pred3, featureMap3, commodity);
    
    resultsToUpsert.push({
      tanggal_prediksi: getFirstDayOfMonth(target3Year, target3Month),
      komoditas: commodity,
      periode: '3_bulan',
      prediksi_harga: pred3,
      lower_bound: lower3,
      upper_bound: upper3,
      akurasi: Math.max(0, Math.min(100, 100 - bestMAPE3)),
      mape: bestMAPE3,
      faktor_utama: explainResult3.factors,
      narasi: explainResult3.narasi
    });
  }
  
  if (resultsToUpsert.length === 0) {
    throw new Error('Tidak ada data prediksi yang berhasil diproduksi.');
  }
  
  console.log(`[ML Train] Menyimpan ${resultsToUpsert.length} data peramalan ke Supabase (forecast_result)...`);
  
  const { error: upsertError } = await supabase
    .from('forecast_result')
    .upsert(resultsToUpsert, { onConflict: 'komoditas, tanggal_prediksi, periode' });
    
  if (upsertError) {
    console.error('[ML Train] Gagal menyimpan ke forecast_result:', upsertError.message);
    throw new Error(`Gagal menyimpan hasil peramalan ke Supabase: ${upsertError.message}`);
  }
  
  console.log('✅ Pipeline pelatihan model dan forecasting selesai dengan sukses!');
  return {
    success: true,
    totalForecasts: resultsToUpsert.length,
    timestamp: new Date().toISOString()
  };
}
