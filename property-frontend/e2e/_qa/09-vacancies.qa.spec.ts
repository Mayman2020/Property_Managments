/**
 * Iteration 9 — Vacancies listings and inquiries.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 9;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'vacancies',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'vacancies (PreAuthorize roles)',
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

function uniq(p: string): string {
  return `${p}-${Date.now()}`;
}

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }
interface PageEnv<T> { content: T[]; totalElements?: number; }
interface VacancyRow { id: number; unitId?: number; propertyId?: number; isPublished?: boolean; listingSource?: string; }
interface InquiryRow { id: number; status?: string; inquirerName?: string; }

const isOk = (s: number) => s === 200 || s === 201;

test.describe.serial('Iteration 9 — Vacancies', () => {
  let listingId = 0;
  let inquiryId = 0;
  let unitId = 0;
  let propertyId = 0;

  test('9.1 POST /vacancies creates MANUAL published listing', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    propertyId = s.propertyIds[0];
    const candidates = [...(s.vacantUnitIds ?? []), ...(s.unitIdsByProperty[propertyId] ?? [])];
    let createStatus = 0;
    let listingSource = '';
    for (const uid of candidates) {
      const body = {
        unitId: uid,
        propertyId,
        titleEn: uniq('QA Vacancy'),
        titleAr: 'شاغر QA',
        askingRent: 900,
        currency: 'OMR',
        availableFrom: new Date().toISOString().slice(0, 10)
      };
      const r = await api.raw('POST', '/vacancies', body);
      createStatus = r.status;
      const d = (r.body as ApiEnvelope<VacancyRow>).data;
      if (isOk(r.status) && d?.id) {
        unitId = uid;
        listingId = d.id;
        listingSource = d.listingSource ?? '';
        break;
      }
      if (r.status === 400) continue;
    }
    const ok = listingId > 0 && listingSource === 'MANUAL';
    recordRow(row({
      route: 'POST /vacancies',
      scenario: 'Create manual vacancy listing for first unit without an active listing.',
      steps: 'POST /vacancies iterating vacant units until success',
      testData: `listingId=${listingId} unitId=${unitId}`,
      expected: 'HTTP 201; listingSource=MANUAL',
      actual: `status=${createStatus} source=${listingSource}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('9.2 GET /vacancies returns paged listings', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/vacancies?page=0&size=5');
    const content = ((r.body as ApiEnvelope<PageEnv<VacancyRow>>).data?.content) ?? [];
    recordRow(row({
      route: 'GET /vacancies',
      scenario: 'List vacancy listings.',
      steps: 'GET /vacancies',
      expected: 'HTTP 200; content[]',
      actual: `status=${r.status} count=${content.length}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('9.3 GET /vacancies/by-unit/{unitId} returns listing', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', `/vacancies/by-unit/${unitId}`);
    const d = (r.body as ApiEnvelope<VacancyRow>).data;
    recordRow(row({
      route: 'GET /vacancies/by-unit/{unitId}',
      scenario: 'Fetch listing by unit id.',
      steps: `GET /vacancies/by-unit/${unitId}`,
      testData: `unitId=${unitId}`,
      expected: 'HTTP 200; listing id present',
      actual: `status=${r.status} id=${d?.id ?? 'null'}`,
      status: r.status === 200 && !!d?.id ? 'Passed' : 'Failed',
      notes: d == null ? 'Service returns null body when missing — documented gap' : ''
    }));
    expect(r.status).toBe(200);
    expect(d?.id).toBe(listingId);
  });

  test('9.4 POST /vacancies/{id}/inquiries creates NEW inquiry', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', `/vacancies/${listingId}/inquiries`, {
      inquirerName: 'QA Inquirer',
      inquirerPhone: '+96890001111',
      inquirerEmail: `${uniq('inquiry')}@example.com`,
      inquirerType: 'INDIVIDUAL',
      message: 'Interested in viewing'
    });
    const d = (r.body as ApiEnvelope<InquiryRow>).data;
    inquiryId = d?.id ?? 0;
    const ok = r.status === 200 && inquiryId > 0 && (d?.status === 'NEW' || !d?.status);
    recordRow(row({
      route: 'POST /vacancies/{id}/inquiries',
      scenario: 'Create rental inquiry on listing.',
      steps: `POST /vacancies/${listingId}/inquiries`,
      testData: `inquiryId=${inquiryId}`,
      expected: 'HTTP 200; inquiry id',
      actual: `status=${r.status} inquiryStatus=${d?.status}`,
      status: ok ? 'Passed' : 'Failed'
    }));
    expect(ok).toBe(true);
  });

  test('9.5 PATCH /vacancies/inquiries/{id}/status CONTACTED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('PATCH', `/vacancies/inquiries/${inquiryId}/status`, { status: 'CONTACTED' });
    const st = ((r.body as ApiEnvelope<InquiryRow>).data?.status);
    recordRow(row({
      route: 'PATCH /vacancies/inquiries/{id}/status',
      scenario: 'Update inquiry status NEW → CONTACTED.',
      steps: `PATCH status=CONTACTED`,
      testData: `inquiryId=${inquiryId}`,
      expected: 'HTTP 200; status=CONTACTED',
      actual: `status=${r.status} inquiryStatus=${st}`,
      status: r.status === 200 && st === 'CONTACTED' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(st).toBe('CONTACTED');
  });

  test('9.6 GET /vacancies/{id}/inquiries lists inquiries', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', `/vacancies/${listingId}/inquiries`);
    const list = ((r.body as ApiEnvelope<InquiryRow[]>).data) ?? [];
    recordRow(row({
      route: 'GET /vacancies/{id}/inquiries',
      scenario: 'List inquiries for listing.',
      steps: `GET /vacancies/${listingId}/inquiries`,
      expected: 'HTTP 200; includes created inquiry',
      actual: `status=${r.status} count=${list.length}`,
      status: r.status === 200 && list.some((i) => i.id === inquiryId) ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('9.7 invalid inquiry status returns 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('PATCH', `/vacancies/inquiries/${inquiryId}/status`, { status: 'INVALID_STATUS_X' });
    recordRow(row({
      route: 'PATCH /vacancies/inquiries/{id}/status (invalid)',
      scenario: 'Unknown inquiry status rejected.',
      steps: 'PATCH status=INVALID_STATUS_X',
      expected: 'HTTP 400',
      actual: `status=${r.status}`,
      severity: 'Low',
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('9.8 TENANT cannot POST /vacancies (403)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    let tenantEmail = 'qa.tenant2@propmgmt.com';
    if (s.tenantIds[0]) {
      const t = await api.raw('GET', `/tenants/${s.tenantIds[0]}`);
      tenantEmail = ((t.body as ApiEnvelope<{ email?: string }>).data?.email) ?? tenantEmail;
    }
    await api.login(tenantEmail);
    const r = await api.raw('POST', '/vacancies', { unitId, propertyId, titleEn: 'x' });
    recordRow(row({
      route: 'POST /vacancies',
      role: 'TENANT',
      scenario: 'Tenant cannot create vacancy listings.',
      expected: 'HTTP 403',
      actual: `status=${r.status}`,
      status: r.status === 403 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(403);
  });

  test('9.9 POST /dev/schedulers/vacancy-auto-publish reachable (SUPER_ADMIN)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/dev/schedulers/vacancy-auto-publish');
    recordRow(row({
      route: 'POST /dev/schedulers/vacancy-auto-publish',
      scenario: 'Dev scheduler backfill endpoint returns 200 (may publish 0).',
      steps: 'POST /dev/schedulers/vacancy-auto-publish',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed',
      notes: 'Full AUTO_PUBLISHED verification deferred if no TERMINATED/EXPIRED contracts with vacant units'
    }));
    expect(r.status).toBe(200);
  });
});
