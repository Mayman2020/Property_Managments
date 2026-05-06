## Status Transition Matrix

This pass locked high-risk free-text status handling in tenant/accountant review flows.

| Domain | Entity | Allowed Input | Allowed Transition | Enforced Layer |
|---|---|---|---|---|
| Tenant portal receipts | `RentReceipt.status` | `APPROVED`, `REJECTED` | `PENDING -> APPROVED/REJECTED` only | `TenantPortalService`, `AccountantPortalService` |
| Contract action requests (review) | `ContractActionRequest.status` | `APPROVED`, `REJECTED` | `PENDING -> APPROVED/REJECTED` only | `TenantPortalService` |
| Contract action requests (create) | `ContractActionRequest.actionType` | `RENEWAL`, `TERMINATION` | Creation blocked for other values | `TenantPortalService` |

Already enforced elsewhere:
- Payroll: `SUBMITTED -> APPROVED -> PAID` (existing backend logic).
- Leave: `PENDING -> APPROVED/REJECTED` (existing backend logic).

