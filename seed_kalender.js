const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Key Islamic holiday baseline dates (2022 - 2027)
const RAMADHAN_STARTS = [
  new Date('2022-04-03'),
  new Date('2023-03-23'),
  new Date('2024-03-12'),
  new Date('2025-03-01'),
  new Date('2026-02-18'),
  new Date('2027-02-07') // future baseline for late 2026 calculations
];

const IDUL_FITRIS = [
  new Date('2022-05-02'),
  new Date('2023-04-22'),
  new Date('2024-04-10'),
  new Date('2025-03-31'),
  new Date('2026-03-20'),
  new Date('2027-03-09') // future baseline for late 2026 calculations
];

const IDUL_ADHAS = [
  new Date('2022-07-10'),
  new Date('2023-06-29'),
  new Date('2024-06-17'),
  new Date('2025-06-06'),
  new Date('2026-05-27'),
  new Date('2027-05-16') // future baseline for late 2026 calculations
];

// Helper to convert Date object to YYYY-MM-DD string
function formatDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to calculate difference in days between two dates (d2 - d1)
function getDaysDifference(d1, d2) {
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

// Generate calendar rows from Jan 1, 2022 to Dec 31, 2026
function generateCalendarRows() {
  const rows = [];
  const start = new Date('2022-01-01');
  const end = new Date('2026-12-31');
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dayOfMonth = currentDate.getDate();
    
    // 1. Determine Ramadhan
    let is_ramadhan = false;
    for (let i = 0; i < RAMADHAN_STARTS.length; i++) {
      const ramadhanStart = RAMADHAN_STARTS[i];
      const ramadhanEnd = new Date(IDUL_FITRIS[i].getTime() - 24 * 60 * 60 * 1000);
      if (currentDate >= ramadhanStart && currentDate <= ramadhanEnd) {
        is_ramadhan = true;
        break;
      }
    }
    
    // 2. Determine Idul Fitri (Main Day)
    let is_idul_fitri = false;
    for (const f of IDUL_FITRIS) {
      if (currentDate.getFullYear() === f.getFullYear() &&
          currentDate.getMonth() === f.getMonth() &&
          currentDate.getDate() === f.getDate()) {
        is_idul_fitri = true;
        break;
      }
    }
    
    // 3. Determine Idul Adha (Main Day)
    let is_idul_adha = false;
    for (const a of IDUL_ADHAS) {
      if (currentDate.getFullYear() === a.getFullYear() &&
          currentDate.getMonth() === a.getMonth() &&
          currentDate.getDate() === a.getDate()) {
        is_idul_adha = true;
        break;
      }
    }
    
    // 4. Determine Nataru (Dec 24 to Jan 1)
    const is_nataru = (month === 12 && dayOfMonth >= 24) || (month === 1 && dayOfMonth === 1);
    
    // 5. Determine Cilegon School Holidays
    // Mid-year: June 20 to July 12
    // End-year: December 20 to January 3
    const is_libur_sekolah = 
      (month === 6 && dayOfMonth >= 20) || 
      (month === 7 && dayOfMonth <= 12) ||
      (month === 12 && dayOfMonth >= 20) || 
      (month === 1 && dayOfMonth <= 3);

    // 6. Calculate proximity days: hari_ke_ramadhan, hari_ke_idul_fitri, hari_ke_idul_adha
    // hari_ke_ramadhan: days to start of next Ramadhan. 0 if during Ramadhan.
    let hari_ke_ramadhan = null;
    if (is_ramadhan) {
      hari_ke_ramadhan = 0;
    } else {
      const nextRamadhanStart = RAMADHAN_STARTS.find(r => r >= currentDate);
      if (nextRamadhanStart) {
        hari_ke_ramadhan = getDaysDifference(currentDate, nextRamadhanStart);
      }
    }
    
    // hari_ke_idul_fitri: days to next Idul Fitri. 0 if on the day.
    let hari_ke_idul_fitri = null;
    const nextIdulFitri = IDUL_FITRIS.find(f => f >= currentDate);
    if (nextIdulFitri) {
      hari_ke_idul_fitri = getDaysDifference(currentDate, nextIdulFitri);
    }
    
    // hari_ke_idul_adha: days to next Idul Adha. 0 if on the day.
    let hari_ke_idul_adha = null;
    const nextIdulAdha = IDUL_ADHAS.find(a => a >= currentDate);
    if (nextIdulAdha) {
      hari_ke_idul_adha = getDaysDifference(currentDate, nextIdulAdha);
    }
    
    // 7. Calculate previous event offsets to determine post-event status (H+7)
    let days_since_idul_fitri = 999;
    const pastIdulFitris = IDUL_FITRIS.filter(f => f <= currentDate);
    if (pastIdulFitris.length > 0) {
      const prevIdulFitri = pastIdulFitris[pastIdulFitris.length - 1];
      days_since_idul_fitri = getDaysDifference(prevIdulFitri, currentDate);
    }
    
    let days_since_idul_adha = 999;
    const pastIdulAdhas = IDUL_ADHAS.filter(a => a <= currentDate);
    if (pastIdulAdhas.length > 0) {
      const prevIdulAdha = pastIdulAdhas[pastIdulAdhas.length - 1];
      days_since_idul_adha = getDaysDifference(prevIdulAdha, currentDate);
    }

    // 8. Determine general is_hbkn
    // HBKN covers: Ramadhan, H-30 to H+7 of Idul Fitri, H-30 to H+7 of Idul Adha, and Nataru (Dec 24 to Jan 1)
    const is_hbkn = 
      is_ramadhan || 
      (hari_ke_idul_fitri !== null && hari_ke_idul_fitri <= 30 && hari_ke_idul_fitri >= 0) || 
      (days_since_idul_fitri <= 7 && days_since_idul_fitri >= 0) ||
      (hari_ke_idul_adha !== null && hari_ke_idul_adha <= 30 && hari_ke_idul_adha >= 0) || 
      (days_since_idul_adha <= 7 && days_since_idul_adha >= 0) ||
      is_nataru;
      
    rows.push({
      tanggal: formatDateString(currentDate),
      tahun,
      bulan,
      is_hbkn,
      is_ramadhan,
      is_idul_fitri,
      is_idul_adha,
      is_nataru,
      is_libur_sekolah,
      hari_ke_ramadhan,
      hari_ke_idul_fitri,
      hari_ke_idul_adha
    });
  }
  
  return rows;
}

async function seed() {
  console.log('Generating calendar daily records (2022-2026)...');
  const rows = generateCalendarRows();
  console.log(`Generated ${rows.length} days of calendar features.`);
  
  console.log('Uploading calendar data to Supabase (kalender_ml)...');
  
  // Upload in chunks of 400 rows to ensure reliability and bypass HTTP size limits
  const chunkSize = 400;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    console.log(`Uploading chunk ${i / chunkSize + 1} of ${Math.ceil(rows.length / chunkSize)} (${chunk.length} rows)...`);
    
    const { error } = await supabase
      .from('kalender_ml')
      .upsert(chunk, { onConflict: 'tanggal' });
      
    if (error) {
      console.error('❌ Error uploading chunk:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('👉 IMPORTANT: Please execute migrate_kalender.sql in your Supabase SQL Editor first!');
      }
      process.exit(1);
    }
  }
  
  console.log('✅ Calendar features successfully seeded into Supabase table kalender_ml!');
}

seed().catch(console.error);
