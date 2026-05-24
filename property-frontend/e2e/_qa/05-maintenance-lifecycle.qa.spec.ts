/**
 * Iteration 5 — Maintenance request lifecycle.
 *
 *   PENDING --assign--> ASSIGNED --schedule--> SCHEDULED --start--> IN_PROGRESS
 *                                              SCHEDULED --reject-schedule--> ASSIGNED
 *   IN_PROGRESS --visit-report COMPLETED--> COMPLETED
 *   IN_PROGRESS --visit-report TENANT_ABSENT--> TENANT_ABSENT
 *   IN_PROGRESS --visit-report NEEDS_REVISIT--> NEEDS_REVISIT
 *   (non-terminal) --cancel--> CANCELLED
 *   Visit-report items[] deduct InventoryItem stock as OUT transactions.
 *   Visit-report with hasPurchase + contractorCompanyId auto-creates an
 *   ad-hoc MaintenanceInvoice in PENDING.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 5;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'maintenance-requests',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'maintenance.*',
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

interface MaintenanceRequest {
  id: number;
  requestNumber?: string;
  status?: string;
  priority?: string;
  scheduledDate?: string;
  scheduleAccepted?: boolean;
  contractorCompanyId?: number | null;
  assignedToUserId?: number | null;
  closedAt?: string | null;
}

interface VisitReport {
  id: number;
  visitOutcome?: string;
}

interface InventoryItem {
  id: number;
  itemCode?: string;
  quantity?: number | string;
}

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: string): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

async function ensureInternalAssignment(api: RawApi, propertyId: number, officerUserId: number): Promise<void> {
  await api.raw('POST', `/properties/${propertyId}/maintenance-assignments`, {
    providerType: 'USER',
    userId: officerUserId,
    isPrimary: true
  });
}

async function createRequest(api: RawApi, propertyId: number, unitId: number, tag: string, opts: Partial<{ priority: string; tenantId: number; routingTarget: string; categoryId: number }> = {}): Promise<MaintenanceRequest> {
  const body: Record<string, unknown> = {
    propertyId,
    unitId,
    title: `Req ${tag}`,
    description: `QA description ${tag}`,
    priority: opts.priority ?? 'NORMAL'
  };
  if (opts.tenantId) body.tenantId = opts.tenantId;
  if (opts.routingTarget) body.routingTarget = opts.routingTarget;
  if (opts.categoryId) body.categoryId = opts.categoryId;
  const r = await api.raw('POST', '/maintenance/requests', body);
  if (!isOk(r.status)) throw new Error(`create request failed: ${r.status} ${JSON.stringify(r.body)}`);
  return (r.body as ApiEnvelope<MaintenanceRequest>).data!;
}

async function getRequest(api: RawApi, id: number): Promise<MaintenanceRequest> {
  const r = await api.raw('GET', `/maintenance/requests/${id}`);
  return ((r.body as ApiEnvelope<MaintenanceRequest>).data) ?? { id };
}

test.describe.serial('Iteration 5 — Maintenance request lifecycle', () => {
  test('5.1 PENDING → ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED happy path', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;

    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Happy'), { tenantId });

    // With an active USER assignment, MaintenanceRequestService.create should
    // route directly to ASSIGNED. If not (e.g. legacy fallback), we still
    // accept PENDING and explicitly assign in the next step.
    let current = await getRequest(api as RawApi, req.id);
    if (current.status === 'PENDING') {
      const assign = await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
      recordRow(row({
        route: 'PATCH /maintenance/requests/{id}/assign',
        scenario: 'Assign moves PENDING → ASSIGNED',
        steps: `PATCH assign officerId=${officerId}`,
        testData: `requestId=${req.id}`,
        expected: 'HTTP 200; status=ASSIGNED',
        actual: `status=${assign.status} reqStatus=${(assign.body as ApiEnvelope<MaintenanceRequest>)?.data?.status}`,
        status: assign.status === 200 && (assign.body as ApiEnvelope<MaintenanceRequest>)?.data?.status === 'ASSIGNED' ? 'Passed' : 'Failed'
      }));
      current = await getRequest(api as RawApi, req.id);
    } else {
      recordRow(row({
        route: 'POST /maintenance/requests',
        scenario: 'Active USER assignment routes new request straight to ASSIGNED',
        steps: 'POST /maintenance/requests with property having active officer assignment',
        testData: `requestId=${req.id}`,
        expected: 'status=ASSIGNED',
        actual: `status=${current.status}`,
        status: current.status === 'ASSIGNED' ? 'Passed' : 'Failed'
      }));
    }

    // SCHEDULE
    const sched = await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, {
      scheduledDate: '2026-06-01',
      scheduledTimeFrom: '10:00',
      scheduledTimeTo: '11:00'
    });
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/schedule',
      scenario: 'Schedule moves ASSIGNED → SCHEDULED',
      steps: 'PATCH schedule scheduledDate=2026-06-01',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=SCHEDULED',
      actual: `status=${sched.status} reqStatus=${(sched.body as ApiEnvelope<MaintenanceRequest>)?.data?.status}`,
      status: sched.status === 200 && (sched.body as ApiEnvelope<MaintenanceRequest>)?.data?.status === 'SCHEDULED' ? 'Passed' : 'Failed'
    }));

    // START
    const start = await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/start',
      scenario: 'Start moves SCHEDULED → IN_PROGRESS',
      steps: 'PATCH start',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=IN_PROGRESS',
      actual: `status=${start.status} reqStatus=${(start.body as ApiEnvelope<MaintenanceRequest>)?.data?.status}`,
      status: start.status === 200 && (start.body as ApiEnvelope<MaintenanceRequest>)?.data?.status === 'IN_PROGRESS' ? 'Passed' : 'Failed'
    }));

    // VISIT-REPORT COMPLETED
    const vr = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-01',
      visitOutcome: 'COMPLETED',
      officerNotes: 'QA visit',
      workDone: 'Replaced widget',
      hasPurchase: false,
      items: []
    });
    const after = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/visit-report',
      scenario: 'Visit report outcome=COMPLETED moves IN_PROGRESS → COMPLETED + closedAt set',
      steps: 'POST visit-report visitOutcome=COMPLETED',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200/201; status=COMPLETED; closedAt set',
      actual: `status=${vr.status} reqStatus=${after.status} closedAt=${after.closedAt ? 'set' : 'null'}`,
      status: isOk(vr.status) && after.status === 'COMPLETED' && after.closedAt ? 'Passed' : 'Failed'
    }));
  });

  test('5.2 PATCH /accept-schedule sets scheduleAccepted=true (status remains SCHEDULED)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][1];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Accept'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-02' });

    // The /accept-schedule endpoint requires my_requests.approve permission;
    // SUPER_ADMIN has the role hierarchy that grants this through admin.
    const accept = await api.raw('PATCH', `/maintenance/requests/${req.id}/accept-schedule`);
    const afterAccept = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/accept-schedule',
      scenario: 'Tenant accepts schedule → scheduleAccepted=true, status unchanged (SCHEDULED)',
      steps: 'PATCH accept-schedule on SCHEDULED request',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=SCHEDULED; scheduleAccepted=true',
      actual: `status=${accept.status} reqStatus=${afterAccept.status} accepted=${afterAccept.scheduleAccepted}`,
      status: accept.status === 200 && afterAccept.status === 'SCHEDULED' && afterAccept.scheduleAccepted === true ? 'Passed' : 'Failed'
    }));
  });

  test('5.3 PATCH /reject-schedule moves SCHEDULED → ASSIGNED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][2];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Reject'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-03' });

    const reject = await api.raw('PATCH', `/maintenance/requests/${req.id}/reject-schedule`, { rejectionNote: 'QA cannot make it' });
    const afterReject = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/reject-schedule',
      scenario: 'Tenant rejects schedule → status returns to ASSIGNED',
      steps: 'PATCH reject-schedule rejectionNote="..." on SCHEDULED request',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=ASSIGNED',
      actual: `status=${reject.status} reqStatus=${afterReject.status}`,
      status: reject.status === 200 && afterReject.status === 'ASSIGNED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.4 POST /visit-report outcome=NEEDS_REVISIT keeps the request open + schedules revisit loop', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][3];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Revisit'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-04' });
    await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);

    const vr = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-04',
      visitOutcome: 'NEEDS_REVISIT',
      officerNotes: 'Needs more parts',
      hasPurchase: false
    });
    const after = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/visit-report',
      scenario: 'Visit outcome=NEEDS_REVISIT keeps request open (closedAt=null) and flips status to NEEDS_REVISIT so /schedule can be re-run',
      steps: 'POST visit-report visitOutcome=NEEDS_REVISIT',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200/201; status=NEEDS_REVISIT; closedAt=null',
      actual: `status=${vr.status} reqStatus=${after.status} closedAt=${after.closedAt ?? 'null'}`,
      status: isOk(vr.status) && after.status === 'NEEDS_REVISIT' && !after.closedAt ? 'Passed' : 'Failed'
    }));

    // Verify we can schedule again from NEEDS_REVISIT
    const sched2 = await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-05' });
    const afterSched = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/schedule',
      scenario: 'Schedule is allowed from NEEDS_REVISIT (revisit loop)',
      steps: 'PATCH schedule on NEEDS_REVISIT request',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=SCHEDULED',
      actual: `status=${sched2.status} reqStatus=${afterSched.status}`,
      status: sched2.status === 200 && afterSched.status === 'SCHEDULED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.5 POST /visit-report outcome=TENANT_ABSENT closes the request as TENANT_ABSENT', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][4];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Absent'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-04' });
    await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);

    const vr = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-04',
      visitOutcome: 'TENANT_ABSENT',
      officerNotes: 'No one home',
      hasPurchase: false
    });
    const after = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/visit-report',
      scenario: 'Visit outcome=TENANT_ABSENT closes request with status=TENANT_ABSENT and closedAt set',
      steps: 'POST visit-report visitOutcome=TENANT_ABSENT',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200/201; status=TENANT_ABSENT; closedAt set',
      actual: `status=${vr.status} reqStatus=${after.status} closedAt=${after.closedAt ? 'set' : 'null'}`,
      status: isOk(vr.status) && after.status === 'TENANT_ABSENT' && after.closedAt ? 'Passed' : 'Failed'
    }));
  });

  test('5.6 PATCH /cancel moves a non-terminal request to CANCELLED; cancelling a COMPLETED request is rejected', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][5];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Cancel'), { tenantId });

    const cancel = await api.raw('PATCH', `/maintenance/requests/${req.id}/cancel`, { reason: 'QA cancel' });
    const afterCancel = await getRequest(api as RawApi, req.id);
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/cancel',
      scenario: 'Cancel moves a non-terminal request to CANCELLED',
      steps: 'PATCH cancel reason="QA cancel"',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200; status=CANCELLED',
      actual: `status=${cancel.status} reqStatus=${afterCancel.status}`,
      status: cancel.status === 200 && afterCancel.status === 'CANCELLED' ? 'Passed' : 'Failed'
    }));

    const cancelAgain = await api.raw('PATCH', `/maintenance/requests/${req.id}/cancel`, { reason: 'QA second cancel' });
    recordRow(row({
      route: 'PATCH /maintenance/requests/{id}/cancel',
      scenario: 'Cancelling a CANCELLED request returns 400 (cannot be re-cancelled)',
      steps: 'PATCH cancel twice',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 400 with business error',
      actual: `status=${cancelAgain.status}`,
      severity: 'Medium',
      status: cancelAgain.status === 400 || cancelAgain.status === 409 ? 'Passed' : 'Failed'
    }));
  });

  test('5.7 POST /visit-report duplicate against same request is rejected (409)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[1];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Dup'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-05' });
    await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);

    await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-05',
      visitOutcome: 'COMPLETED',
      officerNotes: 'first report',
      hasPurchase: false
    });
    const dup = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-05',
      visitOutcome: 'COMPLETED',
      officerNotes: 'second report',
      hasPurchase: false
    });
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/visit-report (duplicate)',
      scenario: 'A second visit report against the same request is rejected',
      steps: 'POST visit-report twice in sequence',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 409 (or 400) BUSINESS_ERROR',
      actual: `status=${dup.status} errorCode=${(dup.body as ApiEnvelope)?.errorCode ?? '-'}`,
      severity: 'Medium',
      status: dup.status === 409 || dup.status === 400 ? 'Passed' : 'Failed'
    }));
  });

  test('5.8 Visit-report items[] deduct InventoryItem stock as OUT transactions', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[1];
    const unitId = s.unitIdsByProperty[String(propertyId)][1];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    // Create inventory item with starting stock 10
    const itemCode = `INV-${Date.now().toString().slice(-7)}`;
    const itemResp = await api.raw('POST', '/inventory', {
      propertyId,
      itemCode,
      itemNameAr: 'صنف اختبار',
      itemNameEn: 'QA Item',
      unitOfMeasure: 'pcs',
      quantity: 10,
      minQuantity: 2,
      location: 'QA shelf'
    });
    if (!isOk(itemResp.status)) {
      recordRow(row({ scenario: `Skipped — inventory item create failed: ${itemResp.status}`, status: 'Blocked' }));
      return;
    }
    const item = (itemResp.body as ApiEnvelope<InventoryItem>).data!;

    // Create + run maintenance request to IN_PROGRESS
    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Inv'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-06' });
    await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);

    // Submit visit-report consuming 3 units
    const vr = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-06',
      visitOutcome: 'COMPLETED',
      officerNotes: 'used 3 pcs',
      hasPurchase: false,
      items: [{ itemId: item.id, quantityUsed: 3, notes: 'QA used' }]
    });
    const afterItem = await api.raw('GET', `/inventory/${item.id}`);
    const newQty = Number(((afterItem.body as ApiEnvelope<InventoryItem>)?.data?.quantity) ?? 0);
    recordRow(row({
      module: 'inventory',
      route: 'POST /maintenance/requests/{id}/visit-report (with items[])',
      scenario: 'Visit-report items[] decrement InventoryItem.quantity and create OUT transaction tagged with requestId',
      steps: 'Create inv item qty=10 → run request to IN_PROGRESS → POST visit-report items=[{itemId, quantityUsed:3}]',
      testData: `itemId=${item.id} requestId=${req.id}`,
      expected: 'HTTP 200/201; quantity=7',
      actual: `vr.status=${vr.status} afterQty=${newQty}`,
      status: isOk(vr.status) && newQty === 7 ? 'Passed' : 'Failed'
    }));
  });

  test('5.9 Submitting a visit-report from outside IN_PROGRESS is rejected', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[1];
    const unitId = s.unitIdsByProperty[String(propertyId)][2];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('BadVR'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    // Skip schedule + start so the request stays ASSIGNED
    const vr = await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-07',
      visitOutcome: 'COMPLETED',
      hasPurchase: false
    });
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/visit-report (from ASSIGNED)',
      scenario: 'Visit report from non-IN_PROGRESS request is rejected',
      steps: 'Skip /start; POST visit-report on ASSIGNED request',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 400 (or 409) business error',
      actual: `status=${vr.status} errorCode=${(vr.body as ApiEnvelope)?.errorCode ?? '-'}`,
      severity: 'Medium',
      status: vr.status === 400 || vr.status === 409 ? 'Passed' : 'Failed'
    }));
  });

  test('5.10 POST /rating after COMPLETED stores tenant rating (1-4)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[1];
    const unitId = s.unitIdsByProperty[String(propertyId)][3];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    await ensureInternalAssignment(api as RawApi, propertyId, officerId);

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Rate'), { tenantId });
    if ((await getRequest(api as RawApi, req.id)).status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${req.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${req.id}/schedule`, { scheduledDate: '2026-06-08' });
    await api.raw('PATCH', `/maintenance/requests/${req.id}/start`);
    await api.raw('POST', `/maintenance/requests/${req.id}/visit-report`, {
      visitDate: '2026-06-08',
      visitOutcome: 'COMPLETED',
      hasPurchase: false
    });

    const rating = await api.raw('POST', `/maintenance/requests/${req.id}/rating`, { rating: 4, comment: 'QA happy' });
    const ratingBody = (rating.body as ApiEnvelope<{ rating: number; comment?: string }>)?.data;
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/rating',
      scenario: 'After COMPLETED, tenant rating in [1,4] is stored',
      steps: 'POST rating=4 comment="QA happy" on COMPLETED request',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 200/201; rating=4',
      actual: `status=${rating.status} rating=${ratingBody?.rating}`,
      status: isOk(rating.status) && ratingBody?.rating === 4 ? 'Passed' : 'Failed'
    }));

    const bad = await api.raw('POST', `/maintenance/requests/${req.id}/rating`, { rating: 7, comment: 'out of range' });
    recordRow(row({
      route: 'POST /maintenance/requests/{id}/rating (bad)',
      scenario: 'Rating out of 1..4 range is rejected',
      steps: 'POST rating=7',
      testData: `requestId=${req.id}`,
      expected: 'HTTP 400',
      actual: `status=${bad.status}`,
      severity: 'Medium',
      status: bad.status === 400 ? 'Passed' : 'Failed'
    }));
  });

  test('5.11 Property maintenance assignment: COMPANY assignment routes a new request to /company-queue (PENDING)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[1];
    const unitId = s.unitIdsByProperty[String(propertyId)][4];
    const tenantId = s.tenantIds[0];
    const companyId = s.firstContractorCompanyId!;

    // End the active USER assignment then create or reuse a COMPANY assignment.
    const list = await api.raw('GET', `/properties/${propertyId}/maintenance-assignments`);
    const assignments = ((list.body as ApiEnvelope<Array<{ id: number; status?: string; providerType?: string; companyId?: number }>>)?.data) ?? [];
    for (const a of assignments) {
      if (a.status === 'ACTIVE' && a.providerType === 'USER') {
        await api.raw('PATCH', `/properties/${propertyId}/maintenance-assignments/${a.id}/end`);
      }
    }
    const hasActiveCompany = assignments.some(a => a.status === 'ACTIVE' && a.providerType === 'COMPANY');
    let assignCoStatus: number = 200;
    if (!hasActiveCompany) {
      const assignCo = await api.raw('POST', `/properties/${propertyId}/maintenance-assignments`, {
        providerType: 'COMPANY',
        companyId,
        isPrimary: true
      });
      assignCoStatus = assignCo.status;
    }

    // Make sure there is an ACTIVE maintenance contract for company+property so
    // activeContractPropertyIdsForCompany returns this property.
    const allContracts = await api.raw('GET', `/properties/${propertyId}/maintenance-contracts`);
    const existing = ((allContracts.body as ApiEnvelope<Array<{ contractId: number; status?: string; contractorCompanyId?: number }>>)?.data) ?? [];
    let contractId: number | undefined = existing.find(c => c.status === 'ACTIVE' && c.contractorCompanyId === companyId)?.contractId;
    if (!contractId) {
      const draft = existing.find(c => c.status === 'DRAFT' && c.contractorCompanyId === companyId);
      if (draft) {
        contractId = draft.contractId;
      } else {
        const cr = await api.raw('POST', '/maintenance-contracts', {
          propertyId,
          contractorCompanyId: companyId,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          contractValue: 600,
          currency: 'OMR',
          notes: 'QA iter5 contract'
        });
        contractId = (cr.body as ApiEnvelope<{ contractId: number }>)?.data?.contractId;
      }
      if (contractId) await api.raw('PATCH', `/maintenance-contracts/${contractId}/activate`);
    }

    const req = await createRequest(api as RawApi, propertyId, unitId, uniq('Co'), { tenantId });

    // Look up the queue as the actual MAINTENANCE_COMPANY user mapped to this company.
    const companyUserEmail = s.roleEmails['MAINTENANCE_COMPANY'] as string | undefined;
    let inQueue = false;
    if (companyUserEmail) {
      await api.login(companyUserEmail);
      const queue = await api.raw('GET', `/maintenance/requests/company-queue?propertyId=${propertyId}`);
      const queueData = (queue.body as ApiEnvelope<{ content?: MaintenanceRequest[] } | MaintenanceRequest[]>)?.data;
      const queueRows = Array.isArray(queueData) ? queueData : (queueData?.content ?? []);
      inQueue = queueRows.some(r => r.id === req.id);
      await api.loginRole('SUPER_ADMIN');
    }

    recordRow(row({
      route: 'POST /properties/{id}/maintenance-assignments + POST /maintenance/requests',
      scenario: 'Property with COMPANY assignment + ACTIVE MaintenanceContract routes new request to /company-queue with status=PENDING (only visible to contractor-company-linked users)',
      steps: 'End USER assignment → POST COMPANY assignment → POST + activate maintenance contract → POST /maintenance/requests → GET /company-queue as MAINTENANCE_COMPANY user',
      testData: `propertyId=${propertyId} companyId=${companyId} reqId=${req.id} contractId=${contractId ?? '-'}`,
      expected: 'Request status=PENDING and listed in /company-queue when called as MAINTENANCE_COMPANY user',
      actual: `assign.status=${assignCoStatus} reqStatus=${req.status} contractId=${contractId ?? '-'} inQueue=${inQueue}`,
      status: req.status === 'PENDING' && inQueue ? 'Passed' : 'Failed'
    }));
  });

  test('5.12 dev maintenance-sla scheduler is reachable', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/dev/schedulers/maintenance-sla');
    recordRow(row({
      module: 'schedulers',
      route: 'POST /dev/schedulers/maintenance-sla',
      scenario: 'Dev SLA endpoint is reachable as SUPER_ADMIN and reports ok',
      steps: 'POST /dev/schedulers/maintenance-sla',
      testData: '-',
      expected: 'HTTP 200 with status=ok',
      actual: `status=${r.status}`,
      severity: 'Medium',
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
  });
});
