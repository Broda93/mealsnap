-- MealSnap: RLS policies for authenticated users
-- Run this in Supabase Dashboard > SQL Editor

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all on meals" ON meals;

-- Enable RLS (if not already)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Profiles: user can only see/modify their own profile
CREATE POLICY "Users own profile" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Meals: user can only see/modify their own meals
CREATE POLICY "Users own meals" ON meals
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
