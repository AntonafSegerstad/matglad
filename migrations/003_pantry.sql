-- Additive: existing shopping data and old app instances remain compatible.
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS pantry_state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(pantry_state) = 'object');
ALTER TABLE family_lists ADD COLUMN IF NOT EXISTS pantry_state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(pantry_state) = 'object');
