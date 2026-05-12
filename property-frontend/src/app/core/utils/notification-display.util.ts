import type { AppNotification } from '../models/notification.model';
import type { I18nService } from '../i18n/i18n.service';

/** Keys that are never template variables (only structural / navigation). */
const PARAM_META_KEYS = new Set([
  'titleKey',
  'title_key',
  'bodyKey',
  'body_key',
  'vars',
  'Vars'
]);

function enrichVarsFromNotification(n: AppNotification, vars: Record<string, string | number>): void {
  if (n.propertyId != null && n.propertyId > 0 && (vars['propertyId'] === undefined || vars['propertyId'] === '')) {
    vars['propertyId'] = n.propertyId;
  }
  const hasProvider = vars['providerName'] != null && String(vars['providerName']).trim() !== '';
  if (hasProvider) {
    return;
  }
  const msg = n.message ?? '';
  const assigned = msg.match(/Maintenance provider\s+(.+?)\s+was assigned to property\s*#(\d+)/i);
  if (assigned) {
    vars['providerName'] = assigned[1].trim();
    if (vars['propertyId'] === undefined || vars['propertyId'] === '') {
      vars['propertyId'] = Number(assigned[2]);
    }
    return;
  }
  const ended = msg.match(/Maintenance provider\s+(.+?)\s+was ended for property\s*#(\d+)/i);
  if (ended) {
    vars['providerName'] = ended[1].trim();
    if (vars['propertyId'] === undefined || vars['propertyId'] === '') {
      vars['propertyId'] = Number(ended[2]);
    }
  }
}

function coerceVarValue(v: unknown): string | number {
  if (v == null) {
    return '';
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'boolean') {
    return v ? 1 : 0;
  }
  return String(v);
}

function parseVarsBlob(raw: unknown): Record<string, unknown> | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s.startsWith('{') && !s.startsWith('[')) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(s);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

/**
 * Template variables for i18n interpolation: nested `vars`, optional JSON string,
 * scalar fields on `params`, plus row-level `propertyId` / English `message` fallbacks.
 */
export function notificationInterpolationVars(
  params: AppNotification['params'] | null | undefined,
  n?: AppNotification
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const raw = params as Record<string, unknown> | null | undefined;
  if (!raw || typeof raw !== 'object') {
    if (n) {
      enrichVarsFromNotification(n, out);
    }
    return out;
  }

  const merged: Record<string, unknown> = {};

  const nested = parseVarsBlob(raw['vars'] ?? raw['Vars']);
  if (nested) {
    Object.assign(merged, nested);
  }

  for (const [k, v] of Object.entries(raw)) {
    if (PARAM_META_KEYS.has(k)) {
      continue;
    }
    if (v != null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
      merged[k] = v;
    }
  }

  for (const [k, v] of Object.entries(merged)) {
    out[k] = coerceVarValue(v);
  }
  if (n) {
    enrichVarsFromNotification(n, out);
  }
  return out;
}

/** Replace `{{name}}` when ngx-translate leaves placeholders. */
function interpolateMustache(template: string, vars: Record<string, string | number>): string {
  if (!template.includes('{{')) {
    return template;
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name: string) => {
    const v = vars[name];
    return v != null && v !== '' ? String(v) : '';
  });
}

function translateWithVars(
  i18n: I18nService,
  key: string | undefined,
  vars: Record<string, string | number>
): string {
  if (!key) {
    return '';
  }
  let resolved = i18n.instant(key, vars);
  if (!resolved || resolved === key) {
    return '';
  }
  if (resolved.includes('{{') && Object.keys(vars).length > 0) {
    resolved = interpolateMustache(resolved, vars);
  }
  return resolved;
}

function readStringField(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim() !== '') {
      return v;
    }
  }
  return undefined;
}

/**
 * Resolves notification title: params.titleKey first, then NOTIFICATIONS.TYPES.<type>.TITLE,
 * then legacy fallbacks (same order as topbar / inbox).
 */
export function resolveNotificationTitle(i18n: I18nService, n: AppNotification): string {
  const rawParams = n.params as Record<string, unknown> | null | undefined;
  const vars = notificationInterpolationVars(n.params, n);

  const explicitKey =
    rawParams && typeof rawParams === 'object'
      ? readStringField(rawParams, 'titleKey', 'title_key')
      : undefined;

  const tryInstant = (key: string | undefined): string => translateWithVars(i18n, key, vars);

  const fromExplicit = tryInstant(explicitKey);
  if (fromExplicit) {
    return fromExplicit;
  }

  const syntheticKey = `NOTIFICATIONS.TYPES.${n.type}.TITLE`;
  const fromSynthetic = tryInstant(syntheticKey);
  if (fromSynthetic) {
    return fromSynthetic;
  }

  const rawTitle = n.title ?? '';
  const single = i18n.pickBilingualSegment(rawTitle, 'title');
  if (rawTitle.includes(' | ')) {
    return single || i18n.instant('NOTIFICATIONS.GENERAL');
  }

  const flatKey = `NOTIFICATIONS.${n.type}`;
  const flat = i18n.instant(flatKey);
  if (flat && flat !== flatKey) {
    return flat;
  }

  if (i18n.currentLang === 'en') {
    return single || i18n.instant('NOTIFICATIONS.GENERAL');
  }
  if (/[\u0600-\u06FF]/.test(single)) {
    return single;
  }
  return single || i18n.instant('NOTIFICATIONS.GENERAL');
}

/**
 * Body text: params.bodyKey, then NOTIFICATIONS.TYPES.<type>.BODY, then stored message.
 * @param maxLen when set, trims to one line of at most maxLen characters (for dropdown).
 */
export function resolveNotificationBodyLine(
  i18n: I18nService,
  n: AppNotification,
  maxLen?: number
): string {
  const rawParams = n.params as Record<string, unknown> | null | undefined;
  const vars = notificationInterpolationVars(n.params, n);

  const tryInstant = (key: string | undefined): string => translateWithVars(i18n, key, vars);

  const explicitKey =
    rawParams && typeof rawParams === 'object'
      ? readStringField(rawParams, 'bodyKey', 'body_key')
      : undefined;

  const fromExplicit = tryInstant(explicitKey);
  if (fromExplicit) {
    return maxLen != null ? clampOneLine(fromExplicit, maxLen) : fromExplicit;
  }

  const syntheticKey = `NOTIFICATIONS.TYPES.${n.type}.BODY`;
  const fromSynthetic = tryInstant(syntheticKey);
  if (fromSynthetic) {
    return maxLen != null ? clampOneLine(fromSynthetic, maxLen) : fromSynthetic;
  }

  const raw = n.message ?? '';
  const bodySep = '\n\n—\n\n';
  const msg = raw.includes(bodySep) ? i18n.pickBilingualSegment(raw, 'body') : raw.trim();
  if (msg) {
    return maxLen != null ? clampOneLine(msg, maxLen) : msg;
  }
  return '';
}

function clampOneLine(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}
