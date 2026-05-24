/**
 * Iteration 10 — Tenant portal UI routes + tenant-scoped APIs.
 */
import { test, expect, uiLogin } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { ROUTES } from './routes';
import { loadState } from './state';

const ITER = 10;
const TENANT_ROUTES = ROUTES.filter((r) => r.path.startsWith('/tenant/'));

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'tenant-portal',
    route: '-',
    role: 'TENANT',
    permissionContext: 'tenant portal',
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

async function tenantEmail(api: { loginRole(r: string): Promise<string>; raw(m: string, p: string): Promise<{ status: number; body: unknown }> }): Promise<string> {
  await api.loginRole('SUPER_ADMIN');
  const s = loadState();
  if (s.tenantIds[0]) {
    const t = await api.raw('GET', `/tenants/${s.tenantIds[0]}`);
    const email = ((t.body as { data?: { email?: string } }).data?.email);
    if (email) return email;
  }
  return s.roleEmails.TENANT ?? 'qa.tenant2@propmgmt.com';
}

test.describe.serial('Iteration 10 — Tenant portal', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let email = '';

  test('10.0 resolve tenant credential', async ({ api }) => {
    email = await tenantEmail(api);
    recordRow(row({
      route: 'bootstrap',
      scenario: 'Resolve onboarded tenant email for portal login.',
      expected: 'Non-empty email',
      actual: email,
      status: email ? 'Passed' : 'Blocked'
    }));
    expect(email.length).toBeGreaterThan(3);
  });

  for (const spec of TENANT_ROUTES) {
    test(`10.UI ${spec.path}`, async ({ page, api, web }) => {
      if (!email) email = await tenantEmail(api);
      const landed = await uiLogin(page, email);
      const target = spec.path;
      await page.goto(`${web}${target}`);
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      const onLogin = /\/auth\/login/.test(url);
      const ok = !onLogin;
      recordRow(row({
        module: spec.module,
        route: spec.path,
        scenario: `Tenant UI navigates to ${spec.path} without auth redirect.`,
        steps: `uiLogin(${email}) → goto ${target}`,
        expected: 'Not redirected to /auth/login',
        actual: `landedAfterLogin=${landed} url=${url}`,
        status: ok ? 'Passed' : 'Failed'
      }));
      expect(ok).toBe(true);
    });
  }

  test('10.API GET /tenant-portal/my-contracts', async ({ api }) => {
    await api.login(email);
    const r = await api.raw('GET', '/tenant-portal/my-contracts');
    recordRow(row({
      route: 'GET /tenant-portal/my-contracts',
      scenario: 'Tenant lists own contracts.',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('10.API GET /complaints/my', async ({ api }) => {
    await api.login(email);
    const r = await api.raw('GET', '/complaints/my');
    recordRow(row({
      route: 'GET /complaints/my',
      module: 'complaints',
      scenario: 'Tenant lists own complaints.',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('10.API TENANT denied GET /users (403)', async ({ api }) => {
    await api.login(email);
    const r = await api.raw('GET', '/users?page=0&size=1');
    recordRow(row({
      route: 'GET /users',
      scenario: 'Tenant cannot list admin users.',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });
});
