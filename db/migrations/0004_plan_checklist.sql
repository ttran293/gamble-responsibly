CREATE TABLE IF NOT EXISTS plan_action_completions (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  action_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_id)
);
