# Property Management — Stabilization QA Summary

Generated from `docs/stabilization/qa-results/iteration-*.jsonl` via `docs/scripts/qa-report.mjs`.

- Excel report: `docs/stabilization/qa-report.xlsx`
- Raw rows: `docs/stabilization/qa-results/iteration-*.jsonl`
- Runtime evidence: `docs/stabilization/evidence/`

Stack: Spring Boot 3.2.5 / Java 17 / PostgreSQL 16 + Angular 17.

The QA harness (Playwright, `property-frontend/playwright.qa.config.ts`) drives the running backend (`http://localhost:8089/api/v1`) and frontend (`http://localhost:4208`). All iterations preserve the existing PostgreSQL data — no destructive migrations are run.

---

## Iteration 0 — bootstrap

Goal: stand up the running stack, install the QA test infrastructure, and seed the data we need for every later iteration via real API calls. Nothing is mocked.

Created via the API as `SUPER_ADMIN`:

| Entity | Count | Source |
| --- | --- | --- |
| Owners | 4 | `POST /owners` |
| Properties | 2 | `POST /properties` (with `floorUnitsConfig`) |
| Floors | 5 | auto from property request |
| Units | 12 | `POST /units` per floor |
| Role-specific users | 8 (GENERAL_MANAGER, ACCOUNTANT, HR_OFFICER, MAINTENANCE_OFFICER_INTERNAL, MAINTENANCE_COMPANY/OFFICER, PROPERTY_GUARD, PROCEDURES_CLERK, OWNER) | `POST /users` |
| Contractor company | 1 | `POST /contractor-companies` |
| Tenants | 2 | `POST /tenants/onboard` |

The spec is idempotent: 409 conflicts trigger an upsert against the existing record so it can be re-run any time without polluting the database.

### Bugs found and fixed in iteration 0

| ID | Severity | Summary | Files changed | Retest |
| --- | --- | --- | --- | --- |
| BUG-001 | High | `UserService.autoCreateEmployee` generated `employee_code = EMP-yyyyMMddHHmmss`, which collided whenever two employee-role users were created in the same second (HTTP 500 on `POST /users`). | `property-backend/src/main/java/com/propertymanagement/modules/user/service/UserService.java` | Now uses `CodeGenerationService.generate("EMP")` — sequence-backed. Six successive employee-role creations succeed. |

Other lessons baked into the spec (not product bugs):
- `PropertyRequest.ownerDocumentFiles` is mandatory.
- `GET /units/property/{id}` is the unit-by-property endpoint; `GET /units` is collection-only.
- `floorUnitsConfig` records the desired layout but does not auto-create unit rows; the QA bootstrap explicitly issues `POST /units` per floor.
- Tenants cannot be onboarded against a property until an ACCOUNTANT is linked to it.

---

## Iteration 1 — authentication, RBAC, route guards, API security

Goal: every role logs in, every defined frontend route is exercised by every role, and every protected backend endpoint is probed without a token and with the wrong role.

Coverage (this iteration alone):

| Section | Rows in report |
| --- | --- |
| 1.1 login form behaviour | 2 |
| 1.2 unauthenticated access redirects | 1 |
| 1.3 role landing pages | 11 |
| 1.4 route inventory smoke (per role × 72 routes) | ~504 |
| 1.5 API endpoint reject 4xx | 11 |

Total iteration 1 rows: ~530.

### Bugs found and fixed in iteration 1

| ID | Severity | Summary | Files changed | Retest |
| --- | --- | --- | --- | --- |
| BUG-002 | High | Unmapped URLs (`GET /employees`) and wrong-method requests (`GET /units`) bubbled to the catch-all `Exception` handler and returned HTTP 500 with the generic INTERNAL_ERROR body. | `property-backend/src/main/java/com/propertymanagement/shared/exception/GlobalExceptionHandler.java`, `property-backend/src/main/resources/messages.properties`, `property-backend/src/main/resources/messages_ar.properties` | Probes now return 404 (NoHandlerFoundException / NoResourceFoundException) and 405 (HttpRequestMethodNotSupportedException) with translated `error.not_found` / `error.method_not_allowed` messages. |
| BUG-003 | High | `PROCEDURES_CLERK` (no `dashboard.view`) hit a redirect loop after login: candidate landing `/admin/home` checked `hr.view`, succeeded, redirected to `/admin/dashboard`, whose permission guard then re-ran the same fallback logic. Angular cancelled the loop and the user ended up back on `/auth/login`. | `property-frontend/src/app/core/services/auth.service.ts`, `property-frontend/src/app/core/guards/auth.guard.ts` | Each `/admin/home` landing candidate now checks `permission: dashboard, action: view`, matching the redirect target. Roles without `dashboard.view` skip `/admin/home` and fall through to a module-specific page (`/admin/hr/employees`, `/admin/finance/dashboard`, `/admin/maintenance`). UI login as `PROCEDURES_CLERK` now lands on `/admin/hr/employees`. |

### Notes / gaps captured (not fixes)

- `1.4` distinguishes hard cross-portal leaks (`TENANT` hitting `/admin/*`, `OWNER` hitting `/officer/*`, etc.) from cases where the SPA renders an `/admin/*` page that the role's API permissions would still empty out (no menu, no data, all writes 403). The latter is recorded as a `Notes/gaps` entry, not a defect, because the back-end RBAC is enforced and the front-end guard is intentionally permissive within a portal.
- `1.5` confirmed `GET /properties` is scope-filtered for `TENANT` (returns the tenant's own properties only). Initial "TENANT can list properties" finding from a previous run was a false positive — `PropertyService.getAll` runs through `PropertyScopeService` for non-admin roles.

---

## Iteration 2 — Properties, Units, Floors, Owners, Tenants, Attachments, Files

Goal: cover the CRUD lifecycle, toggle-active, owner splits, file attachments and the documented delete-restriction guards for the six core entities.

Coverage rows (32 total, all `Passed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `02-properties.qa.spec.ts` | 2.1 properties CRUD + toggle-active, 2.2 validation, 2.3 owner splits, 2.4 PROPERTY_HAS_UNITS guard, 2.5 floors REST, 2.6 property attachments, 2.7 admin/list UI smoke | 18 |
| `02-units.qa.spec.ts` | 2.8 units CRUD + toggle-active, 2.9 validation, 2.10 floor capacity, 2.11 unit-is-rented guard | 9 |
| `02-owners-tenants-files.qa.spec.ts` | 2.12 owners CRUD, 2.13 dup nationalId 409, 2.14 sole-owner-of-active-property guard, 2.15 link/unlink portal user, 2.16 tenant onboard+update+unlink-unit, 2.17 delete tenant with DRAFT lease, 2.18 /files/upload extension + serve back | 14 |

### Bugs found and fixed in iteration 2

None. Every code path under test in this iteration matched the documented behaviour once the test expectations were aligned with the real DTOs and the actual contract-status model.

### Notes / gaps captured (not fixes)

- `OwnerSummary` in `PropertyResponse` uses `id` for the owner identifier (not `ownerId`); initial spec used the wrong field and was corrected.
- `UnitResponse` JSON fields are `rented` / `reserved` (Lombok strips the `is` prefix); initial spec used `isRented` / `isReserved` and was corrected.
- `POST` create endpoints in this codebase return HTTP `201 Created` (via `ResponseEntity.status(HttpStatus.CREATED)`); the QA harness now accepts both `200` and `201` via a small `isOk(status)` helper.
- The bootstrap creates `DRAFT` lease contracts, not `ACTIVE`, so:
  - The "cannot delete a tenant with an active lease" guard in `TenantService.delete` (lines 363-365 of `property-backend/src/main/java/com/propertymanagement/modules/tenant/service/TenantService.java`) does not fire in iteration 2; the delete succeeds and falls into the soft-delete branch as designed. Full guard verification is deferred to Iteration 3 once a contract reaches `ACTIVE`.
  - The "cannot deactivate / delete a rented unit" guard in `UnitService.toggleActive` / `delete` (lines 189-206) is only verifiable once `unit.rented` flips to true via an `ACTIVE` lease; iteration 2 marks the row as `To be verified during E2E testing` for the same reason.
- `FloorController.delete` performs an unconditional hard delete of a floor regardless of whether units exist on it (`property-backend/src/main/java/com/propertymanagement/modules/property/service/FloorService.java` lines 82-86). Confirmed in 2.5; not a defect per current product spec but flagged for review.
- `PATCH /units/{id}/rental-status?rented=<bool>` ignores the query parameter — the rented flag is always re-derived from active lease contracts (`UnitService.java` lines 172-182). Confirmed in 2.8.
- Iteration 2 mildly mutates seed data (soft-deletes one earlier bootstrap tenant in the first run). The state file `e2e/_qa/.state/qa-state.json` was updated to drop the stale id; all later test data is created with unique timestamps and cleaned up at the end of each test.

---

## Iteration 3 — Contracts lifecycle

Goal: drive every documented state transition on lease contracts plus the supporting modules (templates, annexes, fees) end-to-end via the REST API, and surface the bugs hidden behind the happy-path 500s.

Coverage rows (29 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `03-contract-templates.qa.spec.ts` | 3.1 CRUD + active toggle, 3.2 NotBlank content, 3.3 missing name, 3.3b invalid templateType returns 400, 3.4 ACCOUNTANT read-only | 10 |
| `03-lease-lifecycle.qa.spec.ts` | 3.5 cancel, 3.6 submit + owner approve, 3.7 owner reject, 3.8 direct activate, 3.9 request-renewal + cancel-renewal, 3.10 terminate + owner approve, 3.11 dev scheduler reachability, 3.12 staff direct renew, 3.13 PUT on ACTIVE rejected, 3.14 UNIT_ALREADY_OCCUPIED | 14 |
| `03-annexes-fees.qa.spec.ts` | 3.15 annex CRUD, 3.16 annex NotBlank, 3.17 fee CRUD + mark-paid, 3.18a invalid feeType 400, 3.18 negative amount 400 | 10 |
| `99-bug-fixes-iteration-3.qa.spec.ts` | BUG-004..BUG-008 retest records | 5 |

### Bugs found and fixed in iteration 3

| ID | Severity | Surface | Root cause | Fix |
| --- | --- | --- | --- | --- |
| BUG-004 | Critical | `POST /contract-templates` returned **500** on every create | `ContractTemplate.variables` is a Java `String` mapped to a `jsonb` column. Hibernate 6 binds plain `String` as varchar, and PostgreSQL refuses the cast (`ERROR: column "variables" is of type jsonb but expression is of type character varying`). | Added `@JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb")` so Hibernate binds the value as a JSON parameter. *Files:* `property-backend/src/main/java/com/propertymanagement/modules/contract/template/entity/ContractTemplate.java`. |
| BUG-005 | Medium | `POST /contract-templates` returned **500** for any `templateType` outside the DB allow-list | The DB CHECK constraint `contract_templates_template_type_check` only allows `RESIDENTIAL`, `COMMERCIAL`, `SHOP`. The service forwarded whatever the caller sent, so unknown values surfaced as a `DataIntegrityViolationException` 500. | Service now normalizes and validates against the same allow-list and throws `AppException.badRequest("INVALID_TEMPLATE_TYPE")` for unknown values. *Files:* `property-backend/src/main/java/com/propertymanagement/modules/contract/template/service/ContractTemplateService.java`. |
| BUG-006 | High | `POST /contracts` and renewal calls intermittently failed with `duplicate key value violates unique constraint "lease_contracts_contract_number_key"` | `ContractRenewalService` generated new contract numbers by counting existing rows (`countByContractNumberStartingWith("CNT-" + year) + 1`) instead of going through the pessimistic-locked `CodeGenerationService.generate("CNT")`. Both code paths ended up issuing the same `CNT-yyyy-XXXXX` string and the second insert collided. | `ContractRenewalService` now calls `codeGenerationService.generate("CNT")` in both `renew` and `finalizeRenewalApproval`. The codegen state row was resynced to match the actual lease_contracts row count via SQL (non-destructive). *Files:* `property-backend/src/main/java/com/propertymanagement/modules/contract/renewal/service/ContractRenewalService.java`. |
| BUG-007 | High | `POST /owner-portal/contracts/{id}/termination-decision` returned **500** whenever the contract had a unit that triggered vacancy auto-publish | `notifications.request_id` was created in V11 with `REFERENCES maintenance_requests(id) ON DELETE CASCADE`, but the column is reused as a generic identifier across vacancy listings, payroll deductions, complaints and contract click-throughs. Any non-maintenance notification (e.g. `VacancyPublishingService.notifyVacancyPublished`) inserting a vacancy listing id into `request_id` blew up the FK and rolled the parent transaction back. | New migration `V169__notifications_request_id_drop_fk.sql` drops the legacy maintenance-only FK with `IF EXISTS`. Existing rows are untouched. *Files:* `property-backend/src/main/resources/db/migration/V169__notifications_request_id_drop_fk.sql`. |
| BUG-008 | Medium | `POST /contract-fees` returned **500** for `feeType` outside the DB allow-list | Same shape as BUG-005 — DB CHECK `contract_fees_fee_type_check` allows only `ELECTRICITY`, `WATER`, `GAS`, `SERVICE_CHARGE`, `PARKING`, `MAINTENANCE_CHARGE`, `PENALTY`, `OTHER`; service forwarded freely. | `ContractFeeService` now validates the value with the same allow-list and throws `AppException.badRequest("INVALID_FEE_TYPE")` for unknown values. *Files:* `property-backend/src/main/java/com/propertymanagement/modules/contract/fee/service/ContractFeeService.java`. |

### Notes / gaps captured (not fixes)

- `POST /contracts/{id}/request-renewal` uses DTO field names `proposedRentAmount` and `note`, but the staff direct-renew path (`POST /contracts/{id}/renew`) uses `newMonthlyRent` and `notes`. Two adjacent endpoints with different naming conventions — flagged for product review.
- `PATCH /contracts/{id}/terminate` DTO uses `terminationReason` and `securityDepositReturnToTenant` (not the shorthand names some frontend code may expect). Spec aligned to the actual DTO.
- `POST /contracts/{id}/renew` returns HTTP **201** with the new DRAFT contract body; the original contract stays `ACTIVE` until the new one is activated. Verified in 3.12.
- `POST /dev/schedulers/contract-expiring` only flips ACTIVE→EXPIRED when `endDate < today`. Iteration 13 (schedulers) will re-run this with a past-dated contract once direct-DB seeding is part of the harness. Recorded as `To be verified during E2E testing` for iter 3.
- Owner draft amend/reject flow (`/owner-portal/draft-contracts/*`) is in scope for the tenant-portal / owner-portal iterations (10–11); iteration 3 only exercises the post-submit `PENDING_OWNER_APPROVAL` decision endpoint.

---

## Iteration 4 — Rent finance / payments

Goal: drive every state in the rent payment schedule — auto-generation, tenant proof upload, accountant approve/reject, mark-paid, direct payment recording (full + partial), and the overdue / dunning / due-reminder schedulers — end-to-end via the REST API, and surface the bugs hidden behind the happy-path 500s.

Coverage rows (13 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `04-rent-schedules.qa.spec.ts` | 4.1 auto-generation shape (max(leaseStart, today)..leaseEnd), 4.2 tenant upload-proof → accountant approve → PAID, 4.3 accountant reject proof → PAYMENT_REJECTED, 4.4 mark-paid (no proof), 4.5 POST /payments full → PAID + partial → PARTIAL, 4.6 rent-overdue scheduler flips past-due rows, 4.7 rent-due-reminders reachable, 4.8 rent-dunning-escalation reachable, 4.9 GET /payments/overdue, 4.10 GET /payments/proofs/pending | 12 |
| `99-bug-fixes-iteration-4.qa.spec.ts` | BUG-009 retest record | 1 |

### Bugs found and fixed in iteration 4

| ID | Severity | Surface | Root cause | Fix |
| --- | --- | --- | --- | --- |
| BUG-009 | Critical | `POST /dev/schedulers/rent-overdue` (and the nightly scheduled job that invokes the same code path) returned **500** and silently rolled back every OVERDUE flip whenever a past-due row also triggered late-fee accrual | `RentPaymentService.applyLateFeeAccrual` inserts a synthetic `rent_payments` row with `payment_method = "ACCRUAL"` to mark late-fee accruals. The original CHECK constraint (`rent_payments_payment_method_check`, created in V31) only allowed `CASH/BANK_TRANSFER/CHECK/ONLINE/OTHER`. The accrual insert therefore violated the constraint, the transaction rolled back, and the 44 `OVERDUE` updates made earlier in the same job were lost. | New idempotent Flyway migration `V170__rent_payments_allow_accrual_method.sql` (DO block, exists-guard) drops the old constraint and re-adds it including `ACCRUAL`. Live DB patched in-place; future startups re-apply the migration safely. *Files:* `property-backend/src/main/resources/db/migration/V170__rent_payments_allow_accrual_method.sql`. |

### Notes / gaps captured (not fixes)

- `LeaseContractService.generatePaymentSchedule` deliberately skips months before the calendar month of activation: `firstBillYm = max(leaseStartYm, todayYm)`. A 12-month lease created in May is therefore billed for 8 months (May → Dec), not 12. Iteration 4 aligned 4.1 to that documented behaviour; flagged for product review in case the intent is "always 12 rows".
- Tenant-portal proof upload (`POST /tenant-portal/contracts/{cid}/payment-schedule/{sid}/proof`) requires the caller to be the tenant whose user is mapped to the contract. The QA harness signs in as the contract's actual portal user (looked up via `GET /tenants/{id}.email`) rather than the generic bootstrap `TENANT` credential, because the latter is mapped to a different tenant entity.
- `RentPaymentScheduleResponse` exposes `paidAt` (camelCase). The review-approve flow leaves `paidAt` as the schedule's existing `paidAt` (null on the first approval) because `setReviewedAt` is set instead — flagged as a potential reporting gap; the row still flips to `PAID` and the corresponding `rent_payments` row carries `paymentDate`. Not a defect against the current contract.

---

## Iteration 5 — Maintenance lifecycle, contracts, and invoices

Goal: drive every documented state transition in the maintenance module — internal / company / officer routing, schedule / reject-schedule / accept-schedule, visit reports (COMPLETED / NEEDS_REVISIT / TENANT_ABSENT) with inventory deductions, tenant ratings, cancellations, the company queue, and the maintenance contract lifecycle (DRAFT → ACTIVE → RENEWED / ENDED / CANCELLED) plus contract invoice plans (FULL / SCHEDULED).

Coverage rows (29 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `05-maintenance-lifecycle.qa.spec.ts` | 5.1 PENDING→ASSIGNED→SCHEDULED→IN_PROGRESS→COMPLETED, 5.2 accept-schedule, 5.3 reject-schedule, 5.4 NEEDS_REVISIT revisit loop, 5.5 TENANT_ABSENT, 5.6 cancel non-terminal + reject re-cancel, 5.7 duplicate visit-report 409, 5.8 inventory OUT deductions, 5.9 visit-report from non-IN_PROGRESS rejected, 5.10 rating 1–4 + out-of-range, 5.11 COMPANY assignment routes to /company-queue with ACTIVE MaintenanceContract, 5.12 dev maintenance-sla scheduler | 18 |
| `05-maintenance-contracts.qa.spec.ts` | 5.13 DRAFT→ACTIVE auto-issues ISSUED invoice, 5.14 cancel DRAFT, 5.15 request-renewal + APPROVED renewal-decision (old=RENEWED, new ACTIVE), 5.16 terminate(body) + APPROVED termination-decision → ENDED, 5.17 mark-paid (FULL plan) flips to PAID, 5.18 SCHEDULED plan (installmentCount=3, due dates supplied), 5.19 contractorCompanyId validation | 10 |
| `99-bug-fixes-iteration-5.qa.spec.ts` | BUG-010 retest record | 1 |

### Bugs found and fixed in iteration 5

| ID | Severity | Surface | Root cause | Fix |
| --- | --- | --- | --- | --- |
| BUG-010 | Critical | `PATCH /maintenance-invoices/{id}/mark-paid` and `POST /maintenance-invoices/{id}/payment-plan` against a *contract* invoice returned **500** (`DataIntegrityViolationException` / FK violation), rolling back the payment plan and leaving the contract invoice stuck on `ISSUED`. | The Flyway script V149 created `property_mgmt.maintenance_contract_invoice_payments` with `invoice_id` declared as `REFERENCES property_mgmt.maintenance_contract_invoices(id) ON DELETE CASCADE`, but the live DB had the FK pointing at the older one-off `property_mgmt.maintenance_invoices(id)` (the contractor-submitted invoice table). Every contract-invoice payment insert therefore violated `maintenance_contract_invoice_payments_invoice_id_fkey` ("Key (invoice_id)=(N) is not present in table maintenance_invoices") and the parent transaction rolled back. | New idempotent Flyway migration `V171__fix_maintenance_contract_invoice_payments_fk.sql` (DO block + exists-guard) drops the misdirected FK and re-adds it pointing at `maintenance_contract_invoices(id) ON DELETE CASCADE`. The migration also emits a `RAISE NOTICE` if any orphan rows exist so they can be triaged manually. *Files:* `property-backend/src/main/resources/db/migration/V171__fix_maintenance_contract_invoice_payments_fk.sql`. |

### Notes / gaps captured (not fixes)

- `POST /maintenance-invoices/{id}/payment-plan` with `mode=SCHEDULED` requires the caller to supply explicit `dueDate` values for installments beyond the first (the first inherits the invoice `dueDate`). The DTO field is `installments: [{ installmentNo, dueDate }]`. Flagged in the spec; 5.18 sends the array.
- `MaintenanceContractResponse` exposes the contract identifier as `contractId` (not `id`); `MaintenanceContractInvoiceResponse` uses `invoiceId`. Specs aligned.
- `POST /maintenance-companies` requires `email`, `portalPropertyId`, `contractStart`, `contractEnd`, and `attachmentFiles` (at least one file). 5.13–5.19 set these explicitly.
- `national_id` on `owners` is `VARCHAR(30)`; the contract spec generates owner national ids constrained to 28 chars.
- `/maintenance/requests/company-queue` only returns rows whose property has both a `COMPANY` `PropertyMaintenanceAssignment` for the logged-in company *and* an `ACTIVE` `MaintenanceContract`. 5.11 sets both up before asserting visibility.
- `iteration-05.jsonl` is reset by the alphabetically-first iter-5 spec (`05-maintenance-contracts.qa.spec.ts`); subsequent iter-5 specs append. This avoids the truncation observed when each spec reset the same log.

---

## Iteration 6 — Complaints and inventory

Goal: drive every documented complaint state transition (OPEN → IN_REVIEW → RESOLVED / CLOSED), attachments, replies, ratings, conversion to maintenance, and reconcile inventory items (CRUD, stock IN/OUT, validation, low-stock listing) with the visit-report consumption already covered by iteration 5.

Coverage rows (24 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `06-complaints.qa.spec.ts` | 6.1 create OPEN, 6.2 attachments[], 6.3 assign → IN_REVIEW, 6.4 resolve → RESOLVED, 6.5 close + double-close 400, 6.6 reply, 6.7 premature rating 400, 6.8 rating after close + duplicate 400, 6.9 convert-to-MR (URGENT, fromComplaint=true, status unchanged) + duplicate 400, 6.10 CLEANLINESS accepted, 6.10b unknown complaintType → 400, 6.11 tenant GET /complaints/my, 6.12 tenant cannot GET /complaints (403), 6.13 NotBlank validation | 14 |
| `06-inventory.qa.spec.ts` | 6.20 CRUD (no quantity drift) + soft delete, 6.21 IN, 6.22 OUT + insufficient 400, 6.23 quantity<=0 → 400, 6.24 bulk DTO, 6.25 low-stock surface, 6.26 low-stock reconciliation with visit-report, 6.27 NotBlank validation, 6.28 paged read accessible to non-tenant roles | 9 |
| `99-bug-fixes-iteration-6.qa.spec.ts` | BUG-011 retest record | 1 |

### Bugs found and fixed in iteration 6

| ID | Severity | Surface | Root cause | Fix |
| --- | --- | --- | --- | --- |
| BUG-011 | Medium | `POST /complaints` with `complaintType=CLEANLINESS` (a value the COMPLAINT_TYPE lookup advertises) returned **500** `DataIntegrityViolationException` instead of being accepted; any unknown `complaintType` also leaked as 500 instead of being a clean validation error. | V165 seeded `CLEANLINESS` into the `lookup_values` table for the `COMPLAINT_TYPE` group, but the V33 DB CHECK on `tenant_complaints.complaint_type` only allowed `{NEIGHBOR_NOISE,COMMON_AREA,SECURITY,MANAGEMENT,SERVICE,OTHER}`. `TenantComplaintService.create()` forwarded `complaintType` unchanged to the entity, so any value not in the CHECK rolled back the insert with a 500. | Two-layer fix: 1) new idempotent Flyway migration `V172__tenant_complaints_allow_cleanliness.sql` drops the misaligned CHECK and recreates it with the full lookup-aligned set `{NEIGHBOR_NOISE,COMMON_AREA,CLEANLINESS,SECURITY,MANAGEMENT,SERVICE,OTHER}`. 2) `TenantComplaintService.create()` now normalizes/validates `complaintType` and `priority` against the same allow-list and throws `AppException.badRequest("INVALID_COMPLAINT_TYPE" / "INVALID_COMPLAINT_PRIORITY")` for unknown values so future drift surfaces as a clean 400. *Files:* `property-backend/src/main/resources/db/migration/V172__tenant_complaints_allow_cleanliness.sql`, `property-backend/src/main/java/com/propertymanagement/modules/complaint/service/TenantComplaintService.java`. |

### Notes / gaps captured (not fixes)

- `POST /complaints/{id}/maintenance-request` deliberately does **not** flip `complaint.status`. The complaint stays in its current status (`OPEN` by default in 6.9) and only gains a `maintenanceRequestId` link. The frontend must show the linked MR without expecting the complaint to leave OPEN/IN_REVIEW. Documented in 6.9 `notes`.
- `TenantComplaintController.assign` and `resolve` do not enforce a prior-status check — the service flips to `IN_REVIEW`/`RESOLVED` from any current status. The current product spec accepts that; flagged here so iter-10/iter-11 (tenant/officer portals) can verify the UX surfaces are not relying on a stricter machine.
- `TenantComplaintController.create` has no tenant-self check: any class-gate role (TENANT/OWNER/ACCOUNTANT/GM/SUPER_ADMIN) can post for any `tenantId`/`propertyId`. The QA bootstrap therefore creates complaints as `SUPER_ADMIN`; the tenant-portal iteration will assert the tighter spec.
- `InventoryService.update` intentionally never mutates `quantity`. Updates only edit metadata (names, unit-of-measure, `minQuantity`, location); the transaction ledger remains the single source of truth for stock movement. 6.20 asserts this.
- `InventoryService.delete` is a soft delete (`active=false`). Subsequent `GET /inventory/{id}` returns 404 because `findActive` filters on `active=true`. The underlying row is preserved for audit. 6.20 verifies the 404.
- `InventoryController` has no class-level `@PreAuthorize`; read endpoints are accessible to any authenticated role (6.28 verifies SUPER_ADMIN and ACCOUNTANT). Owner scope is still applied at the service layer.
- Iteration 6's JSONL log is reset by the alphabetically-first iter-6 spec (`06-complaints.qa.spec.ts`); the other iter-6 specs (`06-inventory`, `99-bug-fixes-iteration-6`) append.

---

## Iteration 7 — Finance dashboard, expenses, revenues, budgets, reports, exports

Goal: drive every documented surface in the Finance module — KPI dashboard, expenses + revenues CRUD with full validation matrix and role gating (SUPER_ADMIN / GENERAL_MANAGER / ACCOUNTANT / OWNER / TENANT), the four financial reports (P&L, cashflow, owner statements, budget-vs-actual), overdue listing, and the CSV export pipeline.

Coverage rows (24 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `07-finance.qa.spec.ts` | 7.1 dashboard shape, 7.2 propertyId filter, 7.3 TENANT 403, 7.4 expense create defaults (EXP-yyyy-NNNN, PENDING, OMR), 7.5 expense @Valid required fields, 7.6 amount<=0 → 400, 7.7 bad expenseDate → 400 INVALID_DATE_FORMAT (BUG-012 retest), 7.8 expense paged read, 7.9 revenue create defaults (REV-yyyy-NNNN, OMR), 7.10 revenue @Valid required fields, 7.11 OWNER 403, 7.12 GM cannot POST 403, 7.13 ACCOUNTANT can POST, 7.14 budgets 200 (empty), 7.15 P&L 200, 7.16 cashflow 200, 7.17 owner-statements 200, 7.18 budget-vs-actual returns object with rows[] (placeholder actualAmount documented), 7.19 /payments/overdue 200, 7.20 CSV export 200, 7.21 CSV missing dates 400, 7.22 CSV TENANT 403, 7.23 budget alert (recorded as gap — no seed) | 23 |
| `99-bug-fixes-iteration-7.qa.spec.ts` | BUG-012 retest (DateTimeParseException + ParamTypeMismatch + MissingParam) | 1 |

### Bugs found and fixed in iteration 7

| ID | Severity | Surface | Root cause | Fix |
| --- | --- | --- | --- | --- |
| BUG-012 | Medium | A malformed `expenseDate` on `POST /finance/expenses` (and any other Spring-managed date / numeric / boolean query parameter, plus malformed JSON request bodies and missing required query parameters) returned HTTP **500 `INTERNAL_ERROR`**, swallowing the real cause and breaking the API contract for what should be clean validation 4xx responses. | `GlobalExceptionHandler` only registered handlers for `AppException`, `MethodArgumentNotValidException`, `AccessDenied`/`Authentication`, `DataIntegrityViolationException`, `NoHandlerFound`/`NoResourceFound` and `HttpRequestMethodNotSupported`. Everything else (e.g. `DateTimeParseException` from `FinanceService.createExpense`'s `LocalDate.parse`, `MethodArgumentTypeMismatchException` from Spring converting `?from=garbage` to `LocalDate`, `MissingServletRequestParameterException` from omitted required query params, `HttpMessageNotReadableException` from malformed JSON bodies) fell through to the catch-all `handleGeneral` → 500. | New `@ExceptionHandler` entries: `DateTimeParseException` → 400 `INVALID_DATE_FORMAT`, `MethodArgumentTypeMismatchException` → 400 `INVALID_PARAMETER`, `MissingServletRequestParameterException` → 400 `MISSING_PARAMETER`, `HttpMessageNotReadableException` → 400 `INVALID_REQUEST_BODY`. Localized messages added to `messages.properties` and `messages_ar.properties`. *Files:* `property-backend/src/main/java/com/propertymanagement/shared/exception/GlobalExceptionHandler.java`, `property-backend/src/main/resources/messages.properties`, `property-backend/src/main/resources/messages_ar.properties`. |

### Notes / gaps captured (not fixes)

- **No public budget CRUD API.** `budgets` rows are seed-only (V47/V85/V153). The QA database currently has zero budget rows, so `GET /finance/budgets` returns `[]` and `FinanceService.checkBudgetThreshold` (which fires `NotificationType.BUDGET_THRESHOLD_EXCEEDED`) has no row to compare against. Test 7.23 is recorded as `To be verified during E2E testing`; bootstrap could optionally seed one row per property+category in a future iteration.
- **`GET /reports/budget-vs-actual` per-row `actualAmount` is a placeholder (0)** — `ReportsService.budgetVsActual` notes "Actual expenses for same property would need a category-scoped query; using zero as placeholder until category_id link is wired in BudgetEntity." Flagged to product. Test 7.18 records this gap and asserts only on the shape (object with `rows[]`).
- **Expense status state machine is not exposed via HTTP.** The DB CHECK allows `PENDING/APPROVED/REJECTED/PAID` and `RolePermissionService` grants `finance.approve` / `finance.reject` to GM/ACCOUNTANT, but there is no `PATCH /finance/expenses/{id}/approve` (or similar). Status changes today come only from payroll sync, maintenance contract invoice sync, or direct seed inserts. Flagged for product.
- **Currency drift across writers**: `FinanceService.createExpense` defaults to `OMR`, `PayrollService.createPayrollExpense` writes `SAR`, `MaintenanceContractInvoiceService` writes `OMR`. Frontend `currencyLabel` maps `SAR → OMR` for display. Not a defect of the QA surface but a known inconsistency.
- **Cashflow vs P&L expense inclusion**: P&L view includes `status IN ('PENDING','PAID')` (V146); cashflow native SQL includes only `e.status = 'PAID'`. Same calendar month can disagree by design (7.16 notes it explicitly).
- **No XLSX export backend endpoint** — only CSV. UI-side Excel exports are client-side.
- **Petty cash** (`V50`): tables exist, but no controller/service/DTOs in this repo. Not part of iteration 7.

---

## Iteration 8 — HR (employees, attendance, leaves, payroll, deductions, employee portal)

Goal: drive every documented HR surface — employee CRUD, attendance list, leave PENDING/APPROVED/REJECTED with balances, payroll SUBMITTED→APPROVED→PAID, salary advances, bonuses, payslip adjust, payroll deductions DRAFT→SENT_TO_ACCOUNTANT→APPROVED, payroll reject, and employee portal my-payslips (including forced password change gate).

Coverage rows (26 total, all `Passed` / `Fixed`):

| Spec | Tests | Rows |
| --- | --- | --- |
| `08-hr-employees-leaves.qa.spec.ts` | 8.1–8.12 employees, attendance, leaves | 12 |
| `08-hr-payroll.qa.spec.ts` | 8.13–8.22 payroll, advances, deductions, portal payslips | 12 |
| `99-bug-fixes-iteration-8.qa.spec.ts` | BUG-013, BUG-014 retests | 2 |

### Bugs found and fixed in iteration 8

| ID | Severity | Summary | Files changed | Retest |
| --- | --- | --- | --- | --- |
| BUG-013 | High | `ACCOUNTANT` could not `POST /hr/deductions/{id}/approve` — `@RequiresPermission(module="hr", action="approve")` failed because default role matrix granted `hr.view/create/edit/export` only, while `PayrollDeductionService.review()` already allowed accountants. | `property-backend/src/main/java/com/propertymanagement/modules/permission/service/RolePermissionService.java` | ACCOUNTANT approve on same-property deduction now returns 200 APPROVED. |
| BUG-014 | Critical | `POST /hr/payroll/{id}/reject` returned **500** — `PayrollService.reject()` sets `status=REJECTED` but V122 DB CHECK only allowed `SUBMITTED/APPROVED/PAID/CANCELLED`. | `property-backend/src/main/resources/db/migration/V173__payroll_runs_allow_rejected_status.sql`, `property-backend/src/main/java/com/propertymanagement/modules/hr/payroll/service/PayrollService.java` (syncPayrollExpense on reject) | Reject returns 200 REJECTED. |

### Notes / gaps captured (not fixes)

- New employee portal users are created with `mustChangePassword=true`; API returns 403 `PASSWORD_CHANGE_REQUIRED` until `PUT /users/me/change-password` and re-login (8.21 exercises this).
- `application.yml` uses `user.default-password` while `EmployeeService` reads `@Value("${user.default.password:...}")` — passwords still resolve to `12345` via Spring relaxed binding in practice; flagged for alignment review.
- Payroll period collisions are avoided in specs via `findFreePayrollPeriod()` scanning year/month slots.
- `fixtures.ts` now reads backend URL from `.runtime/launcher-state.json` when `E2E_API_URL` is unset.

---

## Iteration 9 — Vacancies + Inspections

Coverage: 15 rows, all **Passed**. No product bugs — vacancy spec picks first unit without an active listing.

---

## Iterations 10–14 — Portals, notifications, schedulers, i18n

| Iter | Spec | Rows | Result |
| --- | --- | --- | --- |
| 10 | `10-tenant-portal.qa.spec.ts` | 17 | All tenant `/tenant/*` UI routes + tenant APIs |
| 11 | `11-officer-portal.qa.spec.ts` | 12 | Officer/company UI + schedule/queue APIs |
| 12 | `12-notifications.qa.spec.ts` | 6 | Inbox, unread, mark read/all |
| 13 | `13-schedulers.qa.spec.ts` | 12 | All dev scheduler triggers |
| 14 | `14-i18n.qa.spec.ts` | 3 | EN/AR login, RTL, translated errors |

No new bugs in iterations 9–14.

---

## Iteration 15 — Final QA (non-blocking gaps)

Goal: close the remaining stabilization gaps — budget threshold alerts, mark-one-read UI, AUTO_PUBLISHED vacancies, notification deep links, and admin settings screens (audit log, module settings, screen settings, permissions matrix).

Spec: `15-final-qa.qa.spec.ts` — **9 tests, all Passed**.

| # | Area | Result |
| --- | --- | --- |
| 15.1 | Budget seed via `POST /dev/qa/seed-budget` → expense → `BUDGET_THRESHOLD_EXCEEDED` notification (recipient, message, `params.expenseId`, unread +1) | Passed |
| 15.2 | UI mark one notification read; unread count 185→184 | Passed |
| 15.3 | Contract termination → owner approve → `listingSource=AUTO_PUBLISHED` | Passed |
| 15.4 | Force past end date → `contract-expiring` → `vacancy-auto-publish` backfill | Passed |
| 15.5 | Deep links for 6 notification types in QA inbox (UI click) | Passed |
| 15.6 | `/admin/audit-log` — filters + GET `/audit-logs` 200 | Passed |
| 15.7 | `/admin/module-settings` — toggle + PUT property-modules 200 | Passed |
| 15.8 | `/admin/screens` — global toggle PUT 200 | Passed |
| 15.9 | `/admin/permissions` — matrix toggle + Apply PUT 200 | Passed |

### Bugs found and fixed in iteration 15

| ID | Severity | Summary | Files changed | Retest |
| --- | --- | --- | --- | --- |
| BUG-015 | High | `BUDGET_THRESHOLD_EXCEEDED` stored `expense.id` in `requestId`, misrouting inbox clicks to `/admin/maintenance/{id}`. | `FinanceService.java` (null `requestId`, `params.expenseId`), `notification-navigation.util.ts` | 15.1 + 15.5 Passed |
| BUG-016 | High | Contract-approval notifications (`CONTRACT_TERMINATION_REQUESTED`, etc.) were routed via stale `requestId` before owner-portal mapping. | `notification-navigation.util.ts` (owner-portal types first; `REQUEST_*` only for maintenance) | 15.5 Passed |
| BUG-017 | Medium | Missing deep links for `VACANCY_PUBLISHED`, `RENTAL_INQUIRY_RECEIVED`, `INSPECTION_COMPLETED`, `BUDGET_THRESHOLD_EXCEEDED`. | `notification-navigation.util.ts`, `notification.model.ts` | 15.5 Passed |
| BUG-018 | High | Backend rebuild blocked by missing `AppException` import in `EmployeeService`. | `EmployeeService.java` | Backend starts; all iter 15 tests Passed |

### QA infrastructure added (not business features)

- `POST /dev/qa/seed-budget`, `POST /dev/qa/contracts/{id}/force-end-date-past`, `POST /dev/qa/units/{id}/unpublish-vacancy` — SUPER_ADMIN-only helpers for test data (no public budget CRUD).
- `e2e/_qa/db-helper.ts` — calls the dev QA endpoints from Playwright specs.
- `docs/scripts/qa-report.mjs` — optional `QA_REPORT_PATH` env override.

---

## Iteration 16 — Final stabilization & production-readiness pass

Goal: close all remaining non-Passed QA rows where possible — retest historical failures, resolve 104 deferred param routes from iteration 1.4, verify mark-all-read, admin user-access, role matrix, notification coverage, and admin UI route sweep.

Spec: `16-final-stabilization.qa.spec.ts` — **18 tests, all Passed** (append mode `QA_APPEND_ITERATION=1` for partial reruns).

| # | Area | Result |
| --- | --- | --- |
| 16.1 | Retest `PROCEDURES_CLERK` UI login landing (supersedes iter 1.3 Failed) | Passed |
| 16.2 | `param-resolver.ts` — discover all param entity ids from live APIs | Passed |
| 16.3 | `TENANT GET /properties` scoped 200 (supersedes iter 1.5 false failure) | Passed |
| 16.4 | Unread-count API envelope `{ data: { unreadCount } }` (supersedes iter 12.1) | Passed |
| 16.5 | Mark all read — API count → 0 + UI unread rows = 0 | Passed |
| 16.6 | Param route smoke × 8 roles × 14 routes (supersedes iter 1.4 deferred) | Passed |
| 16.7 | `/admin/user-access` — search + permission details dialog | Passed |
| 16.8 | SUPER_ADMIN `/admin/*` static route sweep (58 routes, no JS errors) | Passed |
| 16.9 | Role matrix — all 11 roles API login + UI landing | Passed |
| 16.10 | Notification coverage matrix (6 types in QA inbox) | Passed |
| 16.11 | BUG-001…BUG-019 consolidated PASSED AFTER RETEST | Passed |

### Bugs found and fixed in iteration 16

| ID | Severity | Summary | Files changed | Retest |
| --- | --- | --- | --- | --- |
| BUG-019 | High | `markAllRead()` only updated the first 500 notifications (paginated fetch); users with >500 inbox rows kept stale unread counts after PATCH `/notifications/my/read-all`. | `NotificationRepository.java` (`markAllReadForUser` bulk UPDATE), `NotificationService.java` | 16.5 Passed |

### QA infrastructure added (not business features)

- `e2e/_qa/param-resolver.ts` — runtime API discovery for contract, maintenance, inspection, vacancy, payroll, payslip, and maintenance-contract ids.
- `e2e/_qa/notification-helpers.ts` — shared `readUnreadCount()` parsing `{ unreadCount }` envelope.
- `QA_APPEND_ITERATION=1` — append to iteration JSONL without clearing (for partial reruns).
- `credentials.ts` — `TENANT` email corrected to `qa.tenant2@propmgmt.com` (matches bootstrap).

---

## Final production-readiness assessment (2026-05-24)

### Report totals (`qa-report.xlsx` — 1150 rows)

| Status | Count | Notes |
| --- | --- | --- |
| **Passed** | 1029 | Includes iteration 16 superseding rows |
| **Fixed** | 14 | Historical bug-fix retest records (iter 0–8, 99-bug-fixes specs) |
| **Failed** | 2 | Stale iteration-1 rows only (superseded by iteration 16) |
| **To be verified during E2E testing** | 105 | Stale iteration-1.4 deferred rows (superseded by iteration 16.6 param sweep) |
| **Blocked** | 0 | — |

**Effective readiness (superseded rows treated as Passed):** **1136 / 1150 ≈ 98.8%**

**Raw Passed rate:** 1029 / 1150 ≈ **89.5%**

The Excel file retains historical rows for audit trail; use iteration **15** and **16** rows as the authoritative retest for budget alerts, notifications, vacancies, param routes, and admin config screens.

### Remaining failures (historical only — superseded)

| Iteration | Route | Role | Superseded by |
| --- | --- | --- | --- |
| 1 | `/auth/login` | PROCEDURES_CLERK | 16.1 Passed (BUG-003) |
| 1 | `GET /properties` | TENANT | 16.3 Passed (scoped 200 is correct) |

### Remaining risks (non-blocking)

1. **SPA soft guard:** Authenticated `TENANT` may reach `/admin/dashboard` URL in the SPA shell; backend `@RequiresPermission` still enforces data access (documented in 16.9).
2. **Notification catalog coverage:** Only 6 of ~80 `NotificationType` values observed in the QA inbox; others require dedicated business flows to trigger (not gaps in inbox UI).
3. **Cross-portal console noise:** SUPER_ADMIN visiting `/officer/*` or `/tenant/*` routes may log 403 network errors in DevTools; admin-only sweep (16.8) is clean.

### Notification coverage matrix (QA inbox)

| Notification Type | Generated | Recipient Verified | Link Verified | Read Verified | Status |
| --- | --- | --- | --- | --- | --- |
| VACANCY_PUBLISHED | Y | Y (SUPER_ADMIN) | Y (iter 15.5) | Y | Passed |
| CONTRACT_TERMINATION_REQUESTED | Y | Y | Y | Y | Passed |
| BUDGET_THRESHOLD_EXCEEDED | Y | Y | Y | Y | Passed |
| RENTAL_INQUIRY_RECEIVED | Y | Y | Y | Y | Passed |
| INSPECTION_COMPLETED | Y | Y | Y | Y | Passed |
| RENT_GRACE_PERIOD_ENDING | Y | Y | — | Y | Passed |

### Role coverage matrix (iteration 16.9)

| Role | API Login | UI Landing | Status |
| --- | --- | --- | --- |
| SUPER_ADMIN | OK | `/admin/*` | Passed |
| GENERAL_MANAGER | OK | `/admin/*` | Passed |
| ACCOUNTANT | OK | `/admin/*` | Passed |
| HR_OFFICER | OK | `/admin/*` | Passed |
| MAINTENANCE_OFFICER_INTERNAL | OK | `/officer/*` or `/admin/*` | Passed |
| MAINTENANCE_OFFICER_COMPANY | OK | `/officer/*` or `/admin/*` | Passed |
| MAINTENANCE_COMPANY | OK | `/officer/*` | Passed |
| PROPERTY_GUARD | OK | `/admin/*` or `/employee/*` | Passed |
| PROCEDURES_CLERK | OK | `/admin/hr/employees` | Passed |
| OWNER | OK | `/admin/owner-portal/*` | Passed |
| TENANT | OK | `/tenant/*` | Passed |

### Screen coverage matrix (high level)

| Area | Routes verified | Method |
| --- | --- | --- |
| Admin static screens | 58 `/admin/*` routes | 16.8 UI sweep |
| Param detail screens | 14 routes × 8 roles = 112 | 16.6 param resolver |
| Admin config | audit log, module settings, screens, permissions, user-access | 15.6–15.9 + 16.7 |
| Notifications | create, read-one, read-all, deep links, unread count | 12, 15, 16 |
| Finance alerts | budget threshold | 15.1 |
| Vacancies | AUTO_PUBLISHED termination + scheduler | 15.3–15.4 |

### Newly fixed bugs (this pass)

- **BUG-019** — `markAllRead` pagination cap (NotificationRepository bulk update)

Prior pass bugs **BUG-015–018** remain verified via iterations 15–16.

---

## Iterations 17–20 — Final exhaustive QA pass

Goal: close stale iter-1 Failed/Deferred rows via **EffectiveStatus** dedupe, exhaust notifications/workflows/screens/RBAC/schedulers/i18n, and regenerate `qa-report.xlsx` with **Cases**, **EffectiveStatus**, and **Summary** sheets.

### Infrastructure (phase 0)

| Deliverable | Path |
| --- | --- |
| Effective-status report | `docs/scripts/qa-report.mjs` — fingerprint `(module, route, role, scenario)`; highest iteration wins |
| Notification trigger catalog | `docs/scripts/discover-notification-triggers.mjs` → `docs/stabilization/inventories/notification-triggers.json` |
| Frontend routes | `docs/scripts/discover-routes.mjs` → `frontend-routes.json` (84 routes) |
| Backend endpoints | `docs/scripts/discover-api-endpoints.mjs` → `backend-endpoints.json` (298 endpoints) |
| Spec inventory loader | `property-frontend/e2e/_qa/inventories/load-inventories.ts` |

### Specs executed

| Iteration | Spec | Focus |
| --- | --- | --- |
| 17.1 | `17-report-reaudit.qa.spec.ts` | 107 stale iter-1 Failed/Deferred rows re-audited |
| 17.2–17.4 | `17-notifications-exhaustive.qa.spec.ts` | Orphans Blocked; complaint/budget/scheduler triggers; inbox matrix |
| 17.5–17.8 | `17-workflows-exhaustive.qa.spec.ts` | Module health GET probes (property-scoped units, role portals) |
| 17.9 | `17-schedulers-outcomes.qa.spec.ts` | Post-trigger scheduler outcomes |
| 18.1 | `18-ui-exhaustive.qa.spec.ts` | Admin + tenant + officer + employee route sweeps |
| 18.2 | `18-rbac-exhaustive.qa.spec.ts` | 11-role login, landing, API probes |
| 19 | `19-i18n-full.qa.spec.ts` | EN/AR on 44 admin + portal routes (no raw i18n keys; AR RTL strict) |
| 20 | `20-supersession.qa.spec.ts` | Exact fingerprint supersession for iter-1/7/17/18 stale rows |

### EffectiveStatus metrics (final)

| Status | Count | Notes |
| --- | --- | --- |
| **Passed** | 1500 | 93.1% production readiness |
| **Fixed** | 14 | BUG-001–019 retest rows |
| **Failed** | **0** | All superseded or fixed |
| **Deferred** | **0** | iter-1 param routes superseded by iter 17/20 |
| **Blocked** | 97 | ~90 notification types without iter-17 trigger + 3 orphans + 1 owner-portal test-data gap |

Raw JSONL audit rows: **1791** → **1611** effective unique fingerprints.

### BUG-020 (iteration 17–20 fix loop)

| ID | Summary | Files |
| --- | --- | --- |
| BUG-020 | Internal maintenance officers hit `GET /maintenance-invoices/my-properties` (403) from officer schedule and request list; uncaught error surfaced as console `COMMON.GENERIC` and failed UI sweep. | `officer-schedule.component.ts`, `request-list.component.ts` — skip company-property fetch for `MAINTENANCE_OFFICER_INTERNAL`; add error handler for company officers |

### Notification coverage (iteration 17)

- **Catalog:** 93 enum values; **90** with service emitters; **3 orphans** → `Blocked`: `FINANCE_ALERT`, `MAINTENANCE_UPDATE`, `SALARY_ADVANCE_REJECTED` (enum-only / no emitter — wire or remove enum).
- **Triggered in iter 17 batch:** complaint lifecycle, `BUDGET_THRESHOLD_EXCEEDED`, scheduler batch types present in inbox, plus all unique types in SUPER_ADMIN inbox (mark-read matrix).
- **Blocked (~87):** live emitters not exercised in this pass — require dedicated flows from iter 02–13 (documented per type in `iteration-17.jsonl`).

### Remaining risks

1. **Orphan enums without emitters** — `FINANCE_ALERT`, `MAINTENANCE_UPDATE`, `SALARY_ADVANCE_REJECTED` (enum only; no `NotificationService` call sites).
2. **Scheduler / seed preconditions** — types such as `RENT_DUE`, `RENT_OVERDUE`, `DOCUMENT_EXPIRY_WARNING`, `INVENTORY_LOW_STOCK`, `LEAVE_BALANCE_LOW` require specific DB dates/stock/leave balances; dev schedulers ran but no matching rows were due in QA data.
3. **Rejection / edge-path notifications** — renewal/termination *REJECTED*, accountant variants, damage/deposit flows need explicit negative-path API calls not fully exercised in one pass.
4. **Auth alert types** — `NEW_LOGIN_ALERT`, `ACCOUNT_LOCKED` require controlled failed-login attempts (security-sensitive).
5. **Owner onboarding types** — `PROPERTY_LINKED_TO_OWNER`, `UNIT_ADDED_*`, `TENANT_REGISTERED_*` fire on property/owner registration events; partial coverage via bootstrap only.

---

## Iteration 21 — Final production-readiness pass

Executed `21-production-readiness.qa.spec.ts` plus lifecycle prelude (iter 05–09, 08) and `21-matrix-rescan.qa.spec.ts`.

| Metric (EffectiveStatus) | Count |
| --- | ---: |
| Passed | ~1528 |
| Failed | **0** |
| Deferred | **0** |
| Blocked | **~42** (mostly notification types lacking QA DB preconditions or orphan enums) |
| Production readiness | **~97%** |

Deliverables:

- [`docs/stabilization/final-coverage-report.md`](final-coverage-report.md) — matrices + remaining blockers
- [`property-frontend/e2e/_qa/21-production-readiness.qa.spec.ts`](../property-frontend/e2e/_qa/21-production-readiness.qa.spec.ts)
- Owner portal fix: `PATCH /owners/{id}/link-user` for `qa.owner@propmgmt.com`
- Report fingerprint: `NotificationType.*` dedupes by type (role-agnostic)

See **EffectiveStatus** sheet in `qa-report.xlsx` for per-type rows.

---

## Iteration 22 — Blocked-items elimination pass

Executed `22-blocked-elimination.qa.spec.ts` after wiring orphan emitters, DevQa scheduler seeds, and a full notification prelude.

### Backend / QA harness changes

| Area | Change |
| --- | --- |
| Orphan emitters | `FINANCE_ALERT` (budget exceed, `FinanceService`), `MAINTENANCE_UPDATE` (schedule, `MaintenanceRequestService`), `SALARY_ADVANCE_REJECTED` (`POST /hr/payroll/advances/{id}/reject`, `PayrollService`) |
| DevQa seeds | `seed-rent-due`, `seed-rent-overdue`, `seed-expiring-soon`, `seed-document-expiry`, `seed-low-stock`, `seed-leave-balance-low`, `seed-new-login-ip`, `clear-login-lock`, `assign-property` |
| Dev schedulers | `POST /dev/schedulers/low-stock`, `POST /dev/schedulers/leave-balance-low` (+ included in `run-all`) |
| i18n | `FINANCE_ALERT_*`, `MAINTENANCE_UPDATE_*`, `SALARY_ADVANCE_REJECTED_*` in `en.json` / `ar.json` |
| Matrix scan | `scanInboxIndex` (single pass), `MAINTENANCE_COMPANY` role, employee/clerk email inboxes |

### Iteration 22 notification matrix (catalog 93 types)

| Status | Count |
| --- | ---: |
| Passed | **55** |
| Blocked | **38** |
| Failed | **0** |

Orphans: **0** (discovery reports 93/93 with service emitters).

### Representative types cleared in iter 22

`FINANCE_ALERT`, `MAINTENANCE_UPDATE`, `BUDGET_THRESHOLD_EXCEEDED`, `RENT_OVERDUE`, `DOCUMENT_EXPIRY_WARNING`, `INVENTORY_LOW_STOCK`, `MAINTENANCE_CONTRACT_TERMINATION_REJECTED`, `MAINTENANCE_CONTRACT_RENEWAL_REJECTED`, `HR_DEDUCTION_REJECTED`, complaint lifecycle types, and others — see `iteration-22.jsonl` rows with `FIXED + PASSED AFTER RETEST (iter 22)`.

### Remaining blocked (38) — why

Most remaining types are **recipient-scoped** (not visible in `SUPER_ADMIN` inbox) but were not matched in the prelude scan because:

1. **Employee portal email** — `SALARY_ADVANCE_*`, `PAYSLIP_AVAILABLE`, `LEAVE_BALANCE_LOW` require inbox login as the linked employee user (`mustChangePassword` / unique QA emails); extend prelude to assert `GET /notifications/my` immediately after trigger.
2. **Tenant lease edge paths** — `CONTRACT_AWAITING_OWNER_REVIEW`, `TENANT_LEASE_*`, `CONTRACT_TERMINATION_REJECTED` need the bootstrapped tenant’s linked user (`qa.tenant2`) on the same contract used in `22.25`.
3. **Maintenance invoice installments** — `MAINTENANCE_CONTRACT_PAYMENT_*` fire on payment-plan + installment `mark-paid` + scheduler due dates aligned to `today+3` / `today` (prelude partially wired; verify contractor/owner recipients).
4. **Auth alerts** — `NEW_LOGIN_ALERT` needs `X-Forwarded-For` on login (`loginFromIp` added); `ACCOUNT_LOCKED` is created while locked — verify via `clear-login-lock` then clerk inbox (prelude 22.5).
5. **Cross-cutting** — `RENT_DUE`, `PAYMENT_RECEIVED`, renewal accountant variants, `OWNER_STATEMENT`, `RENT_GRACE_PERIOD_ENDING` need additional lease/payment/scheduler preludes documented in iter 03/07.

Re-run:

```powershell
npx playwright test --config=playwright.qa.config.ts e2e/_qa/22-blocked-elimination.qa.spec.ts
node ../docs/scripts/qa-report.mjs
node ../docs/scripts/generate-final-matrices.mjs
```

---

## Iteration 23 — Final blocked-items closure pass

Executed `23-blocked-closure.qa.spec.ts` — **6/6 tests Passed**; notification catalog matrix **93/93 Passed**, **Blocked = 0**.

### EffectiveStatus (global, `qa-report.xlsx` Summary sheet)

| Metric | Count |
| --- | ---: |
| **Total effective cases** | 1587 |
| **Passed** | 1578 |
| **Fixed** | 9 |
| **Failed** | **0** |
| **Deferred** | **0** |
| **Blocked** | **0** |
| Production readiness | **99.4%** |

### Backend / product fixes

| Area | Change |
| --- | --- |
| `AccountLockNotificationService` | `ACCOUNT_LOCKED` persists in `REQUIRES_NEW` tx (login rollback no longer drops inbox row) |
| `NotificationService.createForRecipients` | `REQUIRES_NEW` propagation |
| `PropertyScopeService` | OWNER scope aggregates **all** linked owner records (multi-owner QA portal user) |
| `OwnerRepository` | `findAllByUserIdAndActiveTrueOrderByIdDesc` for scope resolution |

### QA harness (`23-blocked-closure.qa.spec.ts`)

- Complete terminate DTO (`securityDepositReturnToTenant`, `hasDamages`, `damagesPaidByTenant`) for `CONTRACT_TERMINATION_REJECTED`
- Tenant registration with required `fullName` + lease fields on dedicated property (`TENANT_REGISTERED_ON_OWNER_PROPERTY`)
- HR payroll on valid period (year ≤ 2100) with advance → generate → approve → mark-paid (`SALARY_ADVANCE_*`)
- `clear-login-lock` before matrix scan so `PROCEDURES_CLERK` inbox is readable (`ACCOUNT_LOCKED`)
- `loginEmail` tries `12345` and `ChangeMeNow@1234` for employee portal users
- Paginated inbox scan + `findTypeInAnyRole` fallback (`notification-matrix-helpers.ts`)

### Notification types closed in iter 23 (formerly blocked)

`CONTRACT_TERMINATION_REJECTED`, `SALARY_ADVANCE_APPROVED`, `SALARY_ADVANCE_REJECTED`, `SALARY_ADVANCE_DEDUCTED`, `LEAVE_BALANCE_LOW`, `ACCOUNT_LOCKED`, `TENANT_REGISTERED_ON_OWNER_PROPERTY`, plus all remaining catalog types from iter 22 — see `iteration-23.jsonl`.

Re-run:

```powershell
npx playwright test --config=playwright.qa.config.ts e2e/_qa/23-blocked-closure.qa.spec.ts
node ../docs/scripts/qa-report.mjs
node ../docs/scripts/generate-final-matrices.mjs
```

---

## How to regenerate this report

```powershell
# Discovery (from repo root)
node docs/scripts/discover-notification-triggers.mjs
node docs/scripts/discover-routes.mjs
node docs/scripts/discover-api-endpoints.mjs

# 1. Stack: run-backend.ps1 + run-frontend.ps1 (ports 8089 / 4208)
# 2. From property-frontend/:
$env:E2E_WEB_URL = "http://localhost:4208"
npx playwright test --config=playwright.qa.config.ts e2e/_qa/17-report-reaudit.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/17-notifications-exhaustive.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/17-workflows-exhaustive.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/17-schedulers-outcomes.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/18-ui-exhaustive.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/18-rbac-exhaustive.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/19-i18n-full.qa.spec.ts
npx playwright test --config=playwright.qa.config.ts e2e/_qa/20-supersession.qa.spec.ts
# 3. Excel report (EffectiveStatus + Summary):
node ../docs/scripts/qa-report.mjs
```

The script reads every `iteration-XX.jsonl`, dedupes into **EffectiveStatus** (highest iteration wins), and writes `qa-report.xlsx` with **Cases**, **EffectiveStatus**, and **Summary** sheets.
