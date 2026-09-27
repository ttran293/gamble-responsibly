ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sender_confirm_token_hash text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sender_confirmed_at timestamptz;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sender_name text;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_sender_confirm_token_idx ON invitations (sender_confirm_token_hash) WHERE sender_confirm_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS invitations_created_at_idx ON invitations (created_at);
CREATE INDEX IF NOT EXISTS invitations_recipient_created_idx ON invitations (recipient_email, created_at);

