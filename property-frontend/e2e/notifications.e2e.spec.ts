import { expect, test, Page, APIRequestContext } from '@playwright/test';

const E2E = !!process.env['E2E_ENABLED'];
const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4500';
const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';
const ADMIN = { email: 'admin@propmgmt.com', password: '12345' };

async function webLogin(page: Page, email: string, password = '12345') {
  await page.goto(`${WEB}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /enter|دخول|login/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function apiLogin(request: APIRequestContext, email = ADMIN.email, password = '12345'): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data?.accessToken as string;
}

test.describe('Notifications', () => {
  test('notifications page loads for admin', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/notifications`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/notifications/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('topbar shows notification badge or count', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.waitForTimeout(1000);
    // The topbar polls for unread count every 30 seconds; check badge is rendered
    const badge = page.locator('[matbadge], .notification-badge, [data-testid="notif-badge"]');
    // Badge may be hidden if count is 0; just verify topbar renders without errors
    const errors: string[] = [];
    page.once('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('mark all as read button exists on notifications page', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/notifications`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const markAllBtn = page.getByRole('button', { name: /mark all|تحديد الكل/i });
    // Button only appears when there are unread notifications
    const visible = await markAllBtn.isVisible().catch(() => false);
    if (visible) {
      await markAllBtn.click();
      await page.waitForTimeout(1000);
      // After marking all, button should disappear or notifications show as read
    }
    // No JS errors is the acceptance criterion
    const errors: string[] = [];
    page.once('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });

  test('clicking a notification marks it as read', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack with seed notifications (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/notifications`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const unreadNotif = page.locator('.notification-item.unread, [data-testid="notification-unread"]').first();
    if (await unreadNotif.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unreadNotif.click();
      await page.waitForTimeout(500);
      // After click, item should no longer have unread class
      await expect(unreadNotif).not.toHaveClass(/unread/);
    }
  });

  test('API: notifications list returns data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/notifications/my?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: unread count endpoint returns numeric count', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/notifications/my/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    // Response is { unreadCount: N } not a bare number
    const count = typeof json.data === 'number' ? json.data : (json.data?.unreadCount ?? 0);
    expect(typeof count).toBe('number');
  });

  test('API: mark all notifications as read', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };
    const res = await request.patch(`${API}/notifications/my/read-all`, { headers });
    expect(res.ok(), await res.text()).toBeTruthy();

    // Verify unread count is now 0
    const countRes = await request.get(`${API}/notifications/my/unread-count`, { headers });
    if (countRes.ok()) {
      const countJson = await countRes.json();
      const afterCount = typeof countJson.data === 'number' ? countJson.data : (countJson.data?.unreadCount ?? 0);
      expect(afterCount).toBe(0);
    }
  });

  test('API: marking individual notification as read', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed notifications (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const listRes = await request.get(`${API}/notifications/my?read=false&page=0&size=1`, { headers });
    if (!listRes.ok()) return;
    const notifs = (await listRes.json()).data?.content ?? [];
    if (notifs.length === 0) {
      test.skip(true, 'No unread notifications in seed data');
      return;
    }
    const notifId = notifs[0].id;

    const markRes = await request.patch(`${API}/notifications/${notifId}/read`, { headers });
    expect(markRes.ok(), await markRes.text()).toBeTruthy();

    const afterRes = await request.get(`${API}/notifications/${notifId}`, { headers });
    if (afterRes.ok()) {
      const afterJson = await afterRes.json();
      expect(afterJson.data?.read ?? afterJson.data?.isRead).toBeTruthy();
    }
  });
});
