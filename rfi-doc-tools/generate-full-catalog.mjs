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
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx';
import { STATIC_PAGES, DYNAMIC_PAGES, DIALOG_RECIPES, PORTALS } from './screens-catalog.mjs';
import { apiLogin, newArabicContext, waitStable } from './i18n-screenshot-utils.mjs';

const BASE_URL = 'http://localhost:4208';
const API_BASE = 'http://localhost:8089/api/v1';
const OUT_DIR = path.resolve('..', 'rfi-output', 'full-catalog');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

function rtlParagraph(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: opts.after ?? 100 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: opts.size ?? 22,
        bold: opts.bold ?? false,
        color: opts.color
      })
    ]
  });
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.fill('input[formcontrolname="email"]', email);
  await page.fill('input[formcontrolname="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 90000 });
  await page.waitForTimeout(2000);
  const changePw = page.locator('input[formcontrolname="newPassword"], input[formcontrolname="newPw"]');
  if (await changePw.count()) {
    await page.fill('input[formcontrolname="currentPassword"], input[formcontrolname="currentPw"]', password);
    await page.fill('input[formcontrolname="newPassword"], input[formcontrolname="newPw"]', password);
    await page.fill('input[formcontrolname="confirmPassword"], input[formcontrolname="confirmPw"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function apiFetch(page, apiPath) {
  return page.evaluate(
    async ({ apiPath, apiBase }) => {
      const token = localStorage.getItem('pm_access_token');
      if (!token) return null;
      const res = await fetch(`${apiBase}${apiPath}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (!res.ok) return null;
      return res.json();
    },
    { apiPath, apiBase: API_BASE }
  );
}

function extractRows(json) {
  if (!json) return [];
  const d = json.data ?? json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.content)) return d.content;
  if (Array.isArray(d.items)) return d.items;
  return [];
}

async function screenshotPage(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false });
}

async function captureStatic(browser, manifest) {
  let currentPortal = null;
  let page = null;

  for (const screen of STATIC_PAGES) {
    const file = path.join(SHOTS_DIR, `${screen.id}.png`);
    try {
      if (screen.portal && screen.portal !== currentPortal) {
        if (page) await page.close();
        const creds = PORTALS[screen.portal];
        const ctx = await newArabicContext(browser);
        page = await ctx.newPage();
        await login(page, creds.email, creds.password);
        currentPortal = screen.portal;
      } else if (!screen.portal && !page) {
        const ctx = await newArabicContext(browser);
        page = await ctx.newPage();
        currentPortal = null;
      } else if (!screen.portal && page) {
        await page.context().clearCookies();
        await page.evaluate(() => localStorage.clear());
      }

      if (!page) {
        const ctx = await newArabicContext(browser);
        page = await ctx.newPage();
      }

      if (!screen.portal) {
        await page.goto(`${BASE_URL}${screen.route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      } else {
        await page.goto(`${BASE_URL}${screen.route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      }
      await waitStable(page);
      await screenshotPage(page, file);
      manifest.push({ ...screen, type: 'page', file: `${screen.id}.png`, status: 'ok' });
      console.log(`[page] ${screen.id}`);
    } catch (e) {
      manifest.push({ ...screen, type: 'page', status: 'fail', error: e.message });
      console.error(`[page FAIL] ${screen.id}:`, e.message);
    }
  }
  if (page) await page.close();
}

async function captureDynamic(browser, manifest) {
  const ctx = await newArabicContext(browser);
  const page = await ctx.newPage();
  await login(page, PORTALS.admin.email, PORTALS.admin.password);

  for (const screen of DYNAMIC_PAGES) {
    const file = path.join(SHOTS_DIR, `${screen.id}.png`);
    try {
      if (screen.portal !== 'admin') {
        await page.context().clearCookies();
        await page.evaluate(() => localStorage.clear());
        const creds = PORTALS[screen.portal];
        await login(page, creds.email, creds.password);
      }

      const json = await apiFetch(page, screen.apiPath);
      let rows = extractRows(json);
      if (screen.filter) rows = rows.filter(screen.filter);
      const id = rows[0]?.[screen.idField];
      if (!id) {
        manifest.push({ ...screen, type: 'dynamic', status: 'skip', error: 'no id' });
        console.warn(`[dynamic skip] ${screen.id}`);
        continue;
      }

      const route = screen.route(id);
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await waitStable(page);
      await screenshotPage(page, file);
      manifest.push({ ...screen, type: 'dynamic', file: `${screen.id}.png`, route, status: 'ok' });
      console.log(`[dynamic] ${screen.id} -> ${route}`);
    } catch (e) {
      manifest.push({ ...screen, type: 'dynamic', status: 'fail', error: e.message });
      console.error(`[dynamic FAIL] ${screen.id}:`, e.message);
    }
  }
  await page.close();
}

export async function captureDialogs(browser, manifest) {
  const ctx = await newArabicContext(browser);
  const page = await ctx.newPage();
  await apiLogin(page, BASE_URL, API_BASE, PORTALS.admin.email, PORTALS.admin.password);

  for (const recipe of DIALOG_RECIPES) {
    const file = path.join(SHOTS_DIR, `${recipe.id}.png`);
    try {
      await page.goto(`${BASE_URL}${recipe.listRoute}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await waitStable(page);

      let opened = false;
      for (const sel of recipe.clicks) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) && (await loc.isVisible().catch(() => false))) {
          await loc.click({ timeout: 8000 });
          opened = true;
          break;
        }
      }

      if (!opened) {
        manifest.push({ ...recipe, type: 'dialog', status: 'skip', error: 'no button' });
        console.warn(`[dialog skip] ${recipe.id}`);
        continue;
      }

      await page
        .locator('mat-dialog-container, .mat-mdc-dialog-container, .cdk-overlay-pane mat-dialog-container')
        .first()
        .waitFor({ state: 'visible', timeout: 12000 });
      await page.waitForTimeout(1200);
      const dialog = page.locator('mat-dialog-container, .mat-mdc-dialog-container').first();
      await dialog.screenshot({ path: file });
      manifest.push({ ...recipe, type: 'dialog', file: `${recipe.id}.png`, status: 'ok' });
      console.log(`[dialog] ${recipe.id}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    } catch (e) {
      if (recipe.optional) {
        manifest.push({ ...recipe, type: 'dialog', status: 'skip', error: e.message });
        console.warn(`[dialog optional] ${recipe.id}`);
      } else {
        manifest.push({ ...recipe, type: 'dialog', status: 'fail', error: e.message });
        console.error(`[dialog FAIL] ${recipe.id}:`, e.message);
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
  await page.close();
}

export async function buildWord(manifest) {
  const chapters = [...new Set(manifest.filter((m) => m.status === 'ok').map((m) => m.chapter))];
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'دليل شاشات النظام الكامل', font: 'Arial', size: 44, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'نظام مشارق — إدارة الأملاك والتأجير',
          font: 'Arial',
          size: 28,
          color: 'E8622A'
        })
      ]
    }),
    rtlParagraph('يشمل هذا الدليل جميع شاشات النظام: القوائم، التفاصيل، النماذج، الإشعارات، وبوابات المستخدمين.', {
      size: 24,
      after: 80
    }),
    rtlParagraph(`إجمالي اللقطات الناجحة: ${manifest.filter((m) => m.status === 'ok').length} من ${manifest.length}`, {
      size: 22,
      after: 80
    }),
    rtlParagraph(`تاريخ الإعداد: ${new Date().toLocaleDateString('ar-SA')}`, { size: 22, after: 300 })
  );

  // TOC table
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [new TextRun({ text: 'فهرس الأبواب', font: 'Arial', size: 32, bold: true })]
    })
  );
  for (const ch of chapters) {
    const count = manifest.filter((m) => m.chapter === ch && m.status === 'ok').length;
    children.push(rtlParagraph(`• ${ch} (${count} شاشة)`, { size: 22 }));
  }
  children.push(rtlParagraph('', { after: 200 }));

  let sectionNum = 1;
  for (const chapter of chapters) {
    const items = manifest.filter((m) => m.chapter === chapter && m.status === 'ok');
    if (!items.length) continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        pageBreakBefore: sectionNum > 1,
        spacing: { after: 160 },
        children: [
          new TextRun({ text: `${sectionNum}. ${chapter}`, font: 'Arial', size: 32, bold: true, color: '1A5276' })
        ]
      })
    );

    let i = 1;
    for (const item of items) {
      const shotPath = path.join(SHOTS_DIR, item.file);
      const typeLabel =
        item.type === 'dialog' ? 'نموذج / حوار' : item.type === 'dynamic' ? 'شاشة تفاصيل' : 'شاشة رئيسية';

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 240, after: 100 },
          children: [
            new TextRun({
              text: `${sectionNum}.${i} ${item.title}`,
              font: 'Arial',
              size: 26,
              bold: true
            })
          ]
        }),
        rtlParagraph(`النوع: ${typeLabel}${item.route ? ` | المسار: ${item.route}` : ''}`, { size: 18, color: '666666' }),
        rtlParagraph(`الوصف: ${item.desc}`, { size: 20 }),
        rtlParagraph(`الدور في الأعمال: ${item.business}`, { size: 20, after: 120 })
      );

      if (fs.existsSync(shotPath)) {
        const data = fs.readFileSync(shotPath);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new ImageRun({
                data,
                transformation: { width: 620, height: 350 },
                type: 'png'
              })
            ]
          })
        );
      }
      i++;
    }
    sectionNum++;
  }

  // Appendix - failed/skipped
  const skipped = manifest.filter((m) => m.status !== 'ok');
  if (skipped.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        pageBreakBefore: true,
        children: [new TextRun({ text: 'ملحق — شاشات لم تُلتقط', font: 'Arial', size: 28, bold: true })]
      })
    );
    for (const s of skipped) {
      children.push(rtlParagraph(`• ${s.title || s.id} (${s.status}: ${s.error || '-'})`, { size: 20 }));
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
                  new TextRun({ text: 'مشارق — دليل الشاشات الكامل | صفحة ', font: 'Arial', size: 16 }),
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

  const outFile = path.join(OUT_DIR, 'دليل-شاشات-النظام-الكامل-مشارق.docx');
  fs.writeFileSync(outFile, await Packer.toBuffer(doc));
  console.log('Word saved:', outFile);
  return outFile;
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const dialogsOnly = process.argv.includes('--dialogs-only');
  let manifest = [];

  if (dialogsOnly && fs.existsSync(MANIFEST)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    manifest = manifest.filter((m) => m.type !== 'dialog');
    console.log(`Resuming manifest (${manifest.length} pages), capturing dialogs only…`);
  }

  const browser = await chromium.launch({ headless: true });

  if (!dialogsOnly) {
    console.log('=== Static pages ===');
    await captureStatic(browser, manifest);

    console.log('=== Dynamic detail pages ===');
    await captureDynamic(browser, manifest);
  }

  console.log('=== Dialogs / forms ===');
  await captureDialogs(browser, manifest);

  await browser.close();

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  const ok = manifest.filter((m) => m.status === 'ok').length;
  console.log(`Captured ${ok}/${manifest.length}`);

  await buildWord(manifest);
}

import { pathToFileURL } from 'url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
