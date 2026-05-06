## Authorization Policy Matrix

This matrix documents the stabilized policy after this sprint pass.

| Role | Endpoint | Action | Allowed/Denied | Notes |
|---|---|---|---|---|
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER | `GET /finance/dashboard` | View finance dashboard | Allowed | Read-only scope enforcement still applied in service. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER | `GET /finance/expenses` | View expenses | Allowed | Owner scope restricted by property ownership in service. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER | `GET /finance/revenues` | View revenues | Allowed | Owner scope restricted by property ownership in service. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `POST /finance/expenses` | Create expense | Allowed | OWNER removed to match service mutation policy. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `POST /finance/revenues` | Create revenue | Allowed | OWNER removed to match service mutation policy. |
| OWNER | `POST /finance/expenses`, `POST /finance/revenues` | Create finance entries | Denied | Consistent with `denyOwnerMutation(...)`. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER | `GET /accountant-portal/receipts` | List receipt queue | Allowed | OWNER can read only; scope still applies. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `PATCH /accountant-portal/receipts/{id}/review` | Approve/reject receipt | Allowed | OWNER denied at controller level now. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `POST /accountant-portal/renewal-requests/{id}/process` | Process renewal request | Allowed | OWNER denied at controller level now. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `PATCH /accountant-portal/maintenance-invoices/{id}/review` | Review invoice | Allowed | OWNER denied at controller level now. |
| SUPER_ADMIN, GENERAL_MANAGER, PROCEDURES_CLERK, ACCOUNTANT, OWNER | `GET /hr/leaves` | List leave requests | Allowed | Scoped by property in service for OWNER/ACCOUNTANT/PROCEDURES_CLERK. |
| SUPER_ADMIN, GENERAL_MANAGER, PROCEDURES_CLERK, ACCOUNTANT, OWNER | `GET /hr/leaves/balances` | View leave balances | Allowed | Scoped by property in service for non-global roles. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT | `GET /hr/payroll`, `GET /hr/payroll/{id}` | View payroll runs/details | Allowed | Scoped by property in service for ACCOUNTANT. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER, PROPERTY_GUARD, MAINTENANCE_OFFICER, MAINTENANCE_CONTRACTOR, TENANT | `GET /maintenance/requests/{id}` | View maintenance request details | Allowed | Endpoint now explicitly guarded; service still enforces record-level access. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, PROPERTY_GUARD, MAINTENANCE_OFFICER, MAINTENANCE_CONTRACTOR, TENANT | `POST /maintenance/requests` | Create maintenance request | Allowed | OWNER intentionally excluded to match service `denyOwnerMutation` for admin-side mutation. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, PROPERTY_GUARD, MAINTENANCE_OFFICER, MAINTENANCE_CONTRACTOR, TENANT | `PATCH /maintenance/requests/{id}/cancel` | Cancel maintenance request | Allowed | OWNER intentionally excluded to match service mutation policy. |
| SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT, OWNER | `GET /tenants/{id}`, `/tenants/by-user/{userId}`, `/tenants/by-unit/{unitId}` | Read tenant records | Allowed | Endpoint-level hardening added (previously authentication-only fallback). |

