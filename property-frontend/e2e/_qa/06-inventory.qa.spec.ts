/**
 * Iteration 6 — Inventory items, stock transactions, low-stock reconciliation.
 *
 *   InventoryItemEntity.quantity is the single source of truth. It is mutated
 *   only by:
 *     - InventoryService.create()           (initial value)
 *     - InventoryService.adjustStock()      (POST /inventory/{id}/stock and /inventory/transactions, type=IN|OUT)
 *     - MaintenanceRequestService.submitVisitReport()  → adjustStock(OUT) per visit-report item
 *
 *   DB constraints:
 *     - inventory_items.quantity >= 0
 *     - inventory_transactions.transaction_type IN ('IN','OUT')
 *     - inventory_transactions.quantity > 0
 *
 *   Low-stock rule: item.quantity <= item.minQuantity. Surfaced via:
 *     GET /inventory/low-stock and GET /inventory/low-stock/property/{propertyId}.
 *
 *   Iteration 5 (test 5.8) already verified the visit-report → OUT deduction
 *   path. This spec reconciles the low-stock listing with that path so that
 *   stock driven below the threshold by maintenance work is reflected in the
 *   alert surface.
 */

import { test, expect } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadState } from './state';

const ITER = 6;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'inventory',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'inventory.*',
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

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; errorCode?: string; message?: string; }

interface InventoryItem {
  id: number;
  propertyId?: number;
  itemCode?: string;
  itemNameAr?: string;
  itemNameEn?: string;
  unitOfMeasure?: string;
  quantity?: number | string;
  minQuantity?: number | string;
  location?: string;
  lowStock?: boolean;
  active?: boolean;
}

interface InventoryTransaction {
  id: number;
  itemId?: number;
  transactionType?: string;
  quantity?: number | string;
  notes?: string;
  requestId?: number | null;
}

interface PageEnv<T> { content: T[]; totalElements?: number; }

interface RawApi {
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  loginRole(role: string): Promise<string>;
  login(email: string, password?: string): Promise<string>;
}

const toNum = (v: number | string | undefined | null): number => Number(v ?? 0);

async function createItem(api: RawApi, propertyId: number, tag: string, opts: Partial<{ quantity: number; minQuantity: number; unit: string }> = {}): Promise<InventoryItem> {
  const body = {
    propertyId,
    itemCode: `QA-${tag}`,
    itemNameAr: `صنف ${tag}`,
    itemNameEn: `Item ${tag}`,
    unitOfMeasure: opts.unit ?? 'pcs',
    quantity: opts.quantity ?? 10,
    minQuantity: opts.minQuantity ?? 2,
    location: 'QA-LAB'
  };
  const r = await api.raw('POST', '/inventory', body);
  if (!isOk(r.status)) throw new Error(`create item failed: ${r.status} ${JSON.stringify(r.body)}`);
  return (r.body as ApiEnvelope<InventoryItem>).data!;
}

async function getItem(api: RawApi, id: number): Promise<InventoryItem> {
  const r = await api.raw('GET', `/inventory/${id}`);
  return ((r.body as ApiEnvelope<InventoryItem>).data) ?? { id };
}

test.describe.serial('Iteration 6 — Inventory + low-stock', () => {
  test('6.20 inventory CRUD: create → list → get → update metadata (no quantity drift) → soft delete', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('CRUD');
    const created = await createItem(api as RawApi, propertyId, tag, { quantity: 17, minQuantity: 3 });
    const list = await api.raw('GET', `/inventory/property/${propertyId}?size=200`);
    const items = ((list.body as ApiEnvelope<PageEnv<InventoryItem>>).data?.content) ?? [];
    const found = items.some((i) => i.id === created.id);

    const upd = await api.raw('PUT', `/inventory/${created.id}`, {
      propertyId,
      itemCode: created.itemCode,
      itemNameAr: `${created.itemNameAr ?? ''} ✎`,
      itemNameEn: `${created.itemNameEn ?? ''} (updated)`,
      unitOfMeasure: 'pcs',
      minQuantity: 5,
      location: 'QA-LAB-2'
    });
    const afterUpd = await getItem(api as RawApi, created.id);

    const del = await api.raw('DELETE', `/inventory/${created.id}`);
    const afterDel = await api.raw('GET', `/inventory/${created.id}`);

    const passed =
      created.id != null &&
      found &&
      isOk(upd.status) &&
      toNum(afterUpd.quantity) === 17 &&
      toNum(afterUpd.minQuantity) === 5 &&
      afterUpd.itemNameEn?.includes('(updated)') &&
      del.status === 200 &&
      afterDel.status === 404;

    recordRow(row({
      route: 'POST/GET/PUT/DELETE /inventory',
      scenario:
        'Create → list-by-property → update (rename/minQty/location only) → soft delete (active=false, GET 404). Update intentionally does NOT mutate quantity so manual edits cannot drift stock off the transaction ledger.',
      steps:
        'POST /inventory; GET /inventory/property/{id}; PUT /inventory/{id} (metadata only); DELETE /inventory/{id}; GET /inventory/{id}',
      testData: `itemId=${created.id} propertyId=${propertyId}`,
      expected:
        '201/200 on create; item appears in property list; PUT 200 with quantity unchanged (17) and minQuantity=5; DELETE 200; subsequent GET 404',
      actual:
        `created=${created.id} found=${found} upd=${upd.status} qty=${afterUpd.quantity} min=${afterUpd.minQuantity} name=${afterUpd.itemNameEn} del=${del.status} getAfter=${afterDel.status}`,
      status: passed ? 'Passed' : 'Failed'
    }));
    expect(passed).toBe(true);
  });

  test('6.21 stock IN via POST /inventory/{id}/stock increments quantity and records an IN transaction', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('IN');
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 5, minQuantity: 1 });
    const r = await api.raw('POST', `/inventory/${item.id}/stock`, {
      type: 'IN',
      quantity: 3,
      notes: 'QA stock-in'
    });
    const after = await getItem(api as RawApi, item.id);
    const tx = await api.raw('GET', `/inventory/transactions?itemId=${item.id}&size=10`);
    const rows = ((tx.body as ApiEnvelope<PageEnv<InventoryTransaction>>).data?.content) ?? [];
    const inRow = rows.find((row) => row.transactionType === 'IN' && toNum(row.quantity) === 3);
    recordRow(row({
      route: 'POST /inventory/{id}/stock',
      scenario: 'adjustStock(type=IN) increments item.quantity and persists an InventoryTransaction (type=IN, quantity, notes)',
      steps: `POST /inventory/${item.id}/stock {type:IN, quantity:3, notes:"QA stock-in"} → GET /inventory/${item.id} → GET /inventory/transactions?itemId=${item.id}`,
      testData: `itemId=${item.id} startQty=5`,
      expected: 'HTTP 200; quantity=8; transactions has IN row of qty=3',
      actual: `status=${r.status} qty=${after.quantity} hasIN=${Boolean(inRow)}`,
      status: r.status === 200 && toNum(after.quantity) === 8 && Boolean(inRow) ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(toNum(after.quantity)).toBe(8);
    expect(inRow).toBeTruthy();
  });

  test('6.22 stock OUT via POST /inventory/{id}/stock decrements quantity and records an OUT transaction; insufficient stock is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('OUT');
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 4, minQuantity: 1 });
    const ok = await api.raw('POST', `/inventory/${item.id}/stock`, { type: 'OUT', quantity: 3, notes: 'QA stock-out' });
    const afterOk = await getItem(api as RawApi, item.id);
    const tooMuch = await api.raw('POST', `/inventory/${item.id}/stock`, { type: 'OUT', quantity: 10, notes: 'QA over-withdraw' });
    const afterTooMuch = await getItem(api as RawApi, item.id);
    recordRow(row({
      route: 'POST /inventory/{id}/stock (OUT)',
      scenario:
        'adjustStock(type=OUT) decrements item.quantity when available stock >= request. Over-withdraw returns 400 "Insufficient stock. Available: X" and item.quantity is unchanged.',
      steps:
        `POST OUT qty=3 (from 4 → 1) → POST OUT qty=10 (insufficient — rejected, qty stays 1)`,
      testData: `itemId=${item.id}`,
      expected: 'first OUT → 200, qty=1; over-withdraw → 400; qty still 1',
      actual: `ok=${ok.status} qtyAfter=${afterOk.quantity} over=${tooMuch.status} qtyAfterOver=${afterTooMuch.quantity}`,
      status: ok.status === 200 && toNum(afterOk.quantity) === 1 && tooMuch.status === 400 && toNum(afterTooMuch.quantity) === 1 ? 'Passed' : 'Failed'
    }));
    expect(ok.status).toBe(200);
    expect(toNum(afterOk.quantity)).toBe(1);
    expect(tooMuch.status).toBe(400);
    expect(toNum(afterTooMuch.quantity)).toBe(1);
  });

  test('6.23 stock adjustment with quantity <= 0 is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('NEG');
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 5 });
    const zero = await api.raw('POST', `/inventory/${item.id}/stock`, { type: 'IN', quantity: 0, notes: 'zero' });
    const negative = await api.raw('POST', `/inventory/${item.id}/stock`, { type: 'IN', quantity: -1, notes: 'neg' });
    recordRow(row({
      route: 'POST /inventory/{id}/stock (quantity <= 0)',
      scenario:
        'StockTransactionRequestDTO.quantity is @NotNull @DecimalMin("0.01"); zero or negative quantities must be rejected before they reach adjustStock.',
      steps: `POST quantity=0 → POST quantity=-1`,
      testData: `itemId=${item.id}`,
      expected: 'both calls return HTTP 400',
      actual: `zero=${zero.status} neg=${negative.status}`,
      status: zero.status === 400 && negative.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(zero.status).toBe(400);
    expect(negative.status).toBe(400);
  });

  test('6.24 POST /inventory/transactions (bulk DTO) is functionally equivalent to POST /inventory/{id}/stock', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('BULK');
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 4, minQuantity: 1 });
    const r = await api.raw('POST', `/inventory/transactions`, {
      itemId: item.id,
      transactionType: 'IN',
      quantity: 2,
      notes: 'QA bulk-in'
    });
    const after = await getItem(api as RawApi, item.id);
    recordRow(row({
      route: 'POST /inventory/transactions',
      scenario: 'BulkTransactionRequestDTO maps to StockTransactionRequestDTO and runs the same adjustStock pipeline.',
      steps: `POST /inventory/transactions {itemId:${item.id}, transactionType:"IN", quantity:2} → GET /inventory/${item.id}`,
      testData: `itemId=${item.id}`,
      expected: '200/201; quantity goes 4 → 6',
      actual: `status=${r.status} qty=${after.quantity}`,
      status: isOk(r.status) && toNum(after.quantity) === 6 ? 'Passed' : 'Failed'
    }));
    expect(isOk(r.status)).toBeTruthy();
    expect(toNum(after.quantity)).toBe(6);
  });

  test('6.25 low-stock surface: GET /inventory/low-stock and /inventory/low-stock/property/{id} include items where quantity <= minQuantity', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const tag = uniq('LOW');
    // Create the item already at the threshold (quantity = minQuantity → lowStock=true).
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 1, minQuantity: 2 });
    const all = await api.raw('GET', '/inventory/low-stock');
    const byProp = await api.raw('GET', `/inventory/low-stock/property/${propertyId}`);
    const inAll = (((all.body as ApiEnvelope<InventoryItem[]>).data) ?? []).some((i) => i.id === item.id);
    const inProp = (((byProp.body as ApiEnvelope<InventoryItem[]>).data) ?? []).some((i) => i.id === item.id);
    recordRow(row({
      route: 'GET /inventory/low-stock + /inventory/low-stock/property/{id}',
      scenario: 'isLowStock() is computed as quantity.compareTo(minQuantity) <= 0; both surfaces return the threshold-breaching item.',
      steps: `create item qty=1 min=2 → GET /inventory/low-stock → GET /inventory/low-stock/property/${propertyId}`,
      testData: `itemId=${item.id} qty=1 min=2`,
      expected: 'both lists contain the item id',
      actual: `inGlobal=${inAll} inProperty=${inProp}`,
      status: inAll && inProp ? 'Passed' : 'Failed'
    }));
    expect(inAll).toBe(true);
    expect(inProp).toBe(true);
  });

  test('6.26 low-stock surface reconciled with maintenance: visit-report items[] OUT that drives quantity below minQuantity makes the item appear in low-stock', async ({ api }) => {
    // Reuse the same path 5.8 takes, but compose it ourselves so we can assert the low-stock side-effect.
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const unitId = s.unitIdsByProperty[String(propertyId)][0];
    const tenantId = s.tenantIds[0];
    const officerId = s.roleUserIds['MAINTENANCE_OFFICER_INTERNAL'] as number;
    const tag = uniq('RECON');
    const item = await createItem(api as RawApi, propertyId, tag, { quantity: 5, minQuantity: 3 });

    await api.raw('POST', `/properties/${propertyId}/maintenance-assignments`, { providerType: 'USER', userId: officerId, isPrimary: true });
    const req = await api.raw('POST', '/maintenance/requests', {
      propertyId, unitId, tenantId,
      title: `Recon-${tag}`, description: 'visit-report consumes stock', priority: 'NORMAL'
    });
    if (!isOk(req.status)) throw new Error(`create request failed: ${req.status} ${JSON.stringify(req.body)}`);
    const reqBody = (req.body as ApiEnvelope<{ id: number; status?: string }>).data!;
    if (reqBody.status === 'PENDING') {
      await api.raw('PATCH', `/maintenance/requests/${reqBody.id}/assign`, { officerId });
    }
    await api.raw('PATCH', `/maintenance/requests/${reqBody.id}/schedule`, { scheduledDate: '2026-06-06' });
    await api.raw('PATCH', `/maintenance/requests/${reqBody.id}/start`);
    const vr = await api.raw('POST', `/maintenance/requests/${reqBody.id}/visit-report`, {
      visitDate: '2026-06-06',
      visitOutcome: 'COMPLETED',
      officerNotes: 'consumed 3 units from QA item',
      hasPurchase: false,
      items: [{ itemId: item.id, quantityUsed: 3, notes: 'consumed' }]
    });
    const after = await getItem(api as RawApi, item.id);
    const low = await api.raw('GET', `/inventory/low-stock/property/${propertyId}`);
    const inLow = (((low.body as ApiEnvelope<InventoryItem[]>).data) ?? []).some((i) => i.id === item.id);
    const tx = await api.raw('GET', `/inventory/transactions?itemId=${item.id}&size=10`);
    const txRows = (((tx.body as ApiEnvelope<PageEnv<InventoryTransaction>>).data?.content) ?? []);
    const outRowTagged = txRows.find((row) => row.transactionType === 'OUT' && toNum(row.quantity) === 3 && row.requestId === reqBody.id);

    const passed =
      isOk(vr.status) &&
      toNum(after.quantity) === 2 &&
      after.lowStock === true &&
      inLow &&
      Boolean(outRowTagged);

    recordRow(row({
      route: 'visit-report items[] → low-stock listing',
      scenario:
        'MaintenanceRequestService.submitVisitReport iterates visit-report items[] and calls InventoryService.adjustStock(OUT, quantity, requestId=request.id) for each one. Items whose new quantity falls below minQuantity must surface immediately in GET /inventory/low-stock.',
      steps:
        `Create item qty=5 min=3 → ensure assignment → create request → schedule → start → POST visit-report items=[{itemId,quantityUsed:3}] → GET /inventory/{id} → GET /inventory/low-stock/property/{propertyId}`,
      testData: `itemId=${item.id} requestId=${reqBody.id}`,
      expected:
        'visit-report 200/201; item.quantity=2; item.lowStock=true; low-stock list contains the item; transaction ledger has OUT qty=3 tagged with requestId.',
      actual:
        `vr=${vr.status} qty=${after.quantity} lowStock=${after.lowStock} inLow=${inLow} hasOutTagged=${Boolean(outRowTagged)}`,
      status: passed ? 'Passed' : 'Failed'
    }));
    expect(passed).toBe(true);
  });

  test('6.27 inventory validation: POST /inventory without itemCode or itemNameAr is rejected (400)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const s = loadState();
    const propertyId = s.propertyIds[0];
    const r = await api.raw('POST', '/inventory', {
      propertyId,
      itemNameEn: 'No code or AR name',
      quantity: 1, minQuantity: 0
    });
    recordRow(row({
      route: 'POST /inventory (missing required fields)',
      scenario: 'InventoryItemRequestDTO requires itemCode and itemNameAr (@NotBlank) — empty payload must be rejected with 400.',
      steps: 'POST /inventory {propertyId, itemNameEn} (no itemCode, no itemNameAr)',
      testData: `propertyId=${propertyId}`,
      expected: 'HTTP 400',
      actual: `status=${r.status}`,
      status: r.status === 400 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(400);
  });

  test('6.28 GET /inventory pageable surface is reachable as SUPER_ADMIN; ACCOUNTANT also gets 200 (no module read gate)', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const admin = await api.raw('GET', '/inventory?page=0&size=5');
    await api.loginRole('ACCOUNTANT');
    const accountant = await api.raw('GET', '/inventory?page=0&size=5');
    recordRow(row({
      route: 'GET /inventory (paged)',
      scenario:
        'No @PreAuthorize on the controller class — any authenticated role can read the paged list. Owner scope still applies via OwnerPropertyAccessService for OWNER.',
      steps: 'GET as SUPER_ADMIN; GET as ACCOUNTANT',
      testData: '-',
      expected: 'both return HTTP 200',
      actual: `admin=${admin.status} accountant=${accountant.status}`,
      status: admin.status === 200 && accountant.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(admin.status).toBe(200);
    expect(accountant.status).toBe(200);
  });
});
