/**
 * Iteration 17.5–17.8 — Workflow lifecycle smoke (API-driven from backend inventory).
 */
import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadBackendEndpoints } from './inventories/load-inventories';
import { loadState } from './state';
import { RoleKey } from './credentials';

const ITER = 17;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'workflows-exhaustive',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Medium',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

function resolveProbePath(path: string | (() => string)): string {
  return typeof path === 'function' ? path() : path;
}

/** Key workflow GET probes — list/read endpoints that prove module health. */
const WORKFLOW_PROBES: Array<{
  module: string;
  path: string | (() => string);
  label: string;
  role?: RoleKey;
}> = [
  { module: 'properties', path: '/properties?page=0&size=5', label: 'property list' },
  {
    module: 'units',
    path: () => {
      const pid = loadState().propertyIds[0];
      if (!pid) throw new Error('No propertyId in qa-state for units probe');
      return `/units/property/${pid}?page=0&size=5`;
    },
    label: 'units by property'
  },
  { module: 'owners', path: '/owners?page=0&size=5', label: 'owner list' },
  { module: 'tenants', path: '/tenants?page=0&size=5', label: 'tenant list' },
  { module: 'contracts', path: '/contracts?page=0&size=5', label: 'contract list' },
  { module: 'maintenance', path: '/maintenance/requests?page=0&size=5', label: 'maintenance list' },
  { module: 'maintenance-contracts', path: '/maintenance-contracts', label: 'maintenance contracts' },
  { module: 'inventory', path: '/inventory?page=0&size=5', label: 'inventory list' },
  { module: 'complaints', path: '/complaints?page=0&size=5', label: 'complaints list' },
  { module: 'finance', path: '/finance/dashboard', label: 'finance dashboard' },
  { module: 'finance', path: '/finance/expenses?page=0&size=5', label: 'expenses list' },
  { module: 'finance', path: '/finance/revenues?page=0&size=5', label: 'revenues list' },
  { module: 'hr', path: '/hr/employees?page=0&size=5', label: 'employees list' },
  { module: 'hr', path: '/hr/leaves?page=0&size=5', label: 'leaves list' },
  { module: 'hr', path: '/hr/payroll?page=0&size=5', label: 'payroll list' },
  { module: 'hr', path: '/hr/deductions?page=0&size=5', label: 'deductions list' },
  { module: 'vacancies', path: '/vacancies?page=0&size=5', label: 'vacancies list' },
  { module: 'notifications', path: '/notifications/my?scope=recent&page=0&size=5', label: 'notifications inbox' },
  { module: 'audit', path: '/audit-logs?page=0&size=5', label: 'audit logs' },
  { module: 'reports', path: '/reports/occupancy', label: 'occupancy report' },
  {
    module: 'owner-portal',
    path: () => {
      const oid = loadState().ownerIds[0];
      if (!oid) throw new Error('No ownerId in qa-state for owner-portal probe');
      return `/owner-portal/admin/owners/${oid}/revenue-shares`;
    },
    label: 'owner revenue shares (admin)',
    role: 'SUPER_ADMIN'
  },
  { module: 'accountant-portal', path: '/accountant-portal/receipts', label: 'receipts list', role: 'ACCOUNTANT' }
];

test.describe.serial('Iteration 17 — Workflows exhaustive', () => {
  // Append to iteration-17.jsonl.

  test('17.5 backend endpoint inventory loaded', async () => {
    const endpoints = loadBackendEndpoints();
    recordRow(row({
      route: 'backend-endpoints.json',
      scenario: 'Backend API inventory available for workflow discovery',
      actual: `endpoints=${endpoints.length}`,
      status: endpoints.length > 0 ? 'Passed' : 'Failed'
    }));
    expect(endpoints.length).toBeGreaterThan(0);
  });

  for (const probe of WORKFLOW_PROBES) {
    test(`17.6 workflow probe — ${probe.module} ${probe.label}`, async ({ api }) => {
      const role = probe.role ?? 'SUPER_ADMIN';
      await api.loginRole(role);
      const path = resolveProbePath(probe.path);
      const r = await api.raw('GET', path);
      recordRow(row({
        module: probe.module,
        route: `GET ${path}`,
        role,
        scenario: `Workflow module health — ${probe.label}`,
        expected: 'HTTP 200',
        actual: `status=${r.status}`,
        status: r.status === 200 ? 'Passed' : 'Failed'
      }));
      expect(r.status).toBe(200);
    });
  }

  test('17.7 workflow — bootstrap state entities resolvable', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const checks: string[] = [];
    checks.push(`properties=${s.propertyIds.length}`);
    checks.push(`tenants=${s.tenantIds.length}`);
    checks.push(`contract=${s.firstContractId ?? 'none'}`);
    checks.push(`maintenance=${s.firstMaintenanceRequestId ?? 'none'}`);
    recordRow(row({
      route: 'qa-state.json',
      scenario: 'Bootstrap entities available for full lifecycle specs (iter 02-13)',
      actual: checks.join('; '),
      status: s.propertyIds.length > 0 ? 'Passed' : 'Blocked'
    }));
    expect(s.propertyIds.length).toBeGreaterThan(0);
  });

  test('17.8 workflow summary', async () => {
    recordRow(row({
      route: 'workflow-summary',
      scenario: 'Workflow probe suite complete — full lifecycles covered in iter 02-13 + this probe pass',
      actual: `probes=${WORKFLOW_PROBES.length}`,
      status: 'Passed',
      notes: 'Dedicated lifecycle specs: 02-properties through 13-schedulers'
    }));
  });
});
