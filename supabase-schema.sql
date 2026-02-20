-- MealSnap Database Schema
-- Run this in Supabase SQL Editor

-- Profiles table
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Meals table
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

-- Index for querying meals by date
CREATE INDEX IF NOT EXISTS idx_meals_eaten_at ON meals(eaten_at);
CREATE INDEX IF NOT EXISTS idx_meals_profile_id ON meals(profile_id);

-- RLS is configured in supabase-auth-rls.sql (Google Auth mode)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Storage bucket for meal images
-- Run separately or create via Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);
