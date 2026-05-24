/**
 * Iteration 9b — Unit inspections (move-in / move-out lifecycle).
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';

const ITER = 9;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'inspections',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'contracts.create/edit/view',
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

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }
interface ContractRow { id: number; status?: string; unitId?: number; tenantId?: number; }
interface InspectionRow {
  id: number;
  status?: string;
  inspectionType?: string;
  items?: Array<{ id: number; area?: string; condition?: string | null }>;
}
interface PageEnv<T> { content: T[]; }

test.describe.serial('Iteration 9b — Inspections', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let contractId = 0;
  let inspectionId = 0;
  let itemId = 0;
  let tenantEmail = '';

  test('9.10 resolve contract for inspection tests', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const list = await api.raw('GET', '/contracts?page=0&size=20');
    const contracts = ((list.body as ApiEnvelope<PageEnv<ContractRow>>).data?.content) ?? [];
    const pick = contracts.find((c) => c.status === 'ACTIVE') ?? contracts.find((c) => c.status === 'DRAFT') ?? contracts[0];
    contractId = pick?.id ?? 0;
    if (s.tenantIds[0]) {
      const t = await api.raw('GET', `/tenants/${s.tenantIds[0]}`);
      tenantEmail = ((t.body as ApiEnvelope<{ email?: string }>).data?.email) ?? '';
    }
    recordRow(row({
      route: 'GET /contracts',
      scenario: 'Pick a lease contract id for inspection creation.',
      steps: 'GET /contracts?page=0&size=20',
      testData: `contractId=${contractId}`,
      expected: 'contractId > 0',
      actual: `status=${list.status} contractId=${contractId} status=${pick?.status}`,
      status: contractId > 0 ? 'Passed' : 'Blocked',
      notes: contractId === 0 ? 'No contracts in DB — run bootstrap/contract specs first' : ''
    }));
    expect(contractId).toBeGreaterThan(0);
  });

  test('9.11 POST /contracts/{id}/inspections creates PENDING MOVE_IN', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', `/contracts/${contractId}/inspections`, { type: 'MOVE_IN' });
    const d = (r.body as ApiEnvelope<InspectionRow>).data;
    inspectionId = d?.id ?? 0;
    itemId = d?.items?.[0]?.id ?? 0;
    const ok = (r.status === 200 || r.status === 201) && inspectionId > 0 && d?.status === 'PENDING';
    recordRow(row({
      route: 'POST /contracts/{id}/inspections',
      scenario: 'Create move-in inspection with default checklist items.',
      steps: `POST type=MOVE_IN contractId=${contractId}`,
      testData: `inspectionId=${inspectionId}`,
      expected: 'HTTP 201/200; status=PENDING; items seeded',
      actual: `status=${r.status} inspStatus=${d?.status} items=${d?.items?.length}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('9.12 PATCH inspection item condition', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('PATCH', `/inspections/${inspectionId}/items/${itemId}`, {
      condition: 'GOOD',
      notes: 'QA item OK'
    });
    recordRow(row({
      route: 'PATCH /inspections/{id}/items/{itemId}',
      scenario: 'Update item condition before complete.',
      steps: `PATCH item ${itemId} condition=GOOD`,
      testData: `inspectionId=${inspectionId}`,
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('9.13 PATCH all items then complete → COMPLETED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const get = await api.raw('GET', `/inspections/${inspectionId}`);
    const items = ((get.body as ApiEnvelope<InspectionRow>).data?.items) ?? [];
    for (const it of items) {
      if (!it.condition) {
        await api.raw('PATCH', `/inspections/${inspectionId}/items/${it.id}`, { condition: 'GOOD' });
      }
    }
    const r = await api.raw('PATCH', `/inspections/${inspectionId}/complete`);
    const st = ((r.body as ApiEnvelope<InspectionRow>).data?.status);
    recordRow(row({
      route: 'PATCH /inspections/{id}/complete',
      scenario: 'Complete inspection when all items have condition.',
      steps: 'Set all item conditions; PATCH complete',
      testData: `inspectionId=${inspectionId}`,
      expected: 'HTTP 200; status=COMPLETED',
      actual: `status=${r.status} inspStatus=${st}`,
      status: r.status === 200 && st === 'COMPLETED' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(st).toBe('COMPLETED');
  });

  test('9.14 PATCH sign INSPECTOR then TENANT → SIGNED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const insp = await api.raw('PATCH', `/inspections/${inspectionId}/sign`, { role: 'INSPECTOR' });
    expect(insp.status).toBe(200);
    if (tenantEmail) {
      await api.login(tenantEmail);
      const tenantSign = await api.raw('PATCH', `/tenant-portal/inspections/${inspectionId}/sign`, { role: 'TENANT' });
      const st = ((tenantSign.body as ApiEnvelope<InspectionRow>).data?.status);
      const ok = tenantSign.status === 200 && st === 'SIGNED';
      recordRow(row({
        route: 'PATCH /tenant-portal/inspections/{id}/sign',
        role: 'TENANT',
        scenario: 'Tenant signs completed inspection → SIGNED.',
        steps: 'SUPER_ADMIN sign INSPECTOR; TENANT portal sign',
        testData: `inspectionId=${inspectionId}`,
        expected: 'HTTP 200; status=SIGNED',
        actual: `tenantSign=${tenantSign.status} inspStatus=${st}`,
        status: ok ? 'Passed' : 'Failed'
      }));
      expect(ok).toBe(true);
    } else {
      recordRow(row({
        route: 'PATCH /tenant-portal/inspections/{id}/sign',
        scenario: 'Tenant sign skipped — no tenant email in state.',
        status: 'To be verified during E2E testing',
        notes: 'Requires onboarded tenant with linked user'
      }));
    }
  });

  test('9.15 GET /inspections/{id} returns detail', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', `/inspections/${inspectionId}`);
    recordRow(row({
      route: 'GET /inspections/{id}',
      scenario: 'Fetch inspection detail.',
      steps: `GET /inspections/${inspectionId}`,
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });
});
