const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('Querying table structures from Supabase...');
  
  // We can query information_schema or try to fetch a non-existent row to see if it returns metadata
  const tables = ['harga_pangan', 'ketersediaan_pangan', 'gizi_masyarakat', 'intervensi_pangan'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table ${table} columns:`, Object.keys(data[0] || {}));
    }
  }
}

checkColumns();
