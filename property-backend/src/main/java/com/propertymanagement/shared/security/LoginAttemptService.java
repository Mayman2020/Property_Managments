package com.propertymanagement.shared.security;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;

    private record AttemptRecord(int count, LocalDateTime lockedUntil) {}

    private final ConcurrentHashMap<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    public void recordSuccess(String email) {
        attempts.remove(email.toLowerCase());
    }

    public void recordFailure(String email) {
        String key = email.toLowerCase();
        AttemptRecord current = attempts.getOrDefault(key, new AttemptRecord(0, null));
        int newCount = current.count() + 1;
        LocalDateTime lockedUntil = newCount >= MAX_ATTEMPTS
                ? LocalDateTime.now().plusMinutes(LOCK_MINUTES)
                : null;
        attempts.put(key, new AttemptRecord(newCount, lockedUntil));
    }

    public boolean isLocked(String email) {
        AttemptRecord record = attempts.get(email.toLowerCase());
        if (record == null || record.lockedUntil() == null) return false;
        if (LocalDateTime.now().isAfter(record.lockedUntil())) {
            attempts.remove(email.toLowerCase());
            return false;
        }
        return true;
    }

    public int remainingAttempts(String email) {
        AttemptRecord record = attempts.get(email.toLowerCase());
        if (record == null) return MAX_ATTEMPTS;
        return Math.max(0, MAX_ATTEMPTS - record.count());
    }
}
