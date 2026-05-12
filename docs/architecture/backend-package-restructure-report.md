# Backend Package Restructure Report

Date: 2026-05-10

Baseline report:

- `docs/cleanup/backend-module-structure-review.md`

Scope implemented in this pass:

- Low-risk modules: `audit`, `lookup`, `vendor`, `contractor`, `inventory`, `vacancy`
- Medium-risk modules: `notification`, `files`, `dashboard`, `permission`, `moduleconfig`

No endpoint paths, DTO fields, entity table mappings, repository methods, Flyway migrations, shared packages, security classes, or config classes were intentionally changed.

## Compile/Test Summary

Baseline:

- `mvnw.cmd -DskipTests compile`: passed after setting `JAVA_HOME=C:\Program Files\Java\jdk-17`

After each module move:

- `audit`: compile passed
- `lookup`: compile passed
- `vendor`: compile passed
- `contractor`: compile passed
- `inventory`: compile passed
- `vacancy`: compile passed
- `files`: compile passed
- `notification`: compile passed
- `dashboard`: compile passed
- `permission`: compile passed
- `moduleconfig`: compile passed

Final verification:

- `mvnw.cmd -DskipTests compile`: passed
- `mvnw.cmd test`: passed
- Test result: 68 tests, 0 failures, 0 errors, 0 skipped

Note: the test suite needed import updates for moved packages. `RentPaymentServiceTest` also needed a mock for the existing `PropertyOwnerPortalRecipientService` dependency so the current service constructor could be injected correctly.

## Moved Files

### audit

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.audit` | `com.propertymanagement.modules.audit.controller` | `AuditLogController.java` |
| `com.propertymanagement.modules.audit` | `com.propertymanagement.modules.audit.service` | `AuditLogService.java`, `AuditAspect.java`, `Auditable.java` |
| `com.propertymanagement.modules.audit` | `com.propertymanagement.modules.audit.repository` | `AuditLogRepository.java` |
| `com.propertymanagement.modules.audit` | `com.propertymanagement.modules.audit.entity` | `AuditLog.java`, `AuditAction.java` |

### lookup

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.lookup` | `com.propertymanagement.modules.lookup.controller` | `LookupController.java` |
| `com.propertymanagement.modules.lookup` | `com.propertymanagement.modules.lookup.service` | `LookupService.java` |
| `com.propertymanagement.modules.lookup` | `com.propertymanagement.modules.lookup.repository` | `LookupRepository.java` |
| `com.propertymanagement.modules.lookup` | `com.propertymanagement.modules.lookup.entity` | `Lookup.java`, `LookupType.java` |
| `com.propertymanagement.modules.lookup.dto` | unchanged | existing DTOs kept in `dto/` |

### vendor

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.vendor` | `com.propertymanagement.modules.vendor.controller` | `VendorController.java` |
| `com.propertymanagement.modules.vendor` | `com.propertymanagement.modules.vendor.service` | `VendorService.java` |
| `com.propertymanagement.modules.vendor` | `com.propertymanagement.modules.vendor.repository` | `VendorRepository.java` |
| `com.propertymanagement.modules.vendor` | `com.propertymanagement.modules.vendor.entity` | `Vendor.java` |
| `com.propertymanagement.modules.vendor.dto` | unchanged | existing DTOs kept in `dto/` |

### contractor

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.contractor` | `com.propertymanagement.modules.contractor.controller` | `ContractorCompanyController.java` |
| `com.propertymanagement.modules.contractor` | `com.propertymanagement.modules.contractor.service` | `ContractorCompanyService.java` |
| `com.propertymanagement.modules.contractor` | `com.propertymanagement.modules.contractor.repository` | `ContractorCompanyRepository.java` |
| `com.propertymanagement.modules.contractor` | `com.propertymanagement.modules.contractor.entity` | `ContractorCompany.java` |
| `com.propertymanagement.modules.contractor.dto` | unchanged | existing DTOs kept in `dto/` |

### inventory

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.inventory` | `com.propertymanagement.modules.inventory.controller` | `InventoryController.java` |
| `com.propertymanagement.modules.inventory` | `com.propertymanagement.modules.inventory.service` | `InventoryService.java` |
| `com.propertymanagement.modules.inventory` | `com.propertymanagement.modules.inventory.repository` | `InventoryRepository.java`, `InventoryTransactionRepository.java` |
| `com.propertymanagement.modules.inventory` | `com.propertymanagement.modules.inventory.entity` | `InventoryItem.java`, `InventoryTransaction.java` |
| `com.propertymanagement.modules.inventory.dto` | unchanged | existing DTOs kept in `dto/` |

### vacancy

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.vacancy` | `com.propertymanagement.modules.vacancy.controller` | `VacancyController.java` |
| `com.propertymanagement.modules.vacancy` | `com.propertymanagement.modules.vacancy.service` | `VacancyService.java` |
| `com.propertymanagement.modules.vacancy` | `com.propertymanagement.modules.vacancy.repository` | `VacancyRepository.java`, `InquiryRepository.java` |
| `com.propertymanagement.modules.vacancy` | `com.propertymanagement.modules.vacancy.entity` | `VacancyListing.java`, `RentalInquiry.java` |
| `com.propertymanagement.modules.vacancy.dto` | unchanged | existing DTOs kept in `dto/` |

### files

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.files` | `com.propertymanagement.modules.files.controller` | `FileUploadController.java` |

### notification

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.notification` | `com.propertymanagement.modules.notification.controller` | `NotificationController.java` |
| `com.propertymanagement.modules.notification` | `com.propertymanagement.modules.notification.service` | `NotificationService.java` |
| `com.propertymanagement.modules.notification` | `com.propertymanagement.modules.notification.repository` | `NotificationRepository.java`, `NotificationTemplateRepository.java` |
| `com.propertymanagement.modules.notification` | `com.propertymanagement.modules.notification.entity` | `Notification.java`, `NotificationTemplate.java`, `NotificationType.java`, `NotificationChannel.java` |
| `com.propertymanagement.modules.notification.dto` | unchanged | existing DTOs kept in `dto/` |

### dashboard

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.dashboard` | `com.propertymanagement.modules.dashboard.controller` | `DashboardController.java` |
| `com.propertymanagement.modules.dashboard` | `com.propertymanagement.modules.dashboard.service` | `DashboardService.java` |
| `com.propertymanagement.modules.dashboard` | `com.propertymanagement.modules.dashboard.dto` | `ChartDataPoint.java`, `DashboardStatsResponse.java` |

### permission

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.permission` | `com.propertymanagement.modules.permission.controller` | `RolePermissionController.java`, `ScreenSettingController.java` |
| `com.propertymanagement.modules.permission` | `com.propertymanagement.modules.permission.service` | `RolePermissionService.java`, `ScreenSettingService.java` |
| `com.propertymanagement.modules.permission` | `com.propertymanagement.modules.permission.repository` | `RolePermissionRepository.java`, `ScreenSettingRepository.java` |
| `com.propertymanagement.modules.permission` | `com.propertymanagement.modules.permission.entity` | `RolePermission.java`, `ScreenSetting.java` |
| `com.propertymanagement.modules.permission.dto` | unchanged | existing DTOs kept in `dto/` |

### moduleconfig

| Old package | New package | Files |
|---|---|---|
| `com.propertymanagement.modules.moduleconfig` | `com.propertymanagement.modules.moduleconfig.controller` | `ModuleCatalogController.java`, `PropertyModuleSettingController.java` |
| `com.propertymanagement.modules.moduleconfig` | `com.propertymanagement.modules.moduleconfig.service` | `ModuleCatalogService.java`, `PropertyModuleSettingService.java`, `PropertyModuleAccessInterceptor.java` |
| `com.propertymanagement.modules.moduleconfig` | `com.propertymanagement.modules.moduleconfig.repository` | `ModuleDefinitionRepository.java`, `ModulePresetRepository.java`, `ModulePresetItemRepository.java`, `PropertyModuleSettingRepository.java` |
| `com.propertymanagement.modules.moduleconfig` | `com.propertymanagement.modules.moduleconfig.entity` | `ModuleDefinition.java`, `ModulePreset.java`, `ModulePresetItem.java`, `PropertyModuleSetting.java` |
| `com.propertymanagement.modules.moduleconfig.dto` | unchanged | existing DTOs kept in `dto/` |

## Imports Updated

Imports were updated across production and test code for moved package references, including:

- `auth/AuthService.java`
- `config/WebMvcConfig.java`
- high-risk modules that reference moved dependencies, such as `contract`, `maintenance`, `property`, `tenant`, `unit`, `user`, `owner`, `hr`
- tests for `inventory`, `notification`, `maintenance`, `contract`, and `hr`

Only import/package declarations were changed for dependency alignment.

## Modules Intentionally Skipped

These high-risk modules were not restructured in this pass:

- `contract`
- `maintenance`
- `tenant`
- `tenantportal`
- `ownerportal`
- `finance`
- `hr`
- `user`
- `property`
- `unit`
- `owner`
- `complaint`
- `auth`

Reason:

These modules are high-churn or central dependency hubs. Moving them in the same batch as the low/medium modules would create a large blast radius and make review harder. The baseline report already recommends handling them only after the low/medium moves compile and tests pass.

Recommended next phase:

Move one high-risk sub-feature at a time, starting with internally isolated subpackages such as:

- `contract.template`
- `contract.fee`
- `maintenance.category`
- `maintenance.rating`
- `property.attachment`

Run `mvnw.cmd -DskipTests compile` and `mvnw.cmd test` after each sub-feature.

## What Was Not Changed

- No endpoints were renamed.
- No request or response DTO fields were changed.
- No database table names or entity mappings were changed.
- No Flyway migrations were added, removed, or edited.
- No shared/security/config classes were moved.
- No business logic was removed.
- No dead code was deleted.

## Phase 2B Naming Standardization

Scope implemented:

- Low-risk modules completed: `audit`, `lookup`, `vendor`, `contractor`, `inventory`, `vacancy`
- Medium-risk modules completed: `notification`, `files`, `dashboard`, `permission`, `moduleconfig`
- High-risk modules scanned only and documented in `docs/architecture/backend-naming-standardization-checklist.md`

Rules preserved for every rename below:

- Entity table mapping changed: NO
- Endpoint path changed: NO
- DTO fields changed: NO
- Business logic changed: NO
- Flyway migrations changed: NO

### Renamed Classes

| Module | Old class name | New class name | Old package | New package | Reason | Compile result |
|---|---|---|---|---|---|---|
| `audit` | `AuditLog` | `AuditLogEntity` | `com.propertymanagement.modules.audit.entity` | `com.propertymanagement.modules.audit.entity` | JPA entity suffix standardization | passed |
| `audit` | `AuditAction` | `AuditActionType` | `com.propertymanagement.modules.audit.entity` | `com.propertymanagement.modules.audit.entity` | enum/type suffix standardization | passed |
| `lookup` | `Lookup` | `LookupEntity` | `com.propertymanagement.modules.lookup.entity` | `com.propertymanagement.modules.lookup.entity` | JPA entity suffix standardization | passed |
| `lookup` | `CreateCityRequest` | `CreateCityRequestDTO` | `com.propertymanagement.modules.lookup.dto` | `com.propertymanagement.modules.lookup.dto` | request DTO suffix standardization | passed |
| `lookup` | `CreateClassificationRequest` | `CreateClassificationRequestDTO` | `com.propertymanagement.modules.lookup.dto` | `com.propertymanagement.modules.lookup.dto` | request DTO suffix standardization | passed |
| `lookup` | `CreateCountryRequest` | `CreateCountryRequestDTO` | `com.propertymanagement.modules.lookup.dto` | `com.propertymanagement.modules.lookup.dto` | request DTO suffix standardization | passed |
| `lookup` | `LookupResponse` | `LookupResponseDTO` | `com.propertymanagement.modules.lookup.dto` | `com.propertymanagement.modules.lookup.dto` | response DTO suffix standardization | passed |
| `lookup` | `UpdateLookupRequest` | `UpdateLookupRequestDTO` | `com.propertymanagement.modules.lookup.dto` | `com.propertymanagement.modules.lookup.dto` | request DTO suffix standardization | passed |
| `vendor` | `Vendor` | `VendorEntity` | `com.propertymanagement.modules.vendor.entity` | `com.propertymanagement.modules.vendor.entity` | JPA entity suffix standardization | passed |
| `vendor` | `VendorRequest` | `VendorRequestDTO` | `com.propertymanagement.modules.vendor.dto` | `com.propertymanagement.modules.vendor.dto` | request DTO suffix standardization | passed |
| `vendor` | `VendorResponse` | `VendorResponseDTO` | `com.propertymanagement.modules.vendor.dto` | `com.propertymanagement.modules.vendor.dto` | response DTO suffix standardization | passed |
| `contractor` | `ContractorCompany` | `ContractorCompanyEntity` | `com.propertymanagement.modules.contractor.entity` | `com.propertymanagement.modules.contractor.entity` | JPA entity suffix standardization | passed |
| `contractor` | `ContractorCompanyRequest` | `ContractorCompanyRequestDTO` | `com.propertymanagement.modules.contractor.dto` | `com.propertymanagement.modules.contractor.dto` | request DTO suffix standardization | passed |
| `contractor` | `ContractorCompanyResponse` | `ContractorCompanyResponseDTO` | `com.propertymanagement.modules.contractor.dto` | `com.propertymanagement.modules.contractor.dto` | response DTO suffix standardization | passed |
| `inventory` | `InventoryItem` | `InventoryItemEntity` | `com.propertymanagement.modules.inventory.entity` | `com.propertymanagement.modules.inventory.entity` | JPA entity suffix standardization | passed |
| `inventory` | `InventoryTransaction` | `InventoryTransactionEntity` | `com.propertymanagement.modules.inventory.entity` | `com.propertymanagement.modules.inventory.entity` | JPA entity suffix standardization | passed |
| `inventory` | `BulkTransactionRequest` | `BulkTransactionRequestDTO` | `com.propertymanagement.modules.inventory.dto` | `com.propertymanagement.modules.inventory.dto` | request DTO suffix standardization | passed |
| `inventory` | `InventoryItemRequest` | `InventoryItemRequestDTO` | `com.propertymanagement.modules.inventory.dto` | `com.propertymanagement.modules.inventory.dto` | request DTO suffix standardization | passed |
| `inventory` | `InventoryItemResponse` | `InventoryItemResponseDTO` | `com.propertymanagement.modules.inventory.dto` | `com.propertymanagement.modules.inventory.dto` | response DTO suffix standardization | passed |
| `inventory` | `InventoryTransactionResponse` | `InventoryTransactionResponseDTO` | `com.propertymanagement.modules.inventory.dto` | `com.propertymanagement.modules.inventory.dto` | response DTO suffix standardization | passed |
| `inventory` | `StockTransactionRequest` | `StockTransactionRequestDTO` | `com.propertymanagement.modules.inventory.dto` | `com.propertymanagement.modules.inventory.dto` | request DTO suffix standardization | passed |
| `vacancy` | `VacancyListing` | `VacancyListingEntity` | `com.propertymanagement.modules.vacancy.entity` | `com.propertymanagement.modules.vacancy.entity` | JPA entity suffix standardization | passed |
| `vacancy` | `RentalInquiry` | `RentalInquiryEntity` | `com.propertymanagement.modules.vacancy.entity` | `com.propertymanagement.modules.vacancy.entity` | JPA entity suffix standardization | passed |
| `vacancy` | `RentalInquiryResponse` | `RentalInquiryResponseDTO` | `com.propertymanagement.modules.vacancy.dto` | `com.propertymanagement.modules.vacancy.dto` | response DTO suffix standardization | passed |
| `vacancy` | `VacancyListingResponse` | `VacancyListingResponseDTO` | `com.propertymanagement.modules.vacancy.dto` | `com.propertymanagement.modules.vacancy.dto` | response DTO suffix standardization | passed |
| `notification` | `Notification` | `NotificationEntity` | `com.propertymanagement.modules.notification.entity` | `com.propertymanagement.modules.notification.entity` | JPA entity suffix standardization | passed |
| `notification` | `NotificationTemplate` | `NotificationTemplateEntity` | `com.propertymanagement.modules.notification.entity` | `com.propertymanagement.modules.notification.entity` | JPA entity suffix standardization | passed |
| `notification` | `NotificationChannel` | `NotificationChannelType` | `com.propertymanagement.modules.notification.entity` | `com.propertymanagement.modules.notification.entity` | enum/type suffix standardization | passed |
| `notification` | `NotificationResponse` | `NotificationResponseDTO` | `com.propertymanagement.modules.notification.dto` | `com.propertymanagement.modules.notification.dto` | response DTO suffix standardization | passed |
| `notification` | `NotificationSendRequest` | `NotificationSendRequestDTO` | `com.propertymanagement.modules.notification.dto` | `com.propertymanagement.modules.notification.dto` | request DTO suffix standardization | passed |
| `dashboard` | `ChartDataPoint` | `ChartDataPointDTO` | `com.propertymanagement.modules.dashboard.dto` | `com.propertymanagement.modules.dashboard.dto` | DTO suffix standardization | passed |
| `dashboard` | `DashboardStatsResponse` | `DashboardStatsResponseDTO` | `com.propertymanagement.modules.dashboard.dto` | `com.propertymanagement.modules.dashboard.dto` | response DTO suffix standardization | passed |
| `permission` | `RolePermission` | `RolePermissionEntity` | `com.propertymanagement.modules.permission.entity` | `com.propertymanagement.modules.permission.entity` | JPA entity suffix standardization | passed |
| `permission` | `ScreenSetting` | `ScreenSettingEntity` | `com.propertymanagement.modules.permission.entity` | `com.propertymanagement.modules.permission.entity` | JPA entity suffix standardization | passed |
| `permission` | `RolePermissionResponse` | `RolePermissionResponseDTO` | `com.propertymanagement.modules.permission.dto` | `com.propertymanagement.modules.permission.dto` | response DTO suffix standardization | passed |
| `permission` | `RolePermissionUpdateRequest` | `RolePermissionUpdateRequestDTO` | `com.propertymanagement.modules.permission.dto` | `com.propertymanagement.modules.permission.dto` | request DTO suffix standardization | passed |
| `permission` | `ScreenSettingResponse` | `ScreenSettingResponseDTO` | `com.propertymanagement.modules.permission.dto` | `com.propertymanagement.modules.permission.dto` | response DTO suffix standardization | passed |
| `permission` | `ScreenSettingUpdateRequest` | `ScreenSettingUpdateRequestDTO` | `com.propertymanagement.modules.permission.dto` | `com.propertymanagement.modules.permission.dto` | request DTO suffix standardization | passed |
| `moduleconfig` | `ModuleDefinition` | `ModuleDefinitionEntity` | `com.propertymanagement.modules.moduleconfig.entity` | `com.propertymanagement.modules.moduleconfig.entity` | JPA entity suffix standardization | passed |
| `moduleconfig` | `ModulePreset` | `ModulePresetEntity` | `com.propertymanagement.modules.moduleconfig.entity` | `com.propertymanagement.modules.moduleconfig.entity` | JPA entity suffix standardization | passed |
| `moduleconfig` | `ModulePresetItem` | `ModulePresetItemEntity` | `com.propertymanagement.modules.moduleconfig.entity` | `com.propertymanagement.modules.moduleconfig.entity` | JPA entity suffix standardization | passed |
| `moduleconfig` | `PropertyModuleSetting` | `PropertyModuleSettingEntity` | `com.propertymanagement.modules.moduleconfig.entity` | `com.propertymanagement.modules.moduleconfig.entity` | JPA entity suffix standardization | passed |
| `moduleconfig` | `ModuleDefinitionResponse` | `ModuleDefinitionResponseDTO` | `com.propertymanagement.modules.moduleconfig.dto` | `com.propertymanagement.modules.moduleconfig.dto` | response DTO suffix standardization | passed |
| `moduleconfig` | `ModulePresetResponse` | `ModulePresetResponseDTO` | `com.propertymanagement.modules.moduleconfig.dto` | `com.propertymanagement.modules.moduleconfig.dto` | response DTO suffix standardization | passed |
| `moduleconfig` | `PropertyModuleSettingResponse` | `PropertyModuleSettingResponseDTO` | `com.propertymanagement.modules.moduleconfig.dto` | `com.propertymanagement.modules.moduleconfig.dto` | response DTO suffix standardization | passed |
| `moduleconfig` | `PropertyModuleSettingsUpdateRequest` | `PropertyModuleSettingsUpdateRequestDTO` | `com.propertymanagement.modules.moduleconfig.dto` | `com.propertymanagement.modules.moduleconfig.dto` | request DTO suffix standardization | passed |

### Imports Updated

All production and test imports referencing the renamed classes were updated. JPQL/HQL entity-name references were included in the replacement pass where the old Java entity class name appeared directly.

### Modules Intentionally Deferred

The following modules were scanned but not changed in Phase 2B because they are high-risk or outside the requested low/medium implementation scope:

- `auth`
- `complaint`
- `contract`
- `finance`
- `hr`
- `maintenance`
- `owner`
- `ownerportal`
- `property`
- `tenant`
- `tenantportal`
- `unit`
- `user`

See `docs/architecture/backend-naming-standardization-checklist.md` for the exact class-level checklist.
