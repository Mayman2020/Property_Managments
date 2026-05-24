/**
 * Iteration 3 — Contract templates CRUD + validation + active filter.
 *
 * ContractTemplateController does not expose a DELETE endpoint; deactivation is
 * effectively `PUT { isActive: false }`. Class-level @PreAuthorize restricts to
 * SUPER_ADMIN / GENERAL_MANAGER / ACCOUNTANT for reads, SUPER_ADMIN /
 * GENERAL_MANAGER for writes.
 */

import { test, expect } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';

const ITER = 3;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'contract-templates',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
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

interface TemplateResponse {
  id: number;
  templateName?: string;
  templateNameAr?: string;
  templateNameEn?: string;
  templateType?: string;
  content?: string;
  /** Lombok @Data on a primitive boolean field `isActive` serializes as `"active"`. */
  active?: boolean;
}

test.describe.serial('Iteration 3 — Contract templates', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  test('3.1 contract template CRUD + active toggle via update', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');

    const name = uniq('QA-Tpl');
    const create = await api.raw('POST', '/contract-templates', {
      templateName: name,
      templateNameAr: `قالب ${name}`,
      templateNameEn: name,
      // DB CHECK constraint only allows: RESIDENTIAL, COMMERCIAL, SHOP.
      templateType: 'RESIDENTIAL',
      content: 'This is a QA test contract template body. Replace {{tenant}} with {{landlord}}.'
    });
    const tpl = (create.body as ApiEnvelope<TemplateResponse>)?.data;
    recordRow(row({
      route: 'POST /contract-templates',
      scenario: 'Create contract template with valid payload',
      steps: 'POST /contract-templates name + AR/EN + content',
      testData: `name=${name}`,
      expected: 'HTTP 200/201 with data.id and active=true',
      actual: `status=${create.status} id=${tpl?.id} active=${tpl?.active}`,
      severity: 'High',
      status: isOk(create.status) && Boolean(tpl?.id) && tpl?.active === true ? 'Passed' : 'Failed'
    }));
    expect(tpl?.id).toBeTruthy();
    const tplId = tpl!.id;

    // Read by id
    const get1 = await api.raw('GET', `/contract-templates/${tplId}`);
    const fetched = (get1.body as ApiEnvelope<TemplateResponse>)?.data;
    recordRow(row({
      route: 'GET /contract-templates/{id}',
      scenario: 'Read template back',
      steps: `GET /contract-templates/${tplId}`,
      testData: '-',
      expected: 'HTTP 200; templateNameEn matches',
      actual: `status=${get1.status} templateNameEn=${fetched?.templateNameEn}`,
      status: get1.status === 200 && fetched?.templateNameEn === name ? 'Passed' : 'Failed'
    }));

    // List active templates contains it
    const listActive = await api.raw('GET', '/contract-templates/active');
    const activeList = (listActive.body as ApiEnvelope<TemplateResponse[]>)?.data ?? [];
    recordRow(row({
      route: 'GET /contract-templates/active',
      scenario: 'Active templates list includes the new one',
      steps: 'GET /contract-templates/active',
      testData: '-',
      expected: 'Includes our new template id',
      actual: `status=${listActive.status} found=${activeList.some(t => t.id === tplId)}`,
      status: listActive.status === 200 && activeList.some(t => t.id === tplId) ? 'Passed' : 'Failed'
    }));

    const upd = await api.raw('PUT', `/contract-templates/${tplId}`, {
      templateName: name,
      templateNameAr: `قالب ${name}`,
      templateNameEn: name,
      templateType: 'RESIDENTIAL',
      content: 'Updated body.',
      isActive: false
    });
    const updated = (upd.body as ApiEnvelope<TemplateResponse>)?.data;
    recordRow(row({
      route: 'PUT /contract-templates/{id}',
      scenario: 'Update template content and deactivate it',
      steps: `PUT /contract-templates/${tplId}`,
      testData: 'isActive=false',
      expected: 'HTTP 200; active=false; content updated',
      actual: `status=${upd.status} active=${updated?.active}`,
      severity: 'High',
      status: upd.status === 200 && updated?.active === false ? 'Passed' : 'Failed'
    }));

    // Active list should no longer include it
    const listActive2 = await api.raw('GET', '/contract-templates/active');
    const al2 = (listActive2.body as ApiEnvelope<TemplateResponse[]>)?.data ?? [];
    recordRow(row({
      route: 'GET /contract-templates/active',
      scenario: 'Deactivated template removed from active list',
      steps: 'GET /contract-templates/active',
      testData: '-',
      expected: 'Active list does not contain our id',
      actual: `excluded=${!al2.some(t => t.id === tplId)}`,
      status: !al2.some(t => t.id === tplId) ? 'Passed' : 'Failed'
    }));
  });

  test('3.2 missing content is rejected (NotBlank)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const bad = await api.raw('POST', '/contract-templates', {
      templateNameAr: 'بدون محتوى',
      templateNameEn: 'NoContent'
    });
    recordRow(row({
      route: 'POST /contract-templates',
      scenario: 'Reject template with missing content',
      steps: 'POST /contract-templates without content',
      testData: '-',
      expected: 'HTTP 400 (bean validation)',
      actual: `status=${bad.status}`,
      severity: 'High',
      status: bad.status === 400 ? 'Passed' : 'Failed'
    }));
  });

  test('3.3 missing all name flavours is rejected', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const noName = await api.raw('POST', '/contract-templates', {
      content: 'has content but no name'
    });
    recordRow(row({
      route: 'POST /contract-templates',
      scenario: 'Reject template when all name fields are blank',
      steps: 'POST /contract-templates with content but no templateName/Ar/En',
      testData: '-',
      expected: 'HTTP 400 with message "Template name is required"',
      actual: `status=${noName.status}`,
      severity: 'High',
      status: noName.status === 400 ? 'Passed' : 'Failed'
    }));
  });

  test('3.3b invalid templateType surfaces as HTTP 400, not 500', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const bad = await api.raw('POST', '/contract-templates', {
      templateNameEn: uniq('BadType'),
      templateType: 'COMPLETELY_INVALID_VALUE',
      content: 'Body'
    });
    recordRow(row({
      route: 'POST /contract-templates',
      scenario: 'Server-side validation of templateType against the allowed set (RESIDENTIAL/COMMERCIAL/SHOP)',
      steps: 'POST /contract-templates with templateType=COMPLETELY_INVALID_VALUE',
      testData: '-',
      expected: 'HTTP 400 with a clear validation error',
      actual: `status=${bad.status}`,
      severity: 'Medium',
      status: bad.status === 400 ? 'Passed' : 'Failed',
      bugSummary: bad.status === 400
        ? ''
        : 'ContractTemplateService does not validate templateType against the DB CHECK constraint allow-list, so invalid types bubble up as a 500 DataIntegrityViolationException.',
      notes: bad.status === 400
        ? ''
        : 'DB CHECK constraint contract_templates_template_type_check allows only RESIDENTIAL, COMMERCIAL, SHOP. Validation should be moved into the service / DTO so the API surfaces a 400 instead of leaking a 500.'
    }));
  });

  test('3.4 ACCOUNTANT can read but cannot write', async ({ api }) => {
    await api.loginRole('ACCOUNTANT');

    const list = await api.raw('GET', '/contract-templates');
    recordRow(row({
      role: 'ACCOUNTANT',
      route: 'GET /contract-templates',
      scenario: 'ACCOUNTANT can read templates list',
      steps: 'login ACCOUNTANT → GET /contract-templates',
      testData: '-',
      expected: 'HTTP 200',
      actual: `status=${list.status}`,
      severity: 'Medium',
      status: list.status === 200 ? 'Passed' : 'Failed',
      permissionContext: 'class-level @PreAuthorize includes ACCOUNTANT for reads'
    }));

    const write = await api.raw('POST', '/contract-templates', {
      templateNameEn: uniq('AcctTpl'),
      content: 'should be rejected'
    });
    recordRow(row({
      role: 'ACCOUNTANT',
      route: 'POST /contract-templates',
      scenario: 'ACCOUNTANT cannot create template',
      steps: 'POST /contract-templates as ACCOUNTANT',
      testData: '-',
      expected: 'HTTP 403',
      actual: `status=${write.status}`,
      severity: 'High',
      status: write.status === 403 ? 'Passed' : 'Failed'
    }));
  });
});
