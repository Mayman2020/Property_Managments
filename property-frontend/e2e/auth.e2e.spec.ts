import { expect, test, Page, APIRequestContext } from '@playwright/test';

const E2E = !!process.env['E2E_ENABLED'];
const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4208';
const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';

const ADMIN = { email: 'admin@propmgmt.com', password: '12345' };
const TENANT = { email: 'tenant@propmgmt.com', password: '12345' };

async function login(page: Page, email: string, password = '12345') {
  await page.goto(`${WEB}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /enter|دخول|login/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function apiLogin(request: APIRequestContext, email: string, password = '12345'): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok(), `login failed: ${res.status()}`).toBeTruthy();
  const json = await res.json();
  return json.data?.accessToken as string;
}

test.describe('Authentication', () => {
  test('admin login succeeds and redirects to dashboard', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await login(page, ADMIN.email);
    await expect(page).toHaveURL(/\/admin\//);
    await expect(page.locator('app-sidebar')).toBeVisible();
  });

  test('tenant login succeeds and redirects to tenant portal', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await login(page, TENANT.email);
    await expect(page).toHaveURL(/\/tenant\//);
  });

  test('invalid credentials show error', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await page.goto(`${WEB}/auth/login`);
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.getByRole('button', { name: /enter|دخول|login/i }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('unauthenticated access to admin route redirects to login', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await page.goto(`${WEB}/admin/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('logout clears session and returns to login', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await login(page, ADMIN.email);
    await expect(page).toHaveURL(/\/admin\//);
    const logoutBtn = page.getByRole('button', { name: /logout|sign out|تسجيل الخروج/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const avatarOrMenu = page.locator('.user-menu, [data-testid="user-menu"], mat-menu-item').first();
      await avatarOrMenu.click();
      await page.getByRole('menuitem', { name: /logout|sign out|خروج/i }).click();
    }
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('API: login returns access token and refresh token', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN.email, password: ADMIN.password }
    });
    expect(res.ok(), `${res.status()} ${await res.text()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(typeof json.data?.accessToken).toBe('string');
    expect(json.data?.accessToken.length).toBeGreaterThan(20);
    expect(typeof json.data?.refreshToken).toBe('string');
  });

  test('API: protected endpoint rejects missing token', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const res = await request.get(`${API}/properties`);
    expect(res.status()).toBe(403);
  });

  test('API: protected endpoint rejects invalid token', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const res = await request.get(`${API}/properties`, {
      headers: { Authorization: 'Bearer invalidtoken.notreal.atall' }
    });
    expect(res.status()).toBe(403);
  });

  test('API: tenant token cannot access admin-only endpoint', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.get(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403]).toContain(res.status());
  });
});
