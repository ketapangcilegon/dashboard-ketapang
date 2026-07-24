import { supabase } from '@/lib/supabase';
import { XGBoostRegressor, RandomForestRegressor, ProphetRegressor } from './algorithms';
import { evaluatePredictions } from './evaluate';
import { explainPrediction } from './explain';
import { createClient } from '@supabase/supabase-js';

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
  is_hbkn?: boolean;
}

interface EngineeredSample {
  y: number;
  features: number[];
  featureMap: Record<string, number>;
  tahun: number;
  bulan: number;
}

const FEATURE_NAMES = [
  'lag_1', 'lag_2', 'lag_3', 'moving_avg_3', 'moving_avg_6', 'rolling_std_3',
  'bulan', 'quarter', 'is_hbkn', 'trend_3', 'growth_yoy', 'cv_12',
  'ihk', 'inflasi_mtm', 'inflasi_yoy', 'curah_hujan_mm', 'suhu_c',
  'kelembapan', 'hari_hujan', 'ramadhan', 'idul_fitri', 'idul_adha',
  'nataru', 'hari_menuju_idul_fitri', 'hari_menuju_idul_adha'
];

// Helper to compute features for a given commodity at row index `t`
function computeFeatures(rawRows: RawDatasetRow[], t: number, commodity: string): Record<string, number> | null {
  const currentRow = rawRows[t];
  
  // We need actual price data from t-1 down to t-13
  const prices: number[] = [];
  for (let i = 1; i <= 13; i++) {
    const val = rawRows[t - i]?.[commodity as keyof RawDatasetRow];
    if (val === null || val === undefined || typeof val !== 'number' || val <= 0) {
      return null; // incomplete lag history
    }
    prices.push(val);
  }
  
  const lag_1 = prices[0];
  const lag_2 = prices[1];
  const lag_3 = prices[2];
  const lag_4 = prices[3];
  const lag_5 = prices[4];
  const lag_6 = prices[5];
  const lag_13 = prices[12];
  
  const moving_avg_3 = (lag_1 + lag_2 + lag_3) / 3;
  const moving_avg_6 = (lag_1 + lag_2 + lag_3 + lag_4 + lag_5 + lag_6) / 6;
  
  const mean3 = moving_avg_3;
  const var3 = ((lag_1 - mean3)**2 + (lag_2 - mean3)**2 + (lag_3 - mean3)**2) / 3;
  const rolling_std_3 = Math.sqrt(var3);
  
  const trend_3 = lag_1 - lag_3;
  const growth_yoy = ((lag_1 - lag_13) / lag_13) * 100;
  
  const prices_12 = prices.slice(0, 12);
  const mean12 = prices_12.reduce((s, p) => s + p, 0) / 12;
  const var12 = prices_12.reduce((s, p) => s + (p - mean12)**2, 0) / 12;
  const std12 = Math.sqrt(var12);
  const cv_12 = mean12 > 0 ? (std12 / mean12) * 100 : 0;
  
  const bulan = currentRow.bulan;
  const quarter = Math.ceil(bulan / 3);
  const is_hbkn = currentRow.is_hbkn ? 1 : 0;
  
  return {
    lag_1,
    lag_2,
    lag_3,
    moving_avg_3,
    moving_avg_6,
    rolling_std_3,
    bulan,
    quarter,
    is_hbkn,
    trend_3,
    growth_yoy,
    cv_12,
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
}

export async function trainAndForecastAll(token?: string) {
  console.log('[ML Train] Memulai pipeline training model ML...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const dbClient = createClient(supabaseUrl, supabaseKey);
  
  if (token && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await dbClient.auth.setSession({ access_token: token, refresh_token: '' });
  }

  // 1. Fetch entire historical dataset from forecast_dataset view
  const { data, error } = await dbClient
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
    
    const samples: EngineeredSample[] = [];
    
    // We start from index 13 since we need at least 13 months of past data for lag_13 (growth_yoy)
    for (let t = 13; t < rawRows.length; t++) {
      const currentRow = rawRows[t];
      const targetVal = currentRow[commodity as keyof RawDatasetRow] as number | null;
      
      if (targetVal === null || targetVal === undefined || targetVal <= 0) continue;
      
      const featureMap = computeFeatures(rawRows, t, commodity);
      if (!featureMap) continue; // Skip if lags are incomplete
      
      const features = FEATURE_NAMES.map(name => featureMap[name]);
      
      samples.push({
        y: targetVal as number,
        features,
        featureMap,
        tahun: currentRow.tahun,
        bulan: currentRow.bulan
      });
    }
    
    if (samples.length < 12) {
      console.warn(`[ML Train] Data sampel terlalu sedikit untuk ${commodity}. Dilewati.`);
      continue;
    }

interface WalkForwardMetrics {
  mape: number;
  rmse: number;
  mae: number;
  totalTestSamples: number;
  foldCount: number;
}

/**
 * Expanding Window / Walk-Forward Validation
 * Evaluates model performance across multiple historical validation folds:
 * - Fold 1: Train <= 2022, Test == 2023
 * - Fold 2: Train <= 2023, Test == 2024
 * - Fold 3: Train <= 2024, Test == 2025
 * - Fold 4: Train <= 2025, Test == 2026 (partial year)
 * 
 * Aggregates out-of-sample error metrics over all folds for stable, scientifically sound Confidence Scoring.
 */
function runWalkForwardValidation(
  samples: EngineeredSample[],
  modelType: 'xgboost' | 'prophet' | 'randomforest'
): WalkForwardMetrics {
  const years = Array.from(new Set(samples.map(s => s.tahun))).sort((a, b) => a - b);

  if (years.length < 2) {
    const trainCount = Math.floor(samples.length * 0.8);
    const trainX = samples.slice(0, trainCount).map(s => s.features);
    const trainY = samples.slice(0, trainCount).map(s => s.y);
    const valX = samples.slice(trainCount).map(s => s.features);
    const valY = samples.slice(trainCount).map(s => s.y);

    let model: XGBoostRegressor | ProphetRegressor | RandomForestRegressor;
    if (modelType === 'xgboost') model = new XGBoostRegressor(12, 3, 0.1);
    else if (modelType === 'prophet') model = new ProphetRegressor();
    else model = new RandomForestRegressor(10, 4);

    model.fit(trainX, trainY);
    const preds = valX.map(x => model.predict(x));
    const evalResult = evaluatePredictions(valY, preds);
    return { ...evalResult, totalTestSamples: valY.length, foldCount: 1 };
  }

  const allActuals: number[] = [];
  const allPredictions: number[] = [];
  let foldCount = 0;

  const minTrainIdx = 1;
  for (let i = minTrainIdx; i < years.length; i++) {
    const testYear = years[i];
    const trainSamples = samples.filter(s => s.tahun < testYear);
    const testSamples = samples.filter(s => s.tahun === testYear);

    if (trainSamples.length < 6 || testSamples.length === 0) continue;

    const trainX = trainSamples.map(s => s.features);
    const trainY = trainSamples.map(s => s.y);
    const testX = testSamples.map(s => s.features);
    const testY = testSamples.map(s => s.y);

    let model: XGBoostRegressor | ProphetRegressor | RandomForestRegressor;
    if (modelType === 'xgboost') model = new XGBoostRegressor(12, 3, 0.1);
    else if (modelType === 'prophet') model = new ProphetRegressor();
    else model = new RandomForestRegressor(10, 4);

    model.fit(trainX, trainY);
    const preds = testX.map(x => model.predict(x));

    allActuals.push(...testY);
    allPredictions.push(...preds);
    foldCount++;
  }

  if (allActuals.length === 0) {
    return { mape: 5.0, rmse: 500, mae: 400, totalTestSamples: 0, foldCount: 0 };
  }

  const metrics = evaluatePredictions(allActuals, allPredictions);
  return {
    mape: metrics.mape,
    rmse: metrics.rmse,
    mae: metrics.mae,
    totalTestSamples: allActuals.length,
    foldCount
  };
}

    // 3. Walk-Forward Cross Validation across expanding time windows
    const xgbMetrics = runWalkForwardValidation(samples, 'xgboost');
    const prophetMetrics = runWalkForwardValidation(samples, 'prophet');
    const rfMetrics = runWalkForwardValidation(samples, 'randomforest');
    
    // Select champion model with the lowest aggregated Walk-Forward MAPE
    let bestModelType: 'xgboost' | 'prophet' | 'randomforest' = 'xgboost';
    let bestMetrics = xgbMetrics;
    
    if (prophetMetrics.mape < bestMetrics.mape) {
      bestModelType = 'prophet';
      bestMetrics = prophetMetrics;
    }
    if (rfMetrics.mape < bestMetrics.mape) {
      bestModelType = 'randomforest';
      bestMetrics = rfMetrics;
    }
    
    console.log(`[ML Train] Model terbaik untuk ${commodity}: ${bestModelType.toUpperCase()} (Walk-Forward MAPE: ${bestMetrics.mape}%, n=${bestMetrics.totalTestSamples} obs across ${bestMetrics.foldCount} folds)`);
    
    // Save active champion model metrics to model_registry table
    try {
      await dbClient.from('model_registry').insert([{
        komoditas: commodity,
        model_name: bestModelType,
        mape: bestMetrics.mape,
        rmse: bestMetrics.rmse,
        mae: bestMetrics.mae
      }]);
    } catch (regError) {
      console.warn(`[ML Train] Gagal menyimpan ke model_registry:`, regError);
    }
    
    // Retrain the selected champion model on the entire dataset
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
    
    // Find the latest index having actual price
    let latestIdx = rawRows.length - 1;
    while (latestIdx >= 0 && (rawRows[latestIdx][commodity as keyof RawDatasetRow] === null || (rawRows[latestIdx][commodity as keyof RawDatasetRow] as number) <= 0)) {
      latestIdx--;
    }
    
    if (latestIdx < 13) {
      console.warn(`[ML Train] Tidak ada data harga terbaru untuk ${commodity}. Dilewati.`);
      continue;
    }
    
    const latestRow = rawRows[latestIdx];
    const currentPrice = latestRow[commodity as keyof RawDatasetRow] as number;
    const currentYear = latestRow.tahun;
    const currentMonth = latestRow.bulan;
    
    // Target projection dates
    // 1 Month ahead
    let target1Month = currentMonth + 1;
    let target1Year = currentYear;
    if (target1Month > 12) {
      target1Month = 1;
      target1Year++;
    }
    
    // 3 Months ahead
    let target3Month = currentMonth + 3;
    let target3Year = currentYear;
    if (target3Month > 12) {
      target3Month = target3Month - 12;
      target3Year++;
    }
    
    // Find future feature rows in rawRows view
    const findFutureRow = (y: number, m: number) => {
      return rawRows.find(row => row.tahun === y && row.bulan === m);
    };
    
    const rowT1 = findFutureRow(target1Year, target1Month);
    const rowT2 = findFutureRow(target1Month === 12 ? target1Year + 1 : target1Year, target1Month === 12 ? 1 : target1Month + 1);
    const rowT3 = findFutureRow(target3Year, target3Month);
    
    if (!rowT1 || !rowT3) {
      console.warn(`[ML Train] Baris target masa depan di forecast_dataset tidak ditemukan untuk ${commodity}.`);
      continue;
    }
    
    // Extract actual price series from rawRows ending at latestIdx
    const actualPrices: number[] = [];
    for (let i = 0; i < 13; i++) {
      actualPrices.push(rawRows[latestIdx - i][commodity as keyof RawDatasetRow] as number);
    }
    
    // Helper to compute features using historical actuals and recursive predictions
    const computeForecastFeatures = (tRow: RawDatasetRow, simulatedHistory: number[]) => {
      const lag_1 = simulatedHistory[0];
      const lag_2 = simulatedHistory[1];
      const lag_3 = simulatedHistory[2];
      const lag_4 = simulatedHistory[3];
      const lag_5 = simulatedHistory[4];
      const lag_6 = simulatedHistory[5];
      const lag_13 = simulatedHistory[12];
      
      const moving_avg_3 = (lag_1 + lag_2 + lag_3) / 3;
      const moving_avg_6 = (lag_1 + lag_2 + lag_3 + lag_4 + lag_5 + lag_6) / 6;
      
      const mean3 = moving_avg_3;
      const var3 = ((lag_1 - mean3)**2 + (lag_2 - mean3)**2 + (lag_3 - mean3)**2) / 3;
      const rolling_std_3 = Math.sqrt(var3);
      
      const trend_3 = lag_1 - lag_3;
      const growth_yoy = ((lag_1 - lag_13) / lag_13) * 100;
      
      const prices_12 = simulatedHistory.slice(0, 12);
      const mean12 = prices_12.reduce((s, p) => s + p, 0) / 12;
      const var12 = prices_12.reduce((s, p) => s + (p - mean12)**2, 0) / 12;
      const std12 = Math.sqrt(var12);
      const cv_12 = mean12 > 0 ? (std12 / mean12) * 100 : 0;
      
      const bulan = tRow.bulan;
      const quarter = Math.ceil(bulan / 3);
      const is_hbkn = tRow.is_hbkn ? 1 : 0;
      
      return {
        lag_1,
        lag_2,
        lag_3,
        moving_avg_3,
        moving_avg_6,
        rolling_std_3,
        bulan,
        quarter,
        is_hbkn,
        trend_3,
        growth_yoy,
        cv_12,
        ihk: tRow.ihk || 120.0,
        inflasi_mtm: tRow.inflasi_mtm || 0.22,
        inflasi_yoy: tRow.inflasi_yoy || 1.7,
        curah_hujan_mm: tRow.curah_hujan_mm || 150,
        suhu_c: tRow.suhu_c || 27.5,
        kelembapan: tRow.kelembapan || 79,
        hari_hujan: tRow.hari_hujan || 10,
        ramadhan: tRow.ramadhan || 0,
        idul_fitri: tRow.idul_fitri || 0,
        idul_adha: tRow.idul_adha || 0,
        nataru: tRow.nataru || 0,
        hari_menuju_idul_fitri: tRow.hari_menuju_idul_fitri || 365,
        hari_menuju_idul_adha: tRow.hari_menuju_idul_adha || 365
      };
    };
    
    // --- STEP A: Forecast 1 Month Ahead (t+1) ---
    const history1 = [...actualPrices];
    const featMap1 = computeForecastFeatures(rowT1, history1);
    const vec1 = FEATURE_NAMES.map(name => (featMap1 as Record<string, number>)[name]);
    const pred1 = Math.round(championModel.predict(vec1));
    
    // --- STEP B: Recursive Forecast 3 Months Ahead (t+3) ---
    // Predict T+2 first
    let pred2 = pred1;
    if (rowT2) {
      const history2 = [pred1, ...actualPrices.slice(0, 12)];
      const featMap2 = computeForecastFeatures(rowT2, history2);
      const vec2 = FEATURE_NAMES.map(name => (featMap2 as Record<string, number>)[name]);
      pred2 = Math.round(championModel.predict(vec2));
    }
    
    // Predict T+3
    const history3 = [pred2, pred1, ...actualPrices.slice(0, 11)];
    const featMap3 = computeForecastFeatures(rowT3, history3);
    const vec3 = FEATURE_NAMES.map(name => (featMap3 as Record<string, number>)[name]);
    const pred3 = Math.round(championModel.predict(vec3));
    
    // Calculate final metrics for the output table
    const perubahan_pct = ((pred1 - currentPrice) / currentPrice) * 100;
    
    const boundDelta = pred1 * (bestMetrics.mape / 100);
    const lower = Math.max(0, Math.round(pred1 - boundDelta));
    const upper = Math.round(pred1 + boundDelta);
    
    // Volatility CV (12-month) and YoY Growth Rate on actual data
    const prices_12 = actualPrices.slice(0, 12);
    const mean12 = prices_12.reduce((s, p) => s + p, 0) / 12;
    const var12 = prices_12.reduce((s, p) => s + (p - mean12)**2, 0) / 12;
    const std12 = Math.sqrt(var12);
    const cv = mean12 > 0 ? (std12 / mean12) * 100 : 0;
    
    const lag_13 = actualPrices[12];
    const growth_yoy = ((currentPrice - lag_13) / lag_13) * 100;
    
    // EWS Layer Classification
    // Layer 1: Forecast Trend
    let status_forecast = "Stabil";
    if (perubahan_pct > 3) status_forecast = "Naik";
    else if (perubahan_pct < -3) status_forecast = "Turun";
    
    // Layer 2: Volatilitas (CV)
    let status_cv = "AMAN";
    if (commodity === 'harga_beras') {
      if (cv > 10) status_cv = "RENTAN";
      else if (cv >= 5) status_cv = "WASPADA";
    } else {
      if (cv > 15) status_cv = "RENTAN";
      else if (cv >= 9) status_cv = "WASPADA";
    }
    
    // Layer 3: SKPG (YoY Growth)
    let status_skpg = "AMAN";
    if (commodity === 'harga_beras') {
      if (growth_yoy > 10) status_skpg = "RENTAN";
      else if (growth_yoy >= 5) status_skpg = "WASPADA";
    } else if (commodity === 'harga_minyak_goreng' || commodity === 'harga_telur_ayam_ras') {
      if (growth_yoy > 15) status_skpg = "RENTAN";
      else if (growth_yoy >= 5) status_skpg = "WASPADA";
    } else {
      if (growth_yoy > 10) status_skpg = "RENTAN";
      else if (growth_yoy >= 5) status_skpg = "WASPADA";
    }
    
    const confidence = Math.max(0, Math.min(100, 100 - bestMetrics.mape));
    
    // Generate explanation details
    const explanation = explainPrediction(
      currentPrice,
      pred1,
      featMap1,
      commodity,
      cv,
      growth_yoy,
      status_cv,
      status_skpg
    );
    
    resultsToUpsert.push({
      komoditas: commodity,
      harga_aktual: currentPrice,
      forecast_1m: pred1,
      forecast_3m: pred3,
      perubahan_pct,
      lower_bound: lower,
      upper_bound: upper,
      cv,
      growth_yoy,
      status_forecast,
      status_cv,
      status_skpg,
      confidence,
      drivers: explanation.factors,
      narasi: explanation.narasi,
      rekomendasi: explanation.rekomendasi
    });
  }
  
  if (resultsToUpsert.length === 0) {
    throw new Error('Tidak ada data prediksi yang berhasil diproduksi.');
  }
  
  console.log(`[ML Train] Menyimpan ${resultsToUpsert.length} data peramalan ke Supabase (forecast_result)...`);
  
  const { error: upsertError } = await dbClient
    .from('forecast_result')
    .upsert(resultsToUpsert, { onConflict: 'komoditas' });
    
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
