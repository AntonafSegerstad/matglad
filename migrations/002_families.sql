-- The first family keeps using shopping_list, so writes from older app instances
-- remain visible throughout deployment. Existing items are never copied or cleared.
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  name_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_lists (
  family_id uuid PRIMARY KEY REFERENCES families(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  version bigint NOT NULL DEFAULT 0
);
INSERT INTO families (id, name, name_key)
VALUES ('00000000-0000-4000-8000-000000000001', 'Vår familj', 'vår familj')
ON CONFLICT (id) DO NOTHING;
