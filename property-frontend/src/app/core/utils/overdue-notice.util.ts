const SNOOZE_PREFIX = 'overdue-notice-snooze-';
const SNOOZE_MS = 48 * 60 * 60 * 1000;

export function snoozeOverdueNotice(scheduleId: number): void {
  if (!Number.isFinite(scheduleId) || scheduleId <= 0) return;
  localStorage.setItem(SNOOZE_PREFIX + scheduleId, String(Date.now() + SNOOZE_MS));
}

export function isOverdueNoticeSnoozed(scheduleId: number): boolean {
  if (!Number.isFinite(scheduleId) || scheduleId <= 0) return false;
  const raw = localStorage.getItem(SNOOZE_PREFIX + scheduleId);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || until <= Date.now()) {
    localStorage.removeItem(SNOOZE_PREFIX + scheduleId);
    return false;
  }
  return true;
}

export function clearExpiredOverdueSnoozes(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SNOOZE_PREFIX)) continue;
    const until = Number(localStorage.getItem(key));
    if (!Number.isFinite(until) || until <= Date.now()) {
      localStorage.removeItem(key);
    }
  }
}
