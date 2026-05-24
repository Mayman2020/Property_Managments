/**
 * Iteration 11 — Officer / company portal UI routes + APIs.
 */
import { test, expect, uiLogin } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { ROUTES } from './routes';
import { QA_CREDENTIALS, RoleKey } from './credentials';

const ITER = 11;
const OFFICER_ROUTES = ROUTES.filter((r) => r.path.startsWith('/officer/'));

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'officer-portal',
    route: '-',
    role: '-',
    permissionContext: 'officer portal',
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

const ROLE_MATRIX: Array<{ role: RoleKey; paths: string[] }> = [
  {
    role: 'MAINTENANCE_OFFICER_INTERNAL',
    paths: ['/officer/schedule', '/officer/requests', '/officer/my-requests', '/officer/profile', '/officer/notifications']
  },
  {
    role: 'MAINTENANCE_COMPANY',
    paths: ['/officer/company-queue', '/officer/invoices', '/officer/my-staff', '/officer/profile', '/officer/notifications']
  }
];

test.describe.serial('Iteration 11 — Officer portal', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  for (const { role, paths } of ROLE_MATRIX) {
    for (const path of paths) {
      test(`11.UI ${role} ${path}`, async ({ page, web }) => {
        const cred = QA_CREDENTIALS[role];
        await uiLogin(page, cred.email, cred.password);
        await page.goto(`${web}${path}`);
        await page.waitForLoadState('domcontentloaded');
        const url = page.url();
        const ok = !/\/auth\/login/.test(url);
        recordRow(row({
          role,
          route: path,
          module: OFFICER_ROUTES.find((r) => r.path === path)?.module ?? 'officer-portal',
          scenario: `${role} opens ${path} in browser.`,
          steps: `uiLogin → goto ${path}`,
          expected: 'Not redirected to login',
          actual: url,
          status: ok ? 'Passed' : 'Failed'
        }));
        expect(ok).toBe(true);
      });
    }
  }

  test('11.API internal officer schedule endpoint', async ({ api }) => {
    await api.loginRole('MAINTENANCE_OFFICER_INTERNAL');
    const me = await api.raw('GET', '/users/me');
    const officerId = ((me.body as { data?: { id?: number } }).data?.id);
    const r = officerId
      ? await api.raw('GET', `/maintenance/requests/officer/${officerId}?page=0&size=5`)
      : { status: 0, body: null };
    recordRow(row({
      role: 'MAINTENANCE_OFFICER_INTERNAL',
      route: 'GET /maintenance/requests/officer/{id}',
      scenario: 'Officer schedule API reachable.',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('11.API company queue', async ({ api }) => {
    await api.loginRole('MAINTENANCE_COMPANY');
    const r = await api.raw('GET', '/maintenance/requests/company-queue?page=0&size=5');
    recordRow(row({
      role: 'MAINTENANCE_COMPANY',
      route: 'GET /maintenance/requests/company-queue',
      scenario: 'Company queue list reachable (may be empty).',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });
});
