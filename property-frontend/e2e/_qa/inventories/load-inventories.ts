import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd(), '..');
const INV_DIR = path.join(REPO_ROOT, 'docs', 'stabilization', 'inventories');

export interface NotificationTriggerEntry {
  type: string;
  hasServiceEmitter: boolean;
  emitterFiles: string[];
  category: 'orphan' | 'test-only' | 'live';
}

export interface FrontendRouteEntry {
  path: string;
  source: string;
}

export interface BackendEndpointEntry {
  method: string;
  path: string;
  controller: string;
}

function readJson<T>(name: string): T {
  const file = path.join(INV_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing inventory ${file} — run docs/scripts/discover-*.mjs first`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function loadNotificationTriggers(): NotificationTriggerEntry[] {
  return readJson<{ types: NotificationTriggerEntry[] }>('notification-triggers.json').types;
}

export function loadFrontendRoutes(): FrontendRouteEntry[] {
  return readJson<{ routes: FrontendRouteEntry[] }>('frontend-routes.json').routes;
}

export function loadBackendEndpoints(): BackendEndpointEntry[] {
  return readJson<{ endpoints: BackendEndpointEntry[] }>('backend-endpoints.json').endpoints;
}
