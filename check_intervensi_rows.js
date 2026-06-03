const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('intervensi_kelurahan').select('*');
  if (error) {
    console.error("Error querying intervensi_kelurahan:", error.message);
  } else {
    console.log(`Total rows in intervensi_kelurahan: ${data.length}`);
    if (data.length > 0) {
      console.log("Sample rows:");
      console.log(data.slice(0, 5));
    }
  }
}

run();
