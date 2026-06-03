const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const selectedYear = 2025;
  const selectedMonth = 2;
  
  console.log(`Querying selected: ${selectedYear} month: ${selectedMonth}`);
  let { data: intervensi, error: intError } = await supabase
    .from('intervensi_kelurahan')
    .select('*')
    .eq('tahun', selectedYear)
    .eq('bulan', selectedMonth);
    
  console.log("Error:", intError);
  console.log("Result length:", intervensi ? intervensi.length : 0);
  
  if (!intError && intervensi && intervensi.length > 0) {
    console.log("Success! Length:", intervensi.length);
  } else {
    console.log("Fallback 1: selectedYear, month 1");
    const { data: fbYear, error: errYear } = await supabase
      .from('intervensi_kelurahan')
      .select('*')
      .eq('tahun', selectedYear)
      .eq('bulan', 1);
      
    console.log("FB1 Error:", errYear);
    console.log("FB1 Result length:", fbYear ? fbYear.length : 0);
    
    if (fbYear && fbYear.length > 0) {
      console.log("FB1 Success!");
    } else {
      console.log("Fallback 2: 2026 month 1");
      const { data: fbDefault, error: errDefault } = await supabase
        .from('intervensi_kelurahan')
        .select('*')
        .eq('tahun', 2026)
        .eq('bulan', 1);
        
      console.log("FB2 Error:", errDefault);
      console.log("FB2 Result length:", fbDefault ? fbDefault.length : 0);
      if (fbDefault) {
        console.log("Sample FB2 rows:", fbDefault.slice(0, 3));
      }
    }
  }
}

run();
