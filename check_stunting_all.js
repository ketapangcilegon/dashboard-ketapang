const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllStunting() {
  console.log('Querying years/months with data in gizi_balita and balita_gizi...');
  
  const { data: giziBalita } = await supabase
    .from('gizi_balita')
    .select('tahun, bulan')
    .limit(100);
    
  const { data: balitaGizi } = await supabase
    .from('balita_gizi')
    .select('tahun, bulan')
    .limit(100);
    
  console.log('gizi_balita records found:', giziBalita?.length || 0);
  console.log('balita_gizi records found:', balitaGizi?.length || 0);
  
  if (giziBalita && giziBalita.length > 0) {
    const uniqueGizi = [...new Set(giziBalita.map(x => `${x.tahun}-${x.bulan}`))];
    console.log('Unique periods in gizi_balita:', uniqueGizi);
  }
  
  if (balitaGizi && balitaGizi.length > 0) {
    const uniqueBalita = [...new Set(balitaGizi.map(x => `${x.tahun}-${x.bulan}`))];
    console.log('Unique periods in balita_gizi:', uniqueBalita);
  }
}

checkAllStunting();
