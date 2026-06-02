import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import HTMLtoDOCX from 'html-to-docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '..');
const MD_PATH = path.join(DOCS_DIR, 'user-stories-full-system-ar.md');
const OUT_DOCX = path.join(DOCS_DIR, 'User-Stories-Full-System-ar.docx');

function htmlWrap(title, body) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a202c; margin: 1in; direction: rtl; text-align: right; }
  h1 { font-size: 22pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px; }
  h2 { font-size: 16pt; color: #2c5282; margin-top: 24px; border-bottom: 1px solid #cbd5e0; padding-bottom: 4px; }
  h3 { font-size: 13pt; color: #2d3748; margin-top: 16px; }
  p, li { text-align: right; }
  blockquote { background: #ebf8ff; border-right: 4px solid #2b6cb0; margin: 8px 0; padding: 8px 12px; color: #2a4365; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; direction: rtl; }
  th, td { border: 1px solid #cbd5e0; padding: 6px 8px; vertical-align: top; text-align: right; }
  th { background: #edf2f7; font-weight: bold; }
  pre, code { font-family: Consolas, monospace; font-size: 9pt; background: #f7fafc; direction: ltr; text-align: left; }
  pre { padding: 10px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
  hr { margin: 24px 0; border: none; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

async function main() {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const htmlBody = await marked.parse(md);
  const html = htmlWrap('User Stories — نظام إدارة العقارات', htmlBody);
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: false } },
    footer: true,
    pageNumber: true
  });
  fs.writeFileSync(OUT_DOCX, buffer);
  console.log(`Generated: ${OUT_DOCX} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
