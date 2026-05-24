import { QaApi } from './fixtures';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
}

interface UnreadCountData {
  unreadCount?: number;
}

/** Parses GET /notifications/my/unread-count — data may be a number or { unreadCount }. */
export async function readUnreadCount(api: QaApi): Promise<number> {
  const r = await api.raw('GET', '/notifications/my/unread-count');
  const data = (r.body as ApiEnvelope<UnreadCountData | number>).data;
  if (typeof data === 'number') return data;
  return data?.unreadCount ?? 0;
}
