## Final Residual Risk Report (Current Phase-2 State)

### DONE

- Authorization consistency improved for key finance/accountant/maintenance/tenant endpoints.
- Active-role behavior improved in UI (permission refresh without reload).
- Sensitive route guard coverage improved (admin/officer/tenant hotspots).
- Critical status transition locks added for receipt/action-review workflows.
- HR/payroll property scope filtering strengthened.
- Stabilization docs produced under `docs/stabilization/`.

### PARTIALLY DONE

- Full controller-by-controller authorization matrix for every endpoint is partially documented; more exhaustive extraction still pending.
- Full status-transition normalization across all workflow entities is partial (major flows done; some legacy flows still string-based).
- Dead-code cleanup executed as report-first only; hard deletions deferred intentionally.
- Automated tests for all critical boundaries are not fully added/executed in this phase.

### NOT DONE

- Full backend compile/test execution blocked by missing `JAVA_HOME` in local environment.
- Frontend production build still blocked by pre-existing Angular budget constraints (SCSS budget overflow in property-form and global bundle budget).
- Legacy module removals (vendor/contract fee/notification templates) not executed yet by design.

### KNOWN RISKS

1. Some backend modules may still contain implicit auth behavior where method-level `@PreAuthorize` is not exhaustive.
2. String-status persistence exists in multiple aggregates and can still drift without unified transition utility.
3. Build pipeline red status may mask runtime regressions until environment blockers are fixed.

### SAFE CLEANUP CANDIDATES

- `assets/i18n/ar-part1.json` (appears unused by current loader).
- stale petty-cash translation keys.
- legacy tenant contract UI fragments superseded by `my-contracts`.
- notification template legacy stack (after usage telemetry window).

### HIGH-RISK AREAS

- Contract/payment lifecycle transitions across mixed legacy/new code paths.
- Multi-role UX where legacy components may still assume assigned roles rather than active role context.
- Owner/accountant permission overlaps in older portal endpoints.

### Remaining legacy dependencies

- `canvg/html2canvas/jspdf` commonjs warnings in frontend build path.
- older status string fields in tenant portal entities and selected workflows.

### Modules requiring manual QA

- Contracts: draft/approval/amend/reject/renewal/termination.
- Tenant receipts and accountant review.
- Maintenance request lifecycle with role switching.
- HR leaves and payroll visibility by owner/accountant scope.
- Owner portal and accountant portal deep-linked routes.

