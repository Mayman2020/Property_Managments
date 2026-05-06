## DB Cleanup Candidate Report

No table drops were performed in this pass.

| Table | Related Module | Usage Found | Recommendation |
|---|---|---|---|
| `notification_templates` | Legacy notification template stack | No active runtime usage seen | Deprecate now, drop later via Flyway after observation window. |
| `contract_fees` | Contract fee stack | Inconsistent usage (frontend/backend mismatch) | Keep for now until feature decision, then drop/migrate via Flyway. |
| `vendors` | Vendor module | Backend present, frontend usage unclear | Keep; verify external/API usage before deprecation. |
| `petty_cash_*` | Petty cash | Already dropped in prior migration | No action. |
| `unit_inspections` / old violations tables | Inspection legacy | Already dropped in prior migration | No action. |

Rollback/backup notes:
- Future drops must include full DB backup, migration rollback notes, and consumer-impact check.
- Use Flyway only, never manual runtime table deletion.

