/**
 * Iteration 1 — bug-fix log entries (one row per fix). Each row references
 * files changed and the retest evidence so the QA Excel report shows the
 * full Fixed → Retest result chain.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { QA_CREDENTIALS } from './credentials';

const ITER = 1;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: '-',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
    status: 'Fixed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

test.describe('Iteration 1 — bug-fix log', () => {
  test('BUG-002 unmapped URLs and wrong HTTP method returned HTTP 500 instead of 404 / 405', async ({ page }) => {
    const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:8089/api/v1';
    // Need an authenticated token for the security filter to reach Spring MVC.
    const login = await page.request.post(`${apiUrl}/auth/login`, {
      data: { email: 'admin@propmgmt.com', password: '12345' }
    });
    const token = (await login.json()).data?.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };

    const tests = [
      { method: 'GET', path: '/no-such-thing', expect: 404 },
      { method: 'GET', path: '/employees', expect: 404 },
      { method: 'GET', path: '/auth/login', expect: 405 }
    ];
    const results: string[] = [];
    for (const t of tests) {
      const r = await page.request.fetch(`${apiUrl}${t.path}`, { method: t.method, headers });
      results.push(`${t.method} ${t.path} -> ${r.status()} (expected ${t.expect})`);
      expect(r.status()).toBe(t.expect);
    }

    recordRow(row({
      module: 'global-exception-handler',
      route: 'GlobalExceptionHandler',
      scenario: 'Any unmapped path or wrong HTTP verb fell through to the catch-all Exception handler and returned 500 INTERNAL_ERROR. Real production calls hitting unmapped endpoints surfaced as 500s, masking misconfiguration and confusing API consumers.',
      steps: 'Before fix: GET /employees → 500. GET /units (only POST mapped) → 500. After fix: GET /employees → 404, GET /units → 405.',
      testData: 'Three real probes via authenticated token (Admin) against unmapped paths and wrong-method requests.',
      expected: '404 for unmapped paths; 405 for wrong method',
      actual: results.join('; '),
      severity: 'High',
      status: 'Fixed',
      bugSummary: 'Missing NoHandlerFoundException/NoResourceFoundException/HttpRequestMethodNotSupportedException handlers in GlobalExceptionHandler caused all such errors to return 500.',
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/shared/exception/GlobalExceptionHandler.java; property-backend/src/main/resources/messages.properties; property-backend/src/main/resources/messages_ar.properties',
      retestResult: 'All three probes now return the expected HTTP status (404 / 404 / 405).'
    }));
  });

  test('BUG-003 PROCEDURES_CLERK login bounces back to /auth/login (guard redirect loop)', async ({ page, web }) => {
    // Login as PROCEDURES_CLERK through the actual UI form and confirm we land
    // on /admin/hr/employees (the role's first accessible page).
    await page.goto(`${web}/auth/login`);
    await page.locator('input[type="email"]').fill('qa.clerk@propmgmt.com');
    await page.locator('input[type="password"]').fill(QA_CREDENTIALS.PROCEDURES_CLERK.password);
    await page.getByRole('button', { name: /enter|دخول|login/i }).click();
    let landed = '';
    try {
      await page.waitForURL((u) => !/\/auth\/login(\?|$|\/)/.test(u.pathname), { timeout: 20000 });
      landed = page.url();
    } catch {
      landed = page.url();
    }
    const ok = /\/admin\/(hr|profile|home|dashboard)/.test(new URL(landed).pathname);

    recordRow(row({
      module: 'auth',
      route: '/auth/login → role landing',
      role: 'PROCEDURES_CLERK',
      scenario: 'PROCEDURES_CLERK lacks dashboard.view; previous landing logic sent them to /admin/home (which redirects to /admin/dashboard). The dashboard guard then called resolveFallbackRoute, which again preferred /admin/home (because hr.view=true) → Angular cancelled the navigation, leaving the user on /auth/login.',
      steps: 'UI login as PROCEDURES_CLERK and observe final URL.',
      testData: 'email=qa.clerk@propmgmt.com password=12345',
      expected: 'Lands on /admin/hr/employees or similar reachable page',
      actual: `Landed on ${landed} (ok=${ok})`,
      severity: 'High',
      status: ok ? 'Fixed' : 'Failed',
      bugSummary: 'Landing candidate `{ route: /admin/home, permission: hr.view }` did not match the actual permission required by the redirect target (`dashboard.view`), causing a redirect loop.',
      filesChanged: 'property-frontend/src/app/core/services/auth.service.ts; property-frontend/src/app/core/guards/auth.guard.ts',
      retestResult: ok ? `PROCEDURES_CLERK now lands on ${landed}` : `Still failing: ${landed}`,
      notes: 'Fix: each `/admin/home` candidate now uses `permission: dashboard, action: view` so it is only picked when the user actually has dashboard access. Roles without it fall through to the next valid landing page (e.g. /admin/hr/employees).'
    }));
    expect(ok).toBeTruthy();
  });
});
