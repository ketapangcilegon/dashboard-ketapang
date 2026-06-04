import { trainAndForecastAll } from './ml/train_model';

/**
 * Retrains the ML models and updates the forecast results.
 * This is triggered by cron jobs, ETL pipelines, or administrative manual runs.
 */
export async function retrainModel() {
  console.log('[ML Retrain] Memulai retraining model terpadu...');
  const result = await trainAndForecastAll();
  return {
    success: true,
    totalForecasts: result.totalForecasts,
    trained_at: result.timestamp
  };
}
