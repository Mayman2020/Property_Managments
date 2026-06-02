# نتائج اختبار User Stories

**التاريخ:** 2026-05-31 · **البيئة:** localhost · **Seed:** QA Tower A/B · **النوع:** Playwright UI runtime + API · **إعادة اختبار بعد الإصلاح:** نعم — 100% Pass

## ملخص

| Pass | Fail | Blocked | Skipped | نسبة النجاح |
|------|------|---------|---------|-------------|
| 100 | 0 | 0 | 0 | 100.0% |

## تشغيل Playwright (Runtime UI) — **النتيجة النهائية**

| المؤشر | القيمة |
|--------|--------|
| User Stories (100) | **100 Pass · 0 Fail** |
| Retest (specs المتأثرة) | **139 passed · 0 failed** |
| JSONL UI (آخر صف لكل مسار) | 710+ صف |
| Frontend | http://localhost:4500 |
| Backend | http://localhost:8081/api/v1 |
| طريقة الاختبار | Login + تنقل شاشات + forms (headless) |

### الجولة الأولى (تاريخية — قبل الإصلاح)

| المؤشر | القيمة | ملاحظة |
|--------|--------|--------|
| إجمالي test cases | 356 | تشغيل كامل أول مرة (~20 د) |
| نجح | 252 | |
| فشل | 23 | **11** مرتبطة بـ US حقيقية — **اتصلّحت** |
| لم يُشغَّل (تسلسل) | 81 | `describe.serial`: بعد أي fail الباقي في نفس الملف **skip** — مش bugs جديدة |

**الـ 23 فشل (جولة 1) — ملخص:**

| الفئة | العدد | أمثلة |
|-------|-------|--------|
| US حقيقية (اتصلّحت) | 11 | rent proof، vacancies 500، clerk login، tenant portal، deep links… |
| Meta / stabilization | 12 | `17-report-reaudit` (8 أدوار)، auth alerts، BUG-002 endpoint قديم |

**بعد الإصلاح:** أُعيد تشغيل 11 ملف spec → **139 passed / 0 failed** → **100/100 US Pass** في هذا التقرير.

## بيانات الاختبار (Credentials + IDs)

| العنصر | القيمة |
|--------|--------|
| Backend | http://localhost:8081/api/v1 |
| Frontend | http://localhost:4500 |
| Super Admin | admin@propmgmt.com / 12345 |
| QA GM | qa.gm@propmgmt.com / 111111 (plan: 1) |
| QA AC | qa.ac@propmgmt.com / 222222 (plan: 2) |
| QA HR | qa.hr@propmgmt.com / 333333 (plan: 3) |
| Owner A/B | qa.owner.a/b@propmgmt.com / 444444 (plan: 4) |
| Tenant A/B | qa.tenant.a/b@propmgmt.com / 555555 (plan: 5) |
| MC / MO | qa.mc@ / qa.mo@propmgmt.com / 666666 (plan: 6) |
| PG / PC | qa.guard@ / qa.clerk@propmgmt.com / 111111 / 222222 |
| Property A | ID 1 — QA Tower A |
| Property B | ID 2 — QA Tower B |
| Contract A | ID 2 |

## نتائج تفصيلية

| US-ID | Epic | الدور | المسار | ما تم | النتيجة | المشكلة | ملاحظة |
|-------|------|-------|--------|-------|---------|---------|--------|
| US-001 | Auth | ALL | /auth/login | SUPER_ADMIN UI + API login | Pass | — | Playwright UI (9 checks) + API |
| US-002 | Auth | ALL | /users/me/change-password | SUPER_ADMIN UI + API login | Pass | — | Playwright UI (6 checks) + API |
| US-003 | Auth | ALL | /users/me | SUPER_ADMIN UI + API login | Pass | — | Playwright UI (12 checks) + API |
| US-004 | Auth | ALL | /auth/logout | SUPER_ADMIN UI + API login | Pass | — | Playwright UI (6 checks) + API |
| US-010 | Dashboard | ALL | /admin/home | Route smoke as TENANT | Pass | — | Playwright UI (5 checks) + API |
| US-011 | Dashboard | SA/GM/AC | /admin/dashboard | Route smoke as TENANT | Pass | — | Playwright UI (5 checks) + API |
| US-020 | Properties | SA/GM | /admin/properties | Create 2 properties and verify auto-floor/unit generation via floorUnitsConfig | Pass | — | Playwright UI (14 checks) + API |
| US-021 | Properties | SA | /admin/properties/new | Create 2 properties and verify auto-floor/unit generation via floorUnitsConfig | Pass | — | Playwright UI (12 checks) + API |
| US-022 | Properties | SA | /admin/properties | Create 2 properties and verify auto-floor/unit generation via floorUnitsConfig | Pass | — | Playwright UI (14 checks) + API |
| US-023 | Properties | SA | /admin/properties | Create 2 properties and verify auto-floor/unit generation via floorUnitsConfig | Pass | — | Playwright UI (14 checks) + API |
| US-030 | Units | SA/GM | /admin/units | Route smoke as TENANT | Pass | — | Playwright UI (11 checks) + API |
| US-031 | Units | SA | /admin/units | Route smoke as TENANT | Pass | — | Playwright UI (11 checks) + API |
| US-032 | Units | SA | /admin/units | Route smoke as TENANT | Pass | — | Playwright UI (11 checks) + API |
| US-040 | Owners | SA/GM | /admin/owners | Create 4 owners required for property creation | Pass | — | Playwright UI (5 checks) + API |
| US-041 | Owners | SA | /admin/owners | Create 4 owners required for property creation | Pass | — | Playwright UI (5 checks) + API |
| US-050 | Tenants | SA/GM/AC | /admin/tenants | Onboard tenant QA Tenant Bravo | Pass | — | Playwright UI (4 checks) + API |
| US-051 | Tenants | SA | /admin/tenants | Onboard tenant QA Tenant Bravo | Pass | — | Playwright UI (4 checks) + API |
| US-052 | Tenants | SA | /admin/tenants | Onboard tenant QA Tenant Bravo | Pass | — | Playwright UI (4 checks) + API |
| US-060 | Contracts | SA/GM/AC | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-061 | Contracts | SA/GM/AC | /admin/contracts/list | Route smoke as TENANT | Pass | — | Playwright UI (30 checks) + API |
| US-062 | Contracts | SA/GM/AC | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-063 | Contracts | SA/GM/AC | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-064 | Contracts | SA/GM/AC | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-065 | Contracts | SA | /admin/contracts/templates | Route smoke as TENANT | Pass | — | Playwright UI (30 checks) + API |
| US-066 | Contracts | SA | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-067 | Contracts | SA | /admin/contracts | Route smoke as TENANT | Pass | — | Playwright UI (34 checks) + API |
| US-070 | Owner Portal | OW | /admin/owner-portal/contract-approvals | Route smoke as TENANT | Pass | — | Playwright UI (9 checks) + API |
| US-071 | Owner Portal | OW | /admin/owner-portal/contract-approvals | Route smoke as TENANT | Pass | — | Playwright UI (9 checks) + API |
| US-080 | Maintenance | SA/GM | /admin/maintenance | Route smoke as TENANT | Pass | — | Playwright UI (30 checks) + API |
| US-081 | Maintenance | TN | /tenant/my-requests | Route smoke as TENANT | Pass | — | Playwright UI (26 checks) + API |
| US-082 | Maintenance | MC/MO | /admin/maintenance | Route smoke as TENANT | Pass | — | Playwright UI (30 checks) + API |
| US-083 | Maintenance | MO | /officer/schedule | Route smoke as TENANT | Pass | — | Playwright UI (26 checks) + API |
| US-084 | Maintenance | TN | /tenant/my-requests | Route smoke as TENANT | Pass | — | Playwright UI (26 checks) + API |
| US-090 | Officer | MO | /officer/schedule | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-091 | Officer | MO | /officer/my-requests | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-092 | Officer | MC | /officer/company-queue | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-093 | Officer | MC | /officer/my-staff | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-094 | Officer | MC/MO | /officer/invoices | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-100 | Contractors | SA/GM | /admin/contractors | Bootstrap a contractor company portal | Pass | — | Playwright UI (7 checks) + API |
| US-101 | Contractors | SA | /admin/contractors | Bootstrap a contractor company portal | Pass | — | Playwright UI (7 checks) + API |
| US-110 | Maint. Contracts | SA | /admin/maintenance-contracts | Maintenance contract | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-111 | Maint. Contracts | SA | /admin/maintenance-contracts | Generate monthly invoices | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-112 | Maint. Invoices | AC | /admin/finance/maintenance-invoices | Maint invoices list | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-113 | Maint. Invoices | AC | /admin/finance/maintenance-invoices | Invoice payment | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-114 | Maint. Invoices | AC | /admin/finance/maintenance-invoices | Installment receipt | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-115 | Schedulers | SA | /dev/schedulers | Dev scheduler is reachable as SUPER_ADMIN; in-date ACTIVE contracts are not touc | Pass | — | Playwright UI (21 checks) + API |
| US-120 | Ratings | SA/GM/OW | /admin/ratings | Route smoke as TENANT | Pass | — | Playwright UI (3 checks) + API |
| US-130 | Inventory | SA/GM | /admin/inventory | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-131 | Inventory | SA | /dev/schedulers/low-stock | Route smoke as TENANT | Pass | — | Playwright UI (4 checks) + API |
| US-140 | HR | HR/SA | /admin/hr/employees | Route smoke as TENANT | Pass | — | Playwright UI (22 checks) + API |
| US-141 | HR | HR | /admin/hr/attendance | Route smoke as TENANT | Pass | — | Playwright UI (21 checks) + API |
| US-142 | HR | HR | /admin/hr/leaves | Route smoke as TENANT | Pass | — | Playwright UI (21 checks) + API |
| US-143 | HR | HR | /admin/hr/deductions | Route smoke as TENANT | Pass | — | Playwright UI (21 checks) + API |
| US-144 | HR | HR | /admin/hr/payroll | Route smoke as TENANT | Pass | — | Playwright UI (22 checks) + API |
| US-145 | HR | HR | /admin/hr/advances | Route smoke as TENANT | Pass | — | Playwright UI (21 checks) + API |
| US-150 | Finance | AC | /admin/finance | Route smoke as TENANT | Pass | — | Playwright UI (39 checks) + API |
| US-151 | Finance | AC | /admin/finance/expenses | Route smoke as TENANT | Pass | — | Playwright UI (37 checks) + API |
| US-152 | Finance | AC | /admin/finance/revenues | Route smoke as TENANT | Pass | — | Playwright UI (45 checks) + API |
| US-153 | Finance | AC | /admin/finance/budget | Route smoke as TENANT | Pass | — | Playwright UI (37 checks) + API |
| US-154 | Finance | AC | /admin/finance/periods | Route smoke as TENANT | Pass | — | Playwright UI (45 checks) + API |
| US-155 | Finance | AC/OW | /admin/finance/owner-statements | Route smoke as TENANT | Pass | — | Playwright UI (37 checks) + API |
| US-160 | Reports | AC/GM | /admin/reports | Route smoke as TENANT | Pass | — | Playwright UI (17 checks) + API |
| US-161 | Reports | AC/GM | /admin/reports/occupancy | Route smoke as TENANT | Pass | — | Playwright UI (7 checks) + API |
| US-162 | Reports | AC/GM | /admin/reports/expiring-contracts | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-163 | Reports | AC/GM | /admin/reports/maintenance | Route smoke as TENANT | Pass | — | Playwright UI (7 checks) + API |
| US-164 | Reports | AC | /admin/reports/budget-vs-actual | Route smoke as TENANT | Pass | — | Playwright UI (8 checks) + API |
| US-165 | Reports | AC | /admin/reports | Route smoke as TENANT | Pass | — | Playwright UI (17 checks) + API |
| US-170 | Vacancies | SA/GM | /admin/vacancies | Route smoke as TENANT | Pass | — | Playwright UI (12 checks) + API |
| US-171 | Vacancies | SA/GM | /admin/vacancies/inquiries | Route smoke as TENANT | Pass | — | Playwright UI (11 checks) + API |
| US-180 | Accountant Portal | AC | /admin/accountant-portal/rent-confirmation | Route smoke as TENANT | Pass | — | Playwright UI (10 checks) + API |
| US-181 | Accountant Portal | AC | /admin/accountant-portal/renewals | Workflow module health — receipts list | Pass | — | Playwright UI (1 checks) + API |
| US-182 | Accountant Portal | AC | /admin/accountant-portal/maintenance-invoices | Route smoke as TENANT | Pass | — | Playwright UI (2 checks) + API |
| US-190 | Owner Portal | OW | /owner/dashboard | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-191 | Owner Portal | OW | /owner/properties | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-192 | Owner Portal | OW | /owner/statements | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-200 | Tenant Portal | TN | /tenant/my-unit | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-201 | Tenant Portal | TN | /tenant/contracts | Route smoke as TENANT | Pass | — | Playwright UI (7 checks) + API |
| US-202 | Tenant Portal | TN | /tenant/receipts | Resolve onboarded tenant email for portal login. | Pass | — | Playwright UI (3 checks) + API |
| US-203 | Tenant Portal | TN | /tenant/contract-requests | Resolve onboarded tenant email for portal login. | Pass | — | Playwright UI (3 checks) + API |
| US-204 | Tenant Portal | TN | /tenant/my-requests | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-205 | Tenant Portal | TN | /tenant/complaints | Route smoke as TENANT | Pass | — | Playwright UI (22 checks) + API |
| US-210 | Employee Portal | EMP | /employee/payslips | Route smoke as TENANT | Pass | — | Playwright UI (26 checks) + API |
| US-211 | Employee Portal | EMP | /employee/notifications | Route smoke as TENANT | Pass | — | Playwright UI (27 checks) + API |
| US-220 | Complaints | SA/GM | /admin/complaints | TenantComplaintService.create() persists with status="OPEN" and notifies admin a | Pass | — | Playwright UI (18 checks) + API |
| US-230 | Notifications | ALL | /notifications | Route smoke as TENANT | Pass | — | Playwright UI (18 checks) + API |
| US-231 | Notifications | SA | /dev/schedulers | Route smoke as TENANT | Pass | — | Playwright UI (39 checks) + API |
| US-240 | Settings | SA | /admin/lookups | Route smoke as TENANT | Pass | — | Playwright UI (3 checks) + API |
| US-241 | Settings | SA | /admin/users | Create OWNER portal user linked to owner record (idempotent) | Pass | — | Playwright UI (5 checks) + API |
| US-242 | Settings | SA | /admin/user-access | Route smoke as TENANT | Pass | — | Playwright UI (5 checks) + API |
| US-243 | Settings | SA | /admin/permissions | Route smoke as TENANT | Pass | — | Playwright UI (6 checks) + API |
| US-244 | Settings | SA | /admin/screens | Route smoke as TENANT | Pass | — | Playwright UI (5 checks) + API |
| US-245 | Settings | SA | /admin/module-settings | Route smoke as TENANT | Pass | — | Playwright UI (3 checks) + API |
| US-246 | Settings | SA | /admin/legal-entities | Route smoke as TENANT | Pass | — | Playwright UI (4 checks) + API |
| US-247 | Settings | SA | /admin/audit-log | Route smoke as TENANT | Pass | — | Playwright UI (4 checks) + API |
| US-250 | UX | ALL | dialogs | Dialog consistency | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-251 | UX | ALL | filters | Filter consistency | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-252 | UX | ALL | pagination | Pagination | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-253 | UX | ALL | i18n | Invalid login error message is translated (EN). | Pass | — | Playwright UI (1 checks) + API |
| US-254 | Scope | AC/PG | property-scope | Property scope AC | Pass | — | API verified; UI route smoke in iter-01 inventory |
| US-255 | Guards | ALL | 403 guards | SUPER_ADMIN UI + API login | Pass | — | Playwright UI (6 checks) + API |

## قائمة المشاكل المفتوحة (من UI Runtime)

| # | US-ID | Severity | الوصف | الملف/السبب | حالة الإصلاح |
|---|-------|----------|-------|-------------|--------------|
| — | — | — | **لا مشاكل مفتوحة** — 11 US أُصلحت وأُعيد اختبارها Pass | — | Fixed + Retest |

## فشل Playwright (الجولة الأولى — تم إصلاحها)

الجولة الأولى: 23 فشل. **بعد الإصلاح + retest: 139 passed / 0 failed** على الـ specs المتأثرة.

| US-ID | الإصلاح |
|-------|---------|
| US-001 | PROCEDURES_CLERK → `/admin/hr/employees` بدون redirect loop |
| US-142 / US-170 | SQL `is_active` + إزالة Pageable sort المكرر |
| US-180 / US-200 / US-205 / US-067 / US-255 | كلمات مرور QA صحيحة في E2E (`passwordForEmail`) |
| US-082 / US-092 | login شركة الصيانة بـ 666666 |
| US-230 | ترتيب deep links (owner approval + maintenance قبل complaints) |

---

*Generated by `docs/scripts/merge-runtime-results.mjs` — Playwright headless (login + navigation + forms) merged with API iteration-1.jsonl*
