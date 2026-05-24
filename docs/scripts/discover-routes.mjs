#!/usr/bin/env node
/**
 * Parse Angular *.routes.ts files → frontend-routes.json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const APP_ROOT = path.resolve(REPO_ROOT, 'property-frontend/src/app');
const OUT_DIR = path.resolve(REPO_ROOT, 'docs/stabilization/inventories');
const OUT_FILE = path.join(OUT_DIR, 'frontend-routes.json');

function findRouteFiles(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) findRouteFiles(full, acc);
    else if (ent.name.endsWith('.routes.ts')) acc.push(full);
  }
  return acc;
}

function extractRoutes(filePath, prefix = '') {
  const text = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const source = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');

  for (const m of text.matchAll(/path:\s*['"]([^'"]+)['"]/g)) {
    const segment = m[1];
    if (segment === '' || segment === '**') continue;
    let full = prefix;
    if (segment.startsWith('/')) full = segment;
    else if (prefix.endsWith('/')) full = prefix + segment;
    else full = prefix ? `${prefix}/${segment}` : `/${segment}`;
    full = full.replace(/\/+/g, '/');
    routes.push({ path: full, source, segment });
  }
  return routes;
}

const files = findRouteFiles(APP_ROOT);
const all = [];
const seen = new Set();

for (const f of files) {
  let prefix = '';
  if (f.includes('admin.routes')) prefix = '/admin';
  else if (f.includes('tenant.routes')) prefix = '/tenant';
  else if (f.includes('officer.routes')) prefix = '/officer';
  else if (f.includes('employee-portal.routes')) prefix = '/employee';
  else if (f.includes('auth.routes')) prefix = '/auth';

  for (const r of extractRoutes(f, prefix)) {
    if (r.segment.includes(':') || r.segment === 'redirectTo') continue;
    const key = r.path;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(r);
    }
  }
}

all.sort((a, b) => a.path.localeCompare(b.path));
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), routes: all }, null, 2));
console.log(`[discover-routes] ${all.length} routes -> ${OUT_FILE}`);
