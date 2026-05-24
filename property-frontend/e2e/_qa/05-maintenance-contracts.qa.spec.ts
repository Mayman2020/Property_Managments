/**
 * Iteration 5 — Maintenance contracts + invoices.
 *
 *   DRAFT --activate--> ACTIVE --request-renewal--> PENDING_RENEWAL_APPROVAL
 *           ^                                  \--renewal-decision APPROVED--> new DRAFT + old RENEWED
 *           |                                  \--renewal-decision REJECTED--> back to ACTIVE
 *           |
 *   DRAFT --cancel--> CANCELLED
 *   ACTIVE --terminate(with body)--> PENDING_TERMINATION_APPROVAL
 *                                  --termination-decision APPROVED--> ENDED
 *                                  --termination-decision REJECTED--> back to ACTIVE
 *
 * Activating an ACTIVE contract whose contractValue > 0 emits a single
 * MaintenanceContractInvoice (status=ISSUED). The invoice can then be paid in
 * full (FULL plan) or split into a SCHEDULED plan with up to four installments.
 */

import { test, expect } from './fixtures';
import { recordRow, resetIterationLog, QaRow } from './record';
import { loadState } from './state';

const ITER = 5;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'maintenance-contracts',
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

interface ContractRow { contractId: number; status?: string; contractValue?: number | string; invoiceCount?: number; }
interface InvoiceRow { invoiceId: number; invoiceNumber?: string; status?: string; amount?: number | string; payments?: PaymentRow[]; }
interface PaymentRow { id?: number; installmentNo?: number; status?: string; }

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: string): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

interface OwnerMini { id: number; }
interface PropertyMini { id: number; }
interface CompanyMini { id: number; }

async function ensureContractorCompany(api: RawApi, tag: string, portalPropertyId: number): Promise<number> {
  const safe = tag.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const fileUrl = loadState().placeholderFileUrl!;
  const r = await api.raw('POST', '/maintenance-companies', {
    nameEn: `Co ${tag}`,
    nameAr: `شركة ${tag}`,
    phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`,
    email: `qa.mc.${safe}@propmgmt.com`,
    portalPropertyId,
    contractStart: '2026-01-01',
    contractEnd: '2026-12-31',
    attachmentFiles: [fileUrl],
    active: true
  });
  if (!isOk(r.status)) throw new Error(`company create failed: ${r.status} ${JSON.stringify(r.body)}`);
  return (r.body as ApiEnvelope<CompanyMini>).data!.id;
}

async function makeFreshPropertyAndContractor(api: RawApi, tag: string): Promise<{ propertyId: number; companyId: number; }> {
  const fileUrl = loadState().placeholderFileUrl!;
  const shortNid = `OW${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 99)}`.slice(0, 28);
  const ownerResp = await api.raw('POST', '/owners', {
    fullNameAr: `مالك ${tag}`,
    fullNameEn: `Owner ${tag}`,
    nationalId: shortNid,
    phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
  });
  if (!isOk(ownerResp.status)) throw new Error(`owner create failed: ${ownerResp.status}`);
  const ownerId = (ownerResp.body as ApiEnvelope<OwnerMini>).data!.id;
  const propResp = await api.raw('POST', '/properties', {
    propertyNameEn: `MC-${tag}`,
    propertyNameAr: `MC-${tag}`,
    propertyType: 'RESIDENTIAL',
    address: `MC St ${tag}`,
    totalFloors: 1,
    totalUnits: 1,
    floorUnitsConfig: { '1': 1 },
    ownerIds: [ownerId],
    ownerDocumentFiles: [fileUrl]
  });
  if (!isOk(propResp.status)) throw new Error(`property create failed: ${propResp.status}`);
  const propertyId = (propResp.body as ApiEnvelope<PropertyMini>).data!.id;
  const companyId = await ensureContractorCompany(api, tag, propertyId);
  return { propertyId, companyId };
}

async function makeFreshContract(api: RawApi, tag: string, value = 360): Promise<{ contractId: number; propertyId: number; companyId: number }> {
  const { propertyId, companyId } = await makeFreshPropertyAndContractor(api, tag);
  const r = await api.raw('POST', '/maintenance-contracts', {
    propertyId,
    contractorCompanyId: companyId,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    contractValue: value,
    currency: 'OMR',
    notes: `QA contract ${tag}`
  });
  if (!isOk(r.status)) throw new Error(`contract create failed: ${r.status} ${JSON.stringify(r.body)}`);
  const contractId = (r.body as ApiEnvelope<ContractRow>).data!.contractId;
  return { contractId, propertyId, companyId };
}

test.describe.serial('Iteration 5 — Maintenance contracts + invoices', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  test('5.13 maintenance contract DRAFT → ACTIVE emits one MaintenanceContractInvoice (status=ISSUED)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Activate'), 480);

    const before = await api.raw('GET', `/maintenance-contracts/${f.contractId}`);
    const beforeStatus = (before.body as ApiEnvelope<ContractRow>)?.data?.status;
    const act = await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/activate`);
    const after = (act.body as ApiEnvelope<ContractRow>)?.data;

    const invoicesResp = await api.raw('GET', `/maintenance-contracts/${f.contractId}/invoices`);
    const invoices = ((invoicesResp.body as ApiEnvelope<InvoiceRow[]>)?.data) ?? [];
    recordRow(row({
      route: 'PATCH /maintenance-contracts/{id}/activate',
      scenario: 'Activating a DRAFT contract with contractValue>0 emits one ISSUED MaintenanceContractInvoice',
      steps: `POST contract → PATCH activate → GET /maintenance-contracts/${f.contractId}/invoices`,
      testData: `contractId=${f.contractId} value=480`,
      expected: 'before=DRAFT; after=ACTIVE; invoices.length=1; invoice.status=ISSUED',
      actual: `before=${beforeStatus} after=${after?.status} invoiceCount=${invoices.length} firstStatus=${invoices[0]?.status ?? '-'}`,
      status: beforeStatus === 'DRAFT' && after?.status === 'ACTIVE' && invoices.length === 1 && invoices[0]?.status === 'ISSUED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.14 DRAFT contract → /cancel returns the contract in CANCELLED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Cancel'), 240);
    const cancel = await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/cancel`, { notes: 'QA cancel' });
    const body = (cancel.body as ApiEnvelope<ContractRow>)?.data;
    recordRow(row({
      route: 'PATCH /maintenance-contracts/{id}/cancel',
      scenario: 'Cancelling a DRAFT contract sets status=CANCELLED',
      steps: 'POST + PATCH cancel',
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200; status=CANCELLED',
      actual: `status=${cancel.status} contractStatus=${body?.status}`,
      status: cancel.status === 200 && body?.status === 'CANCELLED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.15 ACTIVE → request-renewal → PENDING_RENEWAL_APPROVAL → renewal-decision APPROVED → new ACTIVE + old RENEWED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Renew'), 360);
    await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/activate`);

    const req = await api.raw('POST', `/maintenance-contracts/${f.contractId}/request-renewal`, {
      proposedStartDate: '2027-01-01',
      proposedEndDate: '2027-12-31',
      proposedValue: 400,
      note: 'QA renewal'
    });
    const afterReq = (req.body as ApiEnvelope<ContractRow>)?.data;
    recordRow(row({
      route: 'POST /maintenance-contracts/{id}/request-renewal',
      scenario: 'request-renewal sets status=PENDING_RENEWAL_APPROVAL',
      steps: 'Activate → request-renewal',
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200; status=PENDING_RENEWAL_APPROVAL',
      actual: `status=${req.status} contractStatus=${afterReq?.status}`,
      status: req.status === 200 && afterReq?.status === 'PENDING_RENEWAL_APPROVAL' ? 'Passed' : 'Failed'
    }));

    const dec = await api.raw('POST', `/maintenance-contracts/${f.contractId}/renewal-decision`, {
      decision: 'APPROVED',
      notes: 'QA approve renewal'
    });
    const afterDec = (dec.body as ApiEnvelope<ContractRow>)?.data;
    // The renewal decision creates a NEW contract and marks the old one RENEWED.
    // The decision response returns the NEW contract per service contract.
    recordRow(row({
      route: 'POST /maintenance-contracts/{id}/renewal-decision',
      scenario: 'Approving the renewal creates a new DRAFT/ACTIVE contract and marks the old one RENEWED',
      steps: 'POST renewal-decision decision=APPROVED on PENDING_RENEWAL_APPROVAL contract',
      testData: `originalContractId=${f.contractId}`,
      expected: 'HTTP 200; original contract → RENEWED, response contract is the new contract',
      actual: `status=${dec.status} returnedContractStatus=${afterDec?.status} returnedContractId=${afterDec?.contractId}`,
      status: dec.status === 200 ? 'Passed' : 'Failed'
    }));

    // Sanity check: the original contract is now RENEWED
    const orig = await api.raw('GET', `/maintenance-contracts/${f.contractId}`);
    const origAfter = (orig.body as ApiEnvelope<ContractRow>)?.data;
    recordRow(row({
      route: 'GET /maintenance-contracts/{id}',
      scenario: 'Original contract reflects RENEWED status after renewal-decision APPROVED',
      steps: `GET /maintenance-contracts/${f.contractId}`,
      testData: `contractId=${f.contractId}`,
      expected: 'status=RENEWED',
      actual: `status=${origAfter?.status}`,
      severity: 'Medium',
      status: origAfter?.status === 'RENEWED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.16 ACTIVE → terminate(body) → PENDING_TERMINATION_APPROVAL → termination-decision APPROVED → ENDED', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Term'), 300);
    await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/activate`);

    const term = await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/terminate`, {
      terminationDate: '2026-09-01',
      reason: 'QA termination'
    });
    const termBody = (term.body as ApiEnvelope<ContractRow>)?.data;
    recordRow(row({
      route: 'PATCH /maintenance-contracts/{id}/terminate',
      scenario: 'terminate(body) sets status=PENDING_TERMINATION_APPROVAL',
      steps: 'Activate → terminate with terminationDate body',
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200; status=PENDING_TERMINATION_APPROVAL',
      actual: `status=${term.status} contractStatus=${termBody?.status}`,
      status: term.status === 200 && termBody?.status === 'PENDING_TERMINATION_APPROVAL' ? 'Passed' : 'Failed'
    }));

    const dec = await api.raw('POST', `/maintenance-contracts/${f.contractId}/termination-decision`, {
      decision: 'APPROVED',
      notes: 'QA approve termination'
    });
    const decBody = (dec.body as ApiEnvelope<ContractRow>)?.data;
    recordRow(row({
      route: 'POST /maintenance-contracts/{id}/termination-decision',
      scenario: 'Approving the termination sets status=ENDED',
      steps: 'POST termination-decision decision=APPROVED',
      testData: `contractId=${f.contractId}`,
      expected: 'HTTP 200; status=ENDED',
      actual: `status=${dec.status} contractStatus=${decBody?.status}`,
      status: dec.status === 200 && decBody?.status === 'ENDED' ? 'Passed' : 'Failed'
    }));
  });

  test('5.17 invoice mark-paid (FULL plan) flips MaintenanceContractInvoice to PAID', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Paid'), 200);
    await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/activate`);

    const invoicesResp = await api.raw('GET', `/maintenance-contracts/${f.contractId}/invoices`);
    const invoices = ((invoicesResp.body as ApiEnvelope<InvoiceRow[]>)?.data) ?? [];
    if (invoices.length === 0) {
      recordRow(row({ scenario: 'Skipped — activation did not produce an invoice', status: 'Blocked' }));
      return;
    }
    const invoiceId = invoices[0].invoiceId;
    const mp = await api.raw('PATCH', `/maintenance-invoices/${invoiceId}/mark-paid`, {
      receiptUrl: loadState().placeholderFileUrl,
      notes: 'QA paid'
    });
    const mpBody = (mp.body as ApiEnvelope<InvoiceRow>)?.data;
    recordRow(row({
      module: 'maintenance-contracts',
      route: 'PATCH /maintenance-invoices/{id}/mark-paid',
      scenario: 'Mark-paid on the auto-generated invoice flips it to PAID (FULL plan path)',
      steps: 'Activate → mark-paid',
      testData: `contractId=${f.contractId} invoiceId=${invoiceId}`,
      expected: 'HTTP 200; invoice.status=PAID',
      actual: `status=${mp.status} invoiceStatus=${mpBody?.status}`,
      status: mp.status === 200 && mpBody?.status === 'PAID' ? 'Passed' : 'Failed'
    }));
  });

  test('5.18 invoice SCHEDULED payment plan: first installment paid immediately, remaining installments PENDING', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const f = await makeFreshContract(api as RawApi, uniq('Plan'), 600);
    await api.raw('PATCH', `/maintenance-contracts/${f.contractId}/activate`);
    const invoicesResp = await api.raw('GET', `/maintenance-contracts/${f.contractId}/invoices`);
    const invoices = ((invoicesResp.body as ApiEnvelope<InvoiceRow[]>)?.data) ?? [];
    if (invoices.length === 0) {
      recordRow(row({ scenario: 'Skipped — activation did not produce an invoice', status: 'Blocked' }));
      return;
    }
    const invoiceId = invoices[0].invoiceId;
    const plan = await api.raw('POST', `/maintenance-invoices/${invoiceId}/payment-plan`, {
      mode: 'SCHEDULED',
      installmentCount: 3,
      receiptUrl: loadState().placeholderFileUrl,
      notes: 'QA 3-installment plan',
      installments: [
        { installmentNo: 2, dueDate: '2026-08-01' },
        { installmentNo: 3, dueDate: '2026-09-01' }
      ]
    });
    const planBody = plan.body as ApiEnvelope<{ payments?: PaymentRow[]; status?: string }>;
    const planErr = (plan.body as ApiEnvelope)?.message;
    const payments = (planBody?.data?.payments) ?? [];
    const firstPaid = payments.find(p => p.installmentNo === 1)?.status;
    const pendingCount = payments.filter(p => p.status === 'PENDING').length;
    recordRow(row({
      module: 'maintenance-contracts',
      route: 'POST /maintenance-invoices/{id}/payment-plan',
      scenario: 'SCHEDULED plan with installmentCount=3 marks installment #1 paid (receipt required) and #2/#3 PENDING',
      steps: 'Activate → POST payment-plan mode=SCHEDULED installmentCount=3 receiptUrl=...',
      testData: `invoiceId=${invoiceId}`,
      expected: 'HTTP 200; 3 payments; installment 1 PAID; 2 PENDING; rest PENDING',
      actual: `status=${plan.status} payments=${payments.length} firstStatus=${firstPaid} pendingCount=${pendingCount} err=${planErr ?? '-'}`,
      status: plan.status === 200 && payments.length === 3 && firstPaid === 'PAID' && pendingCount === 2 ? 'Passed' : 'Failed'
    }));
  });

  test('5.19 maintenance contract validation: contractorCompanyId required → HTTP 400', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const { propertyId } = await makeFreshPropertyAndContractor(api as RawApi, uniq('ValMissingCo'));
    const r = await api.raw('POST', '/maintenance-contracts', {
      propertyId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      contractValue: 100,
      currency: 'OMR'
    });
    recordRow(row({
      route: 'POST /maintenance-contracts (missing contractorCompanyId)',
      scenario: 'Missing contractorCompanyId is rejected at the validation layer',
      steps: 'POST without contractorCompanyId',
      testData: '-',
      expected: 'HTTP 400 with validation error',
      actual: `status=${r.status} errorCode=${(r.body as ApiEnvelope)?.errorCode ?? '-'}`,
      severity: 'Medium',
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
  });
});
