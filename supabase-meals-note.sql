-- Add note column to meals table
-- Run this in Supabase SQL Editor

ALTER TABLE meals ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL;

-- Optional: add index for searching notes
CREATE INDEX IF NOT EXISTS idx_meals_note ON meals USING gin(to_tsvector('simple', COALESCE(note, '')));
