/**
 * Iteration 2 — Units full lifecycle.
 *
 * Covers POST /units, PUT /units/{id}, PATCH /units/{id}/toggle-active,
 * PATCH /units/{id}/rental-status, DELETE /units/{id}, floor-capacity
 * enforcement and "cannot delete a rented unit" guard.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 2;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'units',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'units.*',
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

interface UnitResponse {
  id: number;
  propertyId?: number;
  floorId?: number;
  unitNumber?: string;
  unitType?: string;
  furnishedStatus?: string;
  rentAmount?: number;
  active?: boolean;
  /** UnitResponse fields are `rented` / `reserved` (no `is` prefix in the JSON view). */
  rented?: boolean;
  reserved?: boolean;
}

interface PropertyMini {
  id: number;
}

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: 'SUPER_ADMIN'): Promise<string>;
}

async function createTestProperty(api: RawApi, ownerId: number, fileUrl: string, totalUnits = 4, floors = 2) {
  const cfg: Record<string, number> = {};
  const per = Math.ceil(totalUnits / floors);
  for (let i = 1; i <= floors; i++) cfg[String(i)] = per;
  return api.raw('POST', '/properties', {
    propertyNameEn: uniq('UnitProp'),
    propertyNameAr: 'وحدات',
    propertyType: 'RESIDENTIAL',
    address: 'Unit St',
    totalFloors: floors,
    totalUnits,
    floorUnitsConfig: cfg,
    ownerIds: [ownerId],
    ownerDocumentFiles: [fileUrl]
  });
}

test.describe.serial('Iteration 2 — Units lifecycle', () => {
  test('2.8 units CRUD happy path + toggle-active', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const prop = await createTestProperty(api as RawApi, ownerId, s.placeholderFileUrl!, 2, 1);
    const propertyId = (prop.body as ApiEnvelope<PropertyMini>).data!.id;
    const floorsResp = await api.raw('GET', `/properties/${propertyId}/floors`);
    const floors = ((floorsResp.body as ApiEnvelope<Array<{ id: number; floorNumber: number }>>)?.data) ?? [];
    const floorId = floors[0]?.id;
    expect(floorId).toBeTruthy();

    const create = await api.raw('POST', '/units', {
      propertyId,
      floorId,
      unitType: 'APARTMENT',
      furnishedStatus: 'FURNISHED',
      areaSqm: 90,
      bedrooms: 2,
      bathrooms: 1,
      rentAmount: 350,
      currency: 'OMR'
    });
    const created = (create.body as ApiEnvelope<UnitResponse>)?.data;
    recordRow(row({
      route: 'POST /units',
      scenario: 'Create unit with minimal valid payload',
      steps: `POST /units (propertyId=${propertyId}, floorId=${floorId})`,
      testData: 'unitType=APARTMENT, furnished=FURNISHED, rent=350',
      expected: 'HTTP 200, unitNumber generated, active=true',
      actual: `status=${create.status} id=${created?.id} unitNumber=${created?.unitNumber}`,
      status: isOk(create.status) && Boolean(created?.id) ? 'Passed' : 'Failed',
      severity: 'High'
    }));
    expect(created?.id).toBeTruthy();
    const unitId = created!.id;

    const get1 = await api.raw('GET', `/units/${unitId}`);
    recordRow(row({
      route: 'GET /units/{id}',
      scenario: 'Read unit by id',
      steps: `GET /units/${unitId}`,
      testData: '-',
      expected: 'HTTP 200',
      actual: `status=${get1.status}`,
      status: get1.status === 200 ? 'Passed' : 'Failed'
    }));

    const upd = await api.raw('PUT', `/units/${unitId}`, {
      propertyId,
      floorId,
      unitType: 'APARTMENT',
      furnishedStatus: 'SEMI_FURNISHED',
      areaSqm: 90,
      bedrooms: 2,
      bathrooms: 1,
      rentAmount: 410,
      currency: 'OMR'
    });
    const updated = (upd.body as ApiEnvelope<UnitResponse>)?.data;
    recordRow(row({
      route: 'PUT /units/{id}',
      scenario: 'Update unit rent + furnishedStatus, unitNumber unchanged',
      steps: 'PUT /units/{id} rentAmount=410 furnishedStatus=SEMI_FURNISHED',
      testData: '-',
      expected: 'HTTP 200, rent=410, unitNumber unchanged',
      actual: `status=${upd.status} rent=${updated?.rentAmount} unitNumber=${updated?.unitNumber}`,
      status: upd.status === 200 && updated?.rentAmount === 410 && updated?.unitNumber === created?.unitNumber ? 'Passed' : 'Failed'
    }));

    const tog = await api.raw('PATCH', `/units/${unitId}/toggle-active`);
    const togBody = (tog.body as ApiEnvelope<UnitResponse>)?.data;
    recordRow(row({
      route: 'PATCH /units/{id}/toggle-active',
      scenario: 'Deactivate vacant unit',
      steps: `PATCH /units/${unitId}/toggle-active`,
      testData: '-',
      expected: 'HTTP 200, active flips to false',
      actual: `status=${tog.status} active=${togBody?.active}`,
      status: tog.status === 200 && togBody?.active === false ? 'Passed' : 'Failed',
      severity: 'High'
    }));
    await api.raw('PATCH', `/units/${unitId}/toggle-active`);

    const rs = await api.raw('PATCH', `/units/${unitId}/rental-status?rented=true`);
    const rsBody = (rs.body as ApiEnvelope<UnitResponse>)?.data;
    recordRow(row({
      route: 'PATCH /units/{id}/rental-status',
      scenario: 'Rental status resync — query param ignored, derived from lease contracts',
      steps: `PATCH /units/${unitId}/rental-status?rented=true`,
      testData: 'rented=true (ignored, no active lease on this unit)',
      expected: 'HTTP 200; rented stays false because no active lease exists',
      actual: `status=${rs.status} rented=${rsBody?.rented}`,
      severity: 'Medium',
      status: rs.status === 200 && rsBody?.rented === false ? 'Passed' : 'Failed'
    }));

    const del = await api.raw('DELETE', `/units/${unitId}`);
    recordRow(row({
      route: 'DELETE /units/{id}',
      scenario: 'Soft-delete a vacant unit',
      steps: `DELETE /units/${unitId}`,
      testData: '-',
      expected: 'HTTP 200, subsequent GET 404',
      actual: `status=${del.status}`,
      status: del.status === 200 ? 'Passed' : 'Failed',
      severity: 'High'
    }));
    const after = await api.raw('GET', `/units/${unitId}`);
    recordRow(row({
      route: 'GET /units/{id} after delete',
      scenario: 'Soft-deleted unit not returned',
      steps: `GET /units/${unitId} after delete`,
      testData: '-',
      expected: '404',
      actual: `status=${after.status}`,
      status: after.status === 404 ? 'Passed' : 'Failed'
    }));

    await api.raw('DELETE', `/properties/${propertyId}`);
  });

  test('2.9 units create validation failures', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const prop = await createTestProperty(api as RawApi, ownerId, s.placeholderFileUrl!, 2, 1);
    const propertyId = (prop.body as ApiEnvelope<PropertyMini>).data!.id;

    const noFurn = await api.raw('POST', '/units', {
      propertyId,
      unitType: 'APARTMENT'
    });
    recordRow(row({
      route: 'POST /units',
      scenario: 'Reject units with missing furnishedStatus',
      steps: 'POST /units omit furnishedStatus',
      testData: '-',
      expected: '400 bean validation',
      actual: `status=${noFurn.status}`,
      severity: 'High',
      status: noFurn.status === 400 ? 'Passed' : 'Failed'
    }));

    const noType = await api.raw('POST', '/units', {
      propertyId,
      furnishedStatus: 'UNFURNISHED'
    });
    recordRow(row({
      route: 'POST /units',
      scenario: 'Reject units with missing unitType',
      steps: 'POST /units omit unitType',
      testData: '-',
      expected: '400 bean validation',
      actual: `status=${noType.status}`,
      severity: 'High',
      status: noType.status === 400 ? 'Passed' : 'Failed'
    }));

    await api.raw('DELETE', `/properties/${propertyId}`);
  });

  test('2.10 floor capacity from floorUnitsConfig is enforced', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const prop = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('CapProp'),
      propertyNameAr: 'سعة',
      propertyType: 'RESIDENTIAL',
      address: 'Cap St',
      totalFloors: 1,
      totalUnits: 2,
      floorUnitsConfig: { '1': 2 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const propertyId = (prop.body as ApiEnvelope<PropertyMini>).data!.id;
    const floors = ((await api.raw('GET', `/properties/${propertyId}/floors`)).body as ApiEnvelope<Array<{ id: number }>>).data!;
    const floorId = floors[0].id;

    const u1 = await api.raw('POST', '/units', {
      propertyId, floorId, unitType: 'APARTMENT', furnishedStatus: 'UNFURNISHED',
      areaSqm: 70, bedrooms: 1, bathrooms: 1, rentAmount: 250, currency: 'OMR'
    });
    const u2 = await api.raw('POST', '/units', {
      propertyId, floorId, unitType: 'APARTMENT', furnishedStatus: 'UNFURNISHED',
      areaSqm: 70, bedrooms: 1, bathrooms: 1, rentAmount: 250, currency: 'OMR'
    });
    expect(isOk(u1.status), `u1 ${u1.status}`).toBeTruthy();
    expect(isOk(u2.status), `u2 ${u2.status}`).toBeTruthy();

    const u3 = await api.raw('POST', '/units', {
      propertyId, floorId, unitType: 'APARTMENT', furnishedStatus: 'UNFURNISHED',
      areaSqm: 70, bedrooms: 1, bathrooms: 1, rentAmount: 250, currency: 'OMR'
    });
    const body = u3.body as ApiEnvelope;
    recordRow(row({
      route: 'POST /units',
      scenario: 'Third unit on a floor capped to 2 in floorUnitsConfig is rejected',
      steps: 'Create floor with cap=2; POST third unit on the same floor',
      testData: 'floorUnitsConfig={1:2}; attempting 3rd unit',
      expected: 'HTTP 400 with FLOOR_CAPACITY_REACHED or PROPERTY_UNIT_CAPACITY_REACHED',
      actual: `status=${u3.status} errorCode=${body.errorCode ?? '-'}`,
      severity: 'High',
      status: u3.status === 400 ? 'Passed' : 'Failed'
    }));

    for (const u of [u1, u2]) {
      const id = (u.body as ApiEnvelope<{ id: number }>)?.data?.id;
      if (id) await api.raw('DELETE', `/units/${id}`);
    }
    await api.raw('DELETE', `/properties/${propertyId}`);
  });

  test('2.11 unit-is-rented guard — search live units for a rented one', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();

    // Find any unit currently flagged rented across the bootstrapped properties.
    let rentedUnitId: number | undefined;
    for (const pid of s.propertyIds) {
      const r = await api.raw('GET', `/units/property/${pid}`);
      const data = (r.body as ApiEnvelope<{ content?: UnitResponse[] } | UnitResponse[]>)?.data;
      const list = Array.isArray(data) ? data : (data?.content ?? []);
      const hit = list.find(u => u.rented === true || u.reserved === true);
      if (hit) { rentedUnitId = hit.id; break; }
    }

    if (!rentedUnitId) {
      recordRow(row({
        route: 'PATCH /units/{id}/toggle-active',
        scenario: 'No unit is currently rented/reserved in the bootstrapped data — guard deferred to contracts iteration',
        steps: 'GET /units/property/{id} for each bootstrapped property',
        testData: '-',
        expected: 'Deactivating a rented unit returns 400/409 with UNIT_IS_RENTED',
        actual: 'No rented unit found — bootstrap contracts are DRAFT (not ACTIVE), so unit.rented stays false until iter 3 activates a contract.',
        severity: 'Medium',
        status: 'To be verified during E2E testing',
        notes: 'Re-runs of this check should pick up the rented flag once iter 3 transitions a contract to ACTIVE.'
      }));
      return;
    }

    const tog = await api.raw('PATCH', `/units/${rentedUnitId}/toggle-active`);
    const togBody = tog.body as ApiEnvelope;
    const togRejected = tog.status === 400 || tog.status === 409;
    recordRow(row({
      route: 'PATCH /units/{id}/toggle-active',
      scenario: 'Deactivating a rented unit is rejected',
      steps: `PATCH /units/${rentedUnitId}/toggle-active`,
      testData: `unitId=${rentedUnitId}`,
      expected: 'HTTP 400/409 with UNIT_IS_RENTED',
      actual: `status=${tog.status} errorCode=${togBody.errorCode ?? '-'}`,
      severity: 'High',
      status: togRejected ? 'Passed' : 'Failed'
    }));

    const del = await api.raw('DELETE', `/units/${rentedUnitId}`);
    const delBody = del.body as ApiEnvelope;
    recordRow(row({
      route: 'DELETE /units/{id}',
      scenario: 'Deleting a rented unit is rejected',
      steps: `DELETE /units/${rentedUnitId}`,
      testData: `unitId=${rentedUnitId}`,
      expected: 'HTTP 400/409 UNIT_IS_RENTED',
      actual: `status=${del.status} errorCode=${delBody.errorCode ?? '-'}`,
      severity: 'High',
      status: (del.status === 400 || del.status === 409) ? 'Passed' : 'Failed'
    }));
  });
});
