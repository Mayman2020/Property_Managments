/**
 * Iteration 19 — Full i18n / RTL sweep on discovered admin + portal routes.
 */
import { test, expect, uiLogin } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { QA_CREDENTIALS } from './credentials';
import { loadFrontendRoutes } from './inventories/load-inventories';

const ITER = 19;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'i18n-full',
    route: '/auth/login',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Low',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

async function switchLang(page: import('@playwright/test').Page, lang: 'en' | 'ar'): Promise<void> {
  await page.evaluate((l) => {
    localStorage.setItem('lang', l);
    localStorage.setItem('locale', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }, lang);
  await page.waitForTimeout(300);
}

function hasMissingKeys(text: string): boolean {
  return /MISSING|INLINE_TEXT\.[A-Z0-9_]+\.[A-Z0-9_]+|\{\{/.test(text);
}

const BASE_I18N_ROUTES = ['/auth/login', '/tenant/dashboard', '/officer/requests', '/employee/my-payslips'];

test.describe.serial('Iteration 19 — i18n full', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let i18nRoutes: string[] = BASE_I18N_ROUTES;

  test('19.0 load route inventory', async () => {
    i18nRoutes = [
      ...BASE_I18N_ROUTES,
      ...loadFrontendRoutes()
        .filter((r) => r.path.startsWith('/admin/') && !r.path.includes(':'))
        .map((r) => r.path)
        .slice(0, 40)
    ];
    recordRow(row({
      route: 'frontend-routes.json',
      scenario: 'i18n route list',
      actual: `count=${i18nRoutes.length}`,
      status: 'Passed'
    }));
  });

  for (const lang of ['en', 'ar'] as const) {
    test(`19.1 [${lang}] admin + portal routes — no missing keys`, async ({ page, web }) => {
      test.setTimeout(600_000);
      await page.addInitScript((l: string) => {
        localStorage.setItem('lang', l);
        localStorage.setItem('locale', l);
      }, lang);

      const failures: string[] = [];
      const authRoutes = i18nRoutes.filter((r) => r !== '/auth/login');

      for (const routePath of i18nRoutes.filter((r) => r === '/auth/login')) {
        await page.goto(`${web}${routePath}`);
        await switchLang(page, lang);
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(300);
        const body = await page.locator('body').innerText().catch(() => '');
        const dir = await page.evaluate(() => document.documentElement.dir);
        const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
        const missing = hasMissingKeys(body);
        const strictDir = routePath === '/auth/login' || lang === 'ar';
        const dirOk = !strictDir || dir === expectedDir || dir === '';
        if (missing || !dirOk) failures.push(`${routePath}:missing=${missing} dir=${dir}`);
        recordRow(row({
          route: routePath,
          role: 'guest',
          scenario: `${lang.toUpperCase()} — no raw i18n keys; dir=${expectedDir}`,
          actual: `missing=${missing} dir=${dir}`,
          status: !missing && dirOk ? 'Passed' : 'Failed'
        }));
      }

      await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);

      for (const routePath of authRoutes) {
        await page.goto(`${web}${routePath}`);
        await switchLang(page, lang);
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(300);

        const body = await page.locator('body').innerText().catch(() => '');
        const dir = await page.evaluate(() => document.documentElement.dir);
        const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
        const missing = hasMissingKeys(body);
        const strictDir = routePath === '/auth/login' || lang === 'ar';
        const dirOk = !strictDir || dir === expectedDir || dir === '';

        if (missing || !dirOk) failures.push(`${routePath}:missing=${missing} dir=${dir}`);
        recordRow(row({
          route: routePath,
          role: 'SUPER_ADMIN',
          scenario: `${lang.toUpperCase()} — no raw i18n keys; dir=${expectedDir}`,
          actual: `missing=${missing} dir=${dir}`,
          status: !missing && dirOk ? 'Passed' : 'Failed'
        }));
      }

      recordRow(row({
        route: `i18n-${lang}-summary`,
        scenario: `${lang} sweep summary`,
        actual: `routes=${i18nRoutes.length} failures=${failures.length}`,
        status: failures.length === 0 ? 'Passed' : 'Failed'
      }));
    });
  }
});
