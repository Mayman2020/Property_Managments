# Full Feature Structure Review
**Generated:** 2026-05-10  
**Project:** Property Management System  
**Backend:** `property-backend` (Spring Boot 3.2.5 / Java 17)  
**Frontend:** `property-frontend` (Angular 17, standalone components)

---

## 1. Current Backend Modules List

| Module Path | Sub-Modules / Notes |
|---|---|
| `modules/audit` | controller, entity, repository, service — **CLEAN** |
| `modules/auth` | dto — controller/service at module root — **MIXED** |
| `modules/complaint` | dto — all classes at module root — **FLAT** |
| `modules/contract/fee` | dto — entity/repo/service at sub-root, no controller — **MIXED + MISSING CONTROLLER** |
| `modules/contract/lease` | dto — entity/repo/service/controller at sub-root — **MIXED** |
| `modules/contract/payment` | dto — entity/repo/service/controller at sub-root — **MIXED** |
| `modules/contract/renewal` | dto — entity/repo/service at sub-root, no controller — **MIXED + MISSING CONTROLLER** |
| `modules/contract/scheduler` | background job at sub-root — OK (no http layer needed) |
| `modules/contract/template` | dto — entity/repo/service/controller at sub-root — **MIXED** |
| `modules/contractor` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/dashboard` | controller, dto, service — **CLEAN** |
| `modules/files` | controller — **CLEAN** (file upload, no entity needed) |
| `modules/finance` | FinanceController/Service at module root + sub-modules — **MIXED** |
| `modules/finance/budget` | dto — entity/repo at sub-root — **MIXED** |
| `modules/finance/expense` | dto — entity/repo at sub-root — **MIXED** |
| `modules/finance/revenue` | dto — entity/repo at sub-root — **MIXED** |
| `modules/hr/attendance` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/hr/employee` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/hr/leave` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/hr/payroll` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/inventory` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/lookup` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/maintenance/assignment` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/maintenance/category` | entity/controller/repo/service at sub-root (no dto folder) — **MIXED** |
| `modules/maintenance/company` | only controller, delegates to ContractorCompanyService — **THIN ALIAS** |
| `modules/maintenance/contract` | dto — controller/service at sub-root, shares entity with assignment — **MIXED** |
| `modules/maintenance/contractinvoice` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/maintenance/invoice` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/maintenance/rating` | mixed DTOs and classes at root, no controller — **FLAT + MISSING CONTROLLER** |
| `modules/maintenance/request` | dto — entity/controller/repo/service at sub-root — **MIXED** |
| `modules/maintenance/visit` | dto — entity/repo at sub-root, no controller — **MIXED** |
| `modules/moduleconfig` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/notification` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/owner` | dto — entity/controller/repo/service at module root — **FLAT** |
| `modules/ownerportal` | dto — controller/service/entity at module root — **FLAT** |
| `modules/permission` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/property` | dto — entity/controller/repo/service at module root, Floor also flat — **FLAT** |
| `modules/property/attachment` | entity/controller/repo/service at sub-root — **MIXED** |
| `modules/tenant` | dto — entity/controller/repo/service at module root — **FLAT** |
| `modules/tenantportal` | dto — controller/service/entity at module root + **AccountantPortalController misplaced here** — **FLAT + MISPLACED** |
| `modules/unit` | dto — entity/controller/repo/service at module root — **FLAT** |
| `modules/user` | dto — entity/controller/repo/service at module root — **FLAT** |
| `modules/vacancy` | controller, dto, entity, repository, service — **CLEAN** |
| `modules/vendor` | controller, dto, entity, repository, service — **CLEAN** |

---

## 2. Current Frontend Features List

| Feature Folder | Screen Components | Notes |
|---|---|---|
| `features/accountant` | maintenance-invoices, process-renewal-dialog, renewal-requests, rent-confirmation, review-dialog, staff-upload-receipt-dialog | **PARTIALLY ORGANIZED** |
| `features/admin` | admin.routes.ts only | Routes file, screens loaded from other features |
| `features/audit` | audit-log.component (flat) | **FLAT** |
| `features/auth` | login/ — login.component | **CLEAN** |
| `features/change-password` | change-password.component (flat) | **FLAT** |
| `features/contractors` | contractor-companies, contractor-company-dialog (both flat) | **FLAT** |
| `features/contracts` | cancel-draft-contract-dialog, complaints-list, contract-detail, contract-dialog, contract-form, contract-list, contract-renewal-form, contracts-dashboard, contract-templates, record-payment-form, terminate-contract-dialog | **PARTIALLY ORGANIZED** |
| `features/dashboard` | dashboard.component (flat) | **FLAT** |
| `features/finance` | expense-dialog, finance-reports, finance-workspace, revenue-dialog (all flat) + overdue-payments/ | **MIXED** |
| `features/home-portal` | home-portal.component (flat) | **FLAT** |
| `features/hr` | employee-dialog, hr-workspace (both flat) | **FLAT** |
| `features/inventory` | inventory-item-dialog (flat) + inventory-list/ | **MIXED** |
| `features/lookups` | classification-dialog, lookup-dialog, lookup-management (all flat) | **FLAT** |
| `features/maintenance` | maintenance-request-dialog, request-timeline-dialog (flat) + request-detail/, request-form/, request-list/, visit-report-form/ | **MIXED** |
| `features/notifications` | notifications-page.component (flat) | **FLAT** |
| `features/officer` | company-queue/, invoice-portal/, officer-schedule/ + officer.routes.ts | **MOSTLY CLEAN** |
| `features/owner` | contract-approvals/ + owner-decision-dialog/, owner-draft-amend-dialog, owner-draft-reject-dialog, owner-renewal-decision-dialog, owner-termination-decision-dialog (mixed) | **MIXED** |
| `features/owner-portal` | owner-portal-workspace.component (flat) | **FLAT** |
| `features/owners` | owner-dialog, owner-link-user-dialog, owners-management (all flat) | **FLAT** |
| `features/permissions` | module-management, permission-management, screen-management (all flat) | **FLAT** |
| `features/profile` | profile.component (flat) | **FLAT** |
| `features/properties` | property-form/, property-list/ | **CLEAN** |
| `features/ratings` | ratings-dashboard.component (flat) | **FLAT** |
| `features/reports` | reports-dashboard.component (flat) | **FLAT** |
| `features/tenant` | contract-request/, my-contracts/, payment-proof-dialog/, rent-receipts/, submit-complaint/, tenant-contract-detail/, tenant-dashboard/ + tenant.routes.ts | **MOSTLY CLEAN** |
| `features/tenants` | tenant-dialog, tenant-edit-dialog, tenant-management (all flat) | **FLAT** |
| `features/units` | unit-dialog, unit-management (both flat) | **FLAT** |
| `features/users` | user-dialog, user-management, user-access-management (all flat) | **FLAT** |
| `features/vacancies` | vacancy-workspace.component (flat) | **FLAT** |

**Core Services (all in `core/services/`):**
`accountant-portal.service.ts`, `api.service.ts`, `audit.service.ts`, `auth.service.ts`,
`complaint.service.ts`, `contract.service.ts`, `contractor-company.service.ts`, `dashboard.service.ts`,
`delete-confirm.service.ts`, `finance.service.ts`, `floor.service.ts`, `hr.service.ts`,
`hr-employee.service.ts`, `inventory.service.ts`, `loading.service.ts`, `lookup.service.ts`,
`lookup-cache.service.ts`, `maintenance.service.ts`, `maintenance-assignment.service.ts`,
`maintenance-contract.service.ts`, `maintenance-contract-invoice.service.ts`, `maintenance-invoice.service.ts`,
`navigation-history.service.ts`, `notification.service.ts`, `owner.service.ts`, `owner-portal.service.ts`,
`payment.service.ts`, `permission.service.ts`, `property.service.ts`, `property-attachment.service.ts`,
`scoped-property.service.ts`, `snack.service.ts`, `tenant.service.ts`, `tenant-portal.service.ts`,
`theme.service.ts`, `unit.service.ts`, `user.service.ts`, `user-profile.service.ts`, `vacancy.service.ts`

---

## 3. Screen-by-Screen Analysis

### AUTH
| Field | Value |
|---|---|
| Route | `/auth/login` |
| Frontend folder | `features/auth/login/` |
| Component | `login.component.ts` |
| Frontend service | `core/services/auth.service.ts` |
| Backend controller | `modules/auth/AuthController.java` (at module root — misplaced) |
| Backend service | `modules/auth/AuthService.java` (at module root — misplaced) |
| DTOs | `modules/auth/dto/LoginRequest, LoginResponse, RefreshTokenRequest` |
| Entity | Shared with `User` module |
| Repository | Shared `UserRepository` |
| DB tables | `users`, `user_extra_roles`, `user_property_access` |

### DASHBOARD (Admin)
| Field | Value |
|---|---|
| Route | `/admin/dashboard` |
| Frontend folder | `features/dashboard/` (flat — no sub-folder) |
| Component | `dashboard.component.ts` |
| Frontend service | `core/services/dashboard.service.ts` |
| Backend controller | `modules/dashboard/controller/DashboardController.java` ✓ |
| Backend service | `modules/dashboard/service/DashboardService.java` ✓ |
| DTOs | `ChartDataPointDTO, DashboardStatsResponseDTO` ✓ |
| Entity | None (aggregate query) |
| Repository | None (delegates to other repos) |

### PROPERTIES
| Field | Value |
|---|---|
| Route | `/admin/properties` |
| Frontend folder | `features/properties/property-list/`, `features/properties/property-form/` ✓ |
| Component | `property-list.component.ts`, `property-form.component.ts` |
| Frontend service | `core/services/property.service.ts`, `core/services/property-attachment.service.ts`, `core/services/floor.service.ts` |
| Backend controller | `modules/property/PropertyController.java` (at module root — misplaced), `FloorController.java` (at module root) |
| Backend service | `modules/property/PropertyService.java` (at module root), `FloorService.java` (at module root) |
| Repository | `PropertyRepository.java` (at module root), `FloorRepository.java` (at module root) |
| Entity | `Property.java` (at module root), `Floor.java` (at module root), `PropertyType.java` (enum at root) |
| DTOs | `modules/property/dto/PropertyRequest, PropertyResponse, FloorRequest, FloorResponse` ✓ |
| Attachment sub-module | `property/attachment/PropertyAttachment.java` etc. — all at attachment root |
| DB tables | `properties`, `floors`, `property_attachments` |

### UNITS
| Field | Value |
|---|---|
| Route | `/admin/units` |
| Frontend folder | `features/units/` (flat — unit-dialog.component, unit-management.component) |
| Frontend service | `core/services/unit.service.ts` |
| Backend controller | `modules/unit/UnitController.java` (at module root — misplaced) |
| Backend service | `modules/unit/UnitService.java` (at module root) |
| Repository | `modules/unit/UnitRepository.java` (at module root) |
| Entity | `modules/unit/Unit.java` (at module root), `UnitType.java` (enum) |
| DTOs | `modules/unit/dto/UnitRequest, UnitResponse` ✓ |
| DB tables | `units` |

### TENANTS (Admin Management)
| Field | Value |
|---|---|
| Route | `/admin/tenants` |
| Frontend folder | `features/tenants/` (flat) |
| Frontend service | `core/services/tenant.service.ts` |
| Backend controller | `modules/tenant/TenantController.java` (at module root — misplaced) |
| Backend service | `modules/tenant/TenantService.java`, `TenantOnboardingService.java`, `TenantPortalWelcomeService.java` (all at root) |
| Repository | `modules/tenant/TenantRepository.java` (at module root) |
| Entity | `modules/tenant/Tenant.java` (at module root) |
| DTOs | `modules/tenant/dto/TenantRequest, TenantResponse, TenantFullOnboardRequest, TenantOnboardingResponse` ✓ |
| DB tables | `tenants` |

### OWNERS (Admin Management)
| Field | Value |
|---|---|
| Route | `/admin/owners` |
| Frontend folder | `features/owners/` (flat) |
| Frontend service | `core/services/owner.service.ts` |
| Backend controller | `modules/owner/OwnerController.java` (at module root) |
| Backend service | `modules/owner/OwnerService.java`, `OwnerPropertyAccessService.java` (at root) |
| Repository | `modules/owner/OwnerRepository.java` (at module root) |
| Entity | `modules/owner/Owner.java` (at module root) |
| DTOs | `modules/owner/dto/OwnerRequest, OwnerResponse, LinkUserRequest` ✓ |
| DB tables | `owners` |

### USERS (Admin)
| Field | Value |
|---|---|
| Route | `/admin/users`, `/admin/user-access` |
| Frontend folder | `features/users/` (flat) |
| Frontend service | `core/services/user.service.ts`, `core/services/user-profile.service.ts` |
| Backend controller | `modules/user/UserController.java` (at module root) |
| Backend service | `modules/user/UserService.java`, `PortalProfileBridge.java` (at root) |
| Repository | `modules/user/UserRepository.java`, `UserPropertyAccessRepository.java` (at root) |
| Entity | `modules/user/User.java`, `UserExtraRoles.java`, `UserPropertyAccess.java`, `UserPropertyAccessId.java` (all at root) |
| DTOs | `modules/user/dto/` — multiple DTOs ✓ |
| DB tables | `users`, `user_extra_roles`, `user_property_access` |

### CONTRACTS (Lease)
| Field | Value |
|---|---|
| Route | `/admin/contracts`, `/admin/contracts/:id`, etc. |
| Frontend folder | `features/contracts/` — partially organized |
| Frontend service | `core/services/contract.service.ts`, `core/services/payment.service.ts` |
| Backend controller | `modules/contract/lease/LeaseContractController.java` (at lease root) |
| Backend service | `modules/contract/lease/LeaseContractService.java` (at lease root) |
| Repository | `modules/contract/lease/LeaseContractRepository.java` (at lease root) |
| Mapper | **MISSING** |
| Entity | `modules/contract/lease/LeaseContract.java` (at lease root) |
| DTOs | `modules/contract/lease/dto/` — multiple DTOs ✓ |
| DB tables | `lease_contracts`, `rent_payments`, `rent_payment_schedule` |

### CONTRACTS (Owner Approval)
| Field | Value |
|---|---|
| Route | `/admin/owner-portal/contract-approvals` |
| Frontend folder | `features/owner/contract-approvals/` ✓ |
| Component | `contract-approvals.component.ts` |
| Frontend service | `core/services/owner-portal.service.ts` |
| Backend controller | `modules/contract/lease/OwnerApprovalController.java` (at lease root — misplaced in lease) |
| Backend service | `modules/contract/lease/OwnerApprovalService.java` (at lease root) |
| DTOs | `modules/contract/lease/dto/OwnerApprovalDto, OwnerRenewalDecisionDto, OwnerTerminationDecisionDto` |

### CONTRACTS (Renewal)
| Field | Value |
|---|---|
| Route | `/admin/contracts/:id/renew` |
| Frontend folder | `features/contracts/contract-renewal-form/` ✓ |
| Backend controller | **MISSING** — renewal is triggered via `LeaseContractController` or `AccountantPortalController` |
| Backend service | `modules/contract/renewal/ContractRenewalService.java` (at renewal root) |
| Repository | `modules/contract/renewal/ContractRenewalRepository.java` (at renewal root) |
| Entity | `modules/contract/renewal/ContractRenewal.java` (at renewal root) |
| DTOs | `modules/contract/renewal/dto/` ✓ |

### CONTRACTS (Payment)
| Field | Value |
|---|---|
| Route | Part of contract detail |
| Frontend service | `core/services/payment.service.ts` |
| Backend controller | `modules/contract/payment/RentPaymentController.java` (at payment root) |
| Backend service | `modules/contract/payment/RentPaymentService.java` (at payment root) |
| Repository | `RentPaymentRepository.java`, `RentPaymentScheduleRepository.java` (at payment root) |
| Entity | `RentPayment.java`, `RentPaymentSchedule.java` (at payment root) |
| DTOs | `modules/contract/payment/dto/` ✓ |

### CONTRACTS (Template)
| Field | Value |
|---|---|
| Route | `/admin/contracts/templates` |
| Frontend folder | `features/contracts/contract-templates/` ✓ |
| Backend controller | `modules/contract/template/ContractTemplateController.java` (at template root) |
| Backend service | `modules/contract/template/ContractTemplateService.java` (at template root) |
| Repository | `modules/contract/template/ContractTemplateRepository.java` (at template root) |
| Entity | `modules/contract/template/ContractTemplate.java` (at template root) |
| DTOs | `modules/contract/template/dto/` ✓ |

### CONTRACTS (Fee)
| Field | Value |
|---|---|
| Backend controller | **MISSING** — ContractFeeService is likely called internally by LeaseContractService |
| Backend service | `modules/contract/fee/ContractFeeService.java` (at fee root) |
| Repository | `modules/contract/fee/ContractFeeRepository.java` (at fee root) |
| Entity | `modules/contract/fee/ContractFee.java` (at fee root) |
| DTOs | `modules/contract/fee/dto/ContractFeeRequest` |

### MAINTENANCE (Request)
| Field | Value |
|---|---|
| Route | `/admin/maintenance`, `/tenant/requests`, `/officer/requests` |
| Frontend folder | `features/maintenance/request-list/`, `features/maintenance/request-form/`, `features/maintenance/request-detail/` ✓ |
| Frontend service | `core/services/maintenance.service.ts` |
| Backend controller | `modules/maintenance/request/MaintenanceRequestController.java` (at request root) |
| Backend service | `modules/maintenance/request/MaintenanceRequestService.java` (at request root) |
| Repository | `MaintenanceRequestRepository.java`, `RequestAttachmentRepository.java` (at request root) |
| Entity | `MaintenanceRequest.java`, `RequestAttachment.java`, `RequestPriority.java`, `RequestStatus.java` (at request root) |
| DTOs | `modules/maintenance/request/dto/` ✓ |
| DB tables | `maintenance_requests`, `request_attachments` |

### MAINTENANCE (Visit / Rating)
| Field | Value |
|---|---|
| Route | `/officer/requests/:id/visit-report` |
| Frontend folder | `features/maintenance/visit-report-form/` ✓ |
| Frontend service | `core/services/maintenance.service.ts` |
| Backend controller | **MISSING for rating** — `VisitRatingService` exists with no controller |
| Backend service | `modules/maintenance/rating/VisitRatingService.java` (at rating root) |
| Repository | `modules/maintenance/rating/VisitRatingRepository.java` (at rating root) |
| Entity | `modules/maintenance/rating/VisitRating.java` (at rating root) |
| DTOs | `VisitRatingRequest, VisitRatingResponse, RatingDashboardItemResponse, RatingsSummaryResponse` (at rating root, not in dto/) |

### MAINTENANCE (Assignment)
| Field | Value |
|---|---|
| Frontend service | `core/services/maintenance-assignment.service.ts` |
| Backend controller | `modules/maintenance/assignment/MaintenanceAssignmentController.java` (at assignment root) |
| Backend service | `modules/maintenance/assignment/MaintenanceAssignmentService.java` (at assignment root) |
| Entity | `MaintenanceContract.java`, `MaintenanceProvider.java`, `PropertyMaintenanceAssignment.java` (at assignment root) |
| Repository | `MaintenanceContractRepository.java`, `MaintenanceProviderRepository.java`, `PropertyMaintenanceAssignmentRepository.java` (at assignment root) |
| DTOs | `modules/maintenance/assignment/dto/` ✓ |

### MAINTENANCE (Invoice)
| Field | Value |
|---|---|
| Route | `/officer/invoices` |
| Frontend folder | `features/officer/invoice-portal/` ✓ |
| Frontend service | `core/services/maintenance-invoice.service.ts` |
| Backend controller | `modules/maintenance/invoice/MaintenanceInvoiceController.java` (at invoice root) |
| Backend service | `modules/maintenance/invoice/MaintenanceInvoiceService.java` (at invoice root) |
| Repository | `MaintenanceInvoiceRepository.java` (at invoice root) |
| Entity | `MaintenanceInvoice.java` (at invoice root) |
| DTOs | `modules/maintenance/invoice/dto/` ✓ |

### MAINTENANCE (Contract Invoice — Accountant)
| Field | Value |
|---|---|
| Frontend service | `core/services/maintenance-contract-invoice.service.ts` |
| Backend controller | `modules/maintenance/contractinvoice/MaintenanceContractInvoiceController.java` (at contractinvoice root) |
| Backend service | `modules/maintenance/contractinvoice/MaintenanceContractInvoiceService.java` |
| Repository | `MaintenanceContractInvoiceRepository.java` |
| Entity | `MaintenanceContractInvoice.java` |
| DTOs | `modules/maintenance/contractinvoice/dto/` ✓ |

### MAINTENANCE (Maintenance Contract)
| Field | Value |
|---|---|
| Frontend service | `core/services/maintenance-contract.service.ts` |
| Backend controller | `modules/maintenance/contract/MaintenanceContractController.java` (at contract root) |
| Backend service | `modules/maintenance/contract/MaintenanceContractService.java` (at contract root) |
| Repository | Shares `MaintenanceContractRepository` from assignment module |
| DTOs | `modules/maintenance/contract/dto/` ✓ |

### MAINTENANCE (Company — Thin Alias)
| Field | Value |
|---|---|
| Backend | `modules/maintenance/company/MaintenanceCompanyController.java` |
| Notes | Delegates entirely to `ContractorCompanyService`. No own entity/repo/service. This is intentional — contractor companies ARE maintenance companies. |

### CONTRACTORS
| Field | Value |
|---|---|
| Route | `/admin/contractors` |
| Frontend folder | `features/contractors/` (flat — two components) |
| Frontend service | `core/services/contractor-company.service.ts` |
| Backend controller | `modules/contractor/controller/ContractorCompanyController.java` ✓ |
| Backend service | `modules/contractor/service/ContractorCompanyService.java` ✓ |
| Repository | `modules/contractor/repository/ContractorCompanyRepository.java` ✓ |
| Entity | `modules/contractor/entity/ContractorCompanyEntity.java` ✓ |
| DTOs | `modules/contractor/dto/` ✓ |

### TENANT PORTAL
| Field | Value |
|---|---|
| Route | `/tenant/my-contracts`, `/tenant/rent-receipts`, etc. |
| Frontend folder | `features/tenant/` — mostly organized |
| Frontend service | `core/services/tenant-portal.service.ts` |
| Backend controller | `modules/tenantportal/TenantPortalController.java` (at module root) |
| Backend service | `modules/tenantportal/TenantPortalService.java` (at module root) |
| Repository | `RentReceiptRepository.java`, `ContractActionRequestRepository.java` (at module root) |
| Entity | `RentReceipt.java`, `ContractActionRequest.java` (at module root) |
| DTOs | `modules/tenantportal/dto/` ✓ |
| **ISSUE** | `AccountantPortalController` and `AccountantPortalService` are **wrongly placed** in this module |

### ACCOUNTANT PORTAL
| Field | Value |
|---|---|
| Route | `/admin/accountant-portal/rent-confirmation`, `/admin/accountant-portal/renewal-requests`, etc. |
| Frontend folder | `features/accountant/` — organized |
| Frontend service | `core/services/accountant-portal.service.ts` |
| Backend controller | `modules/tenantportal/AccountantPortalController.java` — **MISPLACED in tenantportal** |
| Backend service | `modules/tenantportal/AccountantPortalService.java` — **MISPLACED in tenantportal** |
| **Target** | Should be in `modules/accountantportal/` or `modules/tenantportal/accountant/` |

### OWNER PORTAL
| Field | Value |
|---|---|
| Route | `/admin/owner-portal/dashboard`, `/admin/owner-portal/statements`, etc. |
| Frontend folder | `features/owner-portal/` (flat) |
| Frontend service | `core/services/owner-portal.service.ts` |
| Backend controller | `modules/ownerportal/OwnerPortalController.java` (at module root) |
| Backend service | `modules/ownerportal/OwnerPortalService.java`, `OwnerPortalDraftContractService.java` (at root) |
| Repository | `modules/ownerportal/OwnerStatementRepository.java` (at root) |
| Entity | `modules/ownerportal/OwnerStatement.java` (at root) |
| DTOs | `modules/ownerportal/dto/` ✓ |

### FINANCE
| Field | Value |
|---|---|
| Route | `/admin/finance/dashboard`, `/admin/finance/expenses`, etc. |
| Frontend folder | `features/finance/` (mixed — most components flat, only overdue-payments/ sub-folder) |
| Frontend service | `core/services/finance.service.ts` |
| Backend controller | `modules/finance/FinanceController.java` (at module root — misplaced) |
| Backend service | `modules/finance/FinanceService.java` (at module root — misplaced) |
| Sub-modules | budget, expense, revenue — all have entities/repos at sub-root |
| DB tables | `expenses`, `expense_categories`, `other_revenues`, `budget_items` |

### HR
| Field | Value |
|---|---|
| Route | `/admin/hr/employees`, `/admin/hr/leaves`, `/admin/hr/payroll` |
| Frontend folder | `features/hr/` (flat — hr-workspace.component, employee-dialog.component) |
| Frontend service | `core/services/hr.service.ts`, `core/services/hr-employee.service.ts` |
| Backend controllers | `EmployeeController`, `AttendanceController`, `LeaveController`, `PayrollController` — all at sub-module roots |
| Backend services | All at sub-module roots |
| Entities | All at sub-module roots |

### INVENTORY
| Field | Value |
|---|---|
| Route | `/admin/inventory` |
| Frontend folder | `features/inventory/` (mixed — inventory-list/ sub-folder but inventory-item-dialog.component flat) |
| Frontend service | `core/services/inventory.service.ts` |
| Backend controller | `modules/inventory/controller/InventoryController.java` ✓ |
| Backend service | `modules/inventory/service/InventoryService.java` ✓ |
| Repository | `modules/inventory/repository/` ✓ |
| Entity | `modules/inventory/entity/` ✓ |
| DTOs | `modules/inventory/dto/` ✓ |

### LOOKUPS
| Field | Value |
|---|---|
| Route | `/admin/lookups` |
| Frontend folder | `features/lookups/` (flat) |
| Frontend service | `core/services/lookup.service.ts`, `core/services/lookup-cache.service.ts` |
| Backend controller | `modules/lookup/controller/LookupController.java` ✓ |
| Backend service | `modules/lookup/service/LookupService.java` ✓ |

### PERMISSIONS / MODULES / SCREENS
| Field | Value |
|---|---|
| Route | `/admin/permissions`, `/admin/screens`, `/admin/module-settings` |
| Frontend folder | `features/permissions/` (flat — 3 components) |
| Frontend service | `core/services/permission.service.ts` |
| Backend controllers | `modules/permission/controller/` ✓, `modules/moduleconfig/controller/` ✓ |
| Backend services | `modules/permission/service/` ✓, `modules/moduleconfig/service/` ✓ |

### VACANCIES
| Field | Value |
|---|---|
| Route | `/admin/vacancies/list`, `/admin/vacancies/:id/inquiries` |
| Frontend folder | `features/vacancies/` (flat — vacancy-workspace.component) |
| Frontend service | `core/services/vacancy.service.ts` |
| Backend controller | `modules/vacancy/controller/VacancyController.java` ✓ |
| Backend service | `modules/vacancy/service/VacancyService.java` ✓ |

### COMPLAINTS
| Field | Value |
|---|---|
| Route | `/admin/contracts/complaints`, `/tenant/complaints` |
| Frontend folder | `features/contracts/complaints-list/` ✓, `features/tenant/submit-complaint/` ✓ |
| Frontend service | `core/services/complaint.service.ts` |
| Backend controller | `modules/complaint/TenantComplaintController.java` (at module root — misplaced) |
| Backend service | `modules/complaint/TenantComplaintService.java` (at module root — misplaced) |
| Repository | `modules/complaint/TenantComplaintRepository.java` (at module root — misplaced) |
| Entity | `modules/complaint/TenantComplaint.java` (at module root — misplaced) |
| DTOs | `modules/complaint/dto/ComplaintRequest` ✓ |

### NOTIFICATIONS
| Field | Value |
|---|---|
| Route | `/admin/notifications`, `/tenant/notifications` |
| Frontend folder | `features/notifications/` (flat) |
| Frontend service | `core/services/notification.service.ts` |
| Backend controller | `modules/notification/controller/NotificationController.java` ✓ |
| Backend service | `modules/notification/service/NotificationService.java` ✓ |

### AUDIT LOG
| Field | Value |
|---|---|
| Route | `/admin/audit-log` |
| Frontend folder | `features/audit/` (flat) |
| Frontend service | `core/services/audit.service.ts` |
| Backend controller | `modules/audit/controller/AuditLogController.java` ✓ |
| Backend service | `modules/audit/service/AuditLogService.java` ✓ |

### RATINGS
| Field | Value |
|---|---|
| Route | `/admin/ratings` |
| Frontend folder | `features/ratings/` (flat — ratings-dashboard.component) |
| Backend controller | **MISSING** — `VisitRatingService` has no controller |
| Backend service | `modules/maintenance/rating/VisitRatingService.java` (at rating root) |
| Repository | `modules/maintenance/rating/VisitRatingRepository.java` (at rating root) |
| Entity | `modules/maintenance/rating/VisitRating.java` (at rating root) |
| DTOs | `VisitRatingRequest, VisitRatingResponse, RatingDashboardItemResponse, RatingsSummaryResponse` (at rating root — not in dto/) |

---

## 4. Classes That Are Misplaced

### Backend

| Class | Current Location | Should Be In |
|---|---|---|
| `AuthController.java` | `modules/auth/` | `modules/auth/controller/` |
| `AuthService.java` | `modules/auth/` | `modules/auth/service/` |
| `UserDetailsServiceImpl.java` | `modules/auth/` | `modules/auth/service/` |
| `TenantComplaint.java` | `modules/complaint/` | `modules/complaint/entity/` |
| `TenantComplaintController.java` | `modules/complaint/` | `modules/complaint/controller/` |
| `TenantComplaintRepository.java` | `modules/complaint/` | `modules/complaint/repository/` |
| `TenantComplaintService.java` | `modules/complaint/` | `modules/complaint/service/` |
| `AccountantPortalController.java` | `modules/tenantportal/` | `modules/accountantportal/controller/` |
| `AccountantPortalService.java` | `modules/tenantportal/` | `modules/accountantportal/service/` |
| `LeaseContract.java` | `modules/contract/lease/` | `modules/contract/lease/entity/` |
| `LeaseContractController.java` | `modules/contract/lease/` | `modules/contract/lease/controller/` |
| `LeaseContractRepository.java` | `modules/contract/lease/` | `modules/contract/lease/repository/` |
| `LeaseContractService.java` | `modules/contract/lease/` | `modules/contract/lease/service/` |
| `OwnerApprovalController.java` | `modules/contract/lease/` | `modules/contract/lease/controller/` |
| `OwnerApprovalService.java` | `modules/contract/lease/` | `modules/contract/lease/service/` |
| `ContractStatus.java` | `modules/contract/lease/` | `modules/contract/lease/entity/` (or keep at lease root as shared enum) |
| `PaymentFrequency.java` | `modules/contract/lease/` | `modules/contract/lease/entity/` |
| `RentPayment.java` | `modules/contract/payment/` | `modules/contract/payment/entity/` |
| `RentPaymentSchedule.java` | `modules/contract/payment/` | `modules/contract/payment/entity/` |
| `PaymentScheduleStatus.java` | `modules/contract/payment/` | `modules/contract/payment/entity/` |
| `RentPaymentController.java` | `modules/contract/payment/` | `modules/contract/payment/controller/` |
| `RentPaymentRepository.java` | `modules/contract/payment/` | `modules/contract/payment/repository/` |
| `RentPaymentScheduleRepository.java` | `modules/contract/payment/` | `modules/contract/payment/repository/` |
| `RentPaymentService.java` | `modules/contract/payment/` | `modules/contract/payment/service/` |
| `ContractRenewal.java` | `modules/contract/renewal/` | `modules/contract/renewal/entity/` |
| `ContractRenewalRepository.java` | `modules/contract/renewal/` | `modules/contract/renewal/repository/` |
| `ContractRenewalService.java` | `modules/contract/renewal/` | `modules/contract/renewal/service/` |
| `ContractTemplate.java` | `modules/contract/template/` | `modules/contract/template/entity/` |
| `ContractTemplateController.java` | `modules/contract/template/` | `modules/contract/template/controller/` |
| `ContractTemplateRepository.java` | `modules/contract/template/` | `modules/contract/template/repository/` |
| `ContractTemplateService.java` | `modules/contract/template/` | `modules/contract/template/service/` |
| `ContractFee.java` | `modules/contract/fee/` | `modules/contract/fee/entity/` |
| `ContractFeeRepository.java` | `modules/contract/fee/` | `modules/contract/fee/repository/` |
| `ContractFeeService.java` | `modules/contract/fee/` | `modules/contract/fee/service/` |
| `FinanceController.java` | `modules/finance/` | `modules/finance/controller/` |
| `FinanceService.java` | `modules/finance/` | `modules/finance/service/` |
| `BudgetEntity.java` | `modules/finance/budget/` | `modules/finance/budget/entity/` |
| `BudgetQueryRepository.java` | `modules/finance/budget/` | `modules/finance/budget/repository/` |
| `Expense.java` | `modules/finance/expense/` | `modules/finance/expense/entity/` |
| `ExpenseCategory.java` | `modules/finance/expense/` | `modules/finance/expense/entity/` |
| `ExpenseCategoryLookupRepository.java` | `modules/finance/expense/` | `modules/finance/expense/repository/` |
| `ExpenseRepository.java` | `modules/finance/expense/` | `modules/finance/expense/repository/` |
| `ExpenseWriterRepository.java` | `modules/finance/expense/` | `modules/finance/expense/repository/` |
| `OtherRevenue.java` | `modules/finance/revenue/` | `modules/finance/revenue/entity/` |
| `OtherRevenueRepository.java` | `modules/finance/revenue/` | `modules/finance/revenue/repository/` |
| `OtherRevenueWriterRepository.java` | `modules/finance/revenue/` | `modules/finance/revenue/repository/` |
| `AttendanceEntity.java` | `modules/hr/attendance/` | `modules/hr/attendance/entity/` |
| `AttendanceController.java` | `modules/hr/attendance/` | `modules/hr/attendance/controller/` |
| `AttendanceQueryRepository.java` | `modules/hr/attendance/` | `modules/hr/attendance/repository/` |
| `AttendanceService.java` | `modules/hr/attendance/` | `modules/hr/attendance/service/` |
| `Employee.java` | `modules/hr/employee/` | `modules/hr/employee/entity/` |
| `EmployeeController.java` | `modules/hr/employee/` | `modules/hr/employee/controller/` |
| `EmployeeRepository.java` | `modules/hr/employee/` | `modules/hr/employee/repository/` |
| `EmployeeService.java` | `modules/hr/employee/` | `modules/hr/employee/service/` |
| `LeaveRequestEntity.java` | `modules/hr/leave/` | `modules/hr/leave/entity/` |
| `LeaveController.java` | `modules/hr/leave/` | `modules/hr/leave/controller/` |
| `LeaveQueryRepository.java` | `modules/hr/leave/` | `modules/hr/leave/repository/` |
| `LeaveRequestRepository.java` | `modules/hr/leave/` | `modules/hr/leave/repository/` |
| `LeaveService.java` | `modules/hr/leave/` | `modules/hr/leave/service/` |
| `PayrollRun.java` | `modules/hr/payroll/` | `modules/hr/payroll/entity/` |
| `Payslip.java` | `modules/hr/payroll/` | `modules/hr/payroll/entity/` |
| `EmployeeBonus.java` | `modules/hr/payroll/` | `modules/hr/payroll/entity/` |
| `SalaryAdvance.java` | `modules/hr/payroll/` | `modules/hr/payroll/entity/` |
| `PayrollController.java` | `modules/hr/payroll/` | `modules/hr/payroll/controller/` |
| `PayrollRepository.java` | `modules/hr/payroll/` | `modules/hr/payroll/repository/` |
| `PayslipRepository.java` | `modules/hr/payroll/` | `modules/hr/payroll/repository/` |
| `EmployeeBonusRepository.java` | `modules/hr/payroll/` | `modules/hr/payroll/repository/` |
| `SalaryAdvanceRepository.java` | `modules/hr/payroll/` | `modules/hr/payroll/repository/` |
| `PayrollService.java` | `modules/hr/payroll/` | `modules/hr/payroll/service/` |
| `MaintenanceAssignmentController.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/controller/` |
| `MaintenanceAssignmentService.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/service/` |
| `MaintenanceContract.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/entity/` |
| `MaintenanceContractRepository.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/repository/` |
| `MaintenanceProvider.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/entity/` |
| `MaintenanceProviderRepository.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/repository/` |
| `PropertyMaintenanceAssignment.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/entity/` |
| `PropertyMaintenanceAssignmentRepository.java` | `modules/maintenance/assignment/` | `modules/maintenance/assignment/repository/` |
| `MaintenanceCategory.java` | `modules/maintenance/category/` | `modules/maintenance/category/entity/` |
| `MaintenanceCategoryController.java` | `modules/maintenance/category/` | `modules/maintenance/category/controller/` |
| `MaintenanceCategoryRepository.java` | `modules/maintenance/category/` | `modules/maintenance/category/repository/` |
| `MaintenanceCategoryService.java` | `modules/maintenance/category/` | `modules/maintenance/category/service/` |
| `MaintenanceContractController.java` | `modules/maintenance/contract/` | `modules/maintenance/contract/controller/` |
| `MaintenanceContractService.java` | `modules/maintenance/contract/` | `modules/maintenance/contract/service/` |
| `MaintenanceContractInvoice.java` | `modules/maintenance/contractinvoice/` | `modules/maintenance/contractinvoice/entity/` |
| `MaintenanceContractInvoiceController.java` | `modules/maintenance/contractinvoice/` | `modules/maintenance/contractinvoice/controller/` |
| `MaintenanceContractInvoiceRepository.java` | `modules/maintenance/contractinvoice/` | `modules/maintenance/contractinvoice/repository/` |
| `MaintenanceContractInvoiceService.java` | `modules/maintenance/contractinvoice/` | `modules/maintenance/contractinvoice/service/` |
| `MaintenanceInvoice.java` | `modules/maintenance/invoice/` | `modules/maintenance/invoice/entity/` |
| `MaintenanceInvoiceController.java` | `modules/maintenance/invoice/` | `modules/maintenance/invoice/controller/` |
| `MaintenanceInvoiceRepository.java` | `modules/maintenance/invoice/` | `modules/maintenance/invoice/repository/` |
| `MaintenanceInvoiceService.java` | `modules/maintenance/invoice/` | `modules/maintenance/invoice/service/` |
| `VisitRating.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/entity/` |
| `VisitRatingRepository.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/repository/` |
| `VisitRatingService.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/service/` |
| `VisitRatingRequest.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/dto/` |
| `VisitRatingResponse.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/dto/` |
| `RatingDashboardItemResponse.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/dto/` |
| `RatingsSummaryResponse.java` | `modules/maintenance/rating/` | `modules/maintenance/rating/dto/` |
| `MaintenanceRequest.java` | `modules/maintenance/request/` | `modules/maintenance/request/entity/` |
| `RequestAttachment.java` | `modules/maintenance/request/` | `modules/maintenance/request/entity/` |
| `RequestPriority.java` | `modules/maintenance/request/` | `modules/maintenance/request/entity/` |
| `RequestStatus.java` | `modules/maintenance/request/` | `modules/maintenance/request/entity/` |
| `MaintenanceRequestController.java` | `modules/maintenance/request/` | `modules/maintenance/request/controller/` |
| `RequestAttachmentRepository.java` | `modules/maintenance/request/` | `modules/maintenance/request/repository/` |
| `MaintenanceRequestRepository.java` | `modules/maintenance/request/` | `modules/maintenance/request/repository/` |
| `MaintenanceRequestService.java` | `modules/maintenance/request/` | `modules/maintenance/request/service/` |
| `VisitReport.java` | `modules/maintenance/visit/` | `modules/maintenance/visit/entity/` |
| `VisitReportItem.java` | `modules/maintenance/visit/` | `modules/maintenance/visit/entity/` |
| `VisitReportRepository.java` | `modules/maintenance/visit/` | `modules/maintenance/visit/repository/` |
| `VisitReportItemRepository.java` | `modules/maintenance/visit/` | `modules/maintenance/visit/repository/` |
| `Owner.java` | `modules/owner/` | `modules/owner/entity/` |
| `OwnerController.java` | `modules/owner/` | `modules/owner/controller/` |
| `OwnerPropertyAccessService.java` | `modules/owner/` | `modules/owner/service/` |
| `OwnerRepository.java` | `modules/owner/` | `modules/owner/repository/` |
| `OwnerService.java` | `modules/owner/` | `modules/owner/service/` |
| `OwnerPortalController.java` | `modules/ownerportal/` | `modules/ownerportal/controller/` |
| `OwnerPortalDraftContractService.java` | `modules/ownerportal/` | `modules/ownerportal/service/` |
| `OwnerPortalService.java` | `modules/ownerportal/` | `modules/ownerportal/service/` |
| `OwnerStatement.java` | `modules/ownerportal/` | `modules/ownerportal/entity/` |
| `OwnerStatementRepository.java` | `modules/ownerportal/` | `modules/ownerportal/repository/` |
| `Property.java` | `modules/property/` | `modules/property/entity/` |
| `Floor.java` | `modules/property/` | `modules/property/entity/` |
| `PropertyType.java` | `modules/property/` | `modules/property/entity/` |
| `PropertyController.java` | `modules/property/` | `modules/property/controller/` |
| `FloorController.java` | `modules/property/` | `modules/property/controller/` |
| `PropertyOwnerPortalRecipientService.java` | `modules/property/` | `modules/property/service/` |
| `PropertyRepository.java` | `modules/property/` | `modules/property/repository/` |
| `FloorRepository.java` | `modules/property/` | `modules/property/repository/` |
| `PropertyService.java` | `modules/property/` | `modules/property/service/` |
| `FloorService.java` | `modules/property/` | `modules/property/service/` |
| `PropertyAttachment.java` | `modules/property/attachment/` | `modules/property/attachment/entity/` |
| `PropertyAttachmentController.java` | `modules/property/attachment/` | `modules/property/attachment/controller/` |
| `PropertyAttachmentRepository.java` | `modules/property/attachment/` | `modules/property/attachment/repository/` |
| `PropertyAttachmentResponse.java` | `modules/property/attachment/` | `modules/property/attachment/dto/` |
| `PropertyAttachmentService.java` | `modules/property/attachment/` | `modules/property/attachment/service/` |
| `Tenant.java` | `modules/tenant/` | `modules/tenant/entity/` |
| `TenantController.java` | `modules/tenant/` | `modules/tenant/controller/` |
| `TenantOnboardingService.java` | `modules/tenant/` | `modules/tenant/service/` |
| `TenantPortalWelcomeService.java` | `modules/tenant/` | `modules/tenant/service/` |
| `TenantRepository.java` | `modules/tenant/` | `modules/tenant/repository/` |
| `TenantService.java` | `modules/tenant/` | `modules/tenant/service/` |
| `TenantPortalController.java` | `modules/tenantportal/` | `modules/tenantportal/controller/` |
| `TenantPortalService.java` | `modules/tenantportal/` | `modules/tenantportal/service/` |
| `RentReceipt.java` | `modules/tenantportal/` | `modules/tenantportal/entity/` |
| `ContractActionRequest.java` | `modules/tenantportal/` | `modules/tenantportal/entity/` |
| `RentReceiptRepository.java` | `modules/tenantportal/` | `modules/tenantportal/repository/` |
| `ContractActionRequestRepository.java` | `modules/tenantportal/` | `modules/tenantportal/repository/` |
| `ReceiptWithTenantDto.java` | `modules/tenantportal/` | `modules/tenantportal/dto/` |
| `RenewalRequestWithDetailsDto.java` | `modules/tenantportal/` | `modules/tenantportal/dto/` |
| `Unit.java` | `modules/unit/` | `modules/unit/entity/` |
| `UnitType.java` | `modules/unit/` | `modules/unit/entity/` |
| `UnitController.java` | `modules/unit/` | `modules/unit/controller/` |
| `UnitRepository.java` | `modules/unit/` | `modules/unit/repository/` |
| `UnitService.java` | `modules/unit/` | `modules/unit/service/` |
| `User.java` | `modules/user/` | `modules/user/entity/` |
| `UserExtraRoles.java` | `modules/user/` | `modules/user/entity/` |
| `UserPropertyAccess.java` | `modules/user/` | `modules/user/entity/` |
| `UserPropertyAccessId.java` | `modules/user/` | `modules/user/entity/` |
| `UserRole.java` | `modules/user/` | `modules/user/entity/` |
| `MaintenanceOfficerType.java` | `modules/user/` | `modules/user/entity/` |
| `UserController.java` | `modules/user/` | `modules/user/controller/` |
| `UserPropertyAccessRepository.java` | `modules/user/` | `modules/user/repository/` |
| `UserRepository.java` | `modules/user/` | `modules/user/repository/` |
| `PortalProfileBridge.java` | `modules/user/` | `modules/user/service/` |
| `UserService.java` | `modules/user/` | `modules/user/service/` |

### Frontend

Frontend services that belong in feature folders (currently all in `core/services/`):

> **Decision:** Because all services are consumed by multiple components across different routes (admin, tenant, officer roles share maintenance, contracts, etc.), AND the Angular DI system makes cross-feature imports safe with no circular dependency risk when services are in core, **all current `core/services/` services will remain in `core/services/`**. Moving them to feature folders would create cross-feature imports which is worse than keeping them centralized.

Frontend components that are flat but should have sub-folders:

| Component | Current Path | Should Be In |
|---|---|---|
| `audit-log.component.ts` | `features/audit/` | `features/audit/audit-log/` |
| `change-password.component.ts` | `features/change-password/` | `features/change-password/change-password/` |
| `contractor-companies.component.ts` | `features/contractors/` | `features/contractors/contractor-list/` |
| `contractor-company-dialog.component.ts` | `features/contractors/` | `features/contractors/contractor-list/` |
| `dashboard.component.ts` | `features/dashboard/` | `features/dashboard/dashboard/` |
| `expense-dialog.component.ts` | `features/finance/` | `features/finance/expenses/` |
| `finance-reports.component.ts` | `features/finance/` | `features/finance/finance-reports/` |
| `finance-workspace.component.ts` | `features/finance/` | `features/finance/finance-workspace/` |
| `revenue-dialog.component.ts` | `features/finance/` | `features/finance/revenues/` |
| `home-portal.component.ts` | `features/home-portal/` | `features/home-portal/home-portal/` |
| `employee-dialog.component.ts` | `features/hr/` | `features/hr/employees/` |
| `hr-workspace.component.ts` | `features/hr/` | `features/hr/hr-workspace/` |
| `inventory-item-dialog.component.ts` | `features/inventory/` | `features/inventory/inventory-list/` |
| `classification-dialog.component.ts` | `features/lookups/` | `features/lookups/lookup-management/` |
| `lookup-dialog.component.ts` | `features/lookups/` | `features/lookups/lookup-management/` |
| `lookup-management.component.ts` | `features/lookups/` | `features/lookups/lookup-management/` |
| `maintenance-request-dialog.component.ts` | `features/maintenance/` | `features/maintenance/request-list/` |
| `request-timeline-dialog.component.ts` | `features/maintenance/` | `features/maintenance/request-detail/` |
| `notifications-page.component.ts` | `features/notifications/` | `features/notifications/notifications-page/` |
| `owner-draft-amend-dialog.component.ts` | `features/owner/` | `features/owner/contract-approvals/` |
| `owner-draft-reject-dialog.component.ts` | `features/owner/` | `features/owner/contract-approvals/` |
| `owner-renewal-decision-dialog.component.ts` | `features/owner/` | `features/owner/contract-approvals/` |
| `owner-termination-decision-dialog.component.ts` | `features/owner/` | `features/owner/contract-approvals/` |
| `owner-portal-workspace.component.ts` | `features/owner-portal/` | `features/owner-portal/owner-portal-workspace/` |
| `owner-dialog.component.ts` | `features/owners/` | `features/owners/owner-list/` |
| `owner-link-user-dialog.component.ts` | `features/owners/` | `features/owners/owner-list/` |
| `owners-management.component.ts` | `features/owners/` | `features/owners/owner-list/` |
| `module-management.component.ts` | `features/permissions/` | `features/permissions/module-management/` |
| `permission-management.component.ts` | `features/permissions/` | `features/permissions/permission-management/` |
| `screen-management.component.ts` | `features/permissions/` | `features/permissions/screen-management/` |
| `profile.component.ts` | `features/profile/` | `features/profile/profile/` |
| `ratings-dashboard.component.ts` | `features/ratings/` | `features/ratings/ratings-dashboard/` |
| `reports-dashboard.component.ts` | `features/reports/` | `features/reports/reports-dashboard/` |
| `tenant-dialog.component.ts` | `features/tenants/` | `features/tenants/tenant-list/` |
| `tenant-edit-dialog.component.ts` | `features/tenants/` | `features/tenants/tenant-list/` |
| `tenant-management.component.ts` | `features/tenants/` | `features/tenants/tenant-list/` |
| `unit-dialog.component.ts` | `features/units/` | `features/units/unit-management/` |
| `unit-management.component.ts` | `features/units/` | `features/units/unit-management/` |
| `user-access-management.component.ts` | `features/users/` | `features/users/user-access/` |
| `user-dialog.component.ts` | `features/users/` | `features/users/user-list/` |
| `user-management.component.ts` | `features/users/` | `features/users/user-list/` |
| `vacancy-workspace.component.ts` | `features/vacancies/` | `features/vacancies/vacancy-workspace/` |

---

## 5. Classes That Are Missing

### Backend Missing Classes

| Module | Missing Class | Reason Needed |
|---|---|---|
| `maintenance/rating` | `VisitRatingController` | `VisitRatingService` exists but has no HTTP endpoint — ratings dashboard frontend calls an API |
| `maintenance/visit` | `VisitReportController` | `VisitReport` entity and repositories exist but no controller — visit report submission likely goes through `MaintenanceRequestController`, needs verification |
| `contract/renewal` | `ContractRenewalController` | Renewal sub-module has service and entity but no dedicated controller; currently may be triggered through `LeaseContractController` or `AccountantPortalController` — **verify before creating** |
| `contract/fee` | `ContractFeeController` | Fee sub-module has service and entity but no HTTP layer — fees are likely created internally, **do not create controller unless frontend actually calls a fee endpoint** |
| `accountantportal` | Entire module package | `AccountantPortalController` + `AccountantPortalService` are currently orphaned in `tenantportal` — needs new package `modules/accountantportal/` |
| Various modules | Mapper classes | No `@Mapper` or manual mapper classes exist anywhere — entity-to-DTO mapping is done inline in services. **Do not create mappers if not needed; document instead.** |

### Frontend Missing Files

| Screen | Missing File | Reason Needed |
|---|---|---|
| `features/ratings/ratings-dashboard/` | `ratings-dashboard.service.ts` | The component calls maintenance/rating API — currently uses `maintenance.service.ts` which is in core |
| Various flat components | `*.models.ts` | No screen-specific models defined outside of `core/models/` — acceptable if types are defined inline or in core |

---

## 6. Modules That Are Duplicated or Overlapping

| Issue | Details |
|---|---|
| `contractor` vs `maintenance/company` | `MaintenanceCompanyController` exposes the same entities as `ContractorCompanyController` under a different URL (`/maintenance-companies`). This is intentional — contractor companies ARE maintenance companies. No merge needed, but the alias controller's location (`maintenance/company/`) is correct. |
| `contract/renewal` vs `tenantportal` renewal logic | Renewal is triggered from both `LeaseContractController` and `AccountantPortalService`. The `ContractRenewalService` is the single source of truth. No duplication of data, but flow coordination creates tight coupling. |
| `tenantportal` `AccountantPortalController` | Accountant-facing API is inside the tenant portal module. These are two different user flows and should be separated. |
| `owner` vs `ownerportal` | `owner` = admin CRUD for owner entities. `ownerportal` = owner user portal workflows. These are correctly separate. |

---

## 7. Shared Modules That Must Not Be Forced Into One Screen

| Module | Why It Must Stay Shared |
|---|---|
| `modules/maintenance/request` | Used by admin, tenant, and officer routes |
| `modules/maintenance/visit` | Used by officer and admin |
| `modules/maintenance/rating` | Submitted by tenant, viewed by admin/ratings screen |
| `modules/notification` | Used by tenant, admin, officer notifications |
| `modules/audit` | Platform-wide audit, used by super admin only |
| `core/services/maintenance.service.ts` (FE) | Used by admin, tenant, and officer feature routes |
| `core/services/contract.service.ts` (FE) | Used by admin, accountant, owner portal |
| `core/services/lookup.service.ts` (FE) | Used across all features for dropdowns |
| `features/maintenance/request-list/` (FE) | Loaded by admin, tenant, and officer routes |
| `features/maintenance/request-detail/` (FE) | Loaded by admin, tenant, and officer routes |
| `features/maintenance/request-form/` (FE) | Loaded by admin and tenant routes |
| `features/profile/` (FE) | Used by admin, tenant, and officer routes |
| `features/notifications/` (FE) | Used by admin and tenant routes |

---

## 8. Risk Level for Each Suggested Change

### Backend Risks

| Change | Risk | Notes |
|---|---|---|
| Move classes into controller/service/entity/repository sub-packages (package rename only) | **LOW** | Only package declaration and imports change; Spring Boot scans by classpath; no DB changes |
| Move `AccountantPortalController` to new `accountantportal` module | **MEDIUM** | Requires creating new package, moving two classes, updating all imports. No endpoint URL change. |
| Create `VisitRatingController` (if missing) | **MEDIUM** | Requires verifying what endpoint the frontend ratings dashboard calls before creating |
| Create mapper layer | **LOW-MEDIUM** | Mappers are a refactoring-only change; business logic stays in service |
| Move enums to entity sub-package | **LOW** | Pure package rename; referenced via import only |
| Split `maintenance/company` controller | **LOW** | Already a thin alias; no logic to split |

### Frontend Risks

| Change | Risk | Notes |
|---|---|---|
| Move flat components into sub-folders | **LOW-MEDIUM** | Requires updating import paths in route files and any components that import dialogs directly |
| Keep all services in `core/services/` | **NONE** | Decision: do not move services; too many cross-feature consumers |
| Moving dialog components co-located with their parent screen | **LOW** | Dialogs are opened via service or direct import — update import path only |

---

## 9. Exact Refactor Plan

### PHASE 2: Backend Package Refactor

**Step 2.1 — `modules/auth`**
- Move `AuthController.java` → `modules/auth/controller/`
- Move `AuthService.java` → `modules/auth/service/`
- Move `UserDetailsServiceImpl.java` → `modules/auth/service/`
- Update package declarations and all imports

**Step 2.2 — `modules/complaint`**
- Move `TenantComplaint.java` → `modules/complaint/entity/`
- Move `TenantComplaintController.java` → `modules/complaint/controller/`
- Move `TenantComplaintRepository.java` → `modules/complaint/repository/`
- Move `TenantComplaintService.java` → `modules/complaint/service/`
- Update package declarations and all imports

**Step 2.3 — `modules/contract/lease`**
- Move `LeaseContract.java` → `modules/contract/lease/entity/`
- Move `ContractStatus.java` → `modules/contract/lease/entity/`
- Move `PaymentFrequency.java` → `modules/contract/lease/entity/`
- Move `LeaseContractController.java` → `modules/contract/lease/controller/`
- Move `OwnerApprovalController.java` → `modules/contract/lease/controller/`
- Move `LeaseContractRepository.java` → `modules/contract/lease/repository/`
- Move `LeaseContractService.java` → `modules/contract/lease/service/`
- Move `OwnerApprovalService.java` → `modules/contract/lease/service/`

**Step 2.4 — `modules/contract/payment`**
- Move `RentPayment.java`, `RentPaymentSchedule.java`, `PaymentScheduleStatus.java` → `entity/`
- Move `RentPaymentController.java` → `controller/`
- Move `RentPaymentRepository.java`, `RentPaymentScheduleRepository.java` → `repository/`
- Move `RentPaymentService.java` → `service/`

**Step 2.5 — `modules/contract/renewal`**
- Move `ContractRenewal.java` → `entity/`
- Move `ContractRenewalRepository.java` → `repository/`
- Move `ContractRenewalService.java` → `service/`
- **Investigation needed:** Verify whether a `ContractRenewalController` is needed or renewal is driven from `LeaseContractController`

**Step 2.6 — `modules/contract/template`**
- Move entity, controller, repository, service to respective sub-packages

**Step 2.7 — `modules/contract/fee`**
- Move entity, repository, service to respective sub-packages
- **Do NOT create controller** unless frontend makes direct fee CRUD calls

**Step 2.8 — `modules/finance`**
- Move `FinanceController.java` → `modules/finance/controller/`
- Move `FinanceService.java` → `modules/finance/service/`
- Move budget, expense, revenue sub-module classes to their entity/repository sub-packages

**Step 2.9 — `modules/hr`**
- Reorganize attendance, employee, leave, payroll sub-modules into controller/service/entity/repository sub-packages

**Step 2.10 — `modules/maintenance`**
- Reorganize assignment, category, contract, contractinvoice, invoice, rating, request, visit sub-modules
- Move rating DTOs into `rating/dto/`

**Step 2.11 — `modules/owner`**
- Move all flat classes into entity/, controller/, repository/, service/

**Step 2.12 — `modules/ownerportal`**
- Move all flat classes into entity/, controller/, repository/, service/

**Step 2.13 — `modules/property`**
- Move Property, Floor, PropertyType → `entity/`
- Move controllers → `controller/`
- Move repositories → `repository/`
- Move services → `service/`
- Reorganize `attachment/` sub-module

**Step 2.14 — `modules/tenant`**
- Move all flat classes into entity/, controller/, repository/, service/

**Step 2.15 — `modules/tenantportal`**
- Move flat classes into entity/, controller/, repository/, service/
- **Extract `AccountantPortalController` and `AccountantPortalService`** → new `modules/accountantportal/controller/` and `modules/accountantportal/service/`

**Step 2.16 — `modules/unit`**
- Move all flat classes into entity/, controller/, repository/, service/

**Step 2.17 — `modules/user`**
- Move all flat classes into entity/, controller/, repository/, service/

**Step 2.18 — `modules/maintenance/rating`**
- Verify `VisitRatingController` existence; if truly missing and ratings dashboard calls an endpoint, create it

---

### PHASE 3: Frontend Structure Refactor

**Step 3.1** — Create sub-folders for all flat components (see Section 4 table above)  
**Step 3.2** — Move component files (`.ts`, `.html`, `.scss`) into new sub-folders  
**Step 3.3** — Update lazy-loaded route paths in `admin.routes.ts`, `tenant.routes.ts`, `officer.routes.ts`  
**Step 3.4** — Keep all `core/services/` services in place (shared by multiple roles)  
**Step 3.5** — Verify no circular dependencies introduced  

---

### PHASE 4: Missing Class Completion

| Missing Class | Action |
|---|---|
| `VisitRatingController` | **Create if** frontend ratings dashboard calls `/maintenance/ratings` or similar; wire `VisitRatingService` |
| `AccountantPortalModule` | **Create** `modules/accountantportal/` package; move two classes from `tenantportal` |
| Mapper classes | **Do NOT create** — all mapping is done inline in services, consistent across codebase; forced mapper introduction would be risky and add no value |

---

## 10. Modules Intentionally Not Changed

| Module | Reason |
|---|---|
| `modules/audit` | Already perfectly structured |
| `modules/contractor` | Already perfectly structured |
| `modules/dashboard` | Already perfectly structured |
| `modules/files` | File upload only; no entity or service beyond controller appropriate |
| `modules/inventory` | Already perfectly structured |
| `modules/lookup` | Already perfectly structured |
| `modules/moduleconfig` | Already perfectly structured |
| `modules/notification` | Already perfectly structured |
| `modules/permission` | Already perfectly structured |
| `modules/vacancy` | Already perfectly structured |
| `modules/vendor` | Already perfectly structured |
| `modules/maintenance/company` | Intentional thin alias over ContractorCompanyService; correct design |
| `config/` (Spring configs) | Global — must not be moved into any module |
| `shared/` (exception, response, i18n) | Global — must not be moved into any module |
| `codegen/` | Utility service — not a business module |
| `core/services/` (Frontend) | All services remain in core; moving them to features would create cross-feature import chains |
| `core/guards/`, `core/interceptors/`, `core/models/` (Frontend) | Platform-level — correctly in core |
| `shared/components/` (Frontend) | Used across multiple features; must stay in shared |

---

## Summary of Counts

| Category | Count |
|---|---|
| Backend files to move (package rename) | ~120 |
| Backend new packages to create | ~85 sub-packages |
| Backend classes to create (net new) | 1 (`AccountantPortalModule` wrapper) + potentially `VisitRatingController` |
| Frontend components to move into sub-folders | ~37 |
| Frontend route files to update | 3 (`admin.routes.ts`, `tenant.routes.ts`, `officer.routes.ts`) |
| Modules intentionally not changed (backend) | 11 |
| Zero-risk changes | Backend package moves (only package declarations + imports) |
| Medium-risk changes | `AccountantPortalController` extraction, `VisitRatingController` creation |
