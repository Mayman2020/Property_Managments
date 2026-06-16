package com.propertymanagement.shared.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;

/**
 * Persistent JWT revocation blacklist backed by the {@code revoked_tokens}
 * database table (V184 migration).
 *
 * Tokens are stored by their SHA-256 hash (never the raw token) so the table
 * cannot be used to reconstruct a valid credential even if compromised.
 *
 * Rows whose {@code expires_at} has passed are automatically purged every hour
 * by {@link #purgeExpiredTokens()} so the table stays small.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final RevokedTokenRepository repository;

    /**
     * Records the token as revoked.  The raw JWT is never persisted; only its
     * SHA-256 hex digest is stored together with the token's original expiry so
     * the cleanup job can remove it once it would no longer be accepted anyway.
     */
    @Transactional
    public void revoke(String token, Instant expiry) {
        if (token == null || token.isBlank() || expiry == null) return;
        String hash = sha256(token);
        if (!repository.existsByTokenHash(hash)) {
            repository.save(RevokedTokenEntity.builder()
                    .tokenHash(hash)
                    .revokedAt(Instant.now())
                    .expiresAt(expiry)
                    .build());
        }
    }

    /**
     * Returns {@code true} if the token has been revoked AND its revocation
     * record has not yet expired.  Once the token's natural expiry passes the
     * row is deleted by the nightly cleanup, after which this returns
     * {@code false} — but by then the token's signature check in
     * {@link JwtUtil#isValid} will also fail, so there is no security gap.
     */
    @Transactional(readOnly = true)
    public boolean isRevoked(String token) {
        if (token == null || token.isBlank()) return false;
        String hash = sha256(token);
        return repository.findByTokenHash(hash)
                .map(r -> Instant.now().isBefore(r.getExpiresAt()))
                .orElse(false);
    }

    /** Scheduled cleanup — removes rows whose original JWT expiry has passed. */
    @Scheduled(fixedDelay = 3_600_000) // every hour
    @Transactional
    public void purgeExpiredTokens() {
        int deleted = repository.deleteExpired(Instant.now());
        if (deleted > 0) {
            log.debug("Purged {} expired revoked token records", deleted);
        }
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed by the JDK spec — this can never happen
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
