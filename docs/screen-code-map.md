# خريطة الشاشات والكود والجداول

آخر تحديث: 2026-05-10

## ملاحظات تنظيف

- تم حذف شاشة المستأجر القديمة `property-frontend/src/app/features/tenant/my-contract` لأنها غير محملة من أي route. المسار القديم `/tenant/my-contract` مازال redirect إلى `/tenant/my-contracts` للحفاظ على أي روابط قديمة.
- تم تعديل زر الرجوع في `contract-request` ليذهب مباشرة إلى `/tenant/my-contracts`.
- لم يتم حذف `rent_receipts` أو كلاساته لأنها مازالت مستخدمة في مسار المحاسب ورفع إيصال بواسطة الموظف: `AccountantPortalService`, `TenantPortalService`, `RentReceiptRepository`, و `staff-upload-receipt-dialog`.
- لم يتم حذف ملفات أو جداول عليها اعتماد غير مباشر أو مستخدمة في أكثر من شاشة. أي تنظيف أكبر يحتاج قرار business واضح لأنه ممكن يكسر flow موجود.

## التنظيم العام

### Frontend

- `src/app/core`: الخدمات المشتركة، guards، interceptors، constants، i18n helpers.
- `src/app/layout`: القالب العام، sidebar، topbar.
- `src/app/shared`: مكونات مشتركة مثل upload zone و reusable UI.
- `src/app/features`: كل شاشة أو مجموعة شاشات حسب المجال: `tenant`, `maintenance`, `contracts`, `accountant`, `finance`, `hr`, وهكذا.

### Backend

- `src/main/java/com/propertymanagement/modules`: كل business module في فولدر مستقل.
- `auth`, `user`, `permission`: الدخول والصلاحيات.
- `property`, `unit`, `tenant`, `owner`: بيانات العقار والوحدات والمستأجرين والمالكين.
- `contract`, `tenantportal`, `ownerportal`: العقود، مدفوعات الإيجار، طلبات المستأجر والمالك.
- `maintenance`: طلبات الصيانة، الزيارات، الشركات، الفواتير.
- `finance`, `hr`, `inventory`, `lookup`, `notification`, `audit`: المجالات الداعمة.

## خريطة الشاشات

| الشاشة / المسار | Frontend | Backend | الجداول |
|---|---|---|---|
| تسجيل الدخول `/auth/login` | `features/auth/login`, `core/services/auth.service.ts` | `modules/auth/AuthController`, `AuthService`, `UserDetailsServiceImpl`; `modules/user/UserRepository` | `users` |
| تغيير كلمة المرور `/change-password` | `features/change-password`, `core/services/auth.service.ts` | `modules/auth/AuthController`, `AuthService` | `users` |
| الرئيسية للإدارة `/admin/home` | `features/home-portal` | يعتمد على خدمات dashboard والملخصات | حسب الكروت المعروضة |
| Dashboard `/admin/dashboard` | `features/dashboard`, `core/services/dashboard.service.ts` | `modules/dashboard/DashboardController`, `DashboardService` | `properties`, `units`, `tenants`, `maintenance_requests`, `lease_contracts`, `rent_payment_schedule` |
| العقارات `/admin/properties` | `features/properties/property-list` | `modules/property/PropertyController`, `PropertyService`, `FloorController`, `PropertyAttachmentController` | `properties`, `floors`, `property_attachments`, `owners` |
| الوحدات `/admin/units` | `features/units` | `modules/unit/UnitController`, `UnitService`; `modules/property/PropertyService` | `units`, `properties`, `floors` |
| المستأجرين `/admin/tenants` | `features/tenants` | `modules/tenant/TenantController`, `TenantService`, `TenantOnboardingService` | `tenants`, `users`, `units`, `lease_contracts`, `rent_receipts` |
| المالكين `/admin/owners` | `features/owners` | `modules/owner/OwnerController`, `OwnerService` | `owners`, `properties`, `user_property_access` |
| طلبات الصيانة إدارة `/admin/maintenance` | `features/maintenance/request-list`, `request-detail`, `request-form` | `modules/maintenance/request/MaintenanceRequestController`, `MaintenanceRequestService` | `maintenance_requests`, `request_attachments`, `maintenance_categories`, `units`, `properties` |
| طلب صيانة جديد `/admin/maintenance/new`, `/tenant/new-request` | `features/maintenance/request-form` | `MaintenanceRequestController`, `MaintenanceRequestService`, `MaintenanceCategoryController` | `maintenance_requests`, `request_attachments`, `maintenance_categories` |
| تفاصيل طلب الصيانة `/admin/maintenance/:id`, `/tenant/requests/:id`, `/officer/requests/:id` | `features/maintenance/request-detail` | `MaintenanceRequestController`, `MaintenanceInvoiceController`, `VisitReportRepository` | `maintenance_requests`, `request_attachments`, `visit_reports`, `visit_report_items`, `maintenance_invoices` |
| تقرير الزيارة `/officer/requests/:id/visit-report` | `features/maintenance/visit-report-form` | `modules/maintenance/visit`, `MaintenanceRequestService` | `visit_reports`, `visit_report_items`, `maintenance_requests` |
| جدول موظف الصيانة `/officer/schedule` | `features/officer/officer-schedule` | `MaintenanceRequestController`, `MaintenanceRequestService` | `maintenance_requests`, `visit_reports` |
| قائمة الشركات `/officer/company-queue` | `features/officer/company-queue` | `modules/maintenance/company`, `modules/maintenance/assignment` | `contractor_companies`, `maintenance_providers`, `property_maintenance_assignments` |
| فواتير الصيانة للموظف `/officer/invoices` | `features/officer/invoice-portal` | `modules/maintenance/invoice`, `modules/maintenance/contractinvoice` | `maintenance_invoices`, `maintenance_contract_invoices` |
| المخزون `/admin/inventory` | `features/inventory/inventory-list` | `modules/inventory/InventoryController`, `InventoryService` | `inventory_items`, `inventory_transactions` |
| التقارير `/admin/reports` | `features/reports` | `DashboardService`, `FinanceService`, خدمات العقود والصيانة حسب التقرير | جداول التقارير حسب النوع |
| المستخدمين `/admin/users` | `features/users/user-management` | `modules/user/UserController`, `UserService` | `users`, `tenants`, `owners`, `user_property_access` |
| صلاحيات المستخدم `/admin/user-access` | `features/users/user-access-management` | `UserController`, `UserService`, `OwnerPropertyAccessService` | `users`, `user_property_access`, `properties` |
| الشاشات `/admin/screens` | `features/permissions/screen-management` | `modules/permission/ScreenSettingController`, `ScreenSettingService` | `screen_settings` |
| الصلاحيات `/admin/permissions` | `features/permissions/permission-management` | `modules/permission/RolePermissionController`, `RolePermissionService` | `role_permissions` |
| إعدادات الموديولات `/admin/module-settings` | `features/permissions/module-management` | `modules/moduleconfig` controllers/services | `property_module_settings`, `module_definitions`, `module_presets`, `module_preset_items` |
| القوائم `/admin/lookups` | `features/lookups` | `modules/lookup/LookupController`, `LookupService` | `lookups` |
| التقييمات `/admin/ratings` | `features/ratings` | `modules/maintenance/rating/VisitRatingService` | `visit_ratings`, `visit_reports`, `maintenance_requests` |
| المقاولين `/admin/contractors` | `features/contractors` | `modules/contractor/ContractorCompanyController`, `ContractorCompanyService` | `contractor_companies` |
| الإشعارات `/admin/notifications`, `/tenant/notifications` | `features/notifications`, `core/services/notification.service.ts` | `modules/notification/NotificationController`, `NotificationService` | `notifications`, `notification_templates` |
| سجل التدقيق `/admin/audit-log` | `features/audit` | `modules/audit/AuditLogController`, `AuditLogService` | `audit_logs` |
| الملف الشخصي `/admin/profile`, `/tenant/profile`, `/officer/profile` | `features/profile` | `modules/user/UserController`, `UserService` | `users` |
| الموارد البشرية `/admin/hr/*` | `features/hr/hr-workspace` | `modules/hr/employee`, `attendance`, `leave`, `payroll` | `employees`, `attendance`, `leave_requests`, `payroll_runs`, `payslips`, `salary_advances`, `employee_bonuses` |
| المالية `/admin/finance/*` | `features/finance` | `modules/finance/FinanceController`, `FinanceService` | `expenses`, `expense_categories`, `other_revenues`, `budgets`, `owner_statements`, `rent_payment_schedule`, `rent_payments` |
| الشواغر `/admin/vacancies/*` | `features/vacancies` | `modules/vacancy/VacancyController`, `VacancyService` | `vacancy_listings`, `rental_inquiries`, `units`, `properties` |
| بوابة المالك `/admin/owner-portal/*` | `features/owner-portal` | `modules/ownerportal/OwnerPortalController`, `OwnerPortalService` | `owner_statements`, `owners`, `properties`, `lease_contracts` |
| موافقات عقود المالك `/admin/owner-portal/contract-approvals` | `features/owner/contract-approvals` | `modules/contract/lease/OwnerApprovalController`, `OwnerApprovalService` | `lease_contracts`, `owners`, `notifications` |
| بوابة المحاسب: تأكيد الإيجار `/admin/accountant-portal/rent-confirmation` | `features/accountant/rent-confirmation`, `staff-upload-receipt-dialog` | `modules/contract/payment/RentPaymentController`, `RentPaymentService`; `modules/tenantportal/AccountantPortalController`, `AccountantPortalService` | `rent_payment_schedule`, `rent_payments`, `rent_receipts`, `lease_contracts`, `tenants`, `notifications` |
| بوابة المحاسب: طلبات التجديد `/admin/accountant-portal/renewal-requests` | `features/accountant/renewal-requests` | `modules/tenantportal/TenantPortalController`, `TenantPortalService`; `modules/contract/renewal` | `contract_action_requests`, `contract_renewals`, `lease_contracts`, `notifications` |
| بوابة المحاسب: فواتير الصيانة `/admin/accountant-portal/maintenance-invoices` | `features/accountant/maintenance-invoices` | `modules/maintenance/invoice`, `modules/maintenance/contractinvoice` | `maintenance_invoices`, `maintenance_contract_invoices` |
| العقود Dashboard `/admin/contracts/dashboard` | `features/contracts/contracts-dashboard` | `modules/contract/lease`, `modules/contract/payment`, `modules/complaint` | `lease_contracts`, `rent_payment_schedule`, `rent_payments`, `tenant_complaints` |
| قائمة العقود `/admin/contracts/list` | `features/contracts/contract-list` | `LeaseContractController`, `LeaseContractService` | `lease_contracts`, `contract_fees`, `properties`, `units`, `tenants`, `owners` |
| تفاصيل العقد `/admin/contracts/:id`, `/tenant/contracts/:id` | `features/contracts/contract-detail`, `features/tenant/tenant-contract-detail` | `LeaseContractController`, `RentPaymentController`, `ContractFeeService` | `lease_contracts`, `contract_fees`, `rent_payment_schedule`, `rent_payments` |
| تجديد العقد `/admin/contracts/:id/renew` | `features/contracts/contract-renewal-form` | `modules/contract/renewal/ContractRenewalService`, `LeaseContractService` | `contract_renewals`, `lease_contracts` |
| قوالب العقود `/admin/contracts/templates` | `features/contracts/contract-templates` | `modules/contract/template` | `contract_templates` |
| شكاوى العقود `/admin/contracts/complaints` | `features/contracts/complaints-list` | `modules/complaint/TenantComplaintController`, `TenantComplaintService` | `tenant_complaints` |
| وحدتي `/tenant/my-unit` | `features/tenant/tenant-dashboard` | `modules/tenant/TenantPortalWelcomeService`, `TenantController`, `UnitController` | `tenants`, `units`, `properties`, `lease_contracts` |
| عقودي `/tenant/my-contracts` | `features/tenant/my-contracts` | `modules/tenantportal/TenantPortalController`, `TenantPortalService`; `LeaseContractController` | `lease_contracts`, `tenants`, `units`, `properties` |
| إيصالات الإيجار `/tenant/rent-receipts` | `features/tenant/rent-receipts` | `modules/contract/payment/RentPaymentController`, `RentPaymentService` | `rent_payment_schedule`, `rent_payments`, `lease_contracts`, `notifications` |
| طلبات العقود `/tenant/contract-request` | `features/tenant/contract-request` | `modules/tenantportal/TenantPortalController`, `TenantPortalService` | `contract_action_requests`, `lease_contracts`, `notifications` |
| شكاوى المستأجر `/tenant/complaints` | `features/tenant/submit-complaint` | `modules/complaint/TenantComplaintController`, `TenantComplaintService` | `tenant_complaints`, `lease_contracts`, `tenants` |
| طلبات الصيانة للمستأجر `/tenant/requests` | `features/maintenance/request-list` مع context tenant | `MaintenanceRequestController`, `MaintenanceRequestService` | `maintenance_requests`, `request_attachments`, `units`, `properties` |

## عناصر موجودة لكن يجب عدم حذفها الآن

- `rent_receipts`: جدول legacy لكنه لا يزال يخدم رفع الموظف ومراجعة المحاسب.
- `tenant-portal` backend module: اسمه عام لكنه يجمع وظائف Portal للمستأجر والمحاسب حاليا. إعادة تقسيمه ممكنة لاحقا إلى `tenantportal` و `accountantportal` لكنها refactor كبير.
- `features/maintenance`: مستخدم من الإدارة والمستأجر والموظف، لذلك لا ينقل لفولدر role واحد.
- `features/profile` و `features/notifications`: مشتركة بين أكثر من role.

## اقتراح تنظيم لاحق

- فصل `tenantportal/AccountantPortalController` و `AccountantPortalService` إلى module مستقل `accountantportal` إذا كان الهدف وضوح أكبر في الباك.
- توحيد شاشة إيصالات الإيجار على `rent_payment_schedule` بالكامل ثم حذف legacy `rent_receipts` بعد إلغاء endpoints القديمة وتحديث شاشة المحاسب.
- نقل DTOs الكثيرة داخل كل module إلى فولدر `dto` لو أصبح حجمها أكبر من كلاس أو اثنين.
