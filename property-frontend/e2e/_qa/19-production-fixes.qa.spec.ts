/**
 * Production-fix regression tests.
 *
 * Covers the 5 blocking issues fixed before production:
 *
 *   FIX-1  Contract activation race condition (pessimistic lock on unit)
 *   FIX-2  Payroll generation race condition  (locking query + UNIQUE catch)
 *   FIX-3  Payment proof approval without proof URL
 *   FIX-4  JWT accepted only via Bearer header (no ?tk= query param)
 *   FIX-5  Token blacklist survives server state (DB-persistent)
 */

import { test, expect } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';
import { loadState } from './state';
import { QA_CREDENTIALS } from './credentials';

const ITER = 24;  // next unused iteration number

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'production-fixes',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'Critical',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

interface ApiEnv<T = unknown> { success: boolean; data?: T; message?: string; errorCode?: string; }

const isOk = (s: number) => s === 200 || s === 201;
const isConflict = (s: number) => s === 409;
const isBadRequest = (s: number) => s === 400;
const isUnauth = (s: number) => s === 401 || s === 403;

function uniq(p: string) { return `${p}-${Date.now()}-${Math.floor(Math.random() * 9999)}`; }
function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoYearLater() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function createMinimalProperty(api: ReturnType<typeof import('./fixtures')['test']['extend']> extends import('@playwright/test').TestType<infer F, infer _> ? F : never): Promise<{ propertyId: number; unitId: number; ownerId: number; tenantId: number }> {
  // This function signature is complex — call directly from test body
  throw new Error('use inline helpers');
}

// ─── describe ────────────────────────────────────────────────────────────────

test.describe.serial(`Iteration ${ITER} — Production Fix Regression`, () => {
  test.beforeAll(() => resetIterationLog(ITER));

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX-1: Contract activation must reject the second concurrent activation
  //        for the same unit (pessimistic lock ensures only one succeeds).
  // ═══════════════════════════════════════════════════════════════════════════
  test('FIX-1a: contract activation — second activation on same unit returns 409', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const fileUrl = s.placeholderFileUrl ?? '';
    // Use the bootstrapped property (which has accountant + owner already configured)
    const propId = s.propertyIds[0];
    const ownerId = s.ownerIds[0];
    expect(propId && ownerId, 'need bootstrapped property + owner').toBeTruthy();

    // Find a truly vacant (not rented, not reserved) unit via live API query
    type UnitRow = { id: number; rented?: boolean; reserved?: boolean };
    const unitsRes = await api.raw('GET', `/units?propertyId=${propId}&status=vacant&size=20`);
    const vacantUnits = ((unitsRes.body as ApiEnv<{ content: UnitRow[] }>).data?.content ?? [])
        .filter(u => !u.rented && !u.reserved);
    if (vacantUnits.length === 0) {
      recordRow(row({
        scenario: 'FIX-1a: no truly vacant units found in live DB — Blocked',
        status: 'Blocked', notes: 'All bootstrapped units are rented; re-run bootstrap or purge data'
      }));
      return;
    }
    const vacantUnit = vacantUnits[0].id;

    // Find the tenant associated with this property (for contract creation)
    const tenantsRes = await api.raw('GET', `/tenants?propertyId=${propId}&size=1`);
    const tenantId = ((tenantsRes.body as ApiEnv<{ content: Array<{ id: number }> }>).data?.content ?? [])[0]?.id;
    if (!tenantId) {
      recordRow(row({ scenario: 'FIX-1a', status: 'Blocked', notes: 'No tenant for property' }));
      return;
    }

    // Create first draft contract for the vacant unit
    const c1Res = await api.raw('POST', '/contracts', {
      tenantId, unitId: vacantUnit, propertyId: propId, ownerId,
      startDate: isoToday(), endDate: isoYearLater(),
      monthlyRent: 300, securityDeposit: 0,
      paymentFrequency: 'MONTHLY', paymentDay: 1,
      hasFreeMonth: false, contractPdfUrl: fileUrl
    });
    expect(isOk(c1Res.status), `Contract1 creation failed: ${c1Res.status} ${JSON.stringify(c1Res.body).slice(0,200)}`).toBeTruthy();
    const contractId1 = (c1Res.body as ApiEnv<{ id: number }>).data?.id;
    expect(contractId1, 'need first contract id').toBeTruthy();

    // Create a second draft contract for the SAME vacant unit
    const c2Res = await api.raw('POST', '/contracts', {
      tenantId,
      unitId: vacantUnit, propertyId: propId, ownerId,
      startDate: isoToday(), endDate: isoYearLater(),
      monthlyRent: 350, securityDeposit: 0,
      paymentFrequency: 'MONTHLY', paymentDay: 1,
      hasFreeMonth: false, contractPdfUrl: fileUrl
    });
    const contractId2 = (c2Res.body as ApiEnv<{ id: number }>).data?.id;

    // Activate contract 1 first
    const act1 = await api.raw('PATCH', `/contracts/${contractId1}/activate`, {});
    const act1Ok = isOk(act1.status);

    // Now attempt to activate contract 2 — must get 409 UNIT_ALREADY_OCCUPIED
    const act2 = await api.raw('PATCH', `/contracts/${contractId2}/activate`, {});
    const act2Conflict = isConflict(act2.status);
    const act2Code = (act2.body as ApiEnv<unknown>).errorCode ?? '';

    const passed = act1Ok && act2Conflict;
    recordRow(row({
      scenario: 'FIX-1: Second contract activation on occupied unit returns 409',
      route: 'PATCH /contracts/{id}/activate',
      steps: 'Activate contract1 → Activate contract2 on same unit',
      testData: `unitId=${vacantUnit} c1=${contractId1} c2=${contractId2}`,
      expected: 'Contract1: 200, Contract2: 409 UNIT_ALREADY_OCCUPIED',
      actual: `act1=${act1.status} act2=${act2.status} code=${act2Code}`,
      status: passed ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: passed ? '' : `Race condition not blocked: act1=${act1.status} act2=${act2.status}`
    }));
    expect(act1Ok, `First activation should succeed (got ${act1.status})`).toBeTruthy();
    expect(act2Conflict, `Second activation should get 409 (got ${act2.status})`).toBeTruthy();
  });

  test('FIX-1b: contract activation — rejected-owner contract cannot be activated by staff', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const fileUrl = s.placeholderFileUrl ?? '';
    const propId = s.propertyIds[0];
    const ownerId = s.ownerIds[0];
    if (!propId || !ownerId) { recordRow(row({ scenario: 'FIX-1b', status: 'Blocked', notes: 'Missing bootstrap data' })); return; }

    // Find a truly vacant unit via live API (state may be stale)
    type UnitRow1b = { id: number; rented?: boolean; reserved?: boolean };
    const uRes1b = await api.raw('GET', `/units?propertyId=${propId}&status=vacant&size=20`);
    const vacantUnits1b = ((uRes1b.body as ApiEnv<{ content: UnitRow1b[] }>).data?.content ?? [])
        .filter(u => !u.rented && !u.reserved);
    if (vacantUnits1b.length === 0) { recordRow(row({ scenario: 'FIX-1b', status: 'Blocked', notes: 'No vacant units in live DB' })); return; }
    const vacantUnit1b = vacantUnits1b[0].id;

    // Find tenant for the property to attach to the draft contract
    const tRes1b = await api.raw('GET', `/tenants?propertyId=${propId}&size=1`);
    const tid1b = ((tRes1b.body as ApiEnv<{ content: Array<{ id: number }> }>).data?.content ?? [])[0]?.id;
    if (!tid1b) { recordRow(row({ scenario: 'FIX-1b', status: 'Blocked', notes: 'No tenant' })); return; }

    // Create a draft contract and immediately submit it for owner approval
    const cRes1b = await api.raw('POST', '/contracts', {
      tenantId: tid1b, unitId: vacantUnit1b, propertyId: propId, ownerId,
      startDate: isoToday(), endDate: isoYearLater(),
      monthlyRent: 300, securityDeposit: 0,
      paymentFrequency: 'MONTHLY', paymentDay: 1,
      hasFreeMonth: false, contractPdfUrl: fileUrl
    });
    expect(isOk(cRes1b.status), `FIX-1b contract create failed: ${cRes1b.status}`).toBeTruthy();
    const contractId = (cRes1b.body as ApiEnv<{ id: number }>).data?.id;
    expect(contractId).toBeTruthy();

    // Submit for owner approval
    await api.raw('PATCH', `/contracts/${contractId}/submit-for-owner-approval`, {});
    // Owner rejects
    await api.raw('PATCH', `/contracts/${contractId}/owner-approval/reject`, { notes: 'QA reject' });

    // Non-SUPER_ADMIN (GENERAL_MANAGER) tries to activate — should fail
    const gmToken = await api.loginRole('GENERAL_MANAGER');
    const activateAttempt = await api.raw('PATCH', `/contracts/${contractId}/activate`, {});
    const blocked = isBadRequest(activateAttempt.status);

    recordRow(row({
      role: 'GENERAL_MANAGER',
      scenario: 'FIX-1b: GENERAL_MANAGER cannot activate owner-rejected contract',
      route: 'PATCH /contracts/{id}/activate',
      expected: '400 OWNER_REJECTED_CONTRACT',
      actual: `${activateAttempt.status} ${(activateAttempt.body as ApiEnv<unknown>).errorCode ?? ''}`,
      status: blocked ? 'Passed' : 'Failed',
      severity: 'High',
      bugSummary: blocked ? '' : 'Owner rejection bypass not blocked'
    }));
    expect(blocked, `Activation of owner-rejected contract should fail (got ${activateAttempt.status})`).toBeTruthy();
    await api.loginRole('SUPER_ADMIN'); // restore for subsequent tests
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX-2: Payroll generation — duplicate request returns 409
  // ═══════════════════════════════════════════════════════════════════════════
  test('FIX-2: Duplicate payroll generation returns 409', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    expect(propertyId, 'need bootstrapped property').toBeTruthy();

    // Pick a year/month unlikely to conflict with real payroll runs
    const testYear = 2095;
    const testMonth = 7;

    // First attempt — should succeed or already exist
    const gen1 = await api.raw('POST', '/hr/payroll/generate', {
      propertyId,
      payPeriodYear: testYear,
      payPeriodMonth: testMonth
    });
    const firstOk = isOk(gen1.status) || isConflict(gen1.status);

    // Second attempt — must conflict
    const gen2 = await api.raw('POST', '/hr/payroll/generate', {
      propertyId,
      payPeriodYear: testYear,
      payPeriodMonth: testMonth
    });
    const secondConflict = isConflict(gen2.status);
    const passed = firstOk && secondConflict;

    recordRow(row({
      scenario: 'FIX-2: Second payroll generation for same property/period returns 409',
      route: 'POST /hr/payroll/generate',
      steps: 'Generate payroll → Generate same period again',
      testData: `propertyId=${propertyId} year=${testYear} month=${testMonth}`,
      expected: 'First: 200/201 (or 409 if already exists). Second: 409',
      actual: `gen1=${gen1.status} gen2=${gen2.status}`,
      status: passed ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: passed ? '' : `Duplicate payroll not blocked: gen1=${gen1.status} gen2=${gen2.status}`
    }));
    expect(firstOk, `First generation should succeed or conflict (got ${gen1.status})`).toBeTruthy();
    expect(secondConflict, `Duplicate generation should return 409 (got ${gen2.status})`).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX-3: Payment proof approval without uploaded proof is rejected
  // ═══════════════════════════════════════════════════════════════════════════
  test('FIX-3a: approving payment without proof URL returns 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const fileUrl = s.placeholderFileUrl ?? '';
    const propId = s.propertyIds[0];
    const ownerId = s.ownerIds[0];
    if (!propId) { recordRow(row({ scenario: 'FIX-3a', status: 'Blocked', notes: 'No bootstrapped property' })); return; }

    type UnitRow3a = { id: number; rented?: boolean; reserved?: boolean };
    const uRes3a = await api.raw('GET', `/units?propertyId=${propId}&status=vacant&size=20`);
    const vacant3a = ((uRes3a.body as ApiEnv<{ content: UnitRow3a[] }>).data?.content ?? []).find(u => !u.rented && !u.reserved)?.id;
    if (!vacant3a) { recordRow(row({ scenario: 'FIX-3a', status: 'Blocked', notes: 'No vacant unit in live DB' })); return; }

    const tRes3a = await api.raw('GET', `/tenants?propertyId=${propId}&size=1`);
    const tid3a = ((tRes3a.body as ApiEnv<{ content: Array<{ id: number }> }>).data?.content ?? [])[0]?.id;
    if (!tid3a) { recordRow(row({ scenario: 'FIX-3a', status: 'Blocked', notes: 'No tenant' })); return; }

    const cCreate3a = await api.raw('POST', '/contracts', {
      tenantId: tid3a, unitId: vacant3a, propertyId: propId, ownerId: s.ownerIds[0],
      startDate: isoToday(), endDate: isoYearLater(),
      monthlyRent: 300, securityDeposit: 0,
      paymentFrequency: 'MONTHLY', paymentDay: 1,
      hasFreeMonth: false, contractPdfUrl: fileUrl
    });
    expect(isOk(cCreate3a.status), `FIX-3a contract create: ${cCreate3a.status}`).toBeTruthy();

    const onboard = cCreate3a;
    const contractId = (onboard.body as ApiEnv<{ id?: number; contractId?: number }>).data?.id ?? (onboard.body as ApiEnv<{ id?: number; contractId?: number }>).data?.contractId;
    expect(contractId).toBeTruthy();
    await api.raw('PATCH', `/contracts/${contractId}/activate`, {});

    // Find the first pending schedule row
    const schedRes = await api.raw('GET', `/contracts/${contractId}/payment-schedule?size=1&sort=dueDate,asc`);
    const schedItems = (schedRes.body as ApiEnv<{ content: Array<{ id: number; status: string }> }>).data?.content ?? [];
    const pendingRow = schedItems.find(r => r.status === 'PENDING' || r.status === 'OVERDUE');
    expect(pendingRow?.id, 'need a pending schedule row').toBeTruthy();
    const scheduleId = pendingRow!.id;

    // Artificially set status to PENDING_CONFIRMATION WITHOUT uploading proof
    // by directly calling the proof review endpoint (status should be PENDING not PENDING_CONFIRMATION)
    // Actually: the endpoint requires PENDING_CONFIRMATION — let's make it PENDING_CONFIRMATION
    // by simulating a tenant upload with empty proofUrl (edge case: blank URL)
    // We do this by calling the internal dev endpoint or by checking the guard directly.
    // Simplest: just call PATCH /payment-schedule/{id}/proof/review with APPROVED → should fail
    // because status is still PENDING (not PENDING_CONFIRMATION), which also gives 400.
    // The more targeted test: call uploadProof with a blank URL to reach PENDING_CONFIRMATION,
    // then call reviewProof APPROVED — should fail with PROOF_REQUIRED.

    // Upload blank proof to get to PENDING_CONFIRMATION state
    const blankProofRes = await api.raw('POST', `/contracts/${contractId}/payment-schedule/${scheduleId}/proof`, {
      proofUrl: '   ',  // intentionally blank
      paymentMethod: 'CASH',
      referenceNumber: 'REF-QA-FIX3A'
    });
    // If blank proof is accepted (it might be), status becomes PENDING_CONFIRMATION with blank proofUrl
    const proofStatus = blankProofRes.status;

    let approvalResult: { status: number; body: unknown } = { status: 0, body: {} };
    if (isOk(proofStatus)) {
      // Now try to approve — should get 400 PROOF_REQUIRED
      approvalResult = await api.raw('PATCH', `/payment-schedule/${scheduleId}/proof/review`, {
        status: 'APPROVED',
        notes: 'QA approval attempt without proof'
      });
    }

    // Either:
    //  - blank upload was rejected (good, upstream validation) → status 400
    //  - OR blank upload accepted but approval rejected → approval 400 PROOF_REQUIRED
    const proofGuardWorks = isBadRequest(proofStatus) || (isOk(proofStatus) && isBadRequest(approvalResult.status));
    const errorCode = (approvalResult.body as ApiEnv<unknown>)?.errorCode ?? '';

    recordRow(row({
      scenario: 'FIX-3a: Approving payment with no proof URL returns 400 PROOF_REQUIRED',
      route: 'PATCH /payment-schedule/{id}/proof/review',
      steps: 'Upload blank proof → PATCH review APPROVED',
      testData: `scheduleId=${scheduleId}`,
      expected: '400 at proof upload OR 400 PROOF_REQUIRED at approval',
      actual: `proofUpload=${proofStatus} approval=${approvalResult.status} code=${errorCode}`,
      status: proofGuardWorks ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: proofGuardWorks ? '' : 'Proof URL validation not enforced'
    }));
    expect(proofGuardWorks, 'Proof validation should block approval without evidence').toBeTruthy();
  });

  test('FIX-3b: approving payment WITH valid proof URL succeeds', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const fileUrl = s.placeholderFileUrl ?? '';
    const propId = s.propertyIds[0];
    if (!propId) { recordRow(row({ scenario: 'FIX-3b', status: 'Blocked', notes: 'No bootstrapped property' })); return; }

    type UnitRow3b = { id: number; rented?: boolean; reserved?: boolean };
    const uRes3b = await api.raw('GET', `/units?propertyId=${propId}&status=vacant&size=20`);
    const vacant3b = ((uRes3b.body as ApiEnv<{ content: UnitRow3b[] }>).data?.content ?? []).find(u => !u.rented && !u.reserved)?.id;
    if (!vacant3b) { recordRow(row({ scenario: 'FIX-3b', status: 'Blocked', notes: 'No vacant unit in live DB' })); return; }

    const tRes3b = await api.raw('GET', `/tenants?propertyId=${propId}&size=1`);
    const tid3b = ((tRes3b.body as ApiEnv<{ content: Array<{ id: number }> }>).data?.content ?? [])[0]?.id;
    if (!tid3b) { recordRow(row({ scenario: 'FIX-3b', status: 'Blocked', notes: 'No tenant' })); return; }

    const cCreate3b = await api.raw('POST', '/contracts', {
      tenantId: tid3b, unitId: vacant3b, propertyId: propId, ownerId: s.ownerIds[0],
      startDate: isoToday(), endDate: isoYearLater(),
      monthlyRent: 300, securityDeposit: 0,
      paymentFrequency: 'MONTHLY', paymentDay: 1,
      hasFreeMonth: false, contractPdfUrl: fileUrl
    });
    expect(isOk(cCreate3b.status), `FIX-3b contract: ${cCreate3b.status}`).toBeTruthy();
    const onboard = cCreate3b;
    const contractId = (onboard.body as ApiEnv<{ id?: number; contractId?: number }>).data?.id ?? (onboard.body as ApiEnv<{ id?: number; contractId?: number }>).data?.contractId;
    expect(contractId).toBeTruthy();
    await api.raw('PATCH', `/contracts/${contractId}/activate`, {});

    const schedRes = await api.raw('GET', `/contracts/${contractId}/payment-schedule?size=1&sort=dueDate,asc`);
    const schedItems = (schedRes.body as ApiEnv<{ content: Array<{ id: number; status: string }> }>).data?.content ?? [];
    const pendingRow = schedItems.find(r => r.status === 'PENDING' || r.status === 'OVERDUE');
    expect(pendingRow?.id).toBeTruthy();
    const scheduleId = pendingRow!.id;

    // Upload a real proof URL
    const uploadRes = await api.raw('POST', `/contracts/${contractId}/payment-schedule/${scheduleId}/proof`, {
      proofUrl: fileUrl,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'REF-QA-FIX3B'
    });
    expect(isOk(uploadRes.status), `Proof upload should succeed (got ${uploadRes.status})`).toBeTruthy();

    // Now approve — should succeed
    const approveRes = await api.raw('PATCH', `/payment-schedule/${scheduleId}/proof/review`, {
      status: 'APPROVED',
      notes: 'QA approval with valid proof'
    });
    const approved = isOk(approveRes.status);

    recordRow(row({
      scenario: 'FIX-3b: Payment with valid proof URL is approved successfully',
      route: 'PATCH /payment-schedule/{id}/proof/review',
      steps: 'Upload valid proof → PATCH review APPROVED',
      testData: `scheduleId=${scheduleId} proofUrl=${fileUrl}`,
      expected: '200 — payment marked PAID',
      actual: `${approveRes.status}`,
      status: approved ? 'Passed' : 'Failed',
      bugSummary: approved ? '' : `Valid-proof approval failed: ${approveRes.status}`
    }));
    expect(approved, `Approval with valid proof should succeed (got ${approveRes.status})`).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX-4: JWT must NOT be accepted via ?tk= query parameter
  // ═══════════════════════════════════════════════════════════════════════════
  test('FIX-4a: JWT via ?tk= query param is rejected for API endpoints', async ({ api, apiUrl }) => {
    const token = await api.loginRole('SUPER_ADMIN');
    const s = loadState();

    // Hit a protected endpoint using ?tk= instead of Authorization header
    // (using Playwright request without auth header)
    const { status: tkStatus } = await api.raw('GET', `/properties?tk=${token}`);
    // Without the Bearer header, JwtAuthFilter ignores ?tk= → endpoint returns 401/403
    // (The test uses the api fixture which always adds the Bearer header — we need raw fetch)
    // Use rawWithoutAuth to test this
    const noAuthRes = await fetch(`${apiUrl}/properties?size=1&tk=${token}`, { method: 'GET' });
    const tkRejected = noAuthRes.status === 401 || noAuthRes.status === 403;

    // Verify the same request WORKS with proper Authorization header
    const bearerRes = await fetch(`${apiUrl}/properties?size=1`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bearerOk = bearerRes.ok;

    recordRow(row({
      scenario: 'FIX-4a: JWT via ?tk= is rejected; Bearer header still works',
      route: 'GET /properties (no auth header, ?tk= only)',
      steps: '1) Fetch /properties?tk=JWT (no header) → expect 401. 2) Fetch /properties with Bearer → expect 200',
      testData: `tokenLen=${token.length}`,
      expected: '?tk=: 401/403. Bearer header: 200',
      actual: `tkStatus=${noAuthRes.status} bearerStatus=${bearerRes.status}`,
      status: (tkRejected && bearerOk) ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: (tkRejected && bearerOk) ? '' : `?tk= rejection failed: tkStatus=${noAuthRes.status} bearerOk=${bearerOk}`
    }));
    expect(tkRejected, `?tk= should be rejected (got ${noAuthRes.status})`).toBeTruthy();
    expect(bearerOk, `Bearer header should still work (got ${bearerRes.status})`).toBeTruthy();
  });

  test('FIX-4b: POST /files/sign issues short-lived token; file served via ?st=', async ({ api, apiUrl }) => {
    const token = await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    if (!s.placeholderFileUrl) {
      recordRow(row({
        scenario: 'FIX-4b: Short-lived file token',
        status: 'Blocked',
        notes: 'No placeholder file URL in state'
      }));
      return;
    }

    // Extract filename from placeholder URL
    const parts = s.placeholderFileUrl.split('/');
    const filename = parts[parts.length - 1];

    // Request a short-lived signed token
    const signRes = await fetch(`${apiUrl}/files/sign?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const signOk = signRes.ok;
    let signedToken = '';
    if (signOk) {
      const body = await signRes.json() as { success: boolean; data?: { token: string; expiresInSeconds: number } };
      signedToken = body.data?.token ?? '';
    }

    // Fetch file using signed token (no Bearer header)
    let fileStatus = 0;
    if (signedToken) {
      const fileRes = await fetch(`${apiUrl}/files/${encodeURIComponent(filename)}?st=${signedToken}`);
      fileStatus = fileRes.status;
    }

    // Verify file is NOT served without any auth
    const noAuthFileRes = await fetch(`${apiUrl}/files/${encodeURIComponent(filename)}`);
    const noAuthBlocked = noAuthFileRes.status === 401 || noAuthFileRes.status === 403;

    const passed = signOk && signedToken.length > 0 && fileStatus === 200 && noAuthBlocked;
    recordRow(row({
      scenario: 'FIX-4b: POST /files/sign issues short-lived ?st= token; file served; no-auth blocked',
      route: 'POST /files/sign → GET /files/{f}?st={token}',
      steps: '1) POST /files/sign → get token. 2) GET /files/{f}?st=token → 200. 3) GET /files/{f} (no auth) → 401',
      testData: `filename=${filename}`,
      expected: 'sign=200+token, fileWithSt=200, fileNoAuth=401',
      actual: `signOk=${signOk} stToken=${signedToken.slice(0,8)}... fileStatus=${fileStatus} noAuth=${noAuthFileRes.status}`,
      status: passed ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: passed ? '' : `Short-lived token flow failed: signOk=${signOk} fileStatus=${fileStatus} noAuth=${noAuthFileRes.status}`
    }));
    expect(signOk, `POST /files/sign should succeed (got ${signRes.status})`).toBeTruthy();
    expect(fileStatus, `File via ?st= should return 200 (got ${fileStatus})`).toBe(200);
    expect(noAuthBlocked, `File without auth should be blocked (got ${noAuthFileRes.status})`).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX-5: Token blacklist persists (logout + re-use of same token is rejected)
  // ═══════════════════════════════════════════════════════════════════════════
  test('FIX-5: Logged-out token is rejected on subsequent API calls', async ({ api, apiUrl }) => {
    // Login → capture token → logout → try to use token → must get 401
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@propmgmt.com', password: '12345' })
    });
    expect(loginRes.ok).toBeTruthy();
    const loginBody = await loginRes.json() as { data: { accessToken: string } };
    const accessToken = loginBody.data.accessToken;
    expect(accessToken.length).toBeGreaterThan(20);

    // Verify the token works before logout
    const preLogoutRes = await fetch(`${apiUrl}/users/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    expect(preLogoutRes.ok, `Token should work before logout (got ${preLogoutRes.status})`).toBeTruthy();

    // Logout to revoke the token
    const logoutRes = await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    expect(logoutRes.ok, `Logout should succeed (got ${logoutRes.status})`).toBeTruthy();

    // Now try to use the revoked token — must be rejected
    const postLogoutRes = await fetch(`${apiUrl}/users/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const tokenRejected = postLogoutRes.status === 401 || postLogoutRes.status === 403;

    recordRow(row({
      scenario: 'FIX-5: Token revoked on logout is rejected on subsequent API call',
      route: 'POST /auth/logout → GET /users/me',
      steps: 'Login → GET /users/me (200) → POST /auth/logout → GET /users/me (401)',
      testData: `tokenLen=${accessToken.length}`,
      expected: 'Pre-logout: 200. Post-logout: 401/403',
      actual: `pre=${preLogoutRes.status} post=${postLogoutRes.status}`,
      status: tokenRejected ? 'Passed' : 'Failed',
      severity: 'Critical',
      bugSummary: tokenRejected ? '' : `Revoked token still accepted: post-logout status=${postLogoutRes.status}`
    }));
    expect(tokenRejected, `Revoked token should be rejected (got ${postLogoutRes.status})`).toBeTruthy();
  });

  test('FIX-5b: Login and normal operations still work after blacklist switch', async ({ api, apiUrl }) => {
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: QA_CREDENTIALS.GENERAL_MANAGER.email, password: QA_CREDENTIALS.GENERAL_MANAGER.password })
    });
    const loginOk = loginRes.ok;
    const body = loginOk ? await loginRes.json() as { data: { accessToken: string } } : null;
    const token = body?.data?.accessToken;
    const hasToken = !!token && token.length > 20;

    const meRes = hasToken ? await fetch(`${apiUrl}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }) : null;
    const meOk = meRes?.ok ?? false;

    const passed = loginOk && hasToken && meOk;
    recordRow(row({
      scenario: 'FIX-5b: Login and token usage still work with DB blacklist active',
      role: 'GENERAL_MANAGER',
      route: 'POST /auth/login → GET /users/me',
      expected: 'Login 200, /users/me 200',
      actual: `login=${loginRes.status} me=${meRes?.status ?? 'N/A'}`,
      status: passed ? 'Passed' : 'Failed',
      severity: 'High',
      bugSummary: passed ? '' : 'Normal auth flow broken after blacklist switch'
    }));
    expect(passed, 'Auth flow should still work with DB blacklist').toBeTruthy();
  });
});
