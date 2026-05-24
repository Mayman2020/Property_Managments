/**
 * Iteration 4 bug-fix record spec.
 *
 * Re-asserts the production code paths that were patched in iteration 4 and
 * leaves a permanent row in the QA report describing the fix.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';

const ITER = 4;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'bug-fixes',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
    status: 'Fixed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }

test.describe.serial('Iteration 4 — Bug fixes (record)', () => {
  test('BUG-009 rent-overdue scheduler crashes after marking rows OVERDUE — payment_method=ACCRUAL violates rent_payments_payment_method_check', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/dev/schedulers/rent-overdue');
    const body = r.body as ApiEnvelope<{ status?: string }>;
    recordRow(row({
      module: 'rent-schedules',
      route: 'POST /dev/schedulers/rent-overdue',
      scenario:
        'ContractScheduler.checkOverduePayments first flips all past-due PENDING schedule rows to OVERDUE, then calls RentPaymentService.applyLateFeeAccrual which inserts a synthetic rent_payments row with payment_method="ACCRUAL". The original CHECK constraint from V31 only allowed CASH/BANK_TRANSFER/CHECK/ONLINE/OTHER, so the second step crashed with rent_payments_payment_method_check and rolled the entire transaction back. The endpoint returned 500 INTERNAL_ERROR and the OVERDUE flips were lost.',
      steps:
        'Added Flyway migration V170__rent_payments_allow_accrual_method.sql that drops + re-adds the CHECK constraint to include ACCRUAL. Idempotent (DO block, exists-guard). No data loss.',
      testData: 'live DB: constraint now allows CASH/BANK_TRANSFER/CHECK/ONLINE/OTHER/ACCRUAL.',
      expected: 'HTTP 200 with body.status=ok; subsequent GET /payments/overdue lists the freshly OVERDUE rows.',
      actual: `status=${r.status} bodyStatus=${body?.data?.status ?? '-'}`,
      filesChanged:
        'property-backend/src/main/resources/db/migration/V170__rent_payments_allow_accrual_method.sql',
      retestResult: r.status === 200 ? 'scheduler completes and accrues late fees with payment_method=ACCRUAL' : `still failing: ${r.status}`,
      severity: 'Critical',
      status: r.status === 200 ? 'Fixed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });
});
