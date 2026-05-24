/**
 * Iteration 4 — Rent payment schedules lifecycle.
 *
 * Covers each scheduler-row transition documented in the codebase:
 *
 *   PENDING --uploadProof--> PENDING_CONFIRMATION --review APPROVED--> PAID
 *                                                  \--review REJECTED--> PAYMENT_REJECTED
 *   PENDING --markPaidByAccountant--> PAID
 *   PENDING --recordPayment(full)--> PAID
 *   PENDING --recordPayment(partial)--> PARTIAL
 *   PENDING --scheduler.checkOverduePayments--> OVERDUE
 *
 * Each test creates its own throw-away property/unit/contract via direct
 * POST /contracts so it can manipulate the resulting payment schedule
 * without touching the bootstrap data.
 */

import { test, expect } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';
import { loadState } from './state';

const ITER = 4;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'rent-schedules',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'finance.*',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
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

interface ContractMini { id: number; status?: string; }
interface PropertyMini { id: number; }
interface OwnerMini { id: number; }
interface UnitMini { id: number; }
interface ScheduleRow {
  id: number;
  contractId?: number;
  dueDate?: string;
  amount?: number | string;
  amountPaid?: number | string;
  status?: string;
  proofUrl?: string;
  receiptUrl?: string;
  paidAt?: string;
}

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: 'SUPER_ADMIN' | 'TENANT' | 'ACCOUNTANT'): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

async function makeActiveContractWithSchedule(api: RawApi, tag: string): Promise<{ contractId: number; unitId: number; propertyId: number; tenantId: number; schedules: ScheduleRow[] }> {
  const s = loadState();
  const fileUrl = s.placeholderFileUrl!;
  const tenantId = s.tenantIds[0];
  if (!tenantId) throw new Error('No bootstrapped tenant in qa-state');

  const ownerResp = await api.raw('POST', '/owners', {
    fullNameAr: `مالك ${tag}`,
    fullNameEn: `Owner ${tag}`,
    nationalId: `OW${tag}`,
    phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
  });
  if (!isOk(ownerResp.status)) throw new Error(`owner create failed: ${ownerResp.status}`);
  const ownerId = (ownerResp.body as ApiEnvelope<OwnerMini>).data!.id;

  const propResp = await api.raw('POST', '/properties', {
    propertyNameEn: `Rent-${tag}`,
    propertyNameAr: `Rent-${tag}`,
    propertyType: 'RESIDENTIAL',
    address: `Rent St ${tag}`,
    totalFloors: 1,
    totalUnits: 1,
    floorUnitsConfig: { '1': 1 },
    ownerIds: [ownerId],
    ownerDocumentFiles: [fileUrl]
  });
  if (!isOk(propResp.status)) throw new Error(`property create failed: ${propResp.status}`);
  const propertyId = (propResp.body as ApiEnvelope<PropertyMini>).data!.id;

  const floors = await api.raw('GET', `/properties/${propertyId}/floors`);
  const floorId = ((floors.body as ApiEnvelope<Array<{ id: number }>>).data ?? [])[0].id;

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
  if (!isOk(unitResp.status)) throw new Error(`unit create failed: ${unitResp.status}`);
  const unitId = (unitResp.body as ApiEnvelope<UnitMini>).data!.id;

  // Use a start date in the past so the auto-generated schedule has bills
  // we can manipulate immediately.
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
  if (!isOk(contractResp.status)) throw new Error(`contract create failed: ${contractResp.status} ${JSON.stringify(contractResp.body)}`);
  const contractId = (contractResp.body as ApiEnvelope<ContractMini>).data!.id;

  const act = await api.raw('PATCH', `/contracts/${contractId}/activate`);
  if (!isOk(act.status)) throw new Error(`activate failed: ${act.status}`);

  const sched = await api.raw('GET', `/contracts/${contractId}/payment-schedule?size=240`);
  const data = (sched.body as ApiEnvelope<{ content?: ScheduleRow[] } | ScheduleRow[]>)?.data;
  const schedules = Array.isArray(data) ? data : (data?.content ?? []);
  return { contractId, unitId, propertyId, tenantId, schedules };
}

test.describe.serial('Iteration 4 — Rent schedules lifecycle', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  test('4.1 payment schedule is auto-generated with the right shape', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('GenSched'));
    const firstStatuses = f.schedules.slice(0, 3).map(r => r.status).join(',');
    const allPositive = f.schedules.every(r => Number(r.amount ?? 0) > 0);
    // The generator deliberately skips months before the calendar month of
    // activation: firstBillYm = max(leaseStartYm, todayYm). For a contract
    // from 2026-01-01..2026-12-31 activated mid-year, only the remaining
    // months (today..Dec) get rows.
    const today = new Date();
    const ymToday = today.getFullYear() * 12 + today.getMonth(); // 0-indexed month
    const ymEnd = 2026 * 12 + 11; // Dec 2026 (0-indexed month=11)
    const ymStart = 2026 * 12 + 0; // Jan 2026
    const firstBill = Math.max(ymStart, ymToday);
    const expectedCount = Math.max(0, ymEnd - firstBill + 1);
    recordRow(row({
      module: 'rent-schedules',
      route: 'GET /contracts/{id}/payment-schedule',
      scenario: 'Activation auto-generates monthly schedule rows from max(leaseStart, today)..leaseEnd',
      steps: 'Create + activate fresh contract paymentFrequency=MONTHLY paymentDay=1 2026-01-01..2026-12-31',
      testData: `contractId=${f.contractId} expectedRows=${expectedCount}`,
      expected: `${expectedCount} schedule rows, all PENDING, amount>0`,
      actual: `rowCount=${f.schedules.length} firstStatuses=${firstStatuses} allAmountsPositive=${allPositive}`,
      status: f.schedules.length === expectedCount && allPositive && f.schedules.every(r => r.status === 'PENDING') ? 'Passed' : 'Failed'
    }));
  });

  test('4.2 tenant upload-proof → PENDING_CONFIRMATION → accountant approve → PAID', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('ProofApr'));
    const scheduleId = f.schedules[0].id;

    // The tenant-portal endpoint requires the caller's portal user be the
    // tenant linked to the contract. Look up the tenant's actual email.
    const tenantRow = await api.raw('GET', `/tenants/${f.tenantId}`);
    const tenantEmail = ((tenantRow.body as ApiEnvelope<{ email?: string }>)?.data?.email) ?? '';
    if (!tenantEmail) {
      recordRow(row({ scenario: 'Skipped — bootstrap tenant has no email on file', status: 'Blocked' }));
      return;
    }
    await api.login(tenantEmail);

    const proof = await api.raw('POST', `/tenant-portal/contracts/${f.contractId}/payment-schedule/${scheduleId}/proof`, {
      proofUrl: loadState().placeholderFileUrl,
      paymentDate: '2026-01-15',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'QA proof'
    });
    const afterProofRow = (proof.body as ApiEnvelope<ScheduleRow>)?.data;
    recordRow(row({
      route: 'POST /tenant-portal/contracts/{cid}/payment-schedule/{sid}/proof',
      role: 'TENANT',
      scenario: 'TENANT uploads payment proof → schedule status moves to PENDING_CONFIRMATION',
      steps: `Login TENANT → POST proof for scheduleId=${scheduleId}`,
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200/201; data.status=PENDING_CONFIRMATION',
      actual: `status=${proof.status} scheduleStatus=${afterProofRow?.status}`,
      severity: 'High',
      status: isOk(proof.status) && afterProofRow?.status === 'PENDING_CONFIRMATION' ? 'Passed' : 'Failed'
    }));

    // Switch back to SUPER_ADMIN to review and approve.
    await api.loginRole('SUPER_ADMIN');
    const review = await api.raw('PATCH', `/payment-schedule/${scheduleId}/proof/review`, {
      status: 'PAID',
      notes: 'QA approve'
    });
    const reviewed = (review.body as ApiEnvelope<ScheduleRow>)?.data;
    recordRow(row({
      route: 'PATCH /payment-schedule/{id}/proof/review',
      scenario: 'Accountant/staff approves proof → schedule moves to PAID',
      steps: 'PATCH proof/review decision=PAID',
      testData: `scheduleId=${scheduleId}`,
      expected: 'HTTP 200; data.status=PAID; paidAt populated',
      actual: `status=${review.status} scheduleStatus=${reviewed?.status} paidAt=${reviewed?.paidAt ?? null}`,
      severity: 'High',
      status: review.status === 200 && reviewed?.status === 'PAID' ? 'Passed' : 'Failed'
    }));
  });

  test('4.3 review REJECTED moves the schedule to PAYMENT_REJECTED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('Rej'));
    const scheduleId = f.schedules[0].id;
    const tenantRow = await api.raw('GET', `/tenants/${f.tenantId}`);
    const tenantEmail = ((tenantRow.body as ApiEnvelope<{ email?: string }>)?.data?.email) ?? '';
    if (!tenantEmail) {
      recordRow(row({ scenario: 'Skipped — bootstrap tenant has no email on file', status: 'Blocked' }));
      return;
    }
    await api.login(tenantEmail);
    await api.raw('POST', `/tenant-portal/contracts/${f.contractId}/payment-schedule/${scheduleId}/proof`, {
      proofUrl: loadState().placeholderFileUrl,
      paymentDate: '2026-01-15',
      paymentMethod: 'CASH'
    });
    await api.loginRole('SUPER_ADMIN');
    const rej = await api.raw('PATCH', `/payment-schedule/${scheduleId}/proof/review`, {
      status: 'REJECTED',
      notes: 'QA reject'
    });
    const rejBody = (rej.body as ApiEnvelope<ScheduleRow>)?.data;
    recordRow(row({
      route: 'PATCH /payment-schedule/{id}/proof/review',
      scenario: 'Reject proof → schedule moves to PAYMENT_REJECTED',
      steps: 'TENANT upload proof → PATCH review decision=REJECTED rejectionReason="QA reject"',
      testData: `scheduleId=${scheduleId}`,
      expected: 'HTTP 200; data.status=PAYMENT_REJECTED',
      actual: `status=${rej.status} scheduleStatus=${rejBody?.status}`,
      severity: 'High',
      status: rej.status === 200 && rejBody?.status === 'PAYMENT_REJECTED' ? 'Passed' : 'Failed'
    }));
  });

  test('4.4 accountant mark-paid (no proof) → PAID', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('MP'));
    const scheduleId = f.schedules[0].id;
    const mp = await api.raw('POST', `/payment-schedule/${scheduleId}/mark-paid`, {
      amountPaid: Number(f.schedules[0].amount ?? 300),
      paymentDate: '2026-01-10',
      paymentMethod: 'CASH',
      receiptUrl: loadState().placeholderFileUrl,
      notes: 'QA mark paid'
    });
    const mpBody = (mp.body as ApiEnvelope<ScheduleRow>)?.data;
    recordRow(row({
      route: 'POST /payment-schedule/{id}/mark-paid',
      scenario: 'Accountant marks row paid directly → schedule PAID',
      steps: `POST /payment-schedule/${scheduleId}/mark-paid`,
      testData: '-',
      expected: 'HTTP 200; data.status=PAID; receiptUrl stored',
      actual: `status=${mp.status} scheduleStatus=${mpBody?.status} receipt=${mpBody?.receiptUrl ? 'set' : 'missing'}`,
      severity: 'High',
      status: mp.status === 200 && mpBody?.status === 'PAID' ? 'Passed' : 'Failed'
    }));
  });

  test('4.5 POST /payments full-amount → schedule PAID; partial → PARTIAL', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('Pay'));
    const full = f.schedules[0];
    const partial = f.schedules[1];

    const fullAmount = Number(full.amount ?? 300);
    const pFull = await api.raw('POST', '/payments', {
      contractId: f.contractId,
      scheduleId: full.id,
      tenantId: f.tenantId,
      paymentDate: '2026-01-05',
      amountPaid: fullAmount,
      amountDue: fullAmount,
      paymentMethod: 'CASH',
      notes: 'QA full pay'
    });
    const fullAfter = await api.raw('GET', `/contracts/${f.contractId}/payment-schedule?size=240`);
    const fullRow = (((fullAfter.body as ApiEnvelope<{ content?: ScheduleRow[] } | ScheduleRow[]>)?.data as { content?: ScheduleRow[] })?.content ?? (fullAfter.body as ApiEnvelope<ScheduleRow[]>)?.data ?? []).find((r: ScheduleRow) => r.id === full.id);
    recordRow(row({
      route: 'POST /payments',
      scenario: 'Recording the full amount marks the schedule PAID',
      steps: `POST /payments amount=${full.amount} for scheduleId=${full.id}`,
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200/201; schedule.status=PAID',
      actual: `status=${pFull.status} scheduleStatus=${fullRow?.status}`,
      severity: 'High',
      status: isOk(pFull.status) && fullRow?.status === 'PAID' ? 'Passed' : 'Failed'
    }));

    const partialAmountDue = Number(partial.amount ?? 300);
    const partialAmount = Math.max(1, Math.floor(partialAmountDue / 2));
    const pPartial = await api.raw('POST', '/payments', {
      contractId: f.contractId,
      scheduleId: partial.id,
      tenantId: f.tenantId,
      paymentDate: '2026-02-05',
      amountPaid: partialAmount,
      amountDue: partialAmountDue,
      paymentMethod: 'CASH'
    });
    const partialAfter = await api.raw('GET', `/contracts/${f.contractId}/payment-schedule?size=240`);
    const partialRow = (((partialAfter.body as ApiEnvelope<{ content?: ScheduleRow[] } | ScheduleRow[]>)?.data as { content?: ScheduleRow[] })?.content ?? (partialAfter.body as ApiEnvelope<ScheduleRow[]>)?.data ?? []).find((r: ScheduleRow) => r.id === partial.id);
    recordRow(row({
      route: 'POST /payments',
      scenario: 'Recording a half-amount payment marks the schedule PARTIAL',
      steps: `POST /payments amount=${partialAmount} for scheduleId=${partial.id}`,
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200/201; schedule.status=PARTIAL',
      actual: `status=${pPartial.status} scheduleStatus=${partialRow?.status} amountPaid=${partialRow?.amountPaid ?? '-'}`,
      severity: 'High',
      status: isOk(pPartial.status) && partialRow?.status === 'PARTIAL' ? 'Passed' : 'Failed'
    }));
  });

  test('4.6 rent-overdue scheduler flips past-due PENDING rows to OVERDUE', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('Ovd'));
    const beforeStatuses = f.schedules.map(r => r.status);
    const sched = await api.raw('POST', '/dev/schedulers/rent-overdue');

    const after = await api.raw('GET', `/contracts/${f.contractId}/payment-schedule?size=240`);
    const data = ((after.body as ApiEnvelope<{ content?: ScheduleRow[] } | ScheduleRow[]>)?.data) ?? [];
    const rows = Array.isArray(data) ? data : ((data as { content?: ScheduleRow[] }).content ?? []);
    const overdueCount = rows.filter(r => r.status === 'OVERDUE').length;
    const today = new Date().toISOString().slice(0, 10);
    const expectedOverdue = rows.filter(r => (r.dueDate ?? '9999-12-31') < today && r.status !== 'PAID' && r.status !== 'WAIVED').length;

    recordRow(row({
      module: 'schedulers',
      route: 'POST /dev/schedulers/rent-overdue',
      scenario: 'Scheduler flips PENDING rows with dueDate < today to OVERDUE',
      steps: `Activate fresh contract starting 2026-01-01 → POST /dev/schedulers/rent-overdue (today=${today})`,
      testData: `contractId=${f.contractId} pre=${beforeStatuses.length} rows`,
      expected: 'HTTP 200; #OVERDUE rows >= #rows with past dueDate not already PAID/WAIVED',
      actual: `status=${sched.status} overdueRows=${overdueCount} expectedOverdue~${expectedOverdue}`,
      severity: 'High',
      status: sched.status === 200 && overdueCount >= Math.max(1, expectedOverdue) ? 'Passed' : 'Failed'
    }));
  });

  test('4.7 rent-due-reminders scheduler is reachable', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/dev/schedulers/rent-due-reminders');
    recordRow(row({
      module: 'schedulers',
      route: 'POST /dev/schedulers/rent-due-reminders',
      scenario: 'Dev rent-due-reminders endpoint is reachable as SUPER_ADMIN',
      steps: 'POST /dev/schedulers/rent-due-reminders',
      testData: '-',
      expected: 'HTTP 200 with status="ok"',
      actual: `status=${r.status}`,
      severity: 'Medium',
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
  });

  test('4.8 rent-dunning-escalation scheduler is reachable', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/dev/schedulers/rent-dunning-escalation');
    recordRow(row({
      module: 'schedulers',
      route: 'POST /dev/schedulers/rent-dunning-escalation',
      scenario: 'Dev dunning escalation endpoint is reachable as SUPER_ADMIN',
      steps: 'POST /dev/schedulers/rent-dunning-escalation',
      testData: '-',
      expected: 'HTTP 200 with status="ok"',
      actual: `status=${r.status}`,
      severity: 'Medium',
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
  });

  test('4.9 GET /payments/overdue lists past-due rows with property scope', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/payments/overdue');
    recordRow(row({
      module: 'rent-schedules',
      route: 'GET /payments/overdue',
      scenario: 'Overdue payments report is readable',
      steps: 'GET /payments/overdue without propertyId',
      testData: '-',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      severity: 'Medium',
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
  });

  test('4.10 GET /payments/proofs/pending lists rows awaiting accountant review', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');

    const f = await makeActiveContractWithSchedule(api as RawApi, uniq('PendList'));
    const scheduleId = f.schedules[2].id; // 3rd month
    const tenantRow = await api.raw('GET', `/tenants/${f.tenantId}`);
    const tenantEmail = ((tenantRow.body as ApiEnvelope<{ email?: string }>)?.data?.email) ?? '';
    if (tenantEmail) {
      await api.login(tenantEmail);
      await api.raw('POST', `/tenant-portal/contracts/${f.contractId}/payment-schedule/${scheduleId}/proof`, {
        proofUrl: loadState().placeholderFileUrl,
        paymentDate: '2026-03-15',
        paymentMethod: 'CASH'
      });
    }
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/payments/proofs/pending');
    const list = ((r.body as ApiEnvelope<ScheduleRow[]>)?.data) ?? [];
    recordRow(row({
      module: 'rent-schedules',
      route: 'GET /payments/proofs/pending',
      scenario: 'Pending proofs endpoint includes the row tenant just uploaded',
      steps: 'TENANT upload proof → SUPER_ADMIN GET /payments/proofs/pending',
      testData: `scheduleId=${scheduleId}`,
      expected: 'HTTP 200; list contains scheduleId',
      actual: `status=${r.status} pendingCount=${list.length} containsScheduleId=${list.some(x => x.id === scheduleId)}`,
      severity: 'High',
      status: r.status === 200 && list.some(x => x.id === scheduleId) ? 'Passed' : 'Failed'
    }));
  });
});
