import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { ROLE_SECTIONS, ROLE_USERS } from './roles-catalog.mjs';
import { applyScreenPrep, login, buildRolesWord } from './generate-roles-doc.mjs';

const OUT_DIR = path.resolve('..', 'rfi-output', 'roles-guide');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const section = ROLE_SECTIONS.find((s) => s.roleKey === 'officer_company');
const creds = ROLE_USERS.officer_company;
let manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).filter((m) => m.roleKey !== 'officer_company');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
const page = await ctx.newPage();

await login(page, creds.email, creds.password);
console.log('===', creds.label, '===');

for (const screen of section.screens) {
  const fileName = `${section.roleKey}-${screen.id}.png`;
  const filePath = path.join(SHOTS_DIR, fileName);
  try {
    await applyScreenPrep(page, screen, section.roleKey);
    await page.screenshot({ path: filePath, fullPage: false });
    manifest.push({
      roleKey: section.roleKey,
      roleLabel: creds.label,
      chapter: section.chapter,
      ...screen,
      file: fileName,
      status: 'ok'
    });
    console.log('  OK', screen.id);
  } catch (e) {
    console.error('  FAIL', screen.id, e.message);
  }
}

await browser.close();
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
await buildRolesWord(manifest);
console.log('Rebuilt Word with officer_company section');
