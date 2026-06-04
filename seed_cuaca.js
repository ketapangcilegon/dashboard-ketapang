const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLIMATOLOGY = {
  1: { curah_hujan_mm: 340, suhu_c: 26.8, kelembapan: 83, hari_hujan: 18, kecepatan_angin: 13 },
  2: { curah_hujan_mm: 290, suhu_c: 27.0, kelembapan: 82, hari_hujan: 16, kecepatan_angin: 12 },
  3: { curah_hujan_mm: 210, suhu_c: 27.4, kelembapan: 81, hari_hujan: 14, kecepatan_angin: 11 },
  4: { curah_hujan_mm: 140, suhu_c: 28.0, kelembapan: 79, hari_hujan: 10, kecepatan_angin: 10 },
  5: { curah_hujan_mm: 110, suhu_c: 28.5, kelembapan: 78, hari_hujan: 8, kecepatan_angin: 9 },
  6: { curah_hujan_mm: 70,  suhu_c: 28.2, kelembapan: 76, hari_hujan: 6, kecepatan_angin: 9 },
  7: { curah_hujan_mm: 50,  suhu_c: 27.9, kelembapan: 75, hari_hujan: 4, kecepatan_angin: 10 },
  8: { curah_hujan_mm: 60,  suhu_c: 28.1, kelembapan: 74, hari_hujan: 4, kecepatan_angin: 11 },
  9: { curah_hujan_mm: 80,  suhu_c: 28.6, kelembapan: 75, hari_hujan: 5, kecepatan_angin: 11 },
  10: { curah_hujan_mm: 150, suhu_c: 28.4, kelembapan: 78, hari_hujan: 11, kecepatan_angin: 10 },
  11: { curah_hujan_mm: 250, suhu_c: 27.6, kelembapan: 81, hari_hujan: 15, kecepatan_angin: 11 },
  12: { curah_hujan_mm: 310, suhu_c: 27.1, kelembapan: 83, hari_hujan: 17, kecepatan_angin: 12 }
};

function generateWeatherData() {
  const rows = [];
  
  for (let year = 2022; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const base = CLIMATOLOGY[month];
      
      let hujan_factor = 1.0;
      let suhu_offset = 0.0;
      let kelembapan_offset = 0;
      let hari_hujan_offset = 0;
      
      if (year === 2022) {
        // La Nina (Wetter and slightly cooler)
        const isDrySeason = month >= 6 && month <= 9;
        hujan_factor = isDrySeason ? 1.6 : 1.25;
        suhu_offset = -0.3;
        kelembapan_offset = 2;
        hari_hujan_offset = isDrySeason ? 3 : 2;
      } else if (year === 2023) {
        // El Nino (Much drier and warmer)
        const isDrySeason = month >= 6 && month <= 10;
        hujan_factor = isDrySeason ? 0.15 : 0.65;
        suhu_offset = isDrySeason ? 0.8 : 0.4;
        kelembapan_offset = isDrySeason ? -5 : -3;
        hari_hujan_offset = isDrySeason ? -3 : -2;
      } else if (year === 2024) {
        // Normal year
        hujan_factor = 0.95;
        suhu_offset = 0.0;
        kelembapan_offset = 0;
        hari_hujan_offset = 0;
      } else if (year === 2025) {
        // Weak La Nina / Normal
        hujan_factor = 1.05;
        suhu_offset = 0.1;
        kelembapan_offset = 0;
        hari_hujan_offset = 0;
      } else if (year === 2026) {
        // 2026 Climatology baseline (will be updated with live BMKG forecast by ETL)
        hujan_factor = 1.0;
        suhu_offset = 0.0;
        kelembapan_offset = 0;
        hari_hujan_offset = 0;
      }
      
      // Calculate final weather data
      const curah_hujan_mm = Math.round(base.curah_hujan_mm * hujan_factor);
      const suhu_c = Math.round((base.suhu_c + suhu_offset) * 10) / 10;
      const kelembapan = Math.min(100, Math.max(0, base.kelembapan + kelembapan_offset));
      const hari_hujan = Math.max(0, base.hari_hujan + hari_hujan_offset);
      const kecepatan_angin = base.kecepatan_angin; // Keep wind constant or add minor noise
      
      rows.push({
        tahun: year,
        bulan: month,
        curah_hujan_mm,
        suhu_c,
        kelembapan,
        hari_hujan,
        kecepatan_angin
      });
    }
  }
  
  return rows;
}

async function seedCuaca() {
  console.log('Generating weather seed data...');
  const data = generateWeatherData();
  console.log(`Generated ${data.length} monthly weather records.`);
  
  console.log('Uploading weather data to Supabase (cuaca_ml)...');
  const { error } = await supabase
    .from('cuaca_ml')
    .upsert(data, { onConflict: 'tahun, bulan' });
    
  if (error) {
    console.error('❌ Error seeding weather data:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('👉 IMPORTANT: Please execute migrate_cuaca.sql in your Supabase SQL Editor first!');
    }
  } else {
    console.log('✅ Weather data successfully seeded into Supabase table cuaca_ml!');
  }
}

seedCuaca().catch(console.error);
