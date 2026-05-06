## Endpoint Coverage Summary (Phase-2)

### Backend hardening coverage (this phase)

- Finance:
  - Controller/service alignment fixed for mutation endpoints.
  - OWNER removed from create expense/revenue endpoints to match service policy.

- Accountant portal:
  - Review/process endpoints now have explicit non-owner role guards.
  - Read endpoints preserved for compatibility.

- Tenant portal:
  - Status normalization and transition checks enforced for review flows.
  - Action type whitelist enforced (`RENEWAL`, `TERMINATION`).

- HR:
  - Leave and payroll scope controls strengthened at service/repository level.
  - Property-level filtering enforced for owner/accountant/procedures-clerk contexts.

- Maintenance:
  - Previously implicit/authenticated-only endpoints now have explicit `@PreAuthorize` guards for major read/write paths.

- Tenant records:
  - Read endpoints (`/tenants/{id}`, `/by-user`, `/by-unit`) now explicitly role-guarded.

### Frontend coverage (this phase)

- Active role UX:
  - Role switch now refreshes permissions without hard page reload.
  - Permission management screen checks assigned roles explicitly.

- Route hardening:
  - Added missing guard to officer invoices route.
  - Added missing tenant receipts route and guard.
  - Guarded sensitive admin subroutes in prior pass and kept in this phase.

### Coverage status

- DONE: high-risk authorization mismatches and role-switch inconsistencies.
- PARTIAL: full endpoint-by-endpoint matrix for all backend controllers (large surface) still needs final complete extraction automation.
- PARTIAL: deep status transition normalization for every entity in all modules (contract/payment/maintenance variants) not fully centralized yet.

