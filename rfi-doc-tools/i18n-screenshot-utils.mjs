/** Helpers so Playwright captures screens after Arabic translations load */

export function arabicInitScript() {
  localStorage.setItem('pm_lang', 'ar');
  document.documentElement.setAttribute('lang', 'ar-OM');
  document.documentElement.setAttribute('dir', 'rtl');
}

/** Call on BrowserContext or Page before first navigation */
export async function primeArabicLocale(target) {
  await target.addInitScript(arabicInitScript);
}

export async function newArabicContext(browser, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: 'ar-SA' });
  await primeArabicLocale(ctx);
  return ctx;
}

export async function waitForTranslations(page) {
  await page.waitForFunction(() => {
    const labels = Array.from(document.querySelectorAll('.nav-label, .sidebar-nav a, app-page-header h1, .page-title'));
    if (!labels.length) return false;
    const sample = labels.slice(0, 8).map((el) => (el.textContent || '').trim()).filter(Boolean);
    if (!sample.length) return false;
    return sample.every((t) => !/^[A-Z][A-Z0-9_.]+$/.test(t) && !/\?{3,}/.test(t));
  }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}

export async function waitStable(page) {
  await page.waitForFunction(
    () => !document.querySelector('vite-error-overlay'),
    { timeout: 60000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await waitForTranslations(page);
  await page.locator('mat-spinner').first().waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Reliable login when UI may be blocked by Vite overlay or HMR */
export async function apiLogin(page, baseUrl, apiBase, email, password) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('vite-error-overlay'), { timeout: 60000 }).catch(() => {});
  const result = await page.evaluate(
    async ({ baseUrl, apiBase, email, password }) => {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) return { ok: false, status: res.status };
      const json = await res.json();
      const data = json.data ?? json;
      localStorage.setItem('pm_access_token', data.accessToken);
      localStorage.setItem('pm_current_user', JSON.stringify(data.user));
      localStorage.setItem('pm_lang', 'ar');
      return { ok: true };
    },
    { baseUrl, apiBase, email, password }
  );
  if (!result.ok) throw new Error(`API login failed for ${email} (${result.status})`);
  await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitStable(page);
}
