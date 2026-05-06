package com.propertymanagement.shared.i18n;

import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Resolves UI and notification copy from {@code messages*.properties} (never hard-coded in services).
 */
@Component
@RequiredArgsConstructor
public class AppMessages {

    public static final Locale LOCALE_AR = Locale.forLanguageTag("ar");
    public static final Locale LOCALE_EN = Locale.ENGLISH;

    private final MessageSource messageSource;

    public String get(Locale locale, String code, Object... args) {
        Locale loc = locale != null ? locale : LOCALE_EN;
        return messageSource.getMessage(code, nullIfEmpty(args), code, loc);
    }

    public String get(String code, Object... args) {
        Locale loc = LocaleContextHolder.getLocale();
        if (loc == null || loc.getLanguage().isBlank()) {
            loc = LOCALE_EN;
        }
        return get(loc, code, args);
    }

    /** Same message key resolved for Arabic and English (e.g. bilingual notifications stored in one row). */
    public Bilingual bilingual(String code, Object... args) {
        Object[] a = nullIfEmpty(args);
        return new Bilingual(
                messageSource.getMessage(code, a, code, LOCALE_AR),
                messageSource.getMessage(code, a, code, LOCALE_EN)
        );
    }

    public record Bilingual(String ar, String en) {}

    /** Stored {@code floors.floor_label}: Arabic / English when they differ. */
    public String compositeFloorLabel(int floorNumber) {
        String ar = get(LOCALE_AR, "floor.numbered", floorNumber);
        String en = get(LOCALE_EN, "floor.numbered", floorNumber);
        return BilingualNotificationText.composite(ar, en, en);
    }

    private static Object[] nullIfEmpty(Object... args) {
        if (args == null || args.length == 0) {
            return null;
        }
        return args;
    }
}
