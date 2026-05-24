/**
 * Iteration 12 — Notifications inbox API + unread count.
 */
import { test, expect } from './fixtures';
import { recordRow, QaRow, resetIterationLog } from './record';
import { readUnreadCount } from './notification-helpers';

const ITER = 12;

function row(p: Partial<QaRow>): QaRow {
  return {
    iteration: ITER,
    module: 'notifications',
    route: '-',
    role: 'SUPER_ADMIN',
    permissionContext: 'notifications.view',
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

interface ApiEnvelope<T = unknown> { success: boolean; data?: T; }
interface PageEnv<T> { content: T[]; totalElements?: number; }
interface NotifRow { id: number; read?: boolean; notificationType?: string; }

test.describe.serial('Iteration 12 — Notifications', () => {
  test.beforeAll(() => resetIterationLog(ITER));

  let firstId = 0;

  test('12.1 GET /notifications/my/unread-count', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/notifications/my/unread-count');
    const count = await readUnreadCount(api);
    recordRow(row({
      route: 'GET /notifications/my/unread-count',
      scenario: 'Unread badge count endpoint.',
      expected: 'HTTP 200; numeric unread count (data or data.unreadCount)',
      actual: `status=${r.status} count=${count}`,
      status: r.status === 200 && typeof count === 'number' ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
    expect(typeof count).toBe('number');
  });

  test('12.2 GET /notifications/my?scope=recent', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/notifications/my?scope=recent&page=0&size=5');
    const content = ((r.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? [];
    firstId = content[0]?.id ?? 0;
    recordRow(row({
      route: 'GET /notifications/my?scope=recent',
      scenario: 'Recent notifications inbox page.',
      expected: 'HTTP 200; page content[]',
      actual: `status=${r.status} count=${content.length}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('12.3 GET /notifications/my?scope=older', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('GET', '/notifications/my?scope=older&page=0&size=5');
    recordRow(row({
      route: 'GET /notifications/my?scope=older',
      scenario: 'Older notifications tab.',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('12.4 PATCH /notifications/{id}/read when row exists', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    if (!firstId) {
      recordRow(row({
        route: 'PATCH /notifications/{id}/read',
        scenario: 'Mark one read — skipped (no notifications).',
        status: 'To be verified during E2E testing',
        notes: 'Inbox empty in current DB snapshot'
      }));
      return;
    }
    const r = await api.raw('PATCH', `/notifications/${firstId}/read`);
    recordRow(row({
      route: 'PATCH /notifications/{id}/read',
      scenario: 'Mark single notification read.',
      testData: `notificationId=${firstId}`,
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('12.5 PATCH /notifications/my/read-all', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const r = await api.raw('PATCH', '/notifications/my/read-all');
    recordRow(row({
      route: 'PATCH /notifications/my/read-all',
      scenario: 'Mark all notifications read.',
      expected: 'HTTP 200',
      actual: `status=${r.status}`,
      status: r.status === 200 ? 'Passed' : 'Failed'
    }));
    expect(r.status).toBe(200);
  });

  test('12.6 TENANT cannot read SUPER_ADMIN notifications cross-user', async ({ api }) => {
    await api.loginRole('SUPER_ADMIN');
    const list = await api.raw('GET', '/notifications/my?scope=recent&page=0&size=1');
    const adminId = ((list.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content?.[0]?.id) ?? 0;
    await api.login('qa.tenant2@propmgmt.com');
    if (!adminId) {
      recordRow(row({ route: 'PATCH /notifications/{id}/read', role: 'TENANT', status: 'To be verified during E2E testing', notes: 'No admin notification to probe' }));
      return;
    }
    const r = await api.raw('PATCH', `/notifications/${adminId}/read`);
    recordRow(row({
      route: 'PATCH /notifications/{id}/read',
      role: 'TENANT',
      scenario: 'Tenant cannot mark another user notification.',
      expected: 'HTTP 403 or 404',
      actual: `status=${r.status}`,
      status: r.status === 403 || r.status === 404 ? 'Passed' : 'Failed'
    }));
    expect([403, 404]).toContain(r.status);
  });
});
