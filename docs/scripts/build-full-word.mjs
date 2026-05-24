import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import HTMLtoDOCX from 'html-to-docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..');
const mdPath = path.join(docsDir, 'ar-business-guide.md');
const outPath = path.join(docsDir, 'business-guide-ar.docx');

const md = fs.readFileSync(mdPath, 'utf8');
const body = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, Tahoma, sans-serif; font-size: 11pt; line-height: 1.5; direction: rtl; text-align: right; }
  h1 { font-size: 20pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 6px; }
  h2 { font-size: 15pt; color: #2c5282; margin-top: 18px; page-break-before: auto; }
  h3 { font-size: 12pt; color: #2d3748; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e0; padding: 6px; text-align: right; vertical-align: top; }
  th { background: #edf2f7; }
  code, pre { font-family: Consolas, monospace; font-size: 9pt; background: #f7fafc; direction: ltr; text-align: left; }
  pre { padding: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
  blockquote { border-right: 3px solid #2b6cb0; margin: 0; padding-right: 12px; color: #4a5568; }
  ul, ol { padding-right: 24px; }
</style>
</head>
<body>
${body}
</body>
</html>`;

const buffer = await HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: false,
  pageNumber: false,
});

fs.writeFileSync(outPath, buffer);
console.log('Created:', outPath, '(' + buffer.length + ' bytes)');
