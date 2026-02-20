-- Add cost tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_api_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_cost_limit numeric NOT NULL DEFAULT 2.00;
