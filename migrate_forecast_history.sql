-- Drop existing table if exists
DROP TABLE IF EXISTS forecast_history CASCADE;

-- Create forecast_history table to store monthly snapshot of predictions
CREATE TABLE forecast_history (
  id BIGSERIAL PRIMARY KEY,
  komoditas VARCHAR(50) NOT NULL,
  bulan DATE NOT NULL, -- Tanggal awal bulan peramalan dibuat (misal '2026-07-01')
  harga_aktual NUMERIC(12,2) NOT NULL,
  forecast_1m NUMERIC(12,2) NOT NULL,
  forecast_3m NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(komoditas, bulan)
);

-- Mengaktifkan Row Level Security (RLS) agar data aman namun dapat diakses oleh publik
ALTER TABLE forecast_history ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses publik (Read & Write untuk sinkronisasi)
CREATE POLICY "Allow public read access on forecast_history" ON forecast_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on forecast_history" ON forecast_history FOR ALL USING (true);
