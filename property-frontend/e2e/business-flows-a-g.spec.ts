import { test, expect } from '@playwright/test';

const API_BASE = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';
const WEB_BASE = process.env['E2E_WEB_URL'] ?? 'http://localhost:4500';
const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'];
const ADMIN_PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const E2E_UI = process.env['E2E_ENABLED'] === 'true';
const SUFFIX = `qa${Date.now()}`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
}

interface PageDto<T> {
  content: T[];
  totalElements: number;
}

interface NotificationDto {
  id: number;
  type: string;
  read: boolean;
}

async function login(request: import('@playwright/test').APIRequestContext): Promise<string> {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const json = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
  const token = json.data?.accessToken;
  expect(token).toBeTruthy();
  return token!;
}

async function apiGet<T>(request: import('@playwright/test').APIRequestContext, token: string, path: string, params?: Record<string, string | number>): Promise<ApiEnvelope<T>> {
  const res = await request.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params
  });
  expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
  return res.json() as Promise<ApiEnvelope<T>>;
}

async function apiPost<T>(request: import('@playwright/test').APIRequestContext, token: string, path: string, data: unknown): Promise<ApiEnvelope<T>> {
  const res = await request.post(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data
  });
  const body = await res.text();
  expect(res.ok(), `${path}: ${body}`).toBeTruthy();
  return JSON.parse(body) as ApiEnvelope<T>;
}

async function apiPatch<T>(request: import('@playwright/test').APIRequestContext, token: string, path: string, data?: unknown): Promise<ApiEnvelope<T>> {
  const res = await request.patch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: data ?? {}
  });
  const body = await res.text();
  expect(res.ok(), `${path}: ${body}`).toBeTruthy();
  return JSON.parse(body) as ApiEnvelope<T>;
}

test.describe('Business flows A–G (API)', () => {
  test('full admin journey: property through dashboard verification', async ({ request }) => {
    const token = await login(request);

    const prop = await apiPost<{ id: number }>(request, token, '/properties', {
      propertyCode: `P-${SUFFIX}`,
      propertyName: `QA Property ${SUFFIX}`,
      propertyNameAr: `عقار ${SUFFIX}`,
      propertyNameEn: `QA Property ${SUFFIX}`,
      city: 'Riyadh',
      propertyType: 'RESIDENTIAL',
      isActive: true
    });
    const propertyId = prop.data!.id;

    const unit = await apiPost<{ id: number }>(request, token, '/units', {
      propertyId,
      unitNumber: `U-${SUFFIX}`,
      unitType: 'APARTMENT',
      monthlyRent: 4500,
      isActive: true
    });
    const unitId = unit.data!.id;

    const statsAfter = await apiGet<{ totalUnits: number; vacantUnits: number }>(request, token, '/dashboard/stats');
    expect(statsAfter.data!.totalUnits).toBeGreaterThan(0);

    const activity = await apiGet<unknown[]>(request, token, '/dashboard/recent-activity', { limit: 5 });
    expect(Array.isArray(activity.data)).toBeTruthy();

    const finance = await apiGet<{ thisMonthCollected: number; overdueAmount: number }>(request, token, '/finance/dashboard');
    expect(typeof finance.data?.thisMonthCollected).toBe('number');

    const notifications = await apiGet<PageDto<NotificationDto>>(request, token, '/notifications/my', {
      page: 0,
      size: 20,
      scope: 'all'
    });
    expect(notifications.success).toBeTruthy();

    const unread = await apiGet<number>(request, token, '/notifications/my/unread-count');
    expect(typeof unread.data).toBe('number');

    await apiPost(request, token, '/dev/schedulers/run-all', {}).catch(() => {
      // Scheduler endpoints require SUPER_ADMIN; skip if role lacks permission
    });

    expect(propertyId).toBeTruthy();
    expect(unitId).toBeTruthy();
  });
});

test.describe('Business flows UI smoke', () => {
  test.beforeEach(() => {
    test.skip(!E2E_UI, 'Set E2E_ENABLED=true');
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set admin credentials');
  });

  test('reference screens and contracts dashboard KPIs', async ({ page }) => {
    await page.goto(`${WEB_BASE}/auth/login`);
    await page.getByLabel(/email|بريد/i).fill(ADMIN_EMAIL!);
    await page.getByLabel(/password|كلمة/i).fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /login|دخول/i }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 45000 });

    await page.goto(`${WEB_BASE}/admin/tenants`);
    await expect(page.locator('app-page-header')).toBeVisible();
    await expect(page.locator('app-filter-bar, .estate-search-inline').first()).toBeVisible();

    await page.goto(`${WEB_BASE}/admin/contracts/dashboard`);
    await expect(page.locator('.estate-stat-grid')).toBeVisible();

    await page.goto(`${WEB_BASE}/admin/notifications`);
    await expect(page.locator('app-page-header')).toBeVisible();
  });
});
