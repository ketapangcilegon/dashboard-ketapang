CREATE TABLE IF NOT EXISTS harga_pangan_ml (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  harga_beras INT,
  harga_bawang_merah INT,
  harga_bawang_putih INT,
  harga_cabai_merah INT,
  harga_cabai_rawit INT,
  harga_daging_sapi INT,
  harga_daging_ayam_ras INT,
  harga_telur_ayam_ras INT,
  harga_gula_pasir INT,
  harga_minyak_goreng INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicates for the same month and year
  UNIQUE(tahun, bulan)
);
