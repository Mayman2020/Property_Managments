/**
 * Iteration 15 — Final QA pass for remaining non-blocking items:
 *   budget threshold notification, mark-one-read UI, AUTO_PUBLISHED vacancy,
 *   notification deep links, admin settings screens (audit, modules, screens, permissions).
 */
import { test, expect, Page } from './fixtures';
import { uiLogin } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';
import { QA_CREDENTIALS } from './credentials';
import { forceContractEndDatePast, seedBudgetRow, unpublishVacancyForUnit } from './db-helper';

const ITER = 15;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'final-qa',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Medium',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; }
interface PageEnv<T> { content: T[]; totalElements?: number; }
interface NotifRow {
  id: number;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  propertyId?: number;
  requestId?: number;
  params?: Record<string, unknown>;
}
interface VacancyRow { id: number; listingSource?: string; isPublished?: boolean; }
interface ContractResponse { id: number; unitId?: number; propertyId?: number; status?: string; }

interface QaApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: 'SUPER_ADMIN' | 'OWNER'): Promise<string>;
}

interface UnreadCountData { unreadCount?: number; }

async function readUnreadCount(api: QaApi): Promise<number> {
  const r = await api.raw('GET', '/notifications/my/unread-count');
  const data = (r.body as ApiEnvelope<UnreadCountData | number>).data;
  if (typeof data === 'number') return data;
  return data?.unreadCount ?? 0;
}

const isOk = (s: number) => s === 200 || s === 201;

async function makeFreshDraft(api: QaApi, tag: string) {
  const s = loadState();
  const fileUrl = s.placeholderFileUrl!;
  const tenantId = s.tenantIds[0];
  if (!tenantId) throw new Error('No bootstrapped tenant — rerun iter 0.');

  const ownerResp = await api.raw('POST', '/owners', {
    fullNameAr: `مالك ${tag}`,
    fullNameEn: `Owner ${tag}`,
    nationalId: `OW${tag}`,
    phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
  });
  const ownerId = (ownerResp.body as ApiEnvelope<{ id: number }>).data!.id;

  const propResp = await api.raw('POST', '/properties', {
    propertyNameEn: `FQA-${tag}`,
    propertyNameAr: `FQA-${tag}`,
    propertyType: 'RESIDENTIAL',
    address: `FQA St ${tag}`,
    totalFloors: 1,
    totalUnits: 1,
    floorUnitsConfig: { '1': 1 },
    ownerIds: [ownerId],
    ownerDocumentFiles: [fileUrl]
  });
  const propertyId = (propResp.body as ApiEnvelope<{ id: number }>).data!.id;

  const floorsResp = await api.raw('GET', `/properties/${propertyId}/floors`);
  const floorId = ((floorsResp.body as ApiEnvelope<Array<{ id: number }>>).data ?? [])[0]?.id;
  const unitResp = await api.raw('POST', '/units', {
    propertyId,
    floorId,
    unitType: 'APARTMENT',
    furnishedStatus: 'UNFURNISHED',
    areaSqm: 70,
    bedrooms: 1,
    bathrooms: 1,
    rentAmount: 300,
    currency: 'OMR'
  });
  const unitId = (unitResp.body as ApiEnvelope<{ id: number }>).data!.id;

  const contractResp = await api.raw('POST', '/contracts', {
    tenantId,
    unitId,
    propertyId,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRent: 300,
    paymentFrequency: 'MONTHLY',
    paymentDay: 1,
    securityDeposit: 0,
    hasFreeMonth: false,
    contractPdfUrl: fileUrl
  });
  const contractId = (contractResp.body as ApiEnvelope<ContractResponse>).data!.id;
  return { propertyId, ownerId, unitId, tenantId, contractId };
}

function attachMonitors(page: Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !url.includes('favicon') && !url.includes('.map')) {
      failedRequests.push(`${res.status()} ${url}`);
    }
  });
  return { consoleErrors, failedRequests };
}

/** Expected URL prefix after clicking a notification (SUPER_ADMIN). null = stay on inbox. */
function expectedDeepLink(type: string, n: NotifRow): string | null {
  const p = n.params ?? {};
  if (
    type === 'CONTRACT_AWAITING_OWNER_REVIEW'
    || type === 'CONTRACT_TERMINATION_REQUESTED'
    || type === 'CONTRACT_RENEWAL_REQUESTED'
    || type === 'MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW'
    || type === 'MAINTENANCE_CONTRACT_TERMINATION_REQUESTED'
    || type === 'MAINTENANCE_CONTRACT_RENEWAL_REQUESTED'
  ) {
    return '/admin/owner-portal/contract-approvals';
  }
  if (n.requestId && n.requestId > 0 && (type.startsWith('REQUEST_') || type === 'MAINTENANCE_UPDATE' || type === 'MAINTENANCE_REQUEST_OVERDUE')) return '/admin/maintenance/';
  if (type === 'VACANCY_PUBLISHED') {
    const listingId = Number(p['listingId']);
    return Number.isFinite(listingId) && listingId > 0
      ? `/admin/vacancies/${listingId}/`
      : '/admin/vacancies/list';
  }
  if (type === 'INSPECTION_COMPLETED') {
    const inspectionId = Number(p['inspectionId']);
    return Number.isFinite(inspectionId) && inspectionId > 0 ? `/admin/inspections/${inspectionId}` : null;
  }
  if (type === 'RENTAL_INQUIRY_RECEIVED') {
    const listingId = Number(p['listingId']);
    return Number.isFinite(listingId) && listingId > 0 ? `/admin/vacancies/${listingId}/` : null;
  }
  const contractId = Number(p['contractId'] ?? (p['vars'] as Record<string, unknown> | undefined)?.['contractId']);
  if (Number.isFinite(contractId) && contractId > 0) return `/admin/contracts/${contractId}`;
  if (type === 'BUDGET_THRESHOLD_EXCEEDED' || type === 'FINANCE_ALERT') return '/admin/finance/expenses';
  if (type === 'PAYMENT_RECEIVED') return '/admin/accountant-portal/rent-confirmation';
  return null;
}

async function clickNotificationById(page: Page, api: QaApi, targetId: number): Promise<void> {
  let scope: 'recent' | 'older' = 'recent';
  let scopedList: NotifRow[] = [];
  for (const s of ['recent', 'older'] as const) {
    // Fetch up to 3 pages to locate notifications deep in the inbox
    let found = false;
    for (let pg = 0; pg <= 2 && !found; pg++) {
      const r = await api.raw('GET', `/notifications/my?scope=${s}&page=${pg}&size=50`);
      const content = ((r.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? [];
      if (content.length === 0) break;
      const idx = content.findIndex((n) => n.id === targetId);
      if (idx >= 0) {
        scope = s;
        scopedList = content;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  const index = scopedList.findIndex((n) => n.id === targetId);
  if (index < 0) throw new Error(`notification ${targetId} not in API list`);

  const pageSize = 5;
  const pageIndex = Math.floor(index / pageSize);
  const rowIndex = index % pageSize;
  await page.goto('/admin/notifications');
  await page.waitForSelector('.notification-row, app-empty-state', { timeout: 15000 });
  if (scope === 'older') {
    await page.locator('.notify-scope-tabs .mdc-tab').nth(1).click();
    await page.waitForTimeout(600);
  }
  if (pageIndex > 0) {
    const nextBtn = page.locator('app-table-pager button').last();
    for (let i = 0; i < pageIndex; i++) {
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
  }
  await page.locator('.notification-row').nth(rowIndex).click();
}

test.describe.serial('Iteration 15 — Final QA', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let budgetNotifId = 0;
  let budgetUnreadBefore = 0;

  test('15.1 Seed budget + POST expense triggers BUDGET_THRESHOLD_EXCEEDED notification', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const categoryId = 1;
    const budgetAmount = 50;

    try {
      await seedBudgetRow(api, propertyId, categoryId, budgetAmount);
    } catch (err) {
      recordRow(row({
        module: 'finance',
        route: 'property_mgmt.budgets (SQL seed)',
        scenario: 'Seed budget row for threshold alert (no public budget API).',
        expected: 'budget row inserted via psql',
        actual: `psql unavailable: ${err instanceof Error ? err.message : String(err)}`,
        status: 'Blocked',
        severity: 'High'
      }));
      test.skip();
      return;
    }

    const unreadBefore = await readUnreadCount(api as QaApi);

    const exp = await api.raw('POST', '/finance/expenses', {
      propertyId,
      categoryId,
      description: uniq('QA budget breach'),
      amount: 75,
      expenseDate: isoToday()
    });
    const expenseId = ((exp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;

    await new Promise((r) => setTimeout(r, 500));

    const inbox = await api.raw('GET', '/notifications/my?scope=recent&page=0&size=20');
    const content = ((inbox.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? [];
    const alert = content.find((n) => n.type === 'BUDGET_THRESHOLD_EXCEEDED');
    budgetNotifId = alert?.id ?? 0;

    const unreadAfter = await readUnreadCount(api as QaApi);
    budgetUnreadBefore = unreadAfter;

    const recipientsOk = alert != null;
    const messageOk = (alert?.message ?? '').includes('تجاوز') || (alert?.message ?? '').includes('الميزانية');
    const linkOk = alert?.requestId == null && Number(alert?.params?.['expenseId']) === expenseId;
    const unreadIncreased = unreadAfter > unreadBefore;

    recordRow(row({
      module: 'finance',
      route: 'POST /finance/expenses → BUDGET_THRESHOLD_EXCEEDED',
      scenario: 'Expense spend exceeds seeded budget → finance alert notification for SUPER_ADMIN/GM/ACCOUNTANT.',
      steps: `seedBudgetRow(${propertyId}, cat=${categoryId}, ${budgetAmount}) → POST expense amount=75`,
      testData: `expenseId=${expenseId} notificationId=${budgetNotifId}`,
      expected: 'Notification type=BUDGET_THRESHOLD_EXCEEDED; unread count increases; params.expenseId set; requestId null',
      actual: `expStatus=${exp.status} notif=${alert?.type} unreadBefore=${unreadBefore} unreadAfter=${unreadAfter} expenseIdParam=${alert?.params?.['expenseId']} requestId=${alert?.requestId}`,
      status: isOk(exp.status) && recipientsOk && messageOk && linkOk && unreadIncreased ? 'Passed' : 'Failed',
      bugSummary: !linkOk && alert ? 'BUDGET_THRESHOLD stored expense id in requestId (wrong deep link)' : '',
      filesChanged: !linkOk ? 'FinanceService.java, notification-navigation.util.ts' : ''
    }));

    expect(isOk(exp.status)).toBe(true);
    expect(alert?.type).toBe('BUDGET_THRESHOLD_EXCEEDED');
    expect(linkOk).toBe(true);
    expect(unreadIncreased).toBe(true);
  });

  test('15.2 UI mark one notification as read — unread count decreases', async ({ page, api }) => {
    await api.loginRole('SUPER_ADMIN');
    if (!budgetNotifId) {
      const list = await api.raw('GET', '/notifications/my?scope=recent&page=0&size=5');
      const content = ((list.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? [];
      budgetNotifId = content.find((n) => !n.read)?.id ?? content[0]?.id ?? 0;
    }
    if (!budgetNotifId) {
      recordRow(row({
        module: 'notifications',
        route: '/admin/notifications',
        scenario: 'Mark single notification read from UI.',
        status: 'Blocked',
        notes: 'No notifications in inbox'
      }));
      test.skip();
      return;
    }

    const unreadBefore = await readUnreadCount(api as QaApi);
    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);
    await page.goto('/admin/notifications');
    await page.waitForSelector('.notification-row', { timeout: 15000 });

    const unreadRow = page.locator('.notification-row.unread').first();
    const hadUnread = await unreadRow.count();
    if (hadUnread > 0) {
      await unreadRow.click();
      await page.waitForTimeout(800);
    } else {
      await page.locator('.notification-row').first().click();
    }

    await api.loginRole('SUPER_ADMIN');
    const unreadAfter = await readUnreadCount(api as QaApi);
    const decreased = unreadAfter < unreadBefore;

    recordRow(row({
      module: 'notifications',
      route: '/admin/notifications',
      scenario: 'Click unread notification row → markRead + optional navigation; unread badge/count drops by 1.',
      steps: 'UI login → /admin/notifications → click first unread row → GET unread-count',
      testData: `notificationId=${budgetNotifId}`,
      expected: 'unreadAfter < unreadBefore',
      actual: `unreadBefore=${unreadBefore} unreadAfter=${unreadAfter}`,
      status: decreased || unreadBefore === 0 ? 'Passed' : 'Failed'
    }));
    expect(decreased || unreadBefore === 0).toBe(true);
  });

  test('15.3 AUTO_PUBLISHED vacancy after contract termination', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const tag = uniq('Vac');
    const f = await makeFreshDraft(api as QaApi, tag);

    try {
      await unpublishVacancyForUnit(api, f.unitId);
    } catch {
      /* optional cleanup */
    }

    await api.raw('PATCH', `/contracts/${f.contractId}/activate`);
    const term = await api.raw('PATCH', `/contracts/${f.contractId}/terminate`, {
      terminationDate: isoToday(),
      terminationReason: 'QA auto vacancy',
      securityDepositReturnToTenant: true,
      hasDamages: false,
      damagesPaidByTenant: false
    });
    expect(term.status).toBe(200);

    const dec = await api.raw('POST', `/owner-portal/contracts/${f.contractId}/termination-decision`, {
      decision: 'APPROVED'
    });
    const afterStatus = ((dec.body as ApiEnvelope<ContractResponse>).data?.status);
    expect(dec.status).toBe(200);
    expect(afterStatus).toBe('TERMINATED');

    const vac = await api.raw('GET', `/vacancies/by-unit/${f.unitId}`);
    const listing = (vac.body as ApiEnvelope<VacancyRow>).data;
    const source = listing?.listingSource ?? '';
    const published = listing?.isPublished === true;

    recordRow(row({
      module: 'vacancies',
      route: 'PATCH terminate → owner approve → autoPublishFromContract',
      scenario: 'TERMINATED lease on vacant unit auto-publishes vacancy listingSource=AUTO_PUBLISHED.',
      steps: 'Fresh contract → activate → terminate → owner APPROVED → GET /vacancies/by-unit/{unitId}',
      testData: `contractId=${f.contractId} unitId=${f.unitId} listingId=${listing?.id ?? 'null'}`,
      expected: 'listingSource=AUTO_PUBLISHED; isPublished=true',
      actual: `termStatus=${term.status} contractStatus=${afterStatus} source=${source} published=${published}`,
      status: source === 'AUTO_PUBLISHED' && published ? 'Passed' : 'Failed'
    }));
    expect(source).toBe('AUTO_PUBLISHED');
    expect(published).toBe(true);
  });

  test('15.4 AUTO_PUBLISHED via EXPIRED contract + dev scheduler backfill', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const tag = uniq('ExpVac');
    const f = await makeFreshDraft(api as QaApi, tag);

    try {
      await unpublishVacancyForUnit(api, f.unitId);
      await forceContractEndDatePast(api, f.contractId);
    } catch (err) {
      recordRow(row({
        module: 'vacancies',
        route: 'POST /dev/schedulers/vacancy-auto-publish',
        scenario: 'EXPIRED contract backfill publishes AUTO_PUBLISHED vacancy.',
        actual: `DB helper failed: ${err instanceof Error ? err.message : String(err)}`,
        status: 'Blocked'
      }));
      test.skip();
      return;
    }

    await api.raw('PATCH', `/contracts/${f.contractId}/activate`);
    const sched = await api.raw('POST', '/dev/schedulers/contract-expiring');
    const status = ((await api.raw('GET', `/contracts/${f.contractId}`)).body as ApiEnvelope<ContractResponse>).data?.status;

    const backfill = await api.raw('POST', '/dev/schedulers/vacancy-auto-publish');
    const vac = await api.raw('GET', `/vacancies/by-unit/${f.unitId}`);
    const listing = (vac.body as ApiEnvelope<VacancyRow>).data;
    const source = listing?.listingSource ?? '';

    recordRow(row({
      module: 'vacancies',
      route: 'POST /dev/schedulers/vacancy-auto-publish',
      scenario: 'Past end date → contract-expiring marks EXPIRED → vacancy-auto-publish backfill.',
      steps: 'forceContractEndDatePast → activate → contract-expiring → vacancy-auto-publish',
      testData: `contractId=${f.contractId} unitId=${f.unitId}`,
      expected: 'contract EXPIRED; listingSource=AUTO_PUBLISHED',
      actual: `sched=${sched.status} contractStatus=${status} backfill=${backfill.status} source=${source}`,
      status: status === 'EXPIRED' && source === 'AUTO_PUBLISHED' ? 'Passed' : 'Failed'
    }));
    expect(status).toBe('EXPIRED');
    expect(source).toBe('AUTO_PUBLISHED');
  });

  test('15.5 Notification deep links — click each type from UI', async ({ page, api }) => {
    test.setTimeout(240_000); // 21+ types × ~5s each needs generous timeout
    await api.loginRole('SUPER_ADMIN');
    const all: NotifRow[] = [];
    for (const scope of ['recent', 'older'] as const) {
      const r = await api.raw('GET', `/notifications/my?scope=${scope}&page=0&size=100`);
      all.push(...(((r.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? []));
    }
    const byType = new Map<string, NotifRow>();
    for (const n of all) {
      const t = n.type ?? 'UNKNOWN';
      if (!byType.has(t)) byType.set(t, n);
    }

    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);
    const results: string[] = [];
    let failures = 0;

    for (const [type, n] of byType) {
      const expected = expectedDeepLink(type, n);
      await clickNotificationById(page, api as QaApi, n.id);
      await page.waitForTimeout(800);
      const urlAfter = page.url();

      let ok = true;
      if (expected) {
        ok = urlAfter.includes(expected);
      } else {
        ok = !urlAfter.includes('/admin/maintenance/');
      }
      if (!ok) failures++;
      results.push(`${type}:${ok ? 'ok' : `fail→${urlAfter}`}`);
    }

    recordRow(row({
      module: 'notifications',
      route: '/admin/notifications (deep links)',
      scenario: 'For each notification type in QA inbox, click row and verify navigation target.',
      steps: 'Collect unique types from API → UI click each → compare URL',
      testData: `types=${[...byType.keys()].join(',')}`,
      expected: 'Each type navigates to mapped screen or stays on inbox when unmapped',
      actual: results.join('; '),
      status: failures === 0 ? 'Passed' : 'Failed',
      severity: failures ? 'High' : 'Medium'
    }));
    expect(failures).toBe(0);
  });

  test('15.6 Admin UI — audit log filters and API', async ({ page, api }) => {
    const mon = attachMonitors(page);
    await api.loginRole('SUPER_ADMIN');
    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);

    const apiPromise = page.waitForResponse(
      (r) => r.url().includes('/audit-logs') && r.request().method() === 'GET',
      { timeout: 20000 }
    );
    await page.goto('/admin/audit-log');
    const apiRes = await apiPromise;
    expect(apiRes.status()).toBe(200);

    await page.waitForSelector('app-filter-bar, app-empty-state, .app-data-table', { timeout: 15000 });
    const filterSelect = page.locator('app-filter-bar mat-select').first();
    if (await filterSelect.count()) {
      await filterSelect.click();
      await page.locator('mat-option').first().click();
      await page.waitForTimeout(800);
    }

    recordRow(row({
      module: 'audit',
      route: '/admin/audit-log',
      scenario: 'Audit log loads; filter bar issues filtered GET /audit-logs.',
      steps: 'Open screen → wait API 200 → apply first filter',
      expected: 'HTTP 200; no console/network errors',
      actual: `api=${apiRes.status()} consoleErrors=${mon.consoleErrors.length} failedReqs=${mon.failedRequests.length}`,
      status: apiRes.status() === 200 && mon.consoleErrors.length === 0 ? 'Passed' : 'Failed'
    }));
    expect(mon.consoleErrors).toEqual([]);
  });

  test('15.7 Admin UI — module settings toggle + save', async ({ page, api }) => {
    const mon = attachMonitors(page);
    await api.loginRole('SUPER_ADMIN');
    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);
    await page.goto('/admin/module-settings');
    await page.waitForSelector('mat-select, .module-table', { timeout: 20000 });

    const propSelect = page.locator('mat-select').first();
    await propSelect.click();
    await page.locator('mat-option').first().click();
    await page.waitForTimeout(1000);

    const savePromise = page.waitForResponse(
      (r) => r.url().includes('/property-modules/') && r.request().method() === 'PUT',
      { timeout: 20000 }
    ).catch(() => null);

    const toggle = page.locator('mat-slide-toggle').first();
    await toggle.click();
    await page.getByRole('button', { name: /save|حفظ|SAVE_SETTINGS/i }).click();
    const saveRes = await savePromise;

    recordRow(row({
      module: 'settings',
      route: '/admin/module-settings',
      scenario: 'Select property → toggle module → save issues PUT property-modules.',
      steps: 'Open module settings → toggle → Save settings',
      expected: 'PUT 200; success snack; no console errors',
      actual: `saveStatus=${saveRes?.status() ?? 'no-request'} consoleErrors=${mon.consoleErrors.length}`,
      status: saveRes && saveRes.status() === 200 && mon.consoleErrors.length === 0 ? 'Passed' : 'Failed'
    }));
    expect(saveRes?.status()).toBe(200);
  });

  test('15.8 Admin UI — screen settings global toggle', async ({ page }) => {
    const mon = attachMonitors(page);
    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);
    await page.goto('/admin/screens');
    await page.waitForSelector('.screen-row, mat-slide-toggle', { timeout: 20000 });

    const putPromise = page.waitForResponse(
      (r) => r.url().includes('/screen-settings/') && r.request().method() === 'PUT',
      { timeout: 20000 }
    );
    await page.locator('mat-slide-toggle').first().click();
    const putRes = await putPromise;

    recordRow(row({
      module: 'permissions',
      route: '/admin/screens',
      scenario: 'Global screen toggle persists via PUT /screen-settings/{key}.',
      steps: 'Open screens → flip first global toggle',
      expected: 'PUT 200; no console errors',
      actual: `putStatus=${putRes.status()} consoleErrors=${mon.consoleErrors.length}`,
      status: putRes.status() === 200 && mon.consoleErrors.length === 0 ? 'Passed' : 'Failed'
    }));
    expect(putRes.status()).toBe(200);
  });

  test('15.9 Admin UI — permissions matrix toggle + apply', async ({ page }) => {
    const mon = attachMonitors(page);
    await uiLogin(page, QA_CREDENTIALS.SUPER_ADMIN.email, QA_CREDENTIALS.SUPER_ADMIN.password);
    await page.goto('/admin/permissions');
    await page.waitForSelector('.permissions-page table, .permission-row', { timeout: 20000 });

    await page.locator('table tbody tr').first().click();
    await page.waitForSelector('mat-dialog-container mat-slide-toggle', { timeout: 10000 });
    await page.locator('mat-dialog-container mat-slide-toggle').first().click();

    const putPromise = page.waitForResponse(
      (r) => r.url().includes('/role-permissions/') && r.request().method() === 'PUT',
      { timeout: 20000 }
    );
    await page.getByRole('button', { name: /apply|تطبيق/i }).click();
    const putRes = await putPromise;

    recordRow(row({
      module: 'permissions',
      route: '/admin/permissions',
      scenario: 'Open role dialog → toggle permission → Apply saves matrix.',
      steps: 'Click role row → toggle in dialog → Apply',
      expected: 'PUT /role-permissions/{role} 200',
      actual: `putStatus=${putRes.status()} consoleErrors=${mon.consoleErrors.length}`,
      status: putRes.status() === 200 && mon.consoleErrors.length === 0 ? 'Passed' : 'Failed'
    }));
    expect(putRes.status()).toBe(200);
  });
});
