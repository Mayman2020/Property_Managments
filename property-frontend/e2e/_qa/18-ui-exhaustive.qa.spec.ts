/**
 * Iteration 18 — Exhaustive UI screen sweep (all discovered routes).
 */
import { test, expect, uiLogin } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { QA_CREDENTIALS, RoleKey } from './credentials';
import { loadFrontendRoutes } from './inventories/load-inventories';
import { discoverParamIds, ParamIds, resolveParamRoute } from './param-resolver';
import { ROUTES } from './routes';

const ITER = 18;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'ui-sweep',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Info',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

function attachMonitors(page: import('@playwright/test').Page) {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text());
    }
  });
  return { consoleErrors };
}

const PORTAL_ROLES: Array<{ portal: string; role: RoleKey; prefix: string }> = [
  { portal: 'admin', role: 'SUPER_ADMIN', prefix: '/admin' },
  { portal: 'tenant', role: 'TENANT', prefix: '/tenant' },
  { portal: 'officer', role: 'MAINTENANCE_OFFICER_INTERNAL', prefix: '/officer' },
  { portal: 'employee', role: 'HR_OFFICER', prefix: '/employee' }
];

test.describe.serial('Iteration 18 — UI exhaustive', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let paramIds: ParamIds = {};

  test('18.0 discover params', async ({ api }) => {
    paramIds = await discoverParamIds(api);
    recordRow(row({ route: 'param-resolver', scenario: 'Param ids for UI sweep', status: 'Passed' }));
  });

  for (const { portal, role, prefix } of PORTAL_ROLES) {
    test(`18.1 [${portal}] route sweep as ${role}`, async ({ page, web }) => {
      test.setTimeout(600_000);
      const mon = attachMonitors(page);
      await uiLogin(page, QA_CREDENTIALS[role].email, QA_CREDENTIALS[role].password);

      const discovered = loadFrontendRoutes().filter((r) => {
        if (!r.path.startsWith(prefix)) return false;
        const def = ROUTES.find((x) => x.path === r.path);
        return !def || def.allow.includes(role);
      });
      const paramFromRoutes = ROUTES.filter((r) => r.path.startsWith(prefix) && r.paramKind);
      const staticPaths = new Set(discovered.map((r) => r.path));
      for (const pr of paramFromRoutes) {
        const resolved = resolveParamRoute(pr.path, pr.paramKind, paramIds);
        if (resolved) staticPaths.add(resolved);
      }

      const failures: string[] = [];
      for (const routePath of [...staticPaths].sort()) {
        mon.consoleErrors.length = 0;
        await page.goto(`${web}${routePath}`).catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(250);

        if (/\/auth\/login/.test(page.url())) {
          failures.push(`${routePath}:login-redirect`);
          recordRow(row({
            module: portal,
            route: routePath,
            role,
            scenario: `UI sweep — open route`,
            actual: 'redirected to login',
            status: 'Failed'
          }));
          continue;
        }

        const tabs = page.locator('mat-tab, .mdc-tab');
        const tabCount = await tabs.count();
        for (let i = 0; i < Math.min(tabCount, 5); i++) {
          await tabs.nth(i).click().catch(() => {});
          await page.waitForTimeout(200);
        }

        const filterBar = page.locator('app-filter-bar mat-select, app-filter-bar input').first();
        if (await filterBar.count()) {
          await filterBar.click().catch(() => {});
          await page.waitForTimeout(200);
          await page.keyboard.press('Escape').catch(() => {});
        }

        const jsErr = mon.consoleErrors.filter((e) => !e.includes('Failed to load resource'));
        const status = jsErr.length === 0 ? 'Passed' : 'Failed';
        if (jsErr.length) failures.push(`${routePath}:js`);
        recordRow(row({
          module: portal,
          route: routePath,
          role,
          scenario: 'UI sweep — open, tabs, filters',
          actual: `tabs=${tabCount} jsErrors=${jsErr.length}`,
          status,
          bugSummary: jsErr.length ? jsErr[0].slice(0, 120) : ''
        }));
      }

      recordRow(row({
        route: `${portal}-sweep-summary`,
        role,
        scenario: `Portal sweep complete`,
        actual: `routes=${staticPaths.size} failures=${failures.length}`,
        status: failures.length === 0 ? 'Passed' : 'Failed'
      }));
    });
  }
});
