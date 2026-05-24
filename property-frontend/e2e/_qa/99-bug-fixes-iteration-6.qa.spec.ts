/**
 * Iteration 6 bug-fix record spec.
 *
 * Permanent QA evidence for fixes shipped in iteration 6.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 6;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'bug-fixes',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: '-',
    steps: '-',
    testData: '-',
    expected: '-',
    actual: '-',
    severity: 'High',
    status: 'Fixed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: '',
    ...p
  };
}

const isOk = (status: number) => status === 200 || status === 201;

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }
interface ComplaintRow { id: number; status?: string; complaintType?: string; }

test.describe.serial('Iteration 6 — Bug fixes (record)', () => {
  test('BUG-011 tenant_complaints.complaint_type CHECK constraint missing the CLEANLINESS value that the lookup table advertises — invalid type leaked to DB as 500', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const tag = `BUG011-${Date.now()}`;

    const validCleanliness = await api.raw('POST', '/complaints', {
      tenantId, propertyId, unitId,
      title: `Cleanliness ${tag}`,
      description: 'BUG-011 retest — CLEANLINESS should now be accepted',
      complaintType: 'CLEANLINESS', priority: 'NORMAL'
    });
    const createdId = (validCleanliness.body as ApiEnvelope<ComplaintRow>).data?.id;
    const detail = createdId
      ? await api.raw('GET', `/complaints/${createdId}`)
      : { status: 0, body: { success: false } as ApiEnvelope<ComplaintRow> };
    const storedType = ((detail.body as ApiEnvelope<ComplaintRow>).data ?? {}).complaintType;

    const invalidGarbage = await api.raw('POST', '/complaints', {
      tenantId, propertyId, unitId,
      title: `Bad type ${tag}`,
      description: 'BUG-011 retest — unknown complaintType should return clean 400',
      complaintType: 'NOT_A_REAL_TYPE', priority: 'NORMAL'
    });

    const ok =
      isOk(validCleanliness.status) &&
      storedType === 'CLEANLINESS' &&
      invalidGarbage.status === 400;

    recordRow(row({
      module: 'complaints',
      route: 'POST /complaints',
      scenario:
        'V165 seeded "CLEANLINESS" into the COMPLAINT_TYPE lookup table, but the V33 DB CHECK on tenant_complaints.complaint_type only allowed {NEIGHBOR_NOISE,COMMON_AREA,SECURITY,MANAGEMENT,SERVICE,OTHER}. The service did not pre-validate the value, so any complaint posted with complaintType=CLEANLINESS (a value the lookup advertises as valid) violated the CHECK and surfaced as DataIntegrityViolationException (HTTP 500).',
      steps:
        'V172__tenant_complaints_allow_cleanliness.sql drops the misaligned CHECK and re-adds it with the full lookup-aligned set {NEIGHBOR_NOISE,COMMON_AREA,CLEANLINESS,SECURITY,MANAGEMENT,SERVICE,OTHER}. TenantComplaintService.create() now also normalizes complaintType/priority against the same allow-list and throws AppException.badRequest("INVALID_COMPLAINT_TYPE" / "INVALID_COMPLAINT_PRIORITY") for unknown values so any future drift surfaces as a clean HTTP 400 instead of leaking to the DB as 500.',
      testData: `propertyId=${propertyId} unitId=${unitId} tenantId=${tenantId} cleanlinessId=${createdId}`,
      expected: 'CLEANLINESS create → 201, persisted with complaintType=CLEANLINESS; unknown type → 400 INVALID_COMPLAINT_TYPE.',
      actual: `cleanliness=${validCleanliness.status} stored=${storedType} unknown=${invalidGarbage.status}`,
      filesChanged:
        'property-backend/src/main/resources/db/migration/V172__tenant_complaints_allow_cleanliness.sql, property-backend/src/main/java/com/propertymanagement/modules/complaint/service/TenantComplaintService.java',
      retestResult: ok ? 'CLEANLINESS accepted + stored; unknown types now reject as 400.' : `still failing — cleanliness=${validCleanliness.status} unknown=${invalidGarbage.status}`,
      severity: 'Medium',
      status: ok ? 'Fixed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });
});
