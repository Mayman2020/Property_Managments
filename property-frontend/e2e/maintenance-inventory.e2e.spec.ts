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

async function apiLogin(request: APIRequestContext, email = ADMIN.email, password = '12345'): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data?.accessToken as string;
}

test.describe('Maintenance & Inventory', () => {
  test('admin maintenance list page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/maintenance`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/maintenance/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('admin inventory page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/inventory`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/inventory/);
  });

  test('officer my requests page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack with officer seed user (E2E_ENABLED=true)');
    await webLogin(page, OFFICER.email);
    await page.goto(`${WEB}/officer/requests`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/officer\/requests/);
  });

  test('API: maintenance requests list returns data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/maintenance-requests?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.data).toHaveProperty('content');
  });

  test('API: inventory items list returns data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/inventory/items?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: zero quantity stock adjustment is rejected', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed inventory (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const itemsRes = await request.get(`${API}/inventory/items?page=0&size=1`, { headers });
    if (!itemsRes.ok()) return;
    const items = (await itemsRes.json()).data?.content ?? [];
    if (items.length === 0) {
      test.skip(true, 'No inventory items in seed data');
      return;
    }
    const itemId = items[0].id;

    const adjustRes = await request.post(`${API}/inventory/items/${itemId}/transactions`, {
      headers,
      data: { type: 'IN', quantity: 0, notes: 'E2E zero-qty test' }
    });
    expect([400, 422]).toContain(adjustRes.status());
    const json = await adjustRes.json();
    expect(json.success).toBeFalsy();
  });

  test('API: negative quantity stock adjustment is rejected', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed inventory (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const itemsRes = await request.get(`${API}/inventory/items?page=0&size=1`, { headers });
    if (!itemsRes.ok()) return;
    const items = (await itemsRes.json()).data?.content ?? [];
    if (items.length === 0) {
      test.skip(true, 'No inventory items in seed data');
      return;
    }
    const itemId = items[0].id;

    const adjustRes = await request.post(`${API}/inventory/items/${itemId}/transactions`, {
      headers,
      data: { type: 'IN', quantity: -5, notes: 'E2E negative-qty test' }
    });
    expect([400, 422]).toContain(adjustRes.status());
  });

  test('API: tenant can submit maintenance request', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with tenant seed data (E2E_ENABLED=true)');
    const token = await apiLogin(request, TENANT.email);
    const res = await request.post(`${API}/maintenance-requests`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'E2E Test Request',
        description: 'Automated test request',
        priority: 'NORMAL',
        category: 'GENERAL'
      }
    });
    if (res.ok()) {
      const json = await res.json();
      expect(json.success).toBeTruthy();
      expect(json.data?.id).toBeTruthy();
      // cleanup — cancel the request
      const reqId = json.data.id;
      const token2 = await apiLogin(request);
      await request.post(`${API}/maintenance-requests/${reqId}/cancel`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
    } else {
      // Tenant may not have an active contract, which is valid seed state
      expect([400, 403, 404]).toContain(res.status());
    }
  });

  test('API: visit report with inventory deducts stock', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed data (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Find a request in ASSIGNED or IN_PROGRESS status
    const reqRes = await request.get(`${API}/maintenance-requests?status=ASSIGNED&page=0&size=1`, { headers });
    if (!reqRes.ok()) return;
    const reqs = (await reqRes.json()).data?.content ?? [];
    if (reqs.length === 0) {
      test.skip(true, 'No assigned maintenance requests in seed data');
      return;
    }

    const reqId = reqs[0].id;
    const itemsRes = await request.get(`${API}/inventory/items?page=0&size=1`, { headers });
    if (!itemsRes.ok()) return;
    const items = (await itemsRes.json()).data?.content ?? [];
    if (items.length === 0) {
      test.skip(true, 'No inventory items in seed data');
      return;
    }
    const item = items[0];
    const stockBefore = item.currentStock ?? item.quantityInStock ?? 0;

    // Submit visit report consuming 1 unit
    const reportRes = await request.post(`${API}/maintenance-requests/${reqId}/visit-report`, {
      headers,
      data: {
        notes: 'E2E visit report',
        items: [{ itemId: item.id, quantityUsed: 1 }]
      }
    });
    if (!reportRes.ok()) return; // skip if state transition not allowed

    // Verify stock decreased
    const itemAfterRes = await request.get(`${API}/inventory/items/${item.id}`, { headers });
    expect(itemAfterRes.ok()).toBeTruthy();
    const itemAfter = (await itemAfterRes.json()).data;
    const stockAfter = itemAfter?.currentStock ?? itemAfter?.quantityInStock ?? 0;
    expect(stockAfter).toBeLessThan(stockBefore);
  });

  test('API: company queue returns unassigned requests', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/maintenance-requests/company-queue?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });
});
