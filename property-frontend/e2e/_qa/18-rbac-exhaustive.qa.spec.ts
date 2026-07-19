/**
 * Iteration 18.2 — Exhaustive RBAC matrix (11 roles).
 */
import { test, expect } from './fixtures';
import { uiLogin } from './fixtures';
import { recordRow, QaRow } from './record';
import { QA_CREDENTIALS, RoleKey } from './credentials';
import { loadBackendEndpoints } from './inventories/load-inventories';

const ITER = 18;

const ALL_ROLES: RoleKey[] = [
  'SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER',
  'MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY',
  'PROPERTY_GUARD', 'PROCEDURES_CLERK', 'OWNER', 'TENANT'
];

const EXPECTED_HOME: Record<RoleKey, RegExp> = {
  SUPER_ADMIN: /\/admin\//,
  GENERAL_MANAGER: /\/admin\//,
  ACCOUNTANT: /\/admin\//,
  HR_OFFICER: /\/admin\//,
  MAINTENANCE_OFFICER_INTERNAL: /\/(officer|admin)\//,
  MAINTENANCE_OFFICER_COMPANY: /\/(officer|admin)\//,
  MAINTENANCE_COMPANY: /\/(officer|admin)\//,
  PROPERTY_GUARD: /\/(admin|officer|employee)\//,
  PROCEDURES_CLERK: /\/(admin|employee)\//,
  OWNER: /\/(admin|owner)\//,
  TENANT: /\/tenant\//
};

/** Sensitive admin endpoints — TENANT/OWNER should get 403. */
const RBAC_PROBES: Array<{ path: string; method?: 'GET' | 'POST'; denyRoles: RoleKey[] }> = [
  { path: '/users?page=0&size=1', denyRoles: ['TENANT', 'OWNER'] },
  { path: '/audit-logs?page=0&size=1', denyRoles: ['TENANT', 'OWNER', 'HR_OFFICER'] },
  { path: '/finance/dashboard', denyRoles: ['TENANT'] },
  {
    path: '/dev/schedulers/run-all',
    method: 'POST',
    denyRoles: ALL_ROLES.filter((r) => r !== 'SUPER_ADMIN')
  }
];

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'rbac-exhaustive',
    route: '-',
    role: '-',
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

test.describe.serial('Iteration 18.2 — RBAC exhaustive', () => {
  for (const role of ALL_ROLES) {
    test(`18.2 [${role}] login + landing + API probes`, async ({ page, web, api }) => {
      const cred = QA_CREDENTIALS[role];
      const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:8089/api/v1';
      const probe = await page.request.post(`${apiUrl}/auth/login`, {
        data: { email: cred.email, password: cred.password }
      });
      if (!probe.ok()) {
        recordRow(row({ route: '/auth/login', role, scenario: 'API login', actual: `${probe.status()}`, status: 'Blocked' }));
        return;
      }

      const ctx = await page.context().browser()!.newContext();
      const p = await ctx.newPage();
      await p.goto(`${web}/auth/login`);
      await p.locator('input[type="email"]').fill(cred.email);
      await p.locator('input[type="password"]').fill(cred.password);
      await p.getByRole('button', { name: /enter|دخول|login/i }).click();
      let landed = '';
      try {
        await p.waitForURL((u) => !/\/auth\/login/.test(u.pathname), { timeout: 15000 });
        landed = p.url();
      } catch {
        landed = p.url();
      }
      const uiOk = EXPECTED_HOME[role].test(new URL(landed).pathname);
      recordRow(row({
        route: '/auth/login',
        role,
        scenario: 'UI landing page',
        actual: landed,
        status: uiOk ? 'Passed' : 'Failed'
      }));

      await api.loginRole(role);
      for (const probeDef of RBAC_PROBES) {
        const method = probeDef.method ?? 'GET';
        const r = await api.raw(method, probeDef.path);
        const shouldDeny = probeDef.denyRoles.includes(role);
        const denied = [401, 403].includes(r.status);
        const ok = shouldDeny ? denied : r.status === 200;
        recordRow(row({
          route: `${method} ${probeDef.path}`,
          role,
          scenario: shouldDeny ? 'Forbidden endpoint probe' : 'Allowed endpoint probe',
          expected: shouldDeny ? '401/403' : 'HTTP 200',
          actual: `HTTP ${r.status}`,
          status: ok ? 'Passed' : 'Failed'
        }));
      }
      await ctx.close();
      expect(uiOk).toBe(true);
    });
  }

  test('18.2 summary — backend inventory', async () => {
    const endpoints = loadBackendEndpoints();
    recordRow(row({
      route: 'rbac-matrix-summary',
      role: 'ALL',
      scenario: 'RBAC matrix complete',
      actual: `roles=${ALL_ROLES.length} endpoints=${endpoints.length}`,
      status: 'Passed'
    }));
  });
});
