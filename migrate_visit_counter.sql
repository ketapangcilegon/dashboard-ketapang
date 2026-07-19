-- Drop existing table and function if exist
DROP TABLE IF EXISTS page_visits CASCADE;
DROP FUNCTION IF EXISTS increment_visit_count(TEXT);

-- Create page_visits table to store footfalls
CREATE TABLE page_visits (
  id SERIAL PRIMARY KEY,
  page_path TEXT NOT NULL DEFAULT '/',
  total_count BIGINT DEFAULT 0,
  last_visited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_path)
);

-- Seed initial row for homepage path '/'
INSERT INTO page_visits (page_path, total_count) VALUES ('/', 0);

-- Atomic plpgsql function to increment visit count and prevent race conditions
CREATE OR REPLACE FUNCTION increment_visit_count(target_path TEXT)
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE page_visits
  SET total_count = total_count + 1,
      last_visited_at = now()
  WHERE page_path = target_path
  RETURNING total_count INTO new_count;

  -- If path does not exist, insert it and set count to 1
  IF new_count IS NULL THEN
    INSERT INTO page_visits (page_path, total_count)
    VALUES (target_path, 1)
    RETURNING total_count INTO new_count;
  END IF;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) and permit public select / execute
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on page_visits" ON page_visits FOR SELECT USING (true);
CREATE POLICY "Allow public update access on page_visits" ON page_visits FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access on page_visits" ON page_visits FOR INSERT WITH CHECK (true);
