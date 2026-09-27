CREATE TABLE IF NOT EXISTS emergency_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'superseded')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emergency_contact_requests_user_created_idx ON emergency_contact_requests (user_id, created_at);
