CREATE TABLE IF NOT EXISTS guardrail_state (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  revisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  notices jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
