-- Body Fat % tracking for MealSnap
-- Run in Supabase SQL Editor

-- 1. Add body_fat_percent to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_fat_percent numeric;

-- 2. Create body_measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  body_fat_percent numeric,
  lean_mass_kg numeric GENERATED ALWAYS AS (
    CASE WHEN body_fat_percent IS NOT NULL
      THEN weight_kg * (1 - body_fat_percent / 100)
      ELSE NULL
    END
  ) STORED,
  fat_mass_kg numeric GENERATED ALWAYS AS (
    CASE WHEN body_fat_percent IS NOT NULL
      THEN weight_kg * (body_fat_percent / 100)
      ELSE NULL
    END
  ) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_body_measurements_profile_date
  ON body_measurements(profile_id, date DESC);

-- 4. RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own measurements"
  ON body_measurements FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = profile_id);
