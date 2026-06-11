-- Migration: Enable Row-Level Security (RLS) and Set Standard Policies
-- Execute this script in your Supabase SQL Editor.

-- ==========================================
-- 1. Confirm Email for Admin User
-- ==========================================
UPDATE auth.users 
SET email_confirmed_at = now(), 
    last_sign_in_at = now()
WHERE email = 'ketapangcilegon@gmail.com';

-- ==========================================
-- 2. Configure RLS and Policies for Tables
-- ==========================================

-- Table 1: ketersediaan_pangan
ALTER TABLE ketersediaan_pangan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ketersediaan_pangan;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ketersediaan_pangan;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ketersediaan_pangan;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON ketersediaan_pangan;
CREATE POLICY "Allow read for everyone" ON ketersediaan_pangan FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON ketersediaan_pangan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON ketersediaan_pangan FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON ketersediaan_pangan FOR DELETE TO authenticated USING (true);

-- Table 2: pou_data
ALTER TABLE pou_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON pou_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON pou_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pou_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pou_data;
CREATE POLICY "Allow read for everyone" ON pou_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON pou_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON pou_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON pou_data FOR DELETE TO authenticated USING (true);

-- Table 3: harga_pangan_ml
ALTER TABLE harga_pangan_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON harga_pangan_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON harga_pangan_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON harga_pangan_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON harga_pangan_ml;
CREATE POLICY "Allow read for everyone" ON harga_pangan_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON harga_pangan_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON harga_pangan_ml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON harga_pangan_ml FOR DELETE TO authenticated USING (true);

-- Table 4: cuaca_ml
ALTER TABLE cuaca_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON cuaca_ml;
CREATE POLICY "Allow read for everyone" ON cuaca_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON cuaca_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON cuaca_ml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON cuaca_ml FOR DELETE TO authenticated USING (true);

-- Table 5: inflasi_ml
ALTER TABLE inflasi_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON inflasi_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON inflasi_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON inflasi_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON inflasi_ml;
CREATE POLICY "Allow read for everyone" ON inflasi_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON inflasi_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON inflasi_ml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON inflasi_ml FOR DELETE TO authenticated USING (true);

-- Table 6: ml_metrics
ALTER TABLE ml_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ml_metrics;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ml_metrics;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ml_metrics;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON ml_metrics;
CREATE POLICY "Allow read for everyone" ON ml_metrics FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON ml_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON ml_metrics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON ml_metrics FOR DELETE TO authenticated USING (true);

-- Table 7: kalender_ml
ALTER TABLE kalender_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON kalender_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON kalender_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON kalender_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON kalender_ml;
CREATE POLICY "Allow read for everyone" ON kalender_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON kalender_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON kalender_ml FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON kalender_ml FOR DELETE TO authenticated USING (true);

-- Table 8: forecast_result
ALTER TABLE forecast_result ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON forecast_result;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON forecast_result;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON forecast_result;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON forecast_result;
CREATE POLICY "Allow read for everyone" ON forecast_result FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON forecast_result FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON forecast_result FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON forecast_result FOR DELETE TO authenticated USING (true);

-- Table 9: model_registry
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON model_registry;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON model_registry;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON model_registry;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON model_registry;
CREATE POLICY "Allow read for everyone" ON model_registry FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON model_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON model_registry FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON model_registry FOR DELETE TO authenticated USING (true);

-- Table 10: gizi_balita
ALTER TABLE gizi_balita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON gizi_balita;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON gizi_balita;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON gizi_balita;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON gizi_balita;
CREATE POLICY "Allow read for everyone" ON gizi_balita FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON gizi_balita FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON gizi_balita FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON gizi_balita FOR DELETE TO authenticated USING (true);

-- Table 11: harga_sagon_harian
ALTER TABLE harga_sagon_harian ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON harga_sagon_harian;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON harga_sagon_harian;
CREATE POLICY "Allow read for everyone" ON harga_sagon_harian FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON harga_sagon_harian FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON harga_sagon_harian FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON harga_sagon_harian FOR DELETE TO authenticated USING (true);

-- Table 12: ikp_data
ALTER TABLE ikp_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ikp_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ikp_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ikp_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON ikp_data;
CREATE POLICY "Allow read for everyone" ON ikp_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON ikp_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON ikp_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON ikp_data FOR DELETE TO authenticated USING (true);

-- Table 13: intervensi_kelurahan
ALTER TABLE intervensi_kelurahan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON intervensi_kelurahan;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON intervensi_kelurahan;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON intervensi_kelurahan;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON intervensi_kelurahan;
CREATE POLICY "Allow read for everyone" ON intervensi_kelurahan FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON intervensi_kelurahan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON intervensi_kelurahan FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON intervensi_kelurahan FOR DELETE TO authenticated USING (true);

-- Table 14: produksi_beras_data
ALTER TABLE produksi_beras_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON produksi_beras_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON produksi_beras_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON produksi_beras_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON produksi_beras_data;
CREATE POLICY "Allow read for everyone" ON produksi_beras_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON produksi_beras_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON produksi_beras_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON produksi_beras_data FOR DELETE TO authenticated USING (true);

-- Table 15: cv_beras_data
ALTER TABLE cv_beras_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON cv_beras_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON cv_beras_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON cv_beras_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON cv_beras_data;
CREATE POLICY "Allow read for everyone" ON cv_beras_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON cv_beras_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON cv_beras_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON cv_beras_data FOR DELETE TO authenticated USING (true);

-- Table 16: pph_data
ALTER TABLE pph_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON pph_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON pph_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON pph_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON pph_data;
CREATE POLICY "Allow read for everyone" ON pph_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON pph_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON pph_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON pph_data FOR DELETE TO authenticated USING (true);

-- Table 17: konsumsi_energi_data
ALTER TABLE konsumsi_energi_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON konsumsi_energi_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON konsumsi_energi_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON konsumsi_energi_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON konsumsi_energi_data;
CREATE POLICY "Allow read for everyone" ON konsumsi_energi_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON konsumsi_energi_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON konsumsi_energi_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON konsumsi_energi_data FOR DELETE TO authenticated USING (true);

-- Table 18: konsumsi_protein_data
ALTER TABLE konsumsi_protein_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON konsumsi_protein_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON konsumsi_protein_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON konsumsi_protein_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON konsumsi_protein_data;
CREATE POLICY "Allow read for everyone" ON konsumsi_protein_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON konsumsi_protein_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON konsumsi_protein_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON konsumsi_protein_data FOR DELETE TO authenticated USING (true);

-- Table 19: ketersediaan_energi_data
ALTER TABLE ketersediaan_energi_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ketersediaan_energi_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ketersediaan_energi_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ketersediaan_energi_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON ketersediaan_energi_data;
CREATE POLICY "Allow read for everyone" ON ketersediaan_energi_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON ketersediaan_energi_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON ketersediaan_energi_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON ketersediaan_energi_data FOR DELETE TO authenticated USING (true);

-- Table 20: ketersediaan_protein_data
ALTER TABLE ketersediaan_protein_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ketersediaan_protein_data;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ketersediaan_protein_data;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ketersediaan_protein_data;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON ketersediaan_protein_data;
CREATE POLICY "Allow read for everyone" ON ketersediaan_protein_data FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON ketersediaan_protein_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON ketersediaan_protein_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON ketersediaan_protein_data FOR DELETE TO authenticated USING (true);

-- Table 21: fsva_matang
ALTER TABLE fsva_matang ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON fsva_matang;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON fsva_matang;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON fsva_matang;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON fsva_matang;
CREATE POLICY "Allow read for everyone" ON fsva_matang FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON fsva_matang FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON fsva_matang FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON fsva_matang FOR DELETE TO authenticated USING (true);

-- Table 22: skpg_matang
ALTER TABLE skpg_matang ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON skpg_matang;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON skpg_matang;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON skpg_matang;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON skpg_matang;
CREATE POLICY "Allow read for everyone" ON skpg_matang FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON skpg_matang FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON skpg_matang FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON skpg_matang FOR DELETE TO authenticated USING (true);
