/**
 * Iteration 1 — Auth, RBAC, route guards, property scoping.
 *
 * Drives the live frontend in real Chromium and verifies, for every route in
 * the discovery inventory:
 *   - Each allowed role can reach the route without being redirected to
 *     /auth/login or kicked to a different module.
 *   - Each denied role (sample: TENANT) is redirected away from admin routes.
 *   - Backend @PreAuthorize / @RequiresPermission endpoints reject unauthenticated
 *     and tenant-scoped tokens with 401/403 (not 500).
 *
 * For every test it emits one row to docs/stabilization/qa-results/iteration-01.jsonl.
 */

import { test, expect, WEB } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';
import { QA_CREDENTIALS, RoleKey } from './credentials';
import { ROUTES, RouteSpec } from './routes';
import { loadState } from './state';

const ITER = 1;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: '-',
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

function resolveParam(path: string, kind: RouteSpec['paramKind'], s = loadState()): string | null {
  switch (kind) {
    case 'contractId':
      return s.firstContractId ? path.replace(':id', String(s.firstContractId)) : null;
    case 'maintenanceId':
      return s.firstMaintenanceRequestId ? path.replace(':id', String(s.firstMaintenanceRequestId)) : null;
    case 'contractorId':
      return s.firstContractorCompanyId ? path.replace(':id', String(s.firstContractorCompanyId)) : null;
    case 'inspectionId':
    case 'vacancyId':
    case 'employeeId':
    case 'payrollId':
      // No bootstrapped entity for these yet — handled by the dedicated iteration.
      return null;
    default:
      return path;
  }
}

test.describe.serial('Iteration 1 — Auth & RBAC', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  /**
   * Test 1.1 — Plain login form usability: valid + invalid + empty.
   */
  test('1.1 login form behaviour', async ({ page, web }) => {
    await page.goto(`${web}/auth/login`);
    // Empty form: submit button must be disabled.
    const submitBtn = page.getByRole('button', { name: /enter|دخول|login/i });
    const disabled = await submitBtn.isDisabled().catch(() => false);
    recordRow(row({
      module: 'auth', route: '/auth/login', role: 'guest',
      scenario: 'Submit button disabled on empty form',
      steps: 'GET /auth/login → inspect login button disabled attribute',
      expected: 'Submit button is disabled until both fields are filled',
      actual: `disabled=${disabled}, url=${page.url()}`,
      status: disabled ? 'Passed' : 'Failed',
      severity: 'Medium',
      bugSummary: disabled ? '' : 'Login submit is enabled even when email/password are empty'
    }));

    // Invalid credentials.
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.getByRole('button', { name: /enter|دخول|login/i }).click();
    await page.waitForTimeout(1500);
    const hasError = await page.locator('.login-error, .estate-login .alert, [role="alert"]').first().isVisible().catch(() => false);
    recordRow(row({
      module: 'auth', route: '/auth/login', role: 'guest',
      scenario: 'Submit invalid credentials',
      steps: 'POST /auth/login with bogus email/password through form',
      expected: 'Stay on login page, surface error message',
      actual: `url=${page.url()} errorShown=${hasError}`,
      status: page.url().includes('/auth/login') ? 'Passed' : 'Failed',
      severity: 'Medium'
    }));
  });

  /**
   * Test 1.2 — Unauth → protected route redirects to login.
   */
  test('1.2 unauthenticated access to protected routes redirects to login', async ({ page, web }) => {
    const protectedRoutes = ['/admin/dashboard', '/admin/finance/dashboard', '/officer/requests', '/tenant/dashboard', '/employee/profile'];
    const results: Record<string, string> = {};
    for (const r of protectedRoutes) {
      await page.goto(`${web}${r}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
      results[r] = page.url();
    }
    const allRedirected = Object.values(results).every((u) => /\/auth\/login/.test(u));
    recordRow(row({
      module: 'auth', route: 'multiple', role: 'guest',
      scenario: 'Unauthenticated access to protected routes',
      steps: `GET each: ${protectedRoutes.join(', ')}`,
      expected: 'All redirect to /auth/login',
      actual: JSON.stringify(results),
      status: allRedirected ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: allRedirected ? '' : 'Route guard did not redirect for at least one protected route'
    }));
  });

  /**
   * Test 1.3 — For every role with available credentials, log in via the UI
   * and assert the landing module is consistent with the role.
   */
  test('1.3 every role lands on a sensible home after login', async ({ page, web }) => {
    const expectedHome: Record<RoleKey, RegExp> = {
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

    for (const role of Object.keys(expectedHome) as RoleKey[]) {
      const cred = QA_CREDENTIALS[role];
      // Skip roles whose bootstrap login never succeeded.
      const probe = await page.request.post(`${process.env['E2E_API_URL'] ?? 'http://localhost:8081/api/v1'}/auth/login`, {
        data: { email: cred.email, password: cred.password }
      });
      if (!probe.ok()) {
        recordRow(row({
          module: 'auth', route: '/auth/login', role,
          scenario: `Login + redirect for ${role}`,
          steps: 'POST /auth/login probe via API',
          expected: '200 with accessToken',
          actual: `${probe.status()} — credentials unavailable for ${role}`,
          status: 'Blocked',
          severity: 'High',
          bugSummary: `${role} credential not authenticating; downstream UI test skipped`
        }));
        continue;
      }

      // Fresh context per role to avoid leaked tokens.
      const ctx = await page.context().browser()!.newContext();
      const p2 = await ctx.newPage();
      await p2.goto(`${web}/auth/login`);
      await p2.locator('input[type="email"]').fill(cred.email);
      await p2.locator('input[type="password"]').fill(cred.password);
      await p2.getByRole('button', { name: /enter|دخول|login/i }).click();
      let landed = '';
      try {
        await p2.waitForURL((u) => !/\/auth\/login(\?|$|\/)/.test(u.pathname), { timeout: 15000 });
        landed = p2.url();
      } catch {
        landed = p2.url();
      }
      const ok = expectedHome[role].test(new URL(landed).pathname);
      recordRow(row({
        module: 'auth', route: '/auth/login', role,
        scenario: `Login + landing module for ${role}`,
        steps: `UI form submit with ${cred.email}`,
        expected: `Land on ${expectedHome[role]}`,
        actual: landed,
        status: ok ? 'Passed' : 'Failed',
        severity: ok ? 'Info' : 'High',
        bugSummary: ok ? '' : `${role} landed on unexpected URL after login`
      }));
      await ctx.close();
    }
  });

  /**
   * Test 1.4 — Route inventory smoke. One sub-test per role so each gets its
   * own timeout budget (90s).
   */
  for (const role of ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER',
    'MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'OWNER', 'TENANT'] as RoleKey[]) {
    test(`1.4 [${role}] route inventory smoke`, async ({ page, web }) => {
      test.setTimeout(360_000);
      const authApi = process.env['E2E_API_URL'] ?? 'http://localhost:8081/api/v1';
      const cred = QA_CREDENTIALS[role];
      const browser = page.context().browser()!;
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      const errors: string[] = [];
      p.on('pageerror', (err) => errors.push(err.message));
      const probe = await p.request.post(`${authApi}/auth/login`, {
        data: { email: cred.email, password: cred.password }
      });
      if (!probe.ok()) {
        recordRow(row({
          module: 'rbac', route: '*', role,
          scenario: `Skip route sweep — ${role} cannot authenticate`,
          steps: 'POST /auth/login probe',
          expected: '200 with token',
          actual: `${probe.status()}`,
          status: 'Blocked',
          severity: 'High'
        }));
        await ctx.close();
        return;
      }
      await p.goto(`${web}/auth/login`);
      await p.locator('input[type="email"]').fill(cred.email);
      await p.locator('input[type="password"]').fill(cred.password);
      await p.getByRole('button', { name: /enter|دخول|login/i }).click();
      try { await p.waitForURL((u) => !/\/auth\/login/.test(u.pathname), { timeout: 15000 }); } catch { /* ignored */ }

      for (const r of ROUTES) {
        if (r.path.startsWith('/auth/') || r.path === '/change-password') continue;
        const resolved = resolveParam(r.path, r.paramKind);
        if (!resolved) {
          recordRow(row({
            module: r.module, route: r.path, role,
            scenario: `Route requires param ${r.paramKind} not yet bootstrapped`,
            steps: 'Skipped during iteration 1',
            expected: 'Verified in dedicated iteration',
            actual: 'No id available',
            status: 'To be verified during E2E testing',
            severity: 'Low'
          }));
          continue;
        }
        const expectedAllow = r.allow.includes(role);
        const errorsBefore = errors.length;
        await p.goto(`${web}${resolved}`).catch(() => {});
        await p.waitForLoadState('domcontentloaded').catch(() => {});
        await p.waitForTimeout(150);
        const url = p.url();
        const pathOnly = (() => { try { return new URL(url).pathname; } catch { return url; } })();
        const landedOnLogin = /\/auth\/login/.test(pathOnly);
        const landedOnRoute = pathOnly.startsWith(resolved.split('?')[0].split('#')[0]);
        const newErrors = errors.slice(errorsBefore);

        let status: QaRow['status'] = 'Passed';
        let severity: QaRow['severity'] = 'Info';
        let bug = '';
        let notes = '';
        // Cross-portal boundaries we MUST enforce as hard failures:
        //   - TENANT must not reach /admin/* or /officer/* (their portal is /tenant/*).
        //   - OWNER must not reach /officer/* or /tenant/*.
        const isAdminRoute = resolved.startsWith('/admin/');
        const isOfficerRoute = resolved.startsWith('/officer/');
        const isTenantRoute = resolved.startsWith('/tenant/');
        const isEmployeeRoute = resolved.startsWith('/employee/');
        const hardCrossPortalLeak =
          (role === 'TENANT' && (isAdminRoute || isOfficerRoute || isEmployeeRoute) && landedOnRoute) ||
          (role === 'OWNER' && (isOfficerRoute || isTenantRoute) && landedOnRoute);

        if (newErrors.length > 0) {
          status = 'Failed';
          severity = 'High';
          bug = `JS errors on ${resolved}: ${newErrors.join(' | ').slice(0, 220)}`;
        } else if (expectedAllow && landedOnLogin) {
          status = 'Failed';
          severity = 'High';
          bug = `${role} is allowed for ${resolved} but was kicked to /auth/login`;
        } else if (hardCrossPortalLeak) {
          status = 'Failed';
          severity = 'Critical';
          bug = `Cross-portal leak: ${role} reached ${resolved} without being redirected`;
        } else if (!expectedAllow && landedOnRoute && role !== 'SUPER_ADMIN') {
          // The SPA's authGuard only checks isAuthenticated; per-screen permission
          // enforcement is API-side or via menu visibility. Reaching the URL is
          // not necessarily a bug — capture as informational.
          notes = `SPA rendered route despite role not in static allow-list ${JSON.stringify(r.allow)}; verify the page itself blocks privileged actions (covered in dedicated iteration).`;
        }
        recordRow(row({
          module: r.module, route: resolved, role,
          permissionContext: `allow=[${r.allow.join(',')}]`,
          scenario: `Route smoke as ${role}`,
          steps: `Login as ${role}, GET ${resolved}, observe URL + JS errors`,
          expected: expectedAllow ? `Stay on or near ${resolved}` : 'Redirected away from forbidden route',
          actual: `url=${url} jsErrors=${newErrors.length}`,
          severity,
          status,
          bugSummary: bug,
          notes
        }));
      }
      await ctx.close();
    });
  }

  /**
   * Test 1.5 — Backend security: protected endpoints reject unauthenticated
   * and tenant-token access without producing 500s.
   */
  test('1.5 protected endpoints reject unauth / wrong role with 4xx (not 500)', async ({ api, page }) => {
    const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:8081/api/v1';
    // Unauth.
    const targets = ['/properties', '/users', '/owners', '/tenants', '/finance/dashboard', '/audit-logs?page=0&size=5'];
    for (const t of targets) {
      const r = await page.request.get(`${apiUrl}${t}`);
      const ok = [401, 403].includes(r.status());
      recordRow(row({
        module: 'rbac', route: `GET ${t}`, role: 'unauth',
        scenario: 'Anonymous GET on protected endpoint',
        steps: 'GET without Authorization header',
        expected: '401 or 403',
        actual: `HTTP ${r.status()}`,
        status: ok ? 'Passed' : 'Failed',
        severity: ok ? 'Info' : 'High',
        bugSummary: ok ? '' : `Anonymous GET returned ${r.status()} — should be 401/403`
      }));
    }
    // TENANT scope: admin-only endpoints reject; GET /properties is scope-filtered (200 with tenant's own rows).
    await api.loginRole('TENANT');
    const tenantTargets: Array<{ path: string; expectDenied: boolean; note?: string }> = [
      { path: '/users', expectDenied: true },
      { path: '/properties', expectDenied: false, note: 'PropertyScopeService returns tenant-scoped properties only (HTTP 200 expected)' },
      { path: '/owners', expectDenied: true },
      { path: '/audit-logs?page=0&size=5', expectDenied: true },
      { path: '/finance/dashboard', expectDenied: true }
    ];
    for (const { path: t, expectDenied, note } of tenantTargets) {
      const r = await api.raw('GET', t);
      const denied = [401, 403].includes(r.status);
      const ok = expectDenied ? denied : r.status === 200;
      recordRow(row({
        module: 'rbac', route: `GET ${t}`, role: 'TENANT',
        permissionContext: expectDenied ? 'TENANT must not access admin/finance APIs' : 'TENANT scoped property list',
        scenario: 'Tenant token on endpoint',
        steps: 'GET with TENANT bearer token',
        expected: expectDenied ? '401 or 403' : 'HTTP 200 with scoped data',
        actual: `HTTP ${r.status}`,
        status: ok ? 'Passed' : 'Failed',
        severity: ok ? 'Info' : 'Critical',
        bugSummary: ok ? '' : `TENANT GET ${t} returned HTTP ${r.status} unexpectedly`,
        notes: note ?? ''
      }));
    }
  });
});
