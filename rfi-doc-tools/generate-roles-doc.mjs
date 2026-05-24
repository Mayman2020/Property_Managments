import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TextRun
} from 'docx';
import { ROLE_SECTIONS, ROLE_USERS } from './roles-catalog.mjs';
import { newArabicContext, waitStable } from './i18n-screenshot-utils.mjs';

const BASE_URL = 'http://localhost:4500';
const API_BASE = 'http://localhost:8081/api/v1';
const OUT_DIR = path.resolve('..', 'rfi-output', 'roles-guide');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');

function rtl(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: opts.after ?? 80 },
    children: [new TextRun({ text, font: 'Arial', size: opts.size ?? 22, bold: !!opts.bold, color: opts.color })]
  });
}

async function apiJson(page, method, apiPath, body) {
  return page.evaluate(
    async ({ method, apiPath, apiBase, body }) => {
      const token = localStorage.getItem('pm_access_token');
      const opts = {
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${apiBase}${apiPath}`, opts);
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, json: await res.json() };
    },
    { method, apiPath, apiBase: API_BASE, body }
  );
}

async function ensureDemoCompanyUsers(page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

  const login = await apiJson(page, 'POST', '/auth/login', {
    email: 'admin@propmgmt.com',
    password: '12345'
  });
  if (!login.ok) {
    console.warn('Could not login as admin to seed company users');
    return;
  }

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('pm_access_token', token);
      localStorage.setItem('pm_current_user', JSON.stringify(user));
    },
    { token: login.json.data.accessToken, user: login.json.data.user }
  );

  const users = await apiJson(page, 'GET', '/users?page=0&size=100', null);
  const list = users.json?.data?.content ?? [];

  const ensure = async (email, role, contractorCompanyId, fullName) => {
    if (list.some((u) => u.email === email)) return;
    const body = {
      username: email.split('@')[0],
      email,
      password: '12345',
      fullName,
      role,
      contractorCompanyId
    };
    if (role === 'MAINTENANCE_OFFICER_COMPANY') {
      body.maintenanceOfficerType = 'CONTRACTOR_COMPANY';
      body.propertyId = 1;
    }
    const created = await apiJson(page, 'POST', '/users', body);
    if (created.ok) console.log('Created demo user:', email);
    else console.warn('Could not create user', email, created.status);
  };

  await ensure('demo.company@propmgmt.com', 'MAINTENANCE_COMPANY', 1, 'شركة الإبداع — حساب بوابة');
  await ensure('demo.officer.company@propmgmt.com', 'MAINTENANCE_OFFICER_COMPANY', 1, 'فني شركة الإبداع');
}

export async function login(page, email, password) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/auth/login'), { timeout: 90000 });
  await page.waitForTimeout(2000);
}

async function selectFirstProperty(page) {
  const sel = page.locator('select.estate-property-select').first();
  if (await sel.count()) {
    const opts = sel.locator('option');
    const n = await opts.count();
    for (let i = 0; i < n; i++) {
      const val = await opts.nth(i).getAttribute('ng-reflect-ng-value');
      const value = await opts.nth(i).getAttribute('value');
      if (val && val !== 'null' && value !== 'null') {
        await sel.selectOption({ index: i });
        await page.waitForTimeout(1500);
        return;
      }
    }
    if (n > 1) {
      await sel.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
    }
  }
}

async function selectScopedProperty(page) {
  const matSel = page.locator('.property-scope-field mat-select, mat-form-field.property-scope-field').first();
  if (await matSel.isVisible().catch(() => false)) {
    await matSel.click();
    await page.waitForTimeout(400);
    await page.locator('mat-option').first().click();
    await page.waitForTimeout(1500);
  }
}

async function selectSearchDropdownFirst(page) {
  const row = page.locator('.sdd-input-row').first();
  if (!(await row.isVisible().catch(() => false))) return;
  await row.click();
  await page.waitForTimeout(500);
  const opt = page.locator('.sdd-option').first();
  if (await opt.isVisible().catch(() => false)) {
    await opt.click();
    await page.waitForTimeout(2000);
  }
}

async function resolveRequestRoute(page, roleKey) {
  const res = await apiJson(page, 'GET', '/maintenance/requests?page=0&size=5', null);
  const rows = res.json?.data?.content ?? res.json?.data ?? [];
  const id = rows[0]?.id;
  if (!id) return null;
  return roleKey.startsWith('off') ? `/officer/requests/${id}` : `/admin/maintenance/${id}`;
}

export async function applyScreenPrep(page, screen, roleKey) {
  let route = screen.route;
  if (screen.dynamicRequestId) {
    const dyn = await resolveRequestRoute(page, roleKey);
    if (dyn) route = dyn;
  }
  if (screen.queryPropertyId) {
    route += route.includes('?') ? '&' : '?';
    route += `propertyId=${screen.queryPropertyId}`;
  }
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitStable(page);

  if (screen.selectProperty) await selectFirstProperty(page);
  if (screen.selectScopedProperty) await selectScopedProperty(page);
  if (screen.selectTenantUnit) {
    await selectSearchDropdownFirst(page);
    await page.locator('.unit-overview-card, .lease-card').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  if (screen.selectTenantContract) {
    await selectSearchDropdownFirst(page);
    await page.locator('.lease-card, article.lease-card').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(800);
}

async function captureRoles() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const manifest = [];
  const browser = await chromium.launch({ headless: true });

  const adminCtx = await newArabicContext(browser);
  const adminPage = await adminCtx.newPage();
  await login(adminPage, 'admin@propmgmt.com', '12345');
  await ensureDemoCompanyUsers(adminPage);
  await adminCtx.close();

  for (const section of ROLE_SECTIONS) {
    const creds = ROLE_USERS[section.roleKey];
    const ctx = await newArabicContext(browser);
    const page = await ctx.newPage();

    try {
      await login(page, creds.email, creds.password);
    } catch (e) {
      console.error(`Login failed ${section.roleKey}:`, e.message);
      await ctx.close();
      continue;
    }

    console.log(`\n=== ${creds.label} ===`);

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
        console.log(`  OK ${screen.id}`);
      } catch (e) {
        manifest.push({ roleKey: section.roleKey, ...screen, status: 'fail', error: e.message });
        console.error(`  FAIL ${screen.id}:`, e.message);
      }
    }
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export async function buildRolesWord(manifest) {
  const children = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'دليل شاشات النظام حسب الدور', font: 'Arial', size: 44, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'نظام مشارق — إدارة الأملاك والتأجير', font: 'Arial', size: 28, color: 'E8622A' })
      ]
    }),
    rtl('الملف 3: يوضح كل شاشة تظهر لكل دور مستخدم، مع الإجراءات المتاحة من الشاشة (بدون حوارات). اللقطات تتضمن بيانات فعلية مع اختيار عقار/وحدة/عقد حيث يلزم.', {
      size: 24,
      after: 80
    }),
    rtl(`عدد اللقطات: ${manifest.filter((m) => m.status === 'ok').length}`, { after: 300 })
  );

  for (const section of ROLE_SECTIONS) {
    const creds = ROLE_USERS[section.roleKey];
    const items = manifest.filter((m) => m.roleKey === section.roleKey && m.status === 'ok');
    if (!items.length) continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        pageBreakBefore: children.length > 4,
        spacing: { after: 120 },
        children: [new TextRun({ text: section.chapter, font: 'Arial', size: 32, bold: true, color: '1A5276' })]
      }),
      rtl(`الحساب التجريبي: ${creds.email}`, { size: 18, color: '666666' }),
      rtl(section.intro, { size: 22, after: 160 })
    );

    let n = 1;
    for (const item of items) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({ text: `${n}. ${item.title}`, font: 'Arial', size: 26, bold: true })
          ]
        }),
        rtl(`المسار: ${item.route}`, { size: 18, color: '888888', after: 60 })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'ما يمكن تنفيذه من هذه الشاشة:', font: 'Arial', size: 20, bold: true })]
        })
      );
      for (const act of item.actions) {
        children.push(rtl(`• ${act}`, { size: 20 }));
      }

      const shot = path.join(SHOTS_DIR, item.file);
      if (fs.existsSync(shot)) {
        const data = fs.readFileSync(shot);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 160 },
            children: [
              new ImageRun({ data, transformation: { width: 620, height: 350 }, type: 'png' })
            ]
          })
        );
      }
      n++;
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1260, right: 1260, bottom: 1260, left: 1260 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'مشارق — دليل الأدوار | صفحة ', font: 'Arial', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16 })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const outFile = path.join(OUT_DIR, '3-دليل-الشاشات-حسب-الدور-مشارق.docx');
  fs.writeFileSync(outFile, await Packer.toBuffer(doc));
  console.log('Word saved:', outFile);
  return outFile;
}

async function main() {
  const manifest = await captureRoles();
  await buildRolesWord(manifest);
  console.log(`Done: ${manifest.filter((m) => m.status === 'ok').length}/${manifest.length} screenshots`);
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
