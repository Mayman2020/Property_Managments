#!/usr/bin/env node
/**
 * Build final coverage matrices from qa-results JSONL + inventories.
 * Output: docs/stabilization/final-coverage-report.md
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RESULTS = path.resolve(ROOT, 'docs', 'stabilization', 'qa-results');
const OUT = path.resolve(ROOT, 'docs', 'stabilization', 'final-coverage-report.md');

function normRoute(r) {
  return String(r || '')
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '')
    .trim()
    .toLowerCase();
}

function normScenario(s) {
  return String(s || '').slice(0, 120).trim().toLowerCase();
}

function fingerprint(r) {
  const route = normRoute(r.route);
  const module = String(r.module ?? '').toLowerCase();
  const role = String(r.role ?? '').toUpperCase();
  if (route.startsWith('notificationtype.')) {
    return [module, route, 'ANY', 'notification-coverage'].join('|');
  }
  return [module, route, role, normScenario(r.scenario)].join('|');
}

function readAll() {
  const rows = [];
  for (const f of fs.readdirSync(RESULTS).sort()) {
    if (!f.endsWith('.jsonl')) continue;
    for (const line of fs.readFileSync(path.join(RESULTS, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch {
        /* skip */
      }
    }
  }
  return rows;
}

function effective(rows) {
  const g = new Map();
  for (const r of rows) {
    const fp = fingerprint(r);
    if (!g.has(fp)) g.set(fp, []);
    g.get(fp).push(r);
  }
  const out = [];
  for (const list of g.values()) {
    list.sort(
      (a, b) =>
        (Number(b.iteration) || 0) - (Number(a.iteration) || 0) ||
        String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''))
    );
    out.push(list[0]);
  }
  return out;
}

const rows = readAll();
const eff = effective(rows);
const counts = {};
for (const r of eff) counts[r.status] = (counts[r.status] || 0) + 1;

const notif = eff.filter((r) => String(r.route).startsWith('NotificationType.'));
const notifPassed = notif.filter((r) => r.status === 'Passed').length;
const notifBlocked = notif.filter((r) => r.status === 'Blocked').length;

const triggers = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, 'docs/stabilization/inventories/notification-triggers.json'), 'utf8')
);
const routes = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, 'docs/stabilization/inventories/frontend-routes.json'), 'utf8')
);

let md = `# Final Production Readiness Report\n\nGenerated: ${new Date().toISOString()}\n\n`;
md += `## 1. Final coverage summary\n\n`;
md += `| Metric | Count |\n| --- | ---: |\n`;
md += `| Raw JSONL rows | ${rows.length} |\n`;
md += `| Effective unique cases | ${eff.length} |\n`;
for (const [k, v] of Object.entries(counts).sort()) {
  md += `| ${k} | ${v} |\n`;
}
const readiness = eff.length ? (((counts.Passed || 0) / eff.length) * 100).toFixed(1) : '0';
md += `| Production readiness | ${readiness}% |\n\n`;

md += `## 2. Notification coverage matrix\n\n`;
md += `| NotificationType | Generated | Recipient | Deep link | Read | Status |\n`;
md += `| --- | --- | --- | --- | --- | --- |\n`;
for (const t of (triggers.types ?? triggers).sort((a, b) => a.type.localeCompare(b.type))) {
  const r =
    eff.find((x) => x.route === `NotificationType.${t.type}`) ??
    eff.find((x) => String(x.route).includes(t.type));
  const st = r?.status ?? 'Not tested';
  const gen = st === 'Passed' ? 'Y' : st === 'Blocked' && !t.hasServiceEmitter ? 'N/A' : st === 'Blocked' ? 'N' : '-';
  const recip = r?.notes?.includes('Recipient=') ? 'Y' : st === 'Passed' ? 'Y' : '-';
  const read = r?.notes?.includes('Read=true') || r?.notes?.includes('Read=Y') ? 'Y' : st === 'Passed' ? 'partial' : '-';
  md += `| ${t.type} | ${gen} | ${recip} | iter15 pattern | ${read} | ${st} |\n`;
}
md += `\nNotification effective: Passed ${notifPassed} / Blocked ${notifBlocked} / catalog ${triggers.types.length}\n\n`;

md += `## 3. Route coverage matrix\n\n`;
md += `| Portal | Routes in inventory |\n| --- | ---: |\n`;
const byPortal = {};
for (const r of routes.routes ?? routes) {
  const portal = r.path.split('/')[1] ?? 'root';
  byPortal[portal] = (byPortal[portal] || 0) + 1;
}
for (const [p, n] of Object.entries(byPortal).sort()) {
  md += `| ${p} | ${n} |\n`;
}
md += `\nFull UI sweep: iteration 18 (\`18-ui-exhaustive.qa.spec.ts\`).\n\n`;

md += `## 4. Workflow coverage matrix\n\n`;
md += `| Domain | Verified via |\n| --- | --- |\n`;
md += `| Property / units / owners / tenants | iter 02 + iter 17 workflows |\n`;
md += `| Contracts / lease | iter 03–04 + iter 21 triggers |\n`;
md += `| Maintenance | iter 05 + iter 21 |\n`;
md += `| Complaints | iter 06 + iter 21 |\n`;
md += `| Finance / HR / vacancies | iter 07–09 + schedulers |\n`;
md += `| Notifications | iter 12, 15–17, 21 |\n\n`;

md += `## 5. Security coverage matrix\n\n`;
md += `| Check | Iteration |\n| --- | --- |\n`;
md += `| 11-role login + landing | 18-rbac-exhaustive |\n`;
md += `| API deny probes | 18-rbac + 21 spot-check |\n`;
md += `| Route guards | iter 01 + 16 |\n\n`;

md += `## 6. Remaining blockers\n\n`;
const blocked = eff.filter((r) => r.status === 'Blocked');
for (const r of blocked.slice(0, 30)) {
  md += `- **${r.route}** (${r.role}): ${String(r.notes || r.actual).slice(0, 120)}\n`;
}
if (blocked.length > 30) md += `- … and ${blocked.length - 30} more (see EffectiveStatus sheet)\n`;

md += `\n## 7. Remaining risks\n\n`;
md += `1. Orphan enums without emitters: FINANCE_ALERT, MAINTENANCE_UPDATE, SALARY_ADVANCE_REJECTED.\n`;
md += `2. Notification types requiring rare preconditions may stay Blocked until dedicated seed flows run.\n`;
md += `3. Deep-link UI verification is sampled (iter 15), not exhaustive per type.\n`;

fs.writeFileSync(OUT, md, 'utf8');
console.log(`[generate-final-matrices] wrote ${OUT}`);
