-- =============================================================================
-- Parola sıfırlama token'ları. Token'ın kendisi e-postayla gider; DB'de yalnızca
-- SHA-256 özeti tutulur (sızsa bile kullanılamaz). Tek kullanımlık ve süreli.
-- =============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user ON password_reset_tokens (user_id);
