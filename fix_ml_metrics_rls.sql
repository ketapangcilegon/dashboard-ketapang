-- ========================================================================
-- Fix RLS Policy for ml_metrics and forecast_result tables
-- Execute this script in your Supabase SQL Editor
-- ========================================================================

-- Option 1: Disable RLS on ml_metrics table to allow model retraining pipeline to record metrics
ALTER TABLE ml_metrics DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternatively, allow insert & read for public/authenticated roles
DROP POLICY IF EXISTS "Allow read for everyone" ON ml_metrics;
DROP POLICY IF EXISTS "Allow insert for everyone" ON ml_metrics;
CREATE POLICY "Allow read for everyone" ON ml_metrics FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for everyone" ON ml_metrics FOR INSERT TO public WITH CHECK (true);
