/**
 * QA data helpers via dev-only API (SUPER_ADMIN). Falls back when psql is unavailable.
 */
interface RawApi {
  raw(method: 'POST', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
}

export async function seedBudgetRow(api: RawApi, propertyId: number, categoryId: number, budgetedAmount: number): Promise<void> {
  const r = await api.raw('POST', '/dev/qa/seed-budget', {
    propertyId,
    categoryId,
    budgetedAmount
  });
  if (r.status !== 200) {
    throw new Error(`seed-budget failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function forceContractEndDatePast(api: RawApi, contractId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/contracts/${contractId}/force-end-date-past`);
  if (r.status !== 200) {
    throw new Error(`force-end-date-past failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedContractExpiringSoon(api: RawApi, contractId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/contracts/${contractId}/seed-expiring-soon`);
  if (r.status !== 200) {
    throw new Error(`seed-expiring-soon failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedRentDue(api: RawApi, contractId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/contracts/${contractId}/seed-rent-due`);
  if (r.status !== 200) {
    throw new Error(`seed-rent-due failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedRentOverdue(api: RawApi, contractId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/contracts/${contractId}/seed-rent-overdue`);
  if (r.status !== 200) {
    throw new Error(`seed-rent-overdue failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedDocumentExpiry(api: RawApi, propertyId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/properties/${propertyId}/seed-document-expiry`);
  if (r.status !== 200) {
    throw new Error(`seed-document-expiry failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedLowStock(api: RawApi, propertyId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/properties/${propertyId}/seed-low-stock`);
  if (r.status !== 200) {
    throw new Error(`seed-low-stock failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedLeaveBalanceLow(api: RawApi, employeeId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/employees/${employeeId}/seed-leave-balance-low`);
  if (r.status !== 200) {
    throw new Error(`seed-leave-balance-low failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedNewLoginIp(api: RawApi, userId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/users/${userId}/seed-new-login-ip`);
  if (r.status !== 200) {
    throw new Error(`seed-new-login-ip failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function clearPasswordChangeRequired(api: RawApi, email: string): Promise<void> {
  const r = await api.raw('POST', '/dev/qa/users/clear-password-change-required', { email });
  if (r.status !== 200) {
    throw new Error(`clear-password-change-required failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function clearLoginLock(api: RawApi, email: string): Promise<void> {
  const r = await api.raw('POST', '/dev/qa/users/clear-login-lock', { email });
  if (r.status !== 200) {
    throw new Error(`clear-login-lock failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function assignUserProperty(api: RawApi, userId: number, propertyId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/users/${userId}/assign-property`, { propertyId });
  if (r.status !== 200) {
    throw new Error(`assign-property failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function unpublishVacancyForUnit(api: RawApi, unitId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/units/${unitId}/unpublish-vacancy`);
  if (r.status !== 200) {
    throw new Error(`unpublish-vacancy failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedRentGraceEscalation(api: RawApi, contractId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/contracts/${contractId}/seed-rent-grace-escalation`);
  if (r.status !== 200) {
    throw new Error(`seed-rent-grace-escalation failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

export async function seedMaintenanceInvoicePaymentDue(api: RawApi, invoiceId: number): Promise<void> {
  const r = await api.raw('POST', `/dev/qa/maintenance-invoices/${invoiceId}/seed-payment-due`);
  if (r.status !== 200) {
    throw new Error(`seed-payment-due failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
}
