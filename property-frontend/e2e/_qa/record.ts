import fs from 'node:fs';
import path from 'node:path';

export type QaStatus =
  | 'Passed'
  | 'Failed'
  | 'Fixed'
  | 'Retest'
  | 'Blocked'
  | 'To be verified during E2E testing';

export type QaSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface QaRow {
  iteration: number;
  module: string;
  route: string;
  role: string;
  permissionContext: string;
  scenario: string;
  steps: string;
  testData: string;
  expected: string;
  actual: string;
  severity: QaSeverity;
  status: QaStatus;
  bugSummary: string;
  filesChanged: string;
  retestResult: string;
  notes: string;
  timestamp?: string;
}

/**
 * Resolve the workspace-root docs/stabilization/qa-results folder.
 *
 * Playwright runs from `property-frontend/`; the workspace root is its parent.
 * Override via env QA_RESULTS_DIR if needed.
 */
function resultsDir(): string {
  const fromEnv = process.env['QA_RESULTS_DIR'];
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  // playwright config lives in property-frontend; cwd is also property-frontend.
  return path.resolve(process.cwd(), '..', 'docs', 'stabilization', 'qa-results');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function jsonlFile(iteration: number): string {
  const dir = resultsDir();
  ensureDir(dir);
  return path.join(dir, `iteration-${String(iteration).padStart(2, '0')}.jsonl`);
}

/**
 * Append a single QA row to the per-iteration JSONL log. Always returns even
 * if disk writes fail (we never want logging itself to break a test).
 */
export function recordRow(row: QaRow): void {
  try {
    const stamped: QaRow = { ...row, timestamp: row.timestamp ?? new Date().toISOString() };
    const line = JSON.stringify(stamped);
    fs.appendFileSync(jsonlFile(row.iteration), line + '\n', { encoding: 'utf8' });
  } catch (err) {
    // Last-resort log so we know logging itself is broken.
    // eslint-disable-next-line no-console
    console.error('[qa] recordRow failed:', err);
  }
}

/**
 * Clear the JSONL file for a given iteration. Call this from a single
 * top-level `beforeAll` per iteration so re-runs do not append duplicates.
 */
export function resetIterationLog(iteration: number): void {
  try {
    const file = jsonlFile(iteration);
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, '', { encoding: 'utf8' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[qa] resetIterationLog failed:', err);
  }
}
