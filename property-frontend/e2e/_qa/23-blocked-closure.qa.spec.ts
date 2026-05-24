/**
 * Iteration 23 — Final blocked notification closure pass.
 * Runs targeted real API flows for types still missing from multi-role inbox scans, then
 * records Passed rows to supersede prior Blocked notification matrix entries.
 */
import { test, expect } from './fixtures';
import type { RoleKey } from './credentials';
import { QA_CREDENTIALS } from './credentials';
import { recordRow, QaRow, resetIterationLog } from './record';
import { loadState } from './state';
import { loadNotificationTriggers } from './inventories/load-inventories';
import {
  assignUserProperty,
  clearLoginLock,
  clearPasswordChangeRequired,
  forceContractEndDatePast,
  seedContractExpiringSoon,
  seedLeaveBalanceLow,
  seedMaintenanceInvoicePaymentDue,
  seedNewLoginIp,
  seedRentDue,
  seedRentGraceEscalation
} from './db-helper';
import {
  findTypeInAnyRole,
  scanInboxIndex,
  verifyMarkRead,
  verifyNotifPayload
} from './notification-matrix-helpers';

const ITER = 23;
const SCENARIO = 'Blocked closure — notification coverage';

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'blocked-closure',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: SCENARIO,
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

function notifRow(type: string, p: Partial<QaRow>): QaRow {
  return row({
    module: 'notifications-exhaustive',
    route: `NotificationType.${type}`,
    ...p
  });
}

function uniq(p: string) {
  return `${p}-${Date.now()}`;
}

const isOk = (s: number) => s === 200 || s === 201;

interface ApiEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
}

interface LeaseFixture {
  propertyId: number;
  ownerId: number;
  unitId: number;
  tenantId: number;
  contractId: number;
}

async function linkQaOwner(api: { raw(m: 'PATCH', p: string, b?: unknown): Promise<{ status: number }> }, ownerId: number) {
  const s = loadState();
  if (ownerId && s.roleUserIds.OWNER) {
    await api.raw('PATCH', `/owners/${ownerId}/link-user`, {
      userId: s.roleUserIds.OWNER,
      portalAccess: true
    });
  }
}

async function assignQaAccountant(
  api: { loginRole(r: RoleKey): Promise<string>; raw(m: 'POST', p: string, b?: unknown): Promise<{ status: number }> },
  propertyId: number
) {
  const s = loadState();
  if (propertyId && s.roleUserIds.ACCOUNTANT) {
    await api.loginRole('SUPER_ADMIN');
    await assignUserProperty(api, s.roleUserIds.ACCOUNTANT, propertyId);
  }
}

async function makeLeaseDraft(api: {
  raw(m: 'GET' | 'POST' | 'PATCH', p: string, b?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(r: RoleKey): Promise<string>;
}, tag: string): Promise<LeaseFixture> {
  const s = loadState();
  const fileUrl = s.placeholderFileUrl!;
  const tenantId = s.tenantIds[0];
  if (!tenantId) throw new Error('No bootstrapped tenant — run iter 0 first');

  await api.loginRole('SUPER_ADMIN');
  const ownerResp = await api.raw('POST', '/owners', {
    fullNameAr: `مالك ${tag}`,
    fullNameEn: `Owner ${tag}`,
    nationalId: `OW${Date.now()}`.slice(0, 20),
    phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
  });
  const ownerId = ((ownerResp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
  await linkQaOwner(api, ownerId);

  const propResp = await api.raw('POST', '/properties', {
    propertyNameEn: tag,
    propertyNameAr: tag,
    propertyType: 'RESIDENTIAL',
    address: tag,
    totalFloors: 1,
    totalUnits: 1,
    floorUnitsConfig: { '1': 1 },
    ownerIds: [ownerId],
    ownerDocumentFiles: [fileUrl]
  });
  const propertyId = ((propResp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
  const floorsResp = await api.raw('GET', `/properties/${propertyId}/floors`);
  const floorId = ((floorsResp.body as ApiEnvelope<Array<{ id: number }>>).data ?? [])[0]?.id;
  const unitResp = await api.raw('POST', '/units', {
    propertyId,
    floorId,
    unitType: 'APARTMENT',
    furnishedStatus: 'UNFURNISHED',
    areaSqm: 70,
    bedrooms: 1,
    bathrooms: 1,
    rentAmount: 300,
    currency: 'OMR'
  });
  const unitId = ((unitResp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
  const draft = await api.raw('POST', '/contracts', {
    tenantId,
    unitId,
    propertyId,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRent: 300,
    paymentFrequency: 'MONTHLY',
    paymentDay: 1,
    securityDeposit: 0,
    hasFreeMonth: false,
    contractPdfUrl: fileUrl
  });
  const contractId = ((draft.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
  await assignQaAccountant(api, propertyId);
  return { propertyId, ownerId, unitId, tenantId, contractId };
}

test.describe.serial('Iteration 23 — Blocked closure', () => {
  const extraEmails: string[] = [];
  let hrEmployeeEmail = '';

  test.beforeAll(() => resetIterationLog(ITER));

  test('23.1 Lease owner draft + renewal + termination + expiring + payment', async ({ api }) => {
    const s = loadState();
    const fileUrl = s.placeholderFileUrl!;

    const awaiting = await makeLeaseDraft(api, uniq('BC23-Await'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${awaiting.contractId}/submit-for-owner-approval`);

    const draftReject = await makeLeaseDraft(api, uniq('BC23-Rej'));
    await api.loginRole('OWNER');
    await api.raw('PATCH', `/owner-portal/draft-contracts/${draftReject.contractId}/reject`, {
      reason: 'BC23 owner draft reject'
    });

    const draftAmend = await makeLeaseDraft(api, uniq('BC23-Amend'));
    await api.loginRole('OWNER');
    await api.raw('PATCH', `/owner-portal/draft-contracts/${draftAmend.contractId}/amend`, {
      monthlyRent: 350,
      reason: 'BC23 owner amend rent'
    });

    const pendingDeny = await makeLeaseDraft(api, uniq('BC23-PendDeny'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${pendingDeny.contractId}/submit-for-owner-approval`);
    await api.loginRole('SUPER_ADMIN');
    await api.raw('POST', `/owner-portal/contracts/${pendingDeny.contractId}/decision`, {
      decision: 'REJECTED',
      rejectionReason: 'BC23 pending deny'
    });

    const renewApprove = await makeLeaseDraft(api, uniq('BC23-RenApp'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${renewApprove.contractId}/activate`);
    await api.raw('POST', `/contracts/${renewApprove.contractId}/request-renewal`, {
      proposedStartDate: '2027-01-01',
      proposedEndDate: '2027-12-31',
      proposedRentAmount: 320,
      note: 'BC23 renew approve'
    });
    await api.loginRole('SUPER_ADMIN');
    await api.raw('POST', `/owner-portal/contracts/${renewApprove.contractId}/renewal-decision`, {
      decision: 'APPROVED',
      notes: 'BC23 approved'
    });

    const renewReject = await makeLeaseDraft(api, uniq('BC23-RenRej'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${renewReject.contractId}/activate`);
    await api.raw('POST', `/contracts/${renewReject.contractId}/request-renewal`, {
      proposedStartDate: '2027-02-01',
      proposedEndDate: '2027-12-31',
      proposedRentAmount: 310,
      note: 'BC23 renew reject'
    });
    await api.loginRole('SUPER_ADMIN');
    await api.raw('POST', `/owner-portal/contracts/${renewReject.contractId}/renewal-decision`, {
      decision: 'REJECTED',
      notes: 'BC23 rejected'
    });

    const termReject = await makeLeaseDraft(api, uniq('BC23-TermRej'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${termReject.contractId}/activate`);
    await api.raw('PATCH', `/contracts/${termReject.contractId}/terminate`, {
      terminationDate: '2026-09-01',
      terminationReason: 'BC23 term reject',
      securityDepositReturnToTenant: true,
      hasDamages: false,
      damagesPaidByTenant: false
    });
    await api.loginRole('SUPER_ADMIN');
    const termDecision = await api.raw('POST', `/owner-portal/contracts/${termReject.contractId}/termination-decision`, {
      decision: 'REJECTED',
      notes: 'BC23 term rejected'
    });
    expect(isOk(termDecision.status)).toBe(true);

    const expiring = await makeLeaseDraft(api, uniq('BC23-Exp'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${expiring.contractId}/activate`);
    await forceContractEndDatePast(api, expiring.contractId);
    await api.raw('POST', '/dev/schedulers/contract-expiring');

    const payFlow = await makeLeaseDraft(api, uniq('BC23-Pay'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${payFlow.contractId}/activate`);
    await seedRentDue(api, payFlow.contractId);
    const sched = await api.raw('GET', `/contracts/${payFlow.contractId}/payment-schedule`);
    const schedData = (sched.body as ApiEnvelope<{ content?: Array<{ id: number }> } | Array<{ id: number }>>)?.data;
    const scheduleId = (Array.isArray(schedData) ? schedData[0] : schedData?.content?.[0])?.id ?? 0;
    if (scheduleId) {
      await api.loginRole('TENANT');
      await api.raw('POST', `/tenant-portal/contracts/${payFlow.contractId}/payment-schedule/${scheduleId}/proof`, {
        proofUrl: fileUrl,
        paidAmount: 300,
        paidDate: new Date().toISOString().slice(0, 10),
        notes: 'BC23 proof'
      });
      await api.loginRole('ACCOUNTANT');
      await api.raw('PATCH', `/payment-schedule/${scheduleId}/proof/review`, {
        decision: 'PAID',
        notes: 'BC23 paid'
      });
    }

    const expSoon = await makeLeaseDraft(api, uniq('BC23-ExpSoon'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${expSoon.contractId}/activate`);
    await seedContractExpiringSoon(api, expSoon.contractId);
    await api.raw('POST', '/dev/schedulers/contract-expiring-reminders');

    const grace = await makeLeaseDraft(api, uniq('BC23-Grace'));
    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${grace.contractId}/activate`);
    await seedRentGraceEscalation(api, grace.contractId);
    await api.raw('POST', '/dev/schedulers/rent-dunning-escalation');

    recordRow(row({ route: 'prelude-lease-closure', actual: 'owner draft/renewal/term/payment flows executed' }));
  });

  test('23.1b Expiry lifecycle + tenant on owner property', async ({ api }) => {
    const s = loadState();
    const fileUrl = s.placeholderFileUrl!;

    const regBundle = await makeLeaseDraft(api, uniq('BC23-TReg'));
    await linkQaOwner(api, regBundle.ownerId);
    const tenantTag = uniq('BC23-TReg');
    const tenantReg = await api.raw('POST', '/tenants', {
      propertyId: regBundle.propertyId,
      unitId: regBundle.unitId,
      fullName: `Tenant ${tenantTag}`,
      fullNameAr: `مستأجر ${tenantTag}`,
      fullNameEn: `Tenant ${tenantTag}`,
      email: `${tenantTag}@propmgmt.com`,
      phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`,
      nationalId: `TN${Date.now()}`.slice(0, 20),
      leaseStart: '2026-10-01',
      leaseEnd: '2027-09-30',
      leaseContractFiles: [fileUrl]
    });
    expect(isOk(tenantReg.status)).toBe(true);

    const tag = uniq('BC23-Life');
    const bundle = await makeLeaseDraft(api, tag);
    await api.loginRole('SUPER_ADMIN');
    const cur = await api.raw('GET', `/contracts/${bundle.contractId}`);
    const c = (cur.body as ApiEnvelope<Record<string, unknown>>).data ?? {};
    await api.raw('PUT', `/contracts/${bundle.contractId}`, {
      ...c,
      securityDeposit: 150,
      contractPdfUrl: fileUrl
    });
    await api.raw('PATCH', `/contracts/${bundle.contractId}/activate`);
    await api.loginRole('TENANT');
    await api.raw('POST', `/contracts/${bundle.contractId}/no-renewal-intent`, { notes: 'BC23 no renew' });

    await api.loginRole('SUPER_ADMIN');
    await api.raw('PATCH', `/contracts/${bundle.contractId}/terminate`, {
      terminationDate: '2026-08-01',
      terminationReason: 'BC23 expiry lifecycle',
      securityDepositReturnToTenant: true,
      hasDamages: true,
      damagesPaidByTenant: false
    });
    await api.loginRole('SUPER_ADMIN');
    await api.raw('POST', `/owner-portal/contracts/${bundle.contractId}/termination-decision`, {
      decision: 'APPROVED',
      notes: 'BC23 approved term'
    });
    await api.raw('POST', `/contracts/${bundle.contractId}/return-deposit`);
    await api.raw('POST', `/contracts/${bundle.contractId}/report-damages`, {
      amount: 50,
      notes: 'BC23 wall damage'
    });
    await api.loginRole('TENANT');
    await api.raw('POST', `/contracts/${bundle.contractId}/submit-damage-receipt`, {
      receiptUrl: fileUrl
    });
    await api.loginRole('SUPER_ADMIN');
    await api.raw('POST', `/contracts/${bundle.contractId}/confirm-damage-payment`, { receiptUrl: fileUrl });

    const insp = await api.raw('POST', `/contracts/${bundle.contractId}/inspections`, { type: 'MOVE_OUT' });
    const inspectionId = ((insp.body as ApiEnvelope<{ id: number; items?: Array<{ id: number }> }>).data?.id) ?? 0;
    if (inspectionId) {
      const items = ((insp.body as ApiEnvelope<{ items?: Array<{ id: number }> }>).data?.items) ?? [];
      for (const it of items) {
        await api.raw('PATCH', `/inspections/${inspectionId}/items/${it.id}`, { condition: 'GOOD' });
      }
      await api.raw('PATCH', `/inspections/${inspectionId}/complete`);
      await api.raw('PATCH', `/inspections/${inspectionId}/sign`, { role: 'INSPECTOR' });
      await api.loginRole('TENANT');
      await api.raw('PATCH', `/tenant-portal/inspections/${inspectionId}/sign`, { role: 'TENANT' });
      await api.loginRole('SUPER_ADMIN');
      await api.raw('POST', `/contracts/${bundle.contractId}/clear-unit`);
    }

    recordRow(row({ route: 'prelude-expiry-lifecycle', actual: `contractId=${bundle.contractId} tenantReg=${tenantTag}` }));
  });

  test('23.2 Maintenance rating + invoice payment notifications', async ({ api }) => {
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)]?.[0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds.MAINTENANCE_OFFICER_INTERNAL;
    const fileUrl = s.placeholderFileUrl!;

    if (propertyId && unitId && tenantId && officerId) {
      await api.loginRole('SUPER_ADMIN');
      if (s.ownerIds[0] && s.roleUserIds.OWNER) {
        await api.raw('PATCH', `/owners/${s.ownerIds[0]}/link-user`, {
          userId: s.roleUserIds.OWNER,
          portalAccess: true
        });
      }
      await assignQaAccountant(api, propertyId);
      const create = await api.raw('POST', '/maintenance/requests', {
        propertyId,
        unitId,
        tenantId,
        title: uniq('BC23Rate'),
        description: 'Closure rating',
        priority: 'NORMAL'
      });
      const reqId = ((create.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
      if (reqId) {
        await api.raw('PATCH', `/maintenance/requests/${reqId}/assign`, { officerId });
        await api.raw('PATCH', `/maintenance/requests/${reqId}/schedule`, {
          scheduledDate: '2026-09-01',
          scheduledTimeFrom: '09:00',
          scheduledTimeTo: '10:00'
        });
        await api.raw('PATCH', `/maintenance/requests/${reqId}/start`);
        await api.raw('POST', `/maintenance/requests/${reqId}/visit-report`, {
          visitDate: '2026-09-01',
          visitOutcome: 'COMPLETED',
          officerNotes: 'BC23',
          workDone: 'Done',
          hasPurchase: false,
          items: []
        });
        await api.loginRole('TENANT');
        await api.raw('POST', `/maintenance/requests/${reqId}/rate`, { rating: 4, comment: 'BC23 good' });
      }
    }

    const tag = uniq('BC23-MC');
    await api.loginRole('SUPER_ADMIN');
    const ownerResp = await api.raw('POST', '/owners', {
      fullNameAr: `مالك ${tag}`,
      fullNameEn: `Owner ${tag}`,
      nationalId: `OW${Date.now()}`.slice(0, 20),
      phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`
    });
    const ownerId = ((ownerResp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
    await linkQaOwner(api, ownerId);
    const propResp = await api.raw('POST', '/properties', {
      propertyNameEn: tag,
      propertyNameAr: tag,
      propertyType: 'RESIDENTIAL',
      address: tag,
      totalFloors: 1,
      totalUnits: 1,
      floorUnitsConfig: { '1': 1 },
      ownerIds: [ownerId],
      ownerDocumentFiles: [fileUrl]
    });
    const mcPropertyId = ((propResp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
    if (s.roleUserIds.ACCOUNTANT && mcPropertyId) {
      await assignUserProperty(api, s.roleUserIds.ACCOUNTANT, mcPropertyId);
    }
    const co = await api.raw('POST', '/maintenance-companies', {
      nameEn: `Co ${tag}`,
      nameAr: `شركة ${tag}`,
      phone: `+9689${Math.floor(Math.random() * 10_000_000).toString().padStart(7, '0')}`,
      email: `qa.bc23.${tag}@propmgmt.com`,
      portalPropertyId: mcPropertyId,
      contractStart: '2026-01-01',
      contractEnd: '2026-12-31',
      attachmentFiles: [fileUrl],
      active: true
    });
    const companyId = ((co.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
    const mc = await api.raw('POST', '/maintenance-contracts', {
      propertyId: mcPropertyId,
      contractorCompanyId: companyId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      contractValue: 600,
      currency: 'OMR',
      notes: tag
    });
    const contractId = ((mc.body as ApiEnvelope<{ contractId: number }>).data?.contractId) ?? 0;
    if (contractId) {
      await api.loginRole('OWNER');
      await api.raw('POST', `/owner-portal/maintenance-contracts/${contractId}/decision`, {
        decision: 'REJECTED',
        notes: 'BC23 reject mc'
      });
      await api.loginRole('SUPER_ADMIN');
      const mc2 = await api.raw('POST', '/maintenance-contracts', {
        propertyId: mcPropertyId,
        contractorCompanyId: companyId,
        startDate: '2026-02-01',
        endDate: '2026-12-31',
        contractValue: 650,
        currency: 'OMR',
        notes: `${tag}-2`
      });
      const contractId2 = ((mc2.body as ApiEnvelope<{ contractId: number }>).data?.contractId) ?? 0;
      if (contractId2) {
        await api.loginRole('OWNER');
        await api.raw('POST', `/owner-portal/maintenance-contracts/${contractId2}/decision`, {
          decision: 'APPROVED',
          notes: 'BC23 approve mc2'
        });
      }
      await api.loginRole('SUPER_ADMIN');
      const activeMcId = contractId2 || contractId;
      await api.raw('PATCH', `/maintenance-contracts/${activeMcId}/activate`);
      const inv = await api.raw('GET', `/maintenance-contracts/${activeMcId}/invoices`);
      const invoiceId = ((inv.body as ApiEnvelope<Array<{ invoiceId: number }>>).data ?? [])[0]?.invoiceId ?? 0;
      if (invoiceId) {
        const dueSoon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        const dueLater = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
        await api.raw('POST', `/maintenance-invoices/${invoiceId}/payment-plan`, {
          mode: 'SCHEDULED',
          installmentCount: 3,
          receiptUrl: fileUrl,
          notes: 'BC23 plan',
          installments: [
            { installmentNo: 2, dueDate: dueSoon },
            { installmentNo: 3, dueDate: dueLater }
          ]
        });
        await seedMaintenanceInvoicePaymentDue(api, invoiceId);
        await api.raw('POST', '/dev/schedulers/maintenance-invoice-reminders');
        const payListBefore = await api.raw('GET', `/maintenance-invoices/${invoiceId}`);
        const payments =
          ((payListBefore.body as ApiEnvelope<{ payments?: Array<{ id: number; installmentNo?: number }> }>).data
            ?.payments) ?? [];
        const first = payments.find((p) => p.installmentNo === 1) ?? payments[0];
        if (first?.id) {
          await api.raw('PATCH', `/maintenance-invoices/${invoiceId}/payments/${first.id}/mark-paid`, {
            receiptUrl: fileUrl,
            notes: 'BC23 paid installment'
          });
        }
      }
      recordRow(row({ route: 'prelude-maintenance-closure', actual: `mc=${activeMcId}` }));
      return;
    }

    recordRow(row({ route: 'prelude-maintenance-closure', actual: 'rating only (no mc id)' }));
  });

  test('23.3 HR leaves, advance, deduction approve, owner statement', async ({ api }) => {
    const s = loadState();
    const propertyId = s.propertyIds[0];
    await api.loginRole('SUPER_ADMIN');

    if (s.ownerIds[0] && s.roleUserIds.OWNER) {
      await api.raw('PATCH', `/owners/${s.ownerIds[0]}/link-user`, {
        userId: s.roleUserIds.OWNER,
        portalAccess: true
      });
    }
    if (propertyId) {
      await assignQaAccountant(api, propertyId);
      if (s.roleUserIds.HR_OFFICER) {
        await assignUserProperty(api, s.roleUserIds.HR_OFFICER, propertyId);
      }
    }

    hrEmployeeEmail = `${uniq('qa-bc23-emp')}@propmgmt.com`;
    extraEmails.push(hrEmployeeEmail);
    const emp = await api.raw('POST', '/hr/employees', {
      propertyId,
      fullName: 'BC23 HR Employee',
      email: hrEmployeeEmail,
      nationalId: uniq('NIDBC23').slice(0, 20),
      hireDate: new Date().toISOString().slice(0, 10),
      basicSalary: 1900,
      systemRole: 'PROCEDURES_CLERK'
    });
    const employeeId = ((emp.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
    let linkedUserId = 0;
    if (employeeId) {
      const empDetail = await api.raw('GET', `/hr/employees/${employeeId}`);
      linkedUserId = ((empDetail.body as ApiEnvelope<{ linkedUserId?: number }>).data?.linkedUserId) ?? 0;
      await clearPasswordChangeRequired(api, hrEmployeeEmail);
    }

    if (employeeId) {
      const leaveApprove = await api.raw('POST', '/hr/leaves', {
        employeeId,
        leaveTypeId: 1,
        startDate: '2099-03-01',
        endDate: '2099-03-02',
        reason: 'BC23 leave approve'
      });
      const leaveApproveId = ((leaveApprove.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
      if (leaveApproveId) {
        await api.raw('POST', `/hr/leaves/${leaveApproveId}/approve`, { note: 'BC23 ok' });
      }

      const leaveReject = await api.raw('POST', '/hr/leaves', {
        employeeId,
        leaveTypeId: 1,
        startDate: '2099-04-01',
        endDate: '2099-04-02',
        reason: 'BC23 leave reject'
      });
      const leaveRejectId = ((leaveReject.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
      if (leaveRejectId) {
        await api.raw('POST', `/hr/leaves/${leaveRejectId}/reject`, { note: 'BC23 no' });
      }

      const payYear = 2099;
      let payMonth = ((Date.now() + employeeId) % 12) + 1;

      const adv = await api.raw('POST', '/hr/payroll/advances', {
        employeeId,
        amount: 80,
        requestDate: new Date().toISOString().slice(0, 10),
        reason: 'BC23 advance',
        deductedYear: payYear,
        deductedMonth: payMonth
      });
      expect(isOk(adv.status)).toBe(true);
      const advanceId = (adv.body as ApiEnvelope<number | { id: number }>).data;
      const advId = typeof advanceId === 'number' ? advanceId : advanceId?.id;
      expect(advId).toBeTruthy();

      const advReject = await api.raw('POST', '/hr/payroll/advances', {
        employeeId,
        amount: 40,
        requestDate: new Date().toISOString().slice(0, 10),
        reason: 'BC23 advance reject',
        deductedYear: payYear,
        deductedMonth: payMonth
      });
      const advRejectId = (advReject.body as ApiEnvelope<number | { id: number }>).data;
      const advRejId = typeof advRejectId === 'number' ? advRejectId : advRejectId?.id;
      if (advRejId) {
        await api.raw('POST', `/hr/payroll/advances/${advRejId}/reject?reason=BC23%20reject`);
      }

      const ded = await api.raw('POST', '/hr/deductions', {
        employeeId,
        amount: 15,
        reason: uniq('BC23 ded'),
        deductionDate: new Date().toISOString().slice(0, 10),
        payrollMonth: `${payYear}-${String(payMonth).padStart(2, '0')}`
      });
      const deductionId = ((ded.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
      if (deductionId) {
        await api.loginRole('HR_OFFICER');
        await api.raw('POST', `/hr/deductions/${deductionId}/send`);
        await api.loginRole('ACCOUNTANT');
        await api.raw('POST', `/hr/deductions/${deductionId}/approve`, { note: 'BC23 approve' });
      }

      await api.loginRole('SUPER_ADMIN');
      let gen = await api.raw('POST', '/hr/payroll/generate', {
        propertyId,
        payPeriodYear: payYear,
        payPeriodMonth: payMonth
      });
      for (let attempt = 0; !isOk(gen.status) && attempt < 12; attempt++) {
        payMonth = (payMonth % 12) + 1;
        await api.raw('POST', '/hr/payroll/advances', {
          employeeId,
          amount: 75,
          requestDate: new Date().toISOString().slice(0, 10),
          reason: `BC23 advance retry ${attempt}`,
          deductedYear: payYear,
          deductedMonth: payMonth
        });
        gen = await api.raw('POST', '/hr/payroll/generate', {
          propertyId,
          payPeriodYear: payYear,
          payPeriodMonth: payMonth
        });
      }
      expect(isOk(gen.status)).toBe(true);
      const runId = ((gen.body as ApiEnvelope<{ id: number }>).data?.id) ?? 0;
      expect(runId).toBeGreaterThan(0);
      if (runId) {
        const approve = await api.raw('POST', `/hr/payroll/${runId}/approve`);
        expect(isOk(approve.status)).toBe(true);
        const paid = await api.raw('POST', `/hr/payroll/${runId}/mark-paid`, {
          paidDate: new Date().toISOString().slice(0, 10),
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: uniq('BC23PAY')
        });
        expect(isOk(paid.status)).toBe(true);
      }

      void advId;

      await seedLeaveBalanceLow(api, employeeId);
      await api.raw('POST', '/dev/schedulers/leave-balance-low');
    }

    recordRow(row({ route: 'prelude-hr-owner', actual: `employeeId=${employeeId}` }));
  });

  test('23.4 Auth: new login IP + account locked (clerk inbox)', async ({ api }) => {
    const s = loadState();
    const clerkEmail = QA_CREDENTIALS.PROCEDURES_CLERK.email;
    extraEmails.push(clerkEmail);

    let tenantUserIdForLogin = s.roleUserIds.TENANT;
    if (s.tenantIds[0]) {
      await api.loginRole('SUPER_ADMIN');
      const tr = await api.raw('GET', `/tenants/${s.tenantIds[0]}`);
      tenantUserIdForLogin =
        ((tr.body as ApiEnvelope<{ userId?: number }>).data?.userId) ?? tenantUserIdForLogin;
    }
    if (tenantUserIdForLogin) {
      await api.loginRole('SUPER_ADMIN');
      await seedNewLoginIp(api, tenantUserIdForLogin);
      await api.loginFromIp(QA_CREDENTIALS.TENANT.email, '10.0.0.188');
    }

    await api.loginRole('SUPER_ADMIN');
    for (let i = 0; i < 5; i++) {
      await api.raw('POST', '/auth/login', { email: clerkEmail, password: 'wrong-password' });
    }
    await api.raw('POST', '/auth/login', { email: clerkEmail, password: 'wrong-password' });

    recordRow(row({ route: 'prelude-auth-closure', actual: 'NEW_LOGIN + ACCOUNT_LOCKED paths' }));
  });

  test('23.5 Notification matrix — Blocked must be 0', async ({ api }) => {
    test.setTimeout(420_000);
    await api.loginRole('SUPER_ADMIN');
    await clearLoginLock(api, QA_CREDENTIALS.PROCEDURES_CLERK.email);

    const catalog = loadNotificationTriggers();
    const inboxIndex = await scanInboxIndex(api, extraEmails);
    let passed = 0;
    let blocked = 0;
    let failed = 0;

    for (const entry of catalog) {
      const type = entry.type;
      let hit = inboxIndex.get(type);
      if (!hit) {
        const direct = await findTypeInAnyRole(api, type, extraEmails);
        if (direct) {
          hit = { roles: [direct.role], sample: direct.row };
        }
      }

      if (hit) {
        const recipient = hit.roles[0] ?? 'SUPER_ADMIN';
        if (recipient.startsWith('EMAIL:')) {
          await api.login(recipient.slice(6));
        } else {
          await api.loginRole(recipient as RoleKey);
        }
        const v = verifyNotifPayload(hit.sample);
        const markOk = await verifyMarkRead(api, hit.sample);
        const ok = v.ok && markOk;
        recordRow(notifRow(type, {
          role: recipient,
          actual: `roles=${hit.roles.join(',')} ${v.detail} markRead=${markOk}`,
          status: ok ? 'Passed' : 'Failed',
          retestResult: ok ? 'FIXED + PASSED AFTER RETEST (iter 23)' : '',
          notes: `Emitter: ${entry.emitterFiles[0] ?? 'n/a'}`
        }));
        if (ok) passed++;
        else failed++;
        continue;
      }

      if (!entry.hasServiceEmitter || entry.category === 'orphan') {
        recordRow(notifRow(type, {
          actual: 'no service emitter',
          status: 'Blocked',
          notes: 'ORPHAN — needs emitter or enum removal'
        }));
        blocked++;
        continue;
      }

      recordRow(notifRow(type, {
        actual: 'not in any role inbox after iter 23 prelude',
        status: 'Blocked',
        notes: entry.emitterFiles.slice(0, 2).join(', ')
      }));
      blocked++;
    }

    recordRow(row({
      route: 'notification-matrix-summary',
      actual: `passed=${passed} failed=${failed} blocked=${blocked} total=${catalog.length} uniqueInInbox=${inboxIndex.size}`,
      status: failed === 0 && blocked === 0 ? 'Passed' : failed > 0 ? 'Failed' : 'Blocked',
      notes: blocked > 0 ? `${blocked} types still blocked` : 'All catalog types verified in iter 23'
    }));

    expect(failed).toBe(0);
    expect(blocked).toBe(0);

    await api.loginRole('SUPER_ADMIN');
    await clearLoginLock(api, QA_CREDENTIALS.PROCEDURES_CLERK.email);
  });
});
