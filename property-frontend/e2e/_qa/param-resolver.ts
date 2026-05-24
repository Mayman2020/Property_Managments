import { QaApi } from './fixtures';
import { loadState, saveState, QaState } from './state';
import { RouteSpec } from './routes';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
}

interface PageEnv<T> {
  content: T[];
}

export interface ParamIds {
  contractId?: number;
  maintenanceId?: number;
  maintenanceContractId?: number;
  inspectionId?: number;
  vacancyId?: number;
  employeeId?: number;
  payrollRunId?: number;
  payslipId?: number;
  contractorId?: number;
}

function firstId<T extends { id: number }>(body: unknown): number | undefined {
  const page = (body as ApiEnvelope<PageEnv<T>>).data?.content;
  if (page?.[0]?.id) return page[0].id;
  const list = (body as ApiEnvelope<T[]>).data;
  if (Array.isArray(list) && list[0]?.id) return list[0].id;
  return undefined;
}

async function pageFirst(api: QaApi, path: string): Promise<number | undefined> {
  const r = await api.raw('GET', path);
  if (r.status !== 200) return undefined;
  return firstId<{ id: number }>(r.body);
}

async function maintenanceContractFirst(api: QaApi): Promise<number | undefined> {
  const r = await api.raw('GET', '/maintenance-contracts');
  if (r.status !== 200) return undefined;
  const data = (r.body as ApiEnvelope<Array<{ contractId?: number; id?: number }>>).data;
  const row = data?.[0];
  return row?.contractId ?? row?.id;
}

async function payslipFirst(api: QaApi): Promise<number | undefined> {
  for (const role of ['MAINTENANCE_OFFICER_INTERNAL', 'HR_OFFICER', 'PROCEDURES_CLERK', 'PROPERTY_GUARD', 'SUPER_ADMIN'] as const) {
    await api.loginRole(role);
    const r = await api.raw('GET', '/hr/payroll/my-payslips');
    if (r.status !== 200) continue;
    const list = (r.body as ApiEnvelope<Array<{ id: number }>>).data ?? [];
    if (list[0]?.id) return list[0].id;
  }
  await api.loginRole('SUPER_ADMIN');
  const payrollId = await pageFirst(api, '/hr/payroll?page=0&size=1');
  if (!payrollId) return undefined;
  const detail = await api.raw('GET', `/hr/payroll/${payrollId}`);
  if (detail.status !== 200) return undefined;
  const slips = (detail.body as ApiEnvelope<{ payslips?: Array<{ id: number }> }>).data?.payslips ?? [];
  return slips[0]?.id;
}

/** Discover entity ids from live APIs and persist into qa-state.json for later specs. */
export async function discoverParamIds(api: QaApi): Promise<ParamIds> {
  await api.loginRole('SUPER_ADMIN');
  const s = loadState();
  const ids: ParamIds = {};

  ids.contractId = s.firstContractId ?? (await pageFirst(api, '/contracts?page=0&size=1'));
  ids.maintenanceId = s.firstMaintenanceRequestId ?? (await pageFirst(api, '/maintenance/requests?page=0&size=1'));
  ids.maintenanceContractId = await maintenanceContractFirst(api);
  ids.contractorId = s.firstContractorCompanyId ?? (await pageFirst(api, '/contractor-companies?page=0&size=1'));
  ids.employeeId = await pageFirst(api, '/hr/employees?page=0&size=1');
  ids.payrollRunId = await pageFirst(api, '/hr/payroll?page=0&size=1');
  ids.vacancyId = await pageFirst(api, '/vacancies?page=0&size=1');

  if (ids.contractId) {
    const insp = await api.raw('GET', `/contracts/${ids.contractId}/inspections`);
    if (insp.status === 200) {
      const list = (insp.body as ApiEnvelope<Array<{ id: number }>>).data ?? [];
      ids.inspectionId = list[0]?.id;
    }
    if (!ids.inspectionId) {
      const created = await api.raw('POST', `/contracts/${ids.contractId}/inspections`, { type: 'MOVE_IN' });
      if (created.status === 200 || created.status === 201) {
        ids.inspectionId = (created.body as ApiEnvelope<{ id: number }>).data?.id;
      }
    }
  }

  ids.payslipId = await payslipFirst(api);

  await api.loginRole('SUPER_ADMIN');
  const patch: Partial<QaState> = {};
  if (ids.contractId) patch.firstContractId = ids.contractId;
  if (ids.maintenanceId) patch.firstMaintenanceRequestId = ids.maintenanceId;
  if (ids.contractorId) patch.firstContractorCompanyId = ids.contractorId;
  saveState({ ...s, ...patch });

  return ids;
}

export function resolveParamRoute(path: string, kind: RouteSpec['paramKind'], ids: ParamIds, s = loadState()): string | null {
  if (!kind) return path;

  const contractId = ids.contractId ?? s.firstContractId;
  const maintenanceId = ids.maintenanceId ?? s.firstMaintenanceRequestId;
  const contractorId = ids.contractorId ?? s.firstContractorCompanyId;

  switch (kind) {
    case 'contractId':
      if (path.includes('/contracts/maintenance/')) {
        return ids.maintenanceContractId ? path.replace(':id', String(ids.maintenanceContractId)) : null;
      }
      return contractId ? path.replace(':id', String(contractId)) : null;
    case 'maintenanceId':
      return maintenanceId ? path.replace(':id', String(maintenanceId)) : null;
    case 'contractorId':
      return contractorId ? path.replace(':id', String(contractorId)) : null;
    case 'inspectionId':
      return ids.inspectionId ? path.replace(':id', String(ids.inspectionId)) : null;
    case 'vacancyId':
      return ids.vacancyId ? path.replace(':id', String(ids.vacancyId)) : null;
    case 'employeeId':
      return ids.employeeId ? path.replace(':id', String(ids.employeeId)) : null;
    case 'payrollId':
      if (path.includes('/employee/my-payslips/')) {
        return ids.payslipId ? path.replace(':id', String(ids.payslipId)) : null;
      }
      return ids.payrollRunId ? path.replace(':id', String(ids.payrollRunId)) : null;
    default:
      return path;
  }
}
