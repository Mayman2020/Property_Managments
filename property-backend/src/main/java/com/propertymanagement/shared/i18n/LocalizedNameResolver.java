package com.propertymanagement.shared.i18n;

import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Locale;

public final class LocalizedNameResolver {
    private LocalizedNameResolver() {}

    public static String resolve(String nameAr, String nameEn, String fallback) {
        String lang = LocaleContextHolder.getLocale() != null
                ? LocaleContextHolder.getLocale().getLanguage()
                : Locale.ENGLISH.getLanguage();
        boolean isArabic = "ar".equalsIgnoreCase(lang);

        if (isArabic) {
            if (notBlank(nameAr)) return nameAr.trim();
            if (notBlank(nameEn)) return nameEn.trim();
            return safe(fallback);
        }

        if (notBlank(nameEn)) return nameEn.trim();
        if (notBlank(nameAr)) return nameAr.trim();
        return safe(fallback);
    }

    public static String safe(String value) {
        return value == null ? null : value.trim();
    }

    public static boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
