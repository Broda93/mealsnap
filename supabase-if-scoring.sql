-- MealSnap: Intermittent Fasting + AI Scoring migration
-- Run this in Supabase SQL Editor

-- IF settings on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS if_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS if_protocol text NOT NULL DEFAULT '16:8' CHECK (if_protocol IN ('16:8', '18:6', '20:4', 'custom'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS if_window_start integer NOT NULL DEFAULT 12 CHECK (if_window_start >= 0 AND if_window_start <= 23);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS if_window_hours integer NOT NULL DEFAULT 8 CHECK (if_window_hours >= 1 AND if_window_hours <= 12);

-- AI scoring + IF compliance on meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS score numeric CHECK (score >= 1 AND score <= 10);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS ai_comment text;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS in_if_window boolean DEFAULT true;
