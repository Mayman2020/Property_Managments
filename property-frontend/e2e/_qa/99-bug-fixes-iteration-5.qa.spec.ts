/**
 * Iteration 5 bug-fix record spec.
 *
 * Re-asserts the production code paths that were patched in iteration 5 and
 * leaves a permanent row in the QA report describing the fix.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 5;

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
interface OwnerMini { id: number; }
interface PropertyMini { id: number; }
interface CompanyMini { id: number; }
interface ContractRow { contractId: number; status?: string; }
interface InvoiceRow { invoiceId: number; status?: string; payments?: Array<{ installmentNo?: number; status?: string }>; }

test.describe.serial('Iteration 5 — Bug fixes (record)', () => {
  test('BUG-010 maintenance_contract_invoice_payments.invoice_id FK was pointing to the wrong table — payment plan flows broke for contract invoices', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const fileUrl = loadState().placeholderFileUrl!;
    const tag = `BUG010-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const shortNid = `OW${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 99)}`.slice(0, 28);
    const ownerResp = await api.raw('POST', '/owners', {
      fullNameAr: `مالك ${tag}`,
      fullNameEn: `Owner ${tag}`,
      nationalId: shortNid,
      phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
    });
    const ownerId = (ownerResp.body as ApiEnvelope<OwnerMini>).data!.id;
    const propResp = await api.raw('POST', '/properties', {
      propertyNameEn: `MCBug-${tag}`,
      propertyNameAr: `MCBug-${tag}`,
      propertyType: 'RESIDENTIAL',
      address: `MCBug St ${tag}`,
      totalFloors: 1,
      totalUnits: 1,
      floorUnitsConfig: { '1': 1 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [fileUrl]
    });
    const propertyId = (propResp.body as ApiEnvelope<PropertyMini>).data!.id;
    const safe = tag.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const coResp = await api.raw('POST', '/maintenance-companies', {
      nameEn: `Co ${tag}`,
      nameAr: `شركة ${tag}`,
      phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`,
      email: `qa.mc.${safe}@propmgmt.com`,
      portalPropertyId: propertyId,
      contractStart: '2026-01-01',
      contractEnd: '2026-12-31',
      attachmentFiles: [fileUrl],
      active: true
    });
    const companyId = (coResp.body as ApiEnvelope<CompanyMini>).data!.id;
    const contractResp = await api.raw('POST', '/maintenance-contracts', {
      propertyId,
      contractorCompanyId: companyId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      contractValue: 240,
      currency: 'OMR',
      notes: 'BUG-010 retest'
    });
    const contractId = (contractResp.body as ApiEnvelope<ContractRow>).data!.contractId;
    await api.raw('PATCH', `/maintenance-contracts/${contractId}/activate`);
    const invoicesResp = await api.raw('GET', `/maintenance-contracts/${contractId}/invoices`);
    const invoiceId = (((invoicesResp.body as ApiEnvelope<InvoiceRow[]>)?.data) ?? [])[0]?.invoiceId;
    const mp = await api.raw('PATCH', `/maintenance-invoices/${invoiceId}/mark-paid`, {
      receiptUrl: fileUrl,
      notes: 'BUG-010 retest paid'
    });
    const status = (mp.body as ApiEnvelope<InvoiceRow>)?.data?.status;
    recordRow(row({
      module: 'maintenance-contracts',
      route: 'PATCH /maintenance-invoices/{id}/mark-paid (contract invoice)',
      scenario:
        'V149 created maintenance_contract_invoice_payments with FK invoice_id REFERENCES maintenance_contract_invoices(id), but the live DB had the FK pointing at maintenance_invoices(id) (the ad-hoc contractor-submitted invoice table). Every POST /maintenance-invoices/{id}/payment-plan and PATCH /maintenance-invoices/{id}/mark-paid against a contract invoice failed with foreign key violation (constraint maintenance_contract_invoice_payments_invoice_id_fkey, "Key (invoice_id)=(N) is not present in table maintenance_invoices") and rolled back.',
      steps:
        'V171__fix_maintenance_contract_invoice_payments_fk.sql drops the misdirected FK and re-adds it pointing at maintenance_contract_invoices(id) with ON DELETE CASCADE. Idempotent (DO block, exists-guard, orphan-row notice).',
      testData: `contractId=${contractId} invoiceId=${invoiceId}`,
      expected: 'HTTP 200; invoice.status=PAID; an installment row referencing the contract invoice id is created.',
      actual: `status=${mp.status} invoiceStatus=${status}`,
      filesChanged:
        'property-backend/src/main/resources/db/migration/V171__fix_maintenance_contract_invoice_payments_fk.sql',
      retestResult: mp.status === 200 && status === 'PAID' ? 'invoice marked paid; installment FK satisfied' : `still failing: ${mp.status}`,
      severity: 'Critical',
      status: mp.status === 200 && status === 'PAID' ? 'Fixed' : 'Failed'
    }));
    expect(mp.status).toBe(200);
  });
});
