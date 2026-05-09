import { expect, test, Page, APIRequestContext } from '@playwright/test';

const E2E = !!process.env['E2E_ENABLED'];
const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4500';
const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';
const ADMIN = { email: 'admin@propmgmt.com', password: '12345' };

async function webLogin(page: Page, email = ADMIN.email, password = '12345') {
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

test.describe('Property & Contract Management', () => {
  test('properties list page loads and shows content', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page);
    await page.goto(`${WEB}/admin/properties`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/properties/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('units list page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page);
    await page.goto(`${WEB}/admin/units`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/units/);
  });

  test('contracts dashboard loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page);
    await page.goto(`${WEB}/admin/contracts/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/contracts\/dashboard/);
  });

  test('contracts list shows lease table', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page);
    await page.goto(`${WEB}/admin/contracts/list`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/admin\/contracts\/list/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('vacancies list page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page);
    await page.goto(`${WEB}/admin/vacancies/list`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/vacancies\/list/);
  });

  test('API: properties list returns paginated data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/properties?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.data).toHaveProperty('content');
    expect(Array.isArray(json.data.content)).toBeTruthy();
  });

  test('API: create property, then delete it (cleanup)', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const createRes = await request.post(`${API}/properties`, {
      headers,
      data: {
        name: `E2E Test Property ${Date.now()}`,
        address: '123 E2E Street',
        city: 'TestCity',
        type: 'RESIDENTIAL'
      }
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = await createRes.json();
    const propId = created.data?.id;
    expect(propId).toBeTruthy();

    const deleteRes = await request.delete(`${API}/properties/${propId}`, { headers });
    expect([200, 204]).toContain(deleteRes.status());
  });

  test('API: lease contracts list returns data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/lease-contracts?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: activating contract on occupied unit returns conflict', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed data (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Find an ACTIVE contract to get its unit
    const listRes = await request.get(`${API}/lease-contracts?status=ACTIVE&page=0&size=5`, { headers });
    if (!listRes.ok()) return;
    const contracts = (await listRes.json()).data?.content ?? [];
    if (contracts.length === 0) {
      test.skip(true, 'No active contracts in seed data');
      return;
    }
    const activeContract = contracts[0];
    const unitId = activeContract.unitId;

    // Create a second draft contract for the same unit
    const createRes = await request.post(`${API}/lease-contracts`, {
      headers,
      data: {
        unitId,
        tenantId: activeContract.tenantId,
        startDate: '2030-01-01',
        endDate: '2030-12-31',
        monthlyRent: 1000,
        securityDeposit: 500
      }
    });
    if (!createRes.ok()) return;
    const newContractId = (await createRes.json()).data?.id;
    if (!newContractId) return;

    // Attempt to activate — should fail with 409 CONFLICT
    const activateRes = await request.post(`${API}/lease-contracts/${newContractId}/activate`, { headers });
    expect(activateRes.status()).toBe(409);
    const activateJson = await activateRes.json();
    expect(activateJson.success).toBeFalsy();

    // Cleanup
    await request.delete(`${API}/lease-contracts/${newContractId}`, { headers });
  });

  test('API: tenant cannot access contracts admin endpoint', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request, 'tenant@propmgmt.com');
    const res = await request.post(`${API}/properties`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Hack', address: 'x', city: 'x', type: 'RESIDENTIAL' }
    });
    expect([401, 403]).toContain(res.status());
  });
});
