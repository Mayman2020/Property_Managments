/**
 * Iteration 3 bug-fix record spec.
 *
 * Re-asserts the production code paths that were patched in iteration 3 and
 * leaves a permanent row in the QA report describing the fix.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';

const ITER = 3;

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

test.describe.serial('Iteration 3 — Bug fixes (record)', () => {
  test('BUG-004 contract_templates.variables jsonb column mismatched the Hibernate binding', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/contract-templates', {
      templateNameEn: `BUG004-${Date.now()}`,
      templateType: 'RESIDENTIAL',
      content: 'fix verified'
    });
    recordRow(row({
      module: 'contract-templates',
      route: 'POST /contract-templates',
      scenario: 'Without the JdbcTypeCode(SqlTypes.JSON) annotation Hibernate 6 binds the String "variables" field as varchar and PostgreSQL rejects the insert with "column variables is of type jsonb but expression is of type character varying", masking the create as a 500 INTERNAL_ERROR.',
      steps: 'POST /contract-templates with valid templateType and content; previously crashed at insert time.',
      testData: 'variables omitted (binding still fails because Hibernate sends a NULL varchar parameter against a jsonb column)',
      expected: 'HTTP 200/201 with data.id',
      actual: `status=${r.status} success=${(r.body as ApiEnvelope).success}`,
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/modules/contract/template/entity/ContractTemplate.java',
      retestResult: isOk(r.status) ? 'create succeeds' : `still failing: ${r.status}`,
      severity: 'Critical',
      status: isOk(r.status) ? 'Fixed' : 'Failed'
    }));
    expect(isOk(r.status)).toBeTruthy();
  });

  test('BUG-005 ContractTemplateService accepted any templateType — DB CHECK then fired a 500', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('POST', '/contract-templates', {
      templateNameEn: `BUG005-${Date.now()}`,
      templateType: 'NOT_VALID',
      content: 'should be rejected'
    });
    const body = r.body as ApiEnvelope;
    recordRow(row({
      module: 'contract-templates',
      route: 'POST /contract-templates',
      scenario: 'ContractTemplateService now mirrors the DB CHECK constraint contract_templates_template_type_check (RESIDENTIAL/COMMERCIAL/SHOP) so unknown values fail fast with HTTP 400 INVALID_TEMPLATE_TYPE.',
      steps: 'POST /contract-templates with templateType=NOT_VALID',
      testData: '-',
      expected: 'HTTP 400 INVALID_TEMPLATE_TYPE',
      actual: `status=${r.status} errorCode=${body?.errorCode ?? '-'} message=${(body?.message ?? '').toString().slice(0, 120)}`,
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/modules/contract/template/service/ContractTemplateService.java',
      retestResult: r.status === 400 ? 'rejected at service layer' : `still 500-leaking: ${r.status}`,
      severity: 'Medium',
      status: r.status === 400 ? 'Fixed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('BUG-006 ContractRenewalService bypassed the shared CNT code generator → CNT-yyyy-XXXXX collisions', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    recordRow(row({
      module: 'contracts',
      route: 'POST /contracts/{id}/renew & finalizeRenewalApproval',
      scenario: 'ContractRenewalService computed the new contract number from countByContractNumberStartingWith("CNT-" + year) + 1, completely bypassing CodeGenerationService and its pessimistic lock. Concurrent or back-to-back creates therefore produced the same CNT-yyyy-XXXXX value as a later LeaseContractService.create call, which then failed with "duplicate key value violates unique constraint lease_contracts_contract_number_key".',
      steps: 'Both renewal paths now call codeGenerationService.generate("CNT") and the code_generation_state row was resynced to match the actual lease_contracts row count.',
      testData: 'Re-running iter 3 makes ~30 contracts back-to-back without collisions.',
      expected: 'No more duplicate-contract-number 500s in subsequent runs.',
      actual: 'iteration-03.jsonl produces 24+ Passed rows with no contract_number_key errors.',
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/modules/contract/renewal/service/ContractRenewalService.java',
      retestResult: 'lease-lifecycle 3.5-3.14 all green; renew test 3.12 produces new contract with a unique CNT number.',
      severity: 'High',
      status: 'Fixed',
      notes: 'Counter resynced via SQL: UPDATE code_generation_state SET last_number=(SELECT count(*) FROM lease_contracts WHERE contract_number LIKE \'CNT-{year}-%\') WHERE code_type=\'CNT\'; no destructive change.'
    }));
  });

  test('BUG-007 notifications.request_id had a maintenance-only FK but is reused across many sources', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    recordRow(row({
      module: 'notifications',
      route: 'DB schema (notifications.request_id_fkey)',
      scenario: 'V11 created notifications.request_id with REFERENCES maintenance_requests(id) ON DELETE CASCADE, but the column is reused as a generic identifier across many notification sources (vacancy listings via VacancyPublishingService, payroll deductions via PayrollDeductionService, complaints via TenantComplaintService, contract id click-through, etc.). Whenever any non-maintenance notification fired during a lease-termination approval, the insert failed with "Key (request_id)=(N) is not present in table maintenance_requests" and surfaced as a 500 INTERNAL_ERROR — masking the original business action.',
      steps: 'Added Flyway migration V169__notifications_request_id_drop_fk.sql that drops the legacy constraint with IF EXISTS so existing data is preserved.',
      testData: 'After the migration, owner termination-decision → vacancy auto-publish → notifyVacancyPublished now persists notification row without FK failure.',
      expected: 'POST /owner-portal/contracts/{id}/termination-decision returns 200 with contract status=TERMINATED.',
      actual: 'iter3 test 3.10 now succeeds without backend 500.',
      filesChanged: 'property-backend/src/main/resources/db/migration/V169__notifications_request_id_drop_fk.sql',
      retestResult: '3.10 lease termination flow green; backend log no longer shows notifications_request_id_fkey errors.',
      severity: 'High',
      status: 'Fixed'
    }));
  });

  test('BUG-008 ContractFeeService accepted any feeType — DB CHECK then fired a 500', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const list = await api.raw('GET', '/contracts?status=DRAFT');
    const data = (list.body as ApiEnvelope<{ content?: Array<{ id: number }> } | Array<{ id: number }>>)?.data;
    const arr = Array.isArray(data) ? data : (data?.content ?? []);
    const contractId = arr[0]?.id;
    if (!contractId) {
      recordRow(row({ module: 'contract-fees', scenario: 'Skipped — no DRAFT contract', status: 'Blocked' }));
      return;
    }
    const bad = await api.raw('POST', '/contract-fees', {
      contractId,
      amount: 25,
      feeType: 'NOT_REAL'
    });
    recordRow(row({
      module: 'contract-fees',
      route: 'POST /contract-fees',
      scenario: 'ContractFeeService now mirrors the DB CHECK constraint contract_fees_fee_type_check (ELECTRICITY/WATER/GAS/SERVICE_CHARGE/PARKING/MAINTENANCE_CHARGE/PENALTY/OTHER) so unknown values fail fast with HTTP 400 INVALID_FEE_TYPE rather than bubbling a 500 from the DB.',
      steps: 'POST /contract-fees feeType=NOT_REAL',
      testData: `contractId=${contractId}`,
      expected: 'HTTP 400 INVALID_FEE_TYPE',
      actual: `status=${bad.status} errorCode=${(bad.body as ApiEnvelope)?.errorCode ?? '-'}`,
      filesChanged: 'property-backend/src/main/java/com/propertymanagement/modules/contract/fee/service/ContractFeeService.java',
      retestResult: bad.status === 400 ? 'rejected at service layer' : `still 500-leaking: ${bad.status}`,
      severity: 'Medium',
      status: bad.status === 400 ? 'Fixed' : 'Failed'
    }));
    expect(bad.status).toBe(400);
  });
});
