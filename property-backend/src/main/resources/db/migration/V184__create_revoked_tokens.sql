-- V184: Persistent JWT revocation table.
--
-- Replaces the in-memory ConcurrentHashMap in TokenBlacklistService so that
-- tokens revoked on logout remain revoked across backend restarts and in
-- horizontally-scaled deployments.
--
-- token_hash  : SHA-256 hex digest of the raw JWT string.  We store the hash
--               rather than the token itself to prevent leaking credentials if
--               the table is compromised.
-- revoked_at  : wall-clock time the revocation was recorded.
-- expires_at  : original JWT expiry copied from the token claim.  Once this
--               timestamp passes, the row is useless and can be cleaned up.
--
-- The cleanup scheduled method in TokenBlacklistService removes rows whose
-- expires_at is in the past so the table stays small.

SET search_path = property_mgmt;

CREATE TABLE IF NOT EXISTS revoked_tokens (
    id          BIGSERIAL PRIMARY KEY,
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash       ON revoked_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
