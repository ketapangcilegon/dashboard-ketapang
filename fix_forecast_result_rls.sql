-- SQL Fix for Row-Level Security (RLS) Policy on forecast_result & forecast_history
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Enable RLS and Grant Full Access for forecast_result
ALTER TABLE forecast_result ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for everyone" ON forecast_result;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON forecast_result;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON forecast_result;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON forecast_result;
DROP POLICY IF EXISTS "Allow all for forecast_result" ON forecast_result;

CREATE POLICY "Allow all for forecast_result" 
ON forecast_result FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. Enable RLS and Grant Full Access for forecast_history
ALTER TABLE forecast_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for everyone" ON forecast_history;
DROP POLICY IF EXISTS "Allow write for authenticated users" ON forecast_history;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON forecast_history;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON forecast_history;
DROP POLICY IF EXISTS "Allow all for forecast_history" ON forecast_history;

CREATE POLICY "Allow all for forecast_history" 
ON forecast_history FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
