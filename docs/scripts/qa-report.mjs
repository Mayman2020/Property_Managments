#!/usr/bin/env node
/**
 * Read every iteration JSONL log under docs/stabilization/qa-results/ and
 * emit docs/stabilization/qa-report.xlsx using the xlsx package already
 * installed in property-frontend/node_modules.
 *
 * Sheets:
 *   Cases           — all raw rows (audit trail)
 *   EffectiveStatus — deduped by fingerprint; highest iteration wins
 *   Summary         — metrics from EffectiveStatus + raw counts
 *
 * Usage:
 *   node docs/scripts/qa-report.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.resolve(REPO_ROOT, 'docs', 'stabilization', 'qa-results');
const REPORT_PATH = process.env['QA_REPORT_PATH']
  ? path.resolve(process.env['QA_REPORT_PATH'])
  : path.resolve(REPO_ROOT, 'docs', 'stabilization', 'qa-report.xlsx');
const XLSX_DIR = path.resolve(REPO_ROOT, 'property-frontend', 'node_modules', 'xlsx');

if (!fs.existsSync(RESULTS_DIR)) {
  console.error(`[qa-report] no results dir at ${RESULTS_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(XLSX_DIR)) {
  console.error('[qa-report] xlsx package not found. Run npm install in property-frontend first.');
  process.exit(2);
}

const XLSX = (await import(url.pathToFileURL(path.join(XLSX_DIR, 'xlsx.mjs')).href)).default
  ?? (await import(url.pathToFileURL(path.join(XLSX_DIR, 'xlsx.mjs')).href));

const HEADER = [
  'Iteration',
  'Module',
  'Screen/route',
  'Role',
  'Permission/module setting context',
  'Test scenario',
  'Steps performed',
  'Test data created',
  'Expected result',
  'Actual result',
  'Severity',
  'Status',
  'Bug summary',
  'Files changed for fixes',
  'Retest result',
  'Notes/gaps',
  'Timestamp'
];

const EFFECTIVE_HEADER = [
  ...HEADER,
  'Supersession',
  'Source iterations'
];

const COL_MAP = {
  iteration: 0,
  module: 1,
  route: 2,
  role: 3,
  permissionContext: 4,
  scenario: 5,
  steps: 6,
  testData: 7,
  expected: 8,
  actual: 9,
  severity: 10,
  status: 11,
  bugSummary: 12,
  filesChanged: 13,
  retestResult: 14,
  notes: 15,
  timestamp: 16
};

/** Normalize route for fingerprinting (strip numeric ids). */
function normalizeRoute(route) {
  if (!route) return '';
  return String(route)
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '')
    .trim()
    .toLowerCase();
}

function normalizeScenario(s) {
  if (!s) return '';
  return String(s).slice(0, 120).trim().toLowerCase();
}

function fingerprint(r) {
  const route = normalizeRoute(r.route);
  const module = String(r.module ?? '').toLowerCase();
  const role = String(r.role ?? '').toUpperCase();
  // NotificationType.* rows dedupe by type only (scenario varies per trigger run).
  if (route.startsWith('notificationtype.')) {
    return [module, route, 'ANY', 'notification-coverage'].join('|');
  }
  return [module, route, role, normalizeScenario(r.scenario)].join('|');
}

function readAllRows() {
  const rows = [];
  for (const f of fs.readdirSync(RESULTS_DIR).sort()) {
    if (!f.endsWith('.jsonl')) continue;
    const full = path.join(RESULTS_DIR, f);
    const raw = fs.readFileSync(full, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        rows.push(JSON.parse(t));
      } catch (err) {
        console.warn(`[qa-report] skipping malformed JSONL in ${f}: ${err.message}`);
      }
    }
  }
  return rows;
}

function toAoa(rows, extraCols = null) {
  const hdr = extraCols ? EFFECTIVE_HEADER : HEADER;
  const aoa = [hdr];
  for (const r of rows) {
    const out = new Array(hdr.length).fill('');
    for (const [k, idx] of Object.entries(COL_MAP)) {
      const v = r[k];
      out[idx] = v == null ? '' : String(v);
    }
    if (extraCols) {
      out[17] = r._supersession ?? '';
      out[18] = r._sourceIterations ?? '';
    }
    aoa.push(out);
  }
  return aoa;
}

/** Dedupe: highest iteration wins; tie-break by latest timestamp. */
function buildEffectiveRows(allRows) {
  const groups = new Map();
  for (const r of allRows) {
    const fp = fingerprint(r);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(r);
  }

  const effective = [];
  for (const [, group] of groups) {
    group.sort((a, b) => {
      const ia = Number(a.iteration) || 0;
      const ib = Number(b.iteration) || 0;
      if (ib !== ia) return ib - ia;
      return String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''));
    });
    const winner = { ...group[0] };
    const older = group.slice(1);
    if (older.length > 0) {
      const superseded = older
        .filter((o) => o.status !== winner.status || o.iteration !== winner.iteration)
        .map((o) => `iter${o.iteration}:${o.status}`)
        .slice(0, 5)
        .join('; ');
      if (superseded) {
        winner._supersession = `supersedes ${superseded}`;
      }
    }
    winner._sourceIterations = group.map((g) => g.iteration).join(',');
    effective.push(winner);
  }
  effective.sort((a, b) => {
    const ia = Number(a.iteration) || 0;
    const ib = Number(b.iteration) || 0;
    if (ia !== ib) return ia - ib;
    return String(a.module).localeCompare(String(b.module));
  });
  return effective;
}

function countByStatus(rows) {
  const byStatus = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  return byStatus;
}

function buildSummary(rawRows, effectiveRows) {
  const rawByStatus = countByStatus(rawRows);
  const effByStatus = countByStatus(effectiveRows);
  const byModule = {};
  const bySeverity = {};

  for (const r of effectiveRows) {
    byModule[r.module] = byModule[r.module] || { total: 0, passed: 0, failed: 0, fixed: 0, blocked: 0, deferred: 0 };
    byModule[r.module].total++;
    if (r.status === 'Passed') byModule[r.module].passed++;
    else if (r.status === 'Failed') byModule[r.module].failed++;
    else if (r.status === 'Fixed') byModule[r.module].fixed++;
    else if (r.status === 'Blocked') byModule[r.module].blocked++;
    else if (r.status === 'To be verified during E2E testing') byModule[r.module].deferred++;
    if (r.severity) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  }

  const effTotal = effectiveRows.length;
  const effPassed = effByStatus['Passed'] || 0;
  const readiness = effTotal > 0 ? ((effPassed / effTotal) * 100).toFixed(1) : '0';

  const sum = [
    ['QA Report Summary', new Date().toISOString()],
    [],
    ['Production readiness (EffectiveStatus)', `${readiness}%`],
    ['Effective unique test cases', effTotal],
    ['Raw JSONL rows (audit trail)', rawRows.length],
    [],
    ['Effective status counts (used for readiness)'],
    ...Object.entries(effByStatus).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v]),
    [],
    ['Raw status counts (historical, includes superseded)'],
    ...Object.entries(rawByStatus).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v]),
    [],
    ['By severity (effective)'],
    ...Object.entries(bySeverity).map(([k, v]) => [k, v]),
    [],
    ['By module (effective)', 'Total', 'Passed', 'Failed', 'Fixed', 'Blocked', 'Deferred'],
    ...Object.entries(byModule)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => [k, v.total, v.passed, v.failed, v.fixed, v.blocked, v.deferred])
  ];
  return sum;
}

const rows = readAllRows();
const effectiveRows = buildEffectiveRows(rows);
const aoa = toAoa(rows);
const effAoa = toAoa(effectiveRows, true);
const summary = buildSummary(rows, effectiveRows);

const wb = XLSX.utils.book_new();
const wsCases = XLSX.utils.aoa_to_sheet(aoa);
wsCases['!cols'] = HEADER.map((_, i) => ({ wch: [6, 16, 36, 22, 28, 40, 60, 32, 36, 60, 10, 14, 40, 40, 28, 32, 22][i] || 20 }));
XLSX.utils.book_append_sheet(wb, wsCases, 'Cases');

const wsEffective = XLSX.utils.aoa_to_sheet(effAoa);
wsEffective['!cols'] = EFFECTIVE_HEADER.map((_, i) => ({ wch: [6, 16, 36, 22, 28, 40, 60, 32, 36, 60, 10, 14, 40, 40, 28, 32, 22, 36, 16][i] || 20 }));
XLSX.utils.book_append_sheet(wb, wsEffective, 'EffectiveStatus');

const wsSummary = XLSX.utils.aoa_to_sheet(summary);
XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, buf);
console.log(`[qa-report] wrote ${rows.length} raw rows, ${effectiveRows.length} effective -> ${REPORT_PATH}`);
