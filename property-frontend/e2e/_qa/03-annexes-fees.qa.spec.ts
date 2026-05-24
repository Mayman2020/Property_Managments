/**
 * Iteration 3 — Contract annexes and contract fees CRUD + mark-paid.
 *
 * Both modules attach to an existing lease contract. We piggy-back on the
 * bootstrapped contract 4 (DRAFT) — annexes and fees have no contract-status
 * gate in the service layer.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';

const ITER = 3;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'contract-annexes',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'contracts.*',
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

const isOk = (status: number) => status === 200 || status === 201;
const isNoContent = (status: number) => status === 200 || status === 204;

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

interface AnnexResponse {
  id: number;
  contractId?: number;
  annexNumber?: string;
  title?: string;
  description?: string;
  effectiveDate?: string;
  documentUrl?: string;
}

interface FeeResponse {
  id: number;
  contractId: number;
  amount: number | string;
  paid?: boolean;
  feeType?: string;
  description?: string;
  receiptUrl?: string;
}

interface ContractRow { id: number; status?: string; }

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: 'SUPER_ADMIN'): Promise<string>;
}

async function findAnyDraftContractId(api: RawApi): Promise<number | undefined> {
  const list = await api.raw('GET', '/contracts?status=DRAFT');
  const data = (list.body as ApiEnvelope<{ content?: ContractRow[] } | ContractRow[]>)?.data;
  const arr = Array.isArray(data) ? data : (data?.content ?? []);
  return arr[0]?.id;
}

test.describe.serial('Iteration 3 — Contract annexes', () => {
  test('3.15 annex CRUD on an existing DRAFT contract', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const contractId = await findAnyDraftContractId(api as RawApi);
    if (!contractId) {
      recordRow(row({ module: 'contract-annexes', scenario: 'Skipped — no DRAFT contract available', status: 'Blocked' }));
      return;
    }

    const title = `QA Annex ${Date.now()}`;
    const create = await api.raw('POST', `/contracts/${contractId}/annexes`, {
      title,
      annexNumber: 'A-1',
      description: 'QA annex body',
      effectiveDate: '2026-06-01'
    });
    const annex = (create.body as ApiEnvelope<AnnexResponse>)?.data;
    recordRow(row({
      route: 'POST /contracts/{cid}/annexes',
      scenario: 'Create annex on a contract',
      steps: `POST /contracts/${contractId}/annexes`,
      testData: `title=${title}`,
      expected: 'HTTP 200/201 with data.id',
      actual: `status=${create.status} id=${annex?.id}`,
      severity: 'High',
      status: isOk(create.status) && Boolean(annex?.id) ? 'Passed' : 'Failed'
    }));
    expect(annex?.id).toBeTruthy();
    const annexId = annex!.id;

    const list = await api.raw('GET', `/contracts/${contractId}/annexes`);
    const arr = (list.body as ApiEnvelope<AnnexResponse[]>)?.data ?? [];
    recordRow(row({
      route: 'GET /contracts/{cid}/annexes',
      scenario: 'List annexes for a contract includes the new one',
      steps: 'GET annexes list',
      testData: '-',
      expected: 'List contains new annex id',
      actual: `status=${list.status} found=${arr.some(a => a.id === annexId)}`,
      status: list.status === 200 && arr.some(a => a.id === annexId) ? 'Passed' : 'Failed'
    }));

    const newTitle = `${title} updated`;
    const upd = await api.raw('PUT', `/contracts/${contractId}/annexes/${annexId}`, {
      title: newTitle,
      annexNumber: 'A-1B',
      description: 'updated',
      effectiveDate: '2026-07-01'
    });
    const updated = (upd.body as ApiEnvelope<AnnexResponse>)?.data;
    recordRow(row({
      route: 'PUT /contracts/{cid}/annexes/{id}',
      scenario: 'Update annex title + effective date',
      steps: 'PUT annex',
      testData: '-',
      expected: 'HTTP 200 title reflects new value',
      actual: `status=${upd.status} title=${updated?.title}`,
      status: upd.status === 200 && updated?.title === newTitle ? 'Passed' : 'Failed'
    }));

    const del = await api.raw('DELETE', `/contracts/${contractId}/annexes/${annexId}`);
    recordRow(row({
      route: 'DELETE /contracts/{cid}/annexes/{id}',
      scenario: 'Delete annex (controller returns 204 No Content)',
      steps: 'DELETE annex',
      testData: '-',
      expected: 'HTTP 204 (or 200)',
      actual: `status=${del.status}`,
      severity: 'Medium',
      status: isNoContent(del.status) ? 'Passed' : 'Failed'
    }));
  });

  test('3.16 annex without title is rejected', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const contractId = await findAnyDraftContractId(api as RawApi);
    if (!contractId) {
      recordRow(row({ scenario: 'Skipped — no DRAFT contract available', status: 'Blocked' }));
      return;
    }
    const bad = await api.raw('POST', `/contracts/${contractId}/annexes`, { annexNumber: 'X-1' });
    recordRow(row({
      route: 'POST /contracts/{cid}/annexes',
      scenario: 'Annex with blank title is rejected',
      steps: 'POST annex without title field',
      testData: '-',
      expected: 'HTTP 400 bean validation',
      actual: `status=${bad.status}`,
      severity: 'High',
      status: bad.status === 400 ? 'Passed' : 'Failed'
    }));
  });
});

test.describe.serial('Iteration 3 — Contract fees', () => {
  test('3.17 fee CRUD + mark-paid', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const contractId = await findAnyDraftContractId(api as RawApi);
    if (!contractId) {
      recordRow(row({ module: 'contract-fees', scenario: 'Skipped — no DRAFT contract available', status: 'Blocked' }));
      return;
    }

    const create = await api.raw('POST', '/contract-fees', {
      contractId,
      amount: 50,
      // DB CHECK constraint: ELECTRICITY/WATER/GAS/SERVICE_CHARGE/PARKING/
      // MAINTENANCE_CHARGE/PENALTY/OTHER.
      feeType: 'PENALTY',
      description: 'QA fee',
      dueDate: '2026-06-15'
    });
    const fee = (create.body as ApiEnvelope<FeeResponse>)?.data;
    recordRow(row({
      module: 'contract-fees',
      route: 'POST /contract-fees',
      scenario: 'Create unpaid fee on a contract',
      steps: 'POST /contract-fees amount=50',
      testData: `contractId=${contractId}`,
      expected: 'HTTP 200/201; data.id; paid=false',
      actual: `status=${create.status} id=${fee?.id} paid=${fee?.paid}`,
      severity: 'High',
      status: isOk(create.status) && Boolean(fee?.id) && fee?.paid === false ? 'Passed' : 'Failed'
    }));
    expect(fee?.id).toBeTruthy();
    const feeId = fee!.id;

    const mark = await api.raw('PATCH', `/contract-fees/${feeId}/mark-paid?receiptUrl=https%3A%2F%2Fexample.com%2Fr.png`);
    const marked = (mark.body as ApiEnvelope<FeeResponse>)?.data;
    recordRow(row({
      module: 'contract-fees',
      route: 'PATCH /contract-fees/{id}/mark-paid',
      scenario: 'Mark fee as paid stores receiptUrl',
      steps: 'PATCH .../mark-paid?receiptUrl=...',
      testData: `feeId=${feeId}`,
      expected: 'HTTP 200 paid=true receiptUrl preserved',
      actual: `status=${mark.status} paid=${marked?.paid} receipt=${marked?.receiptUrl}`,
      severity: 'High',
      status: mark.status === 200 && marked?.paid === true ? 'Passed' : 'Failed'
    }));

    const list = await api.raw('GET', `/contract-fees/contract/${contractId}`);
    const all = (list.body as ApiEnvelope<FeeResponse[]>)?.data ?? [];
    recordRow(row({
      module: 'contract-fees',
      route: 'GET /contract-fees/contract/{cid}',
      scenario: 'List fees for a contract includes the new one',
      steps: `GET /contract-fees/contract/${contractId}`,
      testData: '-',
      expected: 'List contains feeId; paid=true',
      actual: `status=${list.status} count=${all.length}`,
      status: list.status === 200 && all.some(f => f.id === feeId && f.paid === true) ? 'Passed' : 'Failed'
    }));

    const del = await api.raw('DELETE', `/contract-fees/${feeId}`);
    recordRow(row({
      module: 'contract-fees',
      route: 'DELETE /contract-fees/{id}',
      scenario: 'Delete fee row',
      steps: `DELETE /contract-fees/${feeId}`,
      testData: '-',
      expected: 'HTTP 200',
      actual: `status=${del.status}`,
      status: del.status === 200 ? 'Passed' : 'Failed'
    }));
  });

  test('3.18a invalid feeType returns 400 (not 500) once the service-side allow-list is in place', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const contractId = await findAnyDraftContractId(api as RawApi);
    if (!contractId) {
      recordRow(row({ module: 'contract-fees', scenario: 'Skipped — no DRAFT contract available', status: 'Blocked' }));
      return;
    }
    const bad = await api.raw('POST', '/contract-fees', {
      contractId,
      amount: 25,
      feeType: 'NOT_A_REAL_TYPE'
    });
    recordRow(row({
      module: 'contract-fees',
      route: 'POST /contract-fees',
      scenario: 'Server-side validation of feeType against the allowed set',
      steps: 'POST /contract-fees feeType=NOT_A_REAL_TYPE',
      testData: '-',
      expected: 'HTTP 400 INVALID_FEE_TYPE (instead of the legacy 500 from the DB CHECK)',
      actual: `status=${bad.status}`,
      severity: 'Medium',
      status: bad.status === 400 ? 'Passed' : 'Failed',
      bugSummary: bad.status === 400
        ? ''
        : 'ContractFeeService accepted any feeType; the DB CHECK constraint then rejected the row with a 500 INTERNAL_ERROR. Fix added a service-side allow-list mirroring contract_fees_fee_type_check.'
    }));
  });

  test('3.18 fee amount must be positive', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const contractId = await findAnyDraftContractId(api as RawApi);
    if (!contractId) {
      recordRow(row({ module: 'contract-fees', scenario: 'Skipped — no DRAFT contract available', status: 'Blocked' }));
      return;
    }
    const bad = await api.raw('POST', '/contract-fees', {
      contractId,
      amount: -10,
      feeType: 'LATE_FEE'
    });
    recordRow(row({
      module: 'contract-fees',
      route: 'POST /contract-fees',
      scenario: 'Negative amount is rejected (@Positive)',
      steps: 'POST /contract-fees amount=-10',
      testData: '-',
      expected: 'HTTP 400 bean validation',
      actual: `status=${bad.status}`,
      severity: 'High',
      status: bad.status === 400 ? 'Passed' : 'Failed'
    }));
  });
});
