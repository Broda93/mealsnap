-- MealSnap: Complete database setup
-- Run this ONCE in Supabase Dashboard > SQL Editor (on a fresh database)

-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Uzytkownik',
  weight_kg numeric NOT NULL DEFAULT 70,
  height_cm numeric NOT NULL DEFAULT 170,
  age integer NOT NULL DEFAULT 30,
  gender text NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  activity_level text NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text NOT NULL DEFAULT 'maintain' CHECK (goal IN ('lose', 'maintain', 'gain')),
  daily_calorie_target integer NOT NULL DEFAULT 2000,
  body_fat_percent numeric,
  total_api_cost numeric NOT NULL DEFAULT 0,
  api_cost_limit numeric NOT NULL DEFAULT 2.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Meals
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  meal_type text NOT NULL CHECK (meal_type IN ('sniadanie', 'obiad', 'kolacja', 'przekaska')),
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  image_url text,
  confidence text DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  eaten_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Body Measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  body_fat_percent numeric,
  lean_mass_kg numeric GENERATED ALWAYS AS (weight_kg * (1 - body_fat_percent / 100)) STORED,
  fat_mass_kg numeric GENERATED ALWAYS AS (weight_kg * (body_fat_percent / 100)) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Meal Templates
CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  meal_type text NOT NULL CHECK (meal_type IN ('sniadanie', 'obiad', 'kolacja', 'przekaska')),
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meals_eaten_at ON meals(eaten_at);
CREATE INDEX IF NOT EXISTS idx_meals_profile_id ON meals(profile_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_profile_date ON body_measurements(profile_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_templates_profile_id ON meal_templates(profile_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all on meals" ON meals;

-- Profiles: user owns their profile (id = auth.uid())
CREATE POLICY "Users own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Meals: user owns their meals
CREATE POLICY "Users own meals" ON meals
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Body measurements: user owns their measurements
CREATE POLICY "Users own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Meal templates: user owns their templates
CREATE POLICY "Users own templates" ON meal_templates
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- ============================================
-- 4. STORAGE (run separately or via Dashboard)
-- ============================================
-- Create bucket: Storage > New Bucket > "meal-images" > Public
-- Or uncomment:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);
