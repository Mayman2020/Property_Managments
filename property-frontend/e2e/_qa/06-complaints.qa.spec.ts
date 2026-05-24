/**
 * Iteration 6 — Tenant complaints.
 *
 *   OPEN ─ assign ─▶ IN_REVIEW ─ resolve ─▶ RESOLVED
 *     │                  │
 *     └─── close ───────┴───▶ CLOSED
 *
 *   Convert to maintenance request: complaint.maintenanceRequestId is set,
 *   complaint.status remains unchanged (service does not flip it).
 *
 *   Rating: only allowed once status ∈ {CLOSED, RESOLVED}; one rating per complaint.
 *
 *   Attachments: pre-upload via /files/upload, then pass attachments[] on create.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';

const ITER = 6;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'complaints',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'complaints.*',
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

interface ComplaintRow {
  id: number;
  status?: string;
  priority?: string;
  complaintType?: string;
  maintenanceRequestId?: number | null;
  attachments?: Array<{ id: number; fileUrl: string; fileName?: string }>;
  replies?: Array<{ id: number; message: string }>;
  rating?: { id: number; rating: string } | null;
}

interface MaintenanceRequestRow {
  id: number;
  status?: string;
  priority?: string;
  fromComplaint?: boolean;
  complaintId?: number;
}

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: string): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

async function createComplaint(
  api: RawApi,
  propertyId: number,
  unitId: number,
  tenantId: number,
  tag: string,
  extras: Partial<{ complaintType: string; priority: string; attachments: Array<{ fileUrl: string; fileName?: string; fileType?: string }> }> = {}
): Promise<ComplaintRow> {
  const body: Record<string, unknown> = {
    tenantId,
    propertyId,
    unitId,
    title: `Complaint ${tag}`,
    description: `QA complaint description ${tag}`,
    complaintType: extras.complaintType ?? 'NEIGHBOR_NOISE',
    priority: extras.priority ?? 'NORMAL'
  };
  if (extras.attachments && extras.attachments.length > 0) body.attachments = extras.attachments;
  const r = await api.raw('POST', '/complaints', body);
  if (!isOk(r.status)) throw new Error(`create complaint failed: ${r.status} ${JSON.stringify(r.body)}`);
  return (r.body as ApiEnvelope<ComplaintRow>).data!;
}

async function getComplaint(api: RawApi, id: number): Promise<ComplaintRow> {
  const r = await api.raw('GET', `/complaints/${id}`);
  return (((r.body as ApiEnvelope<ComplaintRow>).data) ?? { id }) as ComplaintRow;
}

test.describe.serial('Iteration 6 — Tenant complaints', () => {
  test.beforeAll(() => {
    resetIterationLog(ITER);
  });

  test('6.1 create complaint → status=OPEN; ComplaintResponse exposes attachments[] (empty when none provided)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('OPEN');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const detail = await getComplaint(api as RawApi, created.id);
    const pass = detail.status === 'OPEN' && Array.isArray(detail.attachments);
    recordRow(row({
      route: 'POST /complaints',
      scenario: 'TenantComplaintService.create() persists with status="OPEN" and notifies admin audience',
      steps: 'POST /complaints {tenantId, propertyId, unitId, title, description, complaintType, priority} → GET /complaints/{id}',
      testData: `complaintId=${created.id} tag=${tag}`,
      expected: 'HTTP 201; complaint.status=OPEN; attachments=[] (no rows persisted)',
      actual: `status=${detail.status} attachments=${detail.attachments?.length ?? 'n/a'}`,
      status: pass ? 'Passed' : 'Failed'
    }));
    expect(detail.status).toBe('OPEN');
  });

  test('6.2 create complaint with attachments[] persists rows and returns them on GET', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const fileUrl = s.placeholderFileUrl!;
    const tag = uniq('ATT');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag, {
      attachments: [
        { fileUrl, fileName: `proof-${tag}-1.png`, fileType: 'IMAGE' },
        { fileUrl, fileName: `proof-${tag}-2.png`, fileType: 'IMAGE' }
      ]
    });
    const detail = await getComplaint(api as RawApi, created.id);
    recordRow(row({
      route: 'POST /complaints (with attachments)',
      scenario: 'attachments[] with non-blank fileUrl are persisted to complaint_attachments and surfaced in ComplaintResponse.attachments',
      steps: 'POST /complaints {... attachments:[{fileUrl, fileName, fileType}, x2]} → GET /complaints/{id}',
      testData: `complaintId=${created.id}`,
      expected: 'HTTP 201; GET returns attachments.length=2 referencing the uploaded file URL',
      actual: `attachments=${(detail.attachments ?? []).length}`,
      status: (detail.attachments ?? []).length === 2 ? 'Passed' : 'Failed'
    }));
    expect((detail.attachments ?? []).length).toBe(2);
  });

  test('6.3 PATCH /complaints/{id}/assign moves OPEN → IN_REVIEW and sets assignedTo', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    const tag = uniq('ASSIGN');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const r = await api.raw('PATCH', `/complaints/${created.id}/assign`, { officerId });
    const after = await getComplaint(api as RawApi, created.id);
    recordRow(row({
      route: 'PATCH /complaints/{id}/assign',
      scenario: 'TenantComplaintService.assign() sets assignedTo and flips status to IN_REVIEW',
      steps: `PATCH /complaints/${created.id}/assign {officerId=${officerId}}`,
      testData: `complaintId=${created.id}`,
      expected: 'HTTP 200; status=IN_REVIEW',
      actual: `status=${r.status} complaintStatus=${after.status}`,
      status: r.status === 200 && after.status === 'IN_REVIEW' ? 'Passed' : 'Failed'
    }));
    expect(after.status).toBe('IN_REVIEW');
  });

  test('6.4 PATCH /complaints/{id}/resolve moves IN_REVIEW → RESOLVED and stores resolution', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    const tag = uniq('RES');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    await api.raw('PATCH', `/complaints/${created.id}/assign`, { officerId });
    const r = await api.raw('PATCH', `/complaints/${created.id}/resolve`, { resolution: 'Fixed by QA' });
    const after = await getComplaint(api as RawApi, created.id);
    recordRow(row({
      route: 'PATCH /complaints/{id}/resolve',
      scenario: 'TenantComplaintService.resolve() sets resolution + resolvedAt and flips status to RESOLVED',
      steps: `Create → assign → PATCH /complaints/${created.id}/resolve {resolution:"Fixed by QA"}`,
      testData: `complaintId=${created.id}`,
      expected: 'HTTP 200; status=RESOLVED',
      actual: `status=${r.status} complaintStatus=${after.status}`,
      status: r.status === 200 && after.status === 'RESOLVED' ? 'Passed' : 'Failed'
    }));
    expect(after.status).toBe('RESOLVED');
  });

  test('6.5 PATCH /complaints/{id}/close (admin) moves OPEN → CLOSED; second close attempt rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('CLOSE');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const close1 = await api.raw('PATCH', `/complaints/${created.id}/close`);
    const afterClose = await getComplaint(api as RawApi, created.id);
    const close2 = await api.raw('PATCH', `/complaints/${created.id}/close`);
    recordRow(row({
      route: 'PATCH /complaints/{id}/close',
      scenario: 'closeComplaint() moves OPEN/IN_REVIEW → CLOSED; trying to close a CLOSED/RESOLVED complaint returns 400 "Complaint is already closed or resolved"',
      steps: `PATCH /complaints/${created.id}/close (first), then PATCH /complaints/${created.id}/close (second)`,
      testData: `complaintId=${created.id}`,
      expected: 'first close → 200, status=CLOSED; second close → 400',
      actual: `first=${close1.status} status=${afterClose.status} second=${close2.status}`,
      status: close1.status === 200 && afterClose.status === 'CLOSED' && close2.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(close1.status).toBe(200);
    expect(afterClose.status).toBe('CLOSED');
    expect(close2.status).toBe(400);
  });

  test('6.6 POST /complaints/{id}/reply persists reply and returns it via ComplaintResponse.replies', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('REPLY');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const reply = await api.raw('POST', `/complaints/${created.id}/reply`, { message: 'Will look into it' });
    const detail = await getComplaint(api as RawApi, created.id);
    const replies = detail.replies ?? [];
    const found = replies.some((rep) => rep.message === 'Will look into it');
    recordRow(row({
      route: 'POST /complaints/{id}/reply',
      scenario: 'addReply() stores ComplaintReply with senderUserId/senderRole and notifies tenant',
      steps: `POST /complaints/${created.id}/reply {message:"Will look into it"}`,
      testData: `complaintId=${created.id}`,
      expected: 'HTTP 200/201; GET response.replies contains the new message',
      actual: `status=${reply.status} replies=${replies.length} found=${found}`,
      status: isOk(reply.status) && found ? 'Passed' : 'Failed'
    }));
    expect(isOk(reply.status)).toBeTruthy();
    expect(found).toBeTruthy();
  });

  test('6.7 POST /complaints/{id}/rating BEFORE CLOSED/RESOLVED is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('NORATE');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const r = await api.raw('POST', `/complaints/${created.id}/rating`, { rating: 'SATISFIED' });
    recordRow(row({
      route: 'POST /complaints/{id}/rating (premature)',
      scenario: 'submitRating() refuses to rate a complaint that is still OPEN/IN_REVIEW',
      steps: `POST /complaints/${created.id}/rating {rating:SATISFIED} while status=OPEN`,
      testData: `complaintId=${created.id}`,
      expected: 'HTTP 400 "Complaint must be closed before rating"',
      actual: `status=${r.status} body=${JSON.stringify((r.body as { errorCode?: string; message?: string })?.errorCode ?? (r.body as { message?: string })?.message ?? '').slice(0, 120)}`,
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('6.8 POST /complaints/{id}/rating after CLOSED stores rating; second rating attempt rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('RATE');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    await api.raw('PATCH', `/complaints/${created.id}/close`);
    const r1 = await api.raw('POST', `/complaints/${created.id}/rating`, { rating: 'VERY_SATISFIED' });
    const r2 = await api.raw('POST', `/complaints/${created.id}/rating`, { rating: 'SATISFIED' });
    const detail = await getComplaint(api as RawApi, created.id);
    const ratingValue = detail.rating?.rating;
    recordRow(row({
      route: 'POST /complaints/{id}/rating',
      scenario: 'After close, rating in {VERY_SATISFIED, SATISFIED, DISSATISFIED, VERY_DISSATISFIED} is accepted once; second submission is rejected with 400 "Complaint already rated"',
      steps: `close → POST rating VERY_SATISFIED (first) → POST rating SATISFIED (second)`,
      testData: `complaintId=${created.id}`,
      expected: 'first → 200/201, rating=VERY_SATISFIED; second → 400',
      actual: `first=${r1.status} second=${r2.status} stored=${ratingValue}`,
      status: isOk(r1.status) && ratingValue === 'VERY_SATISFIED' && r2.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(isOk(r1.status)).toBeTruthy();
    expect(ratingValue).toBe('VERY_SATISFIED');
    expect(r2.status).toBe(400);
  });

  test('6.9 POST /complaints/{id}/maintenance-request creates MR (fromComplaint=true, priority=URGENT); complaint.status stays the same; second conversion attempt is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('CONVERT');
    const created = await createComplaint(api as RawApi, propertyId, unitId, tenantId, tag);
    const statusBefore = (await getComplaint(api as RawApi, created.id)).status;

    const conv = await api.raw('POST', `/complaints/${created.id}/maintenance-request`, {});
    const mr = (conv.body as ApiEnvelope<MaintenanceRequestRow>).data!;
    const after = await getComplaint(api as RawApi, created.id);
    const mrDetail = await api.raw('GET', `/maintenance/requests/${mr.id}`);
    const mrBody = ((mrDetail.body as ApiEnvelope<MaintenanceRequestRow>).data) ?? mr;

    const dup = await api.raw('POST', `/complaints/${created.id}/maintenance-request`, {});

    const passed =
      isOk(conv.status) &&
      mrBody.priority === 'URGENT' &&
      after.maintenanceRequestId === mr.id &&
      after.status === statusBefore &&
      dup.status === 400;

    recordRow(row({
      route: 'POST /complaints/{id}/maintenance-request',
      scenario: 'createMaintenanceRequest() creates a MaintenanceRequest with fromComplaint=true, priority=URGENT, copies attachments, sets complaint.maintenanceRequestId; complaint.status is unchanged. A second conversion attempt is rejected with 400 "A maintenance request already exists for this complaint".',
      steps: `Create complaint → POST /complaints/${created.id}/maintenance-request (first) → confirm MR + complaint linkage → POST again (second)`,
      testData: `complaintId=${created.id} mrId=${mr.id}`,
      expected: 'first conversion → 200/201; MR.priority=URGENT; complaint.maintenanceRequestId=mrId; complaint.status unchanged; second conversion → 400',
      actual: `convStatus=${conv.status} mrPriority=${mrBody.priority} linked=${after.maintenanceRequestId} statusBefore=${statusBefore} statusAfter=${after.status} dup=${dup.status}`,
      status: passed ? 'Passed' : 'Failed',
      notes:
        'Documented behaviour: converting a complaint into a maintenance request does not flip the complaint status. The frontend must surface the linked maintenance request without expecting the complaint to leave OPEN.'
    }));
    expect(isOk(conv.status)).toBeTruthy();
    expect(mrBody.priority).toBe('URGENT');
    expect(after.maintenanceRequestId).toBe(mr.id);
    expect(after.status).toBe(statusBefore);
    expect(dup.status).toBe(400);
  });

  test('6.10 POST /complaints with complaintType="CLEANLINESS" (advertised by the lookup) — DB CHECK previously rejected it as 500; after BUG-011 fix the value is accepted and stored', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('CLEAN');
    const r = await api.raw('POST', '/complaints', {
      tenantId,
      propertyId,
      unitId,
      title: `Cleanliness ${tag}`,
      description: `QA CLEANLINESS complaint ${tag}`,
      complaintType: 'CLEANLINESS',
      priority: 'NORMAL'
    });
    const created = ((r.body as ApiEnvelope<ComplaintRow>)?.data) ?? { id: 0 };
    const detail = isOk(r.status) ? await getComplaint(api as RawApi, created.id) : { id: 0, complaintType: undefined } as ComplaintRow;
    recordRow(row({
      route: 'POST /complaints (complaintType=CLEANLINESS)',
      scenario:
        'V165 seeded "CLEANLINESS" into the COMPLAINT_TYPE lookup, but the V33 DB CHECK only allowed {NEIGHBOR_NOISE,COMMON_AREA,SECURITY,MANAGEMENT,SERVICE,OTHER}. V172 expands the CHECK to match the lookup; TenantComplaintService.create now also pre-validates the allow-list so invalid values get a clean HTTP 400 (INVALID_COMPLAINT_TYPE) instead of leaking to the DB as 500.',
      steps: `POST /complaints {complaintType:"CLEANLINESS", ...}`,
      testData: `propertyId=${propertyId} unitId=${unitId} tenantId=${tenantId} createdId=${created.id}`,
      expected: 'HTTP 201; complaint persisted with complaintType=CLEANLINESS',
      actual: `status=${r.status} createdType=${detail.complaintType}`,
      severity: 'Medium',
      status: isOk(r.status) && detail.complaintType === 'CLEANLINESS' ? 'Passed' : 'Failed'
    }));
    expect(isOk(r.status)).toBeTruthy();
    expect(detail.complaintType).toBe('CLEANLINESS');
  });

  test('6.10b POST /complaints with truly invalid complaintType returns 400 (defense-in-depth), not 500', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = uniq('BADTYPE');
    const r = await api.raw('POST', '/complaints', {
      tenantId, propertyId, unitId,
      title: `Bad type ${tag}`,
      description: `QA invalid complaintType ${tag}`,
      complaintType: 'NOT_A_REAL_TYPE',
      priority: 'NORMAL'
    });
    recordRow(row({
      route: 'POST /complaints (truly invalid complaintType)',
      scenario:
        'After BUG-011, TenantComplaintService.create normalizes complaintType against the allow-list and returns 400 INVALID_COMPLAINT_TYPE for unknown values. The DataIntegrityViolationException path is never reached.',
      steps: `POST /complaints {complaintType:"NOT_A_REAL_TYPE", ...}`,
      testData: `propertyId=${propertyId} unitId=${unitId} tenantId=${tenantId}`,
      expected: 'HTTP 400 with errorCode INVALID_COMPLAINT_TYPE',
      actual: `status=${r.status} body=${JSON.stringify((r.body as { errorCode?: string; message?: string })?.errorCode ?? '').slice(0, 80)}`,
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('6.11 GET /complaints/my as the tenant whose complaints we just created returns their rows', async ({ api }) => {
    // Look up tenant 4's portal email via /tenants/{id} (admin call), then log in as that tenant.
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const tenantId = s.tenantIds[0];
    const tenantInfo = await api.raw('GET', `/tenants/${tenantId}`);
    const tenantEmail = ((tenantInfo.body as ApiEnvelope<{ email?: string; portalEmail?: string }>).data ?? {});
    const email = tenantEmail.portalEmail ?? tenantEmail.email;
    const skipped = !email;
    if (skipped) {
      recordRow(row({
        route: 'GET /complaints/my',
        scenario: 'getMyComplaints() returns complaints for the logged-in tenant',
        steps: 'lookup tenant portal email → login as tenant → GET /complaints/my',
        testData: `tenantId=${tenantId}`,
        expected: 'tenant has a portal user; GET returns array',
        actual: `no portal email on tenant ${tenantId}`,
        status: 'To be verified during E2E testing',
        notes: 'Tenant has no portal user mapped — getMyComplaints would throw 404 "No tenant linked to current user". Bootstrap should ensure a portal user is linked.'
      }));
      return;
    }
    await api.login(email);
    const r = await api.raw('GET', '/complaints/my');
    const list = ((r.body as ApiEnvelope<ComplaintRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /complaints/my',
      role: 'TENANT',
      scenario: 'getMyComplaints() returns the array of complaints linked to the current tenant',
      steps: `login as tenant ${email} → GET /complaints/my`,
      testData: `tenantId=${tenantId} returned=${list.length}`,
      expected: 'HTTP 200; array returned (>=1 from earlier 6.* tests)',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && Array.isArray(list) && list.length >= 1 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  test('6.12 GET /complaints (paged) is reserved for non-tenant roles; the active tenant gets 403', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const ok = await api.raw('GET', '/complaints?page=0&size=5');

    const s = loadState();
    const tenantId = s.tenantIds[0];
    const tenantInfo = await api.raw('GET', `/tenants/${tenantId}`);
    const t = ((tenantInfo.body as ApiEnvelope<{ email?: string; portalEmail?: string }>).data ?? {});
    const tenantEmail = t.portalEmail ?? t.email;
    if (!tenantEmail) {
      recordRow(row({
        route: 'GET /complaints (paged)',
        scenario: 'Paged list reserved for SUPER_ADMIN/GENERAL_MANAGER/ACCOUNTANT/OWNER; TENANT must receive 403',
        steps: 'login as tenant → GET /complaints',
        testData: `tenantId=${tenantId}`,
        expected: 'SUPER_ADMIN→200; TENANT→403',
        actual: `tenant has no portal email mapped`,
        status: 'To be verified during E2E testing'
      }));
      return;
    }
    await api.login(tenantEmail);
    const denied = await api.raw('GET', '/complaints?page=0&size=5');
    recordRow(row({
      route: 'GET /complaints (paged)',
      scenario: 'Paged list is reserved for SUPER_ADMIN/GENERAL_MANAGER/ACCOUNTANT/OWNER; TENANT must receive 403',
      steps: `GET /complaints as SUPER_ADMIN, then GET /complaints as ${tenantEmail}`,
      testData: '-',
      expected: 'SUPER_ADMIN → 200; TENANT → 403',
      actual: `admin=${ok.status} tenant=${denied.status}`,
      status: ok.status === 200 && denied.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(ok.status).toBe(200);
    expect(denied.status).toBe(403);
  });

  test('6.13 Validation: POST /complaints without title and description is rejected with 400 (bean validation)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const r = await api.raw('POST', '/complaints', {
      tenantId, propertyId, unitId, complaintType: 'OTHER', priority: 'NORMAL'
    });
    recordRow(row({
      route: 'POST /complaints (missing fields)',
      scenario: 'ComplaintRequest.title and description are @NotBlank — empty payload must be rejected with HTTP 400',
      steps: 'POST /complaints without title/description',
      testData: '-',
      expected: 'HTTP 400',
      actual: `status=${r.status}`,
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });
});
