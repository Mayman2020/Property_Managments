import { environment } from '../../../environments/environment';

type RuntimeWindow = Window & {
  __PM_FILE_URL__?: string;
};

const FILE_ROUTE_MARKER = '/api/v1/files/';
const SHORT_FILE_ROUTE_MARKER = '/files/';
const STORED_FILENAME_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[A-Za-z0-9]{1,10}$/;
const ACCESS_TOKEN_KEY = 'pm_access_token';

export function getRuntimeFileBaseUrl(): string {
  const runtimeFileUrl = typeof window !== 'undefined'
    ? (window as RuntimeWindow).__PM_FILE_URL__
    : undefined;
  const base = runtimeFileUrl?.trim() || environment.fileUrl;
  return base.replace(/\/+$/, '');
}

/** Strip any stale ?tk= param and append the current JWT so <img src> works after auth. */
function appendToken(url: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  // Remove any previously embedded tk param so we never accumulate stale tokens.
  const clean = url.replace(/([?&])tk=[^&]*/g, '').replace(/[?&]$/, '');
  if (!token) return clean;
  const sep = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}tk=${encodeURIComponent(token)}`;
}

/** Returns true if the URL points to our own file server (already a full URL). */
function isOwnFileUrl(url: string): boolean {
  const base = getRuntimeFileBaseUrl();
  return url.startsWith(base + '/');
}

export function normalizeFileUrl(value: string): string {
  const raw = value.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return value;

  const fileBaseUrl = getRuntimeFileBaseUrl();

  // Already a full URL pointing to our file server — strip old token and re-append current one.
  if (/^https?:\/\//i.test(raw)) {
    return isOwnFileUrl(raw) ? appendToken(raw) : raw;
  }

  const fullMarkerIndex = raw.indexOf(FILE_ROUTE_MARKER);
  if (fullMarkerIndex >= 0) {
    return appendToken(`${fileBaseUrl}/${raw.slice(fullMarkerIndex + FILE_ROUTE_MARKER.length)}`);
  }

  if (raw.startsWith(SHORT_FILE_ROUTE_MARKER)) {
    return appendToken(`${fileBaseUrl}/${raw.slice(SHORT_FILE_ROUTE_MARKER.length)}`);
  }

  if (!STORED_FILENAME_PATTERN.test(raw)) return raw;

  return appendToken(`${fileBaseUrl}/${raw}`);
}

export function normalizeFileUrlsInValue<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeFileUrl(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFileUrlsInValue(item)) as T;
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      const normalized = normalizeFileUrlsInValue(item);
      next[key] = normalized;
      if (normalized !== item) changed = true;
    }
    return (changed ? next : value) as T;
  }
  return value;
}
