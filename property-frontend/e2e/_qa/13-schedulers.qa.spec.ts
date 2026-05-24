/**
 * Iteration 13 — Dev scheduler endpoints (SUPER_ADMIN).
 * Post-trigger outcome verification: see 17-schedulers-outcomes.qa.spec.ts (iter 17.9).
 */
import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';

const ITER = 13;

const SCHEDULERS = [
  'rent-overdue',
  'rent-due-reminders',
  'contract-expiring',
  'maintenance-invoice-reminders',
  'rent-dunning-escalation',
  'maintenance-sla',
  'document-expiry',
  'vacancy-auto-publish',
  'finance-export-test',
  'owner-statements',
  'run-all'
];

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'schedulers',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'dev schedulers',
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

test.describe.serial('Iteration 13 — Dev schedulers', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  for (const job of SCHEDULERS) {
    test(`13.${job} POST /dev/schedulers/${job}`, async ({ api }) => {
      await api.loginRole('SUPER_ADMIN');
      const r = await api.raw('POST', `/dev/schedulers/${job}`);
      recordRow(row({
        route: `POST /dev/schedulers/${job}`,
        scenario: `Manual trigger ${job} scheduler (real job, no mock).`,
        steps: `POST /dev/schedulers/${job}`,
        expected: 'HTTP 200',
        actual: `status=${r.status}`,
        status: r.status === 200 ? 'Passed' : 'Failed',
        notes: job === 'contract-expiring' ? 'Only expires contracts with endDate < today' : ''
      }));
      expect(r.status).toBe(200);
    });
  }

  test('13.GM denied POST /dev/schedulers/run-all', async ({ api }) => {
    await api.loginRole('GENERAL_MANAGER');
    const r = await api.raw('POST', '/dev/schedulers/run-all');
    recordRow(row({
      route: 'POST /dev/schedulers/run-all',
      role: 'GENERAL_MANAGER',
      scenario: 'Non-super-admin cannot trigger run-all.',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });
});
