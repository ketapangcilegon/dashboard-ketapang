const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStunting() {
  console.log('Querying balita underweight data for March 2026...');
  
  const { data: giziBalita, error } = await supabase
    .from('gizi_balita')
    .select('*')
    .eq('tahun', 2026)
    .eq('bulan', 3);
    
  if (error) {
    console.error('Error gizi_balita:', error);
  } else {
    console.log('gizi_balita March 2026 count:', giziBalita?.length || 0);
    if (giziBalita && giziBalita.length > 0) {
      console.log('gizi_balita sample:', giziBalita[0]);
    }
  }
  
  const { data: balitaGizi, error2 } = await supabase
    .from('balita_gizi')
    .select('*')
    .eq('tahun', 2026)
    .eq('bulan', 3);
    
  if (error2) {
    console.error('Error balita_gizi:', error2);
  } else {
    console.log('balita_gizi March 2026 count:', balitaGizi?.length || 0);
    if (balitaGizi && balitaGizi.length > 0) {
      console.log('balita_gizi sample:', balitaGizi[0]);
    }
  }
}

checkStunting();
