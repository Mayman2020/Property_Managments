import fs from 'node:fs';
import path from 'node:path';

/**
 * Shared mutable QA state — IDs of entities created by the bootstrap spec
 * (owners, properties, units, tenants, contracts, etc.) plus role->userId
 * resolution. Persisted under e2e/_qa/.state/qa-state.json so subsequent
 * `npx playwright test` invocations can reuse the seed without re-bootstrapping.
 */

export interface QaState {
  bootstrappedAt?: string;
  ownerIds: number[];
  propertyIds: number[];
  unitIdsByProperty: Record<number, number[]>;
  vacantUnitIds: number[];
  tenantIds: number[];
  tenantUnitIds: number[];
  /** First lease contract created by the onboarding bootstrap. */
  firstContractId?: number;
  /** First maintenance request created. */
  firstMaintenanceRequestId?: number;
  /** First inventory item created. */
  firstInventoryItemId?: number;
  /** First contractor company created (for MAINTENANCE_OFFICER_COMPANY). */
  firstContractorCompanyId?: number;
  /** First contract template id, if templates were seeded earlier in DB. */
  firstContractTemplateId?: number;
  /** Map of role -> created user id (SUPER_ADMIN excluded since pre-existing). */
  roleUserIds: Partial<Record<string, number>>;
  /** Map of role -> credential email of the user the bootstrap created. */
  roleEmails: Partial<Record<string, string>>;
  /** A neutral file URL (uploaded once) we can re-use as required attachment. */
  placeholderFileUrl?: string;
  /** Any blockers encountered during bootstrap so dependent specs can short-circuit. */
  blockers: string[];
}

const STATE_DIR = path.resolve(process.cwd(), 'e2e', '_qa', '.state');
const STATE_FILE = path.join(STATE_DIR, 'qa-state.json');

function ensureDir(): void {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function emptyState(): QaState {
  return {
    ownerIds: [],
    propertyIds: [],
    unitIdsByProperty: {},
    vacantUnitIds: [],
    tenantIds: [],
    tenantUnitIds: [],
    roleUserIds: {},
    roleEmails: {},
    blockers: []
  };
}

export function loadState(): QaState {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) return emptyState();
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    return emptyState();
  }
}

export function saveState(s: QaState): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

export function resetState(): void {
  saveState(emptyState());
}
