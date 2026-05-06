# Security & data integrity — engineering mindset

This document captures **how we think about gaps** (not only “does it build?”) and concrete rules already applied or planned in **Property_Managments**. Point agents and reviewers here when touching auth, files, multi-source UI, or tenant/lease data.

**Arabic summary:** المصدر الحقيقي للبيانات الحساسة (من يستأجر أي وحدة، من يُعرض في الجداول) يجب أن يكون واضحاً؛ رفع الملفات والوصول للملفات يُراجعان دائماً؛ أي شاشة تجمع بين عقد وسجل مستخدم وبوابة يجب أن تُرتّب أولويات العرض حتى لا تظهر معلومات مضلّلة.

---

## 1) Single source of truth (UI & APIs)

### Problem pattern

Several “names” can exist for the same person: **lease contract party**, **tenant registry row**, **portal user `fullName`**. If the UI prefers the wrong one, screens disagree (e.g. contracts list vs units list).

### Rule

- For **who occupies / rents a unit** in staff UI, treat the **active (or pending) lease contract** as the display authority when a contract row exists for that unit; fall back to tenant registry; use linked portal user name only when registry names are empty.
- When adding new dashboards or tables that show tenant/occupant, **repeat this priority** or call one shared helper — do not reintroduce `(portalUser || tenantName)` ordering.

### Reference implementation

- Frontend: `property-frontend/src/app/features/units/unit-management.component.ts` — `tenantName()`, `loadRenterNames()`.

### Tenant portal login vs `tenants.email`

- New portal users created from **`TenantService.ensureTenantPortalUser`** get default password **`12345`** (hashed) only when a **new** `users` row is created. If the email already exists as a `TENANT` user, that account is **reused** and the password is **not** reset.
- **`TenantService`** now syncs **`users.email` / `username`** with **`tenants.email`** on create/update whenever a portal user is linked, so the email shown on the contract/tenant screen matches login. Previously only the tenant row could change, causing “I use the contract email but login fails”.
- **`AuthService.login`** resolves the account by exact email first, then **case-insensitive** match, and returns **“لا يوجد حساب بهذا البريد”** when nothing matches (instead of always “wrong password”).
- Staff-created users via **`UserService.create`** default to **`12345`** when the password field is left blank.

---

## 2) File upload & static file download

### Closed gaps

1. **Anonymous upload** — `POST /api/v1/files/**` must be **authenticated** (JWT). Previously `/files/**` was fully `permitAll()`, so anyone could POST uploads.
2. **Path traversal on download** — `GET /files/{path}` resolves under `file.upload-dir` only; rejects `..` and paths that normalize outside the upload root.
3. **Upload extension allow-list** — only common image/document extensions; random server-side filename (UUID) kept.

### Residual risk (documented, not “ignored”)

- **GET `/files/**` remains `permitAll`** so `<img [src]="url">` and similar work without sending `Authorization` headers. URLs use opaque names (UUID), which limits casual browsing but is **not** the same as per-user authorization. A future hardening option: short-lived **signed URLs** or a dedicated **authenticated download** endpoint plus frontend blob URLs for sensitive documents.

### Configuration hygiene (production)

- Set **`JWT_SECRET`** (and DB credentials) via environment — never rely on defaults in `application.yml`.
- Restrict **`file.upload-dir`** permissions on the host; keep **`FILE_BASE_URL`** consistent with HTTPS and your reverse proxy.

---

## 3) Backend API authorization

- Prefer **`@PreAuthorize`** on controllers (or methods) for every non-auth route; avoid “authenticated only” without role checks where data is scoped by tenant/property/owner.
- **Tenant / owner / officer portals**: every handler must assert the resource belongs to the current principal (IDOR checks), not only role checks.
- **`/auth/**`** stays public; everything else should be explicitly allowed/denied.

---

## 4) Frontend auth & consistency

- HTTP calls that need identity must go through the **auth interceptor** (Bearer token). Uploads to `/files/upload` must be logged-in or they will correctly **401**.
- **Guards** should align with backend roles so users do not see routes that always fail.

---

## 5) Spring Security notes (current stack)

- **CSRF disabled** — acceptable for a stateless JWT API; do not enable cookie-based session login on the same origin without revisiting CSRF.
- **CORS** — keep allowed origins tight in production (see `CorsConfig`).

---

## 6) Review checklist (new feature / PR)

Use this as a quick pass before merge:

| Area | Question |
|------|----------|
| Auth | Is every new endpoint covered by `authenticated()` + `@PreAuthorize` (or equivalent)? |
| IDOR | Can user A pass an ID and read/change user B’s row? |
| Files | Any new upload or download path — authz, traversal, type/size limits? |
| Multi-source fields | Which system field is “truth” for display vs audit? Is it documented in code? |
| Secrets | No new secrets in repo; env vars documented for deploy. |
| Logging | No passwords/tokens in logs; PII minimized. |

---

## 7) Related docs

- UI / i18n / lookups: `docs/AI_CONVENTIONS.md`
- Owner portal notifications & multi-role backlog: `docs/OWNER_PORTAL_AND_MULTI_ROLE.md`

When fixing a “logic” bug that confused users (wrong tenant label, wrong totals), add a **short comment or this doc link** so the same anti-pattern is not reintroduced.
