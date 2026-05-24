#!/usr/bin/env node
/**
 * Parse @*Mapping annotations on controllers → backend-endpoints.json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const JAVA_ROOT = path.resolve(REPO_ROOT, 'property-backend/src/main/java');
const OUT_DIR = path.resolve(REPO_ROOT, 'docs/stabilization/inventories');
const OUT_FILE = path.join(OUT_DIR, 'backend-endpoints.json');

function findControllers(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) findControllers(full, acc);
    else if (ent.name.endsWith('Controller.java')) acc.push(full);
  }
  return acc;
}

function parseController(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
  let classPrefix = '';
  const classMapping = text.match(/@RequestMapping\s*\(\s*["']([^"']*)["']\s*\)/);
  if (classMapping) classPrefix = classMapping[1];

  const endpoints = [];
  const methodRegex = /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']*)["']/g;
  let m;
  while ((m = methodRegex.exec(text)) !== null) {
    const httpMethod = m[1].toUpperCase();
    let p = m[2];
    if (classPrefix && !p.startsWith('/')) {
      p = `${classPrefix}/${p}`.replace(/\/+/g, '/');
    }
    if (!p.startsWith('/')) p = `/${p}`;
    endpoints.push({ method: httpMethod, path: p });
  }
  return { controller: rel, classPrefix, endpoints };
}

const controllers = findControllers(JAVA_ROOT);
const all = [];
for (const c of controllers) {
  const parsed = parseController(c);
  for (const ep of parsed.endpoints) {
    all.push({ ...ep, controller: parsed.controller });
  }
}
all.sort((a, b) => a.path.localeCompare(b.path));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), endpoints: all }, null, 2));
console.log(`[discover-api-endpoints] ${all.length} endpoints from ${controllers.length} controllers -> ${OUT_FILE}`);
