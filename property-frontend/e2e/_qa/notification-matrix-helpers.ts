/**
 * Multi-role notification inbox helpers for production-readiness passes.
 */
import { QaApi } from './fixtures';
import { RoleKey } from './credentials';
import { readUnreadCount } from './notification-helpers';

export interface NotifRow {
  id: number;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  params?: Record<string, unknown> & { titleKey?: string; bodyKey?: string };
}

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
}

interface PageEnv<T> {
  content: T[];
}

export const INBOX_ROLES: RoleKey[] = [
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'ACCOUNTANT',
  'HR_OFFICER',
  'PROCEDURES_CLERK',
  'MAINTENANCE_OFFICER_INTERNAL',
  'MAINTENANCE_OFFICER_COMPANY',
  'MAINTENANCE_COMPANY',
  'OWNER',
  'TENANT'
];

export async function fetchInbox(api: QaApi): Promise<NotifRow[]> {
  const all: NotifRow[] = [];
  for (const scope of ['recent', 'older'] as const) {
    for (let page = 0; page < 15; page++) {
      const r = await api.raw('GET', `/notifications/my?scope=${scope}&page=${page}&size=100`);
      const content = ((r.body as ApiEnvelope<PageEnv<NotifRow>>).data?.content) ?? [];
      if (!content.length) break;
      all.push(...content);
      if (content.length < 100) break;
    }
  }
  return all;
}

export interface InboxTypeIndex {
  roles: string[];
  sample: NotifRow;
}

export async function scanInboxIndex(
  api: QaApi,
  extraEmails: string[] = []
): Promise<Map<string, InboxTypeIndex>> {
  const found = new Map<string, InboxTypeIndex>();

  const QA_PASSWORDS = ['12345', 'ChangeMeNow@1234'];

  async function loginEmail(email: string): Promise<boolean> {
    for (const password of QA_PASSWORDS) {
      const r = await api.raw('POST', '/auth/login', { email, password });
      const token = (r.body as { data?: { accessToken?: string } })?.data?.accessToken;
      if (r.status === 200 && token) {
        api.token = token;
        return true;
      }
    }
    return false;
  }

  for (const role of INBOX_ROLES) {
    try {
      await api.loginRole(role);
      const inbox = await fetchInbox(api);
      for (const n of inbox) {
        const t = n.type ?? '';
        if (!t) continue;
        const cur = found.get(t) ?? { roles: [], sample: n };
        if (!cur.roles.includes(role)) cur.roles.push(role);
        found.set(t, cur);
      }
    } catch {
      /* role may not authenticate */
    }
  }
  for (const email of extraEmails) {
    try {
      if (!(await loginEmail(email))) continue;
      const inbox = await fetchInbox(api);
      for (const n of inbox) {
        const t = n.type ?? '';
        if (!t) continue;
        const label = `EMAIL:${email}`;
        const cur = found.get(t) ?? { roles: [], sample: n };
        if (!cur.roles.includes(label)) cur.roles.push(label);
        found.set(t, cur);
      }
    } catch {
      /* skip */
    }
  }
  return found;
}

/** @deprecated Use scanInboxIndex for matrix passes — avoids duplicate inbox fetches. */
export async function scanTypesAcrossRoles(
  api: QaApi,
  extraEmails: string[] = []
): Promise<Map<string, RoleKey[]>> {
  const index = await scanInboxIndex(api, extraEmails);
  const found = new Map<string, RoleKey[]>();
  for (const [type, entry] of index) {
    found.set(type, entry.roles as RoleKey[]);
  }
  return found;
}

export async function findTypeInAnyRole(
  api: QaApi,
  type: string,
  extraEmails: string[] = []
): Promise<{ role: RoleKey | string; row: NotifRow } | null> {
  for (const role of INBOX_ROLES) {
    try {
      await api.loginRole(role);
      const row = (await fetchInbox(api)).find((n) => n.type === type);
      if (row) return { role, row };
    } catch {
      /* skip */
    }
  }
  for (const email of extraEmails) {
    try {
      await api.login(email);
      const row = (await fetchInbox(api)).find((n) => n.type === type);
      if (row) return { role: `EMAIL:${email}`, row };
    } catch {
      /* skip */
    }
  }
  return null;
}

export function verifyNotifPayload(n: NotifRow): { ok: boolean; detail: string } {
  const titleKey = n.params?.titleKey as string | undefined;
  const bodyKey = n.params?.bodyKey as string | undefined;
  const hasTitle = !!(n.title?.trim() || titleKey);
  const hasMessage = !!(n.message?.trim() || bodyKey);
  const ok = !!n.type && hasTitle && hasMessage;
  return {
    ok,
    detail: `title=${hasTitle} message=${hasMessage} params=${n.params != null}`
  };
}

export async function verifyMarkRead(api: QaApi, n: NotifRow): Promise<boolean> {
  const before = await readUnreadCount(api);
  const r = await api.raw('PATCH', `/notifications/${n.id}/read`);
  const after = await readUnreadCount(api);
  return r.status === 200 && after <= before;
}
