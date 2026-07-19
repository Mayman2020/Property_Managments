import { test as base, expect, APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { QA_CREDENTIALS, RoleKey } from './credentials';

export function passwordForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  for (const cred of Object.values(QA_CREDENTIALS)) {
    if (cred.email.toLowerCase() === normalized) return cred.password;
  }
  if (normalized.includes('qa.tenant')) return QA_CREDENTIALS.TENANT.password;
  if (normalized.includes('qa.owner')) return QA_CREDENTIALS.OWNER.password;
  if (normalized.includes('qa.mc@') || normalized.includes('qa.mo@')) return QA_CREDENTIALS.MAINTENANCE_COMPANY.password;
  return '12345';
}

const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4208';

function resolveApiUrl(): string {
  if (process.env['E2E_API_URL']) return process.env['E2E_API_URL'];
  try {
    const stateFile = path.resolve(process.cwd(), '..', '.runtime', 'launcher-state.json');
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as { backendBaseUrl?: string };
      if (state.backendBaseUrl) return state.backendBaseUrl;
    }
  } catch { /* fall through */ }
  return 'http://localhost:8089/api/v1';
}

const API = resolveApiUrl();

const AUTH_DIR = path.resolve(process.cwd(), 'e2e', '_qa', '.auth');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

interface LoginResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user?: { id: number; email: string; role: string; mustChangePassword?: boolean };
  };
}

export interface QaApi {
  /** Bearer token for the current authenticated identity (if any). */
  token?: string;
  baseUrl: string;
  get<T = unknown>(p: string, params?: Record<string, string | number>): Promise<T>;
  post<T = unknown>(p: string, body?: unknown): Promise<T>;
  patch<T = unknown>(p: string, body?: unknown): Promise<T>;
  put<T = unknown>(p: string, body?: unknown): Promise<T>;
  del<T = unknown>(p: string): Promise<T>;
  /** Raw response variant: never asserts, returns status + body. */
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body?: unknown): Promise<{ status: number; body: unknown }>;
  raw(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', p: string, body: unknown, extraHeaders: Record<string, string>): Promise<{ status: number; body: unknown }>;
  login(email: string, password?: string): Promise<string>;
  loginFromIp(email: string, forwardedFor: string, password?: string): Promise<string>;
  loginRole(role: RoleKey): Promise<string>;
}

function buildApi(request: APIRequestContext): QaApi {
  const baseUrl = API;
  const state: { token?: string } = {};

  async function req<T>(method: string, p: string, body?: unknown, params?: Record<string, string | number>): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const url = p.startsWith('http') ? p : `${baseUrl}${p}`;
    const res = await request.fetch(url, {
      method,
      headers,
      data: body == null ? undefined : JSON.stringify(body),
      params
    });
    const text = await res.text();
    if (!res.ok()) {
      throw new Error(`${method} ${p} failed: ${res.status()} ${text}`);
    }
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async function rawReq(
    method: string,
    p: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<{ status: number; body: unknown }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const url = p.startsWith('http') ? p : `${baseUrl}${p}`;
    const res = await request.fetch(url, {
      method,
      headers,
      data: body == null ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try { parsed = JSON.parse(text); } catch { /* keep text */ }
    }
    return { status: res.status(), body: parsed };
  }

  async function login(email: string, password?: string): Promise<string> {
    const pwd = password ?? passwordForEmail(email);
    const r = await req<LoginResponse>('POST', '/auth/login', { email, password: pwd });
    const token = r?.data?.accessToken;
    if (!token) throw new Error(`login(${email}) returned no token: ${JSON.stringify(r)}`);
    state.token = token;
    return token;
  }

  async function loginRole(role: RoleKey): Promise<string> {
    const cred = QA_CREDENTIALS[role];
    if (!cred) throw new Error(`No credential mapping for role ${role}`);
    return login(cred.email, cred.password);
  }

  return {
    baseUrl,
    get token() { return state.token; },
    set token(v: string | undefined) { state.token = v; },
    get: (p, params) => req('GET', p, undefined, params),
    post: (p, b) => req('POST', p, b),
    patch: (p, b) => req('PATCH', p, b),
    put: (p, b) => req('PUT', p, b),
    del: (p) => req('DELETE', p),
    raw: (method, p, b, h) => rawReq(method, p, b, h),
    login,
    loginFromIp: async (email: string, forwardedFor: string, password = '12345') => {
      const r = await rawReq('POST', '/auth/login', { email, password }, { 'X-Forwarded-For': forwardedFor });
      const token = (r.body as LoginResponse)?.data?.accessToken;
      if (!token) throw new Error(`loginFromIp(${email}) returned no token: ${JSON.stringify(r.body)}`);
      state.token = token;
      return token;
    },
    loginRole
  } as QaApi;
}

/**
 * UI login. Mirrors the real form interaction so we exercise route guards and
 * any forced-password-change flow. Returns the URL the app landed on.
 */
export async function uiLogin(page: Page, email: string, password?: string): Promise<string> {
  const pwd = password ?? passwordForEmail(email);
  await page.goto(`${WEB}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pwd);
  await page.getByRole('button', { name: /enter|دخول|login/i }).click();
  // Wait for the SPA to navigate off /auth/login.
  await page.waitForURL((u) => !/\/auth\/login(\?|$|\/)/.test(u.pathname), { timeout: 20000 });
  // Forced-password-change redirect lands on /change-password; tests can detect that.
  return page.url();
}

interface QaFixtures {
  api: QaApi;
  web: string;
  apiUrl: string;
}

export const test = base.extend<QaFixtures>({
  api: async ({ request }, run) => {
    const api = buildApi(request);
    await run(api);
  },
  web: async ({}, run) => run(WEB),
  apiUrl: async ({}, run) => run(API)
});

export { expect, WEB, API };
