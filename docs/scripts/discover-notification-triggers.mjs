#!/usr/bin/env node
/**
 * Scan NotificationType enum + backend service usages → notification-triggers.json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ENUM_FILE = path.resolve(
  REPO_ROOT,
  'property-backend/src/main/java/com/propertymanagement/modules/notification/entity/NotificationType.java'
);
const JAVA_ROOT = path.resolve(REPO_ROOT, 'property-backend/src/main/java');
const OUT_DIR = path.resolve(REPO_ROOT, 'docs/stabilization/inventories');
const OUT_FILE = path.join(OUT_DIR, 'notification-triggers.json');

function parseEnum(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const types = [];
  for (const m of text.matchAll(/^\s+([A-Z][A-Z0-9_]+),?\s*(?:\/\/.*)?$/gm)) {
    types.push(m[1]);
  }
  return types;
}

function scanUsages(root) {
  const usages = new Map();
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.java')) {
        const text = fs.readFileSync(full, 'utf8');
        const rel = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
        for (const m of text.matchAll(/NotificationType\.([A-Z_]+)/g)) {
          const t = m[1];
          if (!usages.has(t)) usages.set(t, []);
          const refs = usages.get(t);
          if (!refs.some((r) => r.file === rel)) {
            refs.push({ file: rel });
          }
        }
      }
    }
  }
  walk(root);
  return usages;
}

const allTypes = parseEnum(ENUM_FILE);
const usages = scanUsages(JAVA_ROOT);

const catalog = allTypes.map((type) => {
  const refs = usages.get(type) ?? [];
  return {
    type,
    hasServiceEmitter: refs.some((r) => !r.file.includes('/entity/') && !r.file.includes('NotificationType.java')),
    emitterFiles: refs.map((r) => r.file),
    category: refs.length === 0 ? 'orphan' : refs.some((r) => r.file.includes('/test/')) && refs.length === 1 ? 'test-only' : 'live'
  };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), types: catalog }, null, 2));
console.log(`[discover-notification-triggers] ${allTypes.length} enum values, ${catalog.filter((c) => c.hasServiceEmitter).length} with service emitters -> ${OUT_FILE}`);
