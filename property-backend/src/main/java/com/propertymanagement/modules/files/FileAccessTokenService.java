package com.propertymanagement.modules.files;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Issues short-lived (5-minute), single-use file access tokens so that image
 * previews can be embedded via &lt;img src="?st=TOKEN"&gt; without putting the
 * long-lived JWT in the URL (which would leak it into server logs and browser
 * history).
 *
 * These tokens are intentionally ephemeral — they are NOT revocable and NOT
 * persisted across restarts.  A 5-minute window is acceptable for browser
 * image rendering; any token not used within that window is silently dropped.
 */
@Service
public class FileAccessTokenService {

    private static final long TTL_SECONDS = 300; // 5 minutes

    private record TokenEntry(Long userId, String filename, Instant expiresAt) {}

    private final ConcurrentHashMap<String, TokenEntry> tokens = new ConcurrentHashMap<>();

    /**
     * Creates a token that allows {@code userId} to download {@code filename} once
     * within the next 5 minutes.
     */
    public String issue(Long userId, String filename) {
        purgeExpired();
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, new TokenEntry(userId, filename, Instant.now().plusSeconds(TTL_SECONDS)));
        return token;
    }

    /**
     * Validates and consumes the token.
     *
     * @return the user ID embedded in the token, or {@code null} if invalid/expired
     */
    public Long validateAndConsume(String token, String requestedFilename) {
        if (token == null || token.isBlank()) return null;
        TokenEntry entry = tokens.remove(token);  // single-use: remove on first use
        if (entry == null) return null;
        if (Instant.now().isAfter(entry.expiresAt())) return null;
        if (!entry.filename().equals(requestedFilename)) return null;
        return entry.userId();
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        tokens.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    }

    /** Returns the TTL in seconds for use in API responses. */
    public long getTtlSeconds() {
        return TTL_SECONDS;
    }
}
