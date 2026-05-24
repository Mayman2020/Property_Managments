/**
 * Iteration 8b — HR payroll, advances, deductions, employee portal payslips.
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
    role: 'SUPER_ADMIN',
    permissionContext: 'hr.*',
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

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

interface PayrollDetail {
  id: number;
  status?: string;
  payPeriodYear?: number;
  payPeriodMonth?: number;
  payslips?: PayslipRow[];
}

interface PayslipRow {
  id: number;
  employeeId?: number;
  netSalary?: number | string;
  paid?: boolean;
}

interface DeductionRow {
  id: number;
  status?: string;
}

interface EmployeeRow {
  id: number;
  email?: string;
}

async function findFreePayrollPeriod(
  api: { raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }> },
  propertyId: number,
  startYear = 2099
): Promise<{ year: number; month: number; detail: PayrollDetail }> {
  for (let y = startYear; y >= 2090; y--) {
    for (let m = 1; m <= 12; m++) {
      const r = await api.raw('POST', '/hr/payroll/generate', {
        propertyId,
        payPeriodYear: y,
        payPeriodMonth: m
      });
      if (r.status === 200) {
        const detail = (r.body as ApiEnvelope<PayrollDetail>).data!;
        return { year: y, month: m, detail };
      }
    }
  }
  throw new Error('No free payroll period found for property ' + propertyId);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe.serial('Iteration 8b — HR payroll', () => {
  let employeeId = 0;
  let portalEmail = '';
  let payrollRunId = 0;
  let payslipId = 0;
  let rejectPayrollId = 0;
  let deductionId = 0;
  let payYear = 2099;
  let payMonth = 1;
  let rejectMonth = 2;

  test('8.13 ensure payroll employee exists on property', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    portalEmail = `${uniq('qa-payroll-emp')}@propmgmt.com`;
    const r = await api.raw('POST', '/hr/employees', {
      propertyId,
      fullName: `QA Payroll Employee ${uniq('')}`,
      email: portalEmail,
      nationalId: uniq('NIDP').slice(0, 20),
      hireDate: isoToday(),
      basicSalary: 2000,
      systemRole: 'PROCEDURES_CLERK'
    });
    employeeId = ((r.body as ApiEnvelope<EmployeeRow>).data?.id) ?? 0;
    const ok = isOk(r.status) && employeeId > 0;
    recordRow(row({
      route: 'POST /hr/employees (payroll path)',
      scenario: 'Employee with portal email is created for payroll + my-payslips tests.',
      steps: 'POST /hr/employees with systemRole=PROCEDURES_CLERK',
      testData: `employeeId=${employeeId} email=${portalEmail}`,
      expected: 'HTTP 201; employee id returned',
      actual: `status=${r.status} id=${employeeId}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.14 POST /hr/payroll/generate creates SUBMITTED run with payslips', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const found = await findFreePayrollPeriod(api, propertyId);
    payYear = found.year;
    payMonth = found.month;
    rejectMonth = payMonth === 12 ? 11 : payMonth + 1;
    const d = found.detail;
    payrollRunId = d?.id ?? 0;
    payslipId = d?.payslips?.find((p) => p.employeeId === employeeId)?.id ?? d?.payslips?.[0]?.id ?? 0;
    const ok = payrollRunId > 0 && d?.status === 'SUBMITTED' && (d?.payslips?.length ?? 0) > 0;
    const r = { status: 200 };
    recordRow(row({
      route: 'POST /hr/payroll/generate',
      scenario: 'Generate payroll for property+period → SUBMITTED with one payslip per active employee.',
      steps: `POST /hr/payroll/generate propertyId=${propertyId} ${payYear}-${payMonth}`,
      testData: `payrollRunId=${payrollRunId}`,
      expected: 'HTTP 200; status=SUBMITTED; payslips[] non-empty',
      actual: `status=${r.status} runStatus=${d?.status} payslips=${d?.payslips?.length}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.15 PATCH payslip adjust + POST bonus while SUBMITTED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const adj = await api.raw('PATCH', `/hr/payroll/${payrollRunId}/payslips/${payslipId}`, {
      overtimeAmount: 50,
      notes: 'QA overtime'
    });
    const bonus = await api.raw('POST', `/hr/payroll/${payrollRunId}/bonuses`, {
      employeeId,
      bonusType: 'PERFORMANCE',
      amount: 25,
      reason: 'QA bonus'
    });
    const ok = adj.status === 200 && bonus.status === 200;
    recordRow(row({
      route: 'PATCH /hr/payroll/{id}/payslips/{payslipId}',
      scenario: 'Adjust payslip and add bonus while payroll is SUBMITTED.',
      steps: `PATCH payslip ${payslipId}; POST bonus for employee ${employeeId}`,
      testData: `payrollRunId=${payrollRunId}`,
      expected: 'Both HTTP 200',
      actual: `adj=${adj.status} bonus=${bonus.status}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.16 POST /hr/payroll/advances creates APPROVED advance', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/hr/payroll/advances', {
      employeeId,
      amount: 100,
      requestDate: isoToday(),
      reason: 'QA advance',
      deductedYear: payYear,
      deductedMonth: payMonth
    });
    recordRow(row({
      route: 'POST /hr/payroll/advances',
      scenario: 'Salary advance saved for deduction in payroll period.',
      steps: 'POST /hr/payroll/advances',
      testData: `employeeId=${employeeId}`,
      expected: 'HTTP 200 with advance id',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('8.17 POST /hr/payroll/{id}/approve → APPROVED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', `/hr/payroll/${payrollRunId}/approve`);
    const d = (r.body as ApiEnvelope<PayrollDetail>).data;
    recordRow(row({
      route: 'POST /hr/payroll/{id}/approve',
      scenario: 'SUPER_ADMIN approves SUBMITTED payroll.',
      steps: `POST /hr/payroll/${payrollRunId}/approve`,
      testData: `payrollRunId=${payrollRunId}`,
      expected: 'HTTP 200; status=APPROVED',
      actual: `status=${r.status} runStatus=${d?.status}`,
      status: r.status === 200 && d?.status === 'APPROVED' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(d?.status).toBe('APPROVED');
  });

  test('8.18 POST /hr/payroll/{id}/mark-paid → PAID', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', `/hr/payroll/${payrollRunId}/mark-paid`, {
      paidDate: isoToday(),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: uniq('REF')
    });
    const d = (r.body as ApiEnvelope<PayrollDetail>).data;
    recordRow(row({
      route: 'POST /hr/payroll/{id}/mark-paid',
      scenario: 'Mark approved payroll as PAID.',
      steps: `POST /hr/payroll/${payrollRunId}/mark-paid`,
      testData: `payrollRunId=${payrollRunId}`,
      expected: 'HTTP 200; status=PAID',
      actual: `status=${r.status} runStatus=${d?.status}`,
      status: r.status === 200 && d?.status === 'PAID' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(d?.status).toBe('PAID');
  });

  test('8.19 payroll deduction DRAFT → SENT → APPROVED by accountant', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const payrollMonth = `${payYear}-${String(rejectMonth).padStart(2, '0')}`;
    const create = await api.raw('POST', '/hr/deductions', {
      employeeId,
      amount: 15,
      reason: uniq('QA deduction'),
      deductionDate: isoToday(),
      payrollMonth: `${payYear}-${String((payMonth % 12) + 1).padStart(2, '0')}`
    });
    deductionId = ((create.body as ApiEnvelope<DeductionRow>).data?.id) ?? 0;
    expect(isOk(create.status)).toBe(true);

    await api.loginRole('HR_OFFICER');
    const send = await api.raw('POST', `/hr/deductions/${deductionId}/send`);
    expect(send.status).toBe(200);
    expect(((send.body as ApiEnvelope<DeductionRow>).data?.status)).toBe('SENT_TO_ACCOUNTANT');

    await api.loginRole('ACCOUNTANT');
    const approve = await api.raw('POST', `/hr/deductions/${deductionId}/approve`, { note: 'OK' });
    const st = ((approve.body as ApiEnvelope<DeductionRow>).data?.status);
    const ok = approve.status === 200 && st === 'APPROVED';
    recordRow(row({
      route: 'POST /hr/deductions/{id}/approve',
      role: 'ACCOUNTANT',
      permissionContext: 'hr.approve on sent deduction',
      scenario: 'Deduction lifecycle DRAFT → SENT_TO_ACCOUNTANT → APPROVED.',
      steps: 'SUPER_ADMIN create; HR send; ACCOUNTANT approve',
      testData: `deductionId=${deductionId}`,
      expected: 'Final status APPROVED',
      actual: `send=${send.status} approve=${approve.status} status=${st}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.20 payroll reject path on separate period', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const found = await findFreePayrollPeriod(api, s.propertyIds[0], 2095);
    rejectPayrollId = found.detail.id ?? 0;
    const rej = await api.raw('POST', `/hr/payroll/${rejectPayrollId}/reject?reason=QA%20reject`);
    const st = ((rej.body as ApiEnvelope<PayrollDetail>).data?.status);
    const ok = rej.status === 200 && st === 'REJECTED';
    recordRow(row({
      route: 'POST /hr/payroll/{id}/reject',
      scenario: 'Reject SUBMITTED payroll → REJECTED.',
      steps: `Generate first free period in 2095.. then POST reject`,
      testData: `payrollRunId=${rejectPayrollId}`,
      expected: 'HTTP 200; status=REJECTED',
      actual: `status=${rej.status} runStatus=${st}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.21 employee portal GET /hr/payroll/my-payslips', async ({ api }) => {
    const portalPassword = '12345';
    const newPassword = 'QaPortalP@ss1';
    await api.login(portalEmail, portalPassword);
    const cp = await api.raw('PUT', '/users/me/change-password', {
      currentPassword: portalPassword,
      newPassword,
      confirmPassword: newPassword
    });
    expect(cp.status).toBe(200);
    await api.login(portalEmail, newPassword);
    const list = await api.raw('GET', '/hr/payroll/my-payslips');
    const slips = ((list.body as ApiEnvelope<PayslipRow[]>).data) ?? [];
    const mine = slips.find((s) => s.id === payslipId) ?? slips[0];
    let detailStatus = 0;
    if (mine?.id) {
      const detail = await api.raw('GET', `/hr/payroll/my-payslips/${mine.id}`);
      detailStatus = detail.status;
    }
    const ok = list.status === 200 && slips.length > 0 && detailStatus === 200;
    recordRow(row({
      route: 'GET /hr/payroll/my-payslips',
      role: 'PROCEDURES_CLERK (employee portal)',
      permissionContext: 'linked employee record',
      scenario: 'Linked employee reads own payslips after payroll marked PAID.',
      steps: `Login ${portalEmail}; change temp password; re-login; GET my-payslips; GET my-payslips/{id}`,
      testData: `payslipId=${payslipId}`,
      expected: 'HTTP 200; at least one payslip; detail 200 (after PASSWORD_CHANGE_REQUIRED gate)',
      actual: `list=${list.status} count=${slips.length} detail=${detailStatus}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.22 GET /hr/payroll lists runs (200)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/hr/payroll?page=0&size=5');
    recordRow(row({
      route: 'GET /hr/payroll',
      scenario: 'Payroll run list accessible.',
      steps: 'GET /hr/payroll',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });
});
