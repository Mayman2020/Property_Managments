# Future Enhancements — Property Management System

**Date:** 2026-05-10  
**Status:** Post-audit backlog — not required for production-candidate release

These items were identified during the final Business/UX Gap Review but are **out of scope** for the current release. Each is classified by domain, impact, and rough effort.

---

## Classification

| Priority | Criteria |
|----------|----------|
| P1 | Significant functional gap that users will notice immediately |
| P2 | Quality-of-life improvement or completion of partial flows |
| P3 | Nice-to-have / future business need |

---

## P1 — High Impact Gaps

### 1. Forgot Password / Account Recovery
**Domain:** Authentication  
**Gap:** No forgot-password link on the login page. No password-reset API endpoint exists in the backend. Users who lose their password must be manually reset by a DBA.  
**Backend needed:** `POST /auth/forgot-password`, `POST /auth/reset-password` with token  
**Frontend needed:** ForgotPasswordComponent, ResetPasswordComponent, email template  
**Effort:** Medium (3–5 days)

### 2. Vacancies — Create & Manage Flow
**Domain:** Vacancies / Marketing  
**Gap:** The `/admin/vacancies` module is fully read-only. There is no UI to create a new vacancy listing, edit an existing one, close a listing, or link it to a unit.  
The backend already has vacancy management endpoints but none of them are wired to a creation or edit form.  
**Frontend needed:** Vacancy create/edit dialog, status management (OPEN → CLOSED), unit linkage  
**Effort:** Medium (2–4 days)

### 3. Tenant Complaint Submission UI
**Domain:** Contracts / Tenant Portal  
**Gap:** Admin users can view complaints at `/admin/contracts/complaints`. Tenants have no UI to file a complaint — there is no submission form in the tenant portal.  
The backend POST endpoint exists (`/contracts/complaints`).  
**Frontend needed:** Complaint form in tenant routes, linked from sidebar  
**Effort:** Small-Medium (1–2 days)

### 4. Owner Approval Workflow
**Domain:** Properties / Owners  
**Gap:** Owners can view statements and properties in their portal, but there is no approval workflow — owners cannot digitally approve/reject proposals (e.g., maintenance budgets, contract renewals). All approvals happen out-of-band.  
**Effort:** Large (requires backend state machine + notification triggers)

---

## P2 — Medium Impact Gaps

### 5. Payslip / Payroll PDF Export
**Domain:** HR / Payroll  
**Gap:** Payroll detail page shows all figures but has no "Download Payslip" or "Print" action. Employees and managers cannot export a formal payslip.  
**Backend needed:** PDF generation endpoint (e.g., using iText or Jasper Reports)  
**Effort:** Medium

### 6. Budget vs. Actual Report
**Domain:** Finance / Reports  
**Gap:** The Finance module has budget entry (`/admin/finance/budget`) and P&L reports, but no side-by-side budget vs. actual comparison view. Finance managers must cross-reference manually.  
**Effort:** Medium (view + chart component)

### 7. Maintenance SLA Enforcement
**Domain:** Maintenance  
**Gap:** Maintenance requests have priority levels (URGENT, HIGH, NORMAL, LOW) but no SLA timers, breach alerts, or escalation logic. High-priority requests can sit unactioned without any automated reminder.  
**Backend needed:** Scheduled job for SLA breach detection + notification  
**Effort:** Medium-Large

### 8. Preventive Maintenance Scheduling
**Domain:** Maintenance  
**Gap:** All current maintenance is reactive (tenant/admin-initiated). There is no recurring schedule for preventive maintenance (e.g., quarterly HVAC service, annual fire-safety inspection).  
**Backend needed:** RecurringMaintenanceSchedule entity, cron trigger  
**Frontend needed:** Schedule management screen  
**Effort:** Large

### 9. Inventory Reorder Alerts
**Domain:** Inventory / Stores  
**Gap:** Inventory items have a `minimumStock` field but no alert is triggered when `currentStock` falls below it. Store managers must manually check stock levels.  
**Backend needed:** Scheduled check + Notification event  
**Effort:** Small-Medium

### 10. Tenant-to-Tenant or Tenant-to-Admin Messaging
**Domain:** Notifications / Communication  
**Gap:** The notification system is one-way (system → user). Tenants and admins have no in-app messaging channel for informal communication (e.g., negotiating a repair date).  
**Effort:** Large (chat infrastructure)

---

## P3 — Low Priority / Future Business Needs

### 11. Payment Gateway Integration
**Domain:** Finance / Rent Collection  
**Gap:** Rent payments are recorded manually. There is no online payment flow (credit card, bank transfer, or mobile wallet). Tenants cannot pay rent through the app.  
**Effort:** Very Large (PCI compliance, gateway integration, reconciliation)

### 12. Digital Document E-Signature
**Domain:** Contracts  
**Gap:** Contract documents are uploaded as static files. There is no e-signature flow for tenants or owners to digitally sign lease agreements.  
**Effort:** Large (third-party e-sign provider integration)

### 13. Multi-Language Tenant Portal
**Domain:** Tenant Portal  
**Gap:** The admin panel has full Arabic/English support via i18n. The tenant portal renders correctly in both languages (translation keys exist) but has not been formally QA'd in Arabic. Some dynamic data labels may render in English only.  
**Effort:** Small (QA + spot fixes)

### 14. Mobile-Responsive Optimization
**Domain:** UI / Frontend  
**Gap:** The application is desktop-first. While Material components are responsive, several data tables, the finance dashboard charts, and the HR workspace do not adapt gracefully to small screens (< 768px).  
**Effort:** Medium (CSS breakpoints + table scrolling)

### 15. Contractor Rating / Feedback System
**Domain:** Maintenance / Contractors  
**Gap:** `ratings-summary` endpoint is referenced in E2E tests (currently skipped — endpoint not implemented). A contractor performance rating system (post-job feedback from admin/tenant) is not yet built.  
**Backend needed:** Rating entity, POST endpoint  
**Frontend needed:** Rating widget on completed request detail  
**Effort:** Medium

### 16. Audit Log UI Enhancements
**Domain:** Admin / Compliance  
**Gap:** The audit log page (`/admin/audit-log`) displays raw log entries. There is no filtering by user, action type, or date range. Export to CSV/Excel is absent.  
**Effort:** Small-Medium (filter controls + export button)

---

## Near-Term Operational Gaps (Prioritized for Phase 3)

These are confirmed backend-ready, documented in `business-gap-review-final.md`:

| # | Gap | Effort | Sprint |
|---|-----|--------|--------|
| A | Vendor Management screen | Small | Sprint 1 |
| B | Property Attachments tab | Small-Medium | Sprint 1 |
| C | Inventory Stock History per item | Small | Sprint 1 |
| D | Payment Proof Review (accountant portal) | Small-Medium | Sprint 1 |
| E | Floor Management (property detail) | Medium | Sprint 2 |
| F | Maintenance Contracts management | Medium | Sprint 2 |
| G | Maintenance Provider Assignments | Medium | Sprint 2 |
| H | Expiring Contracts dedicated list | Small | Sprint 2 |

---

## Implemented During This Audit (Resolved)

The following gaps were identified and **fixed** during the audit and business-review phases:

| Gap | Fix Applied |
|-----|-------------|
| Tenant sidebar missing "Rent Receipts" nav item | Added to `sidebar.component.ts` |
| Owners route missing permission guard | Added `canActivate: [permissionGuard]` in `admin.routes.ts` |
| `FinanceService` Hibernate 6 null-param bug (dashboard, P&L, cashflow) | Dynamic SQL builder applied |
| `HrWorkspaceComponent` unconditional leave-balances API call | Guard added for null `filterPropertyId` |
| HR Attendance screen missing (route + section + nav item) | Added to hr-workspace + admin.routes.ts + sidebar |
| Tenant Complaint submission form missing | New `submit-complaint.component.ts` + route + nav item |
| Overdue Payments screen missing | New `overdue-payments.component.ts` + route + nav item |
