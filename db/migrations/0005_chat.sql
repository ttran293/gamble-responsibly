CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  consented_at timestamptz NOT NULL DEFAULT now(),
  pending_token uuid,
  pending_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  safety_flag text NOT NULL DEFAULT 'none' CHECK (safety_flag IN ('none', 'crisis', 'betting_advice', 'safety_fallback')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_time_idx ON chat_messages (thread_id, created_at, id);
CREATE INDEX IF NOT EXISTS chat_threads_updated_idx ON chat_threads (updated_at);
