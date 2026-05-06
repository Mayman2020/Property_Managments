# Property Management — conventions for AI / developers

**ملخص (عربي):** أي نص يظهر للمستخدم يُعرَّف في `en.json` و `ar.json` بنفس المفتاح، ويُعرض بـ `translate` — لا تضع عربي/إنجليزي داخل القالب (`isArabic ? …`). قوائم الخيارات التشغيلية (عملات، أسباب، أنواع، …) من **الجداول المرجعية (lookups)** مع migration عند إضافة نوع جديد.

This document defines how to extend the **Property_Managments** codebase so changes stay consistent with product rules: **no hardcoded UI strings for labels**, and **no hardcoded business option lists** where the product uses reference data.

**Tip for Cursor:** point the agent at this file when asking for UI or lookup-related work: `docs/AI_CONVENTIONS.md`.

**Security & data integrity (auth, files, tenant/lease display priorities):** `docs/SECURITY_AND_DATA_INTEGRITY.md`

**Owner portal alerts & multi-role roadmap:** `docs/OWNER_PORTAL_AND_MULTI_ROLE.md`

---

## 1) Internationalization (i18n)

### Rule

- **Do not** embed user-visible Arabic/English strings in templates using patterns like `isArabic ? 'نص' : 'Text'` or `[label]="lang ? '…' : '…'"`.
- **Do** store every user-visible string under **`property-frontend/src/assets/i18n/en.json`** and **`property-frontend/src/assets/i18n/ar.json`** with the **same key path**.
- In templates use **`{{ 'SECTION.KEY' | translate }}`** or **`[label]="'SECTION.KEY' | translate"`** (and `translate` pipe with `translateParams` when interpolation is needed, e.g. `{{ 'LOOKUPS.ITEM_COUNT' | translate:{ count: n } }}`).
- In TypeScript, prefer **`I18nService.instant('SECTION.KEY')`** or **`TranslateService.instant(...)`** for dynamic strings (export headers, dialogs), not literal bilingual branches.

### Adding new keys

1. Add the key to **`en.json`** with the English value.
2. Add the **same key** to **`ar.json`** with the Arabic value.
3. Group keys logically (`LOOKUPS.*`, `CONTRACTS.*`, `COMMON.*`, etc.).

### Runtime data vs i18n

- **Lookup row names** (`nameAr` / `nameEn`) come from the API — show with `lookupItemLabel`-style helpers based on current language; those are **not** i18n JSON keys.
- **Static UI chrome** (tabs, buttons, table headers, empty states) **must** be i18n keys.

---

## 2) Lists, dropdowns, and “reference data” (lookups)

### Rule

- **Do not** hardcode arrays of business codes/labels in the frontend (e.g. discount reasons, currencies, payment frequency) when those values are meant to be **admin-configurable**.
- **Do** load options from the **lookup API** / **`LookupCacheService`** by **`LookupType`** (see `lookup.service.ts`).
- If a new category is needed:
  1. Add the type in backend **`LookupType`** (Java enum) and DB constraint / migration as used elsewhere in the project.
  2. Seed default rows in a **Flyway** migration (same style as existing `V*` lookup migrations).
  3. Extend the frontend **`LookupType`** union and preload where the UI consumes it.
  4. Register the list in **admin lookup management** (`lookup-management.component.ts`) with a **`labelKey`** pointing to **`LOOKUPS.LIST_*`** in i18n (not inline Arabic/English in TS).

### When a fixed list is acceptable

- Purely **technical** or **format** choices (e.g. number format locale `'ar'` vs `'en-US'`) may stay in code.
- **Numeric ranges** (e.g. day-of-month 1–28) may stay unless the product explicitly moves them to lookups.

---

## 3) Lookup admin UI (`lookup-management`)

- **Tab labels** use keys such as `LOOKUPS.TAB_GEO`, `LOOKUPS.TAB_PROPERTY`, … — not template ternaries.
- **Classification panels** use **`labelKey`** on each list config; templates use **`{{ list.labelKey | translate }}`** so language switches refresh without extra glue code.
- **Counts** use **`LOOKUPS.ITEM_COUNT`** with `{{ count }}` interpolation.

---

## 4) Quick checklist before finishing a feature

- [ ] New UI strings exist in **`en.json`** and **`ar.json`** (same keys).
- [ ] No new `isArabic ? … : …` (or similar) for labels in templates/components.
- [ ] Select options that represent **business reference data** come from **lookups** (or a dedicated API), not static arrays.
- [ ] If a new lookup type was added: migration seeds + admin list + `LookupType` on both sides.

---

## 5) File pointers

| Area | Location |
|------|----------|
| i18n (EN) | `property-frontend/src/assets/i18n/en.json` |
| i18n (AR) | `property-frontend/src/assets/i18n/ar.json` |
| Lookup types (FE) | `property-frontend/src/app/core/services/lookup.service.ts` |
| Cached preload | `property-frontend/src/app/core/services/lookup-cache.service.ts` |
| Admin lookup UI | `property-frontend/src/app/features/lookups/lookup-management.component.*` |
| Lookup enum (BE) | `property-backend/.../lookup/LookupType.java` |
| DB migrations | `property-backend/src/main/resources/db/migration/` |

---

*Last updated to align lookup management tabs and classification labels with ngx-translate and lookup `labelKey`.*
