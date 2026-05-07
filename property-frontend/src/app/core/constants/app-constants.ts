import { environment } from '../../../environments/environment';

/**
 * Single map of backend routes and persisted keys (same idea as INTRANET-FE `app-constants`).
 * Paths are relative to {@link ApiService} base URL (`environment.apiUrl`, optional runtime override).
 */
/** Sent on every API request so the backend scopes data to the role the user is acting as (multi-role accounts). */
export const HTTP_HEADERS = {
  ACTIVE_ROLE: 'X-Active-Role',
  SELECTED_PROPERTY_ID: 'X-Selected-Property-Id',
} as const;

export const AppConstants = {
  PERSISTED_KEYS: {
    ACCESS_TOKEN: 'pm_access_token',
    REFRESH_TOKEN: 'pm_refresh_token',
    CURRENT_USER: 'pm_current_user',
  },

  API: {
    baseURL: environment.apiUrl,
    fileBaseURL: environment.fileUrl,

    FILES_UPLOAD: '/files/upload',

    AUTH_LOGIN: '/auth/login',

    USERS_ME_PROPERTY_ACCESS: '/users/me/property-access',

    PROPERTIES: '/properties',
    PROPERTY_BY_ID: (id: number) => `/properties/${id}`,
    PROPERTY_TOGGLE_ACTIVE: (id: number) => `/properties/${id}/toggle-active`,
    PROPERTY_FLOORS: (propertyId: number) => `/properties/${propertyId}/floors`,
    PROPERTY_ATTACHMENTS: (propertyId: number) => `/properties/${propertyId}/attachments`,
    PROPERTY_ATTACHMENT_BY_ID: (propertyId: number, attachmentId: number) =>
      `/properties/${propertyId}/attachments/${attachmentId}`,
    PROPERTY_ATTACHMENT_VIEW: (propertyId: number, attachmentId: number) =>
      `/properties/${propertyId}/attachments/${attachmentId}/view`,
    PROPERTY_ATTACHMENT_DOWNLOAD: (propertyId: number, attachmentId: number) =>
      `/properties/${propertyId}/attachments/${attachmentId}/download`,
    PROPERTY_MAINTENANCE_ASSIGNMENTS: (propertyId: number) => `/properties/${propertyId}/maintenance-assignments`,
    PROPERTY_MAINTENANCE_ASSIGNMENT_END: (propertyId: number, assignmentId: number) =>
      `/properties/${propertyId}/maintenance-assignments/${assignmentId}/end`,
    PROPERTY_MAINTENANCE_CONTRACTS: (propertyId: number) => `/properties/${propertyId}/maintenance-contracts`,

    OWNERS: '/owners',
    OWNER_BY_ID: (id: number) => `/owners/${id}`,
    OWNER_LINK_USER: (id: number) => `/owners/${id}/link-user`,
    OWNERS_OWNER_USERS: '/owners/owner-users',

    UNITS: '/units',
    UNITS_BY_PROPERTY: (propertyId: number) => `/units/property/${propertyId}`,
    UNIT_BY_ID: (id: number) => `/units/${id}`,
    UNIT_RENTAL_STATUS: (id: number, rented: boolean) => `/units/${id}/rental-status?rented=${rented}`,

    TENANTS: '/tenants',
    TENANT_BY_ID: (id: number) => `/tenants/${id}`,
    TENANT_BY_UNIT: (unitId: number) => `/tenants/by-unit/${unitId}`,
    TENANTS_ONBOARD: '/tenants/onboard',
    TENANT_UNLINK_UNIT: (id: number) => `/tenants/${id}/unlink-unit`,

    CONTRACTOR_COMPANIES: '/contractor-companies',
    CONTRACTOR_COMPANY_BY_ID: (id: number) => `/contractor-companies/${id}`,

    HR_EMPLOYEES: '/hr/employees',
    HR_EMPLOYEE_BY_ID: (id: number) => `/hr/employees/${id}`,
    HR_PAYROLL: '/hr/payroll',
    HR_PAYROLL_BY_ID: (id: number) => `/hr/payroll/${id}`,
    HR_PAYROLL_GENERATE: '/hr/payroll/generate',
    HR_PAYROLL_ADVANCES: '/hr/payroll/advances',
    HR_PAYROLL_BONUSES: (payrollId: number) => `/hr/payroll/${payrollId}/bonuses`,
    HR_PAYROLL_PAYSLIP: (payrollId: number, payslipId: number) => `/hr/payroll/${payrollId}/payslips/${payslipId}`,
    HR_PAYROLL_APPROVE: (payrollId: number) => `/hr/payroll/${payrollId}/approve`,
    HR_PAYROLL_MARK_PAID: (payrollId: number) => `/hr/payroll/${payrollId}/mark-paid`,
    HR_LEAVES: '/hr/leaves',
    HR_LEAVES_BALANCES: '/hr/leaves/balances',
    HR_LEAVE_APPROVE: (id: number) => `/hr/leaves/${id}/approve`,
    HR_LEAVE_REJECT: (id: number) => `/hr/leaves/${id}/reject`,
    HR_ATTENDANCE: '/hr/attendance',

    FINANCE_DASHBOARD: '/finance/dashboard',
    FINANCE_EXPENSES: '/finance/expenses',
    FINANCE_REVENUES: '/finance/revenues',
    FINANCE_BUDGETS: '/finance/budgets',
    FINANCE_REPORTS_PNL: '/finance/reports/pnl',
    FINANCE_REPORTS_CASHFLOW: '/finance/reports/cashflow',
    FINANCE_REPORTS_OWNER_STATEMENTS: '/finance/reports/owner-statements',

    MAINTENANCE_REQUESTS: '/maintenance/requests',
    MAINTENANCE_REQUESTS_TENANT: (tenantId: number) => `/maintenance/requests/tenant/${tenantId}`,
    MAINTENANCE_REQUESTS_OFFICER: (officerId: number) => `/maintenance/requests/officer/${officerId}`,
    MAINTENANCE_REQUESTS_COMPANY_QUEUE: '/maintenance/requests/company-queue',
    MAINTENANCE_REQUESTS_OFFICER_OPEN_COUNT: (officerId: number) =>
      `/maintenance/requests/officer/${officerId}/open-count`,
    MAINTENANCE_REQUEST_BY_ID: (id: number) => `/maintenance/requests/${id}`,
    MAINTENANCE_REQUEST_ASSIGN: (id: number) => `/maintenance/requests/${id}/assign`,
    MAINTENANCE_REQUEST_SCHEDULE: (id: number) => `/maintenance/requests/${id}/schedule`,
    MAINTENANCE_REQUEST_CANCEL: (id: number) => `/maintenance/requests/${id}/cancel`,
    MAINTENANCE_VISIT_REPORT: (requestId: number) => `/maintenance/requests/${requestId}/visit-report`,
    MAINTENANCE_REQUEST_START: (id: number) => `/maintenance/requests/${id}/start`,
    MAINTENANCE_REQUEST_ACCEPT_SCHEDULE: (id: number) => `/maintenance/requests/${id}/accept-schedule`,
    MAINTENANCE_REQUEST_REJECT_SCHEDULE: (id: number) => `/maintenance/requests/${id}/reject-schedule`,
    MAINTENANCE_RATING: (requestId: number) => `/maintenance/requests/${requestId}/rating`,
    MAINTENANCE_CATEGORIES: '/maintenance/categories',
    MAINTENANCE_REQUEST_ATTACHMENTS: (requestId: number) => `/maintenance/requests/${requestId}/attachments`,

    USERS: '/users',
    USER_BY_ID: (id: number) => `/users/${id}`,
    USERS_ME: '/users/me',
    USERS_ME_CHANGE_PASSWORD: '/users/me/change-password',
    USERS_TOGGLE_ACTIVE: (id: number) => `/users/${id}/toggle-active`,
    USERS_ROLE: (id: number) => `/users/${id}/role`,
    USERS_MAINTENANCE_ASSIGNABLE_CONTRACTOR: '/users/maintenance-assignable-contractor',

    TENANT_PORTAL_MY_CONTRACT: '/tenant-portal/my-contract',
    TENANT_PORTAL_MY_CONTRACTS: '/tenant-portal/my-contracts',
    TENANT_PORTAL_CONTRACT_BY_ID: (id: number) => `/tenant-portal/contracts/${id}`,
    TENANT_PORTAL_CONTRACT_PAYMENT_SCHEDULE: (id: number) => `/tenant-portal/contracts/${id}/payment-schedule`,
    TENANT_PORTAL_PAYMENT_SCHEDULE_PROOF: (contractId: number, scheduleId: number) =>
      `/tenant-portal/contracts/${contractId}/payment-schedule/${scheduleId}/proof`,
    TENANT_PORTAL_RECEIPTS: '/tenant-portal/receipts',
    TENANT_PORTAL_ADMIN_RECEIPTS_FOR_TENANT: '/tenant-portal/admin/receipts/for-tenant',
    TENANT_PORTAL_CONTRACT_REQUESTS: '/tenant-portal/contract-requests',

    DASHBOARD_STATS: '/dashboard/stats',
    DASHBOARD_STATS_PROPERTY: (propertyId: number) => `/dashboard/stats/property/${propertyId}`,
    DASHBOARD_REQUESTS_BY_STATUS: '/dashboard/requests-by-status',
    DASHBOARD_REQUESTS_BY_CATEGORY: '/dashboard/requests-by-category',
    DASHBOARD_MONTHLY_TREND: '/dashboard/monthly-trend',
    DASHBOARD_RATINGS_SUMMARY: '/dashboard/ratings-summary',
    DASHBOARD_RATINGS_DETAILS: '/dashboard/ratings-details',

    OWNER_PORTAL_DASHBOARD: '/owner-portal/dashboard',
    OWNER_PORTAL_STATEMENTS: '/owner-portal/statements',
    OWNER_PORTAL_PROPERTIES: '/owner-portal/properties',
    OWNER_PORTAL_DRAFT_CONTRACTS: '/owner-portal/draft-contracts',
    OWNER_PORTAL_DRAFT_CONTRACT_UNIT_OPTIONS: (contractId: number) =>
      `/owner-portal/draft-contracts/${contractId}/unit-options`,
    OWNER_PORTAL_DRAFT_CONTRACT_REJECT: (id: number) => `/owner-portal/draft-contracts/${id}/reject`,
    OWNER_PORTAL_DRAFT_CONTRACT_AMEND: (id: number) => `/owner-portal/draft-contracts/${id}/amend`,
    OWNER_PORTAL_PENDING_TERMINATIONS: '/owner-portal/pending-terminations',
    OWNER_PORTAL_CONTRACT_TERMINATION_DECISION: (contractId: number) =>
      `/owner-portal/contracts/${contractId}/termination-decision`,
    OWNER_PORTAL_PENDING_RENEWALS: '/owner-portal/pending-renewals',
    OWNER_PORTAL_CONTRACT_RENEWAL_DECISION: (contractId: number) =>
      `/owner-portal/contracts/${contractId}/renewal-decision`,
    OWNER_PORTAL_PENDING_APPROVALS: '/owner-portal/pending-approvals',
    OWNER_PORTAL_CONTRACT_DECISION: (contractId: number) => `/owner-portal/contracts/${contractId}/decision`,

    LOOKUPS_COUNTRIES: '/lookups/countries',
    LOOKUPS_COUNTRIES_OMAN: '/lookups/countries/oman',
    LOOKUPS_CITIES: '/lookups/cities',
    LOOKUPS_BY_TYPE: '/lookups/by-type',
    LOOKUPS_CLASSIFICATIONS: '/lookups/classifications',
    LOOKUP_BY_ID: (id: number) => `/lookups/${id}`,

    ROLE_PERMISSIONS_ME: '/role-permissions/me',
    ROLE_PERMISSIONS: '/role-permissions',
    ROLE_PERMISSIONS_BY_ROLE: (role: string) => `/role-permissions/${role}`,
    SCREEN_SETTINGS: '/screen-settings',
    SCREEN_SETTING_BY_KEY: (screenKey: string) => `/screen-settings/${screenKey}`,
    PROPERTY_MODULES_ME: '/property-modules/me',
    MODULE_CATALOG_DEFINITIONS: '/module-catalog/definitions',
    MODULE_CATALOG_PRESETS: '/module-catalog/presets',
    PROPERTY_MODULES_BY_PROPERTY: (propertyId: number) => `/property-modules/property/${propertyId}`,

    CONTRACTS: '/contracts',
    CONTRACT_BY_ID: (id: number) => `/contracts/${id}`,
    CONTRACT_RENEWAL_CONTEXT: (id: number) => `/contracts/${id}/renewal-context`,
    CONTRACTS_BY_TENANT: (tenantId: number) => `/contracts/tenant/${tenantId}`,
    CONTRACTS_EXPIRING: '/contracts/expiring',
    CONTRACT_ACTIVATE: (id: number) => `/contracts/${id}/activate`,
    CONTRACT_CANCEL: (id: number) => `/contracts/${id}/cancel`,
    CONTRACT_TERMINATE: (id: number) => `/contracts/${id}/terminate`,
    CONTRACT_CANCEL_TERMINATION_REQUEST: (id: number) => `/contracts/${id}/cancel-termination-request`,
    CONTRACT_RENEW: (id: number) => `/contracts/${id}/renew`,
    CONTRACT_REQUEST_RENEWAL: (id: number) => `/contracts/${id}/request-renewal`,
    CONTRACT_CANCEL_RENEWAL_REQUEST: (id: number) => `/contracts/${id}/cancel-renewal-request`,
    CONTRACT_PAYMENT_SCHEDULE: (contractId: number) => `/contracts/${contractId}/payment-schedule`,
    CONTRACT_TEMPLATES_ACTIVE: '/contract-templates/active',
    CONTRACT_TEMPLATES: '/contract-templates',
    CONTRACT_TEMPLATE_BY_ID: (id: number) => `/contract-templates/${id}`,

    PAYMENTS: '/payments',
    PAYMENTS_BY_CONTRACT: (contractId: number) => `/payments/contract/${contractId}`,
    PAYMENTS_OVERDUE: '/payments/overdue',
    PAYMENTS_PROOFS_PENDING: '/payments/proofs/pending',
    PAYMENT_SCHEDULE_PROOF_REVIEW: (scheduleId: number) => `/payment-schedule/${scheduleId}/proof/review`,
    PAYMENT_SCHEDULE_MARK_PAID: (scheduleId: number) => `/payment-schedule/${scheduleId}/mark-paid`,
    CONTRACT_FEES_BY_CONTRACT: (contractId: number) => `/contract-fees/contract/${contractId}`,
    CONTRACT_FEES: '/contract-fees',

    COMPLAINTS: '/complaints',
    COMPLAINT_ASSIGN: (id: number) => `/complaints/${id}/assign`,
    COMPLAINT_RESOLVE: (id: number) => `/complaints/${id}/resolve`,

    MAINTENANCE_CONTRACTS: '/maintenance-contracts',
    MAINTENANCE_CONTRACT_BY_ID: (id: number) => `/maintenance-contracts/${id}`,
    MAINTENANCE_CONTRACTS_BY_PROPERTY: (propertyId: number) => `/properties/${propertyId}/maintenance-contracts`,
    MAINTENANCE_CONTRACTS_BY_COMPANY: (companyId: number) => `/maintenance-companies/${companyId}/contracts`,
    MAINTENANCE_CONTRACT_ACTIVATE: (id: number) => `/maintenance-contracts/${id}/activate`,
    MAINTENANCE_CONTRACT_TERMINATE: (id: number) => `/maintenance-contracts/${id}/terminate`,
    MAINTENANCE_CONTRACT_GENERATE_MONTHLY_INVOICES: (contractId: number) =>
      `/maintenance-contracts/${contractId}/generate-monthly-invoices`,
    MAINTENANCE_CONTRACT_INVOICES: (contractId: number) => `/maintenance-contracts/${contractId}/invoices`,

    MAINTENANCE_INVOICES: '/maintenance-invoices',
    MAINTENANCE_INVOICE_BY_ID: (id: number) => `/maintenance-invoices/${id}`,
    MAINTENANCE_INVOICES_MY: '/maintenance-invoices/my',
    MAINTENANCE_INVOICES_MY_PROPERTIES: '/maintenance-invoices/my-properties',
    MAINTENANCE_INVOICE_MARK_PAID: (id: number) => `/maintenance-invoices/${id}/mark-paid`,
    MAINTENANCE_INVOICE_CANCEL: (id: number) => `/maintenance-invoices/${id}/cancel`,
    ACCOUNTANT_PORTAL_MAINTENANCE_INVOICES: '/accountant-portal/maintenance-invoices',
    ACCOUNTANT_PORTAL_MAINTENANCE_INVOICE_REVIEW: (id: number) => `/accountant-portal/maintenance-invoices/${id}/review`,

    ACCOUNTANT_PORTAL_RECEIPTS: '/accountant-portal/receipts',
    ACCOUNTANT_PORTAL_RECEIPT_REVIEW: (id: number) => `/accountant-portal/receipts/${id}/review`,
    ACCOUNTANT_PORTAL_RENEWAL_REQUESTS: '/accountant-portal/renewal-requests',
    ACCOUNTANT_PORTAL_RENEWAL_REQUEST_PROCESS: (requestId: number) =>
      `/accountant-portal/renewal-requests/${requestId}/process`,

    INVENTORY: '/inventory',
    INVENTORY_BY_PROPERTY: (propertyId: number) => `/inventory/property/${propertyId}`,
    INVENTORY_LOW_STOCK: '/inventory/low-stock',
    INVENTORY_BY_ID: (id: number) => `/inventory/${id}`,
    INVENTORY_TRANSACTIONS: '/inventory/transactions',

    VACANCIES: '/vacancies',
    VACANCY_INQUIRIES: (listingId: number) => `/vacancies/${listingId}/inquiries`,

    AUDIT_LOGS: '/audit-logs',

    NOTIFICATIONS_MY: '/notifications/my',
    NOTIFICATIONS_MY_UNREAD_COUNT: '/notifications/my/unread-count',
    NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
    NOTIFICATIONS_MY_READ_ALL: '/notifications/my/read-all',
  },
} as const;

/** Skip global overlay for multipart uploads (matches previous interceptor behaviour). */
export function shouldSkipGlobalLoaderForUpload(url: string, method: string): boolean {
  const u = url ?? '';
  const m = (method ?? '').toUpperCase();
  if (u.includes(AppConstants.API.FILES_UPLOAD)) return true;
  return m === 'POST' && u.includes('/properties/') && u.includes('/attachments');
}
