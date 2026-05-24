import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import {
  loadDocData,
  ROLES,
  ROLE_DESCRIPTIONS,
  BACKEND_MODULES,
  SCHEDULERS
} from './lib/load-doc-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'stabilization', 'deliverables');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlWrap(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1a202c; margin: 1in; }
  h1 { font-size: 22pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px; page-break-before: always; }
  h1:first-of-type { page-break-before: auto; }
  h2 { font-size: 16pt; color: #2c5282; margin-top: 24px; }
  h3 { font-size: 13pt; color: #2d3748; margin-top: 16px; }
  h4 { font-size: 11.5pt; color: #4a5568; margin-top: 12px; }
  p { margin: 8px 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e0; padding: 6px 8px; vertical-align: top; }
  th { background: #edf2f7; font-weight: bold; }
  pre, code { font-family: Consolas, 'Courier New', monospace; font-size: 9pt; background: #f7fafc; }
  pre { padding: 10px; border: 1px solid #e2e8f0; white-space: pre-wrap; margin: 10px 0; }
  ul, ol { margin: 8px 0 8px 24px; }
  .cover { text-align: center; margin-top: 120px; }
  .cover h1 { border: none; font-size: 28pt; page-break-before: auto; }
  .meta { color: #718096; font-size: 10pt; }
  .toc-note { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 10px; margin: 16px 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function table(headers, rows) {
  const th = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function mermaid(title, code) {
  return `<h4>${esc(title)}</h4><pre>${esc(code)}</pre><p class="meta">Diagram source (Mermaid). Render with Mermaid CLI or compatible viewer.</p>`;
}

async function writeDocx(html, filename) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, filename);
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: false } },
    footer: true,
    pageNumber: true
  });
  fs.writeFileSync(outPath, buffer);
  console.log(`[generate-four-documents] ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  return outPath;
}

// ─── Business document ───────────────────────────────────────────────────────

function buildBusinessHtml(d) {
  const parts = [];
  parts.push(`<div class="cover"><h1>Property Management System</h1><h2>Full Business Document</h2>
<p class="meta">Version: Stabilization Release | Generated: ${esc(d.generatedAt)}<br/>
QA Effective Readiness: ${esc(d.metrics.readiness)} | Effective Cases: ${d.metrics.effectiveQaRows}</p></div>`);

  parts.push(`<div class="toc-note"><strong>Table of Contents:</strong> In Microsoft Word, use References → Table of Contents → Automatic Table 1 (headings H1–H3 are styled below).</div>`);

  parts.push(`<h1>1. Executive Summary</h1>
<p>The Property Management System is an integrated bilingual (Arabic/English) platform for managing residential and commercial property portfolios, lease contracts, rent collection, maintenance operations, tenant and owner portals, finance, HR/payroll, notifications, and operational reporting. The system was validated through 24 Playwright QA iterations (0–23) comprising ${d.metrics.rawQaRows} executed test records and ${d.metrics.effectiveQaRows} effective unique cases with <strong>0 Failed, 0 Blocked, and 0 Deferred</strong> at closure (iteration 23).</p>
<p>Production readiness is assessed at <strong>${esc(d.metrics.readiness)}</strong> based on EffectiveStatus deduplication in the QA Excel report. All 93 notification types in the catalog have verified service emitters and were exercised through real API business flows—not synthetic notification injection.</p>`);

  parts.push(`<h1>2. System Overview</h1>
<p>The platform consists of a Spring Boot REST API (${esc(d.stack.apiBase)}) and an Angular single-page application (${esc(d.stack.webBase)}). PostgreSQL stores all transactional data under schema <code>property_mgmt</code>. Users authenticate via JWT and receive role-based permissions and property scope constraints.</p>
${table(['Component', 'Technology', 'Purpose'], [
  ['Backend API', d.stack.backend, 'Business logic, schedulers, notifications, RBAC'],
  ['Frontend SPA', d.stack.frontend, 'Admin, owner, tenant, officer, employee portals'],
  ['Database', d.stack.database, 'Transactional persistence; Flyway migrations'],
  ['Authentication', d.stack.auth, 'Login, refresh, account lock, new-login alerts'],
  ['QA Harness', d.stack.qa, 'End-to-end verification against live stack']
])}`);

  parts.push(`<h1>3. Business Objectives</h1><ul>
<li>Centralize property, unit, owner, and tenant master data with document attachments.</li>
<li>Manage full lease lifecycle from draft through activation, renewal, termination, and unit clearance.</li>
<li>Automate rent schedules, payment proof review, overdue handling, and late-fee escalation.</li>
<li>Coordinate maintenance requests, provider assignments, contracts, and invoice payment plans.</li>
<li>Provide owner and tenant self-service portals with approval workflows.</li>
<li>Support HR (employees, leaves, deductions) and payroll generation, approval, and payment.</li>
<li>Deliver operational notifications with localized messages and deep-link navigation.</li>
<li>Enable finance (expenses, budgets, revenue) and reporting for accountants and managers.</li>
</ul>`);

  parts.push(`<h1>4. Stakeholders</h1>${table(['Stakeholder', 'Interaction'], [
  ['Property management company staff', 'SUPER_ADMIN, GENERAL_MANAGER — full operations'],
  ['Accountants', 'Rent, expenses, budgets, payroll approval, owner statements'],
  ['HR officers', 'Employees, leaves, deduction submission'],
  ['Maintenance staff / contractors', 'Request fulfillment, contracts, invoices'],
  ['Property owners', 'Portal approvals: drafts, renewals, terminations, maintenance contracts'],
  ['Tenants', 'Portal: payments, requests, complaints, inspections'],
  ['Auditors / compliance', 'Audit log, permission matrix, QA evidence in stabilization package']
])}`);

  parts.push(`<h1>5. User Types</h1><p>Eleven distinct system roles are implemented and verified in QA:</p>
${table(['Role', 'Business description'], ROLES.map((r) => [r, ROLE_DESCRIPTIONS[r]]))}`);

  parts.push(`<h1>6. Complete Business Roles</h1>
<p>Each role maps to a <code>UserRole</code> enum value. Multi-role users may switch active role via <code>X-Active-Role</code> header. Property-scoped roles (ACCOUNTANT, HR, maintenance officers, OWNER) receive property access via <code>user_property_access</code> and/or owner linkage.</p>
<p>OWNER users linked to multiple owner records receive aggregated property scope (verified iteration 23). TENANT users are linked to tenant records and see tenant-portal modules only.</p>`);

  parts.push(`<h1>7. Business Rules</h1><ul>
<li>A property must have an assigned active ACCOUNTANT before tenant registration (<code>TenantService.requirePropertyHasAccountant</code>).</li>
<li>Tenant creation requires lease period, lease contract file attachments, full name (AR/EN), and phone.</li>
<li>Contract activation requires SUPER_ADMIN; owner approval required for drafts submitted for review.</li>
<li>Termination requests enter PENDING_TERMINATION_APPROVAL; owner approve/reject reverts or finalizes.</li>
<li>Rent grace period: ${3} days (configurable); late fee percentage: 5% (<code>application.yml</code>).</li>
<li>Payroll pay period year must be ≤ 2100 (validation on generate).</li>
<li>Account lock after 5 failed login attempts for 15 minutes; ACCOUNT_LOCKED notification emitted.</li>
<li>Notifications use i18n keys in params; frontend resolves Arabic/English text.</li>
<li>File uploads: max 50MB per file; served via <code>GET /files/{filename</code>}.</li>
</ul>`);

  const lifecycle = (title, steps) => {
    parts.push(`<h1>${title}</h1><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`);
  };

  lifecycle('8. End-to-End Business Processes', [
    'Bootstrap property portfolio (owners, properties, floors, units, role users) — QA iteration 0.',
    'Onboard tenants with lease documents; create draft or active contracts.',
    'Submit drafts for owner approval; owner approves, amends, or rejects.',
    'Activate contract; generate rent payment schedule automatically.',
    'Tenant submits payment proof; accountant reviews and marks paid.',
    'Maintenance request created → assigned → scheduled → visit report → rated → completed.',
    'End-of-lease: no-renewal intent, termination, deposit, damages, inspection, clear unit.',
    'HR: employee hire → leave requests → payroll generate → approve → mark paid.',
    'Schedulers emit reminders for rent, contracts, documents, inventory, leave balance.'
  ]);

  lifecycle('9. Property Lifecycle', [
    'Create property with type, address, floors, units configuration, owner documents.',
    'Link one or more owners (multi-owner via property_owners).',
    'Assign accountant to property (required for tenant operations).',
    'Attach property documents with expiry dates (scheduler: DOCUMENT_EXPIRY_WARNING).',
    'Configure module settings per property if applicable.',
    'Property remains active/inactive; scoped users see only assigned properties.'
  ]);

  lifecycle('10. Unit Lifecycle', [
    'Create unit on floor with type, area, rent amount, furnished status.',
    'Unit status synced from active lease contracts (rented/vacant).',
    'Vacancy publishing auto-triggered on contract expiry/termination (VACANCY_PUBLISHED).',
    'Unit clearance after move-out inspection and damage settlement (UNIT_CLEARED).',
    'Unit damage reported during termination workflow (UNIT_DAMAGE_REPORTED).'
  ]);

  lifecycle('11. Owner Lifecycle', [
    'Register owner with national ID, contact, documents.',
    'Link owner portal user (portalAccess=true) for notifications and approvals.',
    'Owner receives TENANT_REGISTERED_ON_OWNER_PROPERTY when tenant assigned to unit.',
    'Owner approves/rejects draft leases, renewals, terminations, maintenance contracts.',
    'Owner statements generated monthly (scheduler) — OWNER_STATEMENT notification.'
  ]);

  lifecycle('12. Tenant Lifecycle', [
    'Register tenant with unit/property, lease dates, contract files, optional portal user.',
    'Onboard via POST /tenants/onboard creates tenant + user + draft contract.',
    'Tenant portal: view contract, payment schedule, submit proof, maintenance, complaints.',
    'Notifications: draft pending owner, termination requested, renewal requested, payslip.',
    'Move-out: inspection sign-off, damage receipt submission.'
  ]);

  lifecycle('13. Contract Lifecycle', [
    'States: DRAFT → PENDING_OWNER_APPROVAL → ACTIVE → PENDING_TERMINATION_APPROVAL / PENDING_RENEWAL_APPROVAL → TERMINATED / EXPIRED.',
    'Staff submits draft for owner approval (CONTRACT_AWAITING_OWNER_REVIEW).',
    'SUPER_ADMIN activates approved contract (CONTRACT_ACTIVATED).',
    'Renewal request → owner decision (CONTRACT_RENEWAL_APPROVED/REJECTED).',
    'Termination request → owner decision (CONTRACT_TERMINATION_APPROVED/REJECTED).',
    'Expiry scheduler marks EXPIRED (CONTRACT_EXPIRING); 3-day warning (CONTRACT_EXPIRING_SOON).'
  ]);

  lifecycle('14. Rent Collection Lifecycle', [
    'Payment schedule generated on contract activation (monthly/other frequency).',
    'RENT_DUE reminder 3 days before due date (scheduler).',
    'Tenant submits proof via tenant portal; accountant reviews (PAID/REJECTED).',
    'OVERDUE after due date (RENT_OVERDUE); late fee after grace period.',
    'Day-7 escalation to GM/accountant (RENT_GRACE_PERIOD_ENDING).',
    'PAYMENT_RECEIVED when proof approved.'
  ]);

  lifecycle('15. Maintenance Lifecycle', [
    'Tenant or staff creates maintenance request (REQUEST_CREATED).',
    'Assign internal officer or contractor (MAINTENANCE_PROVIDER_ASSIGNED).',
    'Schedule visit; tenant accepts/rejects schedule.',
    'Officer submits visit report; request completed; tenant rates (REQUEST_RATED).',
    'Maintenance contract: draft → owner review → approve/reject → activate.',
    'Invoices with payment plans; installment reminders and mark-paid (MAINTENANCE_CONTRACT_PAYMENT_*).',
    'SLA overdue scheduler may auto-assign (MAINTENANCE_REQUEST_OVERDUE).'
  ]);

  lifecycle('16. Complaint Lifecycle', [
    'Tenant submits complaint with type, description, attachments (COMPLAINT_SUBMITTED).',
    'Staff/owner replies (COMPLAINT_REPLY_RECEIVED).',
    'Close complaint (COMPLAINT_CLOSED).',
    'Tenant rates closed complaint (COMPLAINT_RATED).',
    'Optional link to maintenance request.'
  ]);

  lifecycle('17. Inspection Lifecycle', [
    'Create MOVE_IN or MOVE_OUT inspection on contract.',
    'Complete checklist items with condition per item.',
    'Inspector signs; tenant signs via tenant portal.',
    'INSPECTION_COMPLETED / INSPECTION_SCHEDULED notifications.',
    'Move-out inspection enables clear-unit workflow.'
  ]);

  lifecycle('18. Vacancy Lifecycle', [
    'Vacancy listing created manually or AUTO_PUBLISHED from expired/terminated contract.',
    'RENTAL_INQUIRY_RECEIVED when inquiry submitted.',
    'Listing unpublished when unit re-rented.',
    'QA verifies vacancy module and listing source enum.'
  ]);

  lifecycle('19. Finance Lifecycle', [
    'Record expenses with category, property, amount, attachments.',
    'Define budgets per property/category; BUDGET_THRESHOLD_EXCEEDED on overrun.',
    'FINANCE_ALERT on finance thresholds (FinanceService).',
    'Payroll expenses synced on payroll status changes.',
    'Owner revenue share and statements via owner portal module.'
  ]);

  lifecycle('20. HR Lifecycle', [
    'Create employee with property, salary, optional portal system role.',
    'Leave types from lookups; submit/approve/reject leave (LEAVE_REQUEST_*).',
    'Leave balance low scheduler (LEAVE_BALANCE_LOW).',
    'HR deductions: create → send to accountant → approve/reject.',
    'Attendance tracking (admin/employee modules).'
  ]);

  lifecycle('21. Payroll Lifecycle', [
    'Generate payroll for property + month (includes active employees).',
    'Salary advances: create (auto-approved) or reject (SALARY_ADVANCE_*).',
    'Payroll SUBMITTED → APPROVED (owner/GM/SUPER_ADMIN) → PAID.',
    'Advance deducted on mark-paid (SALARY_ADVANCE_DEDUCTED).',
    'PAYSLIP_AVAILABLE to employee linked user.',
    'Notifications: PAYROLL_GENERATED, PAYROLL_APPROVED, PAYROLL_MARKED_PAID, etc.'
  ]);

  lifecycle('22. Notification Lifecycle', [
    'Business event triggers NotificationService.createForRecipients or createLocalized.',
    'Notification stored with type, recipient user, property, params (titleKey, bodyKey, vars, deep-link hints).',
    'User sees inbox (recent/older scopes); unread count API.',
    'Mark one read / mark all read.',
    'Frontend resolves i18n and navigates via notification-navigation.util.ts.',
    '93 types catalogued; all verified in iteration 23 matrix.'
  ]);

  lifecycle('23. Reporting Lifecycle', [
    'Admin reports module with finance, occupancy, maintenance summaries.',
    'Dashboard aggregations per role landing page.',
    'Owner statements monthly generation.',
    'Audit log for administrative actions.',
    'Excel QA report export for stabilization metrics.'
  ]);

  parts.push(`<h1>24. Dashboard Logic</h1>
<p>Role-specific landing routes verified in QA: SUPER_ADMIN/GENERAL_MANAGER/ACCOUNTANT → <code>/admin/dashboard</code>; TENANT → <code>/tenant/dashboard</code>; OWNER → owner-portal home; OFFICER → <code>/officer/dashboard</code>. Dashboard widgets aggregate counts from authorized API endpoints scoped by property.</p>`);

  parts.push(`<h1>25. Approval Processes</h1>${table(['Process', 'Approver', 'Outcome notifications'], [
    ['Draft lease', 'OWNER', 'TENANT_LEASE_* / CONTRACT_AWAITING_OWNER_REVIEW'],
    ['Pending contract activation denial', 'OWNER', 'TENANT_LEASE_OWNER_APPROVAL_DENIED'],
    ['Renewal', 'OWNER', 'CONTRACT_RENEWAL_APPROVED / REJECTED'],
    ['Termination', 'OWNER', 'CONTRACT_TERMINATION_APPROVED / REJECTED'],
    ['Maintenance contract', 'OWNER', 'MAINTENANCE_CONTRACT_APPROVED / REJECTED'],
    ['Payroll', 'OWNER / GM / SUPER_ADMIN', 'PAYROLL_APPROVED'],
    ['HR deduction', 'ACCOUNTANT', 'HR_DEDUCTION_APPROVED / REJECTED'],
    ['Leave', 'HR / manager', 'LEAVE_REQUEST_APPROVED / REJECTED']
])}`);

  parts.push(`<h1>26. Scheduler Processes</h1>${table(['Job', 'Schedule', 'Class', 'Primary notification'], SCHEDULERS.map((s) => [s.name, s.cron, s.class, s.notification]))}
<p>Dev QA endpoints under <code>POST /dev/schedulers/*</code> (SUPER_ADMIN) allow deterministic E2E verification without waiting for cron.</p>`);

  parts.push(`<h1>27. Exception Handling</h1>
<p>Business exceptions use <code>AppException</code> with i18n message keys. Validation errors return 400 with field messages. Authorization failures return 403. Notification side-effects are wrapped in try/catch or REQUIRES_NEW transactions so notification failures do not roll back primary business transactions (verified for ACCOUNT_LOCKED).</p>`);

  parts.push(`<h1>28. Permission Model (Business View)</h1>
<p>Permissions are module.action pairs (e.g. hr.view, contracts.edit) assigned per role via permission management screen. Screen visibility toggles per role supplement RBAC. Property scope limits data visibility for non-admin roles. Owner portal users have read-focused access with explicit approval mutations.</p>`);

  parts.push(`<h1>29. Notification Matrix</h1>
<p>Complete catalog of ${d.notifications.length} notification types:</p>
${table(['NotificationType', 'Emitter category', 'Primary emitter file'], d.notifications.map((n) => [
  esc(n.type),
  esc(n.category),
  esc((n.emitterFiles?.[0] ?? '').replace(/^property-backend\//, ''))
]))}`);

  parts.push(`<h1>30. Complete Screen Catalog</h1>
<p>${d.routes.length} Angular routes discovered:</p>
${table(['Route path', 'Source file'], d.routes.map((r) => [esc(r.path), esc(r.source.replace(/^property-frontend\//, ''))]))}`);

  parts.push(`<h1>31. Complete Workflow Diagrams</h1>`);
  parts.push(mermaid('Contract activation flow', `sequenceDiagram
    participant Staff
    participant Owner
    participant System
    Staff->>System: Create DRAFT contract
    Staff->>System: Submit for owner approval
    System->>Owner: CONTRACT_AWAITING_OWNER_REVIEW
    Owner->>System: Approve draft
    Staff->>System: Activate contract
    System->>System: Generate rent schedule
    System->>Tenant: CONTRACT_ACTIVATED`));

  parts.push(mermaid('Maintenance request flow', `flowchart TD
    A[Tenant creates request] --> B[REQUEST_CREATED]
    B --> C[Assign officer]
    C --> D[Schedule visit]
    D --> E{Tenant accepts?}
    E -->|Yes| F[Visit report]
    E -->|No| G[Reschedule]
    F --> H[Complete request]
    H --> I[Tenant rates]`));

  parts.push(`<h1>32. Business Scenarios</h1><ul>
<li>New tenant onboarding with owner notification (verified iter 23).</li>
<li>Owner rejects termination — contract returns ACTIVE (CONTRACT_TERMINATION_REJECTED).</li>
<li>Account lock after failed logins with inbox notification (iter 23).</li>
<li>Budget threshold exceeded after seeded expense (iter 15).</li>
<li>Maintenance contract invoice installment due today (iter 22/23).</li>
</ul>`);

  parts.push(`<h1>33. Operational Procedures</h1><ol>
<li>Daily: review overdue rent dashboard; action payment proofs.</li>
<li>Daily: triage open maintenance requests past SLA.</li>
<li>Weekly: review expiring contracts and document attachments.</li>
<li>Monthly: payroll generation and owner statement distribution.</li>
<li>On event: process owner portal approval queue.</li>
</ol>`);

  parts.push(`<h1>34. Administrative Procedures</h1><ol>
<li>User provisioning via admin users module; assign property access.</li>
<li>Permission matrix updates via admin permissions (Apply saves role map).</li>
<li>Module settings per property via admin module-settings.</li>
<li>Screen toggles via admin screens.</li>
<li>Audit log review via admin audit-log.</li>
</ol>`);

  parts.push(`<h1>35. Risk Management</h1><ul>
<li>JWT secret must be rotated in production.</li>
<li>Default QA passwords must not be used in production.</li>
<li>Scheduler timing in dev differs from production cron — validate after deploy.</li>
<li>Deep-link navigation tested on sample set; not every notification type UI-click verified.</li>
</ul>`);

  parts.push(`<h1>36. Data Governance</h1><p>Master data: properties, units, owners, tenants, employees. Transactional: contracts, payments, maintenance, payroll. Documents stored on filesystem with DB references. Bilingual fields (nameAr/nameEn) required for key entities. National ID uniqueness enforced on owners.</p>`);

  parts.push(`<h1>37. Audit & Compliance</h1><p>Audit log module records administrative mutations. QA stabilization package includes ${d.metrics.rawQaRows} executed test records, qa-report.xlsx EffectiveStatus sheet, Playwright traces, and this document set. Effective readiness ${esc(d.metrics.readiness)} at iteration 23 closure.</p>`);

  parts.push(`<h1>38. Glossary</h1>${table(['Term', 'Definition'], [
    ['EffectiveStatus', 'QA deduplicated test outcome; highest iteration wins'],
    ['Portal access', 'Owner linked to user with portalAccess flag'],
    ['Payment proof', 'Tenant-uploaded receipt for rent schedule row'],
    ['DevQa', 'SUPER_ADMIN-only test support endpoints — not product logic'],
    ['Deep link', 'Notification navigation hint to target screen'],
    ['Flyway', 'Database migration tool; ${d.migrations.length} migrations applied']
  ])}`);

  return htmlWrap('Property Management — Full Business Document', parts.join('\n'));
}

// Import builders from continuation file
import { buildTechnicalHtml, buildUserStoriesHtml, buildTestCasesHtml } from './lib/document-builders.mjs';

async function main() {
  console.log('[generate-four-documents] Loading data...');
  const data = loadDocData();

  await writeDocx(buildBusinessHtml(data), 'Property_Management_Full_Business_Document.docx');
  await writeDocx(buildTechnicalHtml(data), 'Property_Management_Full_Technical_Document.docx');
  await writeDocx(buildUserStoriesHtml(data), 'Property_Management_Full_User_Stories.docx');
  await writeDocx(buildTestCasesHtml(data), 'Property_Management_Full_Test_Cases.docx');

  console.log('[generate-four-documents] Done. Output:', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
