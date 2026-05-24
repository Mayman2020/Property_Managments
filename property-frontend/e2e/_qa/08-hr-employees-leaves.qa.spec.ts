/**
 * Iteration 8a — HR employees, attendance, leaves.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';

const ITER = 8;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'hr',
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

interface PageEnv<T> {
  content: T[];
  totalElements?: number;
}

interface EmployeeRow {
  id: number;
  employeeCode?: string;
  fullName?: string;
  status?: string;
  propertyId?: number;
}

interface LeaveRow {
  id: number;
  status?: string;
  employeeId?: number;
  daysCount?: number;
}

interface LeaveBalanceRow {
  employeeId: number;
  entitledDays?: number;
  usedDays?: number;
  remainingDays?: number;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe.serial('Iteration 8a — HR employees, attendance, leaves', () => {
  test.beforeAll(() => {
    resetIterationLog(ITER);
  });

  let employeeId = 0;
  let leaveApproveId = 0;
  let leaveRejectId = 0;

  test('8.1 SUPER_ADMIN GET /hr/employees returns paged list (200)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/hr/employees?page=0&size=5');
    const content = ((r.body as ApiEnvelope<PageEnv<EmployeeRow>>).data?.content) ?? [];
    recordRow(row({
      route: 'GET /hr/employees',
      scenario: 'Employee list is accessible to SUPER_ADMIN with hr.view.',
      steps: 'GET /hr/employees?page=0&size=5',
      expected: 'HTTP 200 with content[]',
      actual: `status=${r.status} count=${content.length}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('8.2 POST /hr/employees creates ACTIVE employee with generated code (201)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const email = `${uniq('qa-emp')}@propmgmt.com`;
    const body = {
      propertyId,
      fullName: `QA Employee ${uniq('')}`,
      fullNameEn: 'QA Employee',
      phone: '+966500000001',
      email,
      nationalId: uniq('NID').slice(0, 20),
      hireDate: isoToday(),
      basicSalary: 1500
    };
    const r = await api.raw('POST', '/hr/employees', body);
    const d = (r.body as ApiEnvelope<EmployeeRow>).data;
    employeeId = d?.id ?? 0;
    const ok = isOk(r.status) && !!d?.id && !!d?.employeeCode;
    recordRow(row({
      route: 'POST /hr/employees',
      scenario: 'Create employee with required fields; service assigns employeeCode.',
      steps: 'POST /hr/employees with propertyId, fullName, hireDate, basicSalary',
      testData: `propertyId=${propertyId} email=${email}`,
      expected: 'HTTP 201; data.id and data.employeeCode present',
      actual: `status=${r.status} id=${d?.id} code=${d?.employeeCode}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.3 GET /hr/employees/{id} returns the created employee', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', `/hr/employees/${employeeId}`);
    const d = (r.body as ApiEnvelope<EmployeeRow>).data;
    recordRow(row({
      route: 'GET /hr/employees/{id}',
      scenario: 'Fetch employee detail by id.',
      steps: `GET /hr/employees/${employeeId}`,
      testData: `employeeId=${employeeId}`,
      expected: 'HTTP 200; same id',
      actual: `status=${r.status} id=${d?.id}`,
      status: r.status === 200 && d?.id === employeeId ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(d?.id).toBe(employeeId);
  });

  test('8.4 PUT /hr/employees/{id} updates basicSalary', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const get = await api.raw('GET', `/hr/employees/${employeeId}`);
    const cur = (get.body as ApiEnvelope<EmployeeRow>).data!;
    const body = {
      propertyId: cur.propertyId,
      fullName: cur.fullName,
      hireDate: isoToday(),
      basicSalary: 1600
    };
    const r = await api.raw('PUT', `/hr/employees/${employeeId}`, body);
    recordRow(row({
      route: 'PUT /hr/employees/{id}',
      scenario: 'Update employee salary.',
      steps: `PUT /hr/employees/${employeeId} basicSalary=1600`,
      testData: `employeeId=${employeeId}`,
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('8.5 POST /hr/employees missing fullName returns 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const r = await api.raw('POST', '/hr/employees', {
      propertyId: s.propertyIds[0],
      hireDate: isoToday(),
      basicSalary: 1000
    });
    recordRow(row({
      route: 'POST /hr/employees (validation)',
      scenario: '@NotBlank fullName enforced.',
      steps: 'POST /hr/employees without fullName',
      expected: 'HTTP 400',
      actual: `status=${r.status}`,
      severity: 'Low',
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('8.6 TENANT cannot list employees (403)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    let tenantEmail = s.roleEmails.TENANT;
    if (s.tenantIds.length > 0) {
      const t = await api.raw('GET', `/tenants/${s.tenantIds[0]}`);
      tenantEmail = ((t.body as ApiEnvelope<{ email?: string }>).data?.email) ?? tenantEmail;
    }
    tenantEmail = tenantEmail ?? 'qa.tenant2@propmgmt.com';
    await api.login(tenantEmail);
    const r = await api.raw('GET', '/hr/employees');
    recordRow(row({
      route: 'GET /hr/employees',
      role: 'TENANT',
      permissionContext: 'hr.view denied',
      scenario: 'Tenant must not access HR employee list.',
      steps: 'GET /hr/employees as TENANT',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });

  test('8.7 GET /hr/attendance returns paged rows (200)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/hr/attendance?page=0&size=5');
    recordRow(row({
      route: 'GET /hr/attendance',
      module: 'hr-attendance',
      scenario: 'Attendance list readable with hr.view.',
      steps: 'GET /hr/attendance',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('8.8 GET /hr/leaves/balances?propertyId returns balance rows', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('GET', `/hr/leaves/balances?propertyId=${propertyId}&year=2099`);
    const balances = ((r.body as ApiEnvelope<LeaveBalanceRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /hr/leaves/balances',
      module: 'hr-leaves',
      scenario: 'Leave balances endpoint returns entitled/used/remaining per active employee.',
      steps: `GET /hr/leaves/balances?propertyId=${propertyId}&year=2099`,
      testData: `propertyId=${propertyId}`,
      expected: 'HTTP 200; array (may be empty)',
      actual: `status=${r.status} count=${balances.length}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('8.9 POST /hr/leaves creates PENDING request', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const start = '2099-06-01';
    const end = '2099-06-03';
    const r = await api.raw('POST', '/hr/leaves', {
      employeeId,
      leaveTypeId: 1,
      startDate: start,
      endDate: end,
      reason: 'QA leave approve path'
    });
    const d = (r.body as ApiEnvelope<LeaveRow>).data;
    leaveApproveId = d?.id ?? 0;
    const ok = isOk(r.status) && d?.status === 'PENDING';
    recordRow(row({
      route: 'POST /hr/leaves',
      module: 'hr-leaves',
      scenario: 'Create leave request defaults to PENDING.',
      steps: 'POST /hr/leaves employeeId + leaveTypeId=1 + date range',
      testData: `employeeId=${employeeId} leaveId=${leaveApproveId}`,
      expected: 'HTTP 201; status=PENDING',
      actual: `status=${r.status} leaveStatus=${d?.status}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.10 POST /hr/leaves/{id}/approve flips to APPROVED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', `/hr/leaves/${leaveApproveId}/approve`, { note: 'Approved in QA' });
    const d = (r.body as ApiEnvelope<LeaveRow>).data;
    recordRow(row({
      route: 'POST /hr/leaves/{id}/approve',
      module: 'hr-leaves',
      scenario: 'SUPER_ADMIN approves pending leave → APPROVED.',
      steps: `POST /hr/leaves/${leaveApproveId}/approve`,
      testData: `leaveId=${leaveApproveId}`,
      expected: 'HTTP 200; status=APPROVED',
      actual: `status=${r.status} leaveStatus=${d?.status}`,
      status: r.status === 200 && d?.status === 'APPROVED' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(d?.status).toBe('APPROVED');
  });

  test('8.11 POST /hr/leaves create + reject → REJECTED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const start = '2099-07-10';
    const end = '2099-07-11';
    const create = await api.raw('POST', '/hr/leaves', {
      employeeId,
      leaveTypeId: 1,
      startDate: start,
      endDate: end,
      reason: 'QA leave reject path'
    });
    leaveRejectId = ((create.body as ApiEnvelope<LeaveRow>).data?.id) ?? 0;
    const reject = await api.raw('POST', `/hr/leaves/${leaveRejectId}/reject`, { note: 'Rejected in QA' });
    const d = (reject.body as ApiEnvelope<LeaveRow>).data;
    const ok = reject.status === 200 && d?.status === 'REJECTED';
    recordRow(row({
      route: 'POST /hr/leaves/{id}/reject',
      module: 'hr-leaves',
      scenario: 'Reject pending leave → REJECTED.',
      steps: `POST create then POST /hr/leaves/${leaveRejectId}/reject`,
      testData: `leaveId=${leaveRejectId}`,
      expected: 'HTTP 200; status=REJECTED',
      actual: `status=${reject.status} leaveStatus=${d?.status}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('8.12 GET /hr/leaves lists leave requests (200)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/hr/leaves?page=0&size=10');
    recordRow(row({
      route: 'GET /hr/leaves',
      module: 'hr-leaves',
      scenario: 'Leave list accessible with hr.view.',
      steps: 'GET /hr/leaves',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });
});
