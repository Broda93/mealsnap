-- Meal Templates - run in Supabase SQL Editor
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

CREATE INDEX IF NOT EXISTS idx_meal_templates_profile_id ON meal_templates(profile_id);

ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own templates" ON meal_templates
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
