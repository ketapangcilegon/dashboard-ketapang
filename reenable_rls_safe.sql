-- ========================================================================
-- Mengaktifkan Kembali RLS dengan Kebijakan Aman (Safe Drop & Re-create)
-- Execute this script in your Supabase SQL Editor
-- ========================================================================

-- 1. Tabel kalender_ml
ALTER TABLE kalender_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON kalender_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON kalender_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON kalender_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON kalender_ml;

CREATE POLICY "Allow read for everyone" ON kalender_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON kalender_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON kalender_ml FOR UPDATE TO authenticated USING (true);

-- 2. Tabel cuaca_ml
ALTER TABLE cuaca_ml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON cuaca_ml;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON cuaca_ml;

CREATE POLICY "Allow read for everyone" ON cuaca_ml FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for authenticated users" ON cuaca_ml FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON cuaca_ml FOR UPDATE TO authenticated USING (true);

-- 3. Tabel ml_metrics
ALTER TABLE ml_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for everyone" ON ml_metrics;
DROP POLICY IF EXISTS "Allow write for everyone" ON ml_metrics;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON ml_metrics;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON ml_metrics;

CREATE POLICY "Allow read for everyone" ON ml_metrics FOR SELECT TO public USING (true);
CREATE POLICY "Allow write for everyone" ON ml_metrics FOR INSERT TO public WITH CHECK (true);
