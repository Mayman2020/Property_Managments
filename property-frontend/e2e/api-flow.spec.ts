import { test, expect } from '@playwright/test';

/**
 * End-to-end API checks against a running Spring Boot instance.
 * Set E2E_API_URL (default http://localhost:8080/api/v1), E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD.
 */
const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe('Backend API flow', () => {
  test('login then dashboard ratings-summary', async ({ request }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Define E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test');

    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    expect(loginRes.ok(), `login failed: ${loginRes.status()} ${await loginRes.text()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBeTruthy();
    const token = loginJson.data?.accessToken as string | undefined;
    expect(token).toBeTruthy();

    const ratingsRes = await request.get(`${API_BASE}/dashboard/ratings-summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(ratingsRes.ok(), `ratings-summary: ${ratingsRes.status()} ${await ratingsRes.text()}`).toBeTruthy();
    const ratingsJson = await ratingsRes.json();
    expect(ratingsJson.success).toBeTruthy();
    expect(ratingsJson.data).toMatchObject({
      averageRating: expect.any(Number),
      totalRatings: expect.any(Number)
    });
  });

  test('contractor companies list (admin token)', async ({ request }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Define E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test');

    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = (await loginRes.json()).data?.accessToken as string;

    const listRes = await request.get(`${API_BASE}/contractor-companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(listRes.ok(), await listRes.text()).toBeTruthy();
    const listJson = await listRes.json();
    expect(listJson.success).toBeTruthy();
    expect(Array.isArray(listJson.data)).toBeTruthy();
  });
});
