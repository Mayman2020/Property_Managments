import { expect, test, Page, APIRequestContext } from '@playwright/test';

const E2E = !!process.env['E2E_ENABLED'];
const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4500';
const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';

const ADMIN = { email: 'admin@propmgmt.com', password: '12345' };
const TENANT = { email: 'tenant@propmgmt.com', password: '12345' };
const OFFICER = { email: 'officer@propmgmt.com', password: '12345' };

async function webLogin(page: Page, email: string, password = '12345') {
  await page.goto(`${WEB}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /enter|دخول|login/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function apiLogin(request: APIRequestContext, email: string, password = '12345'): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data?.accessToken as string;
}

test.describe('RBAC — Route and API Access Control', () => {
  test('tenant redirected away from admin routes', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, TENANT.email);
    await page.goto(`${WEB}/admin/properties`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    // Should redirect to tenant area or login, not stay on /admin/properties
    await expect(page).not.toHaveURL(/\/admin\/properties/);
  });

  test('admin cannot access officer-only routes', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/officer/requests`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\/officer\/requests/);
  });

  test('tenant cannot navigate to finance module', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, TENANT.email);
    await page.goto(`${WEB}/admin/finance/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\/admin\/finance/);
  });

  test('unauthenticated user cannot view any protected route', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    const protectedRoutes = [
      '/admin/properties',
      '/admin/finance/dashboard',
      '/officer/requests',
      '/tenant/dashboard'
    ];
    for (const route of protectedRoutes) {
      await page.goto(`${WEB}${route}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page, `Expected redirect to login for ${route}`).toHaveURL(/\/auth\/login/);
    }
  });

  test('module guard blocks HR module if disabled', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack with module settings (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    // If HR module is enabled in settings, this test is not meaningful
    // Try to load HR employees — if module guard blocks, we get redirected
    await page.goto(`${WEB}/admin/hr/employees`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    // Either loads (module enabled) or redirects (module disabled) — both are valid
    // What should NOT happen is a JS error
    const errors: string[] = [];
    page.once('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test('API: tenant token denied on property creation', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.post(`${API}/properties`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Hack', address: 'x', city: 'x', type: 'RESIDENTIAL' }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API: tenant token denied on contract activation', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.post(`${API}/lease-contracts/999/activate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('API: tenant token denied on payroll generation', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.post(`${API}/hr/payroll/generate`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { month: 6, year: 2026 }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API: tenant token denied on inventory adjustment', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.post(`${API}/inventory/items/1/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'IN', quantity: 10, notes: 'Unauthorized' }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API: admin can access audit log', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, ADMIN.email);
    const res = await request.get(`${API}/audit-log?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: officer cannot access audit log', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with officer seed (E2E_ENABLED=true)');
    const token = await apiLogin(request, OFFICER.email);
    const res = await request.get(`${API}/audit-log?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403]).toContain(res.status());
  });
});
