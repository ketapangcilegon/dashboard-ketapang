const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables
const envText = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error, count } = await supabase
    .from('forecast_result')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching forecast_result:', error.message);
  } else {
    console.log(`forecast_result has ${count} rows`);
    if (data && data.length > 0) {
      console.log('Sample row keys:', Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    }
  }
}

check();
