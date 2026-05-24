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
  WidthType,
  BorderStyle
} from 'docx';
import { newArabicContext, waitStable } from './i18n-screenshot-utils.mjs';

const BASE_URL = 'http://localhost:4500';
const LOGIN_EMAIL = 'admin@propmgmt.com';
const LOGIN_PASSWORD = '12345';
const OUT_DIR = path.resolve('..', 'rfi-output');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');

const sections = [
  {
    id: 'login',
    route: '/auth/login',
    title: 'شاشة تسجيل الدخول',
    rfi: 'أولاً: معلومات الحل — نقطة الدخول الآمنة للنظام',
    desc:
      'بوابة الدخول الموحدة لجميع أدوار المستخدمين (إدارة، محاسبة، مالك، مستأجر، فني صيانة). تدعم المصادقة الآمنة وإعادة توجيه المستخدم حسب صلاحياته إلى مساحة العمل المناسبة.',
    business:
      'تضمن حماية البيانات التشغيلية والمالية، وتفصل صلاحيات الوصول وفق الدور الوظيفي — أساس متطلبات أمن المعلومات في طلب RFI.',
    needsLogin: false,
    waitMs: 2000
  },
  {
    id: 'dashboard',
    route: '/admin/dashboard',
    title: 'لوحة المعلومات التشغيلية',
    rfi: 'سادساً: التقارير ولوحات المعلومات',
    desc:
      'لوحة تحكم مركزية تعرض مؤشرات الإشغال، العقود النشطة، طلبات الصيانة المفتوحة، والتنبيهات التشغيلية في لمحة واحدة.',
    business:
      'تمكّن الإدارة العليا من متابعة الأداء اليومي واتخاذ قرارات سريعة دون الحاجة لاستخراج تقارير يدوية.',
    needsLogin: true,
    waitMs: 3500
  },
  {
    id: 'properties',
    route: '/admin/properties',
    title: 'إدارة العقارات والمشاريع',
    rfi: 'أولاً: إدارة العقارات',
    desc:
      'سجل مركزي للمشاريع العقارية والمباني: بيانات الموقع، النوع، المالك، عدد الطوابق والوحدات، والحالة التشغيلية.',
    business:
      'أساس هيكل المحفظة العقارية — كل وحدة وعقد ومستأجر يرتبط بعقار محدد لضمان تتبع دقيق للأصول.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'units',
    route: '/admin/units',
    title: 'إدارة الوحدات وحالة الإشغال',
    rfi: 'أولاً: إدارة العقارات — تصنيف الوحدات وحالة الإشغال',
    desc:
      'إدارة تفصيلية للوحدات ضمن كل عقار: التصنيف (سكني/تجاري)، المساحة، الحالة (شاغرة/مؤجرة/صيانة)، وربطها بالطوابق.',
    business:
      'يدعم تخطيط الإشغال، تسعير الوحدات الشاغرة، ومتابعة نسب الإشغال — محور تقارير الإشغال في RFI.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'tenants',
    route: '/admin/tenants',
    title: 'إدارة المستأجرين',
    rfi: 'ثانياً: إدارة المستأجرين',
    desc:
      'قاعدة بيانات المستأجرين: الهوية، بيانات التواصل، الضمانات، المرفقات، وربط كل مستأجر بالوحدة والعقد النشط.',
    business:
      'يُمكّن فرق التأجير والتحصيل من إدارة علاقة المستأجر كاملةً وربطها مباشرةً بالعقود والمدفوعات.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'contracts-dashboard',
    route: '/admin/contracts/dashboard',
    title: 'لوحة عقود الإيجار',
    rfi: 'ثالثاً: إدارة عقود الإيجار',
    desc:
      'نظرة مجمّعة على العقود: النشطة، القريبة من الانتهاء، بانتظار الموافقة، والإحصائيات المرتبطة بالإيرادات.',
    business:
      'تسهّل متابعة دورة حياة العقد من الإنشاء حتى التجديد أو الإنهاء، بما يشمل العقود متعددة السنوات.',
    needsLogin: true,
    waitMs: 3500
  },
  {
    id: 'contracts-list',
    route: '/admin/contracts/list',
    title: 'سجل عقود الإيجار',
    rfi: 'ثالثاً: إدارة عقود الإيجار — الشروط والملحقات',
    desc:
      'قائمة شاملة بعقود الإيجار مع البحث والتصفية: المستأجر، الوحدة، تواريخ البداية والنهاية، قيمة الإيجار، والزيادات السنوية.',
    business:
      'مرجع قانوني وتشغيلي لجميع الالتزامات التعاقدية ويدعم التجديد والإنهاء وإدارة الملحقات.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'finance-revenues',
    route: '/admin/finance/revenues',
    title: 'الإيرادات والفوترة',
    rfi: 'رابعاً: الفوترة والتحصيل',
    desc:
      'متابعة إيرادات الإيجار والمدفوعات المستلمة، مع ربطها بالعقود والفترات المحاسبية.',
    business:
      'يغطي إنشاء الفواتير الدورية ومتابعة التحصيل والذمم المدينة — من متطلبات RFI الأساسية.',
    needsLogin: true,
    waitMs: 3500
  },
  {
    id: 'overdue-payments',
    route: '/admin/finance/overdue-payments',
    title: 'المتأخرات وإشعارات الدفع',
    rfi: 'رابعاً: الفوترة والتحصيل — المتأخرات',
    desc:
      'تتبع الدفعات المتأخرة حسب العقد والمستأجر، مع إمكانية المتابعة والتنبيه.',
    business:
      'يقلّل مخاطر التعثر المالي ويدعم إصدار إشعارات الدفع ومتابعة التحصيل بشكل منهجي.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'maintenance',
    route: '/admin/maintenance',
    title: 'إدارة طلبات الصيانة',
    rfi: 'خامساً: إدارة الصيانة',
    desc:
      'تسجيل ومتابعة طلبات الصيانة الدورية والطارئة، تعيين المسؤولين، وحالات التنفيذ.',
    business:
      'يربط جودة الخدمة بتكاليف الصيانة ورضا المستأجر — مع تتبع كامل لدورة الطلب.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'reports',
    route: '/admin/reports',
    title: 'مركز التقارير',
    rfi: 'سادساً: التقارير ولوحات المعلومات',
    desc:
      'بوابة موحدة للتقارير التشغيلية والمالية: الإشغال، العقود، الصيانة، والميزانية.',
    business:
      'يوفّر رؤية إدارية شاملة وقابلة للتصدير لدعم القرارات والامتثال للمتطلبات التقاريرية.',
    needsLogin: true,
    waitMs: 3000
  },
  {
    id: 'occupancy',
    route: '/admin/reports/occupancy',
    title: 'تحليلات الإشغال',
    rfi: 'سادساً: تقارير الإشغال',
    desc:
      'تقارير ورسوم بيانية لنسب الإشغال حسب العقار والفترة الزمنية.',
    business:
      'أداة تخطيط استراتيجي لتحسين العائد من الأصول الشاغرة وقياس أداء المحفظة.',
    needsLogin: true,
    waitMs: 3500
  },
  {
    id: 'users',
    route: '/admin/users',
    title: 'إدارة المستخدمين والصلاحيات',
    rfi: 'ثانياً: الجوانب الفنية — إدارة المستخدمين والصلاحيات',
    desc:
      'إنشاء المستخدمين، تعيين الأدوار، وربطهم بالعقارات أو الكيانات القانونية حسب نطاق العمل.',
    business:
      'يحقق مبدأ الحد الأدنى من الصلاحيات ويدعم تعدد الكيانات والشركات ضمن منصة واحدة.',
    needsLogin: true,
    waitMs: 3000
  }
];

function rtlParagraph(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: opts.after ?? 120 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: opts.size ?? 24,
        bold: opts.bold ?? false,
        color: opts.color
      })
    ]
  });
}

function imageBuffer(filePath) {
  const data = fs.readFileSync(filePath);
  return { data, width: 620, height: 350 };
}

async function login(page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[type="email"], input[formcontrolname="email"], input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 60000 });
  // Handle forced password change if shown
  const changePw = page.locator('input[formcontrolname="newPassword"], input[formcontrolname="newPw"]');
  if (await changePw.count()) {
    await page.fill('input[formcontrolname="currentPassword"], input[formcontrolname="currentPw"]', LOGIN_PASSWORD);
    await page.fill('input[formcontrolname="newPassword"], input[formcontrolname="newPw"]', LOGIN_PASSWORD);
    await page.fill('input[formcontrolname="confirmPassword"], input[formcontrolname="confirmPw"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
}

async function captureScreenshots() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await newArabicContext(browser);
  const page = await context.newPage();
  let loggedIn = false;

  for (const section of sections) {
    const file = path.join(SHOTS_DIR, `${section.id}.png`);
    try {
      if (section.needsLogin && !loggedIn) {
        await login(page);
        loggedIn = true;
      }
      await page.goto(`${BASE_URL}${section.route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await waitStable(page);
      await page.waitForTimeout(section.waitMs);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`OK ${section.id}`);
    } catch (err) {
      console.error(`FAIL ${section.id}:`, err.message);
    }
  }

  await browser.close();
}

async function buildDocument() {
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'رد على طلب تقديم المعلومات (RFI)', font: 'Arial', size: 40, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'موديول إدارة الأملاك والتأجير — نظام مشارق لإدارة العقارات',
          font: 'Arial',
          size: 28,
          color: 'E8622A'
        })
      ]
    }),
    rtlParagraph('الجهة المستهدفة: شركة مطوف — حجاج دول جنوب شرق آسيا (مشارق)', { size: 22 }),
    rtlParagraph('رقم الطلب: 47001', { size: 22 }),
    rtlParagraph(`تاريخ الإعداد: ${new Date().toLocaleDateString('ar-SA')}`, { size: 22, after: 300 })
  );

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: '1. مقدمة تنفيذية', font: 'Arial', size: 32, bold: true })] }),
    rtlParagraph(
      'يقدّم هذا المستند وصفاً عملياً لحل إدارة الأملاك والتأجير المطوّر ضمن منظومة مشارق، استجابةً لطلب تقديم المعلومات (RFI) الخاص بمشروع دمج موديول إدارة الأملاك ضمن نظام ERP. يتضمن المستند لقطات شاشة من النظام الفعلي مع شرح الوظيفة ودورها في دورة الأعمال.',
      { size: 24 }
    ),
    rtlParagraph(
      'يغطي الحل المتطلبات الواردة في نطاق الدراسة: إدارة العقارات والوحدات، المستأجرين، عقود الإيجار، الفوترة والتحصيل، الصيانة، والتقارير ولوحات المعلومات — مع دعم تعدد الأدوار والصلاحيات والتكامل مع الوحدات المالية.',
      { size: 24, after: 240 }
    )
  );

  const mappingRows = [
    ['إدارة العقارات', 'العقارات، الوحدات، حالة الإشغال'],
    ['إدارة المستأجرين', 'سجل المستأجرين والربط بالعقود'],
    ['عقود الإيجار', 'لوحة العقود، السجل، التجديد والملحقات'],
    ['الفوترة والتحصيل', 'الإيرادات، المتأخرات، إشعارات الدفع'],
    ['إدارة الصيانة', 'طلبات الصيانة والمتابعة'],
    ['التقارير', 'مركز التقارير وتحليلات الإشغال'],
    ['الأمن والصلاحيات', 'إدارة المستخدمين والأدوار']
  ];

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: '2. ملاءمة الحل لنطاق RFI', font: 'Arial', size: 32, bold: true })] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [rtlParagraph('نطاق RFI', { bold: true })], width: { size: 35, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [rtlParagraph('تغطية النظام', { bold: true })], width: { size: 65, type: WidthType.PERCENTAGE } })
          ]
        }),
        ...mappingRows.map(
          ([a, b]) =>
            new TableRow({
              children: [
                new TableCell({ children: [rtlParagraph(a)] }),
                new TableCell({ children: [rtlParagraph(b)] })
              ]
            })
        )
      ]
    }),
    rtlParagraph('', { after: 200 })
  );

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: '3. جولة في النظام — الشاشات الرئيسية', font: 'Arial', size: 32, bold: true })] }),
    rtlParagraph('فيما يلي أهم الشاشات التشغيلية مع شرح مختصر ودور كل شاشة في دورة الأعمال.', { size: 24, after: 200 })
  );

  let index = 1;
  for (const section of sections) {
    const shot = path.join(SHOTS_DIR, `${section.id}.png`);
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: `3.${index} ${section.title}`, font: 'Arial', size: 28, bold: true, color: '1A5276' })]
      }),
      rtlParagraph(`مرجع RFI: ${section.rfi}`, { size: 20, color: '666666' }),
      rtlParagraph(`الوصف: ${section.desc}`, { size: 22 }),
      rtlParagraph(`الدور في الأعمال: ${section.business}`, { size: 22, after: 160 })
    );

    if (fs.existsSync(shot)) {
      const img = imageBuffer(shot);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new ImageRun({
              data: img.data,
              transformation: { width: img.width, height: img.height },
              type: 'png'
            })
          ]
        })
      );
    } else {
      children.push(rtlParagraph('[لم تتوفر لقطة الشاشة — يرجى التقاطها يدوياً]', { size: 20, color: 'CC0000' }));
    }
    index++;
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true, pageBreakBefore: true, children: [new TextRun({ text: '4. المزايا التقنية والتشغيلية', font: 'Arial', size: 32, bold: true })] }),
    rtlParagraph('• بنية ويب حديثة (Angular + Spring Boot) قابلة للتوسع والتكامل مع ERP.', { size: 22 }),
    rtlParagraph('• دعم اللغة العربية والإنجليزية وواجهة RTL.', { size: 22 }),
    rtlParagraph('• أدوار متعددة: مدير عام، محاسب، مالك، مستأجر، فني صيانة، وشركات مقاولين.', { size: 22 }),
    rtlParagraph('• صلاحيات دقيقة على مستوى الشاشة والوحدة والعقار.', { size: 22 }),
    rtlParagraph('• سجل تدقيق (Audit Log) وتعدد الكيانات القانونية.', { size: 22 }),
    rtlParagraph('• جاهزية للتكامل مع الأنظمة المالية والتقارير عبر واجهات API.', { size: 22, after: 240 }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: '5. الخلاصة', font: 'Arial', size: 32, bold: true })] }),
    rtlParagraph(
      'يوفّر نظام مشارق لإدارة الأملاك منصة متكاملة تغطي دورة حياة الأصل العقاري من التسجيل حتى التحصيل والصيانة والتقارير. نحن مستعدون لعقد جلسة توضيحية وورشة عمل فنية وفق الجدول الزمني المذكور في طلب RFI (3–7 يونيو 2026).',
      { size: 24 }
    ),
    rtlParagraph('للاستفسارات والتواصل: يرجى الرجوع إلى فريق المشروع.', { size: 22, after: 400 })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 24 }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'مشارق — إدارة الأملاك والتأجير | RFI 47001 | صفحة ', font: 'Arial', size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18 })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const outFile = path.join(OUT_DIR, 'رد-RFI-إدارة-الأملاك-مشارق.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buffer);
  console.log('Document saved:', outFile);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Capturing screenshots...');
  await captureScreenshots();
  console.log('Building Word document...');
  await buildDocument();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
