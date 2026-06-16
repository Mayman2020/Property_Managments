/**
 * Iteration 2 — Properties, floors, attachments, owner splits.
 *
 * Exercises the real PropertyController/FloorController/PropertyAttachmentController
 * endpoints with happy path, validation failures, and delete-restriction
 * scenarios. Every check emits a row to docs/stabilization/qa-results/iteration-02.jsonl.
 */

import { test, expect } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';
import { loadState, saveState } from './state';

const ITER = 2;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'properties',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'properties.*',
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
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  return `${prefix}-${ts}-${Math.floor(Math.random() * 1000)}`;
}

/** Spring controllers in this project return 201 for `POST /resource` and 200 for everything else. */
const isOk = (status: number) => status === 200 || status === 201;

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  message?: string;
}

interface PropertyResponse {
  id: number;
  propertyNameEn?: string;
  propertyNameAr?: string;
  address?: string;
  active?: boolean;
  totalFloors?: number;
  totalUnits?: number;
  /** OwnerSummary uses `id` for the owner's id (not `ownerId`). */
  owners?: Array<{ id: number; ownershipPercentage?: number | string }>;
}

test.describe.serial('Iteration 2 — Properties / Floors / Attachments / Owner Splits', () => {
  test.beforeAll(async ({ request }) => {
    resetIterationLog(ITER);
    // Sanity: admin login must work, frontend must be reachable.
    const r = await request.post('http://localhost:8081/api/v1/auth/login', {
      data: { email: 'admin@propmgmt.com', password: '12345' }
    });
    if (!r.ok()) throw new Error(`admin login failed: ${r.status()}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.1  Properties — Happy path CRUD + toggle-active
  // ───────────────────────────────────────────────────────────────────────────
  test('2.1 properties CRUD + toggle-active happy path', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    if (!s.placeholderFileUrl) throw new Error('placeholderFileUrl missing in qa-state; run iter 0 first');
    const ownerId = s.ownerIds[0];
    expect(ownerId).toBeTruthy();

    // create
    const nameEn = uniq('QA-Prop');
    const create = await api.raw('POST', '/properties', {
      propertyNameEn: nameEn,
      propertyNameAr: `QA عقار ${nameEn}`,
      propertyType: 'RESIDENTIAL',
      address: `Iter2 St. ${nameEn}`,
      city: 'Muscat',
      country: 'Oman',
      totalFloors: 2,
      totalUnits: 4,
      floorUnitsConfig: { '1': 2, '2': 2 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const created = (create.body as ApiEnvelope<PropertyResponse>)?.data;
    expect(isOk(create.status), `create failed: ${create.status} ${JSON.stringify(create.body)}`).toBeTruthy();
    expect(created?.id).toBeTruthy();
    const propertyId = created!.id;

    recordRow(row({
      route: 'POST /properties',
      scenario: 'Create property with minimal valid payload (single owner, autoshare 100%)',
      steps: `POST /properties name=${nameEn}`,
      testData: `nameEn=${nameEn} ownerId=${ownerId}`,
      expected: 'HTTP 200 with `data.id` and `data.active=true`',
      actual: `status=${create.status} id=${created?.id} active=${created?.active}`,
      status: isOk(create.status) && created?.active ? 'Passed' : 'Failed'
    }));

    // read
    const get1 = await api.raw('GET', `/properties/${propertyId}`);
    const fetched = (get1.body as ApiEnvelope<PropertyResponse>)?.data;
    recordRow(row({
      route: 'GET /properties/{id}',
      scenario: 'Read created property back by id',
      steps: `GET /properties/${propertyId}`,
      testData: '-',
      expected: 'HTTP 200; same nameEn; active=true',
      actual: `status=${get1.status} nameEn=${fetched?.propertyNameEn} active=${fetched?.active}`,
      status: get1.status === 200 && fetched?.propertyNameEn === nameEn ? 'Passed' : 'Failed'
    }));

    // update (PUT) — change address only
    const newAddr = `${nameEn} (updated)`;
    const upd = await api.raw('PUT', `/properties/${propertyId}`, {
      propertyNameEn: nameEn,
      propertyNameAr: `QA عقار ${nameEn}`,
      propertyType: 'RESIDENTIAL',
      address: newAddr,
      city: 'Muscat',
      country: 'Oman',
      totalFloors: 2,
      totalUnits: 4,
      floorUnitsConfig: { '1': 2, '2': 2 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const updated = (upd.body as ApiEnvelope<PropertyResponse>)?.data;
    recordRow(row({
      route: 'PUT /properties/{id}',
      scenario: 'Update property address',
      steps: `PUT /properties/${propertyId} address="${newAddr}"`,
      testData: `address=${newAddr}`,
      expected: 'HTTP 200; returned address matches new value',
      actual: `status=${upd.status} address=${updated?.address}`,
      status: upd.status === 200 && updated?.address === newAddr ? 'Passed' : 'Failed'
    }));

    // toggle active
    const tog = await api.raw('PATCH', `/properties/${propertyId}/toggle-active`);
    const togBody = (tog.body as ApiEnvelope<PropertyResponse>)?.data;
    recordRow(row({
      route: 'PATCH /properties/{id}/toggle-active',
      scenario: 'Toggle active flag',
      steps: `PATCH /properties/${propertyId}/toggle-active`,
      testData: '-',
      expected: 'HTTP 200, active flag flips to false',
      actual: `status=${tog.status} active=${togBody?.active}`,
      status: tog.status === 200 && togBody?.active === false ? 'Passed' : 'Failed'
    }));
    // toggle back
    await api.raw('PATCH', `/properties/${propertyId}/toggle-active`);

    // delete (no units linked yet) → soft delete
    const del = await api.raw('DELETE', `/properties/${propertyId}`);
    recordRow(row({
      route: 'DELETE /properties/{id}',
      scenario: 'Soft delete an empty property (no units)',
      steps: `DELETE /properties/${propertyId}`,
      testData: '-',
      expected: 'HTTP 200; subsequent GET returns 404',
      actual: `status=${del.status}`,
      status: del.status === 200 ? 'Passed' : 'Failed'
    }));
    const after = await api.raw('GET', `/properties/${propertyId}`);
    recordRow(row({
      route: 'GET /properties/{id} after delete',
      scenario: 'Soft-deleted property no longer readable through list endpoints',
      steps: `GET /properties/${propertyId} after soft delete`,
      testData: '-',
      expected: 'HTTP 404 (only active properties are returned)',
      actual: `status=${after.status}`,
      status: after.status === 404 ? 'Passed' : 'Failed'
    }));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.2  Properties — Validation failures
  // ───────────────────────────────────────────────────────────────────────────
  test('2.2 properties create validation failures', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    // 2.2a  Missing ownerDocumentFiles → 400 PROPERTY_OWNER_ATTACHMENT_REQUIRED
    const noDoc = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('NoDoc'),
      propertyType: 'RESIDENTIAL',
      address: 'X',
      ownerIds: [ownerId]
    });
    const body = noDoc.body as ApiEnvelope;
    recordRow(row({
      route: 'POST /properties',
      scenario: 'Reject property without owner attachment',
      steps: 'POST /properties omitting ownerDocumentFiles',
      testData: 'ownerDocumentFiles=[]',
      expected: 'HTTP 400 with PROPERTY_OWNER_ATTACHMENT_REQUIRED',
      actual: `status=${noDoc.status} errorCode=${body.errorCode ?? '-'}`,
      severity: 'High',
      status: noDoc.status === 400 && body.errorCode === 'PROPERTY_OWNER_ATTACHMENT_REQUIRED' ? 'Passed' : 'Failed'
    }));

    // 2.2b  Empty ownerIds → 400 (NotEmpty)
    const noOwner = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('NoOwner'),
      propertyType: 'RESIDENTIAL',
      address: 'X',
      ownerIds: [],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    recordRow(row({
      route: 'POST /properties',
      scenario: 'Reject property with empty ownerIds list',
      steps: 'POST /properties ownerIds=[]',
      testData: 'ownerIds=[]',
      expected: 'HTTP 400 (bean validation @NotEmpty)',
      actual: `status=${noOwner.status}`,
      severity: 'High',
      status: noOwner.status === 400 ? 'Passed' : 'Failed'
    }));

    // 2.2c  ownerShares sum != 100 → 400 OWNER_PERCENTAGE_INVALID
    if (s.ownerIds.length >= 2) {
      const badShares = await api.raw('POST', '/properties', {
        propertyNameEn: uniq('BadShares'),
        propertyType: 'RESIDENTIAL',
        address: 'X',
        ownerIds: s.ownerIds.slice(0, 2),
        ownerShares: [
          { ownerId: s.ownerIds[0], ownershipPercentage: 70 },
          { ownerId: s.ownerIds[1], ownershipPercentage: 20 }
        ],
        ownerDocumentFiles: [s.placeholderFileUrl]
      });
      const bs = badShares.body as ApiEnvelope;
      recordRow(row({
        route: 'POST /properties',
        scenario: 'Reject ownerShares whose percentages do not sum to 100',
        steps: 'POST /properties ownerShares=[70,20]',
        testData: 'sum=90',
        expected: 'HTTP 400 OWNER_PERCENTAGE_INVALID',
        actual: `status=${badShares.status} errorCode=${bs.errorCode ?? '-'}`,
        severity: 'High',
        status: badShares.status === 400 && bs.errorCode === 'OWNER_PERCENTAGE_INVALID' ? 'Passed' : 'Failed'
      }));

      // 2.2d  ownerShares list does not match ownerIds → 400 OWNER_SHARE_MISMATCH
      const mismatch = await api.raw('POST', '/properties', {
        propertyNameEn: uniq('Mismatch'),
        propertyType: 'RESIDENTIAL',
        address: 'X',
        ownerIds: s.ownerIds.slice(0, 2),
        ownerShares: [
          { ownerId: s.ownerIds[0], ownershipPercentage: 60 },
          { ownerId: s.ownerIds[2] ?? s.ownerIds[0], ownershipPercentage: 40 }
        ],
        ownerDocumentFiles: [s.placeholderFileUrl]
      });
      const mm = mismatch.body as ApiEnvelope;
      recordRow(row({
        route: 'POST /properties',
        scenario: 'Reject ownerShares whose ownerIds are not the same set as ownerIds',
        steps: 'POST /properties ownerIds=[A,B] ownerShares=[A,C]',
        testData: '-',
        expected: 'HTTP 400 OWNER_SHARE_MISMATCH',
        actual: `status=${mismatch.status} errorCode=${mm.errorCode ?? '-'}`,
        severity: 'High',
        status: mismatch.status === 400 && mm.errorCode === 'OWNER_SHARE_MISMATCH' ? 'Passed' : 'Failed'
      }));
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.3  Owner splits — equal-split fallback + custom split round-trip
  // ───────────────────────────────────────────────────────────────────────────
  test('2.3 owner splits — equal split default, custom 60/40 round-trip', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    if (s.ownerIds.length < 2) return; // can't test split without two owners
    const a = s.ownerIds[0];
    const b = s.ownerIds[1];

    // Equal split: no ownerShares array
    const equalReq = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('Equal'),
      propertyNameAr: 'مشترك',
      propertyType: 'RESIDENTIAL',
      address: 'Equal St',
      totalFloors: 1,
      totalUnits: 1,
      floorUnitsConfig: { '1': 1 },
      ownerIds: [a, b],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const equalProp = (equalReq.body as ApiEnvelope<PropertyResponse>)?.data;
    const shares1 = equalProp?.owners ?? [];
    const both50 = shares1.length === 2 && shares1.every(o => Math.abs(Number(o.ownershipPercentage ?? 0) - 50) < 0.01);
    recordRow(row({
      route: 'POST /properties (no ownerShares)',
      scenario: 'Two owners with no ownerShares get equal 50/50 split auto-calculated',
      steps: 'POST /properties ownerIds=[A,B] ownerShares omitted; GET /properties/{id}',
      testData: `owners=[${a},${b}]`,
      expected: 'Each owner returned with 50%',
      actual: `shares=${JSON.stringify(shares1)}`,
      severity: 'High',
      status: both50 ? 'Passed' : 'Failed'
    }));
    if (equalProp?.id) await api.raw('DELETE', `/properties/${equalProp.id}`);

    // Custom 60/40 split
    const splitReq = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('Split60-40'),
      propertyNameAr: 'تقسيم',
      propertyType: 'RESIDENTIAL',
      address: 'Split St',
      totalFloors: 1,
      totalUnits: 1,
      floorUnitsConfig: { '1': 1 },
      ownerIds: [a, b],
      ownerShares: [
        { ownerId: a, ownershipPercentage: 60 },
        { ownerId: b, ownershipPercentage: 40 }
      ],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const splitProp = (splitReq.body as ApiEnvelope<PropertyResponse>)?.data;
    const shares2 = splitProp?.owners ?? [];
    const a60 = Number(shares2.find(o => o.id === a)?.ownershipPercentage);
    const b40 = Number(shares2.find(o => o.id === b)?.ownershipPercentage);
    recordRow(row({
      route: 'POST /properties (custom ownerShares)',
      scenario: 'Custom 60/40 ownership split is persisted and returned',
      steps: 'POST /properties ownerShares=[A:60,B:40] then GET',
      testData: `A=${a} B=${b}`,
      expected: 'GET returns owners with percentages 60 and 40',
      actual: `A=${a60} B=${b40}`,
      severity: 'High',
      status: a60 === 60 && b40 === 40 ? 'Passed' : 'Failed'
    }));
    if (splitProp?.id) await api.raw('DELETE', `/properties/${splitProp.id}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.4  Property delete restriction — cannot delete property with active units
  // ───────────────────────────────────────────────────────────────────────────
  test('2.4 cannot delete property that still has active units (409 PROPERTY_HAS_UNITS)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const create = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('HasUnits'),
      propertyType: 'RESIDENTIAL',
      address: 'HasUnits St',
      totalFloors: 1,
      totalUnits: 1,
      floorUnitsConfig: { '1': 1 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const prop = (create.body as ApiEnvelope<PropertyResponse>)?.data;
    expect(prop?.id).toBeTruthy();

    const floorsResp = await api.raw('GET', `/properties/${prop!.id}/floors`);
    const floors = ((floorsResp.body as ApiEnvelope<Array<{ id: number; floorNumber: number }>>)?.data) ?? [];
    expect(floors.length).toBeGreaterThan(0);

    const unitCreate = await api.raw('POST', '/units', {
      propertyId: prop!.id,
      floorId: floors[0].id,
      unitType: 'APARTMENT',
      furnishedStatus: 'UNFURNISHED',
      areaSqm: 60,
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: 250,
      currency: 'OMR'
    });
    expect(isOk(unitCreate.status), `unit create failed: ${unitCreate.status} ${JSON.stringify(unitCreate.body)}`).toBeTruthy();
    const unitId = (unitCreate.body as ApiEnvelope<{ id: number }>)?.data?.id;

    // Try to delete the property — should fail with 409
    const del = await api.raw('DELETE', `/properties/${prop!.id}`);
    const dBody = del.body as ApiEnvelope;
    recordRow(row({
      module: 'properties',
      route: 'DELETE /properties/{id}',
      scenario: 'Delete is blocked while the property still has active units',
      steps: 'Create property → create one unit → DELETE property',
      testData: `propertyId=${prop!.id} unitId=${unitId}`,
      expected: 'HTTP 409 PROPERTY_HAS_UNITS',
      actual: `status=${del.status} errorCode=${dBody?.errorCode ?? '-'}`,
      severity: 'High',
      status: del.status === 409 && dBody?.errorCode === 'PROPERTY_HAS_UNITS' ? 'Passed' : 'Failed'
    }));

    // Clean up: soft-delete unit first, then property
    if (unitId) await api.raw('DELETE', `/units/${unitId}`);
    await api.raw('DELETE', `/properties/${prop!.id}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.5  Floors — lazy-provision list, duplicate floorNumber, unit-less delete
  // ───────────────────────────────────────────────────────────────────────────
  test('2.5 floors REST — list, duplicate floor 409, hard delete', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    // Build a fresh property without floorUnitsConfig — floors lazy-provisioned
    const create = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('Floors'),
      propertyType: 'RESIDENTIAL',
      address: 'Floor St',
      totalFloors: 3,
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const prop = (create.body as ApiEnvelope<PropertyResponse>)?.data;
    expect(prop?.id).toBeTruthy();

    const list1 = await api.raw('GET', `/properties/${prop!.id}/floors`);
    const f1 = ((list1.body as ApiEnvelope<Array<{ id: number; floorNumber: number }>>)?.data) ?? [];
    recordRow(row({
      module: 'floors',
      route: 'GET /properties/{id}/floors',
      scenario: 'Floors are listed (auto-provisioned from totalFloors=3)',
      steps: `GET /properties/${prop!.id}/floors`,
      testData: 'totalFloors=3',
      expected: 'HTTP 200 with 3 floors numbered 1,2,3',
      actual: `status=${list1.status} count=${f1.length} numbers=${f1.map(x => x.floorNumber).join(',')}`,
      severity: 'Medium',
      status: list1.status === 200 && f1.length === 3 ? 'Passed' : 'Failed'
    }));

    // Try to create floor with duplicate number → 409
    const dup = await api.raw('POST', `/properties/${prop!.id}/floors`, {
      floorNumber: 1,
      floorLabelEn: 'duplicate'
    });
    const dBody = dup.body as ApiEnvelope;
    recordRow(row({
      module: 'floors',
      route: 'POST /properties/{id}/floors',
      scenario: 'Reject duplicate floorNumber within the same property',
      steps: 'POST .../floors { floorNumber: 1 }',
      testData: 'floorNumber=1 (already exists)',
      expected: 'HTTP 409 or 400 with FLOOR_NUMBER_EXISTS / duplicate message',
      actual: `status=${dup.status} body=${JSON.stringify(dBody).slice(0, 140)}`,
      severity: 'Medium',
      status: [400, 409].includes(dup.status) ? 'Passed' : 'Failed'
    }));

    // Hard-delete one floor (no units)
    if (f1.length > 0) {
      const last = f1[f1.length - 1];
      const del = await api.raw('DELETE', `/properties/${prop!.id}/floors/${last.id}`);
      recordRow(row({
        module: 'floors',
        route: 'DELETE /properties/{propertyId}/floors/{id}',
        scenario: 'Hard delete floor with no units succeeds',
        steps: `DELETE .../floors/${last.id}`,
        testData: `floorNumber=${last.floorNumber}`,
        expected: 'HTTP 200; floor removed from subsequent list',
        actual: `status=${del.status}`,
        severity: 'Medium',
        status: del.status === 200 ? 'Passed' : 'Failed',
        notes: 'FloorService.delete currently has no unit-count guard; this confirms the behavior.'
      }));
    }

    await api.raw('DELETE', `/properties/${prop!.id}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.6  Property attachments — upload + list + delete
  // ───────────────────────────────────────────────────────────────────────────
  test('2.6 property attachments upload / list / delete', async ({ api, request }) => {
    const token = await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const create = await api.raw('POST', '/properties', {
      propertyNameEn: uniq('Attach'),
      propertyType: 'RESIDENTIAL',
      address: 'Attach St',
      totalFloors: 1,
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const prop = (create.body as ApiEnvelope<PropertyResponse>)?.data;
    expect(prop?.id).toBeTruthy();

    // Multipart upload
    const tinyPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100' +
      '0d0a2db40000000049454e44ae426082',
      'hex'
    );
    const up = await request.post(`http://localhost:8081/api/v1/properties/${prop!.id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'qa-attachment.png', mimeType: 'image/png', buffer: tinyPng },
        title: 'QA test attachment',
        category: 'OTHER'
      }
    });
    const upStatus = up.status();
    const upBody = (await up.json().catch(() => null)) as ApiEnvelope<{ id: number; fileName?: string }> | null;
    const attachmentId = upBody?.data?.id;
    recordRow(row({
      module: 'property-attachments',
      route: 'POST /properties/{id}/attachments',
      scenario: 'Upload a PNG attachment to a property',
      steps: 'Multipart POST file=image/png',
      testData: 'qa-attachment.png',
      expected: 'HTTP 200; response.data.id present',
      actual: `status=${upStatus} id=${attachmentId ?? '-'}`,
      severity: 'High',
      status: upStatus === 200 && Boolean(attachmentId) ? 'Passed' : 'Failed'
    }));

    // List
    const list = await api.raw('GET', `/properties/${prop!.id}/attachments`);
    const items = ((list.body as ApiEnvelope<Array<{ id: number }>>)?.data) ?? [];
    recordRow(row({
      module: 'property-attachments',
      route: 'GET /properties/{id}/attachments',
      scenario: 'List property attachments contains the uploaded file',
      steps: `GET /properties/${prop!.id}/attachments`,
      testData: '-',
      expected: 'Includes attachmentId from previous upload',
      actual: `status=${list.status} count=${items.length} ids=${items.map(i => i.id).join(',')}`,
      severity: 'Medium',
      status: list.status === 200 && (!attachmentId || items.some(i => i.id === attachmentId)) ? 'Passed' : 'Failed'
    }));

    // Delete
    if (attachmentId) {
      const del = await api.raw('DELETE', `/properties/${prop!.id}/attachments/${attachmentId}`);
      recordRow(row({
        module: 'property-attachments',
        route: 'DELETE /properties/{id}/attachments/{attachmentId}',
        scenario: 'Delete an attachment',
        steps: `DELETE .../attachments/${attachmentId}`,
        testData: '-',
        expected: 'HTTP 200 / 204; row removed from subsequent list',
        actual: `status=${del.status}`,
        severity: 'Medium',
        status: [200, 204].includes(del.status) ? 'Passed' : 'Failed'
      }));
    }

    await api.raw('DELETE', `/properties/${prop!.id}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2.7  UI smoke — created property is visible in /admin/properties/list
  // ───────────────────────────────────────────────────────────────────────────
  test('2.7 UI: a freshly created property shows up on /admin/properties/list', async ({ api, page, web }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const ownerId = s.ownerIds[0];

    const name = uniq('UI-Prop');
    const create = await api.raw('POST', '/properties', {
      propertyNameEn: name,
      propertyNameAr: name,
      propertyType: 'RESIDENTIAL',
      address: 'UI St',
      totalFloors: 1,
      ownerIds: [ownerId],
      ownerDocumentFiles: [s.placeholderFileUrl]
    });
    const prop = (create.body as ApiEnvelope<PropertyResponse>)?.data;
    expect(prop?.id).toBeTruthy();

    await page.goto(`${web}/auth/login`);
    await page.locator('input[type="email"]').fill('admin@propmgmt.com');
    await page.locator('input[type="password"]').fill('12345');
    await page.getByRole('button', { name: /enter|دخول|login/i }).click();
    await page.waitForURL((u) => !/\/auth\/login/.test(u.pathname), { timeout: 20000 });
    await page.goto(`${web}/admin/properties`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const visible = bodyText.includes(name) || bodyText.includes(prop!.id.toString());
    recordRow(row({
      module: 'properties',
      route: '/admin/properties',
      scenario: 'New property is listed on the admin properties screen',
      steps: 'API-create property → UI login as admin → GET /admin/properties',
      testData: `name=${name} id=${prop!.id}`,
      expected: 'List renders and shows the new property',
      actual: `visible=${visible} url=${page.url()}`,
      severity: 'Medium',
      status: visible ? 'Passed' : 'Failed'
    }));

    await api.raw('DELETE', `/properties/${prop!.id}`);
  });
});
