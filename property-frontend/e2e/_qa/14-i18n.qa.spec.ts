/**
 * Iteration 14 — i18n / RTL smoke on auth login (EN + AR).
 */
import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';

const ITER = 14;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'i18n',
    route: '/auth/login',
    role: 'guest',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Low',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

async function switchLang(page: import('@playwright/test').Page, lang: 'en' | 'ar'): Promise<void> {
  const toggle = page.locator('[data-testid="lang-toggle"], button.lang-toggle, .lang-switch, mat-select[aria-label*="lang" i]').first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    const opt = page.getByRole('option', { name: lang === 'ar' ? /arabic|العربية|ar/i : /english|en/i });
    if (await opt.isVisible().catch(() => false)) await opt.click();
    return;
  }
  await page.evaluate((l) => {
    localStorage.setItem('lang', l);
    localStorage.setItem('locale', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }, lang);
  await page.reload();
}

test.describe.serial('Iteration 14 — i18n / RTL', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  test('14.1 login page EN — no missing translation keys', async ({ page, web }) => {
    await page.goto(`${web}/auth/login`);
    await switchLang(page, 'en');
    const body = await page.locator('body').innerText();
    const hasMissing = /MISSING|\.[A-Z0-9_]+\.[A-Z0-9_]+|\{\{/.test(body);
    recordRow(row({
      scenario: 'English login page renders without raw i18n keys.',
      steps: 'Set EN → inspect body text',
      expected: 'No MISSING or ALL_CAPS.KEY patterns',
      actual: `hasMissing=${hasMissing}`,
      status: !hasMissing ? 'Passed' : 'Failed'
    }));
    expect(hasMissing).toBe(false);
  });

  test('14.2 login page AR — RTL dir + no missing keys', async ({ page, web }) => {
    await page.goto(`${web}/auth/login`);
    await switchLang(page, 'ar');
    const dir = await page.locator('html').getAttribute('dir');
    const body = await page.locator('body').innerText();
    const hasMissing = /MISSING|\.[A-Z0-9_]+\.[A-Z0-9_]+|\{\{/.test(body);
    const rtlOk = dir === 'rtl';
    recordRow(row({
      scenario: 'Arabic login page uses RTL and translated strings.',
      steps: 'Set AR → check html[dir] and body',
      expected: 'dir=rtl; no missing keys',
      actual: `dir=${dir} hasMissing=${hasMissing}`,
      status: rtlOk && !hasMissing ? 'Passed' : 'Failed',
      notes: !rtlOk ? 'html[dir] not rtl — verify language toggle wiring' : ''
    }));
    expect(rtlOk).toBe(true);
    expect(hasMissing).toBe(false);
  });

  test('14.3 invalid login shows translated error EN', async ({ page, web }) => {
    await page.goto(`${web}/auth/login`);
    await switchLang(page, 'en');
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.locator('input[type="password"]').fill('wrong');
    await page.getByRole('button', { name: /enter|دخول|login|sign in/i }).click();
    await page.waitForTimeout(1500);
    const err = await page.locator('.error, .mat-mdc-snack-bar-label, [role="alert"], .login-error').first().innerText().catch(() => page.locator('body').innerText());
    const hasMissing = /MISSING|\.[A-Z0-9_]+\.[A-Z0-9_]+/.test(err);
    recordRow(row({
      scenario: 'Invalid login error message is translated (EN).',
      expected: 'Human-readable error, not a key',
      actual: err.slice(0, 120),
      status: !hasMissing && err.length > 5 ? 'Passed' : 'Failed'
    }));
    expect(hasMissing).toBe(false);
  });
});
