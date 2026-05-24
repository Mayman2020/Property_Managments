/**
 * Iteration 21 — Rescan inbox after lifecycle specs (append-only, no log reset).
 */
import { test } from './fixtures';
import { recordRow, QaRow } from './record';
import { loadNotificationTriggers } from './inventories/load-inventories';
import {
  findTypeInAnyRole,
  scanTypesAcrossRoles,
  verifyMarkRead,
  verifyNotifPayload
} from './notification-matrix-helpers';

const ITER = 21;
const SCENARIO = 'Production readiness — notification coverage';

function notifRow(type: string, p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'notifications-exhaustive',
    route: `NotificationType.${type}`,
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
    retestResult: 'RE-AUDITED iteration 21 rescan',
    notes: '',
    ...p
  };
}

test('21.6b notification matrix rescan after lifecycles', async ({ api }) => {
  test.setTimeout(600_000);
  const catalog = loadNotificationTriggers();
  const typesInInbox = await scanTypesAcrossRoles(api);
  let passed = 0;
  let blocked = 0;

  for (const entry of catalog) {
    const type = entry.type;
    if (!entry.hasServiceEmitter || entry.category === 'orphan') {
      recordRow(notifRow(type, {
        actual: 'orphan — no emitter',
        status: 'Blocked',
        notes: 'ORPHAN: wire emitter or remove enum'
      }));
      blocked++;
      continue;
    }
    const found = typesInInbox.get(type);
    const hit = found?.length ? await findTypeInAnyRole(api, type) : await findTypeInAnyRole(api, type);
    if (hit) {
      const v = verifyNotifPayload(hit.row);
      const markOk = await verifyMarkRead(api, hit.row);
      recordRow(notifRow(type, {
        role: hit.role,
        actual: `roles=${(found ?? []).join(',')} ${v.detail} markRead=${markOk}`,
        status: v.ok && markOk ? 'Passed' : 'Failed',
        notes: `Generated=Y|Recipient=${hit.role}|Read=${markOk}`
      }));
      if (v.ok && markOk) passed++;
      else blocked++;
    } else {
      recordRow(notifRow(type, {
        actual: 'not in any inbox after full lifecycle pass',
        status: 'Blocked',
        notes: entry.emitterFiles.slice(0, 2).join(', ')
      }));
      blocked++;
    }
  }
  recordRow({
    iteration: ITER,
    module: 'production-readiness',
    route: 'notification-matrix-rescan',
    role: 'SUPER_ADMIN',
    permissionContext: '-',
    scenario: SCENARIO,
    steps: '-',
    testData: '-',
    expected: '-',
    actual: `passed=${passed} blocked=${blocked}`,
    severity: 'Medium',
    status: 'Passed',
    bugSummary: '',
    filesChanged: '',
    retestResult: '',
    notes: ''
  });
});
