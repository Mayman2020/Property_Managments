package com.propertymanagement.shared.i18n;

/**
 * In-app notifications store a single title and message per row (no locale column).
 * We persist Arabic and English together so any user sees both without depending on request locale.
 */
public final class BilingualNotificationText {

    private BilingualNotificationText() {}

    private static String t(String s) {
        return s == null ? "" : s.trim();
    }

    /** DB limit {@code notifications.title} (200). */
    public static String title(String ar, String en) {
        String a = t(ar);
        String e = t(en);
        if (a.isEmpty()) {
            return trunc(e, 200);
        }
        if (e.isEmpty()) {
            return trunc(a, 200);
        }
        String sep = " | ";
        if (a.length() + sep.length() + e.length() <= 200) {
            return a + sep + e;
        }
        int budget = 200 - sep.length();
        int half = budget / 2;
        return trunc(a, half - 2) + sep + trunc(e, budget - half - 2);
    }

    /** Full message body: Arabic block, separator, English block. */
    public static String body(String ar, String en) {
        String a = t(ar);
        String e = t(en);
        if (a.isEmpty()) {
            return e;
        }
        if (e.isEmpty()) {
            return a;
        }
        return a + "\n\n—\n\n" + e;
    }

    /**
     * One-line property (or other) label showing both languages when they differ.
     */
    public static String composite(String nameAr, String nameEn, String fallback) {
        String a = t(nameAr);
        String e = t(nameEn);
        String f = t(fallback);
        if (a.isEmpty() && e.isEmpty()) {
            return f.isEmpty() ? "—" : f;
        }
        if (a.isEmpty()) {
            return e;
        }
        if (e.isEmpty()) {
            return a;
        }
        if (a.equals(e)) {
            return a;
        }
        return a + " / " + e;
    }

    private static String trunc(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        if (max <= 1) {
            return "…";
        }
        return s.substring(0, max - 1) + "…";
    }
}
