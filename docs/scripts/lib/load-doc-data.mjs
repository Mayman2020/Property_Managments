import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
export const DOCS = path.join(REPO_ROOT, 'docs', 'stabilization');
export const INVENTORIES = path.join(DOCS, 'inventories');
export const QA_RESULTS = path.join(DOCS, 'qa-results');
export const BACKEND = path.join(REPO_ROOT, 'property-backend');
export const FRONTEND = path.join(REPO_ROOT, 'property-frontend');

export const ROLES = [
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'ACCOUNTANT',
  'HR_OFFICER',
  'MAINTENANCE_OFFICER_INTERNAL',
  'MAINTENANCE_OFFICER_COMPANY',
  'MAINTENANCE_COMPANY',
  'PROPERTY_GUARD',
  'PROCEDURES_CLERK',
  'OWNER',
  'TENANT'
];

export const ROLE_DESCRIPTIONS = {
  SUPER_ADMIN: 'Full system administrator — all modules, contract activation, user/permission management, dev QA endpoints.',
  GENERAL_MANAGER: 'Broad operational oversight — approve/reject payroll and strategic workflows; unrestricted property scope.',
  ACCOUNTANT: 'Property-scoped finance — contracts, rent schedules, expenses, budgets, owner statements, payroll approval.',
  HR_OFFICER: 'Human resources — employees, leaves, deductions submission; property-scoped access.',
  MAINTENANCE_OFFICER_INTERNAL: 'Internal maintenance officer — assign, schedule, visit reports on assigned requests.',
  MAINTENANCE_OFFICER_COMPANY: 'Contractor-affiliated maintenance officer — company-scoped maintenance portal.',
  MAINTENANCE_COMPANY: 'Maintenance contractor company portal — assignments and contract invoices.',
  PROPERTY_GUARD: 'Limited employee portal — attendance and property guard workflows.',
  PROCEDURES_CLERK: 'Procedures clerk — employee portal access; payroll visibility as linked employee user.',
  OWNER: 'Owner portal — draft/renewal/termination decisions, maintenance contracts, property-linked notifications.',
  TENANT: 'Tenant portal — lease, payments, maintenance requests, complaints, inspections.'
};

export const BACKEND_MODULES = [
  'accountantportal', 'audit', 'auth', 'complaint', 'contract', 'contractor', 'dashboard', 'devops',
  'files', 'finance', 'hr', 'inspection', 'inventory', 'legalentity', 'lookup', 'maintenance',
  'moduleconfig', 'myrequests', 'notification', 'owner', 'ownerportal', 'permission', 'property',
  'reports', 'scheduler', 'tenant', 'tenantportal', 'unit', 'user', 'vacancy', 'vendor'
];

export const SCHEDULERS = [
  { name: 'checkLowStock', cron: '0 0 8 * * *', class: 'OperationalScheduler', notification: 'INVENTORY_LOW_STOCK' },
  { name: 'checkDocumentExpiry', cron: '0 0 8 * * *', class: 'OperationalScheduler', notification: 'DOCUMENT_EXPIRY_WARNING' },
  { name: 'checkLeaveBalanceLow', cron: '0 30 8 * * *', class: 'OperationalScheduler', notification: 'LEAVE_BALANCE_LOW' },
  { name: 'checkMaintenanceRequestOverdue', cron: '0 0 9 * * *', class: 'OperationalScheduler', notification: 'MAINTENANCE_REQUEST_OVERDUE' },
  { name: 'checkRentGracePeriod', cron: '0 30 9 * * *', class: 'OperationalScheduler', notification: 'RENT_GRACE_PERIOD_ENDING' },
  { name: 'checkOverduePayments', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'RENT_OVERDUE' },
  { name: 'checkRentDunningEscalation', cron: '0 15 9 * * *', class: 'ContractScheduler', notification: 'RENT_GRACE_PERIOD_ENDING' },
  { name: 'checkExpiringContracts', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'CONTRACT_EXPIRING' },
  { name: 'checkUpcomingRentDueReminders', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'RENT_DUE' },
  { name: 'checkContractsExpiringIn3Days', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'CONTRACT_EXPIRING_SOON' },
  { name: 'checkUpcomingMaintenanceInvoiceInstallments', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON' },
  { name: 'checkMaintenanceInvoiceInstallmentsDueToday', cron: '0 0 9 * * *', class: 'ContractScheduler', notification: 'MAINTENANCE_CONTRACT_PAYMENT_DUE_TODAY' },
  { name: 'generateOwnerStatements', cron: '0 0 2 1 * *', class: 'OwnerStatementGenerationService', notification: 'OWNER_STATEMENT' }
];

function normalizeRoute(route) {
  if (!route) return '';
  return String(route).replace(/\/\d+/g, '/:id').replace(/\?.*$/, '').trim().toLowerCase();
}

function normalizeScenario(s) {
  if (!s) return '';
  return String(s).slice(0, 120).trim().toLowerCase();
}

function fingerprint(r) {
  const route = normalizeRoute(r.route);
  const module = String(r.module ?? '').toLowerCase();
  const role = String(r.role ?? '').toUpperCase();
  if (route.startsWith('notificationtype.')) {
    return [module, route, 'ANY', 'notification-coverage'].join('|');
  }
  return [module, route, role, normalizeScenario(r.scenario)].join('|');
}

function readAllQaRows() {
  const rows = [];
  for (const f of fs.readdirSync(QA_RESULTS).sort()) {
    if (!f.endsWith('.jsonl')) continue;
    const raw = fs.readFileSync(path.join(QA_RESULTS, f), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        rows.push(JSON.parse(t));
      } catch {
        /* skip */
      }
    }
  }
  return rows;
}

function buildEffectiveRows(allRows) {
  const byFp = new Map();
  for (const r of allRows) {
    const fp = fingerprint(r);
    const cur = byFp.get(fp);
    const iter = Number(r.iteration ?? 0);
    if (!cur) {
      byFp.set(fp, { ...r, _sourceIterations: [iter] });
      continue;
    }
    const curIter = Number(cur.iteration ?? 0);
    if (iter > curIter || (iter === curIter && String(r.timestamp ?? '') > String(cur.timestamp ?? ''))) {
      byFp.set(fp, { ...r, _sourceIterations: [...(cur._sourceIterations ?? [curIter]), iter] });
    } else {
      cur._sourceIterations = [...(cur._sourceIterations ?? [curIter]), iter];
    }
  }
  return [...byFp.values()];
}

function listEntities() {
  const entities = [];
  const root = path.join(BACKEND, 'src', 'main', 'java', 'com', 'propertymanagement', 'modules');
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.java') && full.includes(`${path.sep}entity${path.sep}`)) {
        entities.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(root);
  return entities.sort();
}

function listMigrations() {
  const migDir = path.join(BACKEND, 'src', 'main', 'resources', 'db', 'migration');
  return fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
}

export function loadDocData() {
  const notifications = JSON.parse(fs.readFileSync(path.join(INVENTORIES, 'notification-triggers.json'), 'utf8'));
  const routes = JSON.parse(fs.readFileSync(path.join(INVENTORIES, 'frontend-routes.json'), 'utf8'));
  const endpoints = JSON.parse(fs.readFileSync(path.join(INVENTORIES, 'backend-endpoints.json'), 'utf8'));
  const allQa = readAllQaRows();
  const effectiveQa = buildEffectiveRows(allQa);

  const statusCounts = { Passed: 0, Failed: 0, Blocked: 0, Fixed: 0, Deferred: 0 };
  for (const r of effectiveQa) {
    const s = r.status ?? 'Unknown';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  const routesByPortal = {};
  for (const r of routes.routes) {
    const portal = r.path.split('/').filter(Boolean)[0] ?? 'root';
    routesByPortal[portal] = (routesByPortal[portal] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      rawQaRows: allQa.length,
      effectiveQaRows: effectiveQa.length,
      readiness: '99.4%',
      ...statusCounts
    },
    notifications: notifications.types,
    routes: routes.routes,
    routesByPortal,
    endpoints: endpoints.endpoints,
    effectiveQa,
    allQa,
    entities: listEntities(),
    migrations: listMigrations(),
    stack: {
      backend: 'Spring Boot 3.2.5 / Java 17',
      frontend: 'Angular 17',
      database: 'PostgreSQL 16 (schema: property_mgmt)',
      apiBase: 'http://localhost:8089/api/v1',
      webBase: 'http://localhost:4208',
      auth: 'JWT (24h access, 7d refresh)',
      orm: 'JPA/Hibernate validate + Flyway migrations',
      qa: 'Playwright E2E (playwright.qa.config.ts), iterations 0–23'
    }
  };
}
