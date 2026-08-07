const { trainAndForecastAll } = require('./src/lib/ml/train_model');

async function run() {
  console.log('🚀 Triggering ML retraining pipeline...');
  try {
    const res = await trainAndForecastAll();
    console.log('✅ Retraining finished:', res);
  } catch (err) {
    console.error('❌ Error during retraining:', err);
  }
}

run();
