CREATE TABLE IF NOT EXISTS shopping_list (
  id integer PRIMARY KEY CHECK (id = 1),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  version bigint NOT NULL DEFAULT 0
);
INSERT INTO shopping_list (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
