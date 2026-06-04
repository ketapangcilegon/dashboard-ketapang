/**
 * Utility functions for evaluating model performance
 */

export interface EvaluationMetrics {
  mae: number;
  rmse: number;
  mape: number;
}

export function calculateMAE(actuals: number[], predictions: number[]): number {
  if (actuals.length === 0 || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    sum += Math.abs(actuals[i] - predictions[i]);
  }
  return sum / actuals.length;
}

export function calculateRMSE(actuals: number[], predictions: number[]): number {
  if (actuals.length === 0 || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    const diff = actuals[i] - predictions[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / actuals.length);
}

export function calculateMAPE(actuals: number[], predictions: number[]): number {
  if (actuals.length === 0 || actuals.length !== predictions.length) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < actuals.length; i++) {
    if (actuals[i] !== 0) {
      sum += Math.abs((actuals[i] - predictions[i]) / actuals[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : 0;
}

export function evaluatePredictions(actuals: number[], predictions: number[]): EvaluationMetrics {
  const mae = Math.round(calculateMAE(actuals, predictions) * 1000) / 1000;
  const rmse = Math.round(calculateRMSE(actuals, predictions) * 1000) / 1000;
  const mape = Math.round(calculateMAPE(actuals, predictions) * 1000) / 1000;
  
  return { mae, rmse, mape };
}
