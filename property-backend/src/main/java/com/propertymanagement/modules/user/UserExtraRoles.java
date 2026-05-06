package com.propertymanagement.modules.user;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Parses/stores extra portal roles (comma-separated) and picks a primary {@code users.role}
 * when multiple roles are assigned (portal / linked-record identity).
 */
public final class UserExtraRoles {

    /** First match wins as stored primary role; extras hold remaining selected roles. */
    private static final List<UserRole> PRIMARY_PRIORITY = List.of(
            UserRole.TENANT,
            UserRole.OWNER,
            UserRole.SUPER_ADMIN,
            UserRole.GENERAL_MANAGER,
            UserRole.ACCOUNTANT,
            UserRole.PROCEDURES_CLERK,
            UserRole.MAINTENANCE_OFFICER,
            UserRole.MAINTENANCE_CONTRACTOR,
            UserRole.PROPERTY_GUARD
    );

    private UserExtraRoles() {
    }

    public static UserRole pickPrimary(Set<UserRole> selected) {
        for (UserRole candidate : PRIMARY_PRIORITY) {
            if (selected.contains(candidate)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("No valid primary role in selection");
    }

    /** Comma-separated extras excluding {@code primary}, stable order. */
    public static String formatExtras(UserRole primary, Set<UserRole> selected) {
        List<UserRole> extras = new ArrayList<>();
        for (UserRole r : selected) {
            if (r != null && r != primary && !extras.contains(r)) {
                extras.add(r);
            }
        }
        if (extras.isEmpty()) {
            return null;
        }
        extras.sort(Comparator.comparing(Enum::ordinal));
        return String.join(",", extras.stream().map(Enum::name).toList());
    }

    public static List<UserRole> parseList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<UserRole> out = new ArrayList<>();
        for (String part : raw.split(",")) {
            String t = part.trim();
            if (t.isEmpty()) {
                continue;
            }
            out.add(UserRole.valueOf(t));
        }
        return out;
    }

    public static Set<UserRole> parseSet(String raw) {
        return new LinkedHashSet<>(parseList(raw));
    }
}
