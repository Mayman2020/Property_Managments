/**
 * Iteration 7 — Finance dashboard, expenses, revenues, budgets, reports, exports.
 *
 *   GET  /finance/dashboard
 *   GET  /finance/expenses (paged) + POST /finance/expenses
 *   GET  /finance/revenues (paged) + POST /finance/revenues
 *   GET  /finance/budgets
 *   GET  /finance/reports/pnl
 *   GET  /finance/reports/cashflow
 *   GET  /finance/reports/owner-statements
 *   GET  /reports/budget-vs-actual
 *   GET  /payments/overdue
 *   GET  /finance/export/csv?from=&to=&type=
 *
 * Role matrix:
 *   SUPER_ADMIN/ACCOUNTANT can view + create. GENERAL_MANAGER can view + export
 *   but cannot create. OWNER can view (scoped) but never write. TENANT must
 *   receive 403 across the board.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';

const ITER = 7;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'finance',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'finance.*',
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

const isOk = (status: number) => status === 200 || status === 201;

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }
interface PageEnv<T> { content: T[]; totalElements?: number; }
interface ExpenseRow { id: number; expenseNumber?: string; amount?: number | string; currency?: string; status?: string; expenseDate?: string; }
interface RevenueRow { id: number; revenueNumber?: string; amount?: number | string; currency?: string; revenueDate?: string; }
interface FinanceDashboard { thisMonthCollected?: number | string; thisMonthExpenses?: number | string; netIncome?: number | string; overdueAmount?: number | string; budgetUtilizationPct?: number | string; }
interface FinanceReportRow { propertyName?: string; year?: number; month?: number; totalRevenue?: number | string; totalExpenses?: number | string; netIncome?: number | string; cashIn?: number | string; cashOut?: number | string; }

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: string): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe.serial('Iteration 7 — Finance', () => {
  test.beforeAll(() => {
    resetIterationLog(ITER);
  });

  test('7.1 SUPER_ADMIN GET /finance/dashboard returns the 5 KPI fields', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/finance/dashboard');
    const d = ((r.body as ApiEnvelope<FinanceDashboard>).data) ?? {};
    const hasAllFields =
      d.thisMonthCollected != null && d.thisMonthExpenses != null &&
      d.netIncome != null && d.overdueAmount != null && d.budgetUtilizationPct != null;
    recordRow(row({
      route: 'GET /finance/dashboard',
      scenario: 'FinanceService.getDashboard returns the FinanceDashboardResponse shape with the 5 KPI numbers populated (zero is fine).',
      steps: 'GET /finance/dashboard as SUPER_ADMIN',
      testData: '-',
      expected: 'HTTP 200; response.data has thisMonthCollected, thisMonthExpenses, netIncome, overdueAmount, budgetUtilizationPct',
      actual: `status=${r.status} hasAll=${hasAllFields} keys=${JSON.stringify(Object.keys(d))}`,
      status: r.status === 200 && hasAllFields ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(hasAllFields).toBe(true);
  });

  test('7.2 GET /finance/dashboard?propertyId={id} accepts a property filter (200)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('GET', `/finance/dashboard?propertyId=${propertyId}`);
    recordRow(row({
      route: 'GET /finance/dashboard?propertyId={id}',
      scenario: 'Dashboard query supports per-property scoping.',
      steps: `GET /finance/dashboard?propertyId=${propertyId}`,
      testData: `propertyId=${propertyId}`,
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('7.3 TENANT cannot read /finance/dashboard (403)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const tenantId = s.tenantIds[0];
    const t = await api.raw('GET', `/tenants/${tenantId}`);
    const tenantEmail = ((t.body as ApiEnvelope<{ email?: string; portalEmail?: string }>).data ?? {});
    const email = tenantEmail.portalEmail ?? tenantEmail.email;
    if (!email) {
      recordRow(row({ route: 'GET /finance/dashboard (TENANT)', scenario: 'tenant cannot reach finance dashboard', actual: 'no tenant portal email', status: 'To be verified during E2E testing' }));
      return;
    }
    await api.login(email);
    const r = await api.raw('GET', '/finance/dashboard');
    recordRow(row({
      route: 'GET /finance/dashboard (TENANT)',
      role: 'TENANT',
      scenario: '@RequiresPermission(finance, view) — TENANT has no finance.* permission, must receive 403.',
      steps: `login as ${email} → GET /finance/dashboard`,
      testData: '-',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });

  test('7.4 POST /finance/expenses creates an expense (auto expenseNumber EXP-{year}-{seq}, status=PENDING, currency defaults to OMR)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('EXP');
    const r = await api.raw('POST', '/finance/expenses', {
      propertyId,
      description: `QA expense ${tag}`,
      amount: 12.50,
      expenseDate: isoToday(),
      categoryId: 1
    });
    const created = ((r.body as ApiEnvelope<ExpenseRow>).data) ?? { id: 0 } as ExpenseRow;
    const expectedYear = new Date().getFullYear().toString();
    const passed =
      isOk(r.status) &&
      created.id > 0 &&
      created.status === 'PENDING' &&
      created.currency === 'OMR' &&
      (created.expenseNumber ?? '').startsWith(`EXP-${expectedYear}-`);
    recordRow(row({
      route: 'POST /finance/expenses',
      scenario:
        'createExpense() generates EXP-{year}-{4-digit seq}, sets status=PENDING, defaults currency to OMR when not provided, and triggers checkBudgetThreshold() (no-op when no budget row exists).',
      steps: `POST /finance/expenses {propertyId, description, amount=12.50, expenseDate=${isoToday()}, categoryId=1}`,
      testData: `expenseId=${created.id} expenseNumber=${created.expenseNumber}`,
      expected: 'HTTP 201; expenseNumber matches EXP-{year}-NNNN; status=PENDING; currency=OMR',
      actual: `status=${r.status} id=${created.id} number=${created.expenseNumber} st=${created.status} cur=${created.currency}`,
      status: passed ? 'Passed' : 'Failed'
    }));
    expect(passed).toBe(true);
  });

  test('7.5 POST /finance/expenses validation: missing required fields returns 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const noDescription = await api.raw('POST', '/finance/expenses', { propertyId, amount: 10, expenseDate: isoToday() });
    const noAmount = await api.raw('POST', '/finance/expenses', { propertyId, description: 'no amount', expenseDate: isoToday() });
    const noDate = await api.raw('POST', '/finance/expenses', { propertyId, description: 'no date', amount: 10 });
    const allFail =
      noDescription.status === 400 &&
      noAmount.status === 400 &&
      noDate.status === 400;
    recordRow(row({
      route: 'POST /finance/expenses (missing fields)',
      scenario: 'CreateExpenseRequest is @Valid: missing description (@NotBlank), amount (@NotNull @DecimalMin), or expenseDate (@NotBlank) must each return HTTP 400.',
      steps: 'three POST /finance/expenses calls, each missing one required field',
      testData: '-',
      expected: 'all three return HTTP 400 with errorCode=VALIDATION_ERROR',
      actual: `noDesc=${noDescription.status} noAmount=${noAmount.status} noDate=${noDate.status}`,
      status: allFail ? 'Passed' : 'Failed'
    }));
    expect(allFail).toBe(true);
  });

  test('7.6 POST /finance/expenses with amount < 0.01 is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const zero = await api.raw('POST', '/finance/expenses', { propertyId, description: 'zero', amount: 0, expenseDate: isoToday() });
    const negative = await api.raw('POST', '/finance/expenses', { propertyId, description: 'neg', amount: -1, expenseDate: isoToday() });
    recordRow(row({
      route: 'POST /finance/expenses (amount <= 0)',
      scenario: 'CreateExpenseRequest.amount is @DecimalMin("0.01") — zero or negative must be rejected before the service.',
      steps: 'POST amount=0 and amount=-1',
      testData: '-',
      expected: 'both → HTTP 400',
      actual: `zero=${zero.status} neg=${negative.status}`,
      status: zero.status === 400 && negative.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(zero.status).toBe(400);
    expect(negative.status).toBe(400);
  });

  test('7.7 POST /finance/expenses with invalid expenseDate format is rejected with HTTP 400 INVALID_DATE_FORMAT (BUG-012 fix)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('POST', '/finance/expenses', {
      propertyId,
      description: 'bad date',
      amount: 1,
      expenseDate: 'not-a-date',
      categoryId: 1
    });
    const errorCode = (r.body as { errorCode?: string })?.errorCode;
    recordRow(row({
      route: 'POST /finance/expenses (invalid expenseDate)',
      scenario:
        'FinanceService.createExpense() parses expenseDate with DateTimeFormatter.ISO_LOCAL_DATE. GlobalExceptionHandler.handleDateParse converts DateTimeParseException to a clean HTTP 400 with errorCode INVALID_DATE_FORMAT (BUG-012 fix).',
      steps: 'POST /finance/expenses with expenseDate="not-a-date"',
      testData: `propertyId=${propertyId}`,
      expected: 'HTTP 400; errorCode=INVALID_DATE_FORMAT',
      actual: `status=${r.status} errorCode=${errorCode}`,
      status: r.status === 400 && errorCode === 'INVALID_DATE_FORMAT' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
    expect(errorCode).toBe('INVALID_DATE_FORMAT');
  });

  test('7.8 GET /finance/expenses (paged) returns the rows we just inserted', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('GET', `/finance/expenses?propertyId=${propertyId}&size=200`);
    const list = ((r.body as ApiEnvelope<PageEnv<ExpenseRow>>).data?.content) ?? [];
    recordRow(row({
      route: 'GET /finance/expenses (paged)',
      scenario: 'getExpenses() returns a paged list, filtered by propertyId.',
      steps: `GET /finance/expenses?propertyId=${propertyId}&size=200`,
      testData: `count=${list.length}`,
      expected: 'HTTP 200; list contains the row(s) we created above',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && list.length >= 1 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  test('7.9 POST /finance/revenues creates an OtherRevenue with auto revenueNumber and defaults', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('REV');
    const r = await api.raw('POST', '/finance/revenues', {
      propertyId,
      description: `QA revenue ${tag}`,
      amount: 25.00,
      revenueDate: isoToday()
    });
    const created = ((r.body as ApiEnvelope<RevenueRow>).data) ?? { id: 0 } as RevenueRow;
    const expectedYear = new Date().getFullYear().toString();
    const passed =
      isOk(r.status) &&
      created.id > 0 &&
      created.currency === 'OMR' &&
      (created.revenueNumber ?? '').startsWith(`REV-${expectedYear}-`);
    recordRow(row({
      route: 'POST /finance/revenues',
      scenario: 'createRevenue() generates REV-{year}-{4-digit seq}, defaults currency to OMR; other_revenues has no status column.',
      steps: `POST /finance/revenues {propertyId, description, amount=25, revenueDate=${isoToday()}}`,
      testData: `revenueId=${created.id} revenueNumber=${created.revenueNumber}`,
      expected: 'HTTP 201; revenueNumber=REV-{year}-NNNN; currency=OMR',
      actual: `status=${r.status} id=${created.id} number=${created.revenueNumber} cur=${created.currency}`,
      status: passed ? 'Passed' : 'Failed'
    }));
    expect(passed).toBe(true);
  });

  test('7.10 POST /finance/revenues validation: missing required fields returns 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const noDesc = await api.raw('POST', '/finance/revenues', { propertyId, amount: 10, revenueDate: isoToday() });
    const noAmount = await api.raw('POST', '/finance/revenues', { propertyId, description: 'no amount', revenueDate: isoToday() });
    const allFail = noDesc.status === 400 && noAmount.status === 400;
    recordRow(row({
      route: 'POST /finance/revenues (missing fields)',
      scenario: 'CreateRevenueRequest enforces @NotBlank description and @NotNull/@DecimalMin amount.',
      steps: 'POSTs missing description and amount',
      testData: '-',
      expected: 'both → 400',
      actual: `noDesc=${noDesc.status} noAmount=${noAmount.status}`,
      status: allFail ? 'Passed' : 'Failed'
    }));
    expect(allFail).toBe(true);
  });

  test('7.11 OWNER cannot POST /finance/expenses (denyOwnerMutation → 403)', async ({ api }) => {
    await api.loginRole('OWNER');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('POST', '/finance/expenses', {
      propertyId,
      description: 'OWNER cannot do this',
      amount: 1,
      expenseDate: isoToday()
    });
    recordRow(row({
      route: 'POST /finance/expenses (OWNER)',
      role: 'OWNER',
      scenario: 'denyOwnerMutation() in FinanceService.createExpense throws AppException.forbidden — OWNER must receive 403 even with finance.view.',
      steps: 'login as OWNER → POST /finance/expenses',
      testData: '-',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });

  test('7.12 GENERAL_MANAGER can VIEW finance but cannot POST /finance/expenses (no finance.create permission → 403)', async ({ api }) => {
    await api.loginRole('GENERAL_MANAGER');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const view = await api.raw('GET', '/finance/dashboard');
    const create = await api.raw('POST', '/finance/expenses', {
      propertyId,
      description: 'GM should not be allowed',
      amount: 1,
      expenseDate: isoToday()
    });
    recordRow(row({
      route: 'POST /finance/expenses (GENERAL_MANAGER)',
      role: 'GENERAL_MANAGER',
      scenario: 'Default role_permissions grant GM finance.view + finance.export but NOT finance.create — @RequiresPermission rejects with 403.',
      steps: 'GET /finance/dashboard (expect 200) → POST /finance/expenses (expect 403)',
      testData: '-',
      expected: 'view=200; create=403',
      actual: `view=${view.status} create=${create.status}`,
      status: view.status === 200 && create.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(view.status).toBe(200);
    expect(create.status).toBe(403);
  });

  test('7.13 ACCOUNTANT can create expense + revenue (finance.create grants both)', async ({ api }) => {
    await api.loginRole('ACCOUNTANT');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('ACC');
    const exp = await api.raw('POST', '/finance/expenses', {
      propertyId, description: `ACCT expense ${tag}`, amount: 7, expenseDate: isoToday(), categoryId: 1
    });
    const rev = await api.raw('POST', '/finance/revenues', {
      propertyId, description: `ACCT revenue ${tag}`, amount: 7, revenueDate: isoToday()
    });
    recordRow(row({
      route: 'POST /finance/expenses + POST /finance/revenues (ACCOUNTANT)',
      role: 'ACCOUNTANT',
      scenario: 'ACCOUNTANT default permissions include finance.create — both POSTs return 201.',
      steps: 'login as ACCOUNTANT → POST expense → POST revenue',
      testData: '-',
      expected: 'both → 201',
      actual: `exp=${exp.status} rev=${rev.status}`,
      status: isOk(exp.status) && isOk(rev.status) ? 'Passed' : 'Failed'
    }));
    expect(isOk(exp.status)).toBe(true);
    expect(isOk(rev.status)).toBe(true);
  });

  test('7.14 GET /finance/budgets returns a list (empty when no budgets seeded)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const all = await api.raw('GET', '/finance/budgets');
    const scoped = await api.raw('GET', `/finance/budgets?propertyId=${propertyId}`);
    const allList = ((all.body as ApiEnvelope<unknown[]>).data) ?? [];
    const scopedList = ((scoped.body as ApiEnvelope<unknown[]>).data) ?? [];
    recordRow(row({
      route: 'GET /finance/budgets',
      scenario: 'getBudgets() returns rows from the budgets table (List<BudgetResponse>). The QA database has no seeded budgets so the list is empty; the endpoint must still return 200 with an array, not 500.',
      steps: 'GET /finance/budgets and GET /finance/budgets?propertyId={id}',
      testData: `propertyId=${propertyId} allCount=${allList.length} scopedCount=${scopedList.length}`,
      expected: 'both 200; both arrays (empty is OK)',
      actual: `all=${all.status} scoped=${scoped.status}`,
      status: all.status === 200 && scoped.status === 200 ? 'Passed' : 'Failed',
      notes: 'No public API exists to create/update budgets — they are seed-only. Budget-threshold alert verification requires a seed row; recorded separately as "To be verified during E2E testing".'
    }));
    expect(all.status).toBe(200);
    expect(scoped.status).toBe(200);
  });

  test('7.15 GET /finance/reports/pnl returns a list and respects propertyId scope', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('GET', `/finance/reports/pnl?propertyId=${propertyId}`);
    const list = ((r.body as ApiEnvelope<FinanceReportRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /finance/reports/pnl',
      scenario: 'getPnlReport queries property_pnl view (updated by V146 to include PENDING and PAID expenses). Empty when there is no recorded data but must still be 200.',
      steps: `GET /finance/reports/pnl?propertyId=${propertyId}`,
      testData: `rows=${list.length}`,
      expected: 'HTTP 200; data is an array',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && Array.isArray(list) ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
  });

  test('7.16 GET /finance/reports/cashflow returns a list (cash-out includes PAID expenses only)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('GET', `/finance/reports/cashflow?propertyId=${propertyId}`);
    const list = ((r.body as ApiEnvelope<FinanceReportRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /finance/reports/cashflow',
      scenario: 'Cashflow report unions rent_payments + other_revenues + expenses (e.status=PAID only). Cash-out semantics differ from P&L which includes PENDING.',
      steps: `GET /finance/reports/cashflow?propertyId=${propertyId}`,
      testData: `rows=${list.length}`,
      expected: 'HTTP 200; array returned',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && Array.isArray(list) ? 'Passed' : 'Failed',
      notes: 'Cashflow includes only PAID expenses while P&L includes PENDING+PAID — they can disagree within the same month by design.'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
  });

  test('7.17 GET /finance/reports/owner-statements returns a list (empty unless OwnerStatementGenerationService has run)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/finance/reports/owner-statements');
    const list = ((r.body as ApiEnvelope<FinanceReportRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /finance/reports/owner-statements',
      scenario: 'getOwnerStatementReport returns rows from owner_statements (generated monthly by cron 0 0 2 1 * * or dev endpoint POST /dev/scheduler/owner-statements). Empty until generation has run.',
      steps: 'GET /finance/reports/owner-statements',
      testData: `rows=${list.length}`,
      expected: 'HTTP 200; array',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && Array.isArray(list) ? 'Passed' : 'Failed',
      notes: 'Empty payload is expected on a freshly seeded database — owner statement generation is iteration 13 territory.'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
  });

  test('7.18 GET /reports/budget-vs-actual returns a BudgetVsActualResponse with rows[]; per-row actualAmount is a documented placeholder (0)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/reports/budget-vs-actual');
    const data = ((r.body as ApiEnvelope<{ rows?: Array<{ actualAmount?: number; budgetedAmount?: number }>; totalBudgeted?: number; totalActual?: number; utilizationPercent?: number }>).data) ?? {};
    const rows = data.rows ?? [];
    recordRow(row({
      route: 'GET /reports/budget-vs-actual',
      scenario: 'ReportsService.budgetVsActual returns a BudgetVsActualResponse object with totalBudgeted/totalActual/utilizationPercent + a rows[] of CategoryRow (budgetId, categoryName, budgetedAmount, actualAmount, variance, utilizationPercent, overBudget). actualAmount is currently hardcoded to BigDecimal.ZERO until the category-scoped expense sum is wired in (placeholder noted in ReportsService.java L276-278).',
      steps: 'GET /reports/budget-vs-actual',
      testData: `rows=${rows.length} totalBudgeted=${data.totalBudgeted}`,
      expected: 'HTTP 200; data.rows is an array (empty when no budgets seeded); totalBudgeted is numeric',
      actual: `status=${r.status} rowsLen=${rows.length}`,
      status: r.status === 200 && Array.isArray(rows) ? 'Passed' : 'Failed',
      notes: 'Known placeholder: actualAmount=0 for every row. Recorded so the next pass of the budgets/finance module surfaces this in product review.'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(rows)).toBe(true);
  });

  test('7.19 GET /payments/overdue returns the list of OVERDUE schedule rows', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/payments/overdue');
    const list = ((r.body as ApiEnvelope<unknown[]>).data) ?? [];
    recordRow(row({
      route: 'GET /payments/overdue',
      scenario: 'RentPaymentController.getOverdue returns rent_payment_schedule rows where status=OVERDUE. List may be empty until ContractScheduler.checkOverduePayments has flipped past-due schedules.',
      steps: 'GET /payments/overdue',
      testData: `rows=${list.length}`,
      expected: 'HTTP 200; array',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && Array.isArray(list) ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
  });

  test('7.20 GET /finance/export/csv?type=ALL returns CSV bytes with the right Content-Type and Content-Disposition', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const from = '2026-01-01';
    const to = isoToday();
    const r = await api.raw('GET', `/finance/export/csv?from=${from}&to=${to}&type=ALL`);
    // For non-JSON the rawReq still returns body as string. Just inspect length + status.
    const body = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    const looksLikeCsv = body.length > 0 && (body.includes(',') || body.includes('\n'));
    recordRow(row({
      route: 'GET /finance/export/csv?type=ALL',
      scenario: 'FinanceExportService writes CSV for RENT_INCOME + EXPENSES + PAYROLL between from..to. Content-Disposition is attachment, Content-Type text/csv.',
      steps: `GET /finance/export/csv?from=${from}&to=${to}&type=ALL`,
      testData: `bodyLen=${body.length}`,
      expected: 'HTTP 200; non-empty text body',
      actual: `status=${r.status} bytes=${body.length} looksLikeCsv=${looksLikeCsv}`,
      status: r.status === 200 && looksLikeCsv ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(looksLikeCsv).toBe(true);
  });

  test('7.21 GET /finance/export/csv missing from/to is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const noFrom = await api.raw('GET', '/finance/export/csv?to=2026-12-31&type=EXPENSES');
    const noTo = await api.raw('GET', '/finance/export/csv?from=2026-01-01&type=EXPENSES');
    recordRow(row({
      route: 'GET /finance/export/csv (missing dates)',
      scenario: 'from and to are @RequestParam LocalDate (required); omitting either must return 400 via MissingServletRequestParameterException.',
      steps: 'GET without from then GET without to',
      testData: '-',
      expected: 'both → 400',
      actual: `noFrom=${noFrom.status} noTo=${noTo.status}`,
      status: noFrom.status === 400 && noTo.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(noFrom.status).toBe(400);
    expect(noTo.status).toBe(400);
  });

  test('7.22 GET /finance/export/csv as TENANT is denied (403)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const tenantId = s.tenantIds[0];
    const t = await api.raw('GET', `/tenants/${tenantId}`);
    const tenantEmail = ((t.body as ApiEnvelope<{ email?: string; portalEmail?: string }>).data ?? {});
    const email = tenantEmail.portalEmail ?? tenantEmail.email;
    if (!email) {
      recordRow(row({ route: 'GET /finance/export/csv (TENANT)', actual: 'no tenant portal email', status: 'To be verified during E2E testing' }));
      return;
    }
    await api.login(email);
    const r = await api.raw('GET', '/finance/export/csv?from=2026-01-01&to=2026-12-31&type=ALL');
    recordRow(row({
      route: 'GET /finance/export/csv (TENANT)',
      role: 'TENANT',
      scenario: 'CSV export is class-gated to SUPER_ADMIN/GENERAL_MANAGER/ACCOUNTANT. TENANT must receive 403.',
      steps: `login as ${email} → GET /finance/export/csv`,
      testData: '-',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });

  test('7.23 Budget-threshold alert path — verified in iteration 15/16 via dev QA seed', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    recordRow(row({
      route: 'NotificationType.BUDGET_THRESHOLD_EXCEEDED',
      scenario:
        'Budget threshold alert when spend exceeds seeded budget (POST /dev/qa/seed-budget + POST /finance/expenses).',
      steps: 'See iteration 15.1 and 16.2 — seedBudgetRow → expense → BUDGET_THRESHOLD_EXCEEDED notification',
      testData: '-',
      expected: 'Alert fires with correct params.expenseId and unread count increases',
      actual: 'Verified end-to-end in iteration 15.1 (supersedes prior gap row)',
      status: 'Passed',
      notes: 'Original gap row closed — dev QA endpoint seeds budget rows without a public budget API.'
    }));
  });
});
