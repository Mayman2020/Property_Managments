# Backend Module Structure Review

Date: 2026-05-10

Scope reviewed:

`property-backend/src/main/java/com/propertymanagement/modules`

Also reviewed because they affect module dependencies:

- `property-backend/src/main/java/com/propertymanagement/shared`
- `property-backend/src/main/java/com/propertymanagement/config`
- `property-backend/src/main/resources/db/migration`
- `property-frontend/src/app/core/constants/app-constants.ts`
- frontend service usages under `property-frontend/src/app/core/services`

No code cleanup or package move was performed in this review.

## Dependency Report

### Current Modules

The current backend modules are:

`audit`, `auth`, `complaint`, `contract`, `contractor`, `dashboard`, `files`, `finance`, `hr`, `inventory`, `lookup`, `maintenance`, `moduleconfig`, `notification`, `owner`, `ownerportal`, `permission`, `property`, `tenant`, `tenantportal`, `unit`, `user`, `vacancy`, `vendor`.

There is also a shared package outside `modules`:

`com.propertymanagement.shared`

This means `shared` is not currently a module folder under `modules`; it is a cross-cutting package for response, exception, i18n, persistence converters, and security helpers.

### High-Level Dependencies

- `dashboard` depends on `contract`, `maintenance`, `property`, and `unit` for summary metrics.
- `auth` depends on `user`, `tenant`, and `owner` to enrich login/profile behavior.
- `tenant` depends on `contract`, `maintenance`, `tenantportal`, `notification`, `property`, `unit`, and `user`.
- `tenantportal` depends on `tenant`, `user`, `contract`, `owner`, `maintenance.invoice`, and `notification`.
- `ownerportal` depends on `owner`, `property`, `unit`, `contract`, `tenant`, and `user`.
- `contract` depends on `owner`, `tenant`, `property`, `unit`, `notification`, and `user`.
- `maintenance` depends on `contractor`, `owner`, `property`, `tenant`, `unit`, `user`, and `notification`.
- `finance` depends on `owner`, `ownerportal`, `property`, `contract.payment`, and HR/expense/revenue subdomains.
- `shared.security` depends on `user`, `owner`, and `property` for auth scope checks.

These dependencies are expected for this application. They do not prove duplication by themselves.

### Frontend API References

The frontend still calls these backend API groups:

- `/tenant-portal/*` via `tenant-portal.service.ts`
- `/accountant-portal/*` via `accountant-portal.service.ts`, `maintenance-invoice.service.ts`, and accountant screens
- `/owner-portal/*` via `owner-portal.service.ts` and maintenance/contract owner approval flows
- `/contracts/*`, `/contract-templates/*`, `/payments/*`, `/payment-schedule/*`, `/contract-fees/*`
- `/maintenance/requests/*`, `/maintenance-contracts/*`, `/maintenance-invoices/*`, `/maintenance-companies/*`
- `/contractor-companies/*`
- `/vendors/*`

Because these endpoints are referenced from frontend constants/services, controllers must not be moved in a way that changes paths.

### Flyway/Migration References

The migrations create and evolve tables for all major modules, including:

- `contractor_companies`: `V17`, later audit/contract field migrations.
- `vendors`: `V41`, `V57`, `V131`.
- `rent_receipts` and `contract_action_requests`: `V61`.
- `lease_contracts`, `rent_payments`, `contract_renewals`, `rent_payment_schedule`: `V30`, `V31`, `V32`, `V117`, `V118`.
- `maintenance_requests`, `visit_reports`, `maintenance_providers`, `property_maintenance_assignments`, `maintenance_contracts`, `maintenance_invoices`, `maintenance_contract_invoices`: `V6`, `V8`, `V75`, `V76`, `V77`, `V78`, `V63`.
- `owner_statements` and owner portal support: `V48`.
- `property_module_settings`, `module_definitions`, `module_presets`: `V53`, `V54`.

No schema removal is recommended.

## Module Decisions

| Module | Responsibility | Decision | Risk | Exact affected files |
|---|---|---:|---:|---|
| `audit` | Audit log storage and filtering. | Keep | Low | `modules/audit/*` |
| `auth` | Login, refresh, user details loading. | Keep | Medium | `modules/auth/AuthController.java`, `AuthService.java`, `UserDetailsServiceImpl.java` |
| `complaint` | Tenant complaints and complaint lifecycle. | Keep | Low | `modules/complaint/*` |
| `contract` | Lease contracts, fees, payment schedules, payments, renewals, templates, owner contract approval, contract scheduler. | Keep, internally organize only | High | `modules/contract/**` |
| `contractor` | Maintenance contractor company identity and contractor-company API. | Keep separate from `vendor` | Medium | `modules/contractor/**` |
| `dashboard` | Read-only reporting/summary facade across modules. | Keep | Low | `modules/dashboard/*` |
| `files` | File upload/download endpoint. | Keep | Medium | `modules/files/FileUploadController.java` |
| `finance` | Expenses, revenues, budgets, financial reports, owner statements/reporting links. | Keep; large but valid | Medium | `modules/finance/**` |
| `hr` | Employees, attendance, leaves, payroll, payslips, advances, bonuses. | Keep; large but valid | Medium | `modules/hr/**` |
| `inventory` | Inventory items and stock transactions. | Keep | Low | `modules/inventory/**` |
| `lookup` | Generic configurable lookup values. | Keep | Low | `modules/lookup/**` |
| `maintenance` | Maintenance requests, categories, visits, ratings, assignments, maintenance contracts, companies, invoices. Shared by admin, tenant, officer, company, accountant, and owner flows. | Keep; internally organize only | High | `modules/maintenance/**` |
| `moduleconfig` | Property module settings and module catalog/presets. | Keep | Low | `modules/moduleconfig/**` |
| `notification` | Notification entities, templates, sending, reading. | Keep | Medium | `modules/notification/**` |
| `owner` | Owner master data and owner/user/property access. | Keep separate from `ownerportal` | Medium | `modules/owner/**` |
| `ownerportal` | Owner-facing dashboard, statements, properties, draft contract decisions. | Keep separate from `owner` | Medium | `modules/ownerportal/**` |
| `permission` | Role permissions and screen settings. | Keep | Medium | `modules/permission/**` |
| `property` | Property master data, floors, property attachments, owner portal recipient lookup. | Keep | High | `modules/property/**` |
| `tenant` | Tenant master data, tenant onboarding, tenant welcome/dashboard projection. | Keep separate from `tenantportal` | High | `modules/tenant/**` |
| `tenantportal` | Tenant portal APIs plus currently accountant portal receipt/renewal review APIs. | Split accountant classes later; no logic change now | High | `modules/tenantportal/**` |
| `unit` | Unit master data and rental status. | Keep | High | `modules/unit/**` |
| `user` | Users, roles, profile, property access, portal profile bridge. | Keep | High | `modules/user/**` |
| `vacancy` | Vacancy listings and rental inquiries. | Keep | Low | `modules/vacancy/**` |
| `vendor` | Vendor master data for general finance/procurement usage. | Keep separate from `contractor` | Medium | `modules/vendor/**` |
| `shared` | Cross-cutting response, exception, i18n, persistence converters, JWT/security helpers. | Keep outside modules | High | `shared/**` |

## Findings

### 1. Truly Duplicated Responsibility

No module is proven to be a full duplicate of another module.

The closest overlaps are:

- `contractor` vs `vendor`: similar CRUD shape, different business meaning.
- `tenantportal` includes `AccountantPortalController` and `AccountantPortalService`, which is a package-placement issue, not duplicate logic.
- `/owner-portal` endpoints are implemented in both `ownerportal` and selected contract/maintenance classes. This is an endpoint grouping concern, not a duplicated domain.

No class, repository, DTO, entity, endpoint, or migration should be deleted based on the current evidence.

### 2. Large But Valid Modules

These modules are large because their business domains are large:

- `contract`
- `maintenance`
- `finance`
- `hr`
- `tenant`
- `user`
- `property`

They should not be merged into other modules. If cleaned later, the right move is internal subpackage organization, not domain relocation.

### 3. Modules That Should Stay Separate

These represent different business domains and should remain separate:

- `property` vs `unit`: property owns buildings/floors/attachments; unit owns rentable spaces/status.
- `tenant` vs `tenantportal`: tenant is master data/onboarding; tenantportal is tenant-facing workflow/API.
- `owner` vs `ownerportal`: owner is master data/access; ownerportal is owner-facing reporting and decisions.
- `contract` vs `maintenance`: rental contracts and maintenance operations are distinct, even though maintenance contracts exist.
- `finance` vs `contract.payment`: finance reports money; contract payment owns rent schedule/payment lifecycle.
- `permission` vs `moduleconfig`: permissions are user/role/screen access; moduleconfig is property feature availability.
- `notification` should stay cross-domain because many modules emit notifications.
- `audit` should stay cross-domain because it tracks activity across modules.

### 4. Contractor vs Vendor

`contractor` and `vendor` should remain separate.

`contractor` files:

- `modules/contractor/ContractorCompany.java`
- `modules/contractor/ContractorCompanyController.java`
- `modules/contractor/ContractorCompanyRepository.java`
- `modules/contractor/ContractorCompanyService.java`
- `modules/contractor/dto/ContractorCompanyRequest.java`
- `modules/contractor/dto/ContractorCompanyResponse.java`

`contractor` is referenced by maintenance assignment, maintenance invoice, and maintenance contract invoice logic:

- `modules/maintenance/assignment/MaintenanceAssignmentService.java`
- `modules/maintenance/invoice/MaintenanceInvoiceService.java`
- `modules/maintenance/contractinvoice/MaintenanceContractInvoiceService.java`
- `modules/user/UserController.java` through contractor-assignable users and maintenance roles

`vendor` files:

- `modules/vendor/Vendor.java`
- `modules/vendor/VendorController.java`
- `modules/vendor/VendorRepository.java`
- `modules/vendor/VendorService.java`
- `modules/vendor/dto/VendorRequest.java`
- `modules/vendor/dto/VendorResponse.java`

`vendor` is a general supplier/vendor directory. Its migrations include property linkage and bilingual names. It is not currently a maintenance assignment provider.

Decision: keep both. Do not merge without a business migration plan.

### 5. Tenantportal Contains Accountant Logic

Yes. `tenantportal` currently contains accountant-facing classes:

- `modules/tenantportal/AccountantPortalController.java`
- `modules/tenantportal/AccountantPortalService.java`
- `modules/tenantportal/ReceiptWithTenantDto.java`
- `modules/tenantportal/RenewalRequestWithDetailsDto.java`

It also contains tenant-facing and shared receipt/request classes:

- `TenantPortalController.java`
- `TenantPortalService.java`
- `RentReceipt.java`
- `RentReceiptRepository.java`
- `ContractActionRequest.java`
- `ContractActionRequestRepository.java`
- `dto/ReceiptResponse.java`
- `dto/ReviewReceiptDto.java`
- `dto/StaffUploadReceiptRequest.java`
- `dto/UploadReceiptRequest.java`
- `dto/ContractActionRequestDto.java`
- `dto/ActionRequestResponse.java`

Recommended target:

```text
modules/
  tenantportal/
    TenantPortalController
    TenantPortalService
    ContractActionRequest
    ContractActionRequestRepository
    RentReceipt
    RentReceiptRepository
    dto/
  accountantportal/
    AccountantPortalController
    AccountantPortalService
    dto/
      ReceiptWithTenantDto
      RenewalRequestWithDetailsDto
```

Important: splitting package names must not change API paths:

- Keep `/tenant-portal/*`
- Keep `/accountant-portal/*`

Risk: high, because package moves affect imports, tests, and any Spring component scanning assumptions. This should be Phase 3 only.

### 6. Ownerportal vs Owner

`owner` should remain separate from `ownerportal`.

`owner` owns owner master data and access:

- `Owner.java`
- `OwnerController.java`
- `OwnerService.java`
- `OwnerRepository.java`
- `OwnerPropertyAccessService.java`
- owner DTOs

`ownerportal` owns owner-facing experience:

- `OwnerPortalController.java`
- `OwnerPortalService.java`
- `OwnerPortalDraftContractService.java`
- `OwnerStatement.java`
- `OwnerStatementRepository.java`
- owner portal DTOs

Decision: keep separate.

Note: Some `/owner-portal` endpoints currently live in:

- `modules/contract/lease/OwnerApprovalController.java`
- `modules/maintenance/contract/MaintenanceContractController.java`

This is acceptable because those endpoints are decisions on contract/maintenance-contract aggregates. Moving only the controller facade into `ownerportal` could be considered later, but the domain logic should remain with `contract` and `maintenance`.

### 7. Contract Module

`contract` is large but valid. It already has internal subpackages:

- `fee`
- `lease`
- `payment`
- `renewal`
- `scheduler`
- `template`

Decision: do not move it into another module. Any cleanup should be internal:

```text
modules/contract/
  lease/
  approval/
  payment/
  renewal/
  fee/
  template/
  scheduler/
```

Possible future move:

- Move `OwnerApprovalController.java` and `OwnerApprovalService.java` from `lease` to `contract.approval`.

Risk: medium/high. It is compile-safe if imports are updated, but should be done only after tests are available.

Do not touch API paths:

- `/contracts/*`
- `/owner-portal/pending-approvals`
- `/owner-portal/contracts/{contractId}/decision`
- `/owner-portal/contracts/{contractId}/termination-decision`
- `/owner-portal/contracts/{contractId}/renewal-decision`

### 8. Maintenance Module

`maintenance` is shared across admin, tenant, officer, maintenance company, accountant, and owner flows. It should remain a shared business module.

Current internal areas:

- `request`: maintenance request lifecycle
- `visit`: visit reports
- `rating`: visit ratings
- `category`: maintenance categories
- `assignment`: provider/contractor assignment and property maintenance assignment
- `company`: maintenance company endpoint facade
- `contract`: maintenance contract lifecycle
- `invoice`: request/job maintenance invoice
- `contractinvoice`: recurring maintenance contract invoices

Decision: keep as one module with internal subpackages.

Do not move maintenance classes under admin, tenant, or officer modules. Those are UI roles, not backend business domains.

Potential future internal cleanup:

```text
modules/maintenance/
  request/
  visit/
  rating/
  category/
  provider/
  assignment/
  contract/
  invoice/
    requestinvoice/
    contractinvoice/
```

Risk: high because frontend consumes many endpoint groups and flows.

### 9. Dead Packages / Classes

No dead backend package/class was proven in this pass.

Reason:

- Controllers are mapped to active API paths.
- Repositories are injected into services or used by tests/migrations.
- Entities map to migrated tables.
- Services are used by controllers, other services, schedulers, or tests.
- Frontend constants/services still reference tenant portal, accountant portal, owner portal, contract, maintenance, vendor, and contractor endpoints.
- Tests exist for contract, owner approval, rent payment, HR payroll, inventory, maintenance request, notification, and tenant onboarding.

Do not delete:

- `RentReceipt`, `RentReceiptRepository`, and receipt DTOs. They are still used by `TenantPortalService`, `AccountantPortalService`, accountant receipt review, and staff upload flow.
- `ContractActionRequest` and repository. They are used by tenant contract requests and accountant renewal processing.
- `Vendor` module. It has its own API and migrations.
- `ContractorCompany` module. It is linked to maintenance assignment/invoice flows.
- `OwnerApprovalController` under `contract.lease`. It exposes owner portal contract approval endpoints.
- Maintenance owner-portal endpoints under `MaintenanceContractController`. They expose owner decisions for maintenance contracts.

## Suggested Target Structure

This is the recommended long-term structure. It is not a request to move files immediately.

```text
com.propertymanagement
  config/
  shared/
    exception/
    i18n/
    persistence/
    response/
    security/
  modules/
    audit/
    auth/
    complaint/
    contract/
      lease/
      approval/
      payment/
      renewal/
      fee/
      template/
      scheduler/
    contractor/
    dashboard/
    files/
    finance/
      expense/
      revenue/
      budget/
      reporting/
    hr/
      employee/
      attendance/
      leave/
      payroll/
    inventory/
    lookup/
    maintenance/
      request/
      visit/
      rating/
      category/
      assignment/
      provider/
      contract/
      invoice/
    moduleconfig/
    notification/
    owner/
    ownerportal/
    accountantportal/
    permission/
    property/
      attachment/
      floor/
    tenant/
    tenantportal/
    unit/
    user/
    vacancy/
    vendor/
```

## What Must NOT Be Touched

- API endpoint paths and response/request DTO shape.
- Flyway migrations and database schema.
- Entity table names.
- Existing notification behavior and notification types.
- Security/auth filters and permission guards.
- Shared response envelope `ApiResponse`.
- `shared.security` behavior around JWT and property access.
- Cross-role maintenance request lifecycle.
- Tenant/accountant rent receipt compatibility until the UI/backend are fully unified around `rent_payment_schedule`.
- Owner portal approval URLs consumed by frontend.

## Safe Refactor Phases

### Phase 1: Documentation Only

Status: done by this report.

Actions:

- Keep current code as-is.
- Record current module responsibilities and risk levels.
- Use this report as the baseline before any package move.

### Phase 2: Move Only Obviously Misplaced Classes

Only candidates after compile/test setup works:

- Move `modules/contract/lease/OwnerApprovalController.java` and `OwnerApprovalService.java` to `modules/contract/approval`.
- Optionally move `modules/property/Floor*.java` into `modules/property/floor` if imports are updated.

Rules:

- No endpoint path changes.
- No DTO field changes.
- No entity/table changes.
- Run compile and tests after each small move.

### Phase 3: Optional Package Split, Compile-Safe Only

Candidate:

- Create `modules/accountantportal`.
- Move only accountant portal classes out of `tenantportal`:
  - `AccountantPortalController.java`
  - `AccountantPortalService.java`
  - `ReceiptWithTenantDto.java`
  - `RenewalRequestWithDetailsDto.java`

Keep shared receipt/request entities in `tenantportal` unless a separate neutral package is introduced with a clear name like `rentreceipt` or `portalreceipt`.

Rules:

- Keep `/accountant-portal/*`.
- Keep `/tenant-portal/*`.
- Update imports only.
- Run compile and tests.
- Do not change frontend API constants.

### Phase 4: Remove Dead Code Only After Reference Proof

Nothing is approved for removal now.

Removal proof must include:

- `rg` shows no Java references.
- No controller endpoint path uses it.
- No service/repository/scheduler/listener/security config references it.
- No test references it.
- No migration creates/evolves the table/entity being removed, or a migration plan is documented.
- No frontend constants/services call the endpoint.
- Compile and tests pass after removal.

## Recommended Next Action

Before any actual refactor, fix local Java toolchain so verification can run:

```powershell
cd property-backend
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd test
```

Current environment note: Maven wrapper exists, but compile cannot run until `JAVA_HOME` is configured.
