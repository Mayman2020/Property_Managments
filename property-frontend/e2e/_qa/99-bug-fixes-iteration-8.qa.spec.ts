/**
 * Iteration 8 — retest BUG-013 (ACCOUNTANT hr.approve/reject for payroll deductions).
 */
import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 8;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'hr-payroll',
    route: '-',
    role: 'ACCOUNTANT',
    permissionContext: 'hr.approve + property scope',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
    status: 'Fixed',
    bugSummary: 'BUG-013',
    filesChanged: 'property-backend/.../RolePermissionService.java',
    retestResult: '',
    notes: '',
    ...p
  };
}

function uniq(p: string): string {
  return `${p}-${Date.now()}`;
}

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }
interface DeductionRow { id: number; status?: string; }
interface EmployeeRow { id: number; propertyId?: number; }

test('BUG-013 retest — ACCOUNTANT can approve SENT payroll deduction on same property', async ({ api }) => {
  await api.loginRole('SUPER_ADMIN');
  const s = loadState();
  const propertyId = s.propertyIds[0];
  const empCreate = await api.raw('POST', '/hr/employees', {
    propertyId,
    fullName: uniq('QA Deduction Employee'),
    email: `${uniq('qa-ded')}@propmgmt.com`,
    nationalId: uniq('NIDD').slice(0, 20),
    hireDate: new Date().toISOString().slice(0, 10),
    basicSalary: 1200
  });
  const employeeId = ((empCreate.body as ApiEnvelope<EmployeeRow>).data?.id) ?? 0;
  expect(employeeId).toBeGreaterThan(0);

  const create = await api.raw('POST', '/hr/deductions', {
    employeeId,
    amount: 20,
    reason: uniq('BUG013'),
    deductionDate: new Date().toISOString().slice(0, 10),
    payrollMonth: '2099-05'
  });
  const deductionId = ((create.body as ApiEnvelope<DeductionRow>).data?.id) ?? 0;

  await api.loginRole('HR_OFFICER');
  await api.raw('POST', `/hr/deductions/${deductionId}/send`);

  await api.loginRole('ACCOUNTANT');
  const approve = await api.raw('POST', `/hr/deductions/${deductionId}/approve`, { note: 'BUG-013 retest' });
  const st = ((approve.body as ApiEnvelope<DeductionRow>).data?.status);
  const ok = approve.status === 200 && st === 'APPROVED';

  recordRow(row({
    route: 'POST /hr/deductions/{id}/approve',
    scenario: 'BUG-013: ACCOUNTANT receives hr.approve so sent deductions can be approved (matches PayrollDeductionService.review).',
    steps: 'Create deduction on property 12; HR send; ACCOUNTANT approve',
    testData: `deductionId=${deductionId} propertyId=${propertyId}`,
    expected: 'HTTP 200; status=APPROVED',
    actual: `status=${approve.status} deductionStatus=${st} error=${(approve.body as ApiEnvelope).errorCode ?? ''}`,
    retestResult: ok ? 'Passed after RolePermissionService ACCOUNTANT hr.approve/reject grant' : 'Still failing'
  }));
  expect(ok).toBe(true);
});

test('BUG-014 retest — POST /hr/payroll/{id}/reject sets REJECTED (not 500)', async ({ api }) => {
  await api.loginRole('SUPER_ADMIN');
  const s = loadState();
  let payrollId = 0;
  for (let m = 1; m <= 12; m++) {
    const gen = await api.raw('POST', '/hr/payroll/generate', {
      propertyId: s.propertyIds[0],
      payPeriodYear: 2096,
      payPeriodMonth: m
    });
    if (gen.status === 200) {
      payrollId = ((gen.body as ApiEnvelope<{ id: number; status?: string }>).data?.id) ?? 0;
      break;
    }
  }
  const rej = await api.raw('POST', `/hr/payroll/${payrollId}/reject?reason=BUG-014%20retest`);
  const st = ((rej.body as ApiEnvelope<{ status?: string }>).data?.status);
  const ok = rej.status === 200 && st === 'REJECTED';
  recordRow(row({
    route: 'POST /hr/payroll/{id}/reject',
    role: 'SUPER_ADMIN',
    scenario: 'BUG-014: payroll_runs_status_check must allow REJECTED (V173 migration).',
    steps: 'Generate payroll in 2096 then POST reject',
    testData: `payrollRunId=${payrollId}`,
    expected: 'HTTP 200; status=REJECTED',
    actual: `status=${rej.status} runStatus=${st}`,
    bugSummary: 'BUG-014',
    filesChanged: 'V173__payroll_runs_allow_rejected_status.sql, PayrollService.java',
    retestResult: ok ? 'Passed after CHECK constraint + syncPayrollExpense on reject' : 'Still failing',
    status: ok ? 'Fixed' : 'Failed'
  }));
  expect(ok).toBe(true);
});
