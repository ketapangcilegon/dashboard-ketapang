const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjycaxccbasksjooxrqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWNheGNjYmFza3Nqb294cnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Njk4NjcsImV4cCI6MjA5NTM0NTg2N30.HyFsymcv70yFFvSCicOHwQoz6aYPgZTc0dAhcoI__lo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HISTORICAL_INFLATION = [
  // 2022
  { tahun: 2022, bulan: 1, ihk: 107.233, inflasi_mtm: 0.550, inflasi_yoy: 2.110 },
  { tahun: 2022, bulan: 2, ihk: 107.814, inflasi_mtm: 0.540, inflasi_yoy: 2.230 },
  { tahun: 2022, bulan: 3, ihk: 108.150, inflasi_mtm: 0.310, inflasi_yoy: 2.420 },
  { tahun: 2022, bulan: 4, ihk: 109.180, inflasi_mtm: 0.950, inflasi_yoy: 3.150 },
  { tahun: 2022, bulan: 5, ihk: 109.620, inflasi_mtm: 0.400, inflasi_yoy: 3.350 },
  { tahun: 2022, bulan: 6, ihk: 110.290, inflasi_mtm: 0.610, inflasi_yoy: 4.100 },
  { tahun: 2022, bulan: 7, ihk: 110.980, inflasi_mtm: 0.630, inflasi_yoy: 4.650 },
  { tahun: 2022, bulan: 8, ihk: 110.750, inflasi_mtm: -0.210, inflasi_yoy: 4.400 },
  { tahun: 2022, bulan: 9, ihk: 112.050, inflasi_mtm: 1.170, inflasi_yoy: 5.710 }, // Fuel shock
  { tahun: 2022, bulan: 10, ihk: 112.180, inflasi_mtm: 0.120, inflasi_yoy: 5.450 },
  { tahun: 2022, bulan: 11, ihk: 112.280, inflasi_mtm: 0.090, inflasi_yoy: 5.200 },
  { tahun: 2022, bulan: 12, ihk: 112.820, inflasi_mtm: 0.480, inflasi_yoy: 5.510 },
  
  // 2023
  { tahun: 2023, bulan: 1, ihk: 113.150, inflasi_mtm: 0.290, inflasi_yoy: 5.280 },
  { tahun: 2023, bulan: 2, ihk: 113.330, inflasi_mtm: 0.160, inflasi_yoy: 5.090 },
  { tahun: 2023, bulan: 3, ihk: 113.560, inflasi_mtm: 0.200, inflasi_yoy: 4.970 },
  { tahun: 2023, bulan: 4, ihk: 114.100, inflasi_mtm: 0.480, inflasi_yoy: 4.480 },
  { tahun: 2023, bulan: 5, ihk: 114.280, inflasi_mtm: 0.160, inflasi_yoy: 4.220 },
  { tahun: 2023, bulan: 6, ihk: 114.450, inflasi_mtm: 0.150, inflasi_yoy: 3.720 },
  { tahun: 2023, bulan: 7, ihk: 114.770, inflasi_mtm: 0.280, inflasi_yoy: 3.360 },
  { tahun: 2023, bulan: 8, ihk: 114.680, inflasi_mtm: -0.080, inflasi_yoy: 3.480 },
  { tahun: 2023, bulan: 9, ihk: 114.930, inflasi_mtm: 0.220, inflasi_yoy: 2.530 },
  { tahun: 2023, bulan: 10, ihk: 115.120, inflasi_mtm: 0.170, inflasi_yoy: 2.580 },
  { tahun: 2023, bulan: 11, ihk: 115.480, inflasi_mtm: 0.310, inflasi_yoy: 2.810 },
  { tahun: 2023, bulan: 12, ihk: 116.030, inflasi_mtm: 0.480, inflasi_yoy: 2.810 },
  
  // 2024
  { tahun: 2024, bulan: 1, ihk: 116.320, inflasi_mtm: 0.250, inflasi_yoy: 2.780 },
  { tahun: 2024, bulan: 2, ihk: 116.580, inflasi_mtm: 0.220, inflasi_yoy: 2.840 },
  { tahun: 2024, bulan: 3, ihk: 117.060, inflasi_mtm: 0.410, inflasi_yoy: 3.050 },
  { tahun: 2024, bulan: 4, ihk: 117.290, inflasi_mtm: 0.200, inflasi_yoy: 2.770 },
  { tahun: 2024, bulan: 5, ihk: 117.260, inflasi_mtm: -0.030, inflasi_yoy: 2.580 },
  { tahun: 2024, bulan: 6, ihk: 117.180, inflasi_mtm: -0.070, inflasi_yoy: 2.360 },
  { tahun: 2024, bulan: 7, ihk: 117.160, inflasi_mtm: -0.020, inflasi_yoy: 2.060 },
  { tahun: 2024, bulan: 8, ihk: 117.130, inflasi_mtm: -0.030, inflasi_yoy: 2.110 },
  { tahun: 2024, bulan: 9, ihk: 117.050, inflasi_mtm: -0.070, inflasi_yoy: 1.840 },
  { tahun: 2024, bulan: 10, ihk: 117.110, inflasi_mtm: 0.050, inflasi_yoy: 1.710 },
  { tahun: 2024, bulan: 11, ihk: 117.430, inflasi_mtm: 0.270, inflasi_yoy: 1.660 },
  { tahun: 2024, bulan: 12, ihk: 117.860, inflasi_mtm: 0.370, inflasi_yoy: 1.550 },
  
  // 2025
  { tahun: 2025, bulan: 1, ihk: 118.150, inflasi_mtm: 0.250, inflasi_yoy: 1.570 },
  { tahun: 2025, bulan: 2, ihk: 118.330, inflasi_mtm: 0.150, inflasi_yoy: 1.500 },
  { tahun: 2025, bulan: 3, ihk: 118.670, inflasi_mtm: 0.290, inflasi_yoy: 1.380 },
  { tahun: 2025, bulan: 4, ihk: 118.960, inflasi_mtm: 0.240, inflasi_yoy: 1.420 },
  { tahun: 2025, bulan: 5, ihk: 118.900, inflasi_mtm: -0.050, inflasi_yoy: 1.400 },
  { tahun: 2025, bulan: 6, ihk: 118.810, inflasi_mtm: -0.080, inflasi_yoy: 1.390 },
  { tahun: 2025, bulan: 7, ihk: 118.880, inflasi_mtm: 0.060, inflasi_yoy: 1.470 },
  { tahun: 2025, bulan: 8, ihk: 118.820, inflasi_mtm: -0.050, inflasi_yoy: 1.440 },
  { tahun: 2025, bulan: 9, ihk: 118.850, inflasi_mtm: 0.030, inflasi_yoy: 1.540 },
  { tahun: 2025, bulan: 10, ihk: 118.940, inflasi_mtm: 0.080, inflasi_yoy: 1.560 },
  { tahun: 2025, bulan: 11, ihk: 119.290, inflasi_mtm: 0.290, inflasi_yoy: 1.580 },
  { tahun: 2025, bulan: 12, ihk: 119.820, inflasi_mtm: 0.440, inflasi_yoy: 1.660 },
  
  // 2026 (Jan-Jun available, Jul-Dec will be null)
  { tahun: 2026, bulan: 1, ihk: 120.150, inflasi_mtm: 0.280, inflasi_yoy: 1.690 },
  { tahun: 2026, bulan: 2, ihk: 120.310, inflasi_mtm: 0.130, inflasi_yoy: 1.670 },
  { tahun: 2026, bulan: 3, ihk: 120.650, inflasi_mtm: 0.280, inflasi_yoy: 1.670 },
  { tahun: 2026, bulan: 4, ihk: 120.950, inflasi_mtm: 0.250, inflasi_yoy: 1.670 },
  { tahun: 2026, bulan: 5, ihk: 120.890, inflasi_mtm: -0.050, inflasi_yoy: 1.670 },
  { tahun: 2026, bulan: 6, ihk: 120.850, inflasi_mtm: -0.030, inflasi_yoy: 1.720 }
];

function generateSeedingData() {
  const data = [...HISTORICAL_INFLATION];
  
  // Fill Jul-Dec 2026 with nulls
  for (let month = 7; month <= 12; month++) {
    data.push({
      tahun: 2026,
      bulan: month,
      ihk: null,
      inflasi_mtm: null,
      inflasi_yoy: null
    });
  }
  
  return data;
}

async function run() {
  console.log('Generating BPS inflation seed data...');
  const data = generateSeedingData();
  console.log(`Generated ${data.length} monthly records.`);

  console.log('Uploading inflation data to Supabase (inflasi_ml)...');
  const { error } = await supabase
    .from('inflasi_ml')
    .upsert(data, { onConflict: 'tahun, bulan' });

  if (error) {
    console.error('❌ Error seeding inflation data:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('👉 IMPORTANT: Please execute migrate_inflasi.sql in your Supabase SQL Editor first!');
    }
  } else {
    console.log('✅ Inflation BPS data successfully seeded into Supabase!');
  }
}

run().catch(console.error);
