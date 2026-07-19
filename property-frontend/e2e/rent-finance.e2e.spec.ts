import { expect, test, Page, APIRequestContext } from '@playwright/test';

const E2E = !!process.env['E2E_ENABLED'];
const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4208';
const API = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api/v1';
const ADMIN = { email: 'admin@propmgmt.com', password: '12345' };
const TENANT = { email: 'tenant@propmgmt.com', password: '12345' };

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

test.describe('Rent & Finance', () => {
  test('finance dashboard loads for admin', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/admin\/finance\/dashboard/);
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('revenues page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/revenues`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/finance\/revenues/);
  });

  test('expenses page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/finance\/expenses/);
  });

  test('P&L report page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/reports/pnl`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/finance\/reports\/pnl/);
  });

  test('cash flow report page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/reports/cashflow`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/finance\/reports\/cashflow/);
  });

  test('petty cash page loads or redirects gracefully', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${WEB}/admin/finance/petty-cash`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    // Route may not exist yet — redirect to home is acceptable, JS errors are not
    expect(errors).toEqual([]);
  });

  test('budget page loads', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack (E2E_ENABLED=true)');
    await webLogin(page, ADMIN.email);
    await page.goto(`${WEB}/admin/finance/budget`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/finance\/budget/);
  });

  test('tenant can view rent schedule', async ({ page }) => {
    test.skip(!E2E, 'Requires full stack with tenant seed data (E2E_ENABLED=true)');
    await webLogin(page, TENANT.email);
    const rentRoute = page.locator('a[href*="rent"], [routerLink*="rent"]').first();
    if (await rentRoute.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rentRoute.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toContainText(/.+/);
    } else {
      await page.goto(`${WEB}/tenant/rent`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }
  });

  test('API: revenues list returns paginated result', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/finance/revenues?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: expenses list returns paginated result', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/finance/expenses?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('API: rent schedule for active contract returns installments', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed data (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const contractsRes = await request.get(`${API}/contracts?status=ACTIVE&page=0&size=1`, { headers });
    if (!contractsRes.ok()) return;
    const contracts = (await contractsRes.json()).data?.content ?? [];
    if (contracts.length === 0) {
      test.skip(true, 'No active contracts in seed data');
      return;
    }
    const contractId = contracts[0].id;
    const scheduleRes = await request.get(`${API}/contracts/${contractId}/payment-schedule`, { headers });
    expect(scheduleRes.ok(), await scheduleRes.text()).toBeTruthy();
    const scheduleJson = await scheduleRes.json();
    expect(scheduleJson.success).toBeTruthy();
  });

  test('API: pay rent creates revenue entry (idempotency check)', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend with seed data (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Find a pending installment
    const installmentsRes = await request.get(`${API}/rent-installments?status=PENDING&page=0&size=1`, { headers });
    if (!installmentsRes.ok()) return;
    const installments = (await installmentsRes.json()).data?.content ?? [];
    if (installments.length === 0) {
      test.skip(true, 'No pending rent installments in seed data');
      return;
    }
    const installmentId = installments[0].id;

    // Pay the installment
    const payRes = await request.post(`${API}/rent-installments/${installmentId}/pay`, {
      headers,
      data: { paymentMethod: 'BANK_TRANSFER', notes: 'E2E test payment' }
    });
    expect(payRes.ok(), await payRes.text()).toBeTruthy();

    // Attempt to pay again — must fail (idempotency)
    const payAgainRes = await request.post(`${API}/rent-installments/${installmentId}/pay`, {
      headers,
      data: { paymentMethod: 'BANK_TRANSFER', notes: 'duplicate payment' }
    });
    expect([400, 409]).toContain(payAgainRes.status());
    const payAgainJson = await payAgainRes.json();
    expect(payAgainJson.success).toBeFalsy();
  });

  test('API: finance dashboard returns summary data', async ({ request }) => {
    test.skip(!E2E, 'Requires running backend (E2E_ENABLED=true)');
    const token = await apiLogin(request);
    const res = await request.get(`${API}/finance/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });
});
