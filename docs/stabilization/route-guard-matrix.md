## Route Guard Matrix

| Route | Guard | Expected Active Role | Status |
|---|---|---|---|
| `/admin/**` | `authGuard` + feature route guards | Admin-family active role | Existing |
| `/admin/owner-portal/**` | `moduleGuard` + `ownerGuard` | `OWNER` | Existing |
| `/admin/owner-portal/contract-approvals` | `moduleGuard` + `ownerGuard` | `OWNER` | Fixed in this pass |
| `/admin/accountant-portal/**` | `permissionGuard` (`contracts:view`) | `ACCOUNTANT` (or admin with permission) | Fixed in this pass |
| `/tenant/**` | `tenantGuard` + per-route `permissionGuard` | `TENANT` active role | Existing |
| `/tenant/rent-receipts` | `permissionGuard` (`my_unit:view`) | `TENANT` | Added in this pass (broken link fixed) |
| `/officer/**` | `officerGuard` + route-level guards | `MAINTENANCE_OFFICER` / `MAINTENANCE_CONTRACTOR` | Existing |

Notes:
- UI menu visibility and route access are now closer, especially for accountant/owner sensitive paths.
- Remaining hardening should continue endpoint-by-endpoint for all admin child routes.

