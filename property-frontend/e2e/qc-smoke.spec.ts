import { expect, test, Page } from '@playwright/test';

const APP_BASE = process.env.E2E_WEB_URL ?? 'http://localhost:4500';

async function login(page: Page, email: string, password = '12345') {
  await page.goto(`${APP_BASE}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /enter|دخول|login/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function assertRouteLoads(page: Page, path: string) {
  const errors: string[] = [];
  const pageErrors: string[] = [];
  const consoleHandler = (msg: any) => {
    const text = msg.text();
    const ignorable =
      text.includes('ERR_CONNECTION_REFUSED') ||
      text.includes('ERR_ABORTED') ||
      text.includes('favicon.ico');
    if (msg.type() === 'error' && !ignorable) errors.push(text);
  };
  const pageErrorHandler = (err: Error) => pageErrors.push(err.message);

  page.on('console', consoleHandler);
  page.on('pageerror', pageErrorHandler);

  await page.goto(`${APP_BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(page.locator('body')).toContainText(/./);
  expect(pageErrors, `${path} page errors`).toEqual([]);
  expect(errors, `${path} console errors`).toEqual([]);

  page.off('console', consoleHandler);
  page.off('pageerror', pageErrorHandler);
}

test.describe('QC smoke', () => {
  test('super admin navigation and primary actions', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, 'admin@propmgmt.com');

    const routes = [
      '/admin/home',
      '/admin/dashboard',
      '/admin/properties',
      '/admin/units',
      '/admin/tenants',
      '/admin/maintenance',
      '/admin/inventory',
      '/admin/contracts/dashboard',
      '/admin/contracts/list',
      '/admin/contracts/complaints',
      '/admin/finance/dashboard',
      '/admin/finance/expenses',
      '/admin/finance/revenues',
      '/admin/finance/petty-cash',
      '/admin/finance/budget',
      '/admin/finance/reports/pnl',
      '/admin/finance/reports/cashflow',
      '/admin/finance/reports/owner-statement',
      '/admin/hr/employees',
      '/admin/hr/payroll',
      '/admin/hr/leaves',
      '/admin/hr/attendance',
      '/admin/contractors',
      '/admin/vacancies/list',
      '/admin/vacancies/1/inquiries',
      '/admin/notifications',
      '/admin/audit-log',
      '/admin/module-settings'
    ];

    for (const route of routes) {
      await assertRouteLoads(page, route);
    }

    await page.goto(`${APP_BASE}/admin/notifications`);
    const markAllButton = page.locator('app-page-header button, .app-page button').first();
    await expect(markAllButton).toBeVisible();
    await markAllButton.click();

    await page.goto(`${APP_BASE}/admin/module-settings`);
    const saveSettingsButton = page.getByRole('button', { name: /save settings|حفظ الإعدادات/i });
    await expect(saveSettingsButton).toBeVisible();
    await saveSettingsButton.click();
    await page.waitForTimeout(1000);

    await page.goto(`${APP_BASE}/admin/hr/payroll/4`);
    const approveButton = page.getByRole('button', { name: /approve payroll|اعتماد المسير/i });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await page.waitForTimeout(1000);

    const markPaidButton = page.getByRole('button', { name: /mark paid|تسجيل الصرف/i });
    await expect(markPaidButton).toBeVisible();
    await markPaidButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/paid|مدفوع|PAID/);
  });

  test('owner portal screens load for owner user', async ({ page }) => {
    test.setTimeout(90000);
    await login(page, 'owner@propmgmt.com');

    for (const route of [
      '/admin/owner-portal/dashboard',
      '/admin/owner-portal/statements',
      '/admin/owner-portal/properties',
      '/admin/notifications'
    ]) {
      await assertRouteLoads(page, route);
    }
  });
});
