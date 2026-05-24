import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { DYNAMIC_PAGES } from './screens-catalog.mjs';
import { buildWord } from './generate-full-catalog.mjs';

const BASE_URL = 'http://localhost:4500';
const API_BASE = 'http://localhost:8081/api/v1';
const OUT_DIR = path.resolve('..', 'rfi-output', 'full-catalog');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

async function login(page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[formcontrolname="email"]', 'admin@propmgmt.com');
  await page.fill('input[formcontrolname="password"]', '12345');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/auth/login'), { timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function apiFetch(page, apiPath) {
  return page.evaluate(
    async ({ apiPath, apiBase }) => {
      const token = localStorage.getItem('pm_access_token');
      const res = await fetch(`${apiBase}${apiPath}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : null;
    },
    { apiPath, apiBase: API_BASE }
  );
}

function extractRows(json) {
  const d = json?.data ?? json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.content)) return d.content;
  return [];
}

function pickId(row, idField) {
  return row?.[idField] ?? row?.id ?? row?.contractId;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
const page = await ctx.newPage();
await login(page);

const mc = DYNAMIC_PAGES.find((s) => s.id === 'admin-maint-contract-detail');
const json = await apiFetch(page, mc.apiPath);
let rows = extractRows(json);
if (mc.filter) rows = rows.filter(mc.filter);
const mcId = pickId(rows[0], mc.idField);
if (mcId) {
  const route = mc.route(mcId);
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'admin-maint-contract-detail.png') });
  const idx = manifest.findIndex((m) => m.id === 'admin-maint-contract-detail');
  manifest[idx] = { ...manifest[idx], status: 'ok', file: 'admin-maint-contract-detail.png', route, type: 'dynamic' };
  console.log('OK maintenance contract', route);
}

await page.goto(`${BASE_URL}/admin/contracts/templates`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const newBtn = page.locator('app-page-header button[mat-flat-button]').first();
if (await newBtn.isVisible().catch(() => false)) {
  await newBtn.click();
  await page.waitForSelector('.form-panel', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'panel-contract-template-new.png') });
  const old = manifest.findIndex((m) => m.id === 'dialog-contract-template');
  if (old >= 0) manifest.splice(old, 1);
  manifest.push({
    id: 'panel-contract-template-new',
    chapter: 'النماذج',
    type: 'dialog',
    file: 'panel-contract-template-new.png',
    title: 'إنشاء قالب عقد',
    desc: 'نموذج إضافة قالب عقد إيجار (لوحة مدمجة).',
    business: 'توحيد صياغة العقود القانونية.',
    status: 'ok'
  });
  console.log('OK contract template form panel');
}

await browser.close();
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
await buildWord(manifest);
console.log('Word rebuilt.');
